import type { Organization, Charger, User, SelectOption } from "@/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://dash.evse.cloud/api";
const AUTH_API_BASE_URL = import.meta.env.VITE_AUTH_API_BASE_URL || API_BASE_URL;
const API_BASE_URL_NORM = String(API_BASE_URL).replace(/\/+$/, "");
const ORG_BASE_URL = API_BASE_URL_NORM.endsWith("/v4/org")
  ? API_BASE_URL_NORM
  : `${API_BASE_URL_NORM}/v4/org`;
const AUTH_STORAGE_KEY = "ion_token";
export const getAuthToken = (): string | null =>
  typeof localStorage !== "undefined" ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
export const setAuthToken = (token: string | null): void => {
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(AUTH_STORAGE_KEY, token);
  else localStorage.removeItem(AUTH_STORAGE_KEY);
};

type JsonValue = Record<string, any> | any[];

const authHeaders = (init?: RequestInit): Headers => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
};
const appFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
  fetch(input, { ...init, headers: authHeaders(init) });

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    user_id: number;
    organization_id: number | null;
    mobile: string;
    role_name: string;
    first_name?: string;
    last_name?: string;
    f_name?: string;
    l_name?: string;
    email?: string;
    profile_img_url?: string | null;
  };
  permissions?: string[] | Record<string, string> | { code: string; access: string }[];
  message?: string;
}
export const loginApi = async (identifier: string, password: string): Promise<LoginResponse> => {
  const id = (identifier ?? "").toString().trim();
  const body = id.includes("@") ? { email: id, password } : { mobile: id, password };
  const res = await fetch(`${AUTH_API_BASE_URL}/v4/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!text?.trim()) throw new Error("Empty response from server");
  let data: LoginResponse & { message?: string };
  try {
    data = JSON.parse(text) as LoginResponse & { message?: string };
  } catch {
    throw new Error("Invalid response from server");
  }
  if (!res.ok) throw new Error(data?.message || "Login failed");
  if (data?.success === false) throw new Error(data?.message || "Invalid email or password");
  return data;
};
export const getMeApi = async (): Promise<LoginResponse> => {
  const res = await appFetch(`${AUTH_API_BASE_URL}/v4/auth/me`, { method: "GET" });
  const data = (await res.json()) as LoginResponse & { message?: string };
  if (!res.ok) throw new Error(data?.message || "Unauthorized");
  return data;
};

export const updateProfileApi = async (payload: { f_name?: string; l_name?: string; email?: string }): Promise<{ success: boolean; message?: string }> => {
  const res = await appFetch(`${AUTH_API_BASE_URL}/v4/auth/profile`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok) throw new Error(data?.message || "Failed to update profile");
  return { success: true, message: data?.message };
};

const NOTIFICATION_ENDPOINTS = [
  "/v4/notifications",
  "/v4/dashboard/notifications",
  "/v4/charger/notifications",
] as const;

const NOTIFICATIONS_PATH = (import.meta.env.VITE_NOTIFICATIONS_PATH as string | undefined)?.trim();

export const fetchChargerNotifications = async (params?: { since?: number }): Promise<{ id?: string; timestamp?: number; chargerId?: string }[]> => {
  const query = params?.since != null ? `?since=${params.since}` : "";
  const paths = NOTIFICATIONS_PATH ? [NOTIFICATIONS_PATH] : [...NOTIFICATION_ENDPOINTS];
  for (const path of paths) {
    try {
      const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}${query}`;
      const res = await appFetch(url);
      if (res.status === 404) continue;
      if (res.status === 204) return [];
      const data = await res.json();
      if (Array.isArray(data)) return data;
      const list = (data as any)?.data ?? (data as any)?.notifications ?? [];
      return Array.isArray(list) ? list : [];
    } catch {
      continue;
    }
  }
  return [];
};

const requestJson = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<JsonValue>;
};

const safeParseResponse = async (res: Response): Promise<Record<string, unknown>> => {
  const text = await res.text();
  if (!text?.trim()) return {};
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) throw new Error(`Server returned HTML (${res.status}), expected JSON`);
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return { message: trimmed.slice(0, 200) };
  }
};

// Helper function to extract data from Node-RED API response format
// Response format: { success: true, count: 2, data: [...] }
// Or: { success: false, message: "..." }
// Or: [] (204 No Content)
const extractDataFromResponse = (response: any): any[] => {
  // Handle 204 No Content (empty array)
  if (response === null || response === undefined) {
    return [];
  }
  
  // If response is already an array, return it
  if (Array.isArray(response)) {
    return response;
  }
  
  // If response has success: false, return empty array
  if (response.success === false) {
    console.warn("API returned error:", response.message);
    return [];
  }
  
  // If response has data, return it (array or single object)
  if (response && typeof response === "object" && "data" in response) {
    if (Array.isArray(response.data)) return response.data;
    if (response.data && typeof response.data === "object") return [response.data];
  }
  
  // If response is a single object, wrap it in array
  if (response && typeof response === "object" && !Array.isArray(response)) {
    return [response];
  }
  
  return [];
};

const normalizeOptions = (rows: any[] = []): SelectOption[] => {
  const mapped = rows
    .map((row) => ({
      value: String(
        row.value ??
          row.id ??
          row.location_id ??
          row.charger_id ??
          row.connector_id ??
          row.tariff_id ??
          row.organization_id ??
          row.chargerID ??
          ""
      ),
      label: String(row.label ?? row.name ?? row.Name ?? row.location_name ?? ""),
    }))
    .filter((opt) => opt.value && opt.label);

  // Ensure stable unique values for Select components (Radix requires unique values,
  // and React keys must be unique).
  const seen = new Set<string>();
  return mapped.filter((opt) => {
    if (seen.has(opt.value)) return false;
    seen.add(opt.value);
    return true;
  });
};

const rbacHeaders = (init?: RequestInit): Headers => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const adminSecret = (import.meta.env.VITE_RBAC_ADMIN_SECRET as string | undefined)?.trim();
  if (adminSecret) {
    headers.set("X-Admin-Secret", adminSecret);
  } else {
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
};
const rbacFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
  fetch(input, { ...init, headers: rbacHeaders(init) });

export interface RbacPermission {
  id: number;
  code: string;
  description?: string;
}
export interface RbacRole {
  role_id: number;
  role_name: string;
}
export interface RolePermissionItem {
  code: string;
  access: "R" | "RW";
}
export const getRbacPermissions = async (): Promise<RbacPermission[]> => {
  const res = await rbacFetch(`${API_BASE_URL}/v4/rbac/permissions`);
  if (!res.ok) throw new Error("Failed to fetch permissions");
  const data = (await res.json()) as { success?: boolean; data?: RbacPermission[]; permissions?: RbacPermission[] };
  const list = data?.data ?? data?.permissions ?? [];
  return Array.isArray(list) ? list : [];
};
export const getRbacRoles = async (): Promise<RbacRole[]> => {
  const res = await rbacFetch(`${API_BASE_URL}/v4/rbac/roles`);
  if (!res.ok) throw new Error("Failed to fetch roles");
  const data = (await res.json()) as { success?: boolean; data?: RbacRole[]; roles?: RbacRole[] };
  const list = data?.data ?? data?.roles ?? [];
  return Array.isArray(list) ? list : [];
};
export const getRolePermissions = async (roleId: number): Promise<RolePermissionItem[]> => {
  const res = await rbacFetch(
    `${API_BASE_URL}/v4/rbac/roles/permissions?roleId=${encodeURIComponent(roleId)}`
  );
  if (!res.ok) throw new Error("Failed to fetch role permissions");
  const data = (await res.json()) as { success?: boolean; data?: RolePermissionItem[]; permissions?: RolePermissionItem[] };
  const list = data?.data ?? data?.permissions ?? [];
  return Array.isArray(list) ? list : [];
};
export const updateRolePermissions = async (
  roleId: number,
  permissions: Record<string, "R" | "RW"> | RolePermissionItem[]
): Promise<{ success: boolean; message?: string }> => {
  const body = Array.isArray(permissions)
    ? { permissions: Object.fromEntries(permissions.map((p) => [p.code, p.access])) }
    : { permissions };
  const res = await rbacFetch(
    `${API_BASE_URL}/v4/rbac/roles/permissions?roleId=${encodeURIComponent(roleId)}`,
    { method: "PUT", body: JSON.stringify(body) }
  );
  const data = (await res.json()) as { success?: boolean; message?: string };
  if (!res.ok) throw new Error(data?.message || "Failed to update role permissions");
  return { success: true, message: data?.message };
};

const mapChargerStatusRows = (rows: any[] = []): Charger[] =>
  rows.map((row) => ({
    name: String(row.Name ?? row.name ?? row.label ?? ""),
    id: String(row.ID ?? row.id ?? row.chargerID ?? row.charger_id ?? ""),
    time: String(row.Time ?? row.time ?? row.ocpi_last_update ?? ""),
    status: row.status,
    type: row.type,
    locationId: (row.locationId ?? row.location_id) ? String(row.locationId ?? row.location_id) : undefined,
  }));

export const fetchOrganizations = async (): Promise<Organization[]> => {
  try {
    // Try new Node-RED API endpoint first
    const url = ORG_BASE_URL;
    console.log("🔍 Fetching organizations from:", url);
    
    // IMPORTANT: don't send Content-Type on GET (it triggers CORS preflight)
    const response = await fetch(url);

    // Handle 204 No Content
    if (response.status === 204) {
      console.log("✅ No organizations found (204)");
      return [];
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Raw API response:", data);
    
    // Extract data from Node-RED response format
    const orgsArray = extractDataFromResponse(data);
    
    // Convert to Organization format
    return orgsArray.map((org: any) => ({
      id: String(org.id || org.organization_id || ''),
      name: String(org.name || ''),
      amount: Number(org.amount || 0),
      energy: Number(org.energy || 0),
    }));
  } catch (error) {
    console.error("❌ Error fetching organizations:", error);
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      console.error("❌ Cannot connect to backend API. Please check:");
      console.error(`   1. Is the API running at ${API_BASE_URL}?`);
      console.error("   2. Is the API endpoint correct?");
      console.error("   3. Check CORS settings in the backend");
      console.error("   4. Check network connectivity");
    }
    return [];
  }
};

export const createOrganization = async (
  orgData: Partial<Organization> & { organization_id?: string }
): Promise<{ success: boolean; message: string; insertId?: number }> => {
  try {
    const isUpdate = Boolean(orgData.organization_id);
    const url = isUpdate
      ? `${ORG_BASE_URL}?id=${encodeURIComponent(String(orgData.organization_id))}`
      : ORG_BASE_URL;
    const response = await appFetch(url, {
      method: isUpdate ? "PUT" : "POST",
      body: JSON.stringify(orgData),
    });

    const text = await response.text();
    let result: any = {};
    try {
      result = text?.trim() ? JSON.parse(text) : {};
    } catch {
      result = { message: text };
    }
    if (!response.ok) {
      throw new Error(result?.message || result?.error || `Failed to save organization (HTTP ${response.status})`);
    }
    return {
      success: true,
      message: result.message || "Organization saved successfully",
      insertId: result.insertId,
    };
  } catch (error) {
    console.error("Error saving organization:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const updateOrganization = async (
  id: number,
  orgData: Partial<Organization>
): Promise<{ success: boolean; message: string }> => {
  try {
    const url = `${ORG_BASE_URL}?id=${encodeURIComponent(String(id))}`;
    const response = await appFetch(url, {
      method: "PUT",
      body: JSON.stringify(orgData),
    });
    const data = await safeParseResponse(response);
    if (!response.ok) throw new Error((data?.message as string) || `Failed to update organization (HTTP ${response.status})`);
    return { success: true, message: (data?.message as string) || "Organization updated" };
  } catch (error) {
    console.error("Error updating organization:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const deleteOrganization = async (
  id: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const url = `${ORG_BASE_URL}?id=${encodeURIComponent(String(id))}`;
    const response = await appFetch(url, { method: "DELETE" });
    const text = await response.text();
    let data: any = {};
    try {
      data = text?.trim() ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }
    if (!response.ok) {
      throw new Error(data?.message || `Failed to delete organization (HTTP ${response.status})`);
    }
    return { success: true, message: data?.message || "Organization deleted successfully" };
  } catch (error) {
    console.error("Error deleting organization:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const fetchOrganization = async (
  id: number
): Promise<Organization | null> => {
  try {
    const url = `${ORG_BASE_URL}?id=${encodeURIComponent(String(id))}`;
    const response = await appFetch(url);
    if (response.status === 404 || !response.ok) return null;
    const data = await safeParseResponse(response);
    return data as unknown as Organization;
  } catch (error) {
    console.error("Error fetching organization:", error);
    return null;
  }
};

export const fetchOrganizationDetails = async (
  id: string
): Promise<{
  name: string;
  name_ar: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_phoneNumber: string;
  details: string;
} | null> => {
  try {
    const url = `${ORG_BASE_URL}?id=${encodeURIComponent(id)}`;
    try {
      const response = await appFetch(url);
      if (response.status === 204 || response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await safeParseResponse(response);
      const orgsArray = extractDataFromResponse(data);
      const orgData = orgsArray.length > 0 ? orgsArray[0] : (data && typeof data === "object" ? data : null);
      if (!orgData) return null;
      return {
        name: (orgData as any).name || "",
        name_ar: (orgData as any).name_ar || "",
        contact_first_name: (orgData as any).contact_first_name || "",
        contact_last_name: (orgData as any).contact_last_name || "",
        contact_phoneNumber: (orgData as any).contact_phoneNumber || "",
        details: (orgData as any).details || "",
      };
    } catch (e) {
      console.log("⚠️ Node-RED API endpoint failed, trying fallback endpoints");
    }

    const candidateUrls = [
      `${API_BASE_URL}/organizations/${id}`,
      `${API_BASE_URL}/organizations?id=${id}`,
      `${API_BASE_URL}/organizations/${id}/details`,
    ];
    for (const candidateUrl of candidateUrls) {
      try {
        const response = await appFetch(candidateUrl);
        if (!response.ok) continue;
        const data = await safeParseResponse(response);
        const orgsArray = extractDataFromResponse(data);
        const orgData = orgsArray.length > 0 ? orgsArray[0] : data;
        if (!orgData) continue;
        return {
          name: (orgData as any).name || "",
          name_ar: (orgData as any).name_ar || "",
          contact_first_name: (orgData as any).contact_first_name || "",
          contact_last_name: (orgData as any).contact_last_name || "",
          contact_phoneNumber: (orgData as any).contact_phoneNumber || "",
          details: (orgData as any).details || "",
        };
      } catch {
        continue;
      }
    }

    console.warn(`⚠️ All endpoints failed for organization ${id}`);
    return null;
  } catch (error) {
    console.error("❌ Error fetching organization details:", error);
    return null;
  }
};

export const fetchOfflineChargers = async (): Promise<Charger[]> => {
  try {
    // Try new Node-RED API endpoint first
    const url = `${API_BASE_URL}/v4/charger?status=offline`;
    console.log("🔍 Fetching offline chargers from:", url);
    
    const response = await fetch(url);
    
    // Handle 204 No Content
    if (response.status === 204) {
      console.log("✅ No offline chargers found (204)");
      return [];
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Raw offline chargers response:", data);
    
    // Extract data from Node-RED response format
    const chargersArray = extractDataFromResponse(data);
    const result = mapChargerStatusRows(chargersArray);
    console.log("✅ Mapped offline chargers:", result);
    return result;
  } catch (error) {
    console.error("❌ Error fetching offline chargers:", error);
    
    // Fallback: try old endpoint
    try {
      const url = `${API_BASE_URL}/chargers/offline`;
      console.log("⚠️ Falling back to:", url);
      const data = await requestJson(url);
      const chargersArray = extractDataFromResponse(data);
      return mapChargerStatusRows(chargersArray);
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        console.error("❌ Cannot connect to backend API. Please check CORS settings.");
      }
      return [];
    }
  }
};

export const fetchOnlineChargers = async (): Promise<Charger[]> => {
  try {
    // Try new Node-RED API endpoint first
    const url = `${API_BASE_URL}/v4/charger?status=online`;
    console.log("🔍 Fetching online chargers from:", url);
    
    const response = await fetch(url);
    
    // Handle 204 No Content
    if (response.status === 204) {
      console.log("✅ No online chargers found (204)");
      return [];
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Raw online chargers response:", data);
    
    // Extract data from Node-RED response format
    const chargersArray = extractDataFromResponse(data);
    const result = mapChargerStatusRows(chargersArray);
    console.log("✅ Mapped online chargers:", result);
    return result;
  } catch (error) {
    console.error("❌ Error fetching online chargers:", error);
    
    // Fallback: try old endpoint
    try {
      const url = `${API_BASE_URL}/chargers/online`;
      console.log("⚠️ Falling back to:", url);
      const data = await requestJson(url);
      const chargersArray = extractDataFromResponse(data);
      return mapChargerStatusRows(chargersArray);
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        console.error("❌ Cannot connect to backend API. Please check CORS settings.");
      }
      return [];
    }
  }
};

export const fetchChargersStatus = async (): Promise<{
  offline: Charger[];
  online: Charger[];
}> => {
  console.log("🚀 fetchChargersStatus called!");
  console.log("📍 API_BASE_URL:", API_BASE_URL);
  
  // Try new Node-RED API endpoints first
  try {
    console.log("🔍 Fetching chargers status from Node-RED API");
    const [offline, online] = await Promise.all([
      fetchOfflineChargers(),
      fetchOnlineChargers(),
    ]);
    
    const result = { offline, online };
    console.log("✅ Mapped status from Node-RED API:", result);
    return result;
  } catch (error) {
    console.warn("⚠️ Node-RED API failed, trying fallback endpoints");
  }
  
  // Fallback: try old endpoints
  const candidateUrls = [
    `${API_BASE_URL}/chargers/status`,
    `${API_BASE_URL}/chargers/state`,
  ];

  console.log("🔗 Candidate URLs:", candidateUrls);

  for (const url of candidateUrls) {
    try {
      console.log("🔍 Fetching chargers status from:", url);
      const data = await requestJson(url);
      console.log("✅ Raw API response:", data);

      // Extract data from Node-RED response format
      const chargersArray = extractDataFromResponse(data);

      if (Array.isArray(chargersArray)) {
        if (
          chargersArray.length === 2 &&
          Array.isArray(chargersArray[0]) &&
          Array.isArray(chargersArray[1])
        ) {
          const result = {
            offline: mapChargerStatusRows(chargersArray[0]),
            online: mapChargerStatusRows(chargersArray[1]),
          };
          console.log("✅ Mapped status (array format):", result);
          return result;
        }

        // If backend returned a flat array with status field
        const offline = chargersArray.filter(
          (row: any) =>
            String(row.status ?? row.Status ?? "").toLowerCase() === "offline"
        );
        const online = chargersArray.filter(
          (row: any) =>
            String(row.status ?? row.Status ?? "").toLowerCase() === "online"
        );
        if (offline.length || online.length) {
          const result = {
            offline: mapChargerStatusRows(offline),
            online: mapChargerStatusRows(online),
          };
          console.log("✅ Mapped status (flat array format):", result);
          return result;
        }
      }

      if (data && typeof data === "object" && !Array.isArray(data)) {
        const offlineArray = (data as any).offline ?? (data as any).Offline ?? [];
        const onlineArray = (data as any).online ?? (data as any).Online ?? [];
        
        const offline = mapChargerStatusRows(Array.isArray(offlineArray) ? offlineArray : []);
        const online = mapChargerStatusRows(Array.isArray(onlineArray) ? onlineArray : []);
        
        if (offline.length || online.length) {
          const result = { offline, online };
          console.log("✅ Mapped status (object format):", result);
          return result;
        }
      }
      
      console.warn("⚠️ Unexpected data format:", data);
    } catch (error) {
      console.error(`❌ Status endpoint failed (${url}):`, error);
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        console.error("❌ Cannot connect to backend API. Please check:");
        console.error(`   1. Is the API running at ${API_BASE_URL}?`);
        console.error("   2. Check CORS settings in the backend");
        console.error("   3. Check network connectivity");
      }
    }
  }

  // Final fallback to individual endpoints
  console.log("⚠️ Falling back to individual endpoints");
  const [offline, online] = await Promise.all([
    fetchOfflineChargers(),
    fetchOnlineChargers(),
  ]);
  return { offline, online };
};

export const fetchChargerOrganizations = async (): Promise<SelectOption[]> => {
  console.log("🔍 fetchChargerOrganizations: Starting...");
  
  // Try new Node-RED API endpoint first
  const url = `${API_BASE_URL}/v4/org`;
  try {
    console.log(`🔍 Trying URL: ${url}`);
    const response = await fetch(url);
    
    // Handle 204 No Content
    if (response.status === 204) {
      console.log("✅ No organizations found (204)");
      return [];
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Response from ${url}:`, data);
    
    // Extract data from Node-RED response format
    const orgsArray = extractDataFromResponse(data);
    
    // Normalize to {value, label} format
    const normalized = normalizeOptions(orgsArray);
    console.log("✅ Normalized organizations:", normalized);
    return normalized;
  } catch (error) {
    console.warn(`⚠️ Organizations endpoint failed (${url}):`, error);
  }

  // Fallback: use existing fetchOrganizations
  console.log("⚠️ Falling back to fetchOrganizations");
  try {
    const orgs = await fetchOrganizations();
    const result = orgs.map((org) => ({ value: org.id, label: org.name }));
    console.log("✅ Fallback organizations:", result);
    return result;
  } catch (error) {
    console.error("❌ Fallback also failed:", error);
    return [];
  }
};

export const fetchLocationsByOrg = async (
  organizationId: string
): Promise<SelectOption[]> => {
  if (!organizationId) {
    console.warn("⚠️ fetchLocationsByOrg: No organizationId provided");
    return [];
  }

  console.log("🔍 fetchLocationsByOrg: Starting for org:", organizationId);
  
  // Preferred: let Node-RED filter (faster + less client-side mismatch)
  const preferredUrls = [
    `${API_BASE_URL}/v4/location?organizationId=${encodeURIComponent(organizationId)}`,
    `${API_BASE_URL}/v4/location?organization_id=${encodeURIComponent(organizationId)}`,
  ];

  for (const url of preferredUrls) {
    try {
      console.log(`🔍 Trying URL: ${url}`);
      const response = await fetch(url);
      if (response.status === 204) return [];
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const locationsArray = extractDataFromResponse(data);
      const normalized = normalizeOptions(locationsArray);
      console.log("✅ Normalized locations:", normalized);
      return normalized;
    } catch (error) {
      console.warn(`⚠️ Locations endpoint failed (${url}):`, error);
    }
  }

  // Fallback: fetch all then filter client-side (older deployments)
  const url = `${API_BASE_URL}/v4/location`;
  try {
    console.log(`🔍 Trying URL: ${url}`);
    const response = await fetch(url);
    if (response.status === 204) return [];
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const all = extractDataFromResponse(data);
    const filtered = all.filter(
      (loc: any) =>
        String(loc.organization_id || loc.organizationId || "") === String(organizationId)
    );
    const normalized = normalizeOptions(filtered);
    console.log("✅ Normalized locations:", normalized);
    return normalized;
  } catch (error) {
    console.warn(`⚠️ Locations endpoint failed (${url}):`, error);
  }

  // Fallback: try old endpoints
  const candidateUrls = [
    `${API_BASE_URL}/locations?organizationId=${organizationId}`,
    `${API_BASE_URL}/locations?organization_id=${organizationId}`,
    `${API_BASE_URL}/organizations/${organizationId}/locations`,
    `${API_BASE_URL}/chargers/locations?organizationId=${organizationId}`,
  ];

  for (const url of candidateUrls) {
    try {
      console.log(`🔍 Trying URL: ${url}`);
      const data = await requestJson(url);
      console.log(`✅ Response from ${url}:`, data);
      
      const locationsArray = extractDataFromResponse(data);
      const normalized = normalizeOptions(locationsArray);
      console.log("✅ Normalized locations:", normalized);
      return normalized;
    } catch (error) {
      console.warn(`⚠️ Locations endpoint failed (${url}):`, error);
    }
  }

  console.warn("⚠️ All locations endpoints failed, returning empty array");
  return [];
};

export const fetchChargersByLocation = async (
  locationId: string
): Promise<SelectOption[]> => {
  if (!locationId) {
    console.warn("⚠️ fetchChargersByLocation: No locationId provided");
    return [];
  }

  console.log("🔍 fetchChargersByLocation: Starting for location:", locationId);
  
  // Try new Node-RED API endpoint first
  const url = `${API_BASE_URL}/v4/charger?locationId=${encodeURIComponent(locationId)}`;
  try {
    console.log(`🔍 Trying URL: ${url}`);
    const response = await fetch(url);
    
    // Handle 204 No Content
    if (response.status === 204) {
      console.log("✅ No chargers found (204)");
      return [];
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Response from ${url}:`, data);
    
    // Extract data from Node-RED response format
    const chargersArray = extractDataFromResponse(data);
    
    // Normalize to {value, label} format
    // IMPORTANT: for downstream endpoints (connectors/tariffs) we need numeric charger_id.
    // Node-RED returns it as `id`.
    const normalized = chargersArray
      .map((charger: any) => ({
        value: String(charger.id ?? charger.charger_id ?? ""),
        label: String(charger.name ?? ""),
      }))
      .filter((opt: any) => opt.value && opt.label);
    
    console.log("✅ Normalized chargers:", normalized);
    return normalized;
  } catch (error) {
    console.warn(`⚠️ Chargers endpoint failed (${url}):`, error);
  }

  // Fallback: try old endpoints
  const candidateUrls = [
    `${API_BASE_URL}/chargers?locationId=${locationId}`,
    `${API_BASE_URL}/chargers?location_id=${locationId}`,
    `${API_BASE_URL}/locations/${locationId}/chargers`,
  ];

  for (const url of candidateUrls) {
    try {
      console.log(`🔍 Trying URL: ${url}`);
      const data = await requestJson(url);
      console.log(`✅ Response from ${url}:`, data);
      
      const chargersArray = extractDataFromResponse(data);
      const normalized = normalizeOptions(chargersArray);
      console.log("✅ Normalized chargers:", normalized);
      return normalized;
    } catch (error) {
      console.warn(`⚠️ Chargers endpoint failed (${url}):`, error);
    }
  }

  console.warn("⚠️ All chargers endpoints failed, returning empty array");
  return [];
};

// Locations
export interface LocationDetail {
  location_id?: string;
  organization_id?: string;
  name: string;
  name_ar: string;
  lat: string;
  lng: string;
  num_chargers?: number;
  description?: string;
  logo_url?: string;
  ad_url?: string;
  payment_types?: string;
  availability?: string;
  subscription?: string;
  visible_on_map?: boolean | number;
  ocpi_id?: string;
  ocpi_name?: string;
  ocpi_address?: string;
  ocpi_city?: string;
  ocpi_postal_code?: string;
  ocpi_country?: string;
  ocpi_visible?: boolean | number;
  ocpi_facility?: string;
  ocpi_parking_restrictions?: string;
  ocpi_directions?: string;
  ocpi_directions_en?: string;
}

export const fetchLocationDetails = async (
  locationId: string
): Promise<LocationDetail | null> => {
  if (!locationId || locationId === "__NEW_LOCATION__") return null;

  // Node-RED endpoint (returns a single object, not {success,data})
  const candidateUrls = [
    `${API_BASE_URL}/v4/location?id=${encodeURIComponent(locationId)}`,
    // fallback: some deployments use locationId instead of id
    `${API_BASE_URL}/v4/location?locationId=${encodeURIComponent(locationId)}`,
    // legacy fallbacks
    `${API_BASE_URL}/locations/${encodeURIComponent(locationId)}`,
    `${API_BASE_URL}/locations/details/${encodeURIComponent(locationId)}`,
  ];

  for (const url of candidateUrls) {
    try {
      // Avoid forcing Content-Type on GET (preflight/CORS)
      const res = await fetch(url);
      if (res.status === 204) return null;
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const extracted = extractDataFromResponse(data);
      const row = Array.isArray(extracted) ? extracted[0] : (extracted ?? data);
      if (row) {
        return {
          location_id: row.location_id ?? row.id ?? row.value ?? "",
          organization_id: row.organization_id ?? row.organizationId ?? "",
          name: row.name ?? "",
          name_ar: row.name_ar ?? row.nameAr ?? "",
          lat: String(row.lat ?? row.latitude ?? ""),
          lng: String(row.lng ?? row.longitude ?? row.lon ?? ""),
          num_chargers: Number(row.num_chargers ?? row.numChargers ?? 0),
          description: row.description ?? "",
          logo_url: row.logo_url ?? row.logoUrl ?? "",
          ad_url: row.ad_url ?? row.adUrl ?? "",
          payment_types: row.payment_types ?? row.paymentTypes ?? "",
          availability: row.availability ?? "",
          subscription: row.subscription ?? "free",
          visible_on_map: row.visible_on_map ?? row.visibleOnMap ?? false,
          ocpi_id: row.ocpi_id ?? row.ocpiId ?? "",
          ocpi_name: row.ocpi_name ?? row.ocpiName ?? "",
          ocpi_address: row.ocpi_address ?? row.ocpiAddress ?? "",
          ocpi_city: row.ocpi_city ?? row.ocpiCity ?? "",
          ocpi_postal_code: row.ocpi_postal_code ?? row.ocpiPostalCode ?? "",
          ocpi_country: row.ocpi_country ?? row.ocpiCountry ?? "",
          ocpi_visible: row.ocpi_visible ?? row.ocpiVisible ?? false,
          ocpi_facility: row.ocpi_facility ?? row.ocpiFacility ?? "",
          ocpi_parking_restrictions: row.ocpi_parking_restrictions ?? row.ocpiParkingRestrictions ?? "",
          ocpi_directions: row.ocpi_directions ?? row.ocpiDirections ?? "",
          ocpi_directions_en: row.ocpi_directions_en ?? row.ocpiDirectionsEn ?? "",
        };
      }
    } catch (error) {
      console.warn(`Location details endpoint failed (${url}):`, error);
    }
  }

  return null;
};

export interface LocationFormPayload {
  location_id?: string;
  organization_id: string;
  name: string;
  name_ar?: string;
  lat?: string;
  lng?: string;
  num_chargers?: number;
  description?: string;
  logo_url?: string;
  ad_url?: string;
  payment_types?: string;
  availability?: string;
  subscription?: string;
  visible_on_map?: boolean;
  ocpi_id?: string;
  ocpi_name?: string;
  ocpi_address?: string;
  ocpi_city?: string;
  ocpi_postal_code?: string;
  ocpi_country?: string;
  ocpi_visible?: boolean;
  ocpi_facility?: string;
  ocpi_parking_restrictions?: string;
  ocpi_directions?: string;
  ocpi_directions_en?: string;
}

export const saveLocation = async (
  payload: LocationFormPayload
): Promise<{ success: boolean; message: string }> => {
  const body = {
    location_id: payload.location_id,
    organization_id: payload.organization_id,
    name: payload.name,
    name_ar: payload.name_ar ?? "",
    lat: payload.lat ?? "",
    lng: payload.lng ?? "",
    num_chargers: payload.num_chargers ?? 0,
    description: payload.description ?? "",
    logo_url: payload.logo_url ?? "",
    ad_url: payload.ad_url ?? "",
    payment_types: payload.payment_types ?? "",
    availability: payload.availability ?? "",
    subscription: payload.subscription ?? "free",
    visible_on_map: payload.visible_on_map ?? false,
    ocpi_id: payload.ocpi_id ?? "",
    ocpi_name: payload.ocpi_name ?? "",
    ocpi_address: payload.ocpi_address ?? "",
    ocpi_city: payload.ocpi_city ?? "",
    ocpi_postal_code: payload.ocpi_postal_code ?? "",
    ocpi_country: payload.ocpi_country ?? "",
    ocpi_visible: payload.ocpi_visible ?? false,
    ocpi_facility: payload.ocpi_facility ?? "",
    ocpi_parking_restrictions: payload.ocpi_parking_restrictions ?? "",
    ocpi_directions: payload.ocpi_directions ?? "",
    ocpi_directions_en: payload.ocpi_directions_en ?? "",
  };

  const locationV4 = `${API_BASE_URL}/v4/location`;
  const endpoints: Array<{ url: string; method: "POST" | "PUT" }> = [
    {
      url: payload.location_id ? `${locationV4}?id=${encodeURIComponent(payload.location_id)}` : locationV4,
      method: payload.location_id ? "PUT" : "POST",
    },
    {
      url: `${API_BASE_URL}/locations${payload.location_id ? `/${payload.location_id}` : ""}`,
      method: payload.location_id ? "PUT" : "POST",
    },
    {
      url: `${API_BASE_URL}/locations/save`,
      method: "POST",
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await appFetch(endpoint.url, {
        method: endpoint.method,
        body: JSON.stringify(body),
      });
      if (res.status === 404) continue;
      const data = await safeParseResponse(res);
      if (res.ok && data) {
        const success = (data as any).success !== undefined ? Boolean((data as any).success) : true;
        const message =
          (data as any).message ?? (payload.location_id ? "Location updated" : "Location added");
        return { success, message };
      }
      if (!res.ok) throw new Error((data as any).message || `HTTP ${res.status}`);
    } catch (error) {
      console.warn(`Save location endpoint failed (${endpoint.url}):`, error);
    }
  }

  return { success: false, message: "Failed to save location" };
};

export const deleteLocation = async (locationId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const url = `${API_BASE_URL}/v4/location?id=${encodeURIComponent(locationId)}`;
    const res = await appFetch(url, { method: "DELETE" });
    const data = await safeParseResponse(res);
    if (!res.ok) throw new Error((data?.message as string) || `HTTP ${res.status}`);
    return { success: true, message: (data?.message as string) || "Location deleted" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to delete location" };
  }
};

export interface ChargerDetail {
  charger_id?: string;
  name: string;
  type: string;
  status: string;
  max_session_time?: number;
  num_connectors?: number;
  description?: string;
}

export const fetchChargerDetails = async (
  chargerId: string
): Promise<ChargerDetail | null> => {
  if (!chargerId || chargerId === "__NEW_CHARGER__") return null;

  const trimmed = String(chargerId).trim();
  const isNumericId = /^\d+$/.test(trimmed);

  // Node-RED endpoint:
  // - by numeric id: /v4/charger?id=19  -> { success: true, data: { ... } }
  // - by chargerID string: /v4/charger?chargerID=Rakan-C3 -> { success: true, data: { ... } }
  // - list endpoints return { success, count, data: [] }
  const candidateUrls = [
    // Prefer numeric id lookup when value looks numeric
    ...(isNumericId
      ? [
          `${API_BASE_URL}/v4/charger?id=${encodeURIComponent(trimmed)}`,
          `${API_BASE_URL}/v4/charger?chargerID=${encodeURIComponent(trimmed)}`,
        ]
      : [
          `${API_BASE_URL}/v4/charger?chargerID=${encodeURIComponent(trimmed)}`,
          `${API_BASE_URL}/v4/charger?id=${encodeURIComponent(trimmed)}`,
        ]),
    // legacy fallbacks
    `${API_BASE_URL}/chargers/${encodeURIComponent(trimmed)}`,
    `${API_BASE_URL}/chargers/details/${encodeURIComponent(trimmed)}`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.status === 204) return null;
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();

      // Support both {success,data:{}} and {success,data:[]}
      const extracted = extractDataFromResponse(data);
      const row =
        (data && typeof data === "object" && !Array.isArray(data) && "data" in (data as any)
          ? (data as any).data
          : null) ??
        (Array.isArray(extracted) ? extracted[0] : extracted) ??
        data;
      if (row) {
        return {
          charger_id:
            row.charger_id ?? row.chargerID ?? row.id ?? row.value ?? "",
          name: row.name ?? "",
          type: row.type ?? "",
          status: row.status ?? "",
          max_session_time: Number(row.max_session_time ?? row.maxSessionTime),
          num_connectors: Number(row.num_connectors ?? row.numConnectors),
          description: row.description ?? "",
        };
      }
    } catch (error) {
      console.warn(`Charger details endpoint failed (${url}):`, error);
    }
  }

  return null;
};

export interface ChargerFormPayload {
  chargerId?: string;
  locationId: string;
  name: string;
  type: string;
  status: string;
  maxSessionTime?: number;
  numConnectors?: number;
  description?: string;
}

export const saveCharger = async (
  payload: ChargerFormPayload
): Promise<{ success: boolean; message: string }> => {
  const body = {
    name: payload.name,
    type: payload.type,
    status: payload.status,
    max_session_time: payload.maxSessionTime,
    num_connectors: payload.numConnectors,
    description: payload.description,
    location_id: payload.locationId,
  };

  // Node-RED endpoints:
  // POST /api/v4/charger
  // PUT  /api/v4/charger?id={id}
  const endpoints: Array<{ url: string; method: "POST" | "PUT" }> = payload.chargerId
    ? [
        { url: `${API_BASE_URL}/v4/charger?id=${encodeURIComponent(payload.chargerId)}`, method: "PUT" },
        // legacy fallbacks
        { url: `${API_BASE_URL}/chargers/${encodeURIComponent(payload.chargerId)}`, method: "PUT" },
        { url: `${API_BASE_URL}/chargers/save`, method: "POST" },
      ]
    : [
        { url: `${API_BASE_URL}/v4/charger`, method: "POST" },
        // legacy fallbacks
        { url: `${API_BASE_URL}/chargers`, method: "POST" },
        { url: `${API_BASE_URL}/chargers/save`, method: "POST" },
      ];

  for (const endpoint of endpoints) {
    try {
      const res = await appFetch(endpoint.url, {
        method: endpoint.method,
        body: JSON.stringify(body),
      });
      if (res.status === 404) continue;
      const data = await safeParseResponse(res);
      if (res.ok && data) {
        const success = (data as any).success !== undefined ? Boolean((data as any).success) : true;
        const message = (data as any).message ?? (payload.chargerId ? "Charger updated" : "Charger added");
        return { success, message };
      }
      if (!res.ok) throw new Error((data as any).message || `HTTP ${res.status}`);
    } catch (error) {
      console.warn(`Save charger endpoint failed (${endpoint.url}):`, error);
    }
  }

  return { success: false, message: "Failed to save charger" };
};

export const deleteCharger = async (chargerId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const url = `${API_BASE_URL}/v4/charger?id=${encodeURIComponent(chargerId)}`;
    const res = await appFetch(url, { method: "DELETE" });
    const data = await safeParseResponse(res);
    if (!res.ok) throw new Error((data?.message as string) || `HTTP ${res.status}`);
    return { success: true, message: (data?.message as string) || "Charger deleted" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to delete charger" };
  }
};

// Connectors
export const fetchConnectorsByCharger = async (
  chargerId: string
): Promise<SelectOption[]> => {
  if (!chargerId) return [];

  // Node-RED endpoint first
  try {
    const res = await fetch(`${API_BASE_URL}/v4/connector?chargerId=${encodeURIComponent(chargerId)}`);
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const payload = await res.json();
    const rows = extractDataFromResponse(payload);
    return rows
      .map((r: any) => ({
        value: String(r.id ?? r.connector_id ?? ""),
        label: String(r.type ?? r.connector_type ?? r.name ?? ""),
      }))
      .filter((opt: any) => opt.value && opt.label);
  } catch (e) {
    // fall through to legacy candidates
  }

  const candidateUrls = [
    `${API_BASE_URL}/connectors?chargerId=${chargerId}`,
    `${API_BASE_URL}/connectors?charger_id=${chargerId}`,
    `${API_BASE_URL}/chargers/${chargerId}/connectors`,
  ];

  for (const url of candidateUrls) {
    try {
      const data = await requestJson(url);
      if (Array.isArray(data)) return normalizeOptions(data);
      if (data && Array.isArray((data as any).data))
        return normalizeOptions((data as any).data);
    } catch (error) {
      console.warn(`Connectors endpoint failed (${url}):`, error);
    }
  }

  return [];
};

export interface ConnectorDetail {
  connector_id?: string;
  connector_type?: string;
  status?: string;
  power?: string;
  power_unit?: string;
  time_limit?: number;
  pin?: string;
  ocpi_standard?: string;
  ocpi_format?: string;
  ocpi_power_type?: string;
  ocpi_max_voltage?: string;
  ocpi_max_amperage?: string;
  ocpi_tariff_ids?: string;
  stop_on80?: boolean | number;
  enabled?: boolean | number;
}

export const fetchConnectorDetails = async (
  connectorId: string
): Promise<ConnectorDetail | null> => {
  if (!connectorId || connectorId === "__NEW_CONNECTOR__") return null;

  const candidateUrls = [
    // Node-RED endpoint
    `${API_BASE_URL}/v4/connector?id=${encodeURIComponent(connectorId)}`,
    `${API_BASE_URL}/connectors/${connectorId}`,
    `${API_BASE_URL}/connectors/details/${connectorId}`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.status === 204) return null;
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const extracted = extractDataFromResponse(data);
      const row =
        (data && typeof data === "object" && !Array.isArray(data) && "data" in (data as any)
          ? (data as any).data
          : null) ??
        (Array.isArray(extracted) ? extracted[0] : extracted) ??
        data;
      if (row) {
        return {
          connector_id: row.connector_id ?? row.id ?? row.value,
          connector_type: row.connector_type ?? row.type,
          status: row.status,
          power: row.power,
          power_unit: row.power_unit,
          time_limit: Number(row.time_limit ?? row.max_session_time),
          pin: row.pin,
          ocpi_standard: row.ocpi_standard,
          ocpi_format: row.ocpi_format,
          ocpi_power_type: row.ocpi_power_type,
          ocpi_max_voltage: row.ocpi_max_voltage,
          ocpi_max_amperage: row.ocpi_max_amperage,
          ocpi_tariff_ids: row.ocpi_tariff_ids,
          stop_on80: row.stop_on80 ?? row.stop_on_80,
          enabled: row.enabled,
        };
      }
    } catch (error) {
      console.warn(`Connector details endpoint failed (${url}):`, error);
    }
  }

  return null;
};

export interface ConnectorFormPayload {
  connectorId?: string;
  chargerId: string;
  connectorType: string;
  status?: string;
  power?: string;
  powerUnit?: string;
  timeLimit?: number;
  pin?: string;
  ocpiStandard?: string;
  ocpiFormat?: string;
  ocpiPowerType?: string;
  ocpiMaxVoltage?: string;
  ocpiMaxAmperage?: string;
  ocpiTariffIds?: string;
  stopOn80?: boolean;
  enabled?: boolean;
}

export const saveConnector = async (
  payload: ConnectorFormPayload
): Promise<{ success: boolean; message: string }> => {
  const body = {
    charger_id: payload.chargerId,
    connector_type: payload.connectorType,
    status: payload.status,
    power: payload.power,
    power_unit: payload.powerUnit,
    time_limit: payload.timeLimit,
    pin: payload.pin,
    ocpi_standard: payload.ocpiStandard,
    ocpi_format: payload.ocpiFormat,
    ocpi_power_type: payload.ocpiPowerType,
    ocpi_max_voltage: payload.ocpiMaxVoltage,
    ocpi_max_amperage: payload.ocpiMaxAmperage,
    ocpi_tariff_ids: payload.ocpiTariffIds,
    stop_on80: payload.stopOn80 ?? false,
    enabled: payload.enabled ?? true,
  };

  // Node-RED endpoints:
  // POST /api/v4/connector
  // PUT  /api/v4/connector?id={id}
  const endpoints: Array<{ url: string; method: "POST" | "PUT" }> = payload.connectorId
    ? [
        { url: `${API_BASE_URL}/v4/connector?id=${encodeURIComponent(payload.connectorId)}`, method: "PUT" },
        // legacy fallbacks
        { url: `${API_BASE_URL}/connectors/${encodeURIComponent(payload.connectorId)}`, method: "PUT" },
        { url: `${API_BASE_URL}/connectors/save`, method: "POST" },
      ]
    : [
        { url: `${API_BASE_URL}/v4/connector`, method: "POST" },
        // legacy fallbacks
        { url: `${API_BASE_URL}/connectors`, method: "POST" },
        { url: `${API_BASE_URL}/connectors/save`, method: "POST" },
      ];

  for (const endpoint of endpoints) {
    try {
      const res = await appFetch(endpoint.url, {
        method: endpoint.method,
        body: JSON.stringify(body),
      });
      if (res.status === 404) continue;
      const data = await safeParseResponse(res);
      if (res.ok && data) {
        const success = (data as any).success !== undefined ? Boolean((data as any).success) : true;
        const message = (data as any).message ?? (payload.connectorId ? "Connector updated" : "Connector added");
        return { success, message };
      }
      if (!res.ok) throw new Error((data as any).message || `HTTP ${res.status}`);
    } catch (error) {
      console.warn(`Save connector endpoint failed (${endpoint.url}):`, error);
    }
  }

  return { success: false, message: "Failed to save connector" };
};

export const deleteConnector = async (connectorId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const url = `${API_BASE_URL}/v4/connector?id=${encodeURIComponent(connectorId)}`;
    const res = await appFetch(url, { method: "DELETE" });
    const data = await safeParseResponse(res);
    if (!res.ok) throw new Error((data?.message as string) || `HTTP ${res.status}`);
    return { success: true, message: (data?.message as string) || "Connector deleted" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to delete connector" };
  }
};

// Tariffs
export const fetchTariffByConnector = async (
  connectorId: string
): Promise<any | null> => {
  if (!connectorId || connectorId === "__NEW_TARIFF__") return null;

  const candidateUrls = [
    // Node-RED endpoint
    `${API_BASE_URL}/v4/tariff?connectorId=${encodeURIComponent(connectorId)}`,
    `${API_BASE_URL}/v4/tariff?connector_id=${encodeURIComponent(connectorId)}`,
    // legacy fallbacks
    `${API_BASE_URL}/tariffs?connectorId=${encodeURIComponent(connectorId)}`,
    `${API_BASE_URL}/connectors/${encodeURIComponent(connectorId)}/tariffs`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.status === 204) return null;
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      const rows = extractDataFromResponse(data);
      if (Array.isArray(rows) && rows.length) return rows[0];
    } catch (error) {
      console.warn(`Tariff endpoint failed (${url}):`, error);
    }
  }

  return null;
};

export interface TariffFormPayload {
  tariffId?: string;
  connectorId: string;
  type: string;
  buyRate: number;
  sellRate: number;
  transactionFees?: number;
  clientPercentage?: number;
  partnerPercentage?: number;
  peakType?: string;
  status?: string;
}

export const saveTariff = async (
  payload: TariffFormPayload
): Promise<{ success: boolean; message: string }> => {
  const body = {
    tariff_id: payload.tariffId,
    connector_id: payload.connectorId,
    type: payload.type,
    buy_rate: payload.buyRate,
    sell_rate: payload.sellRate,
    transaction_fees: payload.transactionFees,
    client_percentage: payload.clientPercentage,
    partner_percentage: payload.partnerPercentage,
    peak_type: payload.peakType,
    status: payload.status,
  };

  // Node-RED endpoints:
  // POST /api/v4/tariff
  // PUT  /api/v4/tariff?id={tariff_id}
  const endpoints: Array<{ url: string; method: "POST" | "PUT" }> = payload.tariffId
    ? [
        { url: `${API_BASE_URL}/v4/tariff?id=${encodeURIComponent(payload.tariffId)}`, method: "PUT" },
        // legacy fallbacks
        { url: `${API_BASE_URL}/tariffs/${encodeURIComponent(payload.tariffId)}`, method: "PUT" },
        { url: `${API_BASE_URL}/tariffs/save`, method: "POST" },
      ]
    : [
        { url: `${API_BASE_URL}/v4/tariff`, method: "POST" },
        // legacy fallbacks
        { url: `${API_BASE_URL}/tariffs`, method: "POST" },
        { url: `${API_BASE_URL}/tariffs/save`, method: "POST" },
      ];

  for (const endpoint of endpoints) {
    try {
      const res = await appFetch(endpoint.url, {
        method: endpoint.method,
        body: JSON.stringify(body),
      });
      if (res.status === 404) continue;
      const data = await safeParseResponse(res);
      if (res.ok && data) {
        const success = (data as any).success !== undefined ? Boolean((data as any).success) : true;
        const message = (data as any).message ?? (payload.tariffId ? "Tariff updated" : "Tariff added");
        return { success, message };
      }
      if (!res.ok) throw new Error((data as any).message || `HTTP ${res.status}`);
    } catch (error) {
      console.warn(`Save tariff endpoint failed (${endpoint.url}):`, error);
    }
  }

  return { success: false, message: "Failed to save tariff" };
};

export const deleteTariff = async (tariffId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const url = `${API_BASE_URL}/v4/tariff?id=${encodeURIComponent(tariffId)}`;
    const res = await appFetch(url, { method: "DELETE" });
    const data = await safeParseResponse(res);
    if (!res.ok) throw new Error((data?.message as string) || `HTTP ${res.status}`);
    return { success: true, message: (data?.message as string) || "Tariff deleted" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to delete tariff" };
  }
};

// Users & Partner user
export interface PartnerUserPayload {
  organization: string;
  firstName: string;
  lastName: string;
  mobile: string;
  role: number;
  email: string;
  language: string;
}

export const createPartnerUser = async (
  payload: PartnerUserPayload
): Promise<{ success: boolean; message: string }> => {
  const body = {
    organization_id: payload.organization,
    f_name: payload.firstName,
    l_name: payload.lastName,
    mobile: payload.mobile,
    role_id: payload.role,
    email: payload.email,
    language: payload.language,
  };

  const candidateUrls = [
    { url: `${API_BASE_URL}/users/partner`, method: "POST" as const },
    { url: `${API_BASE_URL}/users`, method: "POST" as const },
  ];

  for (const endpoint of candidateUrls) {
    try {
      const data = await requestJson(endpoint.url, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (data) {
        const success =
          (data as any).success !== undefined ? Boolean((data as any).success) : true;
        const message = (data as any).message ?? "Partner user saved";
        return { success, message };
      }
    } catch (error) {
      console.warn(`Partner user endpoint failed (${endpoint.url}):`, error);
    }
  }

  return { success: false, message: "Failed to save partner user" };
};

// Reports
export interface FinancialReportFilters {
  organizationId?: string;
  locationId?: string;
  chargerId?: string;
  connectorId?: string;
  period?: string;
  payment?: string;
  from?: string;
  to?: string;
}

export const fetchFinancialReports = async (
  filters: FinancialReportFilters
): Promise<any[]> => {
  const candidateUrls = [
    `${API_BASE_URL}/reports/financial`,
    `${API_BASE_URL}/reports`,
  ];

  for (const url of candidateUrls) {
    try {
      const data = await requestJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });

      if (Array.isArray(data)) return data;
      if (data && Array.isArray((data as any).data)) return (data as any).data;
    } catch (error) {
      console.warn(`Financial report endpoint failed (${url}):`, error);
    }
  }

  return [];
};

export const fetchLeadershipUsers = async (): Promise<User[]> => {
  try {
    // Node-RED endpoint
    const candidateUrls = [
      `${API_BASE_URL}/v4/users/leadership`,
      // legacy fallback (often 404)
      `${API_BASE_URL}/users/leadership`,
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url);
        if (res.status === 204) return [];
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const payload = await res.json();
        const rows = extractDataFromResponse(payload);
        return rows.map((r: any) => ({
          firstName: String(r.firstName ?? r["First Name"] ?? ""),
          lastName: String(r.lastName ?? r["Last Name"] ?? ""),
          count: Number(r.count ?? r.Count ?? 0),
          mobile: String(r.mobile ?? r.Mobile ?? ""),
          energy: Number(r.energy ?? r.Energy ?? 0),
          amount: Number(r.amount ?? r.Amount ?? 0),
        }));
      } catch (e) {
        // try next candidate
        continue;
      }
    }

    return [];
  } catch (error) {
    console.error("Error fetching leadership users:", error);
    return [];
  }
};

// Options for dropdowns
export const organizationOptions = [
  { value: "org1", label: "Organization 1" },
  { value: "org2", label: "Organization 2" },
];

export const locationOptions = [
  { value: "loc1", label: "Location 1" },
  { value: "loc2", label: "Location 2" },
];

export const chargerOptions = [
  { value: "charger1", label: "Charger 1" },
  { value: "charger2", label: "Charger 2" },
];

export const connectorOptions = [
  { value: "connector1", label: "Connector 1" },
  { value: "connector2", label: "Connector 2" },
];

export const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "user", label: "User" },
];

export const languageOptions = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
];

export const peakTypeOptions = [
  { value: "peak", label: "Peak" },
  { value: "off-peak", label: "Off-Peak" },
];

export const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// OCPI / connector-related options for Connectors page
export const ocpiFormatOptions = [
  { value: "v2.1.1", label: "OCPI 2.1.1" },
  { value: "v2.2.1", label: "OCPI 2.2.1" },
];

export const ocpiStandardOptions = [
  { value: "ocpi", label: "OCPI" },
  { value: "ocpp", label: "OCPP" },
];

export const connectorTypeOptions = [
  { value: "type2", label: "Type 2" },
  { value: "ccs2", label: "CCS Type 2" },
  { value: "chademo", label: "CHAdeMO" },
];

export const powerUnitOptions = [
  { value: "kw", label: "kW" },
  { value: "amp", label: "Amp" },
];

// Reports-related options
export const periodOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export const paymentOptions = [
  { value: "prepaid", label: "Prepaid" },
  { value: "postpaid", label: "Postpaid" },
  { value: "mixed", label: "Mixed" },
];

// -----------------------------
// Locations list (Node-RED: GET /v4/location)
// -----------------------------

export interface LocationListItem {
  location_id: number | string;
  organization_id: number | string;
  name: string;
  name_ar?: string;
  lat?: string | number;
  lng?: string | number;
  num_chargers?: number;
  payment_types?: string;
  availability?: string;
  visible_on_map?: boolean | number;
}

export const fetchLocationsList = async (): Promise<LocationListItem[]> => {
  const url = `${API_BASE_URL}/v4/location`;
  try {
    const res = await fetch(url);
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return extractDataFromResponse(data) as LocationListItem[];
  } catch (error) {
    console.warn("fetchLocationsList failed:", error);
    return [];
  }
};

// -----------------------------
// Connector status counts (for Monitoring cards)
// Node-RED: GET /v4/connector
// -----------------------------

export interface ConnectorStatusCounts {
  availableConnectors: number;
  unavailableConnectors: number;
}

let _connectorStatusCountsCache: { at: number; value: ConnectorStatusCounts } | null = null;

export const fetchConnectorStatusCounts = async (): Promise<ConnectorStatusCounts> => {
  try {
    // Cache to avoid heavy re-fetches on every UI refresh
    const now = Date.now();
    if (_connectorStatusCountsCache && now - _connectorStatusCountsCache.at < 60_000) {
      return _connectorStatusCountsCache.value;
    }

    // Fast path (recommended):
    // If Node-RED exposes a single aggregate endpoint, use it.
    // Suggested implementation on Node-RED:
    // GET /api/v4/charger?connectorCounts=1
    // -> { success:true, data:{ availableConnectors:number, unavailableConnectors:number } }
    try {
      const res = await fetch(`${API_BASE_URL}/v4/charger?connectorCounts=1`);
      if (res.status !== 204 && res.ok) {
        const payload = await res.json();
        const obj =
          payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload
            ? (payload as any).data
            : payload;
        const available = Number(
          obj?.availableConnectors ?? obj?.available_connectors ?? obj?.available
        );
        const unavailable = Number(
          obj?.unavailableConnectors ?? obj?.unavailable_connectors ?? obj?.unavailable
        );
        if (Number.isFinite(available) && Number.isFinite(unavailable)) {
          const value = { availableConnectors: available, unavailableConnectors: unavailable };
          _connectorStatusCountsCache = { at: now, value };
          return value;
        }
      }
    } catch {
      // ignore and fall back
    }

    // IMPORTANT:
    // `/v4/connector` (unfiltered) can be extremely slow / hang in production.
    // Instead, fetch connectors per chargerId and aggregate counts.
    const chargersRes = await fetch(`${API_BASE_URL}/v4/charger`);
    if (chargersRes.status === 204) return { availableConnectors: 0, unavailableConnectors: 0 };
    if (!chargersRes.ok) throw new Error(`HTTP error! status: ${chargersRes.status}`);
    const chargersPayload = await chargersRes.json();
    const chargers = extractDataFromResponse(chargersPayload) as any[];

    const chargerIds = chargers
      .map((c) => Number(c?.id))
      .filter((id) => Number.isFinite(id)) as number[];

    const withTimeout = async (url: string, timeoutMs: number) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (res.status === 204) return [];
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const payload = await res.json();
        return extractDataFromResponse(payload) as any[];
      } finally {
        clearTimeout(t);
      }
    };

    let available = 0;
    let unavailable = 0;

    const CONCURRENCY = 8;
    let idx = 0;

    const worker = async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const i = idx++;
        if (i >= chargerIds.length) return;
        const chargerId = chargerIds[i];
        try {
          const rows = await withTimeout(
            `${API_BASE_URL}/v4/connector?chargerId=${encodeURIComponent(String(chargerId))}`,
            10_000
          );
          for (const r of rows) {
            const s = String((r as any)?.status ?? "").toLowerCase();
            if (s === "available") available += 1;
            else unavailable += 1;
          }
        } catch {
          // ignore failures per chargerId
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    const value = { availableConnectors: available, unavailableConnectors: unavailable };
    _connectorStatusCountsCache = { at: now, value };
    return value;
  } catch (error) {
    console.warn("fetchConnectorStatusCounts failed:", error);
    return { availableConnectors: 0, unavailableConnectors: 0 };
  }
};

// Dashboard API functions
export interface ActiveSession {
  "Start Date/Time": string;
  "Session ID": string;
  Location: string;
  Charger: string;
  Connector: string;
  "Energy (KWH)": number;
  "Amount (JOD)": number;
  mobile?: string;
  "User ID"?: string;
}

export interface LocalSession {
  "Start Date/Time": string;
  Location: string;
  Charger: string;
  Connector: string;
  "Energy (KWH)": number;
  "Amount (JOD)": number;
  "User ID": string;
}

export interface UserInfo {
  mobile: string;
  first_name: string;
  last_name: string;
  balance: number;
  language: string;
  device_id: string;
  platform?: string;
}

export interface UserSession {
  "Date/Time": string;
  Charger: string;
  Energy: number;
  Amount: number;
}

export interface UserPayment {
  "Date/Time": string;
  Source: string;
  "Amount (JOD)": number;
}

export interface DashboardStats {
  activeSessions: number;
  utilization: number;
  chargersOnline: number;
  newUsers: number;
  sessions: number;
  smsBalance?: number;
  payments: number;
  faults: number;
  revenue: number;
  tariffAC: number;
  tariffDC: number;
  eFawateerCom: number;
  ni: number;
  orangeMoney: number;
  totalCashIn: number;
  expendature: number;
}

async function fetchSmsBalance(): Promise<number> {
  // Preferred: expose it via Node-RED gateway (recommended)
  const candidates = [
    `${API_BASE_URL}/v4/dashboard/sms-balance`,
    // Fallback: direct Node-RED v3 endpoint (as in your flow)
    `${API_BASE_URL}/v3/sms_balance?key=sms123`,
  ];

  for (const url of candidates) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);

      if (res.status === 404) continue;
      if (!res.ok) continue;

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const json = await res.json();
        const val =
          typeof json === "number"
            ? json
            : typeof json === "string"
              ? json
              : (json?.data?.smsBalance ?? json?.smsBalance ?? json?.data ?? json?.payload ?? "");
        const n = Number(val);
        return Number.isFinite(n) ? n : 0;
      }

      const txt = await res.text();
      const n = Number(String(txt).trim());
      return Number.isFinite(n) ? n : 0;
    } catch {
      // try next candidate
    }
  }

  return 0;
}

export const fetchActiveSessions = async (): Promise<ActiveSession[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/v4/dashboard/active-sessions`);
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return extractDataFromResponse(data) as ActiveSession[];
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    return [];
  }
};

// Glance chart history (server-provided time-series)
export interface ActiveSessionsHistoryPoint {
  ts: number; // epoch ms
  count: number;
}

export const fetchActiveSessionsHistory = async (hours = 24): Promise<ActiveSessionsHistoryPoint[]> => {
  const h = Number(hours);
  const safeHours = Number.isFinite(h) ? Math.min(48, Math.max(1, Math.floor(h))) : 24;

  try {
    const res = await fetch(
      `${API_BASE_URL}/v4/dashboard/active-sessions-history?hours=${encodeURIComponent(String(safeHours))}`
    );
    if (res.status === 404) return []; // endpoint not deployed yet
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const payload = await res.json();
    const rows = extractDataFromResponse(payload) as any[];

    return rows
      .map((r) => ({
        ts: Number(r.ts ?? r.time ?? r.timestamp ?? r["ts"]),
        count: Number(r.count ?? r.value ?? r.activeSessions ?? r["count"]),
      }))
      .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.count))
      .sort((a, b) => a.ts - b.ts);
  } catch (error) {
    console.warn("fetchActiveSessionsHistory failed:", error);
    return [];
  }
};

export const fetchLocalSessions = async (): Promise<LocalSession[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/v4/dashboard/local-sessions`);
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return extractDataFromResponse(data) as LocalSession[];
  } catch (error) {
    console.error("Error fetching local sessions:", error);
    return [];
  }
};

export const fetchUserInfo = async (mobile: string): Promise<UserInfo | null> => {
  if (!mobile || mobile.length < 10) return null;
  try {
    const res = await fetch(
      `${API_BASE_URL}/v4/dashboard/user-info?mobile=${encodeURIComponent(mobile)}`
    );
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const rows = extractDataFromResponse(data);
    const row = rows[0] ?? null;
    return row ? (row as UserInfo) : null;
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
};

export const fetchUserSessions = async (mobile: string): Promise<UserSession[]> => {
  if (!mobile || mobile.length < 10) return [];
  try {
    const res = await fetch(
      `${API_BASE_URL}/v4/dashboard/user-sessions?mobile=${encodeURIComponent(mobile)}`
    );
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return extractDataFromResponse(data) as UserSession[];
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return [];
  }
};

export const fetchUserPayments = async (mobile: string): Promise<UserPayment[]> => {
  if (!mobile || mobile.length < 10) return [];
  try {
    const res = await fetch(
      `${API_BASE_URL}/v4/dashboard/user-payments?mobile=${encodeURIComponent(mobile)}`
    );
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return extractDataFromResponse(data) as UserPayment[];
  } catch (error) {
    console.error("Error fetching user payments:", error);
    return [];
  }
};

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const res = await fetch(`${API_BASE_URL}/v4/dashboard/stats`);
    if (res.status === 204) {
      const base: DashboardStats = {
        activeSessions: 0,
        utilization: 0,
        chargersOnline: 0,
        newUsers: 0,
        sessions: 0,
        smsBalance: 0,
        payments: 0,
        faults: 0,
        revenue: 0,
        tariffAC: 0,
        tariffDC: 0,
        eFawateerCom: 0,
        ni: 0,
        orangeMoney: 0,
        totalCashIn: 0,
        expendature: 0,
      };
      return base;
    }
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const payload = await res.json();
    const obj =
      payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload
        ? (payload as any).data
        : payload;

    const smsBalance = await fetchSmsBalance();
    return { ...(obj as DashboardStats), smsBalance };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      activeSessions: 0,
      utilization: 0,
      chargersOnline: 0,
      newUsers: 0,
      sessions: 0,
      smsBalance: 0,
      payments: 0,
      faults: 0,
      revenue: 0,
      tariffAC: 0,
      tariffDC: 0,
      eFawateerCom: 0,
      ni: 0,
      orangeMoney: 0,
      totalCashIn: 0,
      expendature: 0,
    };
  }
};

export const fetchChargerStatus = async (chargerId: string): Promise<string | null> => {
  if (!chargerId) return null;
  try {
    const res = await fetch(
      `${API_BASE_URL}/v4/dashboard/charger-status?chargerId=${encodeURIComponent(chargerId)}`
    );
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return (data as Record<string, any>).status ?? null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching charger status:", error);
    return null;
  }
};

export const fetchConnectorStatus = async (connectorId: string): Promise<string | null> => {
  if (!connectorId) return null;
  try {
    const res = await fetch(
      `${API_BASE_URL}/v4/dashboard/connector-status?connectorId=${encodeURIComponent(connectorId)}`
    );
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return (data as Record<string, any>).status ?? null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching connector status:", error);
    return null;
  }
};

export const sendChargerCommand = async (
  chargerId: string,
  command: "restart" | "stop" | "unlock"
): Promise<{ success: boolean; message: string }> => {
  try {
    const data = await requestJson(`${API_BASE_URL}/v4/dashboard/charger-command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chargerId, command }),
    });
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return { 
        success: (data as any).success !== undefined ? Boolean((data as any).success) : true,
        message: (data as Record<string, any>).message || "Command sent successfully",
      };
    }
    return { success: true, message: "Command sent successfully" };
  } catch (error) {
    console.error("Error sending charger command:", error);
    return { success: false, message: "Failed to send command" };
  }
};

export const fetchSessionsReport = async (from: string, to: string): Promise<Record<string, unknown>[]> => {
  const params = new URLSearchParams({ from: (from || "").trim(), to: (to || "").trim() });
  const res = await fetch(`${API_BASE_URL}/v4/dashboard/sessions-report?${params}`);
  if (res.status === 204) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return extractDataFromResponse(data) as Record<string, unknown>[];
};

export interface ConnectorWithStatus {
  id?: string;
  connector_id?: string;
  charger_id?: string;
  type?: string;
  status?: string;
}
export const fetchConnectorsWithStatusByCharger = async (chargerId: string): Promise<ConnectorWithStatus[]> => {
  try {
    const list = await fetchConnectorsByCharger(chargerId);
    return (list || []).map((opt) => ({ id: opt.value, connector_id: opt.value, charger_id: chargerId, status: "" }));
  } catch {
    return [];
  }
};

export const fetchAllConnectorsStatus = async (): Promise<ConnectorWithStatus[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/v4/dashboard/connectors-status`);
    if (res.status === 204) return [];
    const data = await res.json();
    return extractDataFromResponse(data) as ConnectorWithStatus[];
  } catch {
    return [];
  }
};

export interface ChargerComparisonRow {
  chargerId: string | number;
  name: string;
  type?: string;
  status: string;
  locationId: string | number;
  locationName?: string;
  connectorsCount: number;
  onlineFlag: boolean;
  lastUpdate: string | null;
  sessionsCount?: number;
  totalKwh?: number;
  totalAmount?: number;
}
export interface ConnectorComparisonRow {
  connectorId: string | number;
  chargerId: string | number;
  chargerName?: string;
  connectorType?: string;
  status: string;
  locationName?: string;
  sessionsCount?: number;
  totalKwh?: number;
  totalAmount?: number;
}
export const fetchChargerComparison = async (_params?: { start?: string; end?: string; locationId?: string; chargerIds?: string[] }): Promise<ChargerComparisonRow[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/v4/dashboard/charger-comparison`);
    if (res.status === 204) return [];
    const data = await res.json();
    return extractDataFromResponse(data) as ChargerComparisonRow[];
  } catch {
    return [];
  }
};
export const fetchConnectorComparison = async (_params?: { start?: string; end?: string; locationId?: string; chargerId?: string; connectorIds?: string[] }): Promise<ConnectorComparisonRow[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/v4/dashboard/connector-comparison`);
    if (res.status === 204) return [];
    const data = await res.json();
    return extractDataFromResponse(data) as ConnectorComparisonRow[];
  } catch {
    return [];
  }
};

export interface MaintenanceTicketRow {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  team: string;
  created_at: string;
  updated_at: string;
}
export const createMaintenanceTicket = async (payload: Record<string, unknown>): Promise<MaintenanceTicketRow> => {
  const res = await appFetch(`${API_BASE_URL}/v4/support/maintenance-ticket`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return ((data as any)?.data ?? data) as MaintenanceTicketRow;
};
export const fetchMaintenanceTickets = async (): Promise<MaintenanceTicketRow[]> => {
  try {
    const res = await appFetch(`${API_BASE_URL}/v4/support/maintenance-tickets`);
    if (res.status === 204) return [];
    const data = await res.json();
    return extractDataFromResponse(data) as MaintenanceTicketRow[];
  } catch {
    return [];
  }
};
export const updateMaintenanceTicket = async (id: string, _payload: Record<string, unknown>): Promise<MaintenanceTicketRow> => {
  const res = await appFetch(`${API_BASE_URL}/v4/support/maintenance-ticket?id=${encodeURIComponent(id)}`, { method: "PUT", body: "{}" });
  const data = await res.json();
  return ((data as any)?.data ?? data) as MaintenanceTicketRow;
};
export const deleteMaintenanceTicket = async (id: string): Promise<void> => {
  const res = await appFetch(`${API_BASE_URL}/v4/support/maintenance-ticket?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete");
};

export interface PartnerUserRecord {
  user_id: number;
  organization_id?: number;
  role_id?: number;
  mobile?: string;
  first_name?: string;
  last_name?: string;
  f_name?: string;
  l_name?: string;
  email?: string;
  created_at?: string;
  user_type?: string;
  subs_plan?: string;
  is_active?: number;
  language?: string;
  last_login_at?: string | null;
  profile_img_url?: string;
  provider_user_id?: string;
  firebase_messaging_token?: string;
  device_id?: string;
}
export interface CreatePartnerUserPayload {
  organization_id: number;
  role_id: number;
  mobile: string;
  password: string;
  first_name?: string;
  last_name?: string;
  f_name?: string;
  l_name?: string;
  email?: string;
  user_type?: string;
  subs_plan?: string;
  language?: string;
  [key: string]: unknown;
}
export interface UpdatePartnerUserPayload {
  organization_id?: number;
  role_id?: number;
  mobile?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  f_name?: string;
  l_name?: string;
  email?: string;
  user_type?: string;
  subs_plan?: string;
  language?: string;
  profile_img_url?: string;
  provider_user_id?: string;
  is_active?: boolean;
  firebase_messaging_token?: string;
  device_id?: string;
}
export const listPartnerUsers = async (_filters?: Record<string, unknown>): Promise<PartnerUserRecord[]> => {
  try {
    const res = await appFetch(`${API_BASE_URL}/v4/users/partner`);
    if (res.status === 204) return [];
    const data = await res.json();
    return extractDataFromResponse(data) as PartnerUserRecord[];
  } catch {
    return [];
  }
};
export const getPartnerUser = async (id: string): Promise<PartnerUserRecord | null> => {
  try {
    const res = await appFetch(`${API_BASE_URL}/v4/users/partner?id=${encodeURIComponent(id)}`);
    if (res.status === 204 || !res.ok) return null;
    const data = await res.json();
    const raw = (data as any)?.data ?? data;
    return raw as PartnerUserRecord;
  } catch {
    return null;
  }
};
export const updatePartnerUser = async (id: string, payload: UpdatePartnerUserPayload): Promise<PartnerUserRecord> => {
  const res = await appFetch(`${API_BASE_URL}/v4/users/partner?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return ((data as any)?.data ?? data) as PartnerUserRecord;
};
export const deletePartnerUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await appFetch(`${API_BASE_URL}/v4/users/partner?id=${encodeURIComponent(userId)}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!res.ok) throw new Error(data?.message || "Failed to delete");
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed" };
  }
};

export const createPartnerUserV4 = async (payload: CreatePartnerUserPayload): Promise<PartnerUserRecord> => {
  const fName = (payload.f_name ?? payload.first_name ?? "").toString().trim();
  const lName = (payload.l_name ?? payload.last_name ?? "").toString().trim();
  const body: Record<string, unknown> = {
    organization_id: payload.organization_id,
    role_id: payload.role_id,
    mobile: (payload.mobile ?? "").toString().trim(),
    password: payload.password,
    f_name: fName,
    l_name: lName,
    first_name: fName,
    last_name: lName,
    email: (payload.email ?? "").toString().trim() || null,
    user_type: payload.user_type ?? "operator",
    subs_plan: payload.subs_plan ?? "free",
    language: (payload.language ?? "en").toString().trim() || "en",
    is_active: payload.is_active !== false ? 1 : 0,
    profile_img_url: (payload as Record<string, unknown>).profile_img_url ?? null,
    provider_user_id: (payload as Record<string, unknown>).provider_user_id ?? null,
    firebase_messaging_token: (payload as Record<string, unknown>).firebase_messaging_token ?? null,
    device_id: (payload as Record<string, unknown>).device_id ?? null,
  };
  const res = await appFetch(`${API_BASE_URL}/v4/users/partner`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await safeParseResponse(res);
  if (!res.ok) {
    const msg = (data?.message as string) || (data?.details as string) || "Failed to create partner user";
    const details = (data?.details as string) && (data?.details as string) !== msg ? (data?.details as string) : "";
    const isGeneric500 = /internal server error/i.test(msg) && !details;
    const errMsg = res.status === 500
      ? (isGeneric500 ? "Server error. Check Node-RED debug or database (table ocpp_CSGO.Users)." : details ? `${msg}: ${details}` : msg)
      : msg;
    throw new Error(errMsg);
  }
  const raw = (data?.data ?? data) as PartnerUserRecord;
  return raw;
};
