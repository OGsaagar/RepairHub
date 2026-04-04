import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../components/shared/page-header";
import { chatMessages, fetchClientWorkspaceData } from "../data/mock-data";

export function ClientWorkspacePage() {
  const { data } = useQuery({
    queryKey: ["client-workspace"],
    queryFn: fetchClientWorkspaceData,
  });

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#143316_0%,#1d4b20_42%,#2b6430_100%)] p-8 text-white shadow-[var(--shadow-lg)]">
        <PageHeader
          aside={<div className="rounded-[20px] bg-white/8 px-5 py-4 text-sm text-white/80">{data.summary.greenPoints} green points · {data.summary.totalRepairs} total repairs</div>}
          className="border-white/10 pb-0"
          description="Track active repairs, confirm collections, review completed work, and keep the conversation with your repairer attached to the job."
          eyebrow="Client Workspace"
          title={`Welcome back, ${data.summary.name}`}
        >
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/80">
            <span>{data.summary.moneySaved} saved vs replacing</span>
            <span>{data.summary.co2Avoided} CO₂ avoided</span>
          </div>
        </PageHeader>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {data.activeRepairs.map((repair) => (
            <div key={repair.id} className="surface-card p-6">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="mb-2 text-lg font-semibold text-[var(--ink)]">{repair.item}</p>
                  <p className="text-sm text-[var(--ink-60)]">
                    {repair.issue} · Ref #{repair.reference}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--ink-40)]">{repair.status.replaceAll("_", " ")}</p>
                  <p className="text-sm text-[var(--ink-60)]">{repair.eta}</p>
                </div>
              </div>
              <div className="mb-5 grid gap-3 md:grid-cols-6">
                {repair.timeline.map((step, index) => (
                  <div key={step} className="text-center">
                    <div className={`mx-auto mb-2 flex size-10 items-center justify-center rounded-full border ${
                      index <= repair.currentStep ? "border-[var(--green)] bg-[var(--green)] text-white" : "border-[var(--cream-3)] bg-[var(--cream-2)] text-[var(--ink-40)]"
                    }`}>
                      {index + 1}
                    </div>
                    <p className="text-xs font-semibold text-[var(--ink-60)]">{step}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-[20px] bg-[var(--cream-2)] p-4 text-sm text-[var(--ink-60)]">
                <span className="font-semibold text-[var(--ink)]">Update:</span> {repair.latestUpdate}
              </div>
            </div>
          ))}

          <div className="surface-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">History</p>
                <h3 className="display text-3xl text-[var(--green)]">Past repairs</h3>
              </div>
              <button className="rounded-full border border-[var(--cream-3)] px-4 py-2 text-sm font-semibold text-[var(--ink-60)]" type="button">
                Export PDF
              </button>
            </div>
            <div className="space-y-3">
              {data.pastRepairs.map((repair) => (
                <div key={repair.item} className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--card)] p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-[var(--ink)]">{repair.item}</p>
                      <p className="text-sm text-[var(--ink-60)]">
                        {repair.repairer} · {repair.date}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--green)]">
                      {repair.amount} · {"★".repeat(repair.rating)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="soft-panel rounded-[24px] p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--green-mid)]">Personal Impact</p>
            <h3 className="display mb-3 text-3xl text-[var(--green)]">72% to Silver Tier</h3>
            <p className="text-sm leading-7 text-[var(--ink-60)]">Every repair keeps waste out of landfill and supports local repair skills.</p>
            <div className="mt-4 space-y-2 text-sm text-[var(--ink-60)]">
              <p>{data.summary.co2Avoided} CO₂ avoided</p>
              <p>{data.summary.totalRepairs} items kept in use</p>
              <p>{data.summary.moneySaved} saved</p>
            </div>
          </div>
          <div className="surface-card p-6">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Chat Panel</p>
            <div className="space-y-3">
              {chatMessages.map((message) => (
                <div key={`${message.time}-${message.body}`} className={`rounded-[18px] p-3 text-sm ${message.from === "repairer" ? "bg-[var(--cream-2)] text-[var(--ink)]" : "bg-[var(--green)] text-white"}`}>
                  <p>{message.body}</p>
                  <p className={`mt-2 text-xs ${message.from === "repairer" ? "text-[var(--ink-40)]" : "text-white/70"}`}>{message.time}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
