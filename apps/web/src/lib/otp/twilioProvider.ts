/**
 * Twilio-backed OTP provider — WhatsApp first, SMS fallback.
 *
 * Why Twilio:
 *   - One vendor, two channels (WhatsApp Business API + SMS).
 *   - Works in Pakistan (PK numbers in `+92` format).
 *   - Dead simple HTTP API; no SDK lock-in (we use plain `fetch`).
 *
 * How delivery works:
 *   1. Try WhatsApp via the `whatsapp:` channel using `TWILIO_WHATSAPP_FROM`.
 *   2. If WhatsApp fails (network error, customer never opted in, no
 *      session window), fall back to SMS via `TWILIO_SMS_FROM`.
 *   3. If both fail we throw — the OTP service treats that as a delivery
 *      hiccup, the customer can request another code.
 *
 * Required env vars (all production providers):
 *   - `TWILIO_ACCOUNT_SID`
 *   - `TWILIO_AUTH_TOKEN`
 *   - `TWILIO_WHATSAPP_FROM`  (e.g. "whatsapp:+14155238886")
 *   - `TWILIO_SMS_FROM`       (e.g. "+12025550141" — must be SMS-capable)
 *
 * Optional:
 *   - `OTP_DISABLE_WHATSAPP=1`  → skip WhatsApp, go straight to SMS.
 *   - `OTP_DISABLE_SMS=1`       → WhatsApp only (testing).
 *
 * Phone format: callers pass raw user input. We normalise to E.164 using
 * the `phoneFingerprint` (last 10 digits, PK-mobile) and prepend `+92`.
 */

import type { OtpDeliveryRequest, OtpProvider } from "@/lib/otp/provider";
import { FIELD_LIMITS, logger, phoneFingerprint } from "@store/shared";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";
/** Hard upper bound on a single Twilio HTTP call so a hung connection cannot
 *  delay an OTP request beyond a few seconds. */
const TWILIO_REQUEST_TIMEOUT_MS = 10_000;

class TwilioDeliveryError extends Error {
  constructor(
    public channel: "whatsapp" | "sms",
    public status: number,
    public body: string,
  ) {
    super(
      `Twilio ${channel} delivery failed (HTTP ${status}): ${body.slice(0, FIELD_LIMITS.providerErrorPreview)}`,
    );
  }
}

/**
 * Convert any user-typed PK number to E.164 (`+923XXXXXXXXX`). Returns null
 * if we can't form a valid 10-digit mobile portion.
 */
function toPakistaniE164(raw: string): string | null {
  const fingerprint = phoneFingerprint(raw);
  if (!fingerprint) {
    return null;
  }
  // PK mobile numbers are 10 digits beginning with 3 — anything else is
  // probably a landline or typo, refuse it.
  if (!fingerprint.startsWith("3")) {
    return null;
  }
  return `+92${fingerprint}`;
}

function buildMessageBody(
  code: string,
  expiresInMinutes: number,
  brand: string,
): string {
  return [
    `Your ${brand} verification code is ${code}.`,
    `It expires in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.`,
    "Do not share this code with anyone.",
  ].join("\n");
}

interface TwilioSendInput {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  body: string;
  channel: "whatsapp" | "sms";
}

async function sendViaTwilio(input: TwilioSendInput): Promise<void> {
  const params = new URLSearchParams({
    From: input.from,
    To: input.to,
    Body: input.body,
  });

  const url = `${TWILIO_API_BASE}/Accounts/${input.accountSid}/Messages.json`;
  const auth = Buffer.from(`${input.accountSid}:${input.authToken}`).toString("base64");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new TwilioDeliveryError(input.channel, 0, String(error));
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new TwilioDeliveryError(input.channel, response.status, text);
  }
}

class TwilioOtpProvider implements OtpProvider {
  readonly id = "twilio";
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly whatsAppFrom: string | null;
  private readonly smsFrom: string | null;

  constructor(env: NodeJS.ProcessEnv) {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error(
        "TwilioOtpProvider requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.",
      );
    }
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.whatsAppFrom =
      env.OTP_DISABLE_WHATSAPP === "1" ? null : env.TWILIO_WHATSAPP_FROM ?? null;
    this.smsFrom =
      env.OTP_DISABLE_SMS === "1" ? null : env.TWILIO_SMS_FROM ?? null;
    if (!this.whatsAppFrom && !this.smsFrom) {
      throw new Error(
        "TwilioOtpProvider needs at least one of TWILIO_WHATSAPP_FROM / TWILIO_SMS_FROM (or both).",
      );
    }
  }

  async send(request: OtpDeliveryRequest): Promise<void> {
    const e164 = toPakistaniE164(request.phoneRaw);
    if (!e164) {
      throw new Error(
        `Refusing to send OTP — "${request.phoneRaw}" is not a valid Pakistani mobile number.`,
      );
    }
    const body = buildMessageBody(
      request.code,
      request.expiresInMinutes,
      request.brand,
    );

    let whatsAppError: unknown = null;

    // 1. Try WhatsApp first if configured.
    if (this.whatsAppFrom) {
      try {
        await sendViaTwilio({
          accountSid: this.accountSid,
          authToken: this.authToken,
          from: this.whatsAppFrom,
          to: `whatsapp:${e164}`,
          body,
          channel: "whatsapp",
        });
        logger.info(
          { phoneFingerprint: request.phoneFingerprint, channel: "whatsapp" },
          "OTP delivered",
        );
        return;
      } catch (error) {
        whatsAppError = error;
        logger.warn(
          {
            phoneFingerprint: request.phoneFingerprint,
            error: error instanceof Error ? error.message : String(error),
          },
          "OTP WhatsApp delivery failed — falling back to SMS",
        );
      }
    }

    // 2. SMS fallback.
    if (this.smsFrom) {
      await sendViaTwilio({
        accountSid: this.accountSid,
        authToken: this.authToken,
        from: this.smsFrom,
        to: e164,
        body,
        channel: "sms",
      });
      logger.info(
        { phoneFingerprint: request.phoneFingerprint, channel: "sms" },
        "OTP delivered",
      );
      return;
    }

    // No fallback configured and WhatsApp failed — re-raise.
    throw whatsAppError instanceof Error
      ? whatsAppError
      : new Error("OTP delivery failed: no usable channel.");
  }
}

/**
 * Construct a Twilio provider from environment variables. Returns null if
 * the env isn't configured (so the caller can fall back to the dev
 * console provider). The provider is constructed lazily so a missing
 * Twilio key doesn't crash the app on import.
 */
export function createTwilioOtpProviderFromEnv(): OtpProvider | null {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  try {
    return new TwilioOtpProvider(process.env);
  } catch (error) {
    logger.error({ error }, "Twilio OTP provider could not be initialised");
    return null;
  }
}

