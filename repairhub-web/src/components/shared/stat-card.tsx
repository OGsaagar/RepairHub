type StatCardProps = {
  label: string;
  value: string | number;
  helper: string;
};

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div className="surface-card rounded-[20px] p-5 cursor-pointer transition duration-200 hover:-translate-y-0.5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--ink-40)]">{label}</p>
      <p className="display mb-2 text-3xl text-[var(--green)]">{value}</p>
      <p className="text-sm text-[var(--ink-60)]">{helper}</p>
    </div>
  );
}
