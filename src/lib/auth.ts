import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function getAuthenticatedContext() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  const { data: workspace, error: workspaceError } = await supabase.from("workspaces").select("id, timezone").eq("owner_id", user.id).single();
  if (workspaceError || !workspace) throw new Error("Workspace not found. Run the Supabase schema and sign in again.");
  return { user, workspace, supabase };
}
