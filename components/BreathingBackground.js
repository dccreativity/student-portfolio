// Must be rendered as the FIRST child of its container: the sibling
// selector in globals.css lifts everything after it above this layer.
export default function BreathingBackground({ hue = false }) {
  return (
    <div className={`breathing-bg ${hue ? "breathing-bg-hue" : ""}`} aria-hidden="true">
      <span className="blob-1" />
      <span className="blob-2" />
      <span className="blob-3" />
    </div>
  );
}
