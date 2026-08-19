/**
 * Issue (create) an OTP for customer sign-in.
 *
 * POST /api/auth/otp  { phoneNumber }
 *
 * - 1 minute cooldown per attempt.
 * - Max 5 attempts total per hour per phone.
 * - Always returns 200 { phoneTail, expiresAt } for valid phones.
 */

import { badRequest, ok, parseBody, phoneFingerprint, serverError, tooManyRequests } from "@store/shared";
import { issueCode } from "@/lib/otp/service";

export const dynamic = "force-dynamic";

const INVALID_PHONE_MESSAGE = "Please enter a valid phone number.";

interface IssueOtpBody {
	phoneNumber?: unknown;
}

export async function POST(request: Request) {
	const parsed = await parseBody<IssueOtpBody>(request);
	if (parsed instanceof Response) {
		return parsed;
	}
	const phone = typeof parsed.phoneNumber === "string" ? parsed.phoneNumber.trim() : "";

	if (!phone || !phoneFingerprint(phone)) {
		return badRequest(INVALID_PHONE_MESSAGE);
	}

	const result = await issueCode({ phoneRaw: phone, purpose: "customer-signin" });

	if (result.ok) {
		return ok({
			phoneTail: result.phoneTail,
			expiresAt: result.expiresAt,
		});
	}

	if (result.error === "too-soon") {
		const seconds = Math.ceil(result.retryAfterMs / 1000);
		return tooManyRequests(result.retryAfterMs, `Please wait ${seconds}s before requesting another code.`);
	}

	if (result.error === "hourly-limit-reached") {
		const minutes = Math.ceil(result.retryAfterMs / 60_000);
		return tooManyRequests(result.retryAfterMs, `Maximum 5 OTP requests per hour reached for this number. Please try again in ${minutes} minutes.`);
	}

	if (result.error === "delivery-failed") {
		return serverError("Could not send the verification code. Please try again in a moment.");
	}

	return badRequest(INVALID_PHONE_MESSAGE);
}
