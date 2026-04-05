const activeWorkPendingStatuses = new Set(["booked", "awaiting_dropoff"]);

export function isAwaitingActiveWork(status: string) {
  return activeWorkPendingStatuses.has(status);
}

export function formatRepairStatusLabel(status: string, paymentStatus?: string) {
  if (status === "in_repair") {
    return "active work";
  }

  if (status === "ready" && paymentStatus !== "paid") {
    return "completed awaiting payment";
  }

  return status.replaceAll("_", " ");
}

export function getRepairerStatusSelection(status: string) {
  if (isAwaitingActiveWork(status)) {
    return "in_repair";
  }

  return status;
}
