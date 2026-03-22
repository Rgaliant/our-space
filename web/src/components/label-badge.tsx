interface Label {
  id: string;
  name: string;
  color: string;
}

interface Props {
  label: Label;
  size?: "sm" | "xs";
}

export function LabelBadge({ label, size = "sm" }: Props) {
  const textSize = size === "xs" ? "text-[10px]" : "text-xs";
  const padding = size === "xs" ? "px-1.5 py-0.5" : "px-2 py-0.5";
  const dotSize = size === "xs" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span
      className={`inline-flex items-center gap-1 ${padding} rounded border ${textSize} font-medium`}
      style={{
        borderColor: `${label.color}33`,
        backgroundColor: `${label.color}15`,
        color: label.color,
      }}
    >
      <span className={`${dotSize} rounded-full shrink-0`} style={{ backgroundColor: label.color }} />
      {label.name}
    </span>
  );
}
