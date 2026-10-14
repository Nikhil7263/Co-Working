import { useEffect, useState } from "react";
import socket from "../services/socket";

// Subscribes to live occupancy updates for one workspace via Socket.IO.
// Returns the latest { occupied, capacity, available } — starting from
// whatever initial values you pass in (e.g. from the initial REST fetch),
// then updating live whenever the backend broadcasts a change.
export default function useWorkspaceOccupancy(workspaceId, initial) {
  const [occupancy, setOccupancy] = useState(initial);

  useEffect(() => {
    if (!workspaceId) return;

    socket.emit("joinWorkspace", workspaceId);

    const handleUpdate = (payload) => {
      if (payload.workspaceId === workspaceId) {
        setOccupancy({
          occupied: payload.occupied,
          capacity: payload.capacity,
          available: payload.available,
        });
      }
    };

    socket.on("occupancyUpdate", handleUpdate);

    return () => {
      socket.emit("leaveWorkspace", workspaceId);
      socket.off("occupancyUpdate", handleUpdate);
    };
  }, [workspaceId]);

  // Keep in sync if the initial value changes (e.g. after the parent
  // page re-fetches the workspace)
  useEffect(() => {
    setOccupancy(initial);
  }, [initial?.occupied, initial?.capacity]);

  return occupancy;
}
