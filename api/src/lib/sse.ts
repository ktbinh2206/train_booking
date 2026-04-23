import type { Response } from 'express';

export type SeatRealtimeStatus = 'HOLDING' | 'SOLD' | 'AVAILABLE';

type SeatUpdatePayload = {
  seatId: string;
  status: SeatRealtimeStatus;
};

const tripChannelMap = new Map<string, Set<Response>>();

function getOrCreateTripChannel(tripId: string) {
  let channel = tripChannelMap.get(tripId);
  if (!channel) {
    channel = new Set<Response>();
    tripChannelMap.set(tripId, channel);
  }
  return channel;
}

export function addSseClient(tripId: string, response: Response) {
  const channel = getOrCreateTripChannel(tripId);
  channel.add(response);

  response.write(`data: ${JSON.stringify({ type: 'CONNECTED', payload: { tripId } })}\n\n`);

  return () => {
    const targetChannel = tripChannelMap.get(tripId);
    if (!targetChannel) {
      return;
    }

    targetChannel.delete(response);
    if (targetChannel.size === 0) {
      tripChannelMap.delete(tripId);
    }
  };
}

export function emitSeatUpdate(tripId: string, payload: SeatUpdatePayload) {
  const channel = tripChannelMap.get(tripId);
  if (!channel || channel.size === 0) {
    return;
  }

  const message = `data: ${JSON.stringify({ type: 'SEAT_UPDATE', payload })}\n\n`;
  for (const client of channel) {
    client.write(message);
  }
}

export function emitSeatUpdates(tripId: string, payloads: SeatUpdatePayload[]) {
  for (const payload of payloads) {
    emitSeatUpdate(tripId, payload);
  }
}
