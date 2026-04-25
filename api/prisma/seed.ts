import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_SYSTEM_SETTINGS = {
  HOLD_EXPIRE_MINUTES: '5',
  REMINDER_BEFORE_MINUTES: '60',
  REFUND_POLICY_1: '75',
  REFUND_POLICY_2: '50',
  REFUND_POLICY_3: '25'
} as const;

type RoutePlan = {
  originCode: string;
  destinationCode: string;
  basePrice: number;
  durationHours: number;
  departureSlots: Array<{ hour: number; minute: number }>;
};

function buildSeatCode(index: number) {
  const group = Math.floor((index - 1) / 10);
  const letter = String.fromCharCode(65 + group);
  const number = ((index - 1) % 10) + 1;
  return `${letter}${number}`;
}

function buildUtcTimeFromVn(dayOffset: number, hour: number, minute: number) {
  const now = new Date();
  const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const base = new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate() + dayOffset, hour - 7, minute, 0, 0));
  return base;
}

async function main() {
  const defaultPasswordHash = await bcrypt.hash('123456', 10);
  try {
    const systemSettingDelegate = (prisma as any).systemSetting;
    if (systemSettingDelegate && typeof systemSettingDelegate.deleteMany === 'function') {
      await systemSettingDelegate.deleteMany();
    } else {
      try {
        await prisma.$executeRawUnsafe('DELETE FROM "SystemSetting"');
      } catch {
        // Ignore when table does not exist yet.
      }
    }

    await prisma.bookingSeat.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.emailLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.tripSeat.deleteMany();
    await prisma.tripCarriage.deleteMany();
    await prisma.carriageTemplate.deleteMany();
    await prisma.train.deleteMany();
    await prisma.station.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.error('Error clearing database:', error);
  }

  const admin = await prisma.user.create({
    data: {
      name: 'Quản trị viên hệ thống',
      email: 'admin@trainbooking.local',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN'
    }
  });

  const customers = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Nguyễn Văn A',
        email: 'customer.a@trainbooking.local',
        passwordHash: defaultPasswordHash,
        role: 'USER'
      }
    }),
    prisma.user.create({
      data: {
        name: 'Trần Thị B',
        email: 'customer.b@trainbooking.local',
        passwordHash: defaultPasswordHash,
        role: 'USER'
      }
    }),
    prisma.user.create({
      data: {
        name: 'Lê Văn C',
        email: 'customer.c@trainbooking.local',
        passwordHash: defaultPasswordHash,
        role: 'USER'
      }
    })
  ]);

  const stations = await Promise.all([
    prisma.station.create({ data: { code: 'HN', name: 'Hà Nội', city: 'Hà Nội' } }),
    prisma.station.create({ data: { code: 'DN', name: 'Đà Nẵng', city: 'Đà Nẵng' } }),
    prisma.station.create({ data: { code: 'HU', name: 'Huế', city: 'Thừa Thiên Huế' } }),
    prisma.station.create({ data: { code: 'SG', name: 'Sài Gòn', city: 'Hồ Chí Minh' } }),
    prisma.station.create({ data: { code: 'NT', name: 'Nha Trang', city: 'Khánh Hòa' } }),
    prisma.station.create({ data: { code: 'HP', name: 'Hải Phòng', city: 'Hải Phòng' } })
  ]);

  const systemSettingDelegate = (prisma as any).systemSetting;
  if (systemSettingDelegate && typeof systemSettingDelegate.upsert === 'function') {
    await Promise.all(
      Object.entries(DEFAULT_SYSTEM_SETTINGS).map(([key, value]) =>
        systemSettingDelegate.upsert({
          where: { key },
          create: { key, value },
          update: { value }
        })
      )
    );
  } else {
    for (const [key, value] of Object.entries(DEFAULT_SYSTEM_SETTINGS)) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "SystemSetting" ("key", "value", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()',
        key,
        value
      );
    }
  }
  
  console.log(`Admin login: ${admin.email}`);
  console.log(`Demo users: ${customers.map((customer) => customer.email).join(', ')}`);
  console.log(`Seeded system settings: ${Object.keys(DEFAULT_SYSTEM_SETTINGS).join(', ')}`);
  console.log('Seed logic: fixed timetable routes, carriage template by train, and deterministic booking statuses for demo.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
