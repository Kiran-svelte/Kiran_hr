"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Default policy template for new companies
export const DEFAULT_POLICY = {
  leave_quotas: {
    "Annual Leave": 20,
    "Sick Leave": 15,
    "Personal Leave": 5,
    "Emergency Leave": 3,
    "Maternity Leave": 180,
    "Paternity Leave": 15,
    "Bereavement Leave": 5,
    "Study Leave": 10
  },
  working_hours: {
    check_in: "09:00",
    check_out: "18:00",
    flexible: false,
    core_hours_start: "10:00",
    core_hours_end: "16:00"
  },
  holidays: [
    { date: "2024-01-01", name: "New Year's Day" },
    { date: "2024-01-26", name: "Republic Day" },
    { date: "2024-08-15", name: "Independence Day" },
    { date: "2024-10-02", name: "Gandhi Jayanti" },
    { date: "2024-12-25", name: "Christmas" }
  ],
  notice_periods: {
    "Annual Leave": 7,
    "Sick Leave": 0,
    "Personal Leave": 3,
    "Emergency Leave": 0,
    "Maternity Leave": 30,
    "Paternity Leave": 14,
    "Bereavement Leave": 0,
    "Study Leave": 14
  },
  blackout_dates: [],
  team_coverage: {
    min_coverage_percent: 60,
    max_concurrent_leave: 2
  },
  max_consecutive_days: {
    "Annual Leave": 10,
    "Sick Leave": 5,
    "Personal Leave": 3,
    "Emergency Leave": 3
  },
  probation_restrictions: {
    enabled: true,
    probation_period_days: 90,
    allowed_leave_types: ["Emergency Leave", "Sick Leave"],
    max_days_during_probation: 3
  }
};

/**
 * Get the active policy for the current user's company
 */
export async function getCompanyPolicy() {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      include: {
        company: {
          include: {
            policies: {
              where: { is_active: true },
              orderBy: { updated_at: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!employee || !employee.company) {
      return { success: false, error: "Company not found" };
    }

    const activePolicy = employee.company.policies[0];

    // If no policy exists, create default one
    if (!activePolicy) {
      const newPolicy = await prisma.constraintPolicy.create({
        data: {
          org_id: employee.company.id,
          name: "Default Policy",
          rules: DEFAULT_POLICY,
          is_active: true
        }
      });

      return {
        success: true,
        policy: newPolicy,
        company: employee.company
      };
    }

    return {
      success: true,
      policy: activePolicy,
      company: employee.company
    };
  } catch (error) {
    console.error("Get Policy Error:", error);
    return { success: false, error: "Failed to fetch policy" };
  }
}

/**
 * Update company policy (HR/Admin only)
 */
export async function updateCompanyPolicy(policyId: string, rules: any) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      include: { company: true }
    });

    if (!employee || !employee.company) {
      return { success: false, error: "Company not found" };
    }

    // Check if user is HR or Admin
    if (employee.role !== 'hr' && employee.role !== 'admin') {
      return { success: false, error: "Only HR/Admin can update policies" };
    }

    // Verify policy belongs to this company
    const policy = await prisma.constraintPolicy.findUnique({
      where: { id: policyId }
    });

    if (!policy || policy.org_id !== employee.company.id) {
      return { success: false, error: "Policy not found" };
    }

    // Update the policy
    const updated = await prisma.constraintPolicy.update({
      where: { id: policyId },
      data: {
        rules: rules,
        updated_at: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: "POLICY_UPDATED",
        entity_type: "ConstraintPolicy",
        entity_id: policyId,
        actor_id: employee.emp_id,
        target_org: employee.company.id,
        details: {
          changes: "Policy rules updated",
          timestamp: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      policy: updated
    };
  } catch (error) {
    console.error("Update Policy Error:", error);
    return { success: false, error: "Failed to update policy" };
  }
}

/**
 * Update leave quotas
 */
export async function updateLeaveQuotas(policyId: string, quotas: Record<string, number>) {
  const result = await getCompanyPolicy();
  if (!result.success || !result.policy) {
    return { success: false, error: "Policy not found" };
  }

  const currentRules = result.policy.rules as any;
  const updatedRules = {
    ...currentRules,
    leave_quotas: quotas
  };

  return updateCompanyPolicy(policyId, updatedRules);
}

/**
 * Update working hours
 */
export async function updateWorkingHours(policyId: string, workingHours: any) {
  const result = await getCompanyPolicy();
  if (!result.success || !result.policy) {
    return { success: false, error: "Policy not found" };
  }

  const currentRules = result.policy.rules as any;
  const updatedRules = {
    ...currentRules,
    working_hours: workingHours
  };

  return updateCompanyPolicy(policyId, updatedRules);
}

/**
 * Update holidays
 */
export async function updateHolidays(policyId: string, holidays: Array<{ date: string; name: string }>) {
  const result = await getCompanyPolicy();
  if (!result.success || !result.policy) {
    return { success: false, error: "Policy not found" };
  }

  const currentRules = result.policy.rules as any;
  const updatedRules = {
    ...currentRules,
    holidays: holidays
  };

  return updateCompanyPolicy(policyId, updatedRules);
}

/**
 * Update blackout dates
 */
export async function updateBlackoutDates(policyId: string, blackoutDates: Array<{ start: string; end: string; reason: string }>) {
  const result = await getCompanyPolicy();
  if (!result.success || !result.policy) {
    return { success: false, error: "Policy not found" };
  }

  const currentRules = result.policy.rules as any;
  const updatedRules = {
    ...currentRules,
    blackout_dates: blackoutDates
  };

  return updateCompanyPolicy(policyId, updatedRules);
}

/**
 * Get policy summary for dashboard
 */
export async function getPolicySummary() {
  const result = await getCompanyPolicy();
  if (!result.success || !result.policy) {
    return { success: false, error: "Policy not found" };
  }

  const rules = result.policy.rules as any;

  return {
    success: true,
    summary: {
      totalLeaveTypes: Object.keys(rules.leave_quotas || {}).length,
      totalHolidays: (rules.holidays || []).length,
      workingHoursConfigured: !!rules.working_hours,
      lastUpdated: result.policy.updated_at,
      policyName: result.policy.name
    }
  };
}

/**
 * Initialize policy for a new company
 */
export async function initializeCompanyPolicy(companyId: string, template: 'tech' | 'finance' | 'healthcare' | 'default' = 'default') {
  try {
    // Check if policy already exists
    const existing = await prisma.constraintPolicy.findFirst({
      where: { org_id: companyId, is_active: true }
    });

    if (existing) {
      return { success: true, policy: existing, message: "Policy already exists" };
    }

    // Create new policy based on template
    let policyRules = DEFAULT_POLICY;
    let policyName = "Default Policy";

    if (template === 'tech') {
      policyName = "Tech Company Policy";
      policyRules = {
        ...DEFAULT_POLICY,
        leave_quotas: {
          ...DEFAULT_POLICY.leave_quotas,
          "Work From Home": 52 // Tech companies often offer WFH
        },
        working_hours: {
          check_in: "10:00",
          check_out: "19:00",
          flexible: true,
          core_hours_start: "11:00",
          core_hours_end: "16:00"
        }
      };
    } else if (template === 'finance') {
      policyName = "Finance Company Policy";
      policyRules = {
        ...DEFAULT_POLICY,
        working_hours: {
          check_in: "08:30",
          check_out: "17:30",
          flexible: false,
          core_hours_start: "09:00",
          core_hours_end: "17:00"
        },
        notice_periods: {
          "Annual Leave": 14, // Finance often requires more notice
          "Sick Leave": 0,
          "Personal Leave": 7,
          "Emergency Leave": 0,
          "Maternity Leave": 30,
          "Paternity Leave": 14,
          "Bereavement Leave": 0,
          "Study Leave": 30
        }
      };
    } else if (template === 'healthcare') {
      policyName = "Healthcare Company Policy";
      policyRules = {
        ...DEFAULT_POLICY,
        leave_quotas: {
          ...DEFAULT_POLICY.leave_quotas,
          "Sick Leave": 20, // Healthcare workers need more sick leave
          "Emergency Leave": 5
        },
        team_coverage: {
          min_coverage_percent: 80, // Higher coverage needed in healthcare
          max_concurrent_leave: 1
        }
      };
    }

    const newPolicy = await prisma.constraintPolicy.create({
      data: {
        org_id: companyId,
        name: policyName,
        rules: policyRules,
        is_active: true
      }
    });

    return {
      success: true,
      policy: newPolicy,
      message: "Policy initialized successfully"
    };
  } catch (error) {
    console.error("Initialize Policy Error:", error);
    return { success: false, error: "Failed to initialize policy" };
  }
}
