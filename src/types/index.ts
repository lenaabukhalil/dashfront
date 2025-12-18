// Types for all pages

export interface Organization {
  id: string;
  name: string;
  amount: number;
  energy: number;
}

export interface Charger {
  name: string;
  id: string;
  time: string;
  status?: string;
  type?: string;
  locationId?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface Connector {
  connectorId: string;
  connectorType: string;
  status: string;
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

export interface TariffRow {
  tariff_id?: string;
  type: string;
  buy_rate: number;
  sell_rate: number;
  transaction_fees?: number;
  client_percentage?: number;
  partner_percentage?: number;
  peak_type?: string;
  status?: string;
  created_at?: string;
}

export interface Tariff {
  organizationId: string;
  locationId: string;
  chargerId: string;
  connectorId: string;
  peakType: string;
  tariffIdPk: string;
  tariffIdCounter: string;
  buyRate: number;
  sellRate: number;
  transactionFees: number;
  clientPercentage: number;
  partnerPercentage: number;
  status: string;
}

export interface User {
  firstName: string;
  lastName: string;
  count: number;
  mobile: string;
  energy: number;
  amount: number;
}

export interface PartnerUser {
  organizationId: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  roles: string;
  language: string;
}

export interface FinancialReport {
  organizationId: string;
  connectorId: string;
  locationId: string;
  period: string;
  payment: string;
  chargerId: string;
  fromDate: string;
  toDate: string;
}
