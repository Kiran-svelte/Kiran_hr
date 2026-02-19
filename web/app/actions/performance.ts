"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { callAI, parseAIResponse } from "@/lib/ai-gateway";
import { revalidatePath } from "next/cache";

/**
 * Get performance overview
 */
export async function getPerformanceOverview() {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true, org_id: true, role: true }
    });

    if (!employee || !employee.org_id) {
      return { success: false, error: "Organization not found" };
    }

    const isHR = employee.role === 'hr' || employee.role === 'admin';

    const [reviewCount, goalCount, activeReviews] = await Promise.all([
      prisma.performanceReview.count({
        where: isHR
          ? { org_id: employee.org_id }
          : { emp_id: employee.emp_id }
      }),
      prisma.performanceGoal.count({
        where: isHR
          ? { org_id: employee.org_id, status: 'active' }
          : { emp_id: employee.emp_id, status: 'active' }
      }),
      prisma.performanceReview.count({
        where: isHR
          ? { org_id: employee.org_id, status: { in: ['draft', 'submitted'] } }
          : { emp_id: employee.emp_id, status: { in: ['draft', 'submitted'] } }
      })
    ]);

    return {
      success: true,
      data: {
        reviewCount,
        goalCount,
        activeReviews
      }
    };
  } catch (error) {
    console.error("Performance Overview Error:", error);
    return { success: false, error: "Failed to fetch performance overview" };
  }
}

/**
 * Get employee goals
 */
export async function getGoals() {
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

    const goals = await prisma.performanceGoal.findMany({
      where: { emp_id: employee.emp_id },
      orderBy: { created_at: 'desc' }
    });

    return {
      success: true,
      goals: goals.map(g => ({
        id: g.id,
        title: g.title,
        description: g.description,
        target: g.target,
        progress: g.progress,
        status: g.status,
        due_date: g.due_date,
        created_at: g.created_at
      }))
    };
  } catch (error) {
    console.error("Get Goals Error:", error);
    return { success: false, error: "Failed to fetch goals" };
  }
}

/**
 * Create a new goal
 */
export async function createGoal(data: {
  title: string;
  description?: string;
  target?: string;
  due_date?: Date;
}) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true, org_id: true }
    });

    if (!employee || !employee.org_id) {
      return { success: false, error: "Organization not found" };
    }

    const goal = await prisma.performanceGoal.create({
      data: {
        emp_id: employee.emp_id,
        org_id: employee.org_id,
        title: data.title,
        description: data.description,
        target: data.target,
        due_date: data.due_date,
        status: 'active'
      }
    });

    revalidatePath('/employee/performance');
    revalidatePath('/hr/performance');

    return { success: true, goal };
  } catch (error) {
    console.error("Create Goal Error:", error);
    return { success: false, error: "Failed to create goal" };
  }
}

/**
 * Update goal progress
 */
export async function updateGoalProgress(goalId: string, progress: number) {
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

    // Ensure user owns this goal
    const goal = await prisma.performanceGoal.findFirst({
      where: {
        id: goalId,
        emp_id: employee.emp_id
      }
    });

    if (!goal) {
      return { success: false, error: "Goal not found" };
    }

    await prisma.performanceGoal.update({
      where: { id: goalId },
      data: {
        progress: Math.min(100, Math.max(0, progress)),
        status: progress >= 100 ? 'achieved' : 'on_track'
      }
    });

    revalidatePath('/employee/performance');
    revalidatePath('/hr/performance');

    return { success: true };
  } catch (error) {
    console.error("Update Goal Progress Error:", error);
    return { success: false, error: "Failed to update goal progress" };
  }
}

/**
 * Analyze review for bias using AI
 */
export async function analyzeReviewForBias(reviewText: string) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true, org_id: true, role: true }
    });

    if (!employee || !employee.org_id) {
      return { success: false, error: "Organization not found" };
    }

    // Only HR/managers can use bias detection
    if (employee.role !== 'hr' && employee.role !== 'admin' && employee.role !== 'manager') {
      return { success: false, error: "Unauthorized access" };
    }

    const aiResponse = await callAI(
      'performance_bias_detection',
      reviewText
    );

    if (!aiResponse.success || !aiResponse.response) {
      return {
        success: false,
        error: aiResponse.error || "AI service unavailable"
      };
    }

    const analysis = parseAIResponse(aiResponse.response);

    // Log AI interaction
    await prisma.aIInteractionLog.create({
      data: {
        emp_id: employee.emp_id,
        org_id: employee.org_id,
        module: 'performance',
        prompt: reviewText,
        response: aiResponse.response,
        model_used: aiResponse.provider
      }
    });

    return {
      success: true,
      analysis
    };
  } catch (error) {
    console.error("Analyze Review Error:", error);
    return { success: false, error: "Failed to analyze review" };
  }
}
