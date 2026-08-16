import { supabase } from "@/integrations/supabase/client";

export type ActivityLog = {
  id: string;
  user_id: string;
  user_name: string | null;
  email: string | null;
  action: string;
  page: string | null;
  ip_address: string | null;
  browser: string | null;
  device: string | null;
  created_at: string;
};

export type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  last_login_at: string | null;
  last_logout_at: string | null;
  role: string;
  totalActions: number;
  status: "Active" | "Inactive";
};

export async function fetchAdminOverview() {
  const [{ data: profiles, error: pErr }, { data: roles, error: rErr }, { data: logs, error: lErr }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase
        .from("user_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);

  if (pErr || rErr || lErr) throw pErr ?? rErr ?? lErr;

  const logRows = (logs ?? []) as ActivityLog[];
  const actionsByUser = new Map<string, number>();
  const lastSeen = new Map<string, string>();
  for (const log of logRows) {
    actionsByUser.set(log.user_id, (actionsByUser.get(log.user_id) ?? 0) + 1);
    if (!lastSeen.has(log.user_id)) lastSeen.set(log.user_id, log.created_at);
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const users: AdminUser[] = (profiles ?? []).map((p) => {
    const role = (roles ?? []).find((r) => r.user_id === p.id)?.role ?? "user";
    const seen = lastSeen.get(p.id) ?? p.last_login_at;
    return {
      id: p.id,
      full_name: p.full_name || "—",
      email: p.email,
      created_at: p.created_at,
      last_login_at: p.last_login_at,
      last_logout_at: p.last_logout_at,
      role,
      totalActions: actionsByUser.get(p.id) ?? 0,
      status: seen && new Date(seen).getTime() > thirtyDaysAgo ? "Active" : "Inactive",
    };
  });

  return { users, logs: logRows };
}

export async function fetchUserDetail(userId: string) {
  const [{ data: profile }, { data: roles }, { data: logs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("user_activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  return {
    profile,
    role: roles?.[0]?.role ?? "user",
    logs: (logs ?? []) as ActivityLog[],
  };
}

export function dailySeries(logs: ActivityLog[], days = 14) {
  const buckets: { date: string; logins: number; actions: number }[] = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    index.set(key, buckets.length);
    buckets.push({ date: key.slice(5), logins: 0, actions: 0 });
  }
  for (const log of logs) {
    const key = log.created_at.slice(0, 10);
    const i = index.get(key);
    if (i === undefined) continue;
    buckets[i]!.actions += 1;
    if (log.action === "User Login") buckets[i]!.logins += 1;
  }
  return buckets;
}
