import { Router } from 'express';
import { addSseClient } from '../lib/sse';
import { AppError } from '../lib/errors';

export const sseRoutes = Router();

sseRoutes.get('/trip/:tripId', (request, response) => {
  const tripId = typeof request.params.tripId === 'string' ? request.params.tripId : undefined;
  if (!tripId) {
    throw new AppError('Thiếu tripId.', 400);
  }

  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.flushHeaders();

  const removeClient = addSseClient(tripId, response);

  const heartbeat = setInterval(() => {
    response.write(': heartbeat\n\n');
  }, 20_000);

  request.on('close', () => {
    clearInterval(heartbeat);
    removeClient();
    response.end();
  });
});
