export default function BreathingBackground({ hue = false }) {
  return (
    <div className={`breathing-bg ${hue ? "breathing-bg-hue" : ""}`} aria-hidden="true">
      <span className="blob-1" />
      <span className="blob-2" />
    </div>
  );
}
