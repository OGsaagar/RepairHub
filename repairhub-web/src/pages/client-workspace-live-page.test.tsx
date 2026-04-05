import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api/client";
import { useAuthStore } from "../state/auth-store";
import { ClientWorkspaceLivePage } from "./client-workspace-live-page";

vi.mock("../lib/api/client", () => ({
  api: {
    listRepairRequests: vi.fn(),
    getClientJobs: vi.fn(),
    payBooking: vi.fn(),
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
      <ClientWorkspaceLivePage />
    </QueryClientProvider>,
  );
}

describe("ClientWorkspaceLivePage", () => {
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

    mockedApi.listRepairRequests.mockResolvedValue([]);
    mockedApi.getClientJobs.mockResolvedValue([
      {
        id: "job-1",
        repair_request: "repair-request-1",
        booking: "booking-1",
        customer: "customer-1",
        customer_name: "Elena Adeyemi",
        repairer: "repairer-profile-1",
        repairer_name: "Marcus Rivera",
        item_name: "Dining Chair",
        issue_description: "Rear chair leg is loose.",
        quote_amount: "105.00",
        payment_status: "pending",
        status: "in_repair",
        reference_code: "RH-100001",
        estimated_ready_at: null,
        latest_update: "Repairer started active work on the device.",
        created_at: "2026-04-05T00:00:00Z",
        updated_at: "2026-04-05T00:05:00Z",
      },
    ]);
    mockedApi.payBooking.mockResolvedValue({
      id: "booking-1",
      repair_request: "repair-request-1",
      repairer: "repairer-profile-1",
      scheduled_for: null,
      notes: "",
      subtotal_amount: "105.00",
      platform_fee_amount: "5.25",
      total_amount: "110.25",
      payment_status: "paid",
    });
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

  it("shows the same active work status to the customer", async () => {
    renderPage();

    expect(await screen.findByText("Active repairs")).toBeInTheDocument();
    expect(screen.getByText("active work")).toBeInTheDocument();
    expect(screen.getByText(/Repairer started active work on the device\./)).toBeInTheDocument();
  });

  it("shows a pay action after the repairer marks the item completed", async () => {
    mockedApi.getClientJobs.mockResolvedValue([
      {
        id: "job-2",
        repair_request: "repair-request-2",
        booking: "booking-2",
        customer: "customer-1",
        customer_name: "Elena Adeyemi",
        repairer: "repairer-profile-1",
        repairer_name: "Marcus Rivera",
        item_name: "Dining Chair",
        issue_description: "Rear chair leg is loose.",
        quote_amount: "105.00",
        payment_status: "pending",
        status: "ready",
        reference_code: "RH-100002",
        estimated_ready_at: null,
        latest_update: "Repair work is completed and waiting for customer payment.",
        created_at: "2026-04-05T00:00:00Z",
        updated_at: "2026-04-05T00:05:00Z",
      },
    ]);

    renderPage();

    expect(await screen.findByText("completed awaiting payment")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pay Now" }));

    await waitFor(() => {
      expect(mockedApi.payBooking).toHaveBeenCalledWith("booking-2");
    });
  });
});
