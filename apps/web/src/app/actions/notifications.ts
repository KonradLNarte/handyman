"use server";

import { getDb } from "@resonansia/db";
import { getTenantId, getSession } from "@/lib/supabase-server";
import {
  getUnreadNotifications,
  getUnreadCount,
  markNotificationRead,
} from "@resonansia/core";

export async function getNotificationsAction() {
  const tenantId = await getTenantId();
  const user = await getSession();
  if (!user) return { notifications: [], count: 0 };

  const db = getDb();
  const [notifs, count] = await Promise.all([
    getUnreadNotifications(db, tenantId, user.id, 20),
    getUnreadCount(db, tenantId, user.id),
  ]);

  return { notifications: notifs, count };
}

export async function markReadAction(notificationId: string) {
  const tenantId = await getTenantId();
  const db = getDb();
  await markNotificationRead(db, tenantId, notificationId);
}
