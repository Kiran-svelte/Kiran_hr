"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { callAI, parseAIResponse } from "@/lib/ai-gateway";

/**
 * Get payroll dashboard statistics
 */
export async function getPayrollDashboard() {
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

    // Only HR can access payroll dashboard
    if (employee.role !== 'hr' && employee.role !== 'admin') {
      return { success: false, error: "Unauthorized access" };
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Get monthly stats
    const [totalEmployees, processedPayrolls, pendingPayrolls, totalPayrollCost] = await Promise.all([
      prisma.employee.count({
        where: { org_id: employee.org_id, is_active: true }
      }),
      prisma.payroll.count({
        where: {
          employee: { org_id: employee.org_id },
          month: currentMonth,
          year: currentYear,
          status: 'processed'
        }
      }),
      prisma.payroll.count({
        where: {
          employee: { org_id: employee.org_id },
          month: currentMonth,
          year: currentYear,
          status: 'pending'
        }
      }),
      prisma.payroll.aggregate({
        where: {
          employee: { org_id: employee.org_id },
          month: currentMonth,
          year: currentYear
        },
        _sum: { net_pay: true }
      })
    ]);

    return {
      success: true,
      data: {
        totalEmployees,
        processedPayrolls,
        pendingPayrolls,
        totalPayrollCost: totalPayrollCost._sum.net_pay?.toString() || '0',
        currentMonth,
        currentYear
      }
    };
  } catch (error) {
    console.error("Payroll Dashboard Error:", error);
    return { success: false, error: "Failed to fetch payroll dashboard" };
  }
}

/**
 * Get employee's own payslips
 */
export async function getMyPayslips(year?: number) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true }
    });

    if (!employee) {
      return { success: false, error: "Employee profile not found" };
    }

    const targetYear = year || new Date().getFullYear();

    const payslips = await prisma.payroll.findMany({
      where: {
        emp_id: employee.emp_id,
        year: targetYear
      },
      orderBy: { month: 'desc' }
    });

    return {
      success: true,
      payslips: payslips.map(p => ({
        id: p.id,
        month: p.month,
        year: p.year,
        basic_salary: p.basic_salary.toString(),
        allowances: p.allowances.toString(),
        deductions: p.deductions.toString(),
        net_pay: p.net_pay.toString(),
        status: p.status,
        processed_date: p.processed_date
      }))
    };
  } catch (error) {
    console.error("Get Payslips Error:", error);
    return { success: false, error: "Failed to fetch payslips" };
  }
}

/**
 * Run payroll for all employees (HR only)
 */
export async function runPayroll(month: number, year: number) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { org_id: true, role: true, emp_id: true }
    });

    if (!employee || !employee.org_id) {
      return { success: false, error: "Organization not found" };
    }

    if (employee.role !== 'hr' && employee.role !== 'admin') {
      return { success: false, error: "Unauthorized access" };
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: {
        org_id: employee.org_id,
        is_active: true
      },
      select: { emp_id: true }
    });

    // Create or update payroll records
    const payrollRecords = employees.map(emp => ({
      emp_id: emp.emp_id,
      month,
      year,
      basic_salary: 5000, // Default, should be from employee contract
      allowances: 1000,
      deductions: 500,
      net_pay: 5500,
      status: 'pending' as const
    }));

    // Upsert payroll records
    await Promise.all(
      payrollRecords.map(record =>
        prisma.payroll.upsert({
          where: {
            emp_id_month_year: {
              emp_id: record.emp_id,
              month,
              year
            }
          },
          update: record,
          create: record
        })
      )
    );

    revalidatePath('/hr/payroll');

    return { success: true, count: payrollRecords.length };
  } catch (error) {
    console.error("Run Payroll Error:", error);
    return { success: false, error: "Failed to run payroll" };
  }
}

/**
 * Process payroll (mark as processed)
 */
export async function processPayroll(payrollId: string) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { role: true }
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    if (employee.role !== 'hr' && employee.role !== 'admin') {
      return { success: false, error: "Unauthorized access" };
    }

    await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'processed',
        processed_date: new Date()
      }
    });

    revalidatePath('/hr/payroll');

    return { success: true };
  } catch (error) {
    console.error("Process Payroll Error:", error);
    return { success: false, error: "Failed to process payroll" };
  }
}

/**
 * Get payroll analytics using AI
 */
export async function getPayrollAnalytics() {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { org_id: true, role: true, emp_id: true }
    });

    if (!employee || !employee.org_id) {
      return { success: false, error: "Organization not found" };
    }

    if (employee.role !== 'hr' && employee.role !== 'admin') {
      return { success: false, error: "Unauthorized access" };
    }

    // Get recent payroll data
    const recentPayrolls = await prisma.payroll.findMany({
      where: {
        employee: { org_id: employee.org_id }
      },
      take: 100,
      orderBy: { year: 'desc' },
      include: {
        employee: {
          select: {
            emp_id: true,
            full_name: true,
            department: true
          }
        }
      }
    });

    // Prepare data for AI analysis
    const payrollSummary = recentPayrolls.map(p => ({
      employee_id: p.employee.emp_id,
      employee_name: p.employee.full_name,
      department: p.employee.department,
      month: p.month,
      year: p.year,
      basic_salary: p.basic_salary.toString(),
      net_pay: p.net_pay.toString(),
      status: p.status
    }));

    // Call AI for anomaly detection
    const aiResponse = await callAI(
      'payroll_analysis',
      `Analyze this payroll data for anomalies and insights: ${JSON.stringify(payrollSummary.slice(0, 20))}`
    );

    if (!aiResponse.success || !aiResponse.response) {
      return { success: true, data: { anomalies: [], insights: [] } };
    }

    const analysis = parseAIResponse(aiResponse.response);

    // Log AI interaction
    await prisma.aIInteractionLog.create({
      data: {
        emp_id: employee.emp_id,
        org_id: employee.org_id,
        module: 'payroll',
        prompt: 'Payroll analytics request',
        response: aiResponse.response,
        model_used: aiResponse.provider
      }
    });

    return {
      success: true,
      data: analysis || { anomalies: [], insights: [] }
    };
  } catch (error) {
    console.error("Payroll Analytics Error:", error);
    return { success: false, error: "Failed to generate analytics" };
  }
}
