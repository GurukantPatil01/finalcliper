import { describe, expect, test } from "bun:test";
import { isTokenExpired, shouldRefreshToken, toDateKey, TOKEN_REFRESH_WINDOW_MS } from "../token";

const DAY = 24 * 60 * 60 * 1000;

describe("shouldRefreshToken", () => {
	test("true inside the 7-day window", () => {
		const now = 1_000_000_000_000;
		expect(shouldRefreshToken(now + 6 * DAY, now)).toBe(true);
		expect(shouldRefreshToken(now + TOKEN_REFRESH_WINDOW_MS - 1, now)).toBe(true);
	});

	test("false well before the window", () => {
		const now = 1_000_000_000_000;
		expect(shouldRefreshToken(now + 30 * DAY, now)).toBe(false);
	});

	test("false when expiry is unknown", () => {
		expect(shouldRefreshToken(null)).toBe(false);
		expect(shouldRefreshToken(undefined)).toBe(false);
	});

	test("true when already expired", () => {
		const now = 1_000_000_000_000;
		expect(shouldRefreshToken(now - DAY, now)).toBe(true);
	});
});

describe("isTokenExpired", () => {
	test("boundary", () => {
		const now = 1_000_000_000_000;
		expect(isTokenExpired(now, now)).toBe(true);
		expect(isTokenExpired(now + 1, now)).toBe(false);
		expect(isTokenExpired(null)).toBe(false);
	});
});

describe("toDateKey", () => {
	test("formats local YYYY-MM-DD with padding", () => {
		expect(toDateKey(new Date(2026, 7, 9))).toBe("2026-08-09");
		expect(toDateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
	});
});
