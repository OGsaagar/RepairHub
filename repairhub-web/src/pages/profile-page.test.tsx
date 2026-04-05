import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api/client";
import { useAuthStore } from "../state/auth-store";
import { ProfilePage } from "./profile-page";

vi.mock("../lib/api/client", () => ({
  api: {
    getCurrentProfile: vi.fn(),
    updateMyProfile: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({
        role: "customer",
        user: {
          id: "customer-1",
          email: "customer@example.com",
          first_name: "Elena",
          last_name: "Adeyemi",
          role: "customer",
          profile_status: "active",
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isAuthenticated: true,
      });
    });

    mockedApi.getCurrentProfile.mockResolvedValue({
      id: "customer-1",
      email: "customer@example.com",
      first_name: "Elena",
      last_name: "Adeyemi",
      role: "customer",
      profile_status: "active",
    });
    mockedApi.updateMyProfile.mockImplementation(async (payload) => ({
      id: "customer-1",
      role: "customer",
      profile_status: "active",
      ...payload,
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
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

  it("loads the signed-in user details and lets them save profile changes", async () => {
    renderPage();

    expect(await screen.findByDisplayValue("Elena")).toBeInTheDocument();
    expect(screen.getAllByText("customer")[0]).toBeInTheDocument();
    expect(screen.getAllByText("active")[0]).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Nadia" },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: "Okafor" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "nadia@example.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockedApi.updateMyProfile).toHaveBeenCalledWith({
        first_name: "Nadia",
        last_name: "Okafor",
        email: "nadia@example.com",
      });
    });

    expect(await screen.findByText("Profile updated successfully.")).toBeInTheDocument();
    expect(useAuthStore.getState().user?.first_name).toBe("Nadia");
    expect(useAuthStore.getState().user?.email).toBe("nadia@example.com");
  });
});
