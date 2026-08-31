import Image from "next/image";

// The uploaded wordmark image has a light dotted background rather than
// true transparency. Blend modes let it sit cleanly on both light auth
// screens (multiply drops the white) and the dark sidebar (invert +
// screen turns it into a clean white mark on transparent-looking dark).
export default function Logo({ className = "h-9 w-auto", dark = false }) {
  return (
    <Image
      src="/logo.png"
      alt="folio."
      width={200}
      height={80}
      priority
      className={`${className} object-contain ${
        dark ? "invert mix-blend-screen" : "mix-blend-multiply"
      }`}
    />
  );
}
