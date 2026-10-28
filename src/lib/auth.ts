import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAuthenticatedContext() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Use the authenticated user's cookie-bound client for ordinary app operations.
  // Workspace RLS ensures this client can only operate on the current user's workspace.
  let { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, owner_id, name, timezone")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (workspaceError) throw workspaceError;
  if (!workspace) {
    const { data: created, error: createError } = await supabase
      .from("workspaces")
      .upsert(
        { owner_id: user.id, name: String(user.user_metadata?.workspace_name || "My workspace") },
        { onConflict: "owner_id" },
      )
      .select("id, owner_id, name, timezone")
      .single();
    if (createError) throw createError;
    workspace = created;
  }

  if (!workspace) return null;
  // "admin" remains as an alias for existing handlers, but it is NOT a service-role
  // client. All authenticated requests remain governed by workspace-scoped RLS.
  return { user, workspace, supabase, admin: supabase };
}

export async function requireApiContext() {
  const context = await getAuthenticatedContext();
  if (!context) throw new Error("UNAUTHORIZED");
  return context;
}
