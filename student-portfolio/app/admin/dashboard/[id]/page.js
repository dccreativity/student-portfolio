"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { SECTION_SCHEMA } from "@/lib/sectionSchema";
import SectionEditor from "@/components/SectionEditor";
import MediaGallery from "@/components/MediaGallery";

export default function AdminStudentView() {
  const { id } = useParams();
  const supabase = createClient();

  const [student, setStudent] = useState(null);
  const [activeSection, setActiveSection] = useState(SECTION_SCHEMA[0].key);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", id).single().then(({ data }) => setStudent(data));
  }, [id]);

  if (!student) return <div className="p-10 text-neutral-500">Loading…</div>;

  const meta = SECTION_SCHEMA.find((s) => s.key === activeSection);

  return (
    <main className="min-h-screen bg-cream p-6 md:p-10">
      <Link href="/admin/dashboard" className="text-sm text-neutral-500">
        ← All students
      </Link>
      <h1 className="font-display text-3xl mt-2 mb-1">{student.full_name}</h1>
      <p className="text-neutral-500 mb-8">{student.email}</p>

      <div className="grid md:grid-cols-[240px_1fr] gap-6">
        <nav className="space-y-1 max-h-[80vh] overflow-y-auto pr-1">
          {SECTION_SCHEMA.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`w-full text-left rounded-xl px-3 py-2 text-sm ${
                activeSection === s.key ? "bg-ink text-white" : "hover:bg-white/70"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <section className="bg-white/70 border border-line rounded-3xl p-6">
          <h2 className="font-medium mb-4">{meta.label}</h2>
          {meta.type === "media" ? (
            <MediaGallery userId={id} sectionKey={meta.key} mediaType={meta.mediaType} />
          ) : (
            <SectionEditor userId={id} sectionKey={meta.key} />
          )}
        </section>
      </div>
    </main>
  );
}
