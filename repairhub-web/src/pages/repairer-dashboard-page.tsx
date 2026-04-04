import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../components/shared/page-header";
import { StatCard } from "../components/shared/stat-card";
import { fetchRepairerDashboardData } from "../data/mock-data";

export function RepairerDashboardPage() {
  const { data } = useQuery({
    queryKey: ["repairer-dashboard"],
    queryFn: fetchRepairerDashboardData,
  });

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        aside={<button className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white">Go Online</button>}
        eyebrow="Repairer Dashboard"
        title="Marcus Rivera"
        description="Manage active jobs, stay visible to nearby requests, and keep service catalog data aligned with your actual availability."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard key={stat.label} helper={stat.detail} label={stat.label} value={stat.value} />
        ))}
      </section>
      <section className="surface-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Active Jobs</p>
            <h3 className="display text-3xl text-[var(--green)]">Current work queue</h3>
          </div>
        </div>
        <div className="space-y-3">
          {data.activeJobs.map((job) => (
            <div key={job.customer + job.item} className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--card)] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-[var(--ink)]">
                    {job.customer} · {job.item}
                  </p>
                  <p className="text-sm text-[var(--ink-60)]">
                    {job.status} · {job.due}
                  </p>
                </div>
                <p className="display text-2xl text-[var(--green)]">{job.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="surface-card overflow-hidden">
        <div className="border-b border-[var(--cream-3)] px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Recent Job History</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--cream-2)] text-[var(--ink-60)]">
              <tr>
                {["Customer", "Item", "Date", "Earned", "Rating", "Status"].map((heading) => (
                  <th key={heading} className="px-6 py-4 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.history.map((row) => (
                <tr key={row.customer + row.item} className="border-t border-[var(--cream-3)]">
                  <td className="px-6 py-4 font-semibold text-[var(--ink)]">{row.customer}</td>
                  <td className="px-6 py-4 text-[var(--ink-60)]">{row.item}</td>
                  <td className="px-6 py-4 text-[var(--ink-60)]">{row.date}</td>
                  <td className="px-6 py-4 font-semibold text-[var(--green)]">{row.earned}</td>
                  <td className="px-6 py-4 text-[var(--ink-60)]">{row.rating}</td>
                  <td className="px-6 py-4 text-[var(--ink-60)]">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
