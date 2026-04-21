"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const adminRoutes_1 = require("./routes/adminRoutes");
const authRoutes_1 = require("./routes/authRoutes");
const bookingRoutes_1 = require("./routes/bookingRoutes");
const errorHandler_1 = require("./middleware/errorHandler");
const metaRoutes_1 = require("./routes/metaRoutes");
const notificationRoutes_1 = require("./routes/notificationRoutes");
const ticketRoutes_1 = require("./routes/ticketRoutes");
const tripRoutes_1 = require("./routes/tripRoutes");
const userRoutes_1 = require("./routes/userRoutes");
const tripService_1 = require("./services/tripService");
dotenv_1.default.config();
function createApp() {
    const app = (0, express_1.default)();
    const configuredOrigins = process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
    const allowedOrigins = configuredOrigins && configuredOrigins.length > 0
        ? configuredOrigins
        : ['http://localhost:5173', 'http://localhost:3000'];
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use((0, cors_1.default)({ origin: "*" }));
    app.use((0, morgan_1.default)('dev'));
    app.get('/health', (_request, response) => {
        response.json({ status: 'ok' });
    });
    app.use('/api/meta', metaRoutes_1.metaRoutes);
    app.use('/api/auth', authRoutes_1.authRoutes);
    app.use('/api/trips', tripRoutes_1.tripRoutes);
    app.get('/api/stations', async (request, response, next) => {
        try {
            const q = typeof request.query.q === 'string' ? request.query.q : undefined;
            response.json(await (0, tripService_1.listStations)(q));
        }
        catch (error) {
            next(error);
        }
    });
    app.use('/api/bookings', bookingRoutes_1.bookingRoutes);
    app.use('/api/tickets', ticketRoutes_1.ticketRoutes);
    app.use('/api/users', userRoutes_1.userRoutes);
    app.use('/api/notifications', notificationRoutes_1.notificationRoutes);
    app.use('/api/admin', adminRoutes_1.adminRoutes);
    app.use(errorHandler_1.errorHandler);
    return app;
}
