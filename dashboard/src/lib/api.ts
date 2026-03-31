import axios from "axios";
import { getApiKey } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const key = getApiKey();
  if (key) {
    config.headers.Authorization = `Bearer ${key}`;
  }
  return config;
});

export interface AuditEntry {
  id: string;
  repo: string;
  environment: string;
  branch: string | null;
  triggered_by: string | null;
  window_id: string | null;
  window_name: string | null;
  outcome: "allowed" | "blocked" | "warn" | "overridden";
  reason: string;
  override_by: string | null;
  created_at: string;
}

export interface AuditResponse {
  total: number;
  limit: number;
  offset: number;
  data: AuditEntry[];
}

export interface ApiKey {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface OverrideToken {
  token: string;
  expires_at: string;
}

export const auditApi = {
  list: (params: {
    repo?: string;
    environment?: string;
    outcome?: string;
    limit?: number;
    offset?: number;
  }) => api.get<AuditResponse>("/v1/audit", { params }),
};

export const overrideApi = {
  issue: (body: {
    window_id: string;
    approved_by: string;
    expires_in_minutes?: number;
  }) => api.post<OverrideToken>("/v1/overrides/issue", body),
};
