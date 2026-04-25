import type { Response } from 'express';

export type SeatRealtimeStatus = 'HOLDING' | 'SOLD' | 'AVAILABLE';

type SeatUpdatePayload = {
  seatId: string;
  status: SeatRealtimeStatus;
};

export type NotificationSsePayload = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  bookingId: string | null;
  read: boolean;
};

const tripChannelMap = new Map<string, Set<Response>>();
const notificationChannelMap = new Map<string, Set<Response>>();

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

function getOrCreateNotificationChannel(userId: string) {
  let channel = notificationChannelMap.get(userId);
  if (!channel) {
    channel = new Set<Response>();
    notificationChannelMap.set(userId, channel);
  }
  return channel;
}

export function addNotificationSseClient(userId: string, response: Response) {
  const channel = getOrCreateNotificationChannel(userId);
  channel.add(response);

  response.write(`data: ${JSON.stringify({ type: 'CONNECTED', payload: { userId } })}\n\n`);

  return () => {
    const targetChannel = notificationChannelMap.get(userId);
    if (!targetChannel) {
      return;
    }

    targetChannel.delete(response);
    if (targetChannel.size === 0) {
      notificationChannelMap.delete(userId);
    }
  };
}

export function emitNotification(userId: string, payload: NotificationSsePayload) {
  const channel = notificationChannelMap.get(userId);
  if (!channel || channel.size === 0) {
    return;
  }

  const message = `data: ${JSON.stringify({ type: 'NOTIFICATION', payload })}\n\n`;
  for (const client of channel) {
    client.write(message);
  }
}
