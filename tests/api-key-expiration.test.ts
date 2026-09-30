import assert from "node:assert/strict";
import { test } from "node:test";
import { keyExpiresInSeconds } from "../examples/nextjs/api-key-expiration.js";

const now = new Date("2026-09-30T00:00:00.000Z");
const day = 24 * 60 * 60;

test("API key presets use seconds", () => {
  assert.equal(keyExpiresInSeconds(30, now), 30 * day);
  assert.equal(keyExpiresInSeconds(60, now), 60 * day);
  assert.equal(keyExpiresInSeconds(90, now), 90 * day);
  assert.throws(() => keyExpiresInSeconds(45 as 30, now));
});

test("custom date uses the chosen local calendar day's end", () => {
  const expected = Math.ceil(
    (new Date("2026-10-30T23:59:59.999").getTime() - now.getTime()) / 1000,
  );
  assert.equal(keyExpiresInSeconds("2026-10-30", now), expected);
});

test("custom dates must be 1 to 365 days in the future", () => {
  assert.equal(keyExpiresInSeconds(new Date(now.getTime() + 2 * day * 1000), now), 2 * day);
  assert.throws(() => keyExpiresInSeconds(new Date(now.getTime() + 23 * 60 * 60 * 1000), now));
  assert.throws(() => keyExpiresInSeconds(new Date(now.getTime() + 366 * day * 1000), now));
  assert.throws(() => keyExpiresInSeconds("invalid", now));
});
