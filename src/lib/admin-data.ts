import { supabase } from "@/integrations/supabase/client";
import type { UploadedImage } from "@/lib/uploads";

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
  totalUploads: number;
  totalPredictions: number;
  suspicious: string[];
  status: "Active" | "Inactive";
};

/** Heuristic risk detection over a user's recent activity. */
export function detectSuspicious(logs: ActivityLog[], uploads: UploadedImage[]): string[] {
  const dayAgo = Date.now() - 86400000;
  const recent = logs.filter((l) => new Date(l.created_at).getTime() > dayAgo);
  const flags: string[] = [];

  const devices = new Set(recent.map((l) => `${l.device ?? "?"}·${l.browser ?? "?"}`));
  if (devices.size >= 3) flags.push(`${devices.size} devices in 24h`);

  const ips = new Set(recent.map((l) => l.ip_address).filter(Boolean));
  if (ips.size >= 3) flags.push(`${ips.size} IP addresses in 24h`);

  const recentUploads = uploads.filter((u) => new Date(u.uploaded_at).getTime() > dayAgo);
  if (recentUploads.length >= 15) flags.push(`${recentUploads.length} uploads in 24h`);

  const logins = recent.filter((l) => l.action === "User Login");
  if (logins.length >= 8) flags.push(`${logins.length} logins in 24h`);

  return flags;
}

export async function fetchAdminOverview() {
  const [
    { data: profiles, error: pErr },
    { data: roles, error: rErr },
    { data: logs, error: lErr },
    { data: images },
  ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase
        .from("user_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("uploaded_images").select("*").order("uploaded_at", { ascending: false }).limit(5000),
    ]);

  if (pErr || rErr || lErr) throw pErr ?? rErr ?? lErr;

  const logRows = (logs ?? []) as ActivityLog[];
  const imageRows = (images ?? []) as UploadedImage[];
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
    const userLogs = logRows.filter((l) => l.user_id === p.id);
    const userImages = imageRows.filter((i) => i.user_id === p.id);
    return {
      id: p.id,
      full_name: p.full_name || "—",
      email: p.email,
      created_at: p.created_at,
      last_login_at: p.last_login_at,
      last_logout_at: p.last_logout_at,
      role,
      totalActions: actionsByUser.get(p.id) ?? 0,
      totalUploads: userImages.length,
      totalPredictions: userLogs.filter((l) => l.action === "Prediction Generated").length,
      suspicious: detectSuspicious(userLogs, userImages),
      status: seen && new Date(seen).getTime() > thirtyDaysAgo ? "Active" : "Inactive",
    };
  });

  return { users, logs: logRows, images: imageRows };
}

export async function fetchUserDetail(userId: string) {
  const [{ data: profile }, { data: roles }, { data: logs }, { data: images }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("user_activity_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("uploaded_images")
      .select("*")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false })
      .limit(500),
  ]);

  return {
    profile,
    role: roles?.[0]?.role ?? "user",
    logs: (logs ?? []) as ActivityLog[],
    images: (images ?? []) as UploadedImage[],
  };
}

export function dailySeries(logs: ActivityLog[], days = 14) {
  return dailySeriesImpl(logs, days);
}

/** Grant or revoke the admin role for a user. */
export async function setAdminRole(userId: string, makeAdmin: boolean) {
  if (makeAdmin) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error && !error.message.includes("duplicate")) throw error;
  } else {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) throw error;
  }
}

/** Delete a single user's activity logs and image records. */
export async function clearUserHistory(userId: string) {
  const { error: lErr } = await supabase.from("user_activity_logs").delete().eq("user_id", userId);
  if (lErr) throw lErr;
  const { error: iErr } = await supabase.from("uploaded_images").delete().eq("user_id", userId);
  if (iErr) throw iErr;
}

/** Delete activity logs and image records for every user. */
export async function clearAllHistory() {
  const { error: lErr } = await supabase.from("user_activity_logs").delete().not("id", "is", null);
  if (lErr) throw lErr;
  const { error: iErr } = await supabase.from("uploaded_images").delete().not("id", "is", null);
  if (iErr) throw iErr;
}

function dailySeriesImpl(logs: ActivityLog[], days: number) {
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
