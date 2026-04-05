import { NavLink, Outlet } from "react-router-dom";
import type { AppRole } from "../../data/mock-data";
import { useAuthStore } from "../../state/auth-store";

type NavItem = {
  to: string;
  label: string;
  allowedRoles?: AppRole[];
};

const navItems: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/community", label: "Community" },
  { to: "/request/new", label: "Request Repair", allowedRoles: ["customer"] },
  { to: "/client", label: "Client Workspace", allowedRoles: ["customer"] },
  { to: "/dashboard", label: "Repairer Dashboard", allowedRoles: ["repairer"] },
  { to: "/admin", label: "Admin", allowedRoles: ["admin"] },
];

function isVisibleForRole(item: NavItem, role: AppRole) {
  return !item.allowedRoles || item.allowedRoles.includes(role);
}

export function AppShell() {
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearSession = useAuthStore((state) => state.clearSession);
  const profileLabel = user?.first_name || user?.email || "Profile";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--cream-3)] bg-[rgba(246,243,238,0.92)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--green)] text-lg font-bold text-white">R</div>
            <div>
              <p className="display text-2xl text-[var(--green)]">RepairHub</p>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--ink-40)]">Repair. Reuse. Reconnect.</p>
            </div>
          </NavLink>
          <nav className="flex flex-wrap gap-2">
            {navItems.filter((item) => isVisibleForRole(item, role)).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-[var(--green)] text-white" : "bg-[var(--cream-2)] text-[var(--ink-60)]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <NavLink
                  aria-label={`Open profile for ${profileLabel}`}
                  className="rounded-2xl px-3 py-2 text-right transition hover:bg-[var(--cream-2)]"
                  to="/profile"
                >
                  <p className="text-sm font-semibold text-[var(--ink)]">{user.first_name || user.email}</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-40)]">{role}</p>
                </NavLink>
                <button
                  className="rounded-full border border-[var(--cream-3)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--ink-60)]"
                  type="button"
                  onClick={clearSession}
                >
                  Log out
                </button>
              </>
            ) : (
              <NavLink className="rounded-full bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white" to="/auth">
                Sign in
              </NavLink>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <Outlet />
      </main>
    </div>
  );
}
