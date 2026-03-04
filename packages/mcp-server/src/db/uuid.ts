/**
 * UUIDv7 generation — embeds millisecond timestamp for natural ordering.
 * Spec §2.6.4: used for event_id and edge_id PKs.
 */
export function generateUUIDv7(): string {
  const now = Date.now();
  const bytes = new Uint8Array(16);

  // Timestamp (48 bits = 6 bytes)
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;

  // Random bytes for the rest
  crypto.getRandomValues(bytes.subarray(6));

  // Set version 7 (0111xxxx in byte 6)
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // Set variant (10xxxxxx in byte 8)
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
