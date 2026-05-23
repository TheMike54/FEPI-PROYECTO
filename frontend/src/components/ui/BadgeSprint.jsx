export default function BadgeSprint({ codigo, sprint }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sigecop-blue-light text-sigecop-blue text-xs font-semibold uppercase tracking-wide">
      <span>{codigo}</span>
      <span className="opacity-50">·</span>
      <span>{sprint}</span>
    </span>
  );
}
