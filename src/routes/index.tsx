import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Glasses AI — Sign in to your frame studio" },
      {
        name: "description",
        content:
          "Sign in to Glasses AI to detect your face shape and try on eyeglass frames that match you.",
      },
      { property: "og:title", content: "Glasses AI — Sign in to your frame studio" },
      { property: "og:description", content: "Secure sign-in for the Glasses AI face shape studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/studio" : "/login" });
  },
  component: () => null,
});
