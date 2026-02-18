"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { callAI } from "@/lib/ai-gateway";

/**
 * AI Chatbot Server Action
 * Handles conversational AI interactions with context awareness
 */
export async function sendChatMessage(
  message: string,
  context?: {
    page?: string;
    role?: string;
    department?: string;
  }
) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    // Get employee context
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true, org_id: true, role: true, department: true }
    });

    if (!employee || !employee.org_id) {
      return { success: false, error: "Employee profile not found" };
    }

    // Enhance context with employee info
    const enhancedContext = {
      ...context,
      role: employee.role,
      department: employee.department || 'N/A'
    };

    // Call AI Gateway
    const aiResponse = await callAI('hr_chatbot', message, enhancedContext);

    if (!aiResponse.success || !aiResponse.response) {
      return { 
        success: false, 
        error: aiResponse.error || "AI service unavailable" 
      };
    }

    // Log the interaction
    await prisma.aIInteractionLog.create({
      data: {
        emp_id: employee.emp_id,
        org_id: employee.org_id,
        module: 'chatbot',
        prompt: message,
        response: aiResponse.response,
        model_used: aiResponse.provider,
        created_at: new Date()
      }
    });

    return {
      success: true,
      response: aiResponse.response,
      provider: aiResponse.provider,
      cached: aiResponse.cached
    };
  } catch (error) {
    console.error("AI Chat Error:", error);
    return { success: false, error: "Failed to process chat message" };
  }
}

/**
 * Get recent chat history (optional feature)
 */
export async function getChatHistory(limit = 10) {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const employee = await prisma.employee.findUnique({
      where: { clerk_id: user.id },
      select: { emp_id: true, org_id: true }
    });

    if (!employee) {
      return { success: false, error: "Employee profile not found" };
    }

    const history = await prisma.aIInteractionLog.findMany({
      where: {
        emp_id: employee.emp_id,
        module: 'chatbot'
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        prompt: true,
        response: true,
        created_at: true
      }
    });

    return {
      success: true,
      history: history.map(log => ({
        question: log.prompt,
        answer: log.response,
        timestamp: log.created_at
      }))
    };
  } catch (error) {
    console.error("Get Chat History Error:", error);
    return { success: false, error: "Failed to fetch chat history" };
  }
}
