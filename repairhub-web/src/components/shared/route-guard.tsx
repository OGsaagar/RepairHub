import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import type { AppRole } from "../../data/mock-data";
import { useAuthStore } from "../../state/auth-store";

type RouteGuardProps = PropsWithChildren<{
  allowedRoles: AppRole[];
}>;

export function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const role = useAuthStore((state) => state.role);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  const isGuest = !isAuthenticated || role === "guest";
  const allowedRoleLabel = allowedRoles.join(" or ");

  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <div className="surface-card p-8 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--ink-40)]">Restricted Surface</p>
        <h1 className="display mb-4 text-4xl text-[var(--green)]">
          {isGuest ? "Sign in to continue." : "This page is not available for your account type."}
        </h1>
        <p className="mx-auto mb-6 max-w-xl text-sm leading-7 text-[var(--ink-60)]">
          {isGuest
            ? `This route is only available to ${allowedRoleLabel} accounts.`
            : `You are signed in as ${role}. This route is only available to ${allowedRoleLabel} accounts.`}
        </p>
        <Link className="inline-flex rounded-full bg-[var(--green)] px-5 py-3 text-sm font-semibold text-white" to={isGuest ? "/auth" : "/"}>
          {isGuest ? "Go to Sign In" : "Return Home"}
        </Link>
      </div>
    </div>
  );
}
