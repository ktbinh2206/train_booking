'use client';

import { useEffect } from 'react';

type SeatUpdatePayload = {
  seatId: string;
  status: 'HOLDING' | 'SOLD' | 'AVAILABLE';
};

type SeatUpdateEvent = {
  type: 'SEAT_UPDATE' | 'CONNECTED';
  payload: SeatUpdatePayload | { tripId: string };
};

function buildSseUrl(tripId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  return `${baseUrl}/api/sse/trip/${tripId}`;
}

export function useSeatRealtime(tripId: string, onSeatUpdate: (payload: SeatUpdatePayload) => void) {
  useEffect(() => {
    if (!tripId) {
      return;
    }

    const eventSource = new EventSource(buildSseUrl(tripId));

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as SeatUpdateEvent;
        if (parsed.type !== 'SEAT_UPDATE') {
          return;
        }

        const payload = parsed.payload as SeatUpdatePayload;
        if (!payload?.seatId || !payload?.status) {
          return;
        }

        onSeatUpdate(payload);
      } catch {
        // Ignore malformed event payload.
      }
    };

    return () => {
      eventSource.close();
    };
  }, [tripId, onSeatUpdate]);
}
