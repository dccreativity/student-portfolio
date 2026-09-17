"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { SECTION_SCHEMA } from "@/lib/sectionSchema";
import { isSectionFilled } from "@/lib/completion";
import StatusTick from "@/components/StatusTick";
import { RemoveCheckbox } from "@/components/RemoveProfiles";

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

export default function GradeCompletionTable({ students, gradeLabel, removal }) {
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
    // Only this box scrolls sideways. The page itself never does, so the
    // rest of the screen stays put while the columns move.
    <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-line">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-20 w-64 min-w-[16rem] bg-white text-left align-bottom p-3 border-b border-line">
              <span className="text-xs uppercase tracking-wide text-neutral-400">Student</span>
            </th>
            <th className="sticky left-64 z-20 bg-white align-bottom p-3 border-b border-r border-line">
              <span className="text-xs uppercase tracking-wide text-neutral-400">Done</span>
            </th>
            {SECTION_SCHEMA.map((s) => (
              // Ordinary horizontal headings, wrapped inside a fixed
              // column width. The full section name is on hover, since
              // the heading is shortened to fit.
              <th
                key={s.key}
                title={s.label}
                className="align-bottom p-3 border-b border-line bg-white"
              >
                <div className="w-24 text-[11px] font-medium leading-tight text-neutral-600 text-center">
                  {s.short || s.label}
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
                <td className="sticky left-0 z-10 w-64 min-w-[16rem] bg-white group-hover:bg-cream/70 p-3 border-b border-line">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <RemoveCheckbox removal={removal} student={student} />
                    <Link
                      href={`/admin/dashboard/${student.id}`}
                      className="block min-w-0 flex-1 hover:text-clay"
                    >
                      <span className="font-medium block truncate">
                        {student.full_name || "Unnamed student"}
                      </span>
                      <span className="text-xs text-neutral-500 block truncate">
                        {student.uid ? `UID ${student.uid} · ` : ""}
                        {student.email}
                      </span>
                    </Link>
                  </div>
                </td>
                <td className="sticky left-64 z-10 bg-white group-hover:bg-cream/70 p-3 border-b border-r border-line text-center whitespace-nowrap">
                  <span className="text-xs font-medium text-neutral-600">
                    {loading ? "—" : `${done}/${SECTION_SCHEMA.length}`}
                  </span>
                </td>
                {SECTION_SCHEMA.map((s) => (
                  <td key={s.key} className="p-3 border-b border-line text-center">
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
