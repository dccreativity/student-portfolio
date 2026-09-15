"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { SECTION_SCHEMA } from "@/lib/sectionSchema";
import { isSectionFilled } from "@/lib/completion";
import StatusTick from "@/components/StatusTick";

// One row per student in a grade, one column per section of the
// portfolio, a green tick wherever that student has saved something and a
// yellow dash where they have not.
//
// Loaded one grade at a time on purpose. The tick is decided by the same
// isSectionFilled() the student's own dashboard uses, which needs each
// section's saved content — pulling that for every student in the school
// at once would mean megabytes of JSON for a page of ticks.

// "arranged alphabetically, as per first name" — so sort on the given
// name, not on whatever the surname happens to be.
function firstName(student) {
  return String(student.full_name || student.email || "")
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();
}

export function byFirstName(a, b) {
  return firstName(a).localeCompare(firstName(b)) || String(a.email).localeCompare(String(b.email));
}

export default function GradeCompletionTable({ students, gradeLabel }) {
  const supabase = createClient();
  const [contentByStudent, setContentByStudent] = useState({});
  const [mediaByStudent, setMediaByStudent] = useState({});
  const [loading, setLoading] = useState(true);

  const ids = useMemo(() => students.map((s) => s.id).sort().join(","), [students]);

  const load = useCallback(async () => {
    const idList = ids ? ids.split(",") : [];
    if (idList.length === 0) {
      setContentByStudent({});
      setMediaByStudent({});
      setLoading(false);
      return;
    }

    const [{ data: rows }, { data: media }] = await Promise.all([
      supabase.from("portfolio_data").select("user_id, section, content").in("user_id", idList),
      supabase.from("portfolio_media").select("user_id, section").in("user_id", idList),
    ]);

    const byStudent = {};
    (rows || []).forEach((r) => {
      byStudent[r.user_id] = byStudent[r.user_id] || {};
      byStudent[r.user_id][r.section] = r.content;
    });

    const counts = {};
    (media || []).forEach((m) => {
      counts[m.user_id] = counts[m.user_id] || {};
      counts[m.user_id][m.section] = (counts[m.user_id][m.section] || 0) + 1;
    });

    setContentByStudent(byStudent);
    setMediaByStudent(counts);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  useEffect(() => {
    setLoading(true);
    load();

    // Realtime: a student saving a section anywhere in the school flips
    // their tick here without the page being reloaded.
    const channel = supabase
      .channel(`admin-completion-${gradeLabel}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "portfolio_data" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "portfolio_media" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, gradeLabel]);

  const sorted = useMemo(() => [...students].sort(byFirstName), [students]);

  if (students.length === 0) {
    return <p className="text-sm text-neutral-500 py-4">No students in {gradeLabel}.</p>;
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white text-left align-bottom pb-2 pr-4 border-b border-line">
              <span className="text-xs uppercase tracking-wide text-neutral-400">Student</span>
            </th>
            <th className="align-bottom pb-2 px-2 border-b border-line">
              <span className="text-xs uppercase tracking-wide text-neutral-400">Done</span>
            </th>
            {SECTION_SCHEMA.map((s) => (
              <th key={s.key} className="align-bottom pb-2 px-1 border-b border-line">
                {/* Seventeen columns of full section names would be
                    unreadable across the page, so the headings stand up
                    and keep their whole label. */}
                <div
                  className="h-40 text-xs text-neutral-500 font-normal whitespace-nowrap mx-auto"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  {s.label}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((student) => {
            const content = contentByStudent[student.id] || {};
            const media = mediaByStudent[student.id] || {};
            const done = SECTION_SCHEMA.filter((s) =>
              isSectionFilled(s, content[s.key], media[s.key])
            ).length;

            return (
              <tr key={student.id} className="group">
                <td className="sticky left-0 z-10 bg-white group-hover:bg-cream/70 py-2 pr-4 border-b border-line">
                  <Link href={`/admin/dashboard/${student.id}`} className="block min-w-[13rem] hover:text-clay">
                    <span className="font-medium block truncate">
                      {student.full_name || "Unnamed student"}
                    </span>
                    <span className="text-xs text-neutral-500 block truncate">
                      {student.uid ? `UID ${student.uid} · ` : ""}
                      {student.email}
                    </span>
                  </Link>
                </td>
                <td className="py-2 px-2 border-b border-line text-center whitespace-nowrap">
                  <span className="text-xs font-medium text-neutral-600">
                    {loading ? "—" : `${done}/${SECTION_SCHEMA.length}`}
                  </span>
                </td>
                {SECTION_SCHEMA.map((s) => (
                  <td key={s.key} className="py-2 px-1 border-b border-line text-center">
                    {loading ? (
                      <span className="inline-block w-5 h-5 rounded-full bg-neutral-100" />
                    ) : (
                      <StatusTick
                        done={isSectionFilled(s, content[s.key], media[s.key])}
                        label={`${student.full_name || student.email} — ${s.label}`}
                      />
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
