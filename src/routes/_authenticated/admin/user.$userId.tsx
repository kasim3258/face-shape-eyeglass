import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { fetchUserDetail } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/user/$userId")({
  head: () => ({
    meta: [
      { title: "User activity · Glasses AI Admin" },
      { name: "description", content: "Full login, logout and action history for a Glasses AI user." },
      { property: "og:title", content: "User activity · Glasses AI Admin" },
      { property: "og:description", content: "Detailed per-user activity history with device, browser and IP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UserHistory,
});

function UserHistory() {
  const { userId } = Route.useParams();
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [actionFilter, setActionFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => fetchUserDetail(userId),
    enabled: isAdmin,
  });

  const logs = data?.logs ?? [];
  const actionTypes = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        if (actionFilter !== "all" && l.action !== actionFilter) return false;
        const day = l.created_at.slice(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
      }),
    [logs, actionFilter, from, to],
  );

  const logins = logs.filter((l) => l.action === "User Login");
  const logouts = logs.filter((l) => l.action === "User Logout");

  if (authLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-10"><Skeleton className="h-80 w-full rounded-3xl" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <ShieldAlert className="size-10 text-destructive" />
        <h1 className="text-2xl font-bold">Admins only</h1>
        <Button className="rounded-xl" onClick={() => navigate({ to: "/studio" })}>Back to studio</Button>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-5 rounded-xl">
        <Link to="/admin"><ArrowLeft className="size-4" /> Back to dashboard</Link>
      </Button>

      <div className="glass-card p-6 duration-500 animate-in fade-in slide-in-from-bottom-2">
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : (
          <>
            <h1 className="text-2xl font-extrabold tracking-tight">{data?.profile?.full_name || "Unnamed user"}</h1>
            <p className="text-sm text-muted-foreground">{data?.profile?.email}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div><p className="text-xs uppercase text-muted-foreground">Role</p><Badge className="mt-1">{data?.role}</Badge></div>
              <div><p className="text-xs uppercase text-muted-foreground">Total actions</p><p className="mt-1 font-semibold">{logs.length}</p></div>
              <div><p className="text-xs uppercase text-muted-foreground">Logins</p><p className="mt-1 font-semibold">{logins.length}</p></div>
              <div><p className="text-xs uppercase text-muted-foreground">Logouts</p><p className="mt-1 font-semibold">{logouts.length}</p></div>
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <p className="text-muted-foreground">
                Last login: {data?.profile?.last_login_at ? new Date(data.profile.last_login_at).toLocaleString() : "Never"}
              </p>
              <p className="text-muted-foreground">
                Last logout: {data?.profile?.last_logout_at ? new Date(data.profile.last_logout_at).toLocaleString() : "Never"}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="glass-card mt-6 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-sm font-semibold">Activity history</h2>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-10 w-48 rounded-xl"><SelectValue placeholder="Action type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-40 rounded-xl" aria-label="From date" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-40 rounded-xl" aria-label="To date" />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4">Time</th>
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">Page</th>
                <th className="py-3 pr-4">Device</th>
                <th className="py-3 pr-4">Browser</th>
                <th className="py-3 pr-4">IP</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-2"><Skeleton className="h-9 w-full rounded-lg" /></td></tr>
                ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No activity for these filters.</td></tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border/60 transition-colors hover:bg-primary/5">
                  <td className="py-3 pr-4 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-4 font-medium">{l.action}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{l.page ?? "—"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{l.device ?? "—"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{l.browser ?? "—"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{l.ip_address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
