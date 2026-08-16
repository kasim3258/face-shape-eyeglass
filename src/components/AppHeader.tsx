import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Glasses, LayoutDashboard, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { signOutUser } from "@/lib/auth-actions";

export function AppHeader() {
  const { profile, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOutUser();
      toast.success("Signed out");
      await navigate({ to: "/auth", replace: true });
    } catch {
      toast.error("Could not sign out. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/studio" className="flex items-center gap-2 font-semibold">
          <Glasses className="size-5 text-primary" />
          <span className="text-gradient text-lg font-extrabold tracking-tight">GLASSES AI</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {profile?.full_name || user?.email}
          </span>
          {isAdmin && (
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link to="/admin">
                <LayoutDashboard className="size-4" /> Admin
              </Link>
            </Button>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={handleSignOut} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
