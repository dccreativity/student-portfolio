import Image from "next/image";

// public/logo.png is the Ahsing wordmark with a real alpha channel, so it
// drops straight onto any background. `dark` inverts the black ink to
// white for the near-black sidebar and admin panels.
export default function Logo({ className = "h-9 w-auto", dark = false }) {
  return (
    <Image
      src="/logo.png"
      alt="folio."
      width={542}
      height={175}
      priority
      className={`${className} w-auto object-contain ${dark ? "invert" : ""}`}
    />
  );
}
