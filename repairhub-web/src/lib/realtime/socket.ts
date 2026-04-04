import type { RepairJobPayload } from "../api/client";

export type RepairHubEvent =
  | {
      type: "job.status_changed";
      payload: { jobId: string; status: string; latestUpdate: string; eta: string };
    }
  | {
      type: "message.created";
      payload: { jobId: string; message: string };
    };

export function applyRealtimeEvent(
  repairs: RepairJobPayload[] | undefined,
  event: RepairHubEvent,
): RepairJobPayload[] {
  if (!repairs) {
    return [];
  }

  if (event.type !== "job.status_changed") {
    return repairs;
  }

  return repairs.map((repair) =>
    repair.id === event.payload.jobId || repair.repair_request === event.payload.jobId
      ? {
          ...repair,
          status: event.payload.status,
          latest_update: event.payload.latestUpdate,
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
