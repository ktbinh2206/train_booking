"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaRoutes = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../lib/asyncHandler");
const adminService_1 = require("../services/adminService");
exports.metaRoutes = (0, express_1.Router)();
exports.metaRoutes.get('/demo', (0, asyncHandler_1.asyncHandler)(async (_request, response) => {
    response.json(await (0, adminService_1.getDemoMeta)());
}));
