import type { RotRutResult, RotRutType } from "./rot-rut";

export interface TransientProposal {
  id: string;
  tenantId: string;
  projectId: string;
  type: "quote" | "invoice";
  status: "draft" | "approved" | "rejected";
  createdAt: Date;
  createdBy: string;
  lines: ProposalLine[];
  rotRut?: RotRutResult;
  deviations?: Deviation[];
  aiModel: string;
  aiContextSummary: string;
  reasoning?: string;
}

export interface ProposalLine {
  tempId: string;
  description: string;
  qty: number;
  unitId: number;
  unitPrice: number;
  total: number; // COMPUTED by system: qty × unitPrice
  isLabor: boolean;
  vatRate: number;
  sortOrder: number;
  catalogProductId?: string;
  quoteLineRef?: string; // for invoice: which quote_line event
}

export interface Deviation {
  field: string;
  message: string;
  quotedValue: number;
  actualValue: number;
  percentageDiff: number;
}
