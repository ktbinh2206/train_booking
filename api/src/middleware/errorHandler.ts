import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/errors';

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      message: error.message,
      details: error.details ?? null
    });
    return;
  }

  if (error instanceof Error) {
    response.status(500).json({
      message: error.message
    });
    return;
  }

  response.status(500).json({
    message: 'Lỗi hệ thống không xác định.'
  });
}