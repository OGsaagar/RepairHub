import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/shared/page-header";
import { StatCard } from "../components/shared/stat-card";
import { StatusBadge } from "../components/shared/status-badge";
import { fetchHomePageData } from "../data/mock-data";

export function HomePage() {
  const { data } = useQuery({
    queryKey: ["home"],
    queryFn: fetchHomePageData,
  });

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6 rounded-[32px] border border-[var(--cream-3)] bg-[rgba(253,252,249,0.85)] p-8 shadow-[var(--shadow-lg)]">
          <StatusBadge tone="green" label="Sustainable · Community-driven" />
          <h1 className="display max-w-3xl text-5xl leading-none text-[var(--ink)] md:text-7xl">
            Repair.
            <br />
            <span className="text-[var(--green)]">Reuse.</span>
            <br />
            Reconnect.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-[var(--ink-60)]">
            Connect with trusted local repairers, get AI-guided damage analysis, compare quotes, and keep your favorite things in use longer.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" to="/request/new">
              Start a Repair
            </Link>
            <Link className="rounded-full border border-[var(--cream-3)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--ink)]" to="/community">
              Explore Community
            </Link>
          </div>
        </div>
        <div className="soft-panel rounded-[32px] p-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--green-mid)]">How RepairHub Works</p>
          <div className="space-y-4">
            {[
              "Describe the problem and upload photos.",
              "Get AI diagnosis and price guidance.",
              "Compare ranked local repairers.",
              "Book, pay, and track the repair in real time.",
            ].map((step, index) => (
              <div key={step} className="flex gap-4 rounded-[20px] bg-white/70 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--green)] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-[var(--ink-60)]">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {data.heroStats.map((stat) => (
          <StatCard key={stat.label} helper="Live MVP marketplace metric" label={stat.label} value={stat.value} />
        ))}
      </section>

      <section className="space-y-5">
        <PageHeader
          eyebrow="Repair Categories"
          title="Find the right specialist quickly."
          description="Design tokens and route structure mirror the UI prototype, but the cards here are already aligned to the React component system."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.categories.map((category) => (
            <div key={category.name} className="surface-card p-5">
              <p className="display mb-2 text-2xl text-[var(--green)]">{category.name}</p>
              <p className="text-sm text-[var(--ink-60)]">{category.repairers}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
