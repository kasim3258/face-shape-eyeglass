import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password · Glasses AI" },
      { name: "description", content: "Choose a new password for your Glasses AI account." },
      { property: "og:title", content: "Set a new password · Glasses AI" },
      { property: "og:description", content: "Complete your Glasses AI password reset." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().min(6, "Password must be at least 6 characters").safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You can sign in now.");
      await supabase.auth.signOut();
      await navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <form onSubmit={submit} className="glass-card w-full max-w-md space-y-5 p-8">
        <div className="text-center">
          <KeyRound className="mx-auto size-8 text-primary" />
          <h1 className="mt-3 text-2xl font-bold">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a strong password you don't use elsewhere.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input id="confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <Button type="submit" disabled={busy} className="btn-hero h-12 w-full rounded-xl font-semibold hover:brightness-110">
          {busy && <Loader2 className="size-4 animate-spin" />} Update password
        </Button>
      </form>
    </main>
  );
}
