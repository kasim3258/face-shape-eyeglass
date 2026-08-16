import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Glasses, Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { recordLogin } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · Glasses AI" },
      { name: "description", content: "Sign in or create your Glasses AI account to analyse your face shape and try on frames." },
      { property: "og:title", content: "Sign in · Glasses AI" },
      { property: "og:description", content: "Secure email and password access to the Glasses AI studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

const emailSchema = z.string().trim().email("Enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().trim().min(2, "Enter your full name").max(80, "Name is too long");

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      const pending = sessionStorage.getItem("pending-oauth-login");
      const finish = async () => {
        if (pending) {
          sessionStorage.removeItem("pending-oauth-login");
          await recordLogin();
          toast.success("Signed in with Google");
        }
        await navigate({ to: "/studio", replace: true });
      };
      void finish();
    });
  }, [navigate]);

  const signInWithGoogle = async () => {
    setBusy(true);
    try {
      sessionStorage.setItem("pending-oauth-login", "1");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) {
        sessionStorage.removeItem("pending-oauth-login");
        toast.error(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      sessionStorage.removeItem("pending-oauth-login");
      await recordLogin();
      toast.success("Signed in with Google");
      await navigate({ to: "/studio", replace: true });
    } catch (error) {
      sessionStorage.removeItem("pending-oauth-login");
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const parsedEmail = emailSchema.safeParse(email);
      if (!parsedEmail.success) {
        toast.error(parsedEmail.error.issues[0]!.message);
        return;
      }

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent(true);
        toast.success("Password reset link sent. Check your inbox.");
        return;
      }

      const parsedPassword = passwordSchema.safeParse(password);
      if (!parsedPassword.success) {
        toast.error(parsedPassword.error.issues[0]!.message);
        return;
      }

      if (mode === "signup") {
        const parsedName = nameSchema.safeParse(name);
        if (!parsedName.success) {
          toast.error(parsedName.error.issues[0]!.message);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: parsedEmail.data,
          password: parsedPassword.data,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsedName.data },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Account created. Confirm your email to sign in.");
          return;
        }
        await recordLogin();
        toast.success("Welcome to Glasses AI");
        await navigate({ to: "/studio", replace: true });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: parsedEmail.data,
        password: parsedPassword.data,
      });
      if (error) throw error;
      await recordLogin();
      toast.success("Signed in");
      await navigate({ to: "/studio", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="animate-float-slow absolute -right-40 -top-40 size-[32rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="animate-float-slow absolute -bottom-52 -left-40 size-[36rem] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="glass-card w-full max-w-md p-8 duration-500 animate-in fade-in slide-in-from-bottom-4">
        <div className="mb-7 text-center">
          <Glasses className="mx-auto size-9 text-primary" />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
            <span className="text-gradient">GLASSES AI</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" && "Sign in to your frame studio"}
            {mode === "signup" && "Create your account"}
            {mode === "forgot" && "Reset your password"}
          </p>
        </div>

        <div className="mb-6 flex gap-1 rounded-2xl border border-border bg-white/5 p-1">
          {([
            { id: "signin", label: "Sign in" },
            { id: "signup", label: "Sign up" },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => { setMode(id); setSent(false); }}
              className={cn(
                "flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                mode === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" className="h-11 rounded-xl pl-9" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 rounded-xl pl-9" />
            </div>
          </div>

          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-xl pl-9"
                />
              </div>
            </div>
          )}

          <Button type="submit" disabled={busy} className="btn-hero h-12 w-full rounded-xl font-semibold hover:brightness-110">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </Button>
        </form>

        {mode !== "forgot" && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={signInWithGoogle}
              className="h-12 w-full rounded-xl font-semibold"
            >
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
                <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.7l4-3z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
              </svg>
              Continue with Google
            </Button>
          </>
        )}

        {sent && (
          <p className="mt-4 rounded-xl border border-border bg-primary/10 p-3 text-center text-sm">
            Check your inbox for the email we just sent.
          </p>
        )}

        <div className="mt-6 text-center text-sm">
          {mode === "forgot" ? (
            <button type="button" className="text-primary hover:underline" onClick={() => { setMode("signin"); setSent(false); }}>
              Back to sign in
            </button>
          ) : (
            <button type="button" className="text-muted-foreground hover:text-primary hover:underline" onClick={() => { setMode("forgot"); setSent(false); }}>
              Forgot your password?
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
