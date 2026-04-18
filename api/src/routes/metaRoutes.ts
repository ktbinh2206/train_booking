import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { getDemoMeta } from '../services/adminService';

export const metaRoutes = Router();

metaRoutes.get('/demo', asyncHandler(async (_request, response) => {
  response.json(await getDemoMeta());
}));