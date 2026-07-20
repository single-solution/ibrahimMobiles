/**
 * Password hashing (Web Crypto PBKDF2-HMAC-SHA-256).
 *
 * Salted KDF plus a server-side pepper (`AUTH_SECRET`) mixed into the input, so a
 * DB leak of salt+hash can't be cracked without also holding `AUTH_SECRET`.
 *
 * Stored format: `pbkdf2$<iterations>$<saltBase64>$<hashBase64>`.
 */

const encoder = new TextEncoder();

const ALGORITHM_LABEL = "pbkdf2";
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const DERIVED_KEY_BITS = 256;
const SALT_BYTES = 16;
const STORED_PART_COUNT = 4;

function getPepper(): string {
	const secret = process.env.AUTH_SECRET;
	if (!secret) {
		throw new Error("AUTH_SECRET is required to hash passwords.");
	}
	return secret;
}

function toBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

/** Constant-time comparison of two byte arrays. */
function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
	if (left.length !== right.length) {
		return false;
	}
	let mismatch = 0;
	for (let index = 0; index < left.length; index += 1) {
		mismatch |= left[index] ^ right[index];
	}
	return mismatch === 0;
}

async function deriveHash(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
	const keyMaterial = await globalThis.crypto.subtle.importKey("raw", encoder.encode(`${getPepper()}:${password}`), "PBKDF2", false, ["deriveBits"]);
	const bits = await globalThis.crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: PBKDF2_HASH }, keyMaterial, DERIVED_KEY_BITS);
	return new Uint8Array(bits);
}

/** Hash a plaintext password for storage. */
export async function hashPassword(password: string): Promise<string> {
	const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const hash = await deriveHash(password, salt, PBKDF2_ITERATIONS);
	return `${ALGORITHM_LABEL}$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Verify a plaintext password against a stored hash in constant time. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const parts = stored.split("$");
	if (parts.length !== STORED_PART_COUNT || parts[0] !== ALGORITHM_LABEL) {
		return false;
	}
	const iterations = Number(parts[1]);
	if (!Number.isInteger(iterations) || iterations < 1) {
		return false;
	}
	const salt = fromBase64(parts[2]);
	const expected = fromBase64(parts[3]);
	const actual = await deriveHash(password, salt, iterations);
	return timingSafeEqual(actual, expected);
}

let cachedDecoyHash: string | null = null;

/**
 * A stable decoy hash for the "user not found" login branch, so it costs the
 * same CPU as a real verify and can't be used to enumerate accounts by timing.
 */
export async function decoyPasswordHash(): Promise<string> {
	if (!cachedDecoyHash) {
		cachedDecoyHash = await hashPassword("admin-login:enum-defense:v1");
	}
	return cachedDecoyHash;
}
