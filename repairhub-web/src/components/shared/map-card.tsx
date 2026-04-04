import { useEffect, useRef } from "react";
import L from "leaflet";

type MapCardProps = {
  lat: number;
  lng: number;
  label: string;
};

export function MapCard({ lat, lng, label }: MapCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const map = L.map(ref.current, { zoomControl: false }).setView([lat, lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    L.circleMarker([lat, lng], {
      radius: 9,
      color: "#1d4b20",
      fillColor: "#3f8447",
      fillOpacity: 0.9,
    })
      .addTo(map)
      .bindPopup(label)
      .openPopup();

    return () => {
      map.remove();
    };
  }, [label, lat, lng]);

  return <div ref={ref} className="h-72 rounded-[24px] border border-[var(--green-border)]" />;
}
