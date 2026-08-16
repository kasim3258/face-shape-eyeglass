import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Images,
  KeyRound,
  Loader2,
  LogIn,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AnimatedCounter } from "@/components/admin/AnimatedCounter";
import { supabase } from "@/integrations/supabase/client";
import {
  clearAllHistory,
  clearUserHistory,
  dailySeries,
  fetchAdminOverview,
  setAdminRole,
  type AdminUser,
} from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Mission Control · Glasses AI Admin" },
      { name: "description", content: "Live overview of users, logins, uploads and predictions across the Glasses AI platform." },
      { property: "og:title", content: "Mission Control · Glasses AI Admin" },
      { property: "og:description", content: "Users, logins, uploads and activity analytics for Glasses AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});

const PAGE_SIZE = 8;

function StatCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  delay: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="glass-card relative overflow-hidden p-5 duration-500 animate-in fade-in slide-in-from-bottom-3 transition-transform hover:-translate-y-1"
    >
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-24 rounded-full bg-primary/20 blur-2xl" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight">
        <AnimatedCounter value={value} />
      </p>
    </div>
  );
}

function initials(name: string, email: string) {
  const source = name && name !== "—" ? name : email;
  return source.slice(0, 2).toUpperCase();
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<keyof AdminUser>("created_at");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: fetchAdminOverview });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-overview"] });

  const toggleRole = async (u: AdminUser) => {
    setBusyId(u.id);
    try {
      await setAdminRole(u.id, u.role !== "admin");
      toast.success(u.role === "admin" ? "Admin access removed" : `${u.email} is now an admin`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update role");
    } finally {
      setBusyId(null);
    }
  };

  const wipeUser = async (u: AdminUser) => {
    if (!window.confirm(`Delete all activity and image records for ${u.email}?`)) return;
    setBusyId(u.id);
    try {
      await clearUserHistory(u.id);
      toast.success("User history cleared");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear history");
    } finally {
      setBusyId(null);
    }
  };

  const wipeAll = async () => {
    if (!window.confirm("Delete activity and image history for every user?")) return;
    try {
      await clearAllHistory();
      toast.success("All history cleared");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear history");
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setSavingPassword(false);
    }
  };

  const users = data?.users ?? [];
  const logs = data?.logs ?? [];
  const images = data?.images ?? [];

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      totalUsers: users.length,
      activeToday: new Set(logs.filter((l) => l.created_at.slice(0, 10) === today).map((l) => l.user_id)).size,
      totalImages: images.length,
      totalLogins: logs.filter((l) => l.action === "User Login").length,
      totalPredictions: logs.filter((l) => l.action === "Prediction Generated").length,
    };
  }, [users, logs, images]);

  const series = useMemo(() => dailySeries(logs), [logs]);
  const feed = logs.slice(0, 12);
  const flagged = users.filter((u) => u.suspicious.length > 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = users.filter((u) => {
      const matchesQuery = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return asc ? av - bv : bv - av;
      return asc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [users, search, roleFilter, statusFilter, sortKey, asc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const sortBy = (key: keyof AdminUser) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end gap-3 duration-500 animate-in fade-in slide-in-from-bottom-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-gradient">Mission Control</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Live users, logins, uploads and predictions.</p>
        </div>
        <Button asChild className="btn-hero ml-auto rounded-xl font-semibold hover:brightness-110">
          <Link to="/admin/gallery">
            <Images className="size-4" /> Image gallery
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Users} label="Total users" value={stats.totalUsers} delay={0} />
          <StatCard icon={Zap} label="Active today" value={stats.activeToday} delay={60} />
          <StatCard icon={Images} label="Images uploaded" value={stats.totalImages} delay={120} />
          <StatCard icon={LogIn} label="Total logins" value={stats.totalLogins} delay={180} />
          <StatCard icon={Sparkles} label="Predictions" value={stats.totalPredictions} delay={240} />
        </div>
      )}

      {flagged.length > 0 && (
        <div className="glass-card mt-6 border-destructive/40 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <TriangleAlert className="size-4" /> Suspicious activity detected
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {flagged.map((u) => (
              <Link
                key={u.id}
                to="/admin/user/$userId"
                params={{ userId: u.id }}
                className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs transition-colors hover:bg-destructive/20"
              >
                <span className="font-medium">{u.full_name !== "—" ? u.full_name : u.email}</span>
                <span className="ml-2 text-muted-foreground">{u.suspicious.join(" · ")}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Daily logins</h2>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-2xl" />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Bar dataKey="logins" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="mb-4 text-sm font-semibold">User activity trend</h2>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-2xl" />
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Area type="monotone" dataKey="actions" stroke="var(--color-chart-2)" fill="url(#activityFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="glass-card mt-6 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-sm font-semibold">User management</h2>
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search name or email"
            className="h-10 w-full rounded-xl sm:w-56"
          />
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(0); }}>
            <SelectTrigger className="h-10 w-32 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="h-10 w-32 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-3">User</th>
                <th className="py-3 pr-3">Role</th>
                <th className="cursor-pointer py-3 pr-3" onClick={() => sortBy("last_login_at")}>
                  <span className="inline-flex items-center gap-1">Last login <ArrowUpDown className="size-3" /></span>
                </th>
                <th className="cursor-pointer py-3 pr-3" onClick={() => sortBy("totalUploads")}>
                  <span className="inline-flex items-center gap-1">Uploads <ArrowUpDown className="size-3" /></span>
                </th>
                <th className="cursor-pointer py-3 pr-3" onClick={() => sortBy("totalPredictions")}>
                  <span className="inline-flex items-center gap-1">Predictions <ArrowUpDown className="size-3" /></span>
                </th>
                <th className="py-3 pr-3">Status</th>
                <th className="py-3 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="py-2"><Skeleton className="h-10 w-full rounded-xl" /></td></tr>
                ))}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No users match these filters.</td></tr>
              )}
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-primary/5">
                  <td className="py-3 pr-3">
                    <Link to="/admin/user/$userId" params={{ userId: u.id }} className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                        {initials(u.full_name, u.email)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="truncate">{u.full_name}</span>
                          {u.suspicious.length > 0 && (
                            <UiTooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                                  <TriangleAlert className="size-3" /> Risk
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{u.suspicious.join(" · ")}</TooltipContent>
                            </UiTooltip>
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"} className="rounded-lg">{u.role}</Badge>
                  </td>
                  <td className="py-3 pr-3 text-muted-foreground">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "—"}
                  </td>
                  <td className="py-3 pr-3">{u.totalUploads}</td>
                  <td className="py-3 pr-3">{u.totalPredictions}</td>
                  <td className="py-3 pr-3">
                    <span className={u.status === "Active" ? "text-primary" : "text-muted-foreground"}>{u.status}</span>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        disabled={busyId === u.id}
                        onClick={() => void toggleRole(u)}
                      >
                        {busyId === u.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : u.role === "admin" ? (
                          <ShieldOff className="size-4" />
                        ) : (
                          <ShieldCheck className="size-4" />
                        )}
                        {u.role === "admin" ? "Revoke" : "Make admin"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-destructive"
                        disabled={busyId === u.id}
                        onClick={() => void wipeUser(u)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {current + 1} of {pageCount} · {filtered.length} users</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" disabled={current === 0} onClick={() => setPage(current - 1)}>
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <form onSubmit={changePassword} className="glass-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="size-4 text-primary" /> Change your admin password
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="h-10 rounded-xl"
            />
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="h-10 rounded-xl"
            />
          </div>
          <Button type="submit" disabled={savingPassword} className="btn-hero mt-4 h-10 rounded-xl font-semibold hover:brightness-110">
            {savingPassword && <Loader2 className="size-4 animate-spin" />} Update password
          </Button>
        </form>

        <div className="glass-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Trash2 className="size-4 text-destructive" /> Danger zone
          </h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete activity logs and image records for every user. Accounts and roles are kept.
          </p>
          <Button variant="outline" className="mt-4 h-10 rounded-xl text-destructive" onClick={() => void wipeAll()}>
            <Trash2 className="size-4" /> Clear all user history
          </Button>
        </div>
      </div>

      <div className="glass-card mt-6 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Activity className="size-4 text-primary" /> Live activity feed
        </h2>
        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : feed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {feed.map((log, i) => (
              <li
                key={log.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm duration-500 animate-in fade-in slide-in-from-left-2"
              >
                <span className="size-2 rounded-full bg-primary" />
                <span className="font-medium">{log.action}</span>
                <span className="text-muted-foreground">{log.email}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
