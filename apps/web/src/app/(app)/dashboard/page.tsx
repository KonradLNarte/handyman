import Link from "next/link";
import { getDb } from "@resonansia/db";
import { listNodes, calculateProjectEconomics, getLabelId } from "@resonansia/core";
import { getTenantId } from "@/lib/supabase-server";
import { formatSEK } from "@/lib/format";

export default async function DashboardPage() {
  const tenantId = await getTenantId();
  const db = getDb();

  // Fetch org node for company name
  const orgs = await listNodes(db, tenantId, "org");
  const orgName =
    orgs.length > 0
      ? (orgs[0].data as { name?: string })?.name ?? "Organisation"
      : "Organisation";

  // Fetch active project nodes (exclude archived)
  const archivedId = await getLabelId(db, "node_state", "archived", tenantId);
  const cancelledId = await getLabelId(db, "node_state", "cancelled", tenantId);
  const allProjects = await listNodes(db, tenantId, "project");
  const projects = allProjects.filter(
    (p) => p.state_id !== archivedId && p.state_id !== cancelledId
  );

  // Get economics for each project
  const projectsWithEconomics = await Promise.all(
    projects.map(async (project) => {
      const economics = await calculateProjectEconomics(
        db,
        tenantId,
        project.id
      );
      return { project, economics };
    })
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{orgName}</h1>
        <Link
          href="/projects/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Nytt projekt
        </Link>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-500">
          Inga projekt ännu. Skapa ditt första projekt.
        </p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 text-left text-sm text-gray-600">
              <tr>
                <th className="px-4 py-3">Projekt</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right font-mono">Offererat</th>
                <th className="px-4 py-3 text-right font-mono">
                  Faktisk kostnad
                </th>
                <th className="px-4 py-3 text-right font-mono">Marginal</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projectsWithEconomics.map(({ project, economics }) => {
                const data = project.data as { name?: string };
                const actualCost =
                  economics.timeCost + economics.materialCost;
                return (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {data?.name ?? "Namnlöst"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {project.state_id ? "Aktiv" : "Utkast"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatSEK(economics.quotedTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatSEK(actualCost)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatSEK(economics.margin)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
