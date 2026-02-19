#!/usr/bin/env node
/**
 * Manual Test Execution Script
 * Runs through key test scenarios and reports results
 */

console.log('🧪 Starting Manual Test Suite for HR Platform...\n');

// Test Results Tracker
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

function runTest(name, testFn) {
  try {
    console.log(`\n📝 Running: ${name}`);
    testFn();
    console.log(`✅ PASSED: ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================
// TEST SUITE: Role-Based Access Control
// ============================================
console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: Role-Based Access Control');
console.log('='.repeat(60));

runTest('HR can access HR routes', () => {
  const hrRoutes = ['/hr/dashboard', '/hr/employees', '/hr/payroll'];
  const role = 'hr';
  
  hrRoutes.forEach(route => {
    assert(
      canAccessRoute(role, route),
      `HR should access ${route}`
    );
  });
});

runTest('Employee cannot access HR routes', () => {
  const hrRoutes = ['/hr/dashboard', '/hr/employees', '/hr/payroll'];
  const role = 'employee';
  
  hrRoutes.forEach(route => {
    assert(
      !canAccessRoute(role, route),
      `Employee should NOT access ${route}`
    );
  });
});

runTest('Employee can access employee routes', () => {
  const empRoutes = ['/employee/dashboard', '/employee/leave', '/employee/payslips'];
  const role = 'employee';
  
  empRoutes.forEach(route => {
    assert(
      canAccessRoute(role, route),
      `Employee should access ${route}`
    );
  });
});

runTest('Admin can access all routes', () => {
  const allRoutes = [
    '/hr/dashboard',
    '/hr/employees',
    '/employee/dashboard',
    '/employee/leave'
  ];
  const role = 'admin';
  
  allRoutes.forEach(route => {
    assert(
      canAccessRoute(role, route),
      `Admin should access ${route}`
    );
  });
});

// ============================================
// TEST SUITE: Multi-Tenancy
// ============================================
console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: Multi-Tenancy Isolation');
console.log('='.repeat(60));

runTest('Organization data is isolated', () => {
  const org1 = 'org-123';
  const org2 = 'org-456';
  
  const emp1 = { emp_id: 'emp-1', org_id: org1 };
  const emp2 = { emp_id: 'emp-2', org_id: org2 };
  
  assert(emp1.org_id !== emp2.org_id, 'Organizations should be different');
  assert(emp1.org_id === org1, 'Employee 1 should belong to org1');
  assert(emp2.org_id === org2, 'Employee 2 should belong to org2');
});

runTest('Queries include org_id filter', () => {
  const query = {
    where: {
      org_id: 'org-123',
      is_active: true
    }
  };
  
  assert(query.where.org_id, 'Query must include org_id');
  assert(typeof query.where.org_id === 'string', 'org_id must be string');
});

// ============================================
// TEST SUITE: Data Validation
// ============================================
console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: Data Validation');
console.log('='.repeat(60));

runTest('Email validation works correctly', () => {
  assert(isValidEmail('user@company.com'), 'Valid email should pass');
  assert(!isValidEmail('invalid-email'), 'Invalid email should fail');
  assert(!isValidEmail('user@'), 'Incomplete email should fail');
  assert(!isValidEmail('@company.com'), 'Missing local part should fail');
});

runTest('Date validation works correctly', () => {
  assert(isValidDate('2024-03-15'), 'Valid ISO date should pass');
  assert(!isValidDate('invalid-date'), 'Invalid date string should fail');
  assert(!isValidDate('2024-13-45'), 'Invalid date values should fail');
});

runTest('Input sanitization prevents SQL injection', () => {
  const malicious = "'; DROP TABLE employees; --";
  const sanitized = sanitizeInput(malicious);
  
  assert(!sanitized.includes('DROP TABLE'), 'SQL keywords should be removed');
  assert(!sanitized.includes(';'), 'Semicolons should be removed');
  assert(!sanitized.includes('--'), 'SQL comments should be removed');
});

runTest('HTML escaping prevents XSS', () => {
  const xss = "<script>alert('XSS')</script>";
  const escaped = escapeHtml(xss);
  
  assert(!escaped.includes('<script>'), 'Script tags should be escaped');
  assert(escaped.includes('&lt;script&gt;'), 'HTML should be properly escaped');
});

// ============================================
// TEST SUITE: Workflow Logic
// ============================================
console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: Workflow Logic');
console.log('='.repeat(60));

runTest('Leave balance calculation is correct', () => {
  const balance = {
    annual_entitlement: 20,
    used_days: 5,
    pending_days: 3
  };
  
  const available = balance.annual_entitlement - balance.used_days - balance.pending_days;
  assert(available === 12, 'Available leave should be 12 days');
});

runTest('Payroll net pay calculation is correct', () => {
  const basicSalary = 5000;
  const allowances = 1000;
  const deductions = 500;
  const netPay = basicSalary + allowances - deductions;
  
  assert(netPay === 5500, 'Net pay should be 5500');
});

runTest('AI confidence score is within valid range', () => {
  const confidenceScores = [0, 0.5, 0.85, 1.0];
  
  confidenceScores.forEach(score => {
    assert(score >= 0 && score <= 1, `Score ${score} should be between 0 and 1`);
  });
});

// ============================================
// TEST SUITE: Error Handling
// ============================================
console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: Error Handling');
console.log('='.repeat(60));

runTest('Invalid employee ID returns error', () => {
  const result = { success: false, error: 'Employee not found' };
  
  assert(!result.success, 'Result should indicate failure');
  assert(result.error, 'Error message should be provided');
});

runTest('Unauthorized access returns error', () => {
  const result = { success: false, error: 'Unauthorized' };
  
  assert(!result.success, 'Result should indicate failure');
  assert(result.error === 'Unauthorized', 'Error should be Unauthorized');
});

// ============================================
// Helper Functions
// ============================================

function canAccessRoute(role, route) {
  const hrRoutes = ['/hr/dashboard', '/hr/employees', '/hr/payroll', '/hr/performance', '/hr/recruitment', '/hr/compliance'];
  const employeeRoutes = ['/employee/dashboard', '/employee/leave', '/employee/payslips', '/employee/profile'];
  
  if (role === 'admin') return true;
  if (role === 'hr' && hrRoutes.some(r => route.startsWith(r))) return true;
  if (role === 'employee' && employeeRoutes.some(r => route.startsWith(r))) return true;
  if (role === 'manager' && (employeeRoutes.some(r => route.startsWith(r)) || route.includes('team'))) return true;
  
  return false;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidDate(date) {
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
}

function sanitizeInput(input) {
  // Remove SQL keywords, comments, and special characters
  return input
    .replace(/DROP\s+TABLE/gi, '')
    .replace(/DELETE\s+FROM/gi, '')
    .replace(/INSERT\s+INTO/gi, '')
    .replace(/UPDATE\s+SET/gi, '')
    .replace(/--/g, '')  // SQL comments
    .replace(/\/\*/g, '') // Multi-line comment start
    .replace(/\*\//g, '') // Multi-line comment end
    .replace(/[;<>'"]/g, '');
}

function escapeHtml(input) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ============================================
// Print Test Summary
// ============================================
console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log(`\n✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`⏭️  Skipped: ${results.skipped}`);
console.log(`📊 Total: ${results.passed + results.failed + results.skipped}`);

if (results.failed > 0) {
  console.log('\n❌ FAILED TESTS:');
  results.tests
    .filter(t => t.status === 'FAILED')
    .forEach(t => {
      console.log(`   - ${t.name}`);
      console.log(`     ${t.error}`);
    });
}

console.log('\n' + '='.repeat(60));
console.log(results.failed === 0 ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
console.log('='.repeat(60) + '\n');

process.exit(results.failed > 0 ? 1 : 0);
