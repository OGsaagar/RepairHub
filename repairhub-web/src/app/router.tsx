import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/layout/app-shell";
import { RouteGuard } from "../components/shared/route-guard";
import { AdminPage } from "../pages/admin-page";
import { ClientWorkspaceLivePage } from "../pages/client-workspace-live-page";
import { CommunityPage } from "../pages/community-page";
import { DjangoAdminRedirectPage } from "../pages/django-admin-redirect-page";
import { EventPage } from "../pages/event-page";
import { HomePage } from "../pages/home-page";
import { LoginPage } from "../pages/login-page";
import { ProfilePage } from "../pages/profile-page";
import { RepairerDashboardLivePage } from "../pages/repairer-dashboard-live-page";
import { RepairRequestPage } from "../pages/repair-request-page";
import { ThreadPage } from "../pages/thread-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "auth", element: <LoginPage /> },
      {
        path: "request/new",
        element: (
          <RouteGuard allowedRoles={["customer"]}>
            <RepairRequestPage />
          </RouteGuard>
        ),
      },
      {
        path: "client",
        element: (
          <RouteGuard allowedRoles={["customer"]}>
            <ClientWorkspaceLivePage />
          </RouteGuard>
        ),
      },
      {
        path: "profile",
        element: (
          <RouteGuard allowedRoles={["customer", "repairer", "admin"]}>
            <ProfilePage />
          </RouteGuard>
        ),
      },
      {
        path: "dashboard",
        element: (
          <RouteGuard allowedRoles={["repairer"]}>
            <RepairerDashboardLivePage />
          </RouteGuard>
        ),
      },
      { path: "community", element: <CommunityPage /> },
      { path: "community/thread/:threadId", element: <ThreadPage /> },
      { path: "events/:eventId", element: <EventPage /> },
      { path: "admins/*", element: <DjangoAdminRedirectPage /> },
      {
        path: "admin",
        element: (
          <RouteGuard allowedRoles={["admin"]}>
            <AdminPage />
          </RouteGuard>
        ),
      },
    ],
  },
]);
