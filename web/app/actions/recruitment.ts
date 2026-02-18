"use server";

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { callAI, parseAIResponse } from "@/lib/ai-gateway";
import { revalidatePath } from "next/cache";

/**
 * Get job postings
 */
export async function getJobPostings() {
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

    const jobs = await prisma.jobPosting.findMany({
      where: { org_id: employee.org_id },
      orderBy: { posted_date: 'desc' },
      include: {
        _count: {
          select: { candidates: true }
        }
      }
    });

    return {
      success: true,
      jobs: jobs.map(j => ({
        id: j.id,
        title: j.title,
        department: j.department,
        location: j.location,
        employment_type: j.employment_type,
        status: j.status,
        posted_date: j.posted_date,
        candidate_count: j._count.candidates
      }))
    };
  } catch (error) {
    console.error("Get Job Postings Error:", error);
    return { success: false, error: "Failed to fetch job postings" };
  }
}

/**
 * Create job posting with AI-generated description
 */
export async function createJobPosting(data: {
  title: string;
  department?: string;
  location?: string;
  employment_type?: string;
  requirements: string;
  generate_description?: boolean;
}) {
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

    let description = data.requirements;
    let ai_generated = false;

    // Generate description using AI if requested
    if (data.generate_description) {
      const prompt = `Generate a professional job description for the following role:
      
      Title: ${data.title}
      Department: ${data.department || 'N/A'}
      Location: ${data.location || 'N/A'}
      Employment Type: ${data.employment_type || 'Full-time'}
      
      Requirements:
      ${data.requirements}
      
      Include: job overview, key responsibilities, required qualifications, and company benefits.`;

      const aiResponse = await callAI('hr_chatbot', prompt);

      if (aiResponse.success && aiResponse.response) {
        description = aiResponse.response;
        ai_generated = true;

        // Log AI interaction
        await prisma.aIInteractionLog.create({
          data: {
            emp_id: employee.emp_id,
            org_id: employee.org_id,
            module: 'recruitment',
            prompt,
            response: aiResponse.response,
            model_used: aiResponse.provider
          }
        });
      }
    }

    const job = await prisma.jobPosting.create({
      data: {
        org_id: employee.org_id,
        title: data.title,
        department: data.department,
        location: data.location,
        employment_type: data.employment_type,
        description,
        requirements: data.requirements,
        ai_generated,
        status: 'active'
      }
    });

    revalidatePath('/hr/recruitment');

    return { success: true, job };
  } catch (error) {
    console.error("Create Job Posting Error:", error);
    return { success: false, error: "Failed to create job posting" };
  }
}

/**
 * Get candidates for a job
 */
export async function getCandidates(jobId: string) {
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

    const candidates = await prisma.candidate.findMany({
      where: { job_id: jobId },
      orderBy: { applied_at: 'desc' }
    });

    return {
      success: true,
      candidates: candidates.map(c => ({
        id: c.id,
        full_name: c.full_name,
        email: c.email,
        phone: c.phone,
        status: c.status,
        ai_score: c.ai_score?.toString(),
        applied_at: c.applied_at
      }))
    };
  } catch (error) {
    console.error("Get Candidates Error:", error);
    return { success: false, error: "Failed to fetch candidates" };
  }
}

/**
 * Screen candidate using AI
 */
export async function screenCandidate(candidateId: string) {
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

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        job: {
          select: {
            title: true,
            requirements: true
          }
        }
      }
    });

    if (!candidate) {
      return { success: false, error: "Candidate not found" };
    }

    const prompt = `Screen this candidate for the following job:
    
    Job: ${candidate.job.title}
    Requirements: ${candidate.job.requirements}
    
    Candidate: ${candidate.full_name}
    Resume/Cover Letter: ${candidate.cover_letter || 'Not provided'}
    
    Provide a screening assessment.`;

    const aiResponse = await callAI('recruitment_screening', prompt);

    if (!aiResponse.success || !aiResponse.response) {
      return {
        success: false,
        error: aiResponse.error || "AI service unavailable"
      };
    }

    const analysis = parseAIResponse(aiResponse.response);

    // Update candidate with AI score and analysis
    if (analysis && analysis.score) {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          ai_score: analysis.score,
          ai_analysis: analysis,
          status: analysis.recommendation === 'interview' ? 'screening' : candidate.status
        }
      });
    }

    // Log AI interaction
    await prisma.aIInteractionLog.create({
      data: {
        emp_id: employee.emp_id,
        org_id: employee.org_id,
        module: 'recruitment',
        prompt,
        response: aiResponse.response,
        model_used: aiResponse.provider
      }
    });

    revalidatePath('/hr/recruitment');

    return {
      success: true,
      analysis
    };
  } catch (error) {
    console.error("Screen Candidate Error:", error);
    return { success: false, error: "Failed to screen candidate" };
  }
}

/**
 * Update candidate status
 */
export async function updateCandidateStatus(candidateId: string, status: string) {
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

    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: status as any }
    });

    revalidatePath('/hr/recruitment');

    return { success: true };
  } catch (error) {
    console.error("Update Candidate Status Error:", error);
    return { success: false, error: "Failed to update candidate status" };
  }
}
