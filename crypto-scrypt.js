// crypto-scrypt.js
import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);

// Sensible defaults; tune to your server
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64, saltBytes: 16, maxmem: 64 * 1024 * 1024 };

// Produce a PHC-like string: <saltB64>$<hashB64>
export async function hashPassword(password) {
    if (typeof password !== "string" || password.length === 0) {
        throw new Error("Password must be a non-empty string");
    }

    const salt = crypto.randomBytes(SCRYPT_PARAMS.saltBytes);
    const dk = await scrypt(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS);
    return `${salt.toString("base64")}$${Buffer.from(dk).toString("base64")}`;
}

export async function verifyPassword(password, stored) {
    // Expect format: <saltB64>$<hashB64>
    const parts = String(stored).split("$");
    if (parts.length !== 2) return false;

    const [saltB64, hashB64] = parts;

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");

    const dk = await scrypt(password, salt, expected.length, SCRYPT_PARAMS);

    // Constant-time comparison
    if (dk.length !== expected.length) return false;
    return crypto.timingSafeEqual(dk, expected);
}