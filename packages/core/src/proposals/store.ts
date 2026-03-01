import { eq, and } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { proposals } from "@resonansia/db";
import { generateId } from "@resonansia/shared";
import { computeTotal } from "@resonansia/db";
import { calculateRotRut } from "../economics/rot-rut";
import type { RotRutLineInput } from "../economics/rot-rut";
import type {
  TransientProposal,
  ProposalLine,
} from "@resonansia/shared";

/**
 * Recomputes all line totals and ROT/RUT from current line values.
 * INVARIANT: proposal_lines_recomputed — never trust stored totals.
 */
function recomputeProposal(proposal: TransientProposal): TransientProposal {
  const lines = proposal.lines.map((line) => ({
    ...line,
    total: computeTotal(line.qty, line.unitPrice) ?? 0,
  }));

  // Determine ROT/RUT type from project context
  const rotRutType =
    proposal.rotRut?.deductionType ?? "none";

  if (rotRutType !== "none") {
    const rotRutLines: RotRutLineInput[] = lines.map((line) => ({
      total: line.total,
      isLabor: line.isLabor,
      rotRutType,
    }));
    const rotRut = calculateRotRut(
      rotRutLines,
      proposal.rotRut?.remainingAllowance !== undefined
        ? (proposal.rotRut.deductionAmount + proposal.rotRut.remainingAllowance) -
          (proposal.rotRut.remainingAllowance + proposal.rotRut.deductionAmount) +
          0
        : 0,
      "",
    );
    return { ...proposal, lines, rotRut };
  }

  return { ...proposal, lines };
}

function dbRowToProposal(row: any): TransientProposal {
  const data = row.data as any;
  const proposal: TransientProposal = {
    id: row.id,
    tenantId: row.tenant_id,
    projectId: row.project_id,
    type: row.type,
    status: row.status,
    createdAt: new Date(row.created_at),
    createdBy: row.created_by,
    lines: data.lines || [],
    rotRut: data.rotRut,
    deviations: data.deviations,
    aiModel: data.aiModel || "",
    aiContextSummary: data.aiContextSummary || "",
    reasoning: data.reasoning,
  };
  // Recompute on load
  return recomputeProposal(proposal);
}

export async function createProposal(
  db: PgDatabase<any>,
  proposal: TransientProposal
): Promise<TransientProposal> {
  const id = proposal.id || generateId();
  const data = {
    lines: proposal.lines,
    rotRut: proposal.rotRut,
    deviations: proposal.deviations,
    aiModel: proposal.aiModel,
    aiContextSummary: proposal.aiContextSummary,
    reasoning: proposal.reasoning,
  };

  await db.insert(proposals).values({
    id,
    tenant_id: proposal.tenantId,
    project_id: proposal.projectId,
    type: proposal.type,
    status: "draft",
    data,
    created_by: proposal.createdBy,
    created_at: proposal.createdAt,
  });

  return { ...proposal, id, status: "draft" };
}

export async function getProposal(
  db: PgDatabase<any>,
  tenantId: string,
  proposalId: string
): Promise<TransientProposal | null> {
  const [row] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.tenant_id, tenantId)));

  if (!row) return null;
  return dbRowToProposal(row);
}

export async function getDraftProposal(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string,
  type: "quote" | "invoice"
): Promise<TransientProposal | null> {
  const [row] = await db
    .select()
    .from(proposals)
    .where(
      and(
        eq(proposals.tenant_id, tenantId),
        eq(proposals.project_id, projectId),
        eq(proposals.type, type),
        eq(proposals.status, "draft")
      )
    );

  if (!row) return null;
  return dbRowToProposal(row);
}

export async function updateProposalLine(
  db: PgDatabase<any>,
  tenantId: string,
  proposalId: string,
  lineIndex: number,
  updates: Partial<ProposalLine>
): Promise<TransientProposal | null> {
  const proposal = await getProposal(db, tenantId, proposalId);
  if (!proposal || proposal.status !== "draft") return null;

  const line = proposal.lines[lineIndex];
  if (!line) return null;

  proposal.lines[lineIndex] = { ...line, ...updates };

  // Recompute totals
  const recomputed = recomputeProposal(proposal);

  const data = {
    lines: recomputed.lines,
    rotRut: recomputed.rotRut,
    deviations: recomputed.deviations,
    aiModel: recomputed.aiModel,
    aiContextSummary: recomputed.aiContextSummary,
    reasoning: recomputed.reasoning,
  };

  await db
    .update(proposals)
    .set({ data })
    .where(and(eq(proposals.id, proposalId), eq(proposals.tenant_id, tenantId)));

  return recomputed;
}

export async function rejectProposal(
  db: PgDatabase<any>,
  tenantId: string,
  proposalId: string
): Promise<void> {
  await db
    .update(proposals)
    .set({ status: "rejected" })
    .where(and(eq(proposals.id, proposalId), eq(proposals.tenant_id, tenantId)));
}

export async function markProposalApproved(
  db: PgDatabase<any>,
  tenantId: string,
  proposalId: string
): Promise<void> {
  await db
    .update(proposals)
    .set({ status: "approved" })
    .where(and(eq(proposals.id, proposalId), eq(proposals.tenant_id, tenantId)));
}
