import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const MS_IN_HOUR = 60 * 60 * 1000;

type WeightedItem<T> = {
  value: T;
  weight: number;
};

const DEFAULT_SYSTEM_SETTINGS = {
  HOLD_EXPIRE_MINUTES: '5',
  REMINDER_BEFORE_MINUTES: '60',
  REFUND_POLICY_1: '75',
  REFUND_POLICY_2: '50',
  REFUND_POLICY_3: '25'
} as const;

function buildSeatCode(index: number) {
  const group = Math.floor((index - 1) / 10);
  const letter = String.fromCharCode(65 + group);
  const number = ((index - 1) % 10) + 1;
  return `${letter}${number}`;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function pickWeighted<T>(items: WeightedItem<T>[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.value;
    }
  }

  return items[items.length - 1].value;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildTripTimestamp(baseDay: Date, hour: number, minute: number) {
  const value = new Date(baseDay);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function buildSimpleLayout(seatCodes: string[]) {
  const cols = 4;
  const rows = Math.ceil(seatCodes.length / cols);
  const cells: Array<Array<{ seatNumber: string } | null>> = [];
  let index = 0;

  for (let row = 0; row < rows; row += 1) {
    const currentRow: Array<{ seatNumber: string } | null> = [];
    for (let col = 0; col < cols; col += 1) {
      const seatNumber = seatCodes[index] ?? null;
      currentRow.push(seatNumber ? { seatNumber } : null);
      index += 1;
    }
    cells.push(currentRow);
  }

  return {
    rows,
    cols,
    cells
  };
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

  const trains = await Promise.all([
    prisma.train.create({ data: { code: 'SE1', name: 'Thống Nhất Express 1' } }),
    prisma.train.create({ data: { code: 'SE2', name: 'Thống Nhất Express 2' } }),
    prisma.train.create({ data: { code: 'TN1', name: 'Trung Nam 1' } }),
    prisma.train.create({ data: { code: 'TN2', name: 'Trung Nam 2' } })
  ]);

  const seatCodes = Array.from({ length: 40 }, (_, idx) => buildSeatCode(idx + 1));
  const baseLayout = buildSimpleLayout(seatCodes);

  const template = await prisma.carriageTemplate.create({
    data: {
      code: 'TMP-SOFT-40',
      type: 'SOFT_SEAT',
      layout: baseLayout
    }
  });

  const weightedStatuses: Array<WeightedItem<'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'COMPLETED'>> = [
    { value: 'ON_TIME', weight: 70 },
    { value: 'DELAYED', weight: 20 },
    { value: 'CANCELLED', weight: 5 },
    { value: 'COMPLETED', weight: 5 }
  ];

  let generatedTrips = 0;
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    const day = addDays(today, dayOffset);
    const tripsPerDay = randomInt(5, 10);

    for (let tripIndex = 0; tripIndex < tripsPerDay; tripIndex += 1) {
      const departureStation = pickRandom(stations);
      const destinationCandidates = stations.filter((station) => station.id !== departureStation.id);
      const arrivalStation = pickRandom(destinationCandidates);

      const departureHour = randomInt(6, 22);
      const departureMinute = randomInt(0, 1) * 30;
      const departureTime = buildTripTimestamp(day, departureHour, departureMinute);

      const durationHours = randomInt(2, 10);
      const arrivalTime = new Date(departureTime.getTime() + durationHours * MS_IN_HOUR);

      const basePrice = randomInt(100000, 1000000);
      const status = pickWeighted(weightedStatuses);
      const assignedTrain = pickRandom(trains);

      await prisma.trip.create({
        data: {
          trainId: assignedTrain.id,
          originStationId: departureStation.id,
          destinationStationId: arrivalStation.id,
          origin: departureStation.name,
          destination: arrivalStation.name,
          departureTime,
          arrivalTime,
          price: new Decimal(basePrice),
          status,
          delayMinutes: status === 'DELAYED' ? randomInt(10, 90) : 0,
          note: status === 'CANCELLED'
            ? 'Hủy do điều kiện vận hành.'
            : status === 'DELAYED'
              ? 'Tàu đến muộn do điều phối tuyến.'
              : null,
          tripCarriages: {
            create: [
              {
                templateId: template.id,
                code: 'C1',
                orderIndex: 1,
                basePrice: new Decimal(basePrice),
                layout: baseLayout,
                seats: {
                  create: seatCodes.map((seatNumber) => ({
                    seatNumber,
                    price: new Decimal(basePrice)
                  }))
                }
              }
            ]
          }
        }
      });

      generatedTrips += 1;
    }
  }

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
  console.log(`Generated trips for 30 days: ${generatedTrips}`);
  console.log('Seed logic: dynamic 30-day schedule with weighted statuses and realistic pricing/durations.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
