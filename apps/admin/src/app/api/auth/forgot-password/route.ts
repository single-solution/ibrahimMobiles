import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB, User, handleMongoError } from "@store/db";
import { logger, checkRateLimit, getClientIp, PASSWORD_RESET_RATE_LIMIT_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_MS, parseBody, badRequest } from "@store/shared";

const FORGOT_PASSWORD_RATE_LIMIT_SCOPE = "admin:forgot-password";
const TOKEN_BYTES = 32;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const TOKEN_EXPIRY_MS = 60 * MS_PER_MINUTE; // 1 hour

interface ForgotPasswordBody {
	email?: unknown;
}

export async function POST(request: Request) {
	const parsed = await parseBody<ForgotPasswordBody>(request);
	if (parsed instanceof Response) {
		return parsed;
	}

	const { email } = parsed;

	if (!email || typeof email !== "string") {
		return badRequest("A valid email address is required.");
	}

	const normalizedEmail = email.toLowerCase().trim();

	// Rate-limit BEFORE hitting the DB
	const ip = getClientIp(request);
	const rateLimitKey = `${ip}:${normalizedEmail}`;
	const rateLimit = checkRateLimit({
		scope: FORGOT_PASSWORD_RATE_LIMIT_SCOPE,
		key: rateLimitKey,
		max: PASSWORD_RESET_RATE_LIMIT_ATTEMPTS,
		windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
	});

	if (!rateLimit.isAllowed) {
		logger.warn({ ip, email: normalizedEmail, retryAfterMs: rateLimit.retryAfterMs }, "Admin forgot password rate limit exceeded");
		return NextResponse.json(
			{ error: "Too many requests. Please try again later." },
			{ status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / MS_PER_SECOND)) } },
		);
	}

	try {
		await connectDB();
		const user = await User.findOne({ email: normalizedEmail, isActive: true });

		// We still return 200 OK even if the user doesn't exist to prevent email enumeration
		if (!user) {
			logger.info({ email: normalizedEmail }, "Forgot password requested for non-existent or inactive user");
			return NextResponse.json({ message: "If an account exists, a reset link has been generated." }, { status: 200 });
		}

		// Generate a cryptographically secure random token
		const rawToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
		// Hash it before storing in DB (so a DB leak doesn't expose usable tokens)
		const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

		// Token expires in 1 hour
		const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

		user.resetPasswordToken = hashedToken;
		user.resetPasswordExpiresAt = expiresAt;
		await user.save();

		// In a real application, you would send an email here using an SMTP service like Resend, Sendgrid, etc.
		// We log that the link was generated, but we MUST NOT log the raw token itself to avoid leaking credentials.
		logger.info({ userId: String(user.id), email: user.email }, "Password reset link generated and would be emailed in production.");

		return NextResponse.json({ message: "If an account exists, a reset link has been generated. Check your email." }, { status: 200 });
	} catch (error) {
		return handleMongoError(error);
	}
}
