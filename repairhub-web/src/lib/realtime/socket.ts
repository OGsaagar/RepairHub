import type { ActiveRepair, JobStatus } from "../../data/mock-data";

export type RepairHubEvent =
  | {
      type: "job.status_changed";
      payload: { jobId: string; status: JobStatus; latestUpdate: string; eta: string };
    }
  | {
      type: "message.created";
      payload: { jobId: string; message: string };
    };

export function applyRealtimeEvent(
  repairs: ActiveRepair[] | undefined,
  event: RepairHubEvent,
): ActiveRepair[] {
  if (!repairs) {
    return [];
  }

  if (event.type !== "job.status_changed") {
    return repairs;
  }

  return repairs.map((repair) =>
    repair.id === event.payload.jobId
      ? {
          ...repair,
          status: event.payload.status,
          latestUpdate: event.payload.latestUpdate,
          eta: event.payload.eta,
          currentStep: Math.min(repair.currentStep + 1, repair.timeline.length - 1),
        }
      : repair,
  );
}

type Listener = (event: RepairHubEvent) => void;

export class RepairHubSocket {
  private listeners = new Set<Listener>();
  private timer: number | null = null;

  connect(mockEvent: RepairHubEvent) {
    this.timer = window.setInterval(() => {
      this.listeners.forEach((listener) => listener(mockEvent));
    }, 15_000);
  }

  disconnect() {
    if (this.timer) {
      window.clearInterval(this.timer);
    }
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
