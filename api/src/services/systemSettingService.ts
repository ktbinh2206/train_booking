import { prisma } from '../lib/prisma';

export const SYSTEM_SETTING_KEYS = [
  'HOLD_EXPIRE_MINUTES',
  'REMINDER_BEFORE_MINUTES',
  'REFUND_POLICY_1',
  'REFUND_POLICY_2',
  'REFUND_POLICY_3'
] as const;

export type SystemSettingKey = typeof SYSTEM_SETTING_KEYS[number];

export type SystemSettingValues = Record<SystemSettingKey, string>;

export type SystemRuntimeSettings = {
  holdExpireMinutes: number;
  reminderBeforeMinutes: number;
  refundPolicy1: number;
  refundPolicy2: number;
  refundPolicy3: number;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingValues = {
  HOLD_EXPIRE_MINUTES: '5',
  REMINDER_BEFORE_MINUTES: '60',
  REFUND_POLICY_1: '75',
  REFUND_POLICY_2: '50',
  REFUND_POLICY_3: '25'
};

const SYSTEM_SETTING_KEY_SET = new Set<string>(SYSTEM_SETTING_KEYS);

type SystemSettingDelegate = {
  findMany: (args: unknown) => Promise<Array<{ key: string; value: string }>>;
  upsert: (args: unknown) => Promise<unknown>;
};

function getSystemSettingDelegate(): SystemSettingDelegate | null {
  const delegate = (prisma as any).systemSetting;
  if (!delegate || typeof delegate.findMany !== 'function' || typeof delegate.upsert !== 'function') {
    return null;
  }
  return delegate as SystemSettingDelegate;
}

function normalizeSettingValue(value: string) {
  return value.trim();
}

function parseSettingInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getSystemSettings(): Promise<SystemSettingValues> {
  const delegate = getSystemSettingDelegate();
  let rows: Array<{ key: string; value: string }> = [];

  if (!delegate) {
    try {
      rows = await prisma.$queryRawUnsafe<Array<{ key: string; value: string }>>(
        'SELECT "key", "value" FROM "SystemSetting"'
      );
    } catch {
      return { ...DEFAULT_SYSTEM_SETTINGS };
    }
  } else {
    rows = await delegate.findMany({
      where: {
        key: {
          in: SYSTEM_SETTING_KEYS as unknown as string[]
        }
      },
      select: {
        key: true,
        value: true
      }
    });
  }

  const settings = { ...DEFAULT_SYSTEM_SETTINGS };

  for (const row of rows) {
    if (SYSTEM_SETTING_KEY_SET.has(row.key)) {
      settings[row.key as SystemSettingKey] = normalizeSettingValue(row.value);
    }
  }

  return settings;
}

export async function saveSystemSettings(input: Partial<SystemSettingValues>) {
  const delegate = getSystemSettingDelegate();
  const updates = Object.entries(input)
    .filter(([, value]) => typeof value === 'string') as Array<[SystemSettingKey, string]>;

  if (updates.length === 0) {
    return getSystemSettings();
  }

  if (!delegate) {
    for (const [key, value] of updates) {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "SystemSetting" ("key", "value", "createdAt", "updatedAt") VALUES ($1, $2, NOW(), NOW()) ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()',
        key,
        normalizeSettingValue(value)
      );
    }

    return getSystemSettings();
  }

  for (const [key, value] of updates) {
    await delegate.upsert({
      where: { key },
      create: { key, value: normalizeSettingValue(value) },
      update: { value: normalizeSettingValue(value) }
    });
  }

  return getSystemSettings();
}

export async function getSystemRuntimeSettings(): Promise<SystemRuntimeSettings> {
  const settings = await getSystemSettings();

  return {
    holdExpireMinutes: Math.max(1, parseSettingInteger(settings.HOLD_EXPIRE_MINUTES, 5)),
    reminderBeforeMinutes: Math.max(1, parseSettingInteger(settings.REMINDER_BEFORE_MINUTES, 60)),
    refundPolicy1: Math.max(0, Math.min(100, parseSettingInteger(settings.REFUND_POLICY_1, 75))),
    refundPolicy2: Math.max(0, Math.min(100, parseSettingInteger(settings.REFUND_POLICY_2, 50))),
    refundPolicy3: Math.max(0, Math.min(100, parseSettingInteger(settings.REFUND_POLICY_3, 25)))
  };
}