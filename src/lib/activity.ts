import { supabase } from "@/integrations/supabase/client";

let cachedIp: string | null | undefined;

async function getIp(): Promise<string | null> {
  if (cachedIp !== undefined) return cachedIp ?? null;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const json = (await res.json()) as { ip?: string };
    cachedIp = json.ip ?? null;
  } catch {
    cachedIp = null;
  }
  return cachedIp ?? null;
}

export function getBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

export function getDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  const kind = /Mobi|Android|iPhone/.test(ua) ? "Mobile" : /iPad|Tablet/.test(ua) ? "Tablet" : "Desktop";
  return `${kind} · ${os}`;
}

export type LogOptions = {
  page?: string;
  metadata?: Record<string, unknown>;
};

/** Fire-and-forget activity logging. Never throws. */
export async function logActivity(action: string, options: LogOptions = {}): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;

    const ip = await getIp();
    await supabase.from("user_activity_logs").insert({
      user_id: user.id,
      user_name: (user.user_metadata?.["full_name"] as string | undefined) ?? user.email ?? "",
      email: user.email ?? "",
      action,
      page: options.page ?? (typeof window !== "undefined" ? window.location.pathname : null),
      ip_address: ip,
      browser: getBrowser(),
      device: getDevice(),
      metadata: (options.metadata ?? null) as never,
    });
  } catch (error) {
    console.warn("activity log failed", error);
  }
}
