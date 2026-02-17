
export type ApiJsonValue = Record<string, unknown> | unknown[];

export interface ApiResponseShape {
  success?: boolean;
  message?: string;
  data?: unknown;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type ApiRow = Record<string, unknown>;
