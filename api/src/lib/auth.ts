import crypto from 'crypto';
import type { Request } from 'express';

type AuthPayload = {
  sub: string;
  role: 'USER' | 'ADMIN';
  email: string;
  exp: number;
};

type AuthUser = {
  id: string;
  role: 'USER' | 'ADMIN';
  email: string;
};

const SECRET = process.env.AUTH_SECRET ?? 'train-booking-dev-secret';
const EXPIRES_IN_SECONDS = Number.parseInt(process.env.AUTH_EXPIRES_IN_SECONDS ?? '604800', 10);

function encodeBase64Url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function decodeBase64Url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(content: string) {
  return crypto.createHmac('sha256', SECRET).update(content).digest('base64url');
}

export function createAccessToken(input: { id: string; role: 'USER' | 'ADMIN'; email: string }) {
  const payload: AuthPayload = {
    sub: input.id,
    role: input.role,
    email: input.email,
    exp: Math.floor(Date.now() / 1000) + EXPIRES_IN_SECONDS
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseAccessToken(token: string): AuthUser | null {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (expectedSignature !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as AuthPayload;
    if (!payload?.sub || !payload?.role || !payload?.email || !payload?.exp) {
      return null;
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: payload.sub,
      role: payload.role,
      email: payload.email
    };
  } catch {
    return null;
  }
}

export function getAuthUserFromRequest(request: Request): AuthUser | null {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  return parseAccessToken(token);
}