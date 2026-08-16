import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { recordLogin } from "@/lib/auth-actions";

export const Route = createFileRoute("/admin-login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin access · Glasses AI Mission Control" },
      { name: "description", content: "Restricted administrator sign-in for the Glasses AI operations console." },
      { property: "og:title", content: "Admin access · Glasses AI" },
      { property: "og:description", content: "Restricted administrator sign-in for Glasses AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

const emailSchema = z.string().trim().email("Enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      toast.error(parsedEmail.error.issues[0]!.message);
      return;
    }
    const parsedPassword = passwordSchema.safeParse(password);
    if (!parsedPassword.success) {
      toast.error(parsedPassword.error.issues[0]!.message);
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsedEmail.data,
        password: parsedPassword.data,
      });
      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        toast.error("This account does not have administrator access.");
        return;
      }

      await recordLogin();
      toast.success("Welcome to Mission Control");
      await navigate({ to: "/admin", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="animate-float-slow absolute -left-40 -top-40 size-[34rem] rounded-full bg-accent/15 blur-3xl" />
        <div className="animate-float-slow absolute -bottom-52 -right-40 size-[36rem] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="glass-card w-full max-w-md p-8 duration-500 animate-in fade-in slide-in-from-bottom-4">
        <div className="mb-7 text-center">
          <ShieldCheck className="mx-auto size-9 text-primary" />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            <span className="text-gradient">MISSION CONTROL</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Administrator access only</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Admin email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="h-11 rounded-xl pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-xl pl-9"
              />
            </div>
          </div>

          <Button type="submit" disabled={busy} className="btn-hero h-12 w-full rounded-xl font-semibold hover:brightness-110">
            {busy && <Loader2 className="size-4 animate-spin" />}
            Enter dashboard
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Non-administrator accounts are signed out automatically.
        </p>
      </div>
    </main>
  );
}
