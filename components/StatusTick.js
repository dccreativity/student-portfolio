// A green tick where a section has been filled in and saved, a yellow
// dash where it is still pending. Used on the student's dashboard and in
// the admin's per-grade table, so both read the same way.

export default function StatusTick({ done, label }) {
  const title = label || (done ? "Completed" : "Pending");

  return (
    <span
      title={title}
      aria-label={title}
      role="img"
      className={`inline-grid place-items-center w-5 h-5 rounded-full text-[11px] font-bold leading-none shrink-0 ${
        done
          ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300"
          : "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
      }`}
    >
      {done ? "✓" : "–"}
    </span>
  );
}
