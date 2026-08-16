import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpDown,
  LogIn,
  ShieldAlert,
  UserPlus,
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
import { useAuth } from "@/hooks/useAuth";
import { dailySeries, fetchAdminOverview, type AdminUser } from "@/lib/admin-data";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard · Glasses AI" },
      { name: "description", content: "Monitor users, logins and activity across the Glasses AI platform." },
      { property: "og:title", content: "Admin Dashboard · Glasses AI" },
      { property: "og:description", content: "Users, logins and activity analytics for Glasses AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});

const PAGE_SIZE = 8;

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | string }) {
  return (
    <div className="glass-card p-5 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<keyof AdminUser>("created_at");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: fetchAdminOverview,
    enabled: isAdmin,
  });

  const users = data?.users ?? [];
  const logs = data?.logs ?? [];

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = Date.now() - 7 * 86400000;
    return {
      totalUsers: users.length,
      activeToday: new Set(logs.filter((l) => l.created_at.slice(0, 10) === today).map((l) => l.user_id)).size,
      totalLogins: logs.filter((l) => l.action === "User Login").length,
      totalActions: logs.length,
      newThisWeek: users.filter((u) => new Date(u.created_at).getTime() > weekAgo).length,
    };
  }, [users, logs]);

  const series = useMemo(() => dailySeries(logs), [logs]);

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

  if (authLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        </div>
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <ShieldAlert className="size-10 text-destructive" />
        <h1 className="text-2xl font-bold">Admins only</h1>
        <p className="text-sm text-muted-foreground">
          Your account doesn't have permission to view the admin dashboard.
        </p>
        <Button className="rounded-xl" onClick={() => navigate({ to: "/studio" })}>Back to studio</Button>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8 duration-500 animate-in fade-in slide-in-from-bottom-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Users, logins and activity across Glasses AI.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Users} label="Total users" value={stats.totalUsers} />
          <StatCard icon={Zap} label="Active today" value={stats.activeToday} />
          <StatCard icon={LogIn} label="Total logins" value={stats.totalLogins} />
          <StatCard icon={Activity} label="Total actions" value={stats.totalActions} />
          <StatCard icon={UserPlus} label="New this week" value={stats.newThisWeek} />
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
            <SelectTrigger className="h-10 w-36 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                {([
                  ["full_name", "Name"],
                  ["email", "Email"],
                  ["role", "Role"],
                  ["last_login_at", "Last login"],
                  ["totalActions", "Actions"],
                  ["status", "Status"],
                ] as const).map(([key, label]) => (
                  <th key={key} className="py-3 pr-4">
                    <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => sortBy(key)}>
                      {label} <ArrowUpDown className="size-3" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="py-2"><Skeleton className="h-9 w-full rounded-lg" /></td></tr>
                ))}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No users match your filters.</td></tr>
              )}
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-border/60 transition-colors hover:bg-primary/5">
                  <td className="py-3 pr-4 font-medium">
                    <Link to="/admin/user/$userId" params={{ userId: u.id }} className="hover:text-primary hover:underline">
                      {u.full_name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                  </td>
                  <td className="py-3 pr-4">{u.totalActions}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={u.status === "Active" ? "default" : "outline"}>{u.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{filtered.length} users</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Previous
            </Button>
            <span>Page {current + 1} / {pageCount}</span>
            <Button variant="outline" size="sm" className="rounded-xl" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
