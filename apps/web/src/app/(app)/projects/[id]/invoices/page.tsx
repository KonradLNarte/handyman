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
  generateInvoiceAction,
  approveInvoiceAction,
  submitRotRutAction,
} from "@/app/actions/invoicing";
import { rejectProposal } from "@resonansia/core";
import { ProposalEditor } from "../components/proposal-editor";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoicesPage({ params }: Props) {
  const { id: projectId } = await params;
  const tenantId = await getTenantId();
  const db = getDb();

  // Check for draft invoice proposal
  const draftProposal = await getDraftProposal(db, tenantId, projectId, "invoice");

  // Get project and customer info
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

  // Load approved invoice lines
  const invoiceLineTypeId = await getLabelId(db, "event_type", "invoice_line", tenantId);
  const approvedInvoiceEvents = await getActiveEventsForProject(db, tenantId, projectId, [invoiceLineTypeId]);

  const unitNames: Record<number, string> = { 1: "tim", 2: "min", 3: "m²", 4: "lm", 5: "st", 6: "kg", 7: "l" };

  const approvedLines = approvedInvoiceEvents.map((ev: any) => ({
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

  // Check if ROT/RUT is applicable
  const hasRotRut = rotRutType !== "none" && customer?.rot_rut_person_number;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Faktura</h1>

      {/* Draft Invoice Proposal */}
      {draftProposal && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded">
              Fakturutkast
            </span>
          </div>

          <ProposalEditor
            proposal={draftProposal}
            rotRutType={rotRutType}
            personNumber={customer?.rot_rut_person_number}
            onApprove={async (proposalId: string) => {
              "use server";
              await approveInvoiceAction(proposalId, projectId);
            }}
            onReject={async (proposalId: string) => {
              "use server";
              const db = getDb();
              const tenantId = await getTenantId();
              await rejectProposal(db, tenantId, proposalId);
            }}
            type="invoice"
          />
        </div>
      )}

      {/* Approved Invoice View */}
      {approvedLines.length > 0 && !draftProposal && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Godkänd faktura</h2>

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
            <div className="flex justify-between font-semibold pt-2">
              <span>Summa:</span>
              <span>
                {formatCurrency(approvedLines.reduce((s: number, l: any) => s + l.total, 0))} kr
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t flex gap-3">
            <a
              href={`/api/pdf/invoice/${projectId}?download=true`}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Ladda ner PDF
            </a>
            {hasRotRut && (
              <form
                action={async () => {
                  "use server";
                  await submitRotRutAction(projectId);
                }}
              >
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Skicka ROT/RUT-ansökan
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* No Invoice Yet */}
      {approvedLines.length === 0 && !draftProposal && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-gray-600 mb-4">Ingen faktura skapad ännu</p>
          <form
            action={async () => {
              "use server";
              await generateInvoiceAction(projectId);
            }}
          >
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Generera faktura
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
