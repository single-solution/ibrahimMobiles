/**
 * Pakistan phone-number normalisation helpers.
 *
 * Customers enter phone numbers in many forms — "+92 320 4862403",
 * "0320-4862403", "923204862403", etc. We don't enforce a single format on
 * input (it would frustrate users) but we *do* need a canonical form for
 * comparing two numbers — e.g. matching an order's snapshot phone with the
 * one a tracker types in.
 *
 * Strategy: keep the trailing 10 digits ("3204862403"). That's the unique
 * mobile portion in PK and is robust to any common prefix (`+92`, `92`,
 * `0`).
 */

/**
 * Pakistan mobile numbers always end in a 10-digit subscriber portion.
 * The `+92`, `92`, or leading `0` are interchangeable prefixes that we
 * strip when computing identity.
 */
const PK_MOBILE_DIGITS = 10;

/** Strip every non-digit character from `input` and return the remainder. */
function digitsOnly(input: string): string {
  return input.replace(/\D+/g, "");
}

/**
 * Returns the last 10 digits of the provided string, or `null` if there
 * aren't 10 digits available. Use this as the canonical phone identity.
 */
export function phoneFingerprint(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }
  const digits = digitsOnly(input);
  if (digits.length < PK_MOBILE_DIGITS) {
    return null;
  }
  return digits.slice(-PK_MOBILE_DIGITS);
}

/**
 * True if two raw phone strings reference the same number, even when one
 * is "+92 320 4862403" and the other is "0320-4862403".
 */
export function sameNumber(
	first: string | null | undefined,
	second: string | null | undefined,
): boolean {
	const firstFingerprint = phoneFingerprint(first);
	const secondFingerprint = phoneFingerprint(second);
	return Boolean(
		firstFingerprint && secondFingerprint && firstFingerprint === secondFingerprint,
	);
}
