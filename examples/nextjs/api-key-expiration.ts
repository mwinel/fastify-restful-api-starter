const DAY_SECONDS = 24 * 60 * 60;
export type KeyExpiration = 30 | 60 | 90 | Date | string;

// Calendar dates use the end of the selected day in the user's local timezone.
// ISO timestamps with a timezone and Date objects keep their exact instant.
export function keyExpiresInSeconds(expiration: KeyExpiration, now = new Date()): number {
  if (typeof expiration === "number") {
    if (![30, 60, 90].includes(expiration)) throw new Error("Choose 30, 60, or 90 days");
    return expiration * DAY_SECONDS;
  }
  const target =
    typeof expiration === "string" && /^\d{4}-\d{2}-\d{2}$/.test(expiration)
      ? new Date(`${expiration}T23:59:59.999`)
      : new Date(expiration);
  const seconds = Math.ceil((target.getTime() - now.getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < DAY_SECONDS || seconds > 365 * DAY_SECONDS) {
    throw new Error("Expiration must be between 1 and 365 days from now");
  }
  return seconds;
}
