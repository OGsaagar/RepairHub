import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { realtimeStatusEvent } from "../data/mock-data";
import type { RepairJobPayload } from "../lib/api/client";
import { applyRealtimeEvent, RepairHubSocket } from "../lib/realtime/socket";

type ClientWorkspaceData = {
  repairRequests: unknown[];
  approvalQueue: unknown[];
  activeJobs: RepairJobPayload[];
  completedJobs: RepairJobPayload[];
};

export function useRealtimeBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = new RepairHubSocket();
    const unsubscribe = socket.subscribe((event) => {
      queryClient.setQueryData(["client-workspace"], (current: ClientWorkspaceData | undefined) =>
        current
          ? {
              ...current,
              activeJobs: applyRealtimeEvent(current.activeJobs, event),
            }
          : current,
      );
    });

    socket.connect(realtimeStatusEvent);

    return () => {
      unsubscribe();
      socket.disconnect();
    };
  }, [queryClient]);
}
