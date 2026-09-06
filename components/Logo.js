"use client";

import { useState } from "react";

// The school lockup: the Adani International School crest and wordmark
// alongside the "folio" mark.
//
// Two files, because the mark is in the school's colours rather than flat
// black:
//
//   public/logo-color.png   the colour lockup, for light backgrounds
//   public/logo-white.png   the white lockup, for dark backgrounds
//
// An earlier version rendered one flat-black file and flipped it to white
// with a CSS `invert` for the dark sidebar. That cannot carry a coloured
// mark — inverting it turns the magenta crest green and the blue folio
// yellow — so each surface gets its own file and no filter is applied.
//
// Sizing is by height with `w-auto`, and the file's own dimensions are
// never hard-coded, so a re-cut logo of any aspect ratio drops straight
// in without a code change.
export default function Logo({ className = "h-9", dark = false }) {
  const [failed, setFailed] = useState(false);

  // Shown only if the file is missing — while the two assets are being
  // added, say. A plain wordmark keeps the header looking deliberate
  // instead of showing a browser's broken-image icon.
  if (failed) {
    return (
      <span
        className={`${className} inline-flex items-center font-display text-xl font-semibold tracking-tight ${
          dark ? "text-white" : "text-ink"
        }`}
      >
        folio.
      </span>
    );
  }

  return (
    <img
      src={dark ? "/logo-white.png" : "/logo-color.png"}
      alt="Adani International School — folio"
      onError={() => setFailed(true)}
      className={`${className} w-auto object-contain object-left`}
    />
  );
}
