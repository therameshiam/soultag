export enum TagStatus {
  NEW = 'new',
  ACTIVE = 'found', // Keeping 'found' to match the prompt's API spec, though 'active' is the logical state
  INACTIVE = 'inactive'
}

export interface TagData {
  tagId: string;
  status: TagStatus;
  itemName?: string;
  ownerPhone?: string;
  redirectUrl?: string; // Used for security masking
}

export interface ActivationPayload {
  tagId: string;
  itemName: string;
  ownerPhone: string;
}

export interface DashboardStat {
  name: string;
  value: number;
}

export interface MonthlyActivity {
  month: string;
  activations: number;
  scans: number;
}
