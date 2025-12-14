import type { Organization, Charger, User } from "@/types";

export const USE_MOCKS = true;

// Mock data
const mockOrganizations: Organization[] = [
  { id: "ORG-001", name: "ION Energy", amount: 15420.50, energy: 8234.5 },
  { id: "ORG-002", name: "Green Charge", amount: 8920.75, energy: 4520.3 },
  { id: "ORG-003", name: "EV Power Hub", amount: 12350.00, energy: 6890.2 },
  { id: "ORG-004", name: "ChargePoint UAE", amount: 5670.25, energy: 2340.8 },
  { id: "ORG-005", name: "Electra Motors", amount: 9800.00, energy: 5120.0 },
];

const mockOfflineChargers: Charger[] = [
  { name: "Station Alpha", id: "CHG-001", time: "2h 30m ago" },
  { name: "Hub Beta", id: "CHG-004", time: "45m ago" },
  { name: "Point Delta", id: "CHG-007", time: "1h 15m ago" },
];

const mockOnlineChargers: Charger[] = [
  { name: "Station Gamma", id: "CHG-002", time: "Active" },
  { name: "Hub Epsilon", id: "CHG-003", time: "Active" },
  { name: "Point Zeta", id: "CHG-005", time: "Active" },
  { name: "Station Eta", id: "CHG-006", time: "Active" },
  { name: "Hub Theta", id: "CHG-008", time: "Active" },
  { name: "Point Iota", id: "CHG-009", time: "Active" },
];

const mockLeadershipUsers: User[] = [
  { firstName: "Ahmed", lastName: "Al-Rashid", count: 45, mobile: "+971501234567", energy: 1234.5, amount: 2450.00 },
  { firstName: "Sara", lastName: "Mohammed", count: 38, mobile: "+971502345678", energy: 980.3, amount: 1890.50 },
  { firstName: "Omar", lastName: "Hassan", count: 62, mobile: "+971503456789", energy: 2100.8, amount: 4200.25 },
  { firstName: "Fatima", lastName: "Ali", count: 29, mobile: "+971504567890", energy: 650.2, amount: 1320.00 },
  { firstName: "Khalid", lastName: "Ibrahim", count: 51, mobile: "+971505678901", energy: 1560.0, amount: 3100.75 },
];

// API functions
export async function fetchOrganizations(): Promise<Organization[]> {
  if (USE_MOCKS) {
    return Promise.resolve(mockOrganizations);
  }
  // Real API call would go here
  const response = await fetch("/api/organizations");
  return response.json();
}

export async function fetchOfflineChargers(): Promise<Charger[]> {
  if (USE_MOCKS) {
    return Promise.resolve(mockOfflineChargers);
  }
  const response = await fetch("/api/chargers/offline");
  return response.json();
}

export async function fetchOnlineChargers(): Promise<Charger[]> {
  if (USE_MOCKS) {
    return Promise.resolve(mockOnlineChargers);
  }
  const response = await fetch("/api/chargers/online");
  return response.json();
}

export async function fetchLeadershipUsers(): Promise<User[]> {
  if (USE_MOCKS) {
    return Promise.resolve(mockLeadershipUsers);
  }
  const response = await fetch("/api/users/leadership");
  return response.json();
}

// Dropdown options
export const organizationOptions = [
  { value: "org-1", label: "ION Energy" },
  { value: "org-2", label: "Green Charge" },
  { value: "org-3", label: "EV Power Hub" },
];

export const locationOptions = [
  { value: "loc-1", label: "Gravity Gate" },
  { value: "loc-2", label: "North Ajman" },
  { value: "loc-3", label: "South Location" },
];

export const chargerOptions = [
  { value: "chg-1", label: "ION PRIME - 07" },
  { value: "chg-2", label: "ION PRIME - 08" },
  { value: "chg-3", label: "ION FAST - 01" },
];

export const connectorOptions = [
  { value: "con-1", label: "GBT AC" },
  { value: "con-2", label: "CCS2" },
  { value: "con-3", label: "CHAdeMO" },
];

export const peakTypeOptions = [
  { value: "peak", label: "Peak" },
  { value: "off-peak", label: "Off-Peak" },
  { value: "standard", label: "Standard" },
];

export const periodOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const paymentOptions = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "wallet", label: "Wallet" },
];

export const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "operator", label: "Operator" },
  { value: "viewer", label: "Viewer" },
];

export const languageOptions = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
];

export const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const ocpiFormatOptions = [
  { value: "cable", label: "CABLE" },
  { value: "socket", label: "SOCKET" },
];

export const ocpiStandardOptions = [
  { value: "iec_62196_t1", label: "IEC_62196_T1" },
  { value: "iec_62196_t2", label: "IEC_62196_T2" },
  { value: "iec_62196_t3", label: "IEC_62196_T3" },
  { value: "chademo", label: "CHADEMO" },
  { value: "ccs", label: "CCS" },
];

export const connectorTypeOptions = [
  { value: "type1", label: "Type 1" },
  { value: "type2", label: "Type 2" },
  { value: "ccs1", label: "CCS1" },
  { value: "ccs2", label: "CCS2" },
  { value: "chademo", label: "CHAdeMO" },
  { value: "gbt", label: "GB/T" },
];

export const powerUnitOptions = [
  { value: "kw", label: "KW" },
  { value: "kwh", label: "KWH" },
];
