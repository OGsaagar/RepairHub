import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "../components/shared/page-header";
import { StatCard } from "../components/shared/stat-card";
import { api, type RepairJobPayload, type RepairRequestPayload, type RepairerProfilePayload } from "../lib/api/client";
import { formatRepairStatusLabel, isAwaitingActiveWork } from "../lib/repairs/status";
import { useAuthStore } from "../state/auth-store";

type RepairerDashboardView = {
  profile: RepairerProfilePayload | null;
  reviewQueue: RepairRequestPayload[];
  awaitingActiveWorkJobs: RepairJobPayload[];
  liveJobs: RepairJobPayload[];
  completedJobs: RepairJobPayload[];
};

const emptyShopForm = {
  headline: "",
  bio: "",
  city: "",
  shop_name: "",
  shop_address: "",
  shop_phone: "",
  shop_opening_hours: "",
  service_radius_km: "10.0",
};

const onlineFieldLabels: Record<string, string> = {
  headline: "repair headline",
  city: "city",
  shop_name: "shop name",
  shop_address: "shop address",
  shop_phone: "shop phone",
  shop_opening_hours: "opening hours",
};

async function fetchRepairerDashboardView(): Promise<RepairerDashboardView> {
  const [profile, reviewQueue, jobs] = await Promise.all([api.getMyRepairerProfile(), api.getRepairerQueue(), api.getRepairerJobs()]);
  const awaitingActiveWorkJobs = jobs.filter((job) => isAwaitingActiveWork(job.status));
  const activeOrCompletedRequestIds = new Set(
    jobs.filter((job) => !isAwaitingActiveWork(job.status)).map((job) => job.repair_request),
  );

  return {
    profile,
    reviewQueue: reviewQueue.filter((repairRequest) => !activeOrCompletedRequestIds.has(repairRequest.id)),
    awaitingActiveWorkJobs,
    liveJobs: jobs.filter((job) => !isAwaitingActiveWork(job.status) && !["collected", "completed"].includes(job.status)),
    completedJobs: jobs.filter((job) => ["collected", "completed"].includes(job.status)),
  };
}

export function RepairerDashboardLivePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [isProfileFormOpen, setIsProfileFormOpen] = useState(false);
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});
  const [jobNotes, setJobNotes] = useState<Record<string, string>>({});
  const [shopForm, setShopForm] = useState(emptyShopForm);
  const { data, error, isPending } = useQuery({
    queryKey: ["repairer-dashboard"],
    queryFn: fetchRepairerDashboardView,
  });

  const missingOnlineFields = Object.entries(onlineFieldLabels)
    .filter(([fieldName]) => !shopForm[fieldName as keyof typeof shopForm].trim())
    .map(([, label]) => label);

  const profileMutation = useMutation({
    mutationFn: () =>
      api.upsertMyRepairerProfile({
        ...shopForm,
        is_online: true,
      }),
    onSuccess: async () => {
      setIsProfileFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["repairer-dashboard"] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ requestId, decision }: { requestId: string; decision: "approved" | "rejected" }) =>
      api.reviewRepairSelection(requestId, {
        decision,
        repairer_reason: reviewReasons[requestId] ?? "",
      }),
    onSuccess: async (_, variables) => {
      setReviewReasons((current) => ({ ...current, [variables.requestId]: "" }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repairer-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["client-workspace"] }),
      ]);
    },
  });

  const startActiveWorkMutation = useMutation({
    mutationFn: (requestId: string) => api.startActiveWork(requestId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repairer-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["client-workspace"] }),
      ]);
    },
  });

  const transitionMutation = useMutation({
    mutationFn: ({ jobId, status, latestUpdate }: { jobId: string; status: string; latestUpdate: string }) =>
      api.transitionJob(jobId, {
        status,
        latest_update: latestUpdate,
      }),
    onSuccess: async (_, variables) => {
      setJobNotes((current) => ({ ...current, [variables.jobId]: "" }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["repairer-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["client-workspace"] }),
      ]);
    },
  });

  if (isPending) {
    return (
      <div className="surface-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Repairer Dashboard</p>
        <h1 className="display mt-2 text-3xl text-[var(--green)]">Loading dashboard</h1>
        <p className="mt-3 text-sm text-[var(--ink-60)]">Fetching your shop profile, approval queue, and live repair jobs.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="surface-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Repairer Dashboard</p>
        <h1 className="display mt-2 text-3xl text-[var(--green)]">Dashboard unavailable</h1>
        <p className="mt-3 text-sm text-[var(--ink-60)]">
          {error instanceof Error
            ? error.message
            : "RepairHub could not load the repairer dashboard right now."}
        </p>
      </div>
    );
  }

  const pendingReviews = data.reviewQueue.filter((request) => request.selection_status === "pending").length;
  const approvedAwaitingPayment = data.reviewQueue.filter((request) => request.selection_status === "approved").length;
  const onlineFormError = profileMutation.error instanceof Error ? profileMutation.error.message : null;
  return (
    <div className="space-y-8">
      <PageHeader
        aside={
          <div className="rounded-[20px] bg-[var(--cream-2)] px-5 py-4 text-sm text-[var(--ink-60)]">
            Shop details are managed by admin.
          </div>
        }
        eyebrow="Repairer Dashboard"
        title={`${user?.first_name ?? "Repairer"} ${user?.last_name ?? ""}`.trim() || "Repairer Dashboard"}
        description="Approve or reject selected repair items, give clear reasons when needed, keep customer-facing job status updated, and contact admin if your shop profile needs changes."
      />

      {isProfileFormOpen ? (
        <section className="surface-card p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Go Online</p>
            <h3 className="display text-3xl text-[var(--green)]">Repairer shop details</h3>
            <p className="mt-2 text-sm text-[var(--ink-60)]">
              These details are shown to customers when your profile is matched for their repair category.
            </p>
          </div>
          <div className="mb-5 rounded-[18px] bg-[var(--cream-2)] p-4 text-sm text-[var(--ink-60)]">
            Going online requires your repair headline, city, shop name, shop address, shop phone, and opening hours.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Repair headline
              <input
                className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                value={shopForm.headline}
                onChange={(event) => setShopForm((current) => ({ ...current, headline: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              City
              <input
                className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                value={shopForm.city}
                onChange={(event) => setShopForm((current) => ({ ...current, city: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Shop name
              <input
                className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                value={shopForm.shop_name}
                onChange={(event) => setShopForm((current) => ({ ...current, shop_name: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Shop phone
              <input
                className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                value={shopForm.shop_phone}
                onChange={(event) => setShopForm((current) => ({ ...current, shop_phone: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)] md:col-span-2">
              Shop address
              <input
                className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                value={shopForm.shop_address}
                onChange={(event) => setShopForm((current) => ({ ...current, shop_address: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Opening hours
              <input
                className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                value={shopForm.shop_opening_hours}
                onChange={(event) => setShopForm((current) => ({ ...current, shop_opening_hours: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)]">
              Service radius (km)
              <input
                className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                value={shopForm.service_radius_km}
                onChange={(event) => setShopForm((current) => ({ ...current, service_radius_km: event.target.value }))}
              />
            </label>
            <label className="block text-sm font-semibold text-[var(--ink-60)] md:col-span-2">
              Bio
              <textarea
                className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                value={shopForm.bio}
                onChange={(event) => setShopForm((current) => ({ ...current, bio: event.target.value }))}
              />
            </label>
          </div>
          {missingOnlineFields.length ? (
            <p className="mt-4 rounded-[18px] bg-[rgba(175,99,18,0.12)] p-4 text-sm text-[var(--amber)]">
              Add {missingOnlineFields.join(", ")} before customers can see this shop in repairer matches.
            </p>
          ) : null}
          {onlineFormError ? (
            <p className="mt-4 rounded-[18px] bg-[rgba(175,99,18,0.12)] p-4 text-sm text-[var(--amber)]">{onlineFormError}</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white"
              disabled={profileMutation.isPending || Boolean(missingOnlineFields.length)}
              onClick={() => profileMutation.mutate()}
              type="button"
            >
              {profileMutation.isPending ? "Saving..." : "Save & Go Online"}
            </button>
            <button
              className="rounded-full border border-[var(--cream-3)] px-5 py-3 text-sm font-semibold text-[var(--ink-60)]"
              onClick={() => setIsProfileFormOpen(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      {data.profile ? (
        <section className="soft-panel rounded-[24px] p-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--green-mid)]">Visible To Customers</p>
          <h3 className="display text-3xl text-[var(--green)]">{data.profile.shop_name || data.profile.headline}</h3>
          <p className="mt-2 text-sm text-[var(--ink-60)]">
            {data.profile.shop_address || "No shop address added yet"} · {data.profile.shop_phone || "No shop phone added yet"}
          </p>
          <p className="mt-2 text-sm text-[var(--ink-60)]">
            {data.profile.shop_opening_hours || "No opening hours added yet"} · {data.profile.is_online ? "Online for matching" : "Offline"}
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard helper="Selected items waiting for your decision" label="Pending Reviews" value={pendingReviews} />
        <StatCard helper="Approved items waiting for payment or active work" label="Approved Queue" value={approvedAwaitingPayment} />
        <StatCard helper="Jobs you can move through repair stages" label="Live Jobs" value={data.liveJobs.length} />
        <StatCard helper="Collected or completed jobs" label="Completed" value={data.completedJobs.length} />
      </section>

      <section className="surface-card p-6">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Selected Repair Items</p>
          <h3 className="display text-3xl text-[var(--green)]">Approval queue</h3>
        </div>
        {data.reviewQueue.length ? (
          <div className="space-y-4">
            {data.reviewQueue.map((repairRequest) => (
              <div key={repairRequest.id} className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--card)] p-5">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--ink)]">{repairRequest.item_name}</p>
                    <p className="text-sm text-[var(--ink-60)]">
                      {repairRequest.customer_name} · {repairRequest.category_name ?? "Uncategorised"}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--cream-2)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-60)]">
                    {formatRepairStatusLabel(repairRequest.selection_status)}
                  </span>
                </div>
                <p className="mb-3 text-sm text-[var(--ink-60)]">
                  <span className="font-semibold text-[var(--ink)]">Customer reason:</span> {repairRequest.customer_selection_reason || "No reason submitted."}
                </p>
                {repairRequest.selection_status === "pending" ? (
                  <>
                    <label className="mb-3 block text-sm font-semibold text-[var(--ink-60)]">
                      Approval or rejection reason
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                        placeholder="Add an approval note or a clear rejection reason."
                        value={reviewReasons[repairRequest.id] ?? ""}
                        onChange={(event) =>
                          setReviewReasons((current) => ({
                            ...current,
                            [repairRequest.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate({ requestId: repairRequest.id, decision: "approved" })}
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-full border border-[rgba(175,99,18,0.25)] bg-[rgba(175,99,18,0.08)] px-5 py-3 text-sm font-semibold text-[var(--amber)]"
                        disabled={reviewMutation.isPending}
                        onClick={() => reviewMutation.mutate({ requestId: repairRequest.id, decision: "rejected" })}
                        type="button"
                      >
                        Reject
                      </button>
                    </div>
                  </>
                ) : repairRequest.selection_status === "approved" ? (
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--ink-60)]">
                      <span className="font-semibold text-[var(--ink)]">Recorded response:</span>{" "}
                      {repairRequest.repairer_response_reason || "Approved and waiting for customer payment."}
                    </p>
                    <div className="rounded-[18px] bg-[var(--cream-2)] p-4 text-sm text-[var(--ink-60)]">
                      Approval is recorded. Move this item into Active Work so the customer sees the same live repair status in their workspace.
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white"
                        disabled={startActiveWorkMutation.isPending}
                        onClick={() => startActiveWorkMutation.mutate(repairRequest.id)}
                        type="button"
                      >
                        {startActiveWorkMutation.isPending ? "Starting..." : "Proceed to Active Work"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--ink-60)]">
                    <span className="font-semibold text-[var(--ink)]">Recorded response:</span>{" "}
                    {repairRequest.repairer_response_reason || "Rejected without an additional note."}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-7 text-[var(--ink-60)]">No selected repair items are waiting for review right now.</p>
        )}
      </section>

      <section className="surface-card p-6">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Live Repair Status</p>
          <h3 className="display text-3xl text-[var(--green)]">Current work queue</h3>
        </div>
        {data.liveJobs.length ? (
          <div className="space-y-4">
            {data.liveJobs.map((job) => (
              <div key={job.id} className="rounded-[20px] border border-[var(--cream-3)] bg-[var(--card)] p-5">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-[var(--ink)]">{job.item_name}</p>
                    <p className="text-sm text-[var(--ink-60)]">
                      {job.customer_name} · Ref #{job.reference_code}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--green-light)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--green)]">
                    {formatRepairStatusLabel(job.status, job.payment_status)}
                  </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-[220px_1fr_auto]">
                  <div className="rounded-[18px] bg-[var(--cream-2)] p-4 text-sm text-[var(--ink-60)]">
                    {job.status === "in_repair" ? (
                      <>
                        <p className="font-semibold text-[var(--ink)]">Repair in progress</p>
                        <p className="mt-2">Mark the item completed once the repair work is done. The customer will pay after that step.</p>
                      </>
                    ) : job.status === "ready" && job.payment_status !== "paid" ? (
                      <>
                        <p className="font-semibold text-[var(--ink)]">Completed and awaiting payment</p>
                        <p className="mt-2">The repair work is finished. RepairHub is now waiting for the customer to complete payment.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-[var(--ink)]">Job status</p>
                        <p className="mt-2">This item is following the current repair lifecycle state shown above.</p>
                      </>
                    )}
                  </div>
                  <label className="block text-sm font-semibold text-[var(--ink-60)]">
                    Update for customer
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                      placeholder="Add a clear update that the customer will see in their workspace."
                      value={jobNotes[job.id] ?? ""}
                      onChange={(event) =>
                        setJobNotes((current) => ({
                          ...current,
                          [job.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div className="flex items-end">
                    {job.status === "in_repair" ? (
                      <button
                        className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white"
                        disabled={transitionMutation.isPending}
                        onClick={() =>
                          transitionMutation.mutate({
                            jobId: job.id,
                            status: "ready",
                            latestUpdate: jobNotes[job.id] ?? "",
                          })
                        }
                        type="button"
                      >
                        Completed
                      </button>
                    ) : job.status === "ready" && job.payment_status !== "paid" ? (
                      <div className="rounded-full border border-[var(--cream-3)] px-5 py-3 text-sm font-semibold text-[var(--ink-60)]">
                        Waiting for Payment
                      </div>
                    ) : (
                      <div className="rounded-full border border-[var(--cream-3)] px-5 py-3 text-sm font-semibold text-[var(--ink-60)]">
                        Status Locked
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 rounded-[18px] bg-[var(--cream-2)] p-4 text-sm text-[var(--ink-60)]">
                  <span className="font-semibold text-[var(--ink)]">Latest update:</span> {job.latest_update || "No update has been sent yet."}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-7 text-[var(--ink-60)]">No live repair jobs yet. Once you move an approved item into Active Work, it will appear here for status updates.</p>
        )}
      </section>
    </div>
  );
}
