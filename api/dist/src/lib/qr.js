"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQrDataUrl = createQrDataUrl;
const qrcode_1 = __importDefault(require("qrcode"));
async function createQrDataUrl(payload) {
    return qrcode_1.default.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 220
    });
}
