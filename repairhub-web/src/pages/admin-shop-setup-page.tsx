import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "../components/shared/page-header";
import { StatCard } from "../components/shared/stat-card";
import { api, type AdminRepairerAccountPayload, type RepairerProfilePayload, type ServiceCategoryPayload } from "../lib/api/client";

const emptyShopForm = {
  category_id: "",
  headline: "",
  bio: "",
  city: "",
  shop_name: "",
  shop_address: "",
  shop_phone: "",
  shop_opening_hours: "",
  service_radius_km: "10.0",
};

function buildShopForm(profile: RepairerProfilePayload | null) {
  if (!profile) {
    return { ...emptyShopForm };
  }

  return {
    category_id: "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    city: profile.city ?? "",
    shop_name: profile.shop_name ?? "",
    shop_address: profile.shop_address ?? "",
    shop_phone: profile.shop_phone ?? "",
    shop_opening_hours: profile.shop_opening_hours ?? "",
    service_radius_km: profile.service_radius_km ?? "10.0",
  };
}

function displayRepairerName(repairer: AdminRepairerAccountPayload | null) {
  if (!repairer) {
    return "Choose a repairer";
  }

  return repairer.full_name || repairer.email;
}

export function AdminShopSetupPage() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [shopForm, setShopForm] = useState({ ...emptyShopForm });
  const [successMessage, setSuccessMessage] = useState("");
  const { data: repairers, error: repairerError, isPending: isRepairersPending } = useQuery({
    queryKey: ["admin-repairer-accounts"],
    queryFn: api.getAdminRepairerAccounts,
  });
  const { data: categories, error: categoriesError, isPending: isCategoriesPending } = useQuery({
    queryKey: ["service-categories"],
    queryFn: api.listServiceCategories,
  });

  const data = repairers ?? [];
  const categoryOptions = categories ?? [];
  const selectedRepairer = data.find((repairer) => repairer.id === selectedUserId) ?? null;
  const profile = selectedRepairer?.repairer_profile ?? null;
  const selectedCategory =
    categoryOptions.find((category) => category.id === shopForm.category_id) ??
    categoryOptions.find((category) => category.id === selectedRepairer?.primary_category_id) ??
    null;
  const visibleCity = shopForm.city || profile?.city || "No city added";
  const visibleHeadline = shopForm.headline || profile?.headline || "No repair headline added";
  const visibleShopName = shopForm.shop_name || profile?.shop_name || "No shop name added";
  const visibleShopAddress = shopForm.shop_address || profile?.shop_address || "No shop address added";
  const visibleShopPhone = shopForm.shop_phone || profile?.shop_phone || "No shop phone added";
  const visibleShopHours = shopForm.shop_opening_hours || profile?.shop_opening_hours || "No opening hours added";

  const saveMutation = useMutation({
    mutationFn: () =>
      api.adminUpsertRepairerProfile({
        user_id: selectedUserId,
        ...shopForm,
      }),
    onSuccess: async () => {
      setSelectedUserId("");
      setShopForm({ ...emptyShopForm });
      setSuccessMessage("Shop details saved. This repairer is now available for matching.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-repairer-accounts"] }),
        queryClient.invalidateQueries({ queryKey: ["service-categories"] }),
      ]);
    },
  });

  function handleRepairerChange(userId: string) {
    setSelectedUserId(userId);
    setSuccessMessage("");
    const repairer = data.find((item) => item.id === userId) ?? null;
    setShopForm({
      ...buildShopForm(repairer?.repairer_profile ?? null),
      category_id: repairer?.primary_category_id ?? "",
    });
  }

  const totalRepairers = data?.length ?? 0;
  const withShopProfiles = data?.filter((repairer) => repairer.repairer_profile).length ?? 0;
  const readyForMatching =
    data?.filter((repairer) => repairer.repairer_profile?.is_online && repairer.repairer_profile?.verification_status === "verified").length ?? 0;
  const saveError = saveMutation.error instanceof Error ? saveMutation.error.message : null;

  if (isRepairersPending || isCategoriesPending) {
    return (
      <div className="surface-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Internal Admin</p>
        <h1 className="display mt-2 text-3xl text-[var(--green)]">Loading repairer setup data</h1>
        <p className="mt-3 text-sm text-[var(--ink-60)]">Fetching repairer usernames and repair categories from the live database.</p>
      </div>
    );
  }

  if (repairerError || categoriesError) {
    return (
      <div className="surface-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Internal Admin</p>
        <h1 className="display mt-2 text-3xl text-[var(--green)]">Admin surface unavailable</h1>
        <p className="mt-3 text-sm text-[var(--ink-60)]">
          {repairerError instanceof Error
            ? repairerError.message
            : categoriesError instanceof Error
              ? categoriesError.message
              : "RepairHub could not load the repairer shop management page."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internal Admin"
        title="Repairer shop setup"
        description="Only admins can add or update repairer shop details. Choose an existing repairer username from the database, assign the repair category used for matching, complete the shop profile, and those details will be shown to customers in matched repairer cards."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard helper="Repairer accounts already created in the database" label="Repairer Accounts" value={totalRepairers} />
        <StatCard helper="Accounts with a saved repairer shop profile" label="Shop Profiles" value={withShopProfiles} />
        <StatCard helper="Profiles currently ready to appear in matching" label="Ready For Matching" value={readyForMatching} />
      </section>

      {data.length ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="surface-card p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Add Shop Details</p>
              <h3 className="display text-3xl text-[var(--green)]">Admin-only repairer profile form</h3>
              <p className="mt-2 text-sm text-[var(--ink-60)]">
                The repairer must already have an account. Choose the username first, assign the repair category that customers will match against, then save the shop details that customers will see.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-[var(--ink-60)] md:col-span-2">
                Choose username
                <select
                  className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  onChange={(event) => handleRepairerChange(event.target.value)}
                  value={selectedUserId}
                >
                  <option value="">Select a repairer account...</option>
                  {data.map((repairer) => (
                    <option key={repairer.id} value={repairer.id}>
                      {repairer.username} {repairer.full_name !== repairer.email ? `· ${repairer.full_name}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Repair category
                <select
                  className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  disabled={!selectedRepairer || !categoryOptions.length}
                  onChange={(event) => setShopForm((current) => ({ ...current, category_id: event.target.value }))}
                  value={shopForm.category_id}
                >
                  <option value="">Select a repair category...</option>
                  {categoryOptions.map((category: ServiceCategoryPayload) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Repair headline
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  disabled={!selectedRepairer}
                  onChange={(event) => setShopForm((current) => ({ ...current, headline: event.target.value }))}
                  value={shopForm.headline}
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                City
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  disabled={!selectedRepairer}
                  onChange={(event) => setShopForm((current) => ({ ...current, city: event.target.value }))}
                  value={shopForm.city}
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Shop name
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  disabled={!selectedRepairer}
                  onChange={(event) => setShopForm((current) => ({ ...current, shop_name: event.target.value }))}
                  value={shopForm.shop_name}
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Shop phone
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  disabled={!selectedRepairer}
                  onChange={(event) => setShopForm((current) => ({ ...current, shop_phone: event.target.value }))}
                  value={shopForm.shop_phone}
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)] md:col-span-2">
                Shop address
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  disabled={!selectedRepairer}
                  onChange={(event) => setShopForm((current) => ({ ...current, shop_address: event.target.value }))}
                  value={shopForm.shop_address}
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Opening hours
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  disabled={!selectedRepairer}
                  onChange={(event) => setShopForm((current) => ({ ...current, shop_opening_hours: event.target.value }))}
                  value={shopForm.shop_opening_hours}
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)]">
                Service radius (km)
                <input
                  className="mt-2 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  disabled={!selectedRepairer}
                  onChange={(event) => setShopForm((current) => ({ ...current, service_radius_km: event.target.value }))}
                  value={shopForm.service_radius_km}
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--ink-60)] md:col-span-2">
                Bio
                <textarea
                  className="mt-2 min-h-28 w-full rounded-2xl border border-[var(--cream-3)] bg-white px-4 py-3"
                  disabled={!selectedRepairer}
                  onChange={(event) => setShopForm((current) => ({ ...current, bio: event.target.value }))}
                  value={shopForm.bio}
                />
              </label>
            </div>
            {successMessage ? <p className="mt-5 rounded-[18px] bg-[var(--green-light)] p-4 text-sm text-[var(--green)]">{successMessage}</p> : null}
            {saveError ? <p className="mt-5 rounded-[18px] bg-[rgba(175,99,18,0.12)] p-4 text-sm text-[var(--amber)]">{saveError}</p> : null}
            <div className="mt-5 flex justify-end">
              <button
                className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[var(--ink-40)]"
                disabled={!selectedRepairer || !shopForm.category_id || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                type="button"
              >
                {saveMutation.isPending ? "Saving..." : "Save Shop Details"}
              </button>
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Customer Match Preview</p>
              <h3 className="display text-3xl text-[var(--green)]">How this repairer will appear</h3>
            </div>
            <div className="rounded-[26px] border border-[var(--cream-3)] bg-[var(--card)] p-6 shadow-[var(--shadow-sm)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h4 className="text-2xl font-semibold text-[var(--ink)]">{displayRepairerName(selectedRepairer)}</h4>
                    <span className="badge badge-blue">Verified</span>
                    <span className="badge badge-green">Admin Managed</span>
                  </div>
                  <p className="mb-2 text-sm font-semibold text-[var(--green)]">{selectedCategory?.name ?? "No repair category selected"}</p>
                  <p className="text-sm text-[var(--ink-60)]">
                    {profile?.rating ?? "0.00"} rating · {profile?.reviews_count ?? 0} reviews · {visibleCity}
                  </p>
                  <p className="mt-3 text-lg text-[var(--ink)]">{visibleHeadline}</p>
                  <p className="mt-3 text-sm text-[var(--ink-60)]">
                    {visibleShopName} · {visibleShopAddress}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-60)]">
                    {visibleShopPhone} · {visibleShopHours}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--cream-2)] px-3 py-1 text-xs font-semibold text-[var(--ink-60)]">
                      {selectedCategory?.name ?? "No category selected"}
                    </span>
                    <span className="rounded-full bg-[var(--cream-2)] px-3 py-1 text-xs font-semibold text-[var(--ink-60)]">
                      Visible in category matches
                    </span>
                    <span className="rounded-full bg-[var(--cream-2)] px-3 py-1 text-xs font-semibold text-[var(--ink-60)]">
                      Radius {shopForm.service_radius_km || profile?.service_radius_km || "10.0"} km
                    </span>
                    <span className="rounded-full bg-[var(--cream-2)] px-3 py-1 text-xs font-semibold text-[var(--ink-60)]">Online after save</span>
                  </div>
                </div>
                <div className="text-left xl:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Account</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--ink)]">{selectedRepairer?.username ?? "No username selected"}</p>
                  <p className="mt-2 text-sm text-[var(--ink-60)]">{selectedRepairer?.email ?? "Select a repairer account to preview the match card."}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="surface-card p-6">
          <h3 className="display text-3xl text-[var(--green)]">No repairer accounts found</h3>
          <p className="mt-3 text-sm text-[var(--ink-60)]">
            Admin shop setup only works for repairers who have already created an account and exist in the database.
          </p>
        </section>
      )}
      {!categoryOptions.length ? (
        <section className="surface-card p-6">
          <h3 className="display text-3xl text-[var(--green)]">No repair categories found</h3>
          <p className="mt-3 text-sm text-[var(--ink-60)]">
            Repair categories must exist in the database before an admin can link a repairer shop to customer matching.
          </p>
        </section>
      ) : null}
    </div>
  );
}
