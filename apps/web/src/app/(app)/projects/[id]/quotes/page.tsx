import { sql } from "drizzle-orm";
import { getDb } from "@resonansia/db";
import { computeTotal } from "@resonansia/db";
import {
  getDraftProposal,
  getLabelId,
  getActiveEventsForProject,
} from "@resonansia/core";
import { getTenantId } from "@/lib/supabase-server";
import {
  generateQuoteAction,
  approveQuoteAction,
  sendQuoteAction,
} from "@/app/actions/quotes";
import { rejectProposal } from "@resonansia/core";
import { ProposalEditor } from "../components/proposal-editor";
import { QuoteActions } from "./quote-actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function QuotesPage({ params }: Props) {
  const { id: projectId } = await params;
  const tenantId = await getTenantId();
  const db = getDb();

  // Check for draft proposal
  const draftProposal = await getDraftProposal(db, tenantId, projectId, "quote");

  // Get project info for ROT/RUT
  const projectResult = await db.execute(sql`
    SELECT n.data FROM nodes n WHERE n.id = ${projectId} AND n.tenant_id = ${tenantId}
  `);
  const projectRows = (Array.isArray(projectResult) ? projectResult : (projectResult as any).rows) as any[];
  const project = projectRows[0]?.data;

  const customerResult = await db.execute(sql`
    SELECT n.data FROM edges e
    JOIN nodes n ON n.id = e.from_id AND n.tenant_id = ${tenantId}
    JOIN labels lt ON lt.id = e.type_id AND lt.domain = 'edge_type' AND lt.code = 'customer_of'
    WHERE e.to_id = ${projectId} AND e.tenant_id = ${tenantId} LIMIT 1
  `);
  const customerRows = (Array.isArray(customerResult) ? customerResult : (customerResult as any).rows) as any[];
  const customer = customerRows[0]?.data;

  const rotRutType = project?.rot_applicable
    ? ("rot" as const)
    : project?.rut_applicable
      ? ("rut" as const)
      : ("none" as const);

  // Load approved quote lines
  const quoteLineTypeId = await getLabelId(db, "event_type", "quote_line", tenantId);
  const approvedQuoteEvents = await getActiveEventsForProject(db, tenantId, projectId, [quoteLineTypeId]);

  const unitNames: Record<number, string> = { 1: "tim", 2: "min", 3: "m²", 4: "lm", 5: "st", 6: "kg", 7: "l" };

  const approvedLines = approvedQuoteEvents.map((ev: any) => ({
    description: ev.data?.description || "",
    qty: parseFloat(ev.qty) || 0,
    unitName: unitNames[ev.unit_id] || "st",
    unitPrice: parseFloat(ev.unit_price) || 0,
    total: computeTotal(parseFloat(ev.qty) || 0, parseFloat(ev.unit_price) || 0) || 0,
    isLabor: ev.data?.is_labor || false,
    sortOrder: ev.data?.sort_order || 0,
  }));

  approvedLines.sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("sv-SE").format(Math.round(amount));

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Offert</h1>

      {/* Draft Proposal View */}
      {draftProposal && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-violet-100 text-violet-700 text-xs font-medium px-2 py-1 rounded">
              AI-genererad offert
            </span>
            <span className="text-sm text-gray-500">
              Modell: {draftProposal.aiModel}
            </span>
          </div>

          <ProposalEditor
            proposal={draftProposal}
            rotRutType={rotRutType}
            personNumber={customer?.rot_rut_person_number}
            onApprove={async (proposalId: string) => {
              "use server";
              await approveQuoteAction(proposalId, projectId);
            }}
            onReject={async (proposalId: string) => {
              "use server";
              const db = getDb();
              const tenantId = await getTenantId();
              await rejectProposal(db, tenantId, proposalId);
            }}
            type="quote"
          />
        </div>
      )}

      {/* Approved Quote View */}
      {approvedLines.length > 0 && !draftProposal && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Godkänd offert</h2>

          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Beskrivning</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">Antal</th>
                  <th className="text-center px-2 py-2 font-medium text-gray-500">Enhet</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">À-pris</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">Belopp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {approvedLines.map((line: any, i: number) => (
                  <tr key={i} className={line.isLabor ? "bg-violet-50/50" : ""}>
                    <td className="px-4 py-2">{line.description}</td>
                    <td className="text-right px-4 py-2">{line.qty}</td>
                    <td className="text-center px-2 py-2">{line.unitName}</td>
                    <td className="text-right px-4 py-2">{formatCurrency(line.unitPrice)}</td>
                    <td className="text-right px-4 py-2 font-medium">{formatCurrency(line.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Arbetskostnad:</span>
              <span>
                {formatCurrency(approvedLines.filter((l: any) => l.isLabor).reduce((s: number, l: any) => s + l.total, 0))} kr
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Materialkostnad:</span>
              <span>
                {formatCurrency(approvedLines.filter((l: any) => !l.isLabor).reduce((s: number, l: any) => s + l.total, 0))} kr
              </span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Summa:</span>
              <span>
                {formatCurrency(approvedLines.reduce((s: number, l: any) => s + l.total, 0))} kr
              </span>
            </div>
          </div>

          <QuoteActions projectId={projectId} />
        </div>
      )}

      {/* No Quote Yet */}
      {approvedLines.length === 0 && !draftProposal && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-gray-600 mb-4">Ingen offert skapad ännu</p>
          <form
            action={async () => {
              "use server";
              await generateQuoteAction(projectId);
            }}
          >
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Generera offert
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
