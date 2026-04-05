import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { useAuthStore } from "../../state/auth-store";
import { RequestWizard } from "./request-wizard";

describe("RequestWizard", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
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

  it("shows validation errors before moving to analysis", async () => {
    render(<RequestWizard />);

    fireEvent.click(screen.getByRole("button", { name: "Analyze with AI" }));

    expect(await screen.findByText("Choose a repair category")).toBeInTheDocument();
    expect(screen.getByText("Enter the item name or model")).toBeInTheDocument();
    expect(screen.getByText("Describe the problem in more detail")).toBeInTheDocument();
  });

  it("shows a preview of the uploaded image in the upload section", async () => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(() => "blob:chair-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    const { container, unmount } = render(<RequestWizard />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    const file = new File(["image-bytes"], "chair-leg.jpg", { type: "image/jpeg" });

    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: {
        files: [file],
      },
    });

    expect(await screen.findByAltText("chair-leg.jpg")).toHaveAttribute("src", "blob:chair-preview");
    expect(screen.getByText("chair-leg.jpg")).toBeInTheDocument();

    unmount();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:chair-preview");
  });

  it("submits the request to the live API flow and shows the analysis result", async () => {
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

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/api/repair-requests/")) {
        return new Response(
          JSON.stringify({
            id: "request-1",
            item_name: "iPhone 14 Pro",
            issue_description: "The charging port only works at an angle.",
            urgency: "standard",
            pickup_preference: "dropoff",
            status: "submitted",
            category_name: "Electronics",
            estimated_min_cost: 0,
            estimated_max_cost: 0,
            estimated_hours: 0,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/repair-requests/request-1/analyze/")) {
        return new Response(
          JSON.stringify({
            repair_request: {
              id: "request-1",
              item_name: "iPhone 14 Pro",
              issue_description: "The charging port only works at an angle.",
              urgency: "standard",
              pickup_preference: "dropoff",
              status: "matching",
              category_name: "Electronics",
              estimated_min_cost: 90,
              estimated_max_cost: 140,
              estimated_hours: 2,
            },
            analysis: {
              damage_type: "Charging port wear",
              severity: "Moderate",
              confidence: 0.72,
              summary: "The request points to charging port wear or debris-related damage.",
              replace_cost: 850,
              waste_saved_kg: 12,
              estimated_min_cost: 90,
              estimated_max_cost: 140,
              estimated_hours: 2,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/repair-requests/request-1/matches/")) {
        return new Response(
          JSON.stringify([
            {
              id: "match-1",
              repairer: "repairer-1",
              repairer_name: "Marcus Rivera",
              repairer_city: "Sydney CBD",
              repairer_rating: "4.90",
              reviews_count: 127,
              service: "service-1",
              service_title: "Charging port repair",
              service_description: "Port cleaning, diagnostics, and replacement work.",
              warranty_days: 14,
              score: "98.00",
              distance_km: "2.40",
              quote_amount: "105.00",
              eta_hours: 4,
              ranking_reason: "Ranked by distance, rating, and pricing rules",
              selected: false,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<RequestWizard />);

    fireEvent.change(screen.getByLabelText("Repair Category"), {
      target: { value: "electronics" },
    });
    fireEvent.change(screen.getByLabelText("Item Name / Model"), {
      target: { value: "iPhone 14 Pro" },
    });
    fireEvent.change(screen.getByLabelText("Describe the Problem"), {
      target: { value: "The charging port only works at an angle." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Analyze with AI" }));

    expect(await screen.findByText("Charging port wear")).toBeInTheDocument();
    expect(screen.getByText("The request points to charging port wear or debris-related damage.")).toBeInTheDocument();
    expect(screen.getByText("A$90.00 - A$140.00")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("shows a mismatch message when the request details do not describe the same repair", async () => {
    act(() => {
      useAuthStore.setState({
        role: "customer",
        user: {
          id: "customer-2",
          email: "customer2@example.com",
          first_name: "Mia",
          last_name: "Patel",
          role: "customer",
          profile_status: "active",
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        isAuthenticated: true,
      });
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/api/repair-requests/")) {
        return new Response(
          JSON.stringify({
            id: "request-2",
            item_name: "Dining Chair",
            issue_description: "The chair leg is loose and the wooden frame keeps wobbling.",
            urgency: "standard",
            pickup_preference: "dropoff",
            status: "submitted",
            category_name: "Electronics",
            estimated_min_cost: 0,
            estimated_max_cost: 0,
            estimated_hours: 0,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/api/repair-requests/request-2/analyze/")) {
        return new Response(
          JSON.stringify({
            detail:
              "These details should be related to each other. The selected category is Electronics, but the item/model looks more like Furniture.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    render(<RequestWizard />);

    fireEvent.change(screen.getByLabelText("Repair Category"), {
      target: { value: "electronics" },
    });
    fireEvent.change(screen.getByLabelText("Item Name / Model"), {
      target: { value: "Dining Chair" },
    });
    fireEvent.change(screen.getByLabelText("Describe the Problem"), {
      target: { value: "The chair leg is loose and the wooden frame keeps wobbling." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Analyze with AI" }));

    expect(await screen.findByText(/These details should be related to each other/)).toBeInTheDocument();
    expect(screen.queryByText("Damage Detected")).not.toBeInTheDocument();
  });
});
