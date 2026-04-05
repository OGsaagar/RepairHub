import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api/client";
import { useAuthStore } from "../state/auth-store";
import { RepairerDashboardLivePage } from "./repairer-dashboard-live-page";

vi.mock("../lib/api/client", () => ({
  api: {
    getMyRepairerProfile: vi.fn(),
    getRepairerQueue: vi.fn(),
    getRepairerJobs: vi.fn(),
    startActiveWork: vi.fn(),
    transitionJob: vi.fn(),
    reviewRepairSelection: vi.fn(),
    upsertMyRepairerProfile: vi.fn(),
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
      <RepairerDashboardLivePage />
    </QueryClientProvider>,
  );
}

describe("RepairerDashboardLivePage", () => {
  beforeEach(() => {
    act(() => {
      useAuthStore.setState({
        role: "repairer",
        user: {
          id: "repairer-1",
          email: "repairer@example.com",
          first_name: "Marcus",
          last_name: "Rivera",
          role: "repairer",
          profile_status: "active",
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isAuthenticated: true,
      });
    });

    mockedApi.getMyRepairerProfile.mockResolvedValue(null);
    mockedApi.getRepairerQueue.mockResolvedValue([
      {
        id: "repair-request-1",
        customer: "customer-1",
        customer_name: "Elena Adeyemi",
        customer_email: "customer@example.com",
        category: "furniture",
        item_name: "Dining Chair",
        issue_description: "Rear chair leg is loose.",
        urgency: "standard",
        pickup_preference: "dropoff",
        status: "booked",
        category_name: "Furniture",
        estimated_min_cost: 90,
        estimated_max_cost: 140,
        estimated_hours: 12,
        selected_repairer: "repairer-profile-1",
        selected_repairer_name: "Marcus Rivera",
        selected_service: "service-1",
        selected_service_title: "Chair restoration",
        selected_quote_amount: "105.00",
        selection_status: "approved",
        customer_selection_reason: "The chair is unsafe to use and needs structural repair.",
        repairer_response_reason: "Approved. I can start once the item is dropped off.",
        created_at: "2026-04-05T00:00:00Z",
        updated_at: "2026-04-05T00:00:00Z",
      },
    ]);
    mockedApi.getRepairerJobs.mockResolvedValue([
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
        status: "booked",
        reference_code: "RH-100001",
        estimated_ready_at: null,
        latest_update: "Booking confirmed and awaiting dropoff scheduling.",
        created_at: "2026-04-05T00:00:00Z",
        updated_at: "2026-04-05T00:00:00Z",
      },
    ]);
    mockedApi.transitionJob.mockResolvedValue({
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
    });
    mockedApi.startActiveWork.mockResolvedValue({
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
      latest_update: "Repairer started active work on the item.",
      created_at: "2026-04-05T00:00:00Z",
      updated_at: "2026-04-05T00:05:00Z",
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

  it("lets the repairer move a booked job into active work with one button", async () => {
    renderPage();

    expect(await screen.findByText("Approval queue")).toBeInTheDocument();
    expect(screen.getByText(/Approval is recorded\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Proceed to Active Work" }));

    await waitFor(() => {
      expect(mockedApi.startActiveWork).toHaveBeenCalledWith("repair-request-1");
    });
  });

  it("lets the repairer mark an active job as completed", async () => {
    mockedApi.getRepairerQueue.mockResolvedValue([]);
    mockedApi.getRepairerJobs.mockResolvedValue([
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
        status: "in_repair",
        reference_code: "RH-100002",
        estimated_ready_at: null,
        latest_update: "Repairer started active work on the device.",
        created_at: "2026-04-05T00:00:00Z",
        updated_at: "2026-04-05T00:00:00Z",
      },
    ]);

    renderPage();

    expect(await screen.findByText("Current work queue")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Completed" }));

    await waitFor(() => {
      expect(mockedApi.transitionJob).toHaveBeenCalledWith("job-2", {
        status: "ready",
        latest_update: "",
      });
    });
  });
});
