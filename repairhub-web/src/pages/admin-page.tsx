import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../components/shared/page-header";
import { StatCard } from "../components/shared/stat-card";
import { fetchAdminOverview } from "../data/mock-data";

export function AdminPage() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: fetchAdminOverview,
  });

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Internal Admin" title="Ops command surface" description="Review repairer applications, resolve disputes, release payouts, moderate community content, and audit AI outputs from one protected SPA route group." />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.queues.map((queue) => (
          <StatCard key={queue.label} helper={queue.helper} label={queue.label} value={queue.value} />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-3">
        <div className="surface-card p-6">
          <h3 className="display mb-4 text-3xl text-[var(--green)]">Repairer Review Queue</h3>
          <div className="space-y-3">
            {data.applications.map((application) => (
              <div key={application.name} className="rounded-[18px] border border-[var(--cream-3)] bg-[var(--card)] p-4">
                <p className="font-semibold text-[var(--ink)]">{application.name}</p>
                <p className="text-sm text-[var(--ink-60)]">
                  {application.category} · {application.city}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--amber)]">{application.status}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="surface-card p-6">
          <h3 className="display mb-4 text-3xl text-[var(--green)]">Pending Payout Releases</h3>
          <div className="space-y-3">
            {data.payouts.map((payout) => (
              <div key={payout.repairer} className="rounded-[18px] border border-[var(--cream-3)] bg-[var(--card)] p-4">
                <p className="font-semibold text-[var(--ink)]">{payout.repairer}</p>
                <p className="text-sm text-[var(--ink-60)]">{payout.amount}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--green)]">{payout.status}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="surface-card p-6">
          <h3 className="display mb-4 text-3xl text-[var(--green)]">Dispute Desk</h3>
          <div className="space-y-3">
            {data.disputes.map((dispute) => (
              <div key={dispute.reference} className="rounded-[18px] border border-[var(--cream-3)] bg-[var(--card)] p-4">
                <p className="font-semibold text-[var(--ink)]">{dispute.reference}</p>
                <p className="text-sm text-[var(--ink-60)]">{dispute.issue}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--amber)]">
                  {dispute.owner} · {dispute.priority}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
