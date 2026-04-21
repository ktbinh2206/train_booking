"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./lib/prisma");
const app_1 = require("./app");
const bookingService_1 = require("./services/bookingService");
const port = Number(process.env.PORT ?? 4000);
const app = (0, app_1.createApp)();
const server = app.listen(port, () => {
    console.log(`API running at http://localhost:${port}`);
});
const cleanupTimer = setInterval(async () => {
    const expiredBookings = await prisma_1.prisma.booking.findMany({
        where: {
            status: 'HOLDING',
            holdExpiresAt: { lt: new Date() }
        },
        select: { id: true }
    });
    for (const booking of expiredBookings) {
        await (0, bookingService_1.expireBooking)(booking.id);
    }
}, 60_000);
cleanupTimer.unref();
process.on('SIGINT', async () => {
    clearInterval(cleanupTimer);
    server.close();
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    clearInterval(cleanupTimer);
    server.close();
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
