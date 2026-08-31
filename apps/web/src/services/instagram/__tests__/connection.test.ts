import { describe, expect, test, beforeEach } from "bun:test";
import {
	getInstagramConnection,
	saveInstagramConnection,
	clearInstagramConnection,
	isInstagramConnected,
	getInstagramAccessToken,
	type InstagramConnection,
} from "../connection";
import { loadUserApiKeys, saveUserApiKeys } from "@/services/api-keys/storage";

class MockStorage implements Storage {
	private store = new Map<string, string>();
	get length() {
		return this.store.size;
	}
	clear() {
		this.store.clear();
	}
	getItem(key: string): string | null {
		return this.store.get(key) ?? null;
	}
	key(index: number): string | null {
		return Array.from(this.store.keys())[index] ?? null;
	}
	removeItem(key: string): void {
		this.store.delete(key);
	}
	setItem(key: string, value: string): void {
		this.store.set(key, String(value));
	}
}

describe("InstagramConnection storage and helpers", () => {
	beforeEach(() => {
		(globalThis as unknown as { localStorage: Storage }).localStorage = new MockStorage();
		saveUserApiKeys({});
	});

	test("returns null when not connected", () => {
		expect(getInstagramConnection()).toBeNull();
		expect(isInstagramConnected()).toBe(false);
		expect(getInstagramAccessToken()).toBeNull();
	});

	test("saves and retrieves connection", () => {
		const conn: InstagramConnection = {
			accessToken: "test-token-123",
			expiresAt: Date.now() + 60 * 86400000,
			userId: "1784140000",
			username: "creator_test",
		};

		saveInstagramConnection(conn);

		const retrieved = getInstagramConnection();
		expect(retrieved).toEqual(conn);
		expect(isInstagramConnected()).toBe(true);
		expect(getInstagramAccessToken()).toBe("test-token-123");
	});

	test("clears connection", () => {
		const conn: InstagramConnection = {
			accessToken: "test-token-123",
			expiresAt: Date.now() + 60 * 86400000,
			userId: "1784140000",
		};
		saveInstagramConnection(conn);
		expect(isInstagramConnected()).toBe(true);

		clearInstagramConnection();
		expect(getInstagramConnection()).toBeNull();
		expect(isInstagramConnected()).toBe(false);
	});

	test("migrates legacy analytics token automatically", () => {
		saveUserApiKeys({
			instagramAnalyticsToken: "legacy-token",
			instagramAnalyticsTokenExpiresAt: Date.now() + 100000,
			instagramAnalyticsUserId: "legacy-user-id",
		});

		const conn = getInstagramConnection();
		expect(conn).not.toBeNull();
		expect(conn?.accessToken).toBe("legacy-token");
		expect(conn?.userId).toBe("legacy-user-id");
	});

	test("marks expired connection as not connected", () => {
		const expiredConn: InstagramConnection = {
			accessToken: "expired-token",
			expiresAt: Date.now() - 1000,
			userId: "1784140000",
		};
		saveInstagramConnection(expiredConn);

		expect(isInstagramConnected()).toBe(false);
		expect(getInstagramAccessToken()).toBeNull();
	});
});
