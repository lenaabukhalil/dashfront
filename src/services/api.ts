import type { Organization, Charger, User, SelectOption } from "@/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://dash.evse.cloud/api";

type JsonValue = Record<string, any> | any[];

const requestJson = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json() as Promise<JsonValue>;
};

const normalizeOptions = (rows: any[] = []): SelectOption[] =>
  rows
    .map((row) => ({
      value: String(
        row.value ??
          row.id ??
          row.organization_id ??
          row.location_id ??
          row.charger_id ??
          row.chargerID ??
          ""
      ),
      label: String(row.label ?? row.name ?? row.Name ?? row.location_name ?? ""),
    }))
    .filter((opt) => opt.value && opt.label);

const mapChargerStatusRows = (rows: any[] = []): Charger[] =>
  rows.map((row) => ({
    name: String(row.Name ?? row.name ?? row.label ?? ""),
    id: String(row.ID ?? row.id ?? row.chargerID ?? row.charger_id ?? ""),
    time: String(row.Time ?? row.time ?? row.ocpi_last_update ?? ""),
    status: row.status,
    type: row.type,
    locationId: row.location_id ? String(row.location_id) : undefined,
  }));

export const fetchOrganizations = async (): Promise<Organization[]> => {
  try {
    console.log("Fetching from:", `${API_BASE_URL}/organizations`);
    const response = await fetch(`${API_BASE_URL}/organizations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Raw API response:", data);
    
    // تأكد من أن البيانات هي array
    if (Array.isArray(data)) {
      // تحويل البيانات للتأكد من أن الأنواع صحيحة
      return data.map((org: any) => ({
        id: String(org.id || org.organization_id || ''),
        name: String(org.name || ''),
        amount: Number(org.amount || 0),
        energy: Number(org.energy || 0),
      }));
    }
    
    // إذا كانت البيانات ليست array، حاول استخراج array من object
    if (data && Array.isArray(data.data)) {
      return data.data.map((org: any) => ({
        id: String(org.id || org.organization_id || ''),
        name: String(org.name || ''),
        amount: Number(org.amount || 0),
        energy: Number(org.energy || 0),
      }));
    }
    
    console.warn("Unexpected data format:", data);
    return [];
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      console.error("❌ Cannot connect to backend API. Please check:");
      console.error(`   1. Is the API running at ${API_BASE_URL}?`);
      console.error("   2. Is the API endpoint correct?");
      console.error("   3. Check CORS settings in the backend");
      console.error("   4. Check network connectivity");
    } else {
      console.error("Error fetching organizations:", error);
    }
    return [];
  }
};

export const createOrganization = async (
  orgData: Partial<Organization> & { organization_id?: string }
): Promise<{ success: boolean; message: string; insertId?: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/organizations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orgData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || "Failed to save organization");
    }

    const result = await response.json();
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
    const response = await fetch(`${API_BASE_URL}/organizations/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orgData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update organization");
    }

    return await response.json();
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
    const response = await fetch(`${API_BASE_URL}/organizations/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete organization");
    }

    return await response.json();
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
    const response = await fetch(`${API_BASE_URL}/organizations/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
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
    console.log("Fetching organization details from:", `${API_BASE_URL}/organizations/${id}`);
    
    // Try multiple endpoint formats
    let response: Response | null = null;
    let data: any = null;
    
    // Try 1: Direct endpoint
    try {
      response = await fetch(`${API_BASE_URL}/organizations/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        data = await response.json();
        console.log("Organization details response (direct):", data);
      }
    } catch (e) {
      console.log("Direct endpoint failed, trying query parameter...");
    }
    
    // Try 2: Query parameter endpoint
    if (!data || !response?.ok) {
      try {
        response = await fetch(`${API_BASE_URL}/organizations?id=${id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (response.ok) {
          data = await response.json();
          console.log("Organization details response (query):", data);
        }
      } catch (e) {
        console.log("Query parameter endpoint failed");
      }
    }
    
    // Try 3: Details endpoint
    if (!data || !response?.ok) {
      try {
        response = await fetch(`${API_BASE_URL}/organizations/${id}/details`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        if (response.ok) {
          data = await response.json();
          console.log("Organization details response (details):", data);
        }
      } catch (e) {
        console.log("Details endpoint failed");
      }
    }

    if (!data || !response?.ok) {
      console.warn(`All endpoints failed for organization ${id}`);
      return null;
    }
    
    // Handle different response formats
    const orgData = Array.isArray(data) ? data[0] : data;
    
    if (!orgData) {
      return null;
    }
    
    return {
      name: orgData.name || "",
      name_ar: orgData.name_ar || "",
      contact_first_name: orgData.contact_first_name || "",
      contact_last_name: orgData.contact_last_name || "",
      contact_phoneNumber: orgData.contact_phoneNumber || "",
      details: orgData.details || "",
    };
  } catch (error) {
    console.error("Error fetching organization details:", error);
    return null;
  }
};

export const fetchOfflineChargers = async (): Promise<Charger[]> => {
  try {
    const data = await requestJson(`${API_BASE_URL}/chargers/offline`);
    return Array.isArray(data) ? mapChargerStatusRows(data) : [];
  } catch (error) {
    console.error("Error fetching offline chargers:", error);
    return [];
  }
};

export const fetchOnlineChargers = async (): Promise<Charger[]> => {
  try {
    const data = await requestJson(`${API_BASE_URL}/chargers/online`);
    return Array.isArray(data) ? mapChargerStatusRows(data) : [];
  } catch (error) {
    console.error("Error fetching online chargers:", error);
    return [];
  }
};

export const fetchChargersStatus = async (): Promise<{
  offline: Charger[];
  online: Charger[];
}> => {
  const candidateUrls = [
    `${API_BASE_URL}/chargers/status`,
    `${API_BASE_URL}/chargers/state`,
  ];

  for (const url of candidateUrls) {
    try {
      const data = await requestJson(url);

      if (Array.isArray(data)) {
        if (
          data.length === 2 &&
          Array.isArray(data[0]) &&
          Array.isArray(data[1])
        ) {
          return {
            offline: mapChargerStatusRows(data[0]),
            online: mapChargerStatusRows(data[1]),
          };
        }

        // If backend returned a flat array with status field
        const offline = data.filter(
          (row: any) =>
            String(row.status ?? row.Status ?? "").toLowerCase() === "offline"
        );
        const online = data.filter(
          (row: any) =>
            String(row.status ?? row.Status ?? "").toLowerCase() === "online"
        );
        if (offline.length || online.length) {
          return {
            offline: mapChargerStatusRows(offline),
            online: mapChargerStatusRows(online),
          };
        }
      }

      if (data && typeof data === "object") {
        const offline = mapChargerStatusRows(
          (data as any).offline ?? (data as any).Offline
        );
        const online = mapChargerStatusRows(
          (data as any).online ?? (data as any).Online
        );
        if (offline.length || online.length) {
          return { offline, online };
        }
      }
    } catch (error) {
      console.warn(`Status endpoint failed (${url}):`, error);
    }
  }

  // Fallback to individual endpoints
  const [offline, online] = await Promise.all([
    fetchOfflineChargers(),
    fetchOnlineChargers(),
  ]);
  return { offline, online };
};

export const fetchChargerOrganizations = async (): Promise<SelectOption[]> => {
  const candidateUrls = [
    `${API_BASE_URL}/chargers/organizations`,
    `${API_BASE_URL}/organizations/options`,
    `${API_BASE_URL}/organizations`,
  ];

  for (const url of candidateUrls) {
    try {
      const data = await requestJson(url);
      if (Array.isArray(data)) {
        return normalizeOptions(data);
      }
      if (data && Array.isArray((data as any).data)) {
        return normalizeOptions((data as any).data);
      }
    } catch (error) {
      console.warn(`Organizations endpoint failed (${url}):`, error);
    }
  }

  // Fallback: use existing fetchOrganizations
  const orgs = await fetchOrganizations();
  return orgs.map((org) => ({ value: org.id, label: org.name }));
};

export const fetchLocationsByOrg = async (
  organizationId: string
): Promise<SelectOption[]> => {
  if (!organizationId) return [];

  const candidateUrls = [
    `${API_BASE_URL}/locations?organizationId=${organizationId}`,
    `${API_BASE_URL}/locations?organization_id=${organizationId}`,
    `${API_BASE_URL}/organizations/${organizationId}/locations`,
    `${API_BASE_URL}/chargers/locations?organizationId=${organizationId}`,
  ];

  for (const url of candidateUrls) {
    try {
      const data = await requestJson(url);
      if (Array.isArray(data)) return normalizeOptions(data);
      if (data && Array.isArray((data as any).data))
        return normalizeOptions((data as any).data);
    } catch (error) {
      console.warn(`Locations endpoint failed (${url}):`, error);
    }
  }

  return [];
};

export const fetchChargersByLocation = async (
  locationId: string
): Promise<SelectOption[]> => {
  if (!locationId) return [];

  const candidateUrls = [
    `${API_BASE_URL}/chargers?locationId=${locationId}`,
    `${API_BASE_URL}/chargers?location_id=${locationId}`,
    `${API_BASE_URL}/locations/${locationId}/chargers`,
  ];

  for (const url of candidateUrls) {
    try {
      const data = await requestJson(url);
      if (Array.isArray(data)) return normalizeOptions(data);
      if (data && Array.isArray((data as any).data))
        return normalizeOptions((data as any).data);
    } catch (error) {
      console.warn(`Chargers endpoint failed (${url}):`, error);
    }
  }

  return [];
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

  const candidateUrls = [
    `${API_BASE_URL}/chargers/${chargerId}`,
    `${API_BASE_URL}/chargers/details/${chargerId}`,
  ];

  for (const url of candidateUrls) {
    try {
      const data = await requestJson(url);
      const row = Array.isArray(data) ? data[0] : data;
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
    charger_id: payload.chargerId,
    name: payload.name,
    type: payload.type,
    status: payload.status,
    max_session_time: payload.maxSessionTime,
    num_connectors: payload.numConnectors,
    description: payload.description,
    location_id: payload.locationId,
  };

  const endpoints: Array<{ url: string; method: "POST" | "PUT" }> = [
    {
      url: `${API_BASE_URL}/chargers${payload.chargerId ? `/${payload.chargerId}` : ""}`,
      method: payload.chargerId ? "PUT" : "POST",
    },
    {
      url: `${API_BASE_URL}/chargers/save`,
      method: "POST",
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await requestJson(endpoint.url, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (data) {
        const success =
          (data as any).success !== undefined ? Boolean((data as any).success) : true;
        const message =
          (data as any).message ??
          (payload.chargerId ? "Charger updated" : "Charger added");
        return { success, message };
      }
    } catch (error) {
      console.warn(`Save charger endpoint failed (${endpoint.url}):`, error);
    }
  }

  return { success: false, message: "Failed to save charger" };
};

// Connectors
export const fetchConnectorsByCharger = async (
  chargerId: string
): Promise<SelectOption[]> => {
  if (!chargerId) return [];

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
    `${API_BASE_URL}/connectors/${connectorId}`,
    `${API_BASE_URL}/connectors/details/${connectorId}`,
  ];

  for (const url of candidateUrls) {
    try {
      const data = await requestJson(url);
      const row = Array.isArray(data) ? data[0] : data;
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
    connector_id: payload.connectorId,
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

  const endpoints: Array<{ url: string; method: "POST" | "PUT" }> = [
    {
      url: `${API_BASE_URL}/connectors${payload.connectorId ? `/${payload.connectorId}` : ""}`,
      method: payload.connectorId ? "PUT" : "POST",
    },
    {
      url: `${API_BASE_URL}/connectors/save`,
      method: "POST",
    },
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await requestJson(endpoint.url, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (data) {
        const success =
          (data as any).success !== undefined ? Boolean((data as any).success) : true;
        const message =
          (data as any).message ??
          (payload.connectorId ? "Connector updated" : "Connector added");
        return { success, message };
      }
    } catch (error) {
      console.warn(`Save connector endpoint failed (${endpoint.url}):`, error);
    }
  }

  return { success: false, message: "Failed to save connector" };
};

// Tariffs
export const fetchTariffByConnector = async (
  connectorId: string
): Promise<any | null> => {
  if (!connectorId || connectorId === "__NEW_TARIFF__") return null;

  const candidateUrls = [
    `${API_BASE_URL}/tariffs?connectorId=${connectorId}`,
    `${API_BASE_URL}/connectors/${connectorId}/tariffs`,
  ];

  for (const url of candidateUrls) {
    try {
      const data = await requestJson(url);
      if (Array.isArray(data) && data.length) return data[0];
      if (data && Array.isArray((data as any).data) && (data as any).data.length)
        return (data as any).data[0];
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

  const endpoints: Array<{ url: string; method: "POST" | "PUT" }> = [
    {
      url: `${API_BASE_URL}/tariffs${payload.tariffId ? `/${payload.tariffId}` : ""}`,
      method: payload.tariffId ? "PUT" : "POST",
    },
    { url: `${API_BASE_URL}/tariffs/save`, method: "POST" },
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await requestJson(endpoint.url, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (data) {
        const success =
          (data as any).success !== undefined ? Boolean((data as any).success) : true;
        const message =
          (data as any).message ??
          (payload.tariffId ? "Tariff updated" : "Tariff added");
        return { success, message };
      }
    } catch (error) {
      console.warn(`Save tariff endpoint failed (${endpoint.url}):`, error);
    }
  }

  return { success: false, message: "Failed to save tariff" };
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
    const response = await fetch(`${API_BASE_URL}/users/leadership`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
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
