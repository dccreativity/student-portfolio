"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";

// The signed-in person's own profile, for screens whose controls depend on
// who is looking.
//
// This decides what to put on screen and nothing more. The real gate is
// row-level security in the database: an ordinary admin who forged this
// value client-side would still have every write refused, because no
// write policy matches them (see
// supabase/migration-superadmin-uid-realtime.sql).
export function useViewer() {
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", user.id)
        .single();

      if (!cancelled) setViewer(data ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return viewer;
}

export function isSuperAdmin(viewer) {
  return viewer?.role === "superadmin";
}
