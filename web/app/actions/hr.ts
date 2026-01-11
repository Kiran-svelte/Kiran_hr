"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getHRDashboardStats() {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        // 1. Get Logged-In HR Employee
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee || !employee.company) {
            return { success: false, error: "No organization found." };
        }

        const orgId = employee.company.id;

        // 2. Aggregate Stats
        const [totalEmployees, pendingLeaves, activeLeaves] = await Promise.all([
            // Total Employees
            prisma.employee.count({
                where: {
                    org_id: orgId,
                    clerk_id: { not: user.id } // Exclude the admin themselves
                }
            }),
            // Pending Requests (Pending + Escalated)
            prisma.leaveRequest.count({
                where: {
                    employee: { org_id: orgId },
                    status: { in: ['pending', 'escalated'] }
                }
            }),
            // On Leave Today (Approvals intersecting today)
            prisma.leaveRequest.count({
                where: {
                    employee: { org_id: orgId },
                    status: "approved",
                    start_date: { lte: new Date() },
                    end_date: { gte: new Date() }
                }
            })
        ]);

        // 3. Get Recent Pending Requests (Needs Attention)
        const needsAttention = await prisma.leaveRequest.findMany({
            where: {
                employee: { org_id: orgId },
                status: { in: ['pending', 'escalated'] }
            },
            take: 3,
            orderBy: { created_at: 'asc' },
            include: {
                employee: {
                    select: {
                        full_name: true,
                        position: true
                    }
                }
            }
        });

        return {
            success: true,
            data: {
                companyName: employee.company.name,
                totalEmployees,
                pendingLeaves,
                activeLeaves,
                needsAttention: needsAttention.map(req => ({
                    id: req.request_id, // Fixed: request_id not id
                    employeeName: req.employee.full_name,
                    position: req.employee.position,
                    type: req.leave_type,
                    days: req.total_days.toString(), // Decimal to string
                    startDate: req.start_date
                }))
            }
        };

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return { success: false, error: "Failed to fetch dashboard data." };
    }
}

export async function getCompanyDetails() {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            include: { company: true }
        });

        if (!employee || !employee.company) {
            return { success: false, error: "No organization found." };
        }

        return { success: true, company: employee.company, employee: employee };
    } catch (error) {
        return { success: false, error: "Failed to fetch company details." };
    }
}

/* =========================================================================
   3. ACTIVITY FEED
   Fetches recent audit logs for the company.
   ========================================================================= */
export async function getCompanyActivity() {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            select: { org_id: true }
        });

        if (!employee || !employee.org_id) {
            return { success: false, error: "No organization found." };
        }

        const activities = await prisma.auditLog.findMany({
            where: { target_org: employee.org_id },
            orderBy: { created_at: 'desc' },
            take: 20,
            include: {
                actor: {
                    select: { full_name: true }
                }
            }
        });

        return {
            success: true,
            activities: activities.map(log => ({
                id: log.id,
                action: log.action,
                created_at: log.created_at,
                actor_name: log.actor.full_name,
                change_summary: (log.details as any)?.summary || log.action
            }))
        };
    } catch (error) {
        console.error("Activity Feed Error:", error);
        return { success: false, error: "Failed to fetch activity." };
    }
}

/* =========================================================================
   4. LEAVE REQUESTS
   Fetches filtered leave requests.
   ========================================================================= */
export async function getLeaveRequests(filter: 'all' | 'pending') {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            select: { org_id: true }
        });

        if (!employee || !employee.org_id) {
            return { success: false, error: "No organization found." };
        }

        const whereClause: any = {
            employee: { org_id: employee.org_id } // Filter by company
        };

        // FIX: "Pending" should include "Escalated" so HR can act on them
        // "All" is treated as History (Approved/Rejected)
        if (filter === 'pending') {
            whereClause.status = { in: ['pending', 'escalated'] };
        } else {
            // History tab: Show resolved requests
            whereClause.status = { in: ['approved', 'rejected'] };
        }

        const requests = await prisma.leaveRequest.findMany({
            where: whereClause,
            orderBy: { created_at: 'desc' },
            include: {
                employee: {
                    select: { full_name: true }
                }
            }
        });

        return {
            success: true,
            requests: requests.map(req => ({
                request_id: req.request_id,
                employee_name: req.employee.full_name,
                leave_type: req.leave_type,
                start_date: req.start_date,
                end_date: req.end_date,
                total_days: req.total_days.toString(),
                reason: req.reason,
                status: req.status,
                ai_analysis: req.ai_analysis_json // Pass full AI results
            }))
        };
    } catch (error) {
        console.error("Leave Requests Error:", error);
        return { success: false, error: "Failed to fetch leave requests." };
    }
}

/* =========================================================================
   5. UPDATE REQUEST STATUS
   Approve or Reject a leave request.
   ========================================================================= */
import { revalidatePath } from "next/cache";

export async function updateLeaveRequestStatus(requestId: string, status: 'approved' | 'rejected') {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        // 1. Fetch Request Details FIRST to get days/type for balance update
        const request = await prisma.leaveRequest.findUnique({
            where: { request_id: requestId },
            include: { employee: true }
        });

        if (!request) return { success: false, error: "Request not found" };

        const currentYear = new Date().getFullYear();
        const leaveTypeKey = request.leave_type.toLowerCase().replace(" leave", "") === "annual" ? "vacation" :
            request.leave_type.toLowerCase().replace(" leave", "");

        // 2. Perform Transaction: Update Request + Update Balance
        await prisma.$transaction(async (tx) => {
            // A. Update Status
            await tx.leaveRequest.update({
                where: { request_id: requestId },
                data: {
                    status: status,
                    current_approver: status === 'approved' ? 'Resolved' : null
                }
            });

            // B. Update Balance
            // Logic: 
            // - If Approved: Move from 'pending_days' to 'used_days'
            // - If Rejected: Remove from 'pending_days' (give back to available)
            // Note: This assumes 'pending_days' was incremented when request was created.

            // B. Update Balance
            const currentBalance = await tx.leaveBalance.findFirst({
                where: {
                    emp_id: request.emp_id,
                    leave_type: leaveTypeKey,
                    year: currentYear
                }
            });

            if (status === 'approved') {
                if (currentBalance) {
                    // Move Pending -> Used
                    await tx.leaveBalance.update({
                        where: { balance_id: currentBalance.balance_id },
                        data: {
                            pending_days: { decrement: request.total_days },
                            used_days: { increment: request.total_days }
                        }
                    });
                } else {
                    // Create new record with used_days
                    // We assume defaults: Entitlement=20 (Rule001)
                    await tx.leaveBalance.create({
                        data: {
                            emp_id: request.emp_id,
                            country_code: request.country_code,
                            leave_type: leaveTypeKey,
                            year: currentYear,
                            annual_entitlement: 20, // Default
                            carried_forward: 0,
                            used_days: request.total_days, // Initial usage
                            pending_days: 0
                        }
                    });
                }
            } else {
                // Rejected: Just remove from Pending if it exists
                if (currentBalance) {
                    await tx.leaveBalance.update({
                        where: { balance_id: currentBalance.balance_id },
                        data: {
                            pending_days: { decrement: request.total_days }
                        }
                    });
                }
            }

            // C. Log Activity
            await tx.auditLog.create({
                data: {
                    action: status === 'approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
                    entity_type: 'LeaveRequest',
                    entity_id: requestId,
                    actor_id: request.employee.emp_id, // Placeholder for HR ID
                    target_org: request.employee.org_id!,
                    details: {
                        status: status,
                        reason: `HR ${status} request`
                    }
                }
            });
        });

        revalidatePath('/hr/leave-requests');
        revalidatePath('/hr/dashboard');

        return { success: true };
    } catch (error) {
        console.error("Update Status Error:", error);
        return { success: true, error: "Failed to update status." };
    }
}

/* =========================================================================
   6. EMPLOYEE MANAGEMENT
   Fetch all employees for the company.
   ========================================================================= */
export async function getCompanyEmployees() {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    try {
        const employee = await prisma.employee.findUnique({
            where: { clerk_id: user.id },
            select: { org_id: true }
        });

        if (!employee || !employee.org_id) {
            return { success: false, error: "No organization found." };
        }

        const employees = await prisma.employee.findMany({
            where: {
                org_id: employee.org_id,
                role: { notIn: ['hr', 'admin'] }
            },
            orderBy: { full_name: 'asc' },
            include: {
                company: true
            }
        });

        return {
            success: true,
            employees: employees.map(emp => ({
                emp_id: emp.emp_id,
                full_name: emp.full_name,
                email: emp.email,
                department: emp.department || 'Unassigned',
                position: emp.position || 'Employee',
                location: emp.work_location || 'Remote',
                join_date: emp.hire_date,
                status: emp.is_active ? 'Active' : 'Inactive'
            }))
        };
    } catch (error) {
        console.error("Fetch Employees Error:", error);
        return { success: false, error: "Failed to fetch employees." };
    }
}
