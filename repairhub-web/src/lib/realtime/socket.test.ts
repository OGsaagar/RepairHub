import { applyRealtimeEvent } from "./socket";
import type { ActiveRepair } from "../../data/mock-data";

describe("applyRealtimeEvent", () => {
  it("updates the matching repair when a status event arrives", () => {
    const repairs: ActiveRepair[] = [
      {
        id: "iphone-14-pro",
        item: "iPhone 14 Pro",
        status: "in_repair",
        issue: "Cracked screen",
        repairer: "Marcus Rivera",
        rating: 4.9,
        quote: 95,
        eta: "Today",
        reference: "RH-1001",
        timeline: ["Submitted", "Matched", "Dropped Off", "In Repair", "Ready", "Collected"],
        currentStep: 3,
        latestUpdate: "Testing",
      },
    ];

    const result = applyRealtimeEvent(repairs, {
      type: "job.status_changed",
      payload: {
        jobId: "iphone-14-pro",
        status: "ready",
        latestUpdate: "Ready for pickup",
        eta: "Pickup now",
      },
    });

    expect(result[0].status).toBe("ready");
    expect(result[0].latestUpdate).toBe("Ready for pickup");
    expect(result[0].currentStep).toBe(4);
  });
});
