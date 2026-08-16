import { useEffect } from "react";
import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    void logActivity("Page Visit", { page: pathname });
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <Outlet />
    </div>
  );
}
