import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB, User } from "@store/db";
import { 
  logger, 
  validatePassword, 
  isValidationError, 
  BCRYPT_ROUNDS,
  checkRateLimit,
  clearRateLimit,
  getClientIp,
  LOGIN_RATE_LIMIT_ATTEMPTS,
  LOGIN_RATE_LIMIT_WINDOW_MS
} from "@store/shared";

const RESET_PASSWORD_RATE_LIMIT_SCOPE = "admin:reset-password";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing token." },
        { status: 400 }
      );
    }

    // Rate limit the token submission attempt to prevent brute-forcing tokens
    const ip = getClientIp(request);
    const rateLimitKey = `${ip}`; // Rate limit by IP for reset attempts
    const rateLimit = checkRateLimit({
      scope: RESET_PASSWORD_RATE_LIMIT_SCOPE,
      key: rateLimitKey,
      max: LOGIN_RATE_LIMIT_ATTEMPTS,
      windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.isAllowed) {
      logger.warn(
        { ip, retryAfterMs: rateLimit.retryAfterMs },
        "Admin reset password rate limit exceeded"
      );
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      );
    }

    const validationResult = validatePassword(password);
    if (isValidationError(validationResult)) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    // Hash the incoming raw token to compare with the DB stored hashed token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    await connectDB();
    
    // Find a user with this token and ensure the token hasn't expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: { $gt: new Date() },
      isActive: true,
    });

    if (!user) {
      logger.warn("Password reset attempt with invalid or expired token");
      return NextResponse.json(
        { error: "This password reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Update password
    const passwordHash = await bcrypt.hash(validationResult, BCRYPT_ROUNDS);
    user.passwordHash = passwordHash;
    user.passwordChangedAt = new Date();
    
    // Invalidate the token so it can't be used again
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    
    await user.save();
    
    clearRateLimit(RESET_PASSWORD_RATE_LIMIT_SCOPE, rateLimitKey);
    
    logger.info({ userId: user.id }, "User password successfully reset via token");

    return NextResponse.json(
      { message: "Password updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ error }, "Error in reset password flow");
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
