import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./app-shell";
import { useAuthStore } from "../../state/auth-store";

describe("AppShell navigation", () => {
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

  it("shows only public navigation for guests", () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Community" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Client Workspace" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Repairer Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("shows customer navigation for customer accounts", () => {
    act(() => {
      useAuthStore.setState({
        role: "customer",
        user: {
          id: "customer-1",
          email: "customer@example.com",
          first_name: "Customer",
          last_name: "One",
          role: "customer",
          profile_status: "active",
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isAuthenticated: true,
      });
    });

    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Request Repair" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Client Workspace" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Repairer Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("shows the admin link only for admins", () => {
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
        <AppShell />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Admin" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Client Workspace" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Repairer Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Request Repair" })).not.toBeInTheDocument();
  });
});
