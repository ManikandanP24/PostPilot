import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
export async function getAuthenticatedContext() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const admin = createSupabaseAdminClient();
  let { data: workspace } = await admin.from("workspaces").select("id, owner_id, name, timezone").eq("owner_id", user.id).maybeSingle();
  if (!workspace) {
    const { data: created } = await admin.from("workspaces").upsert({ owner_id: user.id, name: String(user.user_metadata?.workspace_name || "My workspace") }, { onConflict: "owner_id" }).select("id, owner_id, name, timezone").single();
    workspace = created;
  }
  if (!workspace) return null;
  return { user, workspace, supabase, admin };
}
export async function requireApiContext() {
  const context = await getAuthenticatedContext();
  if (!context) throw new Error("UNAUTHORIZED");
  return context;
}
