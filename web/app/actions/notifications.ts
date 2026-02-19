"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Get user notifications
 */
export async function getNotifications() {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true }
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    const notifications = await prisma.notification.findMany({
      where: { emp_id: employee.emp_id },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    return {
      success: true,
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        created_at: n.created_at
      }))
    };
  } catch (error) {
    console.error("Get Notifications Error:", error);
    return { success: false, error: "Failed to fetch notifications" };
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true }
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    await prisma.notification.update({
      where: {
        id: notificationId,
        emp_id: employee.emp_id // Ensure user owns this notification
      },
      data: { read: true }
    });

    return { success: true };
  } catch (error) {
    console.error("Mark As Read Error:", error);
    return { success: false, error: "Failed to mark notification as read" };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount() {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true }
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    const count = await prisma.notification.count({
      where: {
        emp_id: employee.emp_id,
        read: false
      }
    });

    return { success: true, count };
  } catch (error) {
    console.error("Get Unread Count Error:", error);
    return { success: false, error: "Failed to get unread count" };
  }
}

/**
 * Create notification (internal helper)
 */
export async function createNotification(
  emp_id: string,
  org_id: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  try {
    await prisma.notification.create({
      data: {
        emp_id,
        org_id,
        type: type as any,
        title,
        message,
        link
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Create Notification Error:", error);
    return { success: false, error: "Failed to create notification" };
  }
}
