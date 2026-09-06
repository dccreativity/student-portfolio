"use client";

import { useState } from "react";

// A photograph laid over a palette gradient. The gradient is what really
// paints the area, so if the image is slow, blocked by a school network,
// or the URL ever stops resolving, the panel still looks deliberate
// instead of showing a broken-image box.
export default function PhotoBackdrop({
  src,
  gradient = "from-clay to-ink",
  overlay = "bg-ink/45",
  className = "",
  children,
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className}`}>
      {src && !failed && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      {overlay && <div className={`absolute inset-0 ${overlay}`} />}
      <div className="relative h-full">{children}</div>
    </div>
  );
}
