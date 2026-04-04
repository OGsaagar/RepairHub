import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { MapCard } from "../components/shared/map-card";
import { PageHeader } from "../components/shared/page-header";
import { fetchEventById } from "../data/mock-data";

export function EventPage() {
  const { eventId = "" } = useParams();
  const { data } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchEventById(eventId),
  });

  if (!data) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        <PageHeader eyebrow="Event Detail" title={data.title} description={`${data.when} · ${data.location}`} />
        <div className="surface-card p-6">
          <p className="mb-4 text-sm leading-7 text-[var(--ink-60)]">{data.excerpt}</p>
          <button className="rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" type="button">
            {data.cta}
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <MapCard label={data.title} lat={data.lat} lng={data.lng} />
        <div className="soft-panel rounded-[24px] p-5 text-sm text-[var(--ink-60)]">
          PostGIS-backed geo queries will power event discovery and repairer proximity in connected environments. This frontend already uses Leaflet to render location context.
        </div>
      </div>
    </div>
  );
}
