import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { API_BASE_URL } from "../lib/api/client";

function getBackendBaseUrl() {
  return API_BASE_URL.replace(/\/api\/?$/, "");
}

export function DjangoAdminRedirectPage() {
  const location = useLocation();
  const adminUrl = `${getBackendBaseUrl()}${location.pathname}${location.search}`;

  useEffect(() => {
    window.location.replace(adminUrl);
  }, [adminUrl]);

  return (
    <div className="surface-card max-w-xl rounded-[24px] p-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--ink-40)]">Django Admin</p>
      <h1 className="display mb-3 text-3xl text-[var(--green)]">Redirecting to the backend admin panel</h1>
      <p className="text-sm leading-7 text-[var(--ink-60)]">
        If the redirect does not happen automatically, open{" "}
        <a className="font-semibold text-[var(--green)] underline" href={adminUrl}>
          {adminUrl}
        </a>
        .
      </p>
    </div>
  );
}
