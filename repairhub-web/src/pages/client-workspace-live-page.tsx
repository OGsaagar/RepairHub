import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../components/shared/page-header";
import { StatCard } from "../components/shared/stat-card";
import { chatMessages } from "../data/mock-data";
import { api, type RepairJobPayload, type RepairRequestPayload } from "../lib/api/client";
import { useAuthStore } from "../state/auth-store";

type ClientWorkspaceView = {
  repairRequests: RepairRequestPayload[];
  approvalQueue: RepairRequestPayload[];
  activeJobs: RepairJobPayload[];
  completedJobs: RepairJobPayload[];
};

function formatStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}

async function fetchClientWorkspaceView(): Promise<ClientWorkspaceView> {
  const [repairRequests, jobs] = await Promise.all([api.listRepairRequests(), api.getClientJobs()]);
  const bookedRequestIds = new Set(jobs.map((job) => job.repair_request));

  return {
    repairRequests,
    approvalQueue: repairRequests.filter(
      (repairRequest) =>
        (repairRequest.selected_repairer || repairRequest.selection_status !== "none") &&
        !bookedRequestIds.has(repairRequest.id),
    ),
    activeJobs: jobs.filter((job) => !["collected", "completed"].includes(job.status)),
    completedJobs: jobs.filter((job) => ["collected", "completed"].includes(job.status)),
  };
}

export function ClientWorkspaceLivePage() {
  const user = useAuthStore((state) => state.user);
  const { data } = useQuery({
    queryKey: ["client-workspace"],
    queryFn: fetchClientWorkspaceView,
  });

  if (!data) {
    return null;
  }

  const pendingApprovals = data.approvalQueue.filter((request) => request.selection_status === "pending").length;
  const approvedAwaitingPayment = data.approvalQueue.filter((request) => request.selection_status === "approved").length;

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#143316_0%,#1d4b20_42%,#2b6430_100%)] p-8 text-white shadow-[var(--shadow-lg)]">
        <PageHeader
          aside={
            <div className="rounded-[20px] bg-white/8 px-5 py-4 text-sm text-white/80">
              {data.approvalQueue.length} repairer decisions · {data.activeJobs.length} live repair(s)
            </div>
          }
          className="border-white/10 pb-0"
          description="Track repairer approval decisions, unlock payment only after approval, and follow the same live status updates the repairer sets on the job."
          eyebrow="Client Workspace"
          title={`Welcome back, ${user?.first_name ?? "Customer"}`}
        >
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/80">
            <span>{data.repairRequests.length} total repair request(s)</span>
            <span>{data.completedJobs.length} completed collection(s)</span>
          </div>
        </PageHeader>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard helper="Waiting for a repairer response" label="Pending Approval" value={pendingApprovals} />
        <StatCard helper="Ready to return and pay" label="Approved Awaiting Payment" value={approvedAwaitingPayment} />
        <StatCard helper="Live statuses from repairers" label="Active Repairs" value={data.activeJobs.length} />
        <StatCard helper="Collected or completed items" label="Completed" value={data.completedJobs.length} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="surface-card p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Repairer Decisions</p>
              <h3 className="display text-3xl text-[var(--green)]">Approval and rejection queue</h3>
            </div>
            {data.approvalQueue.length ? (
              <div className="space-y-4">
                {data.approvalQueue.map((repairRequest) => (
                  <div key={repairRequest.id} className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--card)] p-5">
                    <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-[var(--ink)]">{repairRequest.item_name}</p>
                        <p className="text-sm text-[var(--ink-60)]">
                          {repairRequest.category_name ?? "Uncategorised"} · {repairRequest.selected_repairer_name ?? "No repairer selected"}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--cream-2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-60)]">
                        {formatStatusLabel(repairRequest.selection_status)}
                      </span>
                    </div>
                    <p className="mb-3 text-sm text-[var(--ink-60)]">
                      <span className="font-semibold text-[var(--ink)]">Your reason:</span> {repairRequest.customer_selection_reason || "No reason submitted yet."}
                    </p>
                    <p className="text-sm text-[var(--ink-60)]">
                      <span className="font-semibold text-[var(--ink)]">Repairer response:</span>{" "}
                      {repairRequest.repairer_response_reason ||
                        (repairRequest.selection_status === "pending"
                          ? "Waiting for the repairer to review this item."
                          : repairRequest.selection_status === "approved"
                            ? "Approved. You can now return to the request flow and confirm payment."
                            : "No response recorded.")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-[var(--ink-60)]">No repairer approvals are waiting right now. Select a matched repairer from the request flow to start the review process.</p>
            )}
          </section>

          <section className="surface-card p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Live Repair Status</p>
              <h3 className="display text-3xl text-[var(--green)]">Active repairs</h3>
            </div>
            {data.activeJobs.length ? (
              <div className="space-y-4">
                {data.activeJobs.map((job) => (
                  <div key={job.id} className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--card)] p-5">
                    <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-[var(--ink)]">{job.item_name}</p>
                        <p className="text-sm text-[var(--ink-60)]">
                          {job.repairer_name} · Ref #{job.reference_code}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--green-light)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--green)]">
                        {formatStatusLabel(job.status)}
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-[var(--ink-60)]">
                      <span className="font-semibold text-[var(--ink)]">Issue:</span> {job.issue_description}
                    </p>
                    <p className="mb-2 text-sm text-[var(--ink-60)]">
                      <span className="font-semibold text-[var(--ink)]">Quote:</span> A${job.quote_amount}
                    </p>
                    <div className="rounded-[18px] bg-[var(--cream-2)] p-4 text-sm text-[var(--ink-60)]">
                      <span className="font-semibold text-[var(--ink)]">Latest update:</span> {job.latest_update || "The repairer has not posted an update yet."}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-[var(--ink-60)]">No active repair jobs yet. Once payment is confirmed after approval, the repair status will appear here.</p>
            )}
          </section>

          {data.completedJobs.length ? (
            <section className="surface-card p-6">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Completed Jobs</p>
                <h3 className="display text-3xl text-[var(--green)]">Collected items</h3>
              </div>
              <div className="space-y-3">
                {data.completedJobs.map((job) => (
                  <div key={job.id} className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--card)] p-4">
                    <p className="font-semibold text-[var(--ink)]">{job.item_name}</p>
                    <p className="text-sm text-[var(--ink-60)]">
                      {job.repairer_name} · {formatStatusLabel(job.status)} · Ref #{job.reference_code}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          <div className="soft-panel rounded-[24px] p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--green-mid)]">Payment Rule</p>
            <h3 className="display mb-3 text-3xl text-[var(--green)]">Approval before payment</h3>
            <p className="text-sm leading-7 text-[var(--ink-60)]">
              RepairHub now blocks payment until the selected repairer approves your item. Pending and rejected decisions stay visible here until you act.
            </p>
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
