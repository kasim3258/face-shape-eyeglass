import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Monitor, Globe, Loader2, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageGallery } from "@/components/admin/ImageGallery";
import { clearUserHistory, fetchUserDetail, setAdminRole } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/user/$userId")({
  head: () => ({
    meta: [
      { title: "User activity · Glasses AI Admin" },
      { name: "description", content: "Full login, logout, action history and uploads for a single Glasses AI user." },
      { property: "og:title", content: "User activity · Glasses AI Admin" },
      { property: "og:description", content: "Detailed activity timeline and uploads for a Glasses AI user." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UserDetail,
});

function UserDetail() {
  const { userId } = Route.useParams();
  const queryClient = useQueryClient();
  const [action, setAction] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => fetchUserDetail(userId),
  });

  const logs = data?.logs ?? [];
  const images = data?.images ?? [];
  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);

  const filtered = logs.filter((l) => {
    if (action !== "all" && l.action !== action) return false;
    const t = new Date(l.created_at).getTime();
    if (from && t < new Date(from).getTime()) return false;
    if (to && t > new Date(to).getTime() + 86400000) return false;
    return true;
  });

  const logins = logs.filter((l) => l.action === "User Login");
  const logouts = logs.filter((l) => l.action === "User Logout");
  const isAdmin = data?.role === "admin";

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
    await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const toggleRole = async () => {
    setBusy(true);
    try {
      await setAdminRole(userId, !isAdmin);
      toast.success(isAdmin ? "Admin access removed" : "User promoted to admin");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update role");
    } finally {
      setBusy(false);
    }
  };

  const wipeHistory = async () => {
    if (!window.confirm("Delete all activity logs and image records for this user?")) return;
    setBusy(true);
    try {
      await clearUserHistory(userId);
      toast.success("User history cleared");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear history");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 rounded-xl">
        <Link to="/admin">
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
      </Button>

      {isLoading ? (
        <Skeleton className="h-28 w-full rounded-3xl" />
      ) : (
        <div className="glass-card flex flex-wrap items-center gap-4 p-6 duration-500 animate-in fade-in slide-in-from-bottom-2">
          <span className="grid size-14 place-items-center rounded-full bg-primary/20 text-lg font-bold text-primary">
            {(data?.profile?.full_name || data?.profile?.email || "?").slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{data?.profile?.full_name || "Unnamed user"}</h1>
            <p className="text-sm text-muted-foreground">{data?.profile?.email}</p>
          </div>
          <Badge className="rounded-lg" variant={isAdmin ? "default" : "secondary"}>{data?.role}</Badge>
          <div className="ml-auto grid grid-cols-3 gap-6 text-center">
            <div><p className="text-xl font-bold">{logins.length}</p><p className="text-xs text-muted-foreground">Logins</p></div>
            <div><p className="text-xl font-bold">{logouts.length}</p><p className="text-xs text-muted-foreground">Logouts</p></div>
            <div><p className="text-xl font-bold">{images.length}</p><p className="text-xs text-muted-foreground">Uploads</p></div>
          </div>
          <div className="flex w-full flex-wrap gap-2 border-t border-border/60 pt-4">
            <Button variant="outline" size="sm" className="rounded-xl" disabled={busy} onClick={toggleRole}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : isAdmin ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
              {isAdmin ? "Remove admin access" : "Make admin"}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl text-destructive" disabled={busy} onClick={wipeHistory}>
              <Trash2 className="size-4" /> Clear this user's history
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="timeline" className="mt-6">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="timeline" className="rounded-xl">Activity timeline</TabsTrigger>
          <TabsTrigger value="images" className="rounded-xl">Uploads</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-5">
          <div className="glass-card p-5">
            <div className="flex flex-wrap items-end gap-3">
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="h-10 w-56 rounded-xl"><SelectValue placeholder="All actions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="log-from">From</label>
                <Input id="log-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor="log-to">To</label>
                <Input id="log-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <p className="ml-auto text-sm text-muted-foreground">{filtered.length} events</p>
            </div>

            <div className="relative mt-6 pl-6">
              <span aria-hidden className="absolute bottom-2 left-2 top-2 w-px bg-border" />
              {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="mb-3 h-16 w-full rounded-2xl" />)}
              {!isLoading && filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No activity for these filters.</p>
              )}
              {filtered.slice(0, 300).map((log, i) => (
                <div
                  key={log.id}
                  style={{ animationDelay: `${Math.min(i, 15) * 40}ms` }}
                  className="relative mb-3 rounded-2xl border border-border/60 bg-white/5 p-3 duration-500 animate-in fade-in slide-in-from-left-3"
                >
                  <span aria-hidden className="absolute -left-[1.15rem] top-5 size-2.5 rounded-full bg-primary ring-4 ring-primary/20" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{log.action}</span>
                    {log.page && <Badge variant="secondary" className="rounded-lg text-[10px]">{log.page}</Badge>}
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Monitor className="size-3" /> {log.device ?? "—"}</span>
                    <span>{log.browser ?? "—"}</span>
                    <span className="inline-flex items-center gap-1"><Globe className="size-3" /> {log.ip_address ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="images" className="mt-5">
          <ImageGallery images={images} loading={isLoading} showUserFilter={false} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
