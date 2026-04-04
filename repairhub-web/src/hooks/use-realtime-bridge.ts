import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { realtimeStatusEvent } from "../data/mock-data";
import { applyRealtimeEvent, RepairHubSocket } from "../lib/realtime/socket";

type ClientWorkspaceData = {
  summary: unknown;
  activeRepairs: Parameters<typeof applyRealtimeEvent>[0];
  pastRepairs: unknown[];
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
              activeRepairs: applyRealtimeEvent(current.activeRepairs, event),
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
