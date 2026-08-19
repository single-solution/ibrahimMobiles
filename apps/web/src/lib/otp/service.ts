/**
 * OTP service.
 *
 * Rules:
 * - 1 attempt per minute cooldown (`OTP_RESEND_THROTTLE_MS` = 60s).
 * - Maximum 5 attempts total within a 1-hour rolling window (`MAX_OTP_ISSUES_PER_HOUR` = 5).
 * - Resets after an hour.
 * - 5 maximum wrong verification tries before invalidation.
 *
 * Security:
 * - Codes are never stored in plaintext (bcrypt / argon / sha256 hash).
 * - Bad attempts are rate-limited and the row is invalidated after 5 wrong tries.
 */

import { OtpCode, connectDB, getStoreSettings } from "@store/db";
import { hashOtpCode, logger, OTP_CODE_LENGTH, PHONE_TAIL_LENGTH, phoneFingerprint, verifyOtpCode } from "@store/shared";

import { getOtpProvider } from "@/lib/otp/provider";

const MS_PER_MINUTE = 60_000;
const OTP_TTL_MINUTES = 5;
const OTP_RESEND_THROTTLE_MINUTES = 1;
const OTP_HOUR_WINDOW_MINUTES = 60;

const OTP_TTL_MS = OTP_TTL_MINUTES * MS_PER_MINUTE;
const OTP_RESEND_THROTTLE_MS = OTP_RESEND_THROTTLE_MINUTES * MS_PER_MINUTE;
const OTP_HOUR_WINDOW_MS = OTP_HOUR_WINDOW_MINUTES * MS_PER_MINUTE;
const MAX_OTP_ISSUES_PER_HOUR = 5;
const OTP_MAX_VERIFY_ATTEMPTS = 5;

/** Decimal base used when converting random bytes into OTP digits. */
const DECIMAL_RADIX = 10;
/** Defensive cap so a hostile caller can't blow the column with a 1MB phone. */
const PHONE_RAW_MAX_CHARS = 64;

interface IssueResult {
	ok: true;
	/** Last 4 digits of the canonical phone, for UI confirmation only. */
	phoneTail: string;
	expiresAt: string;
	/** True if a still-valid code was reused instead of issuing a new one. */
	reused: boolean;
}

interface IssueErrorTooSoon {
	ok: false;
	error: "too-soon";
	retryAfterMs: number;
}

interface IssueErrorHourlyLimit {
	ok: false;
	error: "hourly-limit-reached";
	retryAfterMs: number;
}

interface IssueErrorBadInput {
	ok: false;
	error: "invalid-phone";
}

interface IssueErrorDelivery {
	ok: false;
	error: "delivery-failed";
}

type IssueResponse = IssueResult | IssueErrorTooSoon | IssueErrorHourlyLimit | IssueErrorBadInput | IssueErrorDelivery;

/** Generate `OTP_CODE_LENGTH` decimal digits using crypto-strong PRNG. */
function generateOtp(): string {
	const bytes = new Uint8Array(OTP_CODE_LENGTH);
	globalThis.crypto.getRandomValues(bytes);
	let digits = "";
	for (let i = 0; i < OTP_CODE_LENGTH; i += 1) {
		digits += (bytes[i] % DECIMAL_RADIX).toString();
	}
	return digits;
}

export async function issueCode(input: { phoneRaw: string; purpose: "customer-signin" }): Promise<IssueResponse> {
	const fingerprint = phoneFingerprint(input.phoneRaw);
	if (!fingerprint) {
		return { ok: false, error: "invalid-phone" };
	}

	await connectDB();

	const now = Date.now();
	const oneHourAgo = new Date(now - OTP_HOUR_WINDOW_MS);

	// 1. Check 1-hour window cap (Max 5 attempts per hour)
	const hourCodes = await OtpCode.find({
		phoneFingerprint: fingerprint,
		purpose: input.purpose,
		createdAt: { $gte: oneHourAgo },
	})
		.sort({ createdAt: 1 })
		.lean<Array<{ createdAt: Date }>>();

	if (hourCodes.length >= MAX_OTP_ISSUES_PER_HOUR) {
		const oldestInWindow = hourCodes[0]?.createdAt.getTime() ?? (now - OTP_HOUR_WINDOW_MS);
		const retryAfterMs = Math.max(1_000, OTP_HOUR_WINDOW_MS - (now - oldestInWindow));
		return {
			ok: false,
			error: "hourly-limit-reached",
			retryAfterMs,
		};
	}

	// 2. Check 1-minute cooldown between requests
	const latest = hourCodes[hourCodes.length - 1];
	if (latest && now - latest.createdAt.getTime() < OTP_RESEND_THROTTLE_MS) {
		return {
			ok: false,
			error: "too-soon",
			retryAfterMs: OTP_RESEND_THROTTLE_MS - (now - latest.createdAt.getTime()),
		};
	}

	const code = generateOtp();
	const codeHash = await hashOtpCode(code);
	const expiresAt = new Date(now + OTP_TTL_MS);

	const otpDoc = await OtpCode.create({
		phoneFingerprint: fingerprint,
		phoneRaw: input.phoneRaw.trim().slice(0, PHONE_RAW_MAX_CHARS),
		codeHash,
		purpose: input.purpose,
		expiresAt,
	});

	try {
		const { siteName } = await getStoreSettings();
		const provider = await getOtpProvider();
		await provider.send({
			phoneFingerprint: fingerprint,
			phoneRaw: input.phoneRaw,
			code,
			expiresInMinutes: Math.round(OTP_TTL_MS / MS_PER_MINUTE),
			brand: siteName || "Ibrahim Mobiles",
		});
	} catch (error) {
		logger.error({ error, phoneFingerprint: fingerprint }, "OTP delivery failed");
		await OtpCode.deleteOne({ _id: otpDoc._id });
		return { ok: false, error: "delivery-failed" };
	}

	return {
		ok: true,
		reused: false,
		phoneTail: fingerprint.slice(-PHONE_TAIL_LENGTH),
		expiresAt: expiresAt.toISOString(),
	};
}

type VerifyResult =
	| { ok: true; phoneFingerprint: string; phoneRaw: string }
	| { ok: false; error: "invalid-phone" | "expired" | "exhausted" | "wrong-code" };

export async function verifyCode(input: {
	phoneRaw: string;
	code: string;
	purpose: "customer-signin";
}): Promise<VerifyResult> {
	const fingerprint = phoneFingerprint(input.phoneRaw);
	if (!fingerprint) {
		return { ok: false, error: "invalid-phone" };
	}
	const trimmed = input.code.trim();
	if (!new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`).test(trimmed)) {
		return { ok: false, error: "wrong-code" };
	}

	await connectDB();

	const candidate = await OtpCode.findOne({
		phoneFingerprint: fingerprint,
		purpose: input.purpose,
		consumedAt: { $exists: false },
	})
		.sort({ createdAt: -1 })
		.select("+codeHash");

	if (!candidate) {
		return { ok: false, error: "wrong-code" };
	}

	if (candidate.expiresAt.getTime() < Date.now()) {
		return { ok: false, error: "expired" };
	}

	if (candidate.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
		return { ok: false, error: "exhausted" };
	}

	const matches = await verifyOtpCode(trimmed, candidate.codeHash);

	if (!matches) {
		candidate.attempts += 1;
		if (candidate.attempts >= OTP_MAX_VERIFY_ATTEMPTS) {
			candidate.consumedAt = new Date();
			logger.warn({ phoneFingerprint: fingerprint }, "OTP exhausted after 5 wrong attempts");
		}
		await candidate.save();
		return {
			ok: false,
			error: candidate.consumedAt ? "exhausted" : "wrong-code",
		};
	}

	candidate.consumedAt = new Date();
	await candidate.save();

	return { ok: true, phoneFingerprint: fingerprint, phoneRaw: candidate.phoneRaw };
}
