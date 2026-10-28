-- PostPilot database schema. Run in Supabase SQL Editor as project owner.
create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

do $$ begin
  create type public.social_platform as enum ('instagram', 'facebook', 'linkedin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.post_status as enum ('draft', 'scheduled', 'queued', 'processing', 'published', 'partial', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.target_status as enum ('queued', 'processing', 'published', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'My workspace',
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform public.social_platform not null,
  account_id text,
  account_name text,
  page_id text,
  instagram_user_id text,
  access_token_enc text,
  refresh_token_enc text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}',
  connected_at timestamptz,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  media_kind text not null check (media_kind in ('image', 'audio', 'video')),
  mime_type text not null,
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled post',
  image_asset_id uuid references public.media_assets(id) on delete set null,
  video_asset_id uuid references public.media_assets(id) on delete set null,
  audio_asset_id uuid references public.media_assets(id) on delete set null,
  instagram_caption text not null default '',
  linkedin_caption text not null default '',
  facebook_caption text not null default '',
  platforms public.social_platform[] not null default '{}',
  add_music boolean not null default false,
  hide_like_count boolean not null default false,
  also_post_to_facebook boolean not null default false,
  timezone text not null default 'Asia/Kolkata',
  scheduled_for timestamptz,
  status public.post_status not null default 'draft',
  checklist jsonb not null default '[]',
  error_message text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_workspace_scheduled_idx on public.posts (workspace_id, scheduled_for);
create index if not exists posts_due_idx on public.posts (status, scheduled_for) where status in ('queued', 'scheduled');

create table if not exists public.post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform public.social_platform not null,
  status public.target_status not null default 'queued',
  remote_post_id text,
  post_url text,
  error_message text,
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, platform)
);
create index if not exists post_targets_post_idx on public.post_targets (post_id, status);
create index if not exists post_targets_workspace_idx on public.post_targets (workspace_id);
create index if not exists media_assets_workspace_idx on public.media_assets (workspace_id);
create index if not exists posts_created_by_idx on public.posts (created_by);
create index if not exists posts_image_asset_idx on public.posts (image_asset_id);
create index if not exists posts_video_asset_idx on public.posts (video_asset_id);
create index if not exists posts_audio_asset_idx on public.posts (audio_asset_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = pg_catalog as $ begin new.updated_at = now(); return new; end; $;

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
drop trigger if exists social_accounts_set_updated_at on public.social_accounts;
create trigger social_accounts_set_updated_at before update on public.social_accounts for each row execute function public.set_updated_at();
drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts for each row execute function public.set_updated_at();
drop trigger if exists post_targets_set_updated_at on public.post_targets;
create trigger post_targets_set_updated_at before update on public.post_targets for each row execute function public.set_updated_at();

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = pg_catalog as $
begin
  insert into public.workspaces (owner_id, name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'workspace_name', ''), 'My workspace'))
  on conflict (owner_id) do nothing;
  return new;
end;
$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_postpilot on auth.users;
create trigger on_auth_user_created_postpilot after insert on auth.users for each row execute procedure private.handle_new_user();

create or replace function public.claim_due_posts(batch_size integer default 20)
returns setof public.posts
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select id from public.posts
    where status in ('scheduled', 'queued') and (scheduled_for is null or scheduled_for <= now())
    order by coalesce(scheduled_for, created_at) asc
    limit greatest(1, least(batch_size, 100))
    for update skip locked
  )
  update public.posts p set status = 'processing', updated_at = now()
  from due where p.id = due.id
  returning p.*;
end;
$$;
revoke all on function public.claim_due_posts(integer) from public, anon, authenticated;
grant execute on function public.claim_due_posts(integer) to service_role;

create or replace function private.my_workspace_id()
returns uuid language sql stable security definer set search_path = pg_catalog as $
  select id from public.workspaces where owner_id = (select auth.uid()) limit 1;
$;
revoke all on function private.my_workspace_id() from public, anon;
grant execute on function private.my_workspace_id() to authenticated;

alter table public.workspaces enable row level security;
alter table public.social_accounts enable row level security;
alter table public.media_assets enable row level security;
alter table public.posts enable row level security;
alter table public.post_targets enable row level security;

drop policy if exists "owner reads workspace" on public.workspaces;
create policy "owner reads workspace" on public.workspaces for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "owner updates workspace" on public.workspaces;
create policy "owner updates workspace" on public.workspaces for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- No authenticated SELECT policy on social_accounts: server service-role operations only.
drop policy if exists "workspace media read" on public.media_assets;
create policy "workspace media read" on public.media_assets for select to authenticated using (workspace_id = private.my_workspace_id());
drop policy if exists "workspace media insert" on public.media_assets;

drop policy if exists "workspace posts read" on public.posts;
create policy "workspace posts read" on public.posts for select to authenticated using (workspace_id = private.my_workspace_id());
drop policy if exists "workspace posts insert" on public.posts;
drop policy if exists "workspace posts update" on public.posts;
drop policy if exists "workspace posts delete" on public.posts;

drop policy if exists "workspace targets read" on public.post_targets;
create policy "workspace targets read" on public.post_targets for select to authenticated using (workspace_id = private.my_workspace_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 26214400, array['image/jpeg','image/png','audio/mpeg','video/mp4'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "workspace upload path" on storage.objects;
create policy "workspace upload path" on storage.objects for insert to authenticated
with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = private.my_workspace_id()::text);
drop policy if exists "workspace updates media" on storage.objects;
create policy "workspace updates media" on storage.objects for update to authenticated
using (bucket_id = 'post-media' and (storage.foldername(name))[1] = private.my_workspace_id()::text)
with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = private.my_workspace_id()::text);
drop policy if exists "workspace deletes media" on storage.objects;
create policy "workspace deletes media" on storage.objects for delete to authenticated
using (bucket_id = 'post-media' and (storage.foldername(name))[1] = private.my_workspace_id()::text);
