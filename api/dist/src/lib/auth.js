"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccessToken = createAccessToken;
exports.parseAccessToken = parseAccessToken;
exports.getAuthUserFromRequest = getAuthUserFromRequest;
const crypto_1 = __importDefault(require("crypto"));
const SECRET = process.env.AUTH_SECRET ?? 'train-booking-dev-secret';
const EXPIRES_IN_SECONDS = Number.parseInt(process.env.AUTH_EXPIRES_IN_SECONDS ?? '604800', 10);
function encodeBase64Url(input) {
    return Buffer.from(input, 'utf8').toString('base64url');
}
function decodeBase64Url(input) {
    return Buffer.from(input, 'base64url').toString('utf8');
}
function sign(content) {
    return crypto_1.default.createHmac('sha256', SECRET).update(content).digest('base64url');
}
function createAccessToken(input) {
    const payload = {
        sub: input.id,
        role: input.role,
        email: input.email,
        exp: Math.floor(Date.now() / 1000) + EXPIRES_IN_SECONDS
    };
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = sign(encodedPayload);
    return `${encodedPayload}.${signature}`;
}
function parseAccessToken(token) {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) {
        return null;
    }
    const expectedSignature = sign(encodedPayload);
    if (expectedSignature !== signature) {
        return null;
    }
    try {
        const payload = JSON.parse(decodeBase64Url(encodedPayload));
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
    }
    catch {
        return null;
    }
}
function getAuthUserFromRequest(request) {
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
