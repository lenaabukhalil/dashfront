
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
  /** Present when returned from status APIs; omitted rows treated as enabled in UI. */
  enabled?: boolean | 0 | 1;
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
