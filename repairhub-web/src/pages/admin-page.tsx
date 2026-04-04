export { AdminShopSetupPage as AdminPage } from "./admin-shop-setup-page";

/*
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

function buildShopForm(profile: RepairerProfilePayload | null) {
  if (!profile) {
    return { ...emptyShopForm };
  }

  return {
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

export function AdminPage() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [shopForm, setShopForm] = useState({ ...emptyShopForm });
  const [successMessage, setSuccessMessage] = useState("");
  const { data, error, isPending } = useQuery({
    queryKey: ["admin-repairer-accounts"],
    queryFn: api.getAdminRepairerAccounts,
  });

  const selectedRepairer = data?.find((repairer) => repairer.id === selectedUserId) ?? null;
  const profile = selectedRepairer?.repairer_profile ?? null;
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
    onSuccess: async (savedProfile) => {
      setShopForm(buildShopForm(savedProfile));
      setSuccessMessage("Shop details saved. This repairer is now available for matching.");
      await queryClient.invalidateQueries({ queryKey: ["admin-repairer-accounts"] });
    },
  });

  function handleRepairerChange(userId: string) {
    setSelectedUserId(userId);
    setSuccessMessage("");
    const repairer = data?.find((item) => item.id === userId) ?? null;
    setShopForm(buildShopForm(repairer?.repairer_profile ?? null));
  }

  const totalRepairers = data?.length ?? 0;
  const withShopProfiles = data?.filter((repairer) => repairer.repairer_profile).length ?? 0;
  const readyForMatching =
    data?.filter((repairer) => repairer.repairer_profile?.is_online && repairer.repairer_profile?.verification_status === "verified").length ?? 0;
  const saveError = saveMutation.error instanceof Error ? saveMutation.error.message : null;

  if (isPending) {
    return (
      <div className="surface-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Internal Admin</p>
        <h1 className="display mt-2 text-3xl text-[var(--green)]">Loading repairer accounts</h1>
        <p className="mt-3 text-sm text-[var(--ink-60)]">Fetching repairer usernames from the live database.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="surface-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--ink-40)]">Internal Admin</p>
        <h1 className="display mt-2 text-3xl text-[var(--green)]">Admin surface unavailable</h1>
        <p className="mt-3 text-sm text-[var(--ink-60)]">
          {error instanceof Error ? error.message : "RepairHub could not load the repairer shop management page."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Internal Admin"
        title="Repairer shop setup"
        description="Only admins can add or update repairer shop details. Choose an existing repairer username from the database, complete the shop profile, and those details will be shown to customers in matched repairer cards."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard helper="Repairer accounts already created in the database" label="Repairer Accounts" value={totalRepairers} />
        <StatCard helper="Accounts with a saved repairer shop profile" label="Shop Profiles" value={withShopProfiles} />
        <StatCard helper="Profiles currently ready to appear in matching" label="Ready For Matching" value={readyForMatching} />
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
*/
