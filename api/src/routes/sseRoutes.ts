import { Router } from 'express';
import { getAuthUserFromRequest, parseAccessToken } from '../lib/auth';
import { addNotificationSseClient, addSseClient } from '../lib/sse';
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

sseRoutes.get('/notifications', (request, response) => {
  const authUser = getAuthUserFromRequest(request);
  const tokenQuery = typeof request.query.token === 'string' ? request.query.token : undefined;
  const parsedTokenUser = tokenQuery ? parseAccessToken(tokenQuery) : null;
  const userIdQuery = typeof request.query.userId === 'string' ? request.query.userId : undefined;
  const userId = authUser?.id ?? parsedTokenUser?.id ?? userIdQuery;

  if (!userId) {
    throw new AppError('Thiếu userId.', 400);
  }

  response.setHeader('Content-Type', 'text/event-stream');
  response.setHeader('Cache-Control', 'no-cache, no-transform');
  response.setHeader('Connection', 'keep-alive');
  response.setHeader('X-Accel-Buffering', 'no');
  response.flushHeaders();

  const removeClient = addNotificationSseClient(userId, response);

  const heartbeat = setInterval(() => {
    response.write(': heartbeat\n\n');
  }, 20_000);

  request.on('close', () => {
    clearInterval(heartbeat);
    removeClient();
    response.end();
  });
});
