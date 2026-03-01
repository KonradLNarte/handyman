/**
 * Phone number normalization for Swedish mobile numbers.
 * Converts various formats to E.164: +46XXXXXXXXX
 */

/**
 * Normalizes a phone number to E.164 format (+46XXXXXXXXX for Swedish numbers).
 * Strips whitespace, dashes, and parentheses.
 * Converts local Swedish format (0XX) to international (+46XX).
 * Throws if the result is not a valid E.164 number.
 */
export function normalizePhoneNumber(raw: string): string {
  // Strip whitespace, dashes, parentheses, dots
  let cleaned = raw.replace(/[\s\-().]/g, "");

  // Handle Swedish local numbers: 07XXXXXXXX → +467XXXXXXXX
  if (cleaned.startsWith("0") && !cleaned.startsWith("00")) {
    cleaned = "+46" + cleaned.slice(1);
  }

  // Handle 46XXXXXXXXX without + prefix
  if (cleaned.startsWith("46") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  // Must start with + now
  if (!cleaned.startsWith("+")) {
    throw new Error(`Invalid phone number format: ${raw}`);
  }

  // Validate E.164: + followed by 7-15 digits
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  if (!e164Regex.test(cleaned)) {
    throw new Error(`Invalid E.164 phone number: ${cleaned} (from: ${raw})`);
  }

  // Extra validation for Swedish numbers: +46 followed by 9 digits
  if (cleaned.startsWith("+46")) {
    const digits = cleaned.slice(3);
    if (digits.length !== 9) {
      throw new Error(
        `Invalid Swedish mobile number: expected 9 digits after +46, got ${digits.length} (from: ${raw})`
      );
    }
  }

  return cleaned;
}
