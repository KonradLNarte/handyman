import { notFound } from "next/navigation";
import { getDb } from "@resonansia/db";
import {
  getNode,
  calculateProjectEconomics,
  getActiveEventsForProject,
  getRelatedNodes,
  getLabelId,
  getLabelCode,
} from "@resonansia/core";
import { getTenantId } from "@/lib/supabase-server";
import { formatSEK } from "@/lib/format";
import { TimeForm } from "./components/time-form";
import { MaterialForm } from "./components/material-form";
import { CorrectionForm } from "./components/correction-form";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = await getTenantId();
  const db = getDb();

  const project = await getNode(db, tenantId, id);
  if (!project) {
    notFound();
  }

  const data = project.data as {
    name?: string;
    description?: string;
  };

  const economics = await calculateProjectEconomics(db, tenantId, id);
  const activeEvents = await getActiveEventsForProject(db, tenantId, id);
  const assignedPersons = await getRelatedNodes(
    db,
    tenantId,
    id,
    "assigned_to",
    "incoming"
  );

  // Resolve event type codes for display
  const eventTypeNames = new Map<number, string>();
  for (const event of activeEvents) {
    if (!eventTypeNames.has(event.type_id)) {
      try {
        const { code } = await getLabelCode(db, event.type_id, tenantId);
        eventTypeNames.set(event.type_id, code);
      } catch {
        eventTypeNames.set(event.type_id, "unknown");
      }
    }
  }

  const actualCost = economics.timeCost + economics.materialCost;

  // Sort events newest first
  const sortedEvents = [...activeEvents].sort((a, b) =>
    b.id.localeCompare(a.id)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{data?.name ?? "Projekt"}</h1>
        {data?.description && (
          <p className="text-gray-600 mt-1">{data.description}</p>
        )}
      </div>

      {/* Economics summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Offererat</div>
          <div className="text-xl font-mono font-bold mt-1">
            {formatSEK(economics.quotedTotal)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Faktisk kostnad</div>
          <div className="text-xl font-mono font-bold mt-1">
            {formatSEK(actualCost)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Marginal</div>
          <div className="text-xl font-mono font-bold mt-1">
            {formatSEK(economics.margin)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Fakturerat</div>
          <div className="text-xl font-mono font-bold mt-1">
            {formatSEK(economics.invoicedTotal)}
          </div>
        </div>
      </div>

      {/* Forms */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Registrera tid</h2>
          <TimeForm projectId={id} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Registrera material</h2>
          <MaterialForm projectId={id} />
        </div>
      </div>

      {/* Assigned persons */}
      {assignedPersons.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Tilldelade</h2>
          <ul className="space-y-1">
            {assignedPersons.map((person) => {
              const pd = person.data as { name?: string };
              return (
                <li key={person.id} className="text-sm text-gray-700">
                  {pd?.name ?? "Okänd"}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Event timeline */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Händelser</h2>
        {sortedEvents.length === 0 ? (
          <p className="text-gray-500 text-sm">Inga händelser ännu.</p>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map((event) => {
              const typeName = eventTypeNames.get(event.type_id) ?? "event";
              const total = event.total ? parseFloat(event.total) : 0;
              const qty = event.qty ? parseFloat(event.qty) : 0;
              const unitPrice = event.unit_price
                ? parseFloat(event.unit_price)
                : 0;
              const eventData = event.data as Record<string, unknown> | null;

              return (
                <div
                  key={event.id}
                  className="flex items-start justify-between border-b pb-3 last:border-b-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded font-medium uppercase">
                        {typeName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(event.occurred_at).toLocaleDateString("sv-SE")}
                      </span>
                      {event.root_id !== event.id && (
                        <span className="text-xs text-orange-500">(korrigering)</span>
                      )}
                    </div>
                    {qty > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        {qty} x {formatSEK(unitPrice)}
                      </p>
                    )}
                    {eventData?.note ? (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {String(eventData.note)}
                      </p>
                    ) : null}
                    {eventData?.description ? (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {String(eventData.description)}
                      </p>
                    ) : null}
                    {eventData?.reason ? (
                      <p className="text-sm text-gray-500 mt-0.5">
                        Orsak: {String(eventData.reason)}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">
                      {total > 0 ? formatSEK(total) : "—"}
                    </div>
                    {event.root_id === event.id && (
                      <CorrectionForm
                        eventId={event.id}
                        projectId={id}
                        currentQty={qty}
                        currentUnitPrice={unitPrice}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
