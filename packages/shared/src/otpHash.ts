/**
 * OTP code hashing (Web Crypto HMAC-SHA-256).
 *
 * OTPs are short-lived, single-use, attempt-capped numeric codes — their
 * security comes from expiry + attempt limits + rate limiting, not from a slow
 * KDF. A keyed HMAC (server secret) runs sub-millisecond, so it fits the
 * Cloudflare Workers 10ms CPU budget where bcrypt (cost 12, ~200ms) cannot.
 *
 * Stored rows are already scoped to a phone fingerprint, so hashing the code
 * alone is sufficient; the server secret prevents matching a code from a DB
 * leak without also holding AUTH_SECRET.
 */

const encoder = new TextEncoder();

function getOtpSecret(): string {
	const secret = process.env.AUTH_SECRET;
	if (!secret) {
		throw new Error("AUTH_SECRET is required to hash OTP codes.");
	}
	return secret;
}

async function importHmacKey(): Promise<CryptoKey> {
	return globalThis.crypto.subtle.importKey("raw", encoder.encode(getOtpSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function bufferToHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let hex = "";
	for (const byte of bytes) {
		hex += byte.toString(16).padStart(2, "0");
	}
	return hex;
}

/** Constant-time comparison of two equal-length hex strings. */
function timingSafeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) {
		return false;
	}
	let mismatch = 0;
	for (let index = 0; index < left.length; index += 1) {
		mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return mismatch === 0;
}

/** Hash a plaintext OTP for storage. */
export async function hashOtpCode(code: string): Promise<string> {
	const key = await importHmacKey();
	const signature = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(code));
	return bufferToHex(signature);
}

/** Verify a plaintext OTP against a stored hash in constant time. */
export async function verifyOtpCode(code: string, storedHash: string): Promise<boolean> {
	const computed = await hashOtpCode(code);
	return timingSafeEqual(computed, storedHash);
}
