import clsx from "clsx";

type StatusBadgeProps = {
  tone: "green" | "amber" | "blue";
  label: string;
};

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <span className={clsx("badge", tone === "green" && "badge-green", tone === "amber" && "badge-amber", tone === "blue" && "badge-blue")}>
      {label}
    </span>
  );
}
