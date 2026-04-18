import { prisma } from './lib/prisma';
import { createApp } from './app';
import { expireBooking } from './services/bookingService';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

const server = app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});

const cleanupTimer = setInterval(async () => {
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: 'HOLDING',
      holdExpiresAt: { lt: new Date() }
    },
    select: { id: true }
  });

  for (const booking of expiredBookings) {
    await expireBooking(booking.id);
  }
}, 60_000);

cleanupTimer.unref();

process.on('SIGINT', async () => {
  clearInterval(cleanupTimer);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  clearInterval(cleanupTimer);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});