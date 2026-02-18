"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Get compliance dashboard
 */
export async function getComplianceDashboard() {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { org_id: true, role: true }
    });

    if (!employee || !employee.org_id) {
      return { success: false, error: "Organization not found" };
    }

    if (employee.role !== 'hr' && employee.role !== 'admin') {
      return { success: false, error: "Unauthorized access" };
    }

    const [activePolicies, totalEmployees, attestationCounts] = await Promise.all([
      prisma.compliancePolicy.count({
        where: { org_id: employee.org_id, is_active: true }
      }),
      prisma.employee.count({
        where: { org_id: employee.org_id, is_active: true }
      }),
      prisma.complianceAttestation.groupBy({
        by: ['policy_id'],
        _count: true,
        where: {
          policy: { org_id: employee.org_id }
        }
      })
    ]);

    // Calculate compliance risk score (simplified)
    const avgAttestationRate = activePolicies > 0
      ? (attestationCounts.reduce((sum, a) => sum + a._count, 0) / activePolicies / totalEmployees) * 100
      : 100;

    const riskScore = Math.round(100 - avgAttestationRate);

    return {
      success: true,
      data: {
        riskScore,
        activePolicies,
        totalEmployees,
        attestationRate: Math.round(avgAttestationRate)
      }
    };
  } catch (error) {
    console.error("Compliance Dashboard Error:", error);
    return { success: false, error: "Failed to fetch compliance dashboard" };
  }
}

/**
 * Get all policies
 */
export async function getPolicies() {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { org_id: true, emp_id: true }
    });

    if (!employee || !employee.org_id) {
      return { success: false, error: "Organization not found" };
    }

    const policies = await prisma.compliancePolicy.findMany({
      where: { org_id: employee.org_id, is_active: true },
      orderBy: { created_at: 'desc' },
      include: {
        attestations: {
          where: { emp_id: employee.emp_id }
        },
        _count: {
          select: { attestations: true }
        }
      }
    });

    return {
      success: true,
      policies: policies.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        version: p.version,
        effective_date: p.effective_date,
        has_acknowledged: p.attestations.length > 0,
        total_attestations: p._count.attestations
      }))
    };
  } catch (error) {
    console.error("Get Policies Error:", error);
    return { success: false, error: "Failed to fetch policies" };
  }
}

/**
 * Create a new policy
 */
export async function createPolicy(data: {
  title: string;
  description: string;
  policy_document?: string;
}) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { org_id: true, role: true }
    });

    if (!employee || !employee.org_id) {
      return { success: false, error: "Organization not found" };
    }

    if (employee.role !== 'hr' && employee.role !== 'admin') {
      return { success: false, error: "Unauthorized access" };
    }

    const policy = await prisma.compliancePolicy.create({
      data: {
        org_id: employee.org_id,
        title: data.title,
        description: data.description,
        policy_document: data.policy_document
      }
    });

    revalidatePath('/hr/compliance');

    return { success: true, policy };
  } catch (error) {
    console.error("Create Policy Error:", error);
    return { success: false, error: "Failed to create policy" };
  }
}

/**
 * Submit attestation (employee acknowledges policy)
 */
export async function submitAttestation(policyId: string) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true, org_id: true }
    });

    if (!employee || !employee.org_id) {
      return { success: false, error: "Employee not found" };
    }

    // Check if policy exists and belongs to employee's org
    const policy = await prisma.compliancePolicy.findFirst({
      where: {
        id: policyId,
        org_id: employee.org_id
      }
    });

    if (!policy) {
      return { success: false, error: "Policy not found" };
    }

    // Create attestation
    await prisma.complianceAttestation.upsert({
      where: {
        policy_id_emp_id: {
          policy_id: policyId,
          emp_id: employee.emp_id
        }
      },
      update: {
        acknowledged_at: new Date()
      },
      create: {
        policy_id: policyId,
        emp_id: employee.emp_id
      }
    });

    revalidatePath('/employee/compliance');
    revalidatePath('/hr/compliance');

    return { success: true };
  } catch (error) {
    console.error("Submit Attestation Error:", error);
    return { success: false, error: "Failed to submit attestation" };
  }
}

/**
 * Get audit trail with filters
 */
export async function getAuditTrail(filters?: {
  action?: string;
  entity_type?: string;
  from_date?: Date;
  to_date?: Date;
}) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { org_id: true, role: true }
    });

    if (!employee || !employee.org_id) {
      return { success: false, error: "Organization not found" };
    }

    if (employee.role !== 'hr' && employee.role !== 'admin') {
      return { success: false, error: "Unauthorized access" };
    }

    const whereClause: any = {
      target_org: employee.org_id
    };

    if (filters?.action) {
      whereClause.action = filters.action;
    }

    if (filters?.entity_type) {
      whereClause.entity_type = filters.entity_type;
    }

    if (filters?.from_date || filters?.to_date) {
      whereClause.created_at = {};
      if (filters.from_date) {
        whereClause.created_at.gte = filters.from_date;
      }
      if (filters.to_date) {
        whereClause.created_at.lte = filters.to_date;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        actor: {
          select: { full_name: true }
        }
      }
    });

    return {
      success: true,
      logs: logs.map(log => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        actor_name: log.actor.full_name,
        created_at: log.created_at,
        details: log.details
      }))
    };
  } catch (error) {
    console.error("Get Audit Trail Error:", error);
    return { success: false, error: "Failed to fetch audit trail" };
  }
}
