import { describe, expect, test } from "bun:test";
import { buildAuthorizeUrl, verifyState, verifyAndExtractState } from "../oauth";

const APP = { appId: "1234", appSecret: "shhh", redirectUri: "http://localhost:3000/api/instagram/oauth/callback" };

describe("buildAuthorizeUrl", () => {
	test("contains client id, redirect, scopes and a state", () => {
		const url = new URL(buildAuthorizeUrl({ ...APP, now: 1_000_000 }));
		expect(url.origin + url.pathname).toBe("https://www.instagram.com/oauth/authorize");
		expect(url.searchParams.get("client_id")).toBe("1234");
		expect(url.searchParams.get("redirect_uri")).toBe(APP.redirectUri);
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("scope")).toBe(
			"instagram_business_basic,instagram_business_manage_insights,instagram_business_content_publish",
		);
		expect(url.searchParams.get("state")).toMatch(/^\d+\.[0-9a-f]{64}$/);
	});

	test("encodes returnTo in state when provided", () => {
		const url = new URL(buildAuthorizeUrl({ ...APP, returnTo: "/editor", now: 1_000_000 }));
		expect(url.searchParams.get("state")).toMatch(/^\d+\.[A-Za-z0-9_-]+\.[0-9a-f]{64}$/);
	});

	test("state is fresh per call", () => {
		const a = new URL(buildAuthorizeUrl({ ...APP, now: 1_000_000 })).searchParams.get("state");
		const b = new URL(buildAuthorizeUrl({ ...APP, now: 2_000_000 })).searchParams.get("state");
		expect(a).not.toBe(b);
	});
});

describe("verifyState and verifyAndExtractState", () => {
	const now = 10_000_000;
	const standardState = new URL(buildAuthorizeUrl({ ...APP, now })).searchParams.get("state");
	const returnToState = new URL(buildAuthorizeUrl({ ...APP, returnTo: "/editor", now })).searchParams.get("state");

	test("accepts a freshly minted state", () => {
		expect(verifyState(standardState, APP.appSecret, now + 1000)).toBe(true);
		const result = verifyAndExtractState(standardState, APP.appSecret, now + 1000);
		expect(result.valid).toBe(true);
		expect(result.returnTo).toBeUndefined();
	});

	test("accepts and extracts returnTo from state", () => {
		expect(verifyState(returnToState, APP.appSecret, now + 1000)).toBe(true);
		const result = verifyAndExtractState(returnToState, APP.appSecret, now + 1000);
		expect(result.valid).toBe(true);
		expect(result.returnTo).toBe("/editor");
	});

	test("rejects expired state (>10 minutes)", () => {
		expect(verifyState(standardState, APP.appSecret, now + 11 * 60 * 1000)).toBe(false);
		expect(verifyState(returnToState, APP.appSecret, now + 11 * 60 * 1000)).toBe(false);
	});

	test("rejects a wrong secret", () => {
		expect(verifyState(standardState, "wrong-secret", now + 1000)).toBe(false);
		expect(verifyState(returnToState, "wrong-secret", now + 1000)).toBe(false);
	});

	test("rejects tampered payloads", () => {
		expect(verifyState("999.bad", APP.appSecret, now)).toBe(false);
		expect(verifyState("999.bad.fake", APP.appSecret, now)).toBe(false);
		expect(verifyState(null, APP.appSecret, now)).toBe(false);
		expect(verifyState("nodot", APP.appSecret, now)).toBe(false);
	});
});
