import { notFound } from "next/navigation";
import Link from "next/link";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab ?? "timeline";
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
  const actualCost = economics.timeCost + economics.materialCost;

  const tabs = [
    { key: "timeline", label: "Tidslinje" },
    { key: "messages", label: "Meddelanden" },
    { key: "photos", label: "Foton" },
    { key: "people", label: "Personer" },
    { key: "economics", label: "Ekonomi" },
  ];

  return (
    <div className="space-y-6">
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/projects/${id}?tab=${t.key}`}
              className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "timeline" && (
        <TimelineTab projectId={id} tenantId={tenantId} />
      )}
      {activeTab === "messages" && (
        <MessagesTab projectId={id} tenantId={tenantId} />
      )}
      {activeTab === "photos" && (
        <PhotosTab projectId={id} tenantId={tenantId} />
      )}
      {activeTab === "people" && (
        <PeopleTab projectId={id} tenantId={tenantId} />
      )}
      {activeTab === "economics" && (
        <EconomicsTab projectId={id} tenantId={tenantId} economics={economics} />
      )}
    </div>
  );
}

async function TimelineTab({
  projectId,
  tenantId,
}: {
  projectId: string;
  tenantId: string;
}) {
  const db = getDb();
  const activeEvents = await getActiveEventsForProject(db, tenantId, projectId);

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

  const sortedEvents = [...activeEvents].sort((a, b) =>
    b.id.localeCompare(a.id)
  );

  return (
    <>
      {/* Forms */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Registrera tid</h2>
          <TimeForm projectId={projectId} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Registrera material</h2>
          <MaterialForm projectId={projectId} />
        </div>
      </div>

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
                        projectId={projectId}
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
    </>
  );
}

async function MessagesTab({
  projectId,
  tenantId,
}: {
  projectId: string;
  tenantId: string;
}) {
  const db = getDb();

  // Fetch message events for this project
  let messageTypeId: number;
  try {
    messageTypeId = await getLabelId(db, "event_type", "message", tenantId);
  } catch {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-gray-500 text-sm">Inga meddelanden ännu.</p>
      </div>
    );
  }

  const messageEvents = await getActiveEventsForProject(db, tenantId, projectId, [
    messageTypeId,
  ]);

  // Sort by occurred_at ascending (chronological)
  const sorted = [...messageEvents].sort((a, b) =>
    a.id.localeCompare(b.id)
  );

  // Resolve actor names
  const actorNames = new Map<string, string>();
  for (const msg of sorted) {
    if (msg.actor_id && !actorNames.has(msg.actor_id)) {
      const actor = await getNode(db, tenantId, msg.actor_id);
      if (actor) {
        const actorData = actor.data as Record<string, unknown>;
        actorNames.set(msg.actor_id, (actorData.name as string) || "Unknown");
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {sorted.length === 0 ? (
        <div className="p-4">
          <p className="text-gray-500 text-sm">Inga meddelanden ännu.</p>
        </div>
      ) : (
        <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
          {sorted.map((msg) => {
            const msgData = msg.data as Record<string, unknown> | null;
            const direction = msgData?.direction as string;
            const text = (msgData?.text as string) || "";
            const channel = (msgData?.channel as string) || "";
            const isInbound = direction === "inbound";
            const senderName = msg.actor_id
              ? actorNames.get(msg.actor_id) || "Unknown"
              : "System";

            return (
              <div
                key={msg.id}
                className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    isInbound
                      ? "bg-gray-100 text-gray-900"
                      : "bg-blue-500 text-white"
                  }`}
                >
                  {isInbound && (
                    <div
                      className={`text-xs font-medium mb-1 ${
                        isInbound ? "text-gray-500" : "text-blue-100"
                      }`}
                    >
                      {senderName}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{text}</p>
                  <div
                    className={`text-xs mt-1 ${
                      isInbound ? "text-gray-400" : "text-blue-100"
                    }`}
                  >
                    {new Date(msg.occurred_at).toLocaleString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                    {channel && ` via ${channel}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function PhotosTab({
  projectId,
  tenantId,
}: {
  projectId: string;
  tenantId: string;
}) {
  const db = getDb();

  let photoTypeId: number;
  try {
    photoTypeId = await getLabelId(db, "event_type", "photo", tenantId);
  } catch {
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <p className="text-gray-500 text-sm">Inga foton ännu.</p>
      </div>
    );
  }

  const photoEvents = await getActiveEventsForProject(db, tenantId, projectId, [
    photoTypeId,
  ]);

  // Resolve actor names
  const actorNames = new Map<string, string>();
  for (const photo of photoEvents) {
    if (photo.actor_id && !actorNames.has(photo.actor_id)) {
      const actor = await getNode(db, tenantId, photo.actor_id);
      if (actor) {
        const actorData = actor.data as Record<string, unknown>;
        actorNames.set(photo.actor_id, (actorData.name as string) || "Unknown");
      }
    }
  }

  // Sort newest first
  const sorted = [...photoEvents].sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      {sorted.length === 0 ? (
        <p className="text-gray-500 text-sm">Inga foton ännu.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map((photo) => {
            const photoData = photo.data as Record<string, unknown> | null;
            const url = (photoData?.url as string) || "";
            const caption = (photoData?.caption as string) || "";
            const senderName = photo.actor_id
              ? actorNames.get(photo.actor_id) || ""
              : "";

            return (
              <div
                key={photo.id}
                className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200"
              >
                {url ? (
                  <div className="aspect-square bg-gray-200 flex items-center justify-center">
                    <img
                      src={url}
                      alt={caption || "Project photo"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-200 flex items-center justify-center text-gray-400">
                    No image
                  </div>
                )}
                <div className="p-2">
                  {caption && (
                    <p className="text-sm text-gray-700 truncate">{caption}</p>
                  )}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">
                      {new Date(photo.occurred_at).toLocaleDateString("sv-SE")}
                    </span>
                    {senderName && (
                      <span className="text-xs text-gray-400">{senderName}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function PeopleTab({
  projectId,
  tenantId,
}: {
  projectId: string;
  tenantId: string;
}) {
  const db = getDb();
  const assignedPersons = await getRelatedNodes(
    db,
    tenantId,
    projectId,
    "assigned_to",
    "incoming"
  );

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-3">Tilldelade</h2>
      {assignedPersons.length === 0 ? (
        <p className="text-gray-500 text-sm">Inga tilldelade personer.</p>
      ) : (
        <ul className="space-y-2">
          {assignedPersons.map((person) => {
            const pd = person.data as {
              name?: string;
              contact?: { phone?: string; email?: string };
              language?: string;
              role?: string;
            };
            return (
              <li
                key={person.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {pd?.name ?? "Okänd"}
                  </p>
                  {pd?.role && (
                    <p className="text-xs text-gray-500">{pd.role}</p>
                  )}
                </div>
                <div className="text-right text-xs text-gray-400">
                  {pd?.contact?.phone && <p>{pd.contact.phone}</p>}
                  {pd?.language && pd.language !== "sv" && (
                    <p className="uppercase">{pd.language}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EconomicsTab({
  projectId,
  tenantId,
  economics,
}: {
  projectId: string;
  tenantId: string;
  economics: {
    quotedTotal: number;
    timeCost: number;
    materialCost: number;
    invoicedTotal: number;
    margin: number;
    marginPercent: number;
  };
}) {
  const actualCost = economics.timeCost + economics.materialCost;

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-lg font-semibold">Ekonomisk sammanfattning</h2>
      <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
        <div className="text-gray-500">Offererat</div>
        <div className="font-mono text-right">{formatSEK(economics.quotedTotal)}</div>

        <div className="text-gray-500">Tid</div>
        <div className="font-mono text-right">{formatSEK(economics.timeCost)}</div>

        <div className="text-gray-500">Material</div>
        <div className="font-mono text-right">{formatSEK(economics.materialCost)}</div>

        <div className="text-gray-500 font-medium">Faktisk kostnad</div>
        <div className="font-mono text-right font-medium">{formatSEK(actualCost)}</div>

        <div className="text-gray-500 font-medium">Marginal</div>
        <div className="font-mono text-right font-medium">
          {formatSEK(economics.margin)} ({economics.marginPercent.toFixed(1)}%)
        </div>

        <div className="text-gray-500">Fakturerat</div>
        <div className="font-mono text-right">{formatSEK(economics.invoicedTotal)}</div>
      </div>
    </div>
  );
}
