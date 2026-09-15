"use client";

import { useEffect, useRef } from "react";

// A bullet-point list for the fields where students write statements —
// responsibilities, outcomes, what a project found, what a camp taught
// them. These used to be single-line text inputs: there was no way to
// press Enter and start a second point, so everything ended up crammed
// into one long sentence.
//
// The value is carried as one newline-separated string rather than an
// array, so every statement a student typed before this existed reads
// back as a first bullet instead of disappearing. Each line becomes its
// own bullet on the resume and in the preview.

export function toLines(value) {
  if (Array.isArray(value)) return value.map((v) => String(v ?? ""));
  return String(value ?? "").split("\n");
}

// Blank points are dropped on the way out: a half-finished list should
// not print empty bullets on a resume.
export function fromLines(lines) {
  return lines.map((l) => l.trim()).filter(Boolean).join("\n");
}

function autoGrow(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export default function BulletListInput({ value, onChange, placeholder, readOnly }) {
  const lines = toLines(value);
  const refs = useRef([]);
  // Which row to focus once React has rendered the new list.
  const focusNext = useRef(null);

  useEffect(() => {
    refs.current.forEach(autoGrow);
  });

  useEffect(() => {
    if (focusNext.current === null) return;
    const el = refs.current[focusNext.current];
    focusNext.current = null;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  });

  if (readOnly) {
    const shown = lines.filter(Boolean);
    if (shown.length === 0) {
      return (
        <div className="w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-sm min-h-[38px] text-neutral-400">
          —
        </div>
      );
    }
    return (
      <ul className="w-full rounded-xl border border-line bg-cream/40 px-3 py-2 text-sm text-neutral-700 space-y-1">
        {shown.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-clay select-none">•</span>
            <span className="whitespace-pre-wrap">{line}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Always render at least one row, so there is something to type into.
  const rows = lines.length > 0 ? lines : [""];

  function commit(next) {
    onChange(next.join("\n"));
  }

  function setAt(i, text) {
    commit(rows.map((l, idx) => (idx === i ? text : l)));
  }

  function addAfter(i) {
    const next = [...rows];
    next.splice(i + 1, 0, "");
    focusNext.current = i + 1;
    commit(next);
  }

  function removeAt(i) {
    const next = rows.filter((_, idx) => idx !== i);
    focusNext.current = Math.max(0, i - 1);
    commit(next.length > 0 ? next : [""]);
  }

  function handleKeyDown(e, i) {
    if (e.key === "Enter" && !e.shiftKey) {
      // Enter starts the next point. Shift+Enter is left alone so a
      // single point can still run to a second line if it needs to.
      e.preventDefault();
      addAfter(i);
      return;
    }
    if (e.key === "Backspace" && rows[i] === "" && rows.length > 1) {
      e.preventDefault();
      removeAt(i);
    }
  }

  return (
    <div className="w-full rounded-xl border border-line bg-white/80 px-2 py-2 focus-within:ring-2 focus-within:ring-clay">
      <ul className="space-y-1">
        {rows.map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-clay select-none pt-1.5 leading-none">•</span>
            <textarea
              ref={(el) => (refs.current[i] = el)}
              rows={1}
              value={line}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              placeholder={i === 0 ? placeholder : "Next point…"}
              className="flex-1 resize-none bg-transparent px-1 py-1 text-sm outline-none leading-relaxed"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="text-neutral-300 hover:text-red-600 text-lg leading-none pt-0.5"
                aria-label="Remove this point"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => addAfter(rows.length - 1)}
        className="mt-1 ml-4 text-xs text-clay font-medium"
      >
        + Add point
      </button>
      <p className="ml-4 mt-0.5 text-[11px] text-neutral-400">
        Press Enter for a new point.
      </p>
    </div>
  );
}
