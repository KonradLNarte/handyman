import { eq, and, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { notifications, edges, nodes } from "@resonansia/db";
import { generateId } from "@resonansia/shared";
import { getLabelId } from "../labels";

export type NotificationType =
  | "time_reported"
  | "photo_added"
  | "status_change"
  | "correction";

export interface NotificationInput {
  type: NotificationType;
  actorName: string;
  summary: string;
  eventId: string;
}

/**
 * Creates a notification for the project owner.
 * Finds the owner via member_of edges on the org that owns the project,
 * or via the project's assigned_to edges with role = 'owner'.
 */
export async function notifyProjectOwner(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string,
  notification: NotificationInput
): Promise<void> {
  const ownerId = await findProjectOwner(db, tenantId, projectId);
  if (!ownerId) return;

  const id = generateId();
  await db.insert(notifications).values({
    id,
    tenant_id: tenantId,
    user_id: ownerId,
    project_id: projectId,
    type: notification.type,
    summary: notification.summary,
    event_id: notification.eventId,
    read: false,
  });
}

/**
 * Lists unread notifications for a user.
 */
export async function getUnreadNotifications(
  db: PgDatabase<any>,
  tenantId: string,
  userId: string,
  limit: number = 20
): Promise<Array<typeof notifications.$inferSelect>> {
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.tenant_id, tenantId),
        eq(notifications.user_id, userId),
        eq(notifications.read, false)
      )
    )
    .orderBy(sql`${notifications.created_at} DESC`)
    .limit(limit);
}

/**
 * Returns total unread count for badge display.
 */
export async function getUnreadCount(
  db: PgDatabase<any>,
  tenantId: string,
  userId: string
): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int as count
    FROM notifications
    WHERE tenant_id = ${tenantId}
      AND user_id = ${userId}
      AND read = false
  `);
  const rows = (Array.isArray(result) ? result : result.rows) as Array<{
    count: number;
  }>;
  return rows[0]?.count ?? 0;
}

/**
 * Marks a notification as read.
 */
export async function markNotificationRead(
  db: PgDatabase<any>,
  tenantId: string,
  notificationId: string
): Promise<void> {
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.tenant_id, tenantId)
      )
    );
}

/**
 * Finds the project owner — looks for:
 * 1. A person with assigned_to edge to the project with role='owner'
 * 2. Fall back to the first member_of the org (tenant admin)
 */
async function findProjectOwner(
  db: PgDatabase<any>,
  tenantId: string,
  projectId: string
): Promise<string | null> {
  try {
    const assignedToTypeId = await getLabelId(db, "edge_type", "assigned_to", tenantId);

    // Look for someone assigned to the project with role='owner'
    const ownerEdges = await db
      .select()
      .from(edges)
      .where(
        and(
          eq(edges.tenant_id, tenantId),
          eq(edges.target_id, projectId),
          eq(edges.type_id, assignedToTypeId)
        )
      );

    for (const edge of ownerEdges) {
      const data = edge.data as Record<string, unknown> | null;
      if (data?.role === "owner") {
        return edge.source_id;
      }
    }

    // Fall back: find the first person node in this tenant with member_of to org
    const memberOfTypeId = await getLabelId(db, "edge_type", "member_of", tenantId);
    const personTypeId = await getLabelId(db, "node_type", "person", tenantId);

    const memberEdges = await db
      .select()
      .from(edges)
      .where(
        and(
          eq(edges.tenant_id, tenantId),
          eq(edges.type_id, memberOfTypeId)
        )
      )
      .limit(1);

    if (memberEdges.length > 0) {
      return memberEdges[0].source_id;
    }
  } catch {
    // Labels might not exist
  }

  return null;
}
