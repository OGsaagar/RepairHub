import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RouteGuard } from "./route-guard";
import { useAuthStore } from "../../state/auth-store";

describe("RouteGuard", () => {
  afterEach(() => {
    localStorage.clear();
    act(() => {
      useAuthStore.setState({
        role: "guest",
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    });
  });

  it("prompts guests to sign in when the route is protected", () => {
    act(() => {
      useAuthStore.setState({
        role: "guest",
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
    });

    render(
      <MemoryRouter>
        <RouteGuard allowedRoles={["admin"]}>
          <div>Secret</div>
        </RouteGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign in to continue.")).toBeInTheDocument();
  });

  it("blocks signed-in users outside the allowed role list", () => {
    act(() => {
      useAuthStore.setState({
        role: "repairer",
        user: {
          id: "repairer-1",
          email: "repairer@example.com",
          first_name: "Repairer",
          last_name: "One",
          role: "repairer",
          profile_status: "active",
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isAuthenticated: true,
      });
    });

    render(
      <MemoryRouter>
        <RouteGuard allowedRoles={["admin"]}>
          <div>Secret</div>
        </RouteGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText("This page is not available for your account type.")).toBeInTheDocument();
  });

  it("renders children for allowed roles", () => {
    act(() => {
      useAuthStore.setState({
        role: "admin",
        user: {
          id: "admin-1",
          email: "admin@example.com",
          first_name: "Admin",
          last_name: "User",
          role: "admin",
          profile_status: "active",
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isAuthenticated: true,
      });
    });

    render(
      <MemoryRouter>
        <RouteGuard allowedRoles={["admin"]}>
          <div>Secret</div>
        </RouteGuard>
      </MemoryRouter>,
    );

    expect(screen.getByText("Secret")).toBeInTheDocument();
  });
});
