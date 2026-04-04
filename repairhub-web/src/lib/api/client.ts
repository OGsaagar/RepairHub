import type { AuthTokens, AuthUser } from "../auth/auth-types";
import { clearStoredSession, getAccessToken, getRefreshToken, setAccessToken } from "../../state/auth-store";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

export type RepairAnalysisPayload = {
  damage_type: string;
  severity: string;
  confidence: number;
  summary: string;
  replace_cost: number;
  waste_saved_kg: number;
  estimated_min_cost: number;
  estimated_max_cost: number;
  estimated_hours: number;
};

export type RepairRequestPayload = {
  id: string;
  item_name: string;
  issue_description: string;
  urgency: "standard" | "urgent" | "flexible";
  pickup_preference: "dropoff" | "pickup" | "onsite";
  status: string;
  category_name: string | null;
  estimated_min_cost: number;
  estimated_max_cost: number;
  estimated_hours: number;
};

export type RepairRequestMatch = {
  id: string;
  repairer: string;
  repairer_name: string;
  repairer_city: string;
  repairer_rating: string;
  reviews_count: number;
  service: string;
  service_title: string;
  service_description: string;
  warranty_days: number;
  score: string;
  distance_km: string;
  quote_amount: string;
  eta_hours: number;
  ranking_reason: string;
  selected: boolean;
};

export type SignedUploadResponse = {
  cloud_name: string | null;
  api_key: string | null;
  signature: string;
  params: {
    timestamp: string;
    folder: string;
  };
};

export type BookingPayload = {
  id: string;
  repair_request: string;
  repairer: string;
  scheduled_for: string | null;
  notes: string;
  subtotal_amount: string;
  platform_fee_amount: string;
  total_amount: string;
  payment_status: string;
};

type FetchOptions = RequestInit & {
  auth?: boolean;
  retryOnAuthFailure?: boolean;
};

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    if (typeof payload.detail === "string") {
      return payload.detail;
    }

    const firstFieldError = Object.values(payload)[0];
    if (typeof firstFieldError === "string") {
      return firstFieldError;
    }

    if (Array.isArray(firstFieldError) && typeof firstFieldError[0] === "string") {
      return firstFieldError[0];
    }
  } catch {
    return null;
  }

  return null;
}

function buildHeaders(init: FetchOptions) {
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (init.auth) {
    const accessToken = getAccessToken();
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  return headers;
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { access?: string };
  if (!payload.access) {
    return null;
  }

  setAccessToken(payload.access);
  return payload.access;
}

export async function fetchJson<T>(path: string, init: FetchOptions = {}): Promise<T> {
  const { auth = false, retryOnAuthFailure = true, ...requestInit } = init;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    headers: buildHeaders({ ...requestInit, auth }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    const shouldTryRefresh =
      auth &&
      retryOnAuthFailure &&
      response.status === 401 &&
      typeof message === "string" &&
      message.toLowerCase().includes("token");

    if (shouldTryRefresh) {
      const refreshedAccessToken = await refreshAccessToken();
      if (refreshedAccessToken) {
        return fetchJson<T>(path, {
          ...init,
          retryOnAuthFailure: false,
        });
      }

      clearStoredSession();
      throw new Error("Your session expired. Please sign in again.");
    }

    throw new Error(message ?? `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  register: (payload: unknown) => fetchJson<AuthUser>("/auth/register/", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: unknown) => fetchJson<AuthTokens>("/auth/login/", { method: "POST", body: JSON.stringify(payload) }),
  refresh: (payload: unknown) => fetchJson("/auth/refresh/", { method: "POST", body: JSON.stringify(payload) }),
  getProfile: (accessToken: string) =>
    fetchJson<AuthUser>("/auth/me/", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  getSignedUpload: (payload: { timestamp: string; folder: string }) =>
    fetchJson<SignedUploadResponse>("/uploads/signed/", {
      method: "POST",
      body: JSON.stringify(payload),
      auth: true,
    }),
  createRepairRequest: (payload: unknown) =>
    fetchJson<RepairRequestPayload>("/repair-requests/", {
      method: "POST",
      body: JSON.stringify(payload),
      auth: true,
    }),
  analyzeRepairRequest: (id: string) =>
    fetchJson<{ repair_request: RepairRequestPayload; analysis: RepairAnalysisPayload }>(`/repair-requests/${id}/analyze/`, {
      method: "POST",
      auth: true,
    }),
  getRepairMatches: (id: string) =>
    fetchJson<RepairRequestMatch[]>(`/repair-requests/${id}/matches/`, {
      auth: true,
    }),
  createBooking: (payload: unknown) =>
    fetchJson<BookingPayload>("/bookings/", {
      method: "POST",
      body: JSON.stringify(payload),
      auth: true,
    }),
  getClientSummary: () => fetchJson("/repairs/client-summary/", { auth: true }),
  getRepairerSummary: () => fetchJson("/repairs/repairer-summary/", { auth: true }),
};
