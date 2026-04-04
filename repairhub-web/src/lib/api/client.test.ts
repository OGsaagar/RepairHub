import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "./client";
import { clearStoredSession, useAuthStore } from "../../state/auth-store";

describe("fetchJson auth refresh", () => {
  beforeEach(() => {
    useAuthStore.setState({
      role: "customer",
      user: {
        id: "customer-1",
        email: "customer@example.com",
        first_name: "Elena",
        last_name: "Adeyemi",
        role: "customer",
        profile_status: "active",
      },
      accessToken: "stale-access-token",
      refreshToken: "valid-refresh-token",
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearStoredSession();
    localStorage.clear();
  });

  it("refreshes the access token and retries the request once", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Given token not valid for any token type" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access: "fresh-access-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const result = await fetchJson<{ ok: boolean }>("/protected/", { auth: true });

    expect(result.ok).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe("fresh-access-token");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
