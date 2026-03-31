import { Project, CatalogItem } from '../types.js';

export interface EstimateResult {
  projectId: string;
  materialTotal: number;
  laborTotal: number;
  total: number;
  lines: EstimateLine[];
}

export interface EstimateLine {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  materialCost: number;
  laborMinutes: number;
  totalMaterial: number;
  totalLaborMinutes: number;
}

export function calculateEstimate(project: Project, catalog: CatalogItem[]): EstimateResult {
  const catalogBySku = new Map(catalog.map((item) => [item.sku, item]));

  const lines: EstimateLine[] = (project.lines as Array<Record<string, unknown>>).map((line) => {
    const sku = String(line.sku ?? '');
    const qty = Number(line.quantity ?? line.qty ?? 0);
    const catalogItem = catalogBySku.get(sku);

    const materialCost = catalogItem ? catalogItem.baseMaterialCost : Number(line.materialCost ?? 0);
    const laborMinutes = catalogItem ? catalogItem.baseLaborMinutes : Number(line.laborMinutes ?? 0);

    return {
      id: String(line.id ?? ''),
      description: catalogItem ? catalogItem.description : String(line.description ?? sku),
      quantity: qty,
      unit: catalogItem ? catalogItem.uom : String(line.uom ?? 'EA'),
      materialCost,
      laborMinutes,
      totalMaterial: materialCost * qty,
      totalLaborMinutes: laborMinutes * qty,
    };
  });

  const materialTotal = lines.reduce((sum, l) => sum + l.totalMaterial, 0);
  const laborTotal = lines.reduce((sum, l) => sum + l.totalLaborMinutes, 0);

  return {
    projectId: project.id,
    materialTotal,
    laborTotal,
    // Total reflects material costs only; labor is expressed in minutes and converted separately.
    total: materialTotal,
    lines,
  };
}
