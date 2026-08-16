import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";

export async function recordLogin() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return;
  await supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
  await logActivity("User Login");
}

export async function signOutUser() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (user) {
    await logActivity("User Logout");
    await supabase.from("profiles").update({ last_logout_at: new Date().toISOString() }).eq("id", user.id);
  }
  await supabase.auth.signOut();
}
