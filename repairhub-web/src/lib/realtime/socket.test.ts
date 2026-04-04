import { applyRealtimeEvent } from "./socket";
import type { RepairJobPayload } from "../api/client";

describe("applyRealtimeEvent", () => {
  it("updates the matching repair when a status event arrives", () => {
    const repairs: RepairJobPayload[] = [
      {
        id: "job-1",
        repair_request: "iphone-14-pro",
        booking: "booking-1",
        customer: "customer-1",
        customer_name: "Elena Adeyemi",
        repairer: "repairer-1",
        repairer_name: "Marcus Rivera",
        item_name: "iPhone 14 Pro",
        issue_description: "Cracked screen",
        quote_amount: "95.00",
        status: "in_repair",
        reference_code: "RH-1001",
        estimated_ready_at: null,
        latest_update: "Testing",
        created_at: "2026-01-01T10:00:00Z",
        updated_at: "2026-01-01T10:00:00Z",
      },
    ];

    const result = applyRealtimeEvent(repairs, {
      type: "job.status_changed",
      payload: {
        jobId: "job-1",
        status: "ready",
        latestUpdate: "Ready for pickup",
        eta: "Pickup now",
      },
    });

    expect(result[0].status).toBe("ready");
    expect(result[0].latest_update).toBe("Ready for pickup");
  });
});
