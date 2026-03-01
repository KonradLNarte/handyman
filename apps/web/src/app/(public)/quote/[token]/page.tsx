import { sql } from "drizzle-orm";
import { getDb } from "@resonansia/db";
import { verifyQuoteToken } from "@resonansia/core/src/quotes/token";
import { getActiveEventsForProject, getLabelId } from "@resonansia/core";
import { computeTotal } from "@resonansia/db";
import { calculateRotRut, type RotRutLineInput, type RotRutType } from "@resonansia/core";
import { BankIdSigning } from "./components/bankid-signing";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PublicQuotePage({ params }: Props) {
  const { token } = await params;
  const payload = verifyQuoteToken(token);

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Ogiltig länk
          </h1>
          <p className="text-gray-600">
            Denna länk är ogiltig eller har gått ut. Kontakta företaget för en ny offertlänk.
          </p>
        </div>
      </div>
    );
  }

  const db = getDb();
  const { projectId, tenantId } = payload;

  // Load tenant info
  const tenantResult = await db.execute(sql`
    SELECT n.data FROM nodes n
    JOIN labels l ON l.id = n.type_id AND l.domain = 'node_type' AND l.code = 'org'
    WHERE n.tenant_id = ${tenantId} LIMIT 1
  `);
  const tenantRows = (Array.isArray(tenantResult) ? tenantResult : (tenantResult as any).rows) as any[];
  const tenant = tenantRows[0]?.data || { name: "Företag" };

  // Load project info
  const projectResult = await db.execute(sql`
    SELECT n.data FROM nodes n
    WHERE n.id = ${projectId} AND n.tenant_id = ${tenantId}
  `);
  const projectRows = (Array.isArray(projectResult) ? projectResult : (projectResult as any).rows) as any[];
  const project = projectRows[0]?.data;

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md text-center p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Projekt hittades inte
          </h1>
        </div>
      </div>
    );
  }

  // Load customer info
  const customerResult = await db.execute(sql`
    SELECT n.data FROM edges e
    JOIN nodes n ON n.id = e.from_id AND n.tenant_id = ${tenantId}
    JOIN labels lt ON lt.id = e.type_id AND lt.domain = 'edge_type' AND lt.code = 'customer_of'
    WHERE e.to_id = ${projectId} AND e.tenant_id = ${tenantId} LIMIT 1
  `);
  const customerRows = (Array.isArray(customerResult) ? customerResult : (customerResult as any).rows) as any[];
  const customer = customerRows[0]?.data || { name: "Kund" };

  // Load quote lines
  const quoteLineTypeId = await getLabelId(db, "event_type", "quote_line", tenantId);
  const activeEvents = await getActiveEventsForProject(db, tenantId, projectId, [quoteLineTypeId]);

  const unitNames: Record<number, string> = { 1: "tim", 2: "min", 3: "m²", 4: "lm", 5: "st", 6: "kg", 7: "l" };

  const lines = activeEvents.map((ev: any) => ({
    description: ev.data?.description || "",
    qty: parseFloat(ev.qty) || 0,
    unitName: unitNames[ev.unit_id] || "st",
    unitPrice: parseFloat(ev.unit_price) || 0,
    total: computeTotal(parseFloat(ev.qty) || 0, parseFloat(ev.unit_price) || 0) || 0,
    isLabor: ev.data?.is_labor || false,
    sortOrder: ev.data?.sort_order || 0,
  }));

  lines.sort((a: any, b: any) => a.sortOrder - b.sortOrder);

  const laborTotal = lines.filter((l: any) => l.isLabor).reduce((s: number, l: any) => s + l.total, 0);
  const materialTotal = lines.filter((l: any) => !l.isLabor).reduce((s: number, l: any) => s + l.total, 0);
  const subtotal = laborTotal + materialTotal;

  // Calculate ROT/RUT if applicable
  const rotRutType: RotRutType = project.rot_applicable ? "rot" : project.rut_applicable ? "rut" : "none";
  let rotRut = null;
  if (rotRutType !== "none" && customer.rot_rut_person_number) {
    const rotRutLines: RotRutLineInput[] = lines.map((l: any) => ({
      total: l.total,
      isLabor: l.isLabor,
      rotRutType,
    }));
    rotRut = calculateRotRut(rotRutLines, 0, customer.rot_rut_person_number);
  }

  // Check if already signed
  const stateResult = await db.execute(sql`
    WITH ranked AS (
      SELECT COALESCE(e.ref_id, e.id) AS root_id, e.data,
        ROW_NUMBER() OVER (PARTITION BY COALESCE(e.ref_id, e.id) ORDER BY e.id DESC) AS rn
      FROM events e
      JOIN labels l ON l.id = e.type_id AND l.domain = 'event_type' AND l.code = 'state_change'
      WHERE e.tenant_id = ${tenantId} AND e.node_id = ${projectId}
    )
    SELECT data FROM ranked WHERE rn = 1 ORDER BY root_id DESC LIMIT 1
  `);
  const stateRows = (Array.isArray(stateResult) ? stateResult : (stateResult as any).rows) as any[];
  const currentState = stateRows[0]?.data?.to_state || "draft";
  const alreadySigned = currentState === "active";

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("sv-SE").format(Math.round(amount));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Tenant Branding */}
        <div className="text-center mb-8">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-12 mx-auto mb-2" />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          )}
          <p className="text-sm text-gray-500">Offert</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* Project Info */}
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h2>
          {project.description && (
            <p className="text-sm text-gray-600 mb-4">{project.description}</p>
          )}

          {/* Line Items */}
          <div className="border rounded-lg overflow-hidden mb-6">
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
                {lines.map((line: any, i: number) => (
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

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Arbetskostnad:</span>
              <span>{formatCurrency(laborTotal)} kr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Materialkostnad:</span>
              <span>{formatCurrency(materialTotal)} kr</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Summa exkl. moms:</span>
              <span>{formatCurrency(subtotal)} kr</span>
            </div>
          </div>

          {/* ROT/RUT Breakdown */}
          {rotRut && rotRut.deductionAmount > 0 && (
            <div className="mt-4 bg-emerald-50 rounded-lg p-4">
              <h3 className="font-semibold text-emerald-800 mb-2">
                {rotRut.deductionType === "rot" ? "ROT-avdrag" : "RUT-avdrag"}
              </h3>
              <div className="space-y-1 text-sm text-emerald-700">
                <div className="flex justify-between">
                  <span>Arbetskostnad:</span>
                  <span>{formatCurrency(rotRut.laborTotal)} kr</span>
                </div>
                <div className="flex justify-between">
                  <span>{rotRut.deductionType === "rot" ? "ROT" : "RUT"}-avdrag ({Math.round(rotRut.deductionRate * 100)}%):</span>
                  <span>-{formatCurrency(rotRut.deductionAmount)} kr</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-900 pt-2 border-t border-emerald-200">
                  <span>Att betala:</span>
                  <span>{formatCurrency(rotRut.customerPays)} kr</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BankID Signing */}
        {alreadySigned ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-green-800 font-semibold">Offerten är redan signerad</p>
            <p className="text-green-600 text-sm mt-1">Tack för din bekräftelse!</p>
          </div>
        ) : (
          <BankIdSigning
            token={token}
            projectId={projectId}
            tenantId={tenantId}
            personNumber={customer.rot_rut_person_number}
          />
        )}
      </div>
    </div>
  );
}
