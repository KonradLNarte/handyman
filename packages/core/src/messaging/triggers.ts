import type { PgDatabase } from "drizzle-orm/pg-core";
import type { MessagingAdapter } from "@resonansia/integrations";
import { getNode } from "../nodes";
import { getLabelCode } from "../labels";
import { generateAndSendWorkOrder } from "./work-order";

/**
 * Called when a person is assigned to a project (assigned_to edge created).
 * If project is active/in_progress, sends work order immediately.
 * If project is draft, does nothing (work order sent when project becomes active).
 */
export async function onPersonAssignedToProject(
  db: PgDatabase<any>,
  adapter: MessagingAdapter,
  tenantId: string,
  personId: string,
  projectId: string,
  channel: "whatsapp" | "sms" = "whatsapp"
): Promise<void> {
  const project = await getNode(db, tenantId, projectId);
  if (!project || !project.state_id) return;

  const { code: stateCode } = await getLabelCode(db, project.state_id, tenantId);

  if (stateCode === "active" || stateCode === "in_progress") {
    try {
      await generateAndSendWorkOrder(db, adapter, {
        tenantId,
        projectId,
        personId,
        channel,
      });
    } catch (error) {
      console.error("Failed to send work order on assignment:", error);
    }
  }
  // For draft projects: no work order yet (future: queue for when project activates)
}
