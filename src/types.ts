export interface Project {
  id: string;
  projectNumber?: string | null;
  name: string;
  clientName: string;
  gcName?: string | null;
  address: string;
  bidDate?: string | null;
  dueDate?: string | null;
  projectType?: string | null;
  estimator?: string | null;
  status: string;
  createdDate: string;
  settings: Record<string, unknown>;
  proposalSettings: Record<string, unknown>;
  scopes: unknown[];
  rooms: unknown[];
  bundles: unknown[];
  alternates: unknown[];
  lines: unknown[];
}

export interface CatalogItem {
  id: string;
  sku: string;
  category: string;
  subcategory?: string | null;
  family?: string | null;
  description: string;
  manufacturer?: string | null;
  model?: string | null;
  uom: string;
  baseMaterialCost: number;
  baseLaborMinutes: number;
  laborUnitType?: string | null;
  taxable: boolean;
  adaFlag: boolean;
  tags: string[];
  notes?: string | null;
  active: boolean;
}
