/**
 * TEC-155 MEDIUM-2 — token storage posture:
 * - no token is ever written to localStorage
 * - the refresh cookie rides `credentials: "include"` on /api/auth/*
 * - the session shape strips refresh_token from JS-reachable state
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/api")>();
  return { ...mod, apiFetch: vi.fn() };
});

import {
  login,
  logout,
  purgeLegacySession,
  refreshSession,
  sessionTokens,
} from "@/lib/auth";
import type { TokenPair } from "@/lib/auth";

const pair: TokenPair = {
  access_token: "at-1",
  refresh_token: "rt-1",
  token_type: "bearer",
  expires_in: 1800,
};

const mockedFetch = vi.mocked(apiFetch);

beforeEach(() => {
  mockedFetch.mockReset();
  localStorage.clear();
});

describe("purgeLegacySession", () => {
  it("removes the pre-MEDIUM-2 persisted session key", () => {
    localStorage.setItem("bloom.admin.session", '{"tokens":{}}');
    purgeLegacySession();
    expect(localStorage.getItem("bloom.admin.session")).toBeNull();
  });
});

describe("sessionTokens", () => {
  it("strips the refresh token from what app state can hold", () => {
    const t = sessionTokens(pair);
    expect(t).toEqual({
      access_token: "at-1",
      token_type: "bearer",
      expires_in: 1800,
    });
    expect("refresh_token" in t).toBe(false);
  });
});

describe("credential transport", () => {
  it("login sends credentials:include and writes nothing to localStorage", async () => {
    mockedFetch.mockResolvedValue({ status: 200, data: { user: {}, tokens: pair } });
    await login("a@b.c", "pw");
    expect(mockedFetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(localStorage.length).toBe(0);
    expect(localStorage.getItem("bloom.admin.session")).toBeNull();
  });

  it("refreshSession posts an empty body with the cookie and returns tokens", async () => {
    mockedFetch.mockResolvedValue({
      status: 200,
      data: { access_token: "at-2", token_type: "bearer", expires_in: 1800 },
    });
    const tokens = await refreshSession();
    expect(mockedFetch).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({
        method: "POST",
        body: {},
        credentials: "include",
        headers: { "X-Bloom-Auth": "1" },
      }),
    );
    expect(tokens?.access_token).toBe("at-2");
  });

  it("refreshSession returns null when the cookie session is gone", async () => {
    mockedFetch.mockRejectedValue(new ApiError("Invalid refresh token", 401));
    expect(await refreshSession()).toBeNull();
  });

  it("logout posts an empty body with the cookie", async () => {
    mockedFetch.mockResolvedValue({ status: 204, data: null });
    await logout();
    expect(mockedFetch).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        body: {},
        credentials: "include",
        headers: { "X-Bloom-Auth": "1" },
      }),
    );
  });
});
