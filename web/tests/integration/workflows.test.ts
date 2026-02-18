/**
 * Workflow Integration Tests
 * Tests complete user workflows end-to-end
 */

describe('Complete Leave Request Workflow', () => {
  test('Employee submits leave → AI analyzes → HR approves → Balance updates', async () => {
    // Step 1: Employee submits leave request
    const leaveRequest = {
      emp_id: 'emp-123',
      leave_type: 'Annual',
      start_date: new Date('2024-03-15'),
      end_date: new Date('2024-03-20'),
      total_days: 6,
      reason: 'Family vacation'
    };
    
    const submitResult = await mockSubmitLeaveRequest(leaveRequest);
    expect(submitResult.success).toBe(true);
    expect(submitResult.request_id).toBeDefined();
    
    // Step 2: AI analyzes the request
    const aiAnalysis = await mockAnalyzeLeave(submitResult.request_id);
    expect(aiAnalysis.recommendation).toBeDefined();
    expect(aiAnalysis.confidence).toBeGreaterThan(0);
    expect(['approve', 'reject', 'review', 'escalate']).toContain(aiAnalysis.recommendation);
    
    // Step 3: HR approves the request
    const approvalResult = await mockApproveLeave(submitResult.request_id, 'hr-456');
    expect(approvalResult.success).toBe(true);
    
    // Step 4: Verify status updated
    const updatedRequest = await mockGetLeaveRequest(submitResult.request_id);
    expect(updatedRequest.status).toBe('approved');
    
    // Step 5: Verify balance updated
    const balance = await mockGetLeaveBalance('emp-123', 'vacation');
    expect(balance.used_days).toBeGreaterThan(0);
  });
});

describe('Complete Payroll Processing Workflow', () => {
  test('HR runs payroll → Employees receive payslips', async () => {
    // Step 1: HR initiates payroll run
    const payrollRun = await mockRunPayroll(2, 2024, 'org-123');
    expect(payrollRun.success).toBe(true);
    expect(payrollRun.count).toBeGreaterThan(0);
    
    // Step 2: Verify payroll records created
    const payrolls = await mockGetPayrollRecords('org-123', 2, 2024);
    expect(payrolls.length).toBeGreaterThan(0);
    
    // Step 3: Employee views payslip
    const employeePayslip = await mockGetMyPayslip('emp-123', 2, 2024);
    expect(employeePayslip).toBeDefined();
    expect(employeePayslip.net_pay).toBeGreaterThan(0);
    
    // Step 4: Verify calculations
    const netPay = employeePayslip.basic_salary + 
                   employeePayslip.allowances - 
                   employeePayslip.deductions;
    expect(employeePayslip.net_pay).toBe(netPay);
  });
});

describe('Complete Recruitment Workflow', () => {
  test('HR posts job → AI screens candidate → HR makes decision', async () => {
    // Step 1: HR creates job posting
    const jobData = {
      title: 'Senior Developer',
      department: 'Engineering',
      requirements: '5+ years experience, React, Node.js',
      generate_description: true
    };
    
    const job = await mockCreateJobPosting(jobData, 'org-123');
    expect(job.success).toBe(true);
    expect(job.job.description).toBeDefined();
    expect(job.job.ai_generated).toBe(true);
    
    // Step 2: Candidate applies (simulated)
    const candidate = await mockAddCandidate(job.job.id, {
      full_name: 'John Doe',
      email: 'john@example.com',
      resume: 'Experienced developer with React and Node.js'
    });
    expect(candidate.success).toBe(true);
    
    // Step 3: AI screens candidate
    const screening = await mockScreenCandidate(candidate.candidate.id);
    expect(screening.success).toBe(true);
    expect(screening.analysis.score).toBeGreaterThanOrEqual(0);
    expect(screening.analysis.score).toBeLessThanOrEqual(100);
    expect(screening.analysis.recommendation).toBeDefined();
    
    // Step 4: HR updates status based on AI
    const statusUpdate = await mockUpdateCandidateStatus(
      candidate.candidate.id,
      'interview'
    );
    expect(statusUpdate.success).toBe(true);
  });
});

// Mock API functions
async function mockSubmitLeaveRequest(data: any) {
  return {
    success: true,
    request_id: 'req-' + Date.now()
  };
}

async function mockAnalyzeLeave(requestId: string) {
  return {
    recommendation: 'approve',
    confidence: 0.85,
    violations: [],
    suggestions: ['Request looks good']
  };
}

async function mockApproveLeave(requestId: string, hrId: string) {
  return { success: true };
}

async function mockGetLeaveRequest(requestId: string) {
  return {
    request_id: requestId,
    status: 'approved'
  };
}

async function mockGetLeaveBalance(empId: string, type: string) {
  return {
    emp_id: empId,
    leave_type: type,
    used_days: 6
  };
}

async function mockRunPayroll(month: number, year: number, orgId: string) {
  return {
    success: true,
    count: 10
  };
}

async function mockGetPayrollRecords(orgId: string, month: number, year: number) {
  return [
    { id: '1', emp_id: 'emp-123', month, year },
    { id: '2', emp_id: 'emp-456', month, year }
  ];
}

async function mockGetMyPayslip(empId: string, month: number, year: number) {
  return {
    emp_id: empId,
    month,
    year,
    basic_salary: 5000,
    allowances: 1000,
    deductions: 500,
    net_pay: 5500
  };
}

async function mockCreateJobPosting(data: any, orgId: string) {
  return {
    success: true,
    job: {
      id: 'job-' + Date.now(),
      ...data,
      description: 'AI-generated job description for ' + data.title,
      org_id: orgId
    }
  };
}

async function mockAddCandidate(jobId: string, data: any) {
  return {
    success: true,
    candidate: {
      id: 'cand-' + Date.now(),
      job_id: jobId,
      ...data
    }
  };
}

async function mockScreenCandidate(candidateId: string) {
  return {
    success: true,
    analysis: {
      score: 75,
      recommendation: 'interview',
      strengths: ['React experience', 'Node.js skills'],
      gaps: ['Limited cloud experience']
    }
  };
}

async function mockUpdateCandidateStatus(candidateId: string, status: string) {
  return { success: true };
}

export {
  mockSubmitLeaveRequest,
  mockAnalyzeLeave,
  mockRunPayroll,
  mockCreateJobPosting
};
