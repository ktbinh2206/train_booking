"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../lib/errors");
function errorHandler(error, _request, response, _next) {
    if (error instanceof errors_1.AppError) {
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
