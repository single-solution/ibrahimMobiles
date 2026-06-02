import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB, User } from "@store/db";
import { logger } from "@store/shared";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    await connectDB();
    const user = await User.findOne({ email: normalizedEmail, isActive: true });

    // We still return 200 OK even if the user doesn't exist to prevent email enumeration
    if (!user) {
      logger.info({ email: normalizedEmail }, "Forgot password requested for non-existent or inactive user");
      return NextResponse.json(
        { message: "If an account exists, a reset link has been generated." },
        { status: 200 }
      );
    }

    // Generate a cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    // Hash it before storing in DB (so a DB leak doesn't expose usable tokens)
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiresAt = expiresAt;
    await user.save();

    // In a real application, you would send an email here using an SMTP service like Resend, Sendgrid, etc.
    // For now, since there's no email infrastructure, we will log the link directly to the console so the admin can copy it.
    // This is a development/testing fallback.
    const resetLink = `${new URL(request.url).origin}/login/reset-password?token=${rawToken}`;
    
    logger.info(
      { userId: user.id, email: user.email }, 
      `\n\n========================================================\nPASSWORD RESET LINK GENERATED\nIn production, this would be emailed to the user.\nLink: ${resetLink}\n========================================================\n\n`
    );

    return NextResponse.json(
      { message: "If an account exists, a reset link has been generated. Since email isn't configured, check the server console for the link." },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ error }, "Error in forgot password flow");
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
