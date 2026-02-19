# Dynamic Company-Specific Policy Configuration System

## Overview
This document describes the implementation of dynamic, company-specific leave policies and HR configurations that adapt per organization in the multi-tenant HR platform.

## Problem Statement
When companies register and use the HR platform, each company has:
- Different leave quotas (annual, sick, personal, etc.)
- Different working hours and schedules
- Different public holidays
- Different blackout periods
- Different notice period requirements
- Different team coverage rules

**The system must:**
1. Allow HR to configure company-specific policies
2. Store policies per company (org_id)
3. Have the constraint engine dynamically adapt to each company's rules
4. Display current policies in the HR dashboard

## Implementation

### Phase 1: Policy Management UI ✅ COMPLETED

#### Files Created
1. **`web/app/actions/policy.ts`** - Server actions for policy CRUD
2. **`web/app/hr/(main)/settings/page.tsx`** - Policy settings UI

#### Features Implemented
- **Leave Quotas Management**: Configure annual days for each leave type
- **Working Hours Configuration**: Set check-in/out times, flexible hours with core hours
- **Public Holidays Calendar**: Add/edit/remove company holidays
- **Blackout Periods**: Define periods when leaves cannot be taken
- **Policy Templates**: Pre-built templates for Tech, Finance, Healthcare industries
- **Auto-Initialization**: Creates default policy when company first accesses settings

#### Policy Structure
```typescript
{
  leave_quotas: {
    "Annual Leave": 20,
    "Sick Leave": 15,
    "Personal Leave": 5,
    // ... more types
  },
  working_hours: {
    check_in: "09:00",
    check_out: "18:00",
    flexible: false,
    core_hours_start: "10:00", // if flexible
    core_hours_end: "16:00"    // if flexible
  },
  holidays: [
    { date: "2024-01-01", name: "New Year's Day" },
    // ... more holidays
  ],
  notice_periods: {
    "Annual Leave": 7,  // days
    "Sick Leave": 0,
    // ... per leave type
  },
  blackout_dates: [
    { start: "2024-12-15", end: "2024-12-31", reason: "Year-end closing" }
  ],
  team_coverage: {
    min_coverage_percent: 60,
    max_concurrent_leave: 2
  },
  max_consecutive_days: {
    "Annual Leave": 10,
    "Sick Leave": 5
  },
  probation_restrictions: {
    enabled: true,
    probation_period_days: 90,
    allowed_leave_types: ["Emergency Leave", "Sick Leave"],
    max_days_during_probation: 3
  }
}
```

#### Access Control
- Only HR and Admin roles can update policies
- Policies are scoped to company (org_id)
- Audit log created on every policy change
- Automatic default policy creation for new companies

### Phase 2: Dynamic Constraint Engine 🔄 IN PROGRESS

#### Current State
The Python constraint engine (`backend/ai-services/leave-agent/constraint_engine.py`) currently uses **hardcoded rules**:

```python
CONSTRAINT_RULES = {
    "RULE001": {
        "name": "Maximum Leave Duration",
        "limits": {
            "Annual Leave": 20,  # HARDCODED
            "Sick Leave": 15,
            // ...
        }
    }
}
```

#### What Needs to Change
The engine must:
1. **Connect to PostgreSQL** database
2. **Fetch company-specific policy** from `constraint_policies` table
3. **Apply dynamic rules** based on the policy JSON
4. **Cache policies** for performance (5-10 minute TTL)

#### Implementation Plan
```python
import psycopg2
from functools import lru_cache
from datetime import datetime, timedelta

# Database connection
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "database": os.getenv("DB_NAME", "hr_platform"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "")
}

# Cache policy per company for 5 minutes
policy_cache = {}
CACHE_TTL = 300  # 5 minutes

def get_company_policy(org_id: str):
    """Fetch company policy from database with caching"""
    now = datetime.now()
    
    # Check cache
    if org_id in policy_cache:
        cached_data, cached_time = policy_cache[org_id]
        if (now - cached_time).total_seconds() < CACHE_TTL:
            return cached_data
    
    # Fetch from database
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    query = """
        SELECT rules 
        FROM constraint_policies 
        WHERE org_id = %s AND is_active = true 
        ORDER BY updated_at DESC 
        LIMIT 1
    """
    cursor.execute(query, (org_id,))
    result = cursor.fetchone()
    
    if result:
        policy = result[0]  # JSON column
        policy_cache[org_id] = (policy, now)
        return policy
    
    # Return default policy if not found
    return DEFAULT_POLICY

def check_leave_quota(emp_id, leave_type, requested_days, org_id):
    """Check if request is within company's leave quota"""
    policy = get_company_policy(org_id)
    quotas = policy.get('leave_quotas', {})
    
    max_days = quotas.get(leave_type, 0)
    if requested_days > max_days:
        return {
            "passed": False,
            "violation": f"{leave_type} quota is {max_days} days, requested {requested_days}"
        }
    
    return {"passed": True}
```

#### Files to Modify
1. **`backend/ai-services/leave-agent/constraint_engine.py`**
   - Add PostgreSQL connection
   - Implement `get_company_policy(org_id)`
   - Update all constraint rules to use dynamic policy
   - Add caching layer

2. **`backend/ai-services/leave-agent/requirements.txt`**
   - Add `psycopg2-binary` for PostgreSQL

3. **`backend/ai-services/leave-agent/server.py`**
   - Accept `org_id` in request payload
   - Pass `org_id` to constraint checks

4. **`web/app/actions/leave-constraints.ts`**
   - Include `org_id` when calling Python agent
   - Pass company context in payload

### Phase 3: Dashboard Integration 🔄 PENDING

#### HR Dashboard Enhancements
Add policy summary section to `/hr/dashboard`:

```tsx
// Policy Summary Card
<div className="glass-panel p-6">
  <h3>Leave Policy Configuration</h3>
  <div className="stats">
    <div>Leave Types: {totalLeaveTypes}</div>
    <div>Holidays: {totalHolidays}</div>
    <div>Last Updated: {lastUpdated}</div>
  </div>
  <Link href="/hr/settings">
    <button>Manage Policies</button>
  </Link>
</div>
```

#### Employee View
Show relevant policy info on employee leave request page:

```tsx
// Display available quotas
<div className="leave-quotas">
  <h4>Your Leave Balance</h4>
  {leaveTypes.map(type => (
    <div key={type}>
      <span>{type}</span>
      <span>{used}/{quota} days</span>
    </div>
  ))}
</div>

// Show company holidays
<div className="holidays-info">
  <h4>Upcoming Holidays</h4>
  {holidays.map(h => (
    <div>{h.date}: {h.name}</div>
  ))}
</div>
```

### Phase 4: Company Onboarding 🔄 PENDING

#### Initial Setup Wizard
When a new company signs up, guide them through policy setup:

1. **Step 1: Company Info** (already exists)
   - Company name, code, industry

2. **Step 2: Policy Template Selection** (new)
   - Choose: Tech / Finance / Healthcare / Custom
   - Preview template settings

3. **Step 3: Leave Quotas** (new)
   - Configure annual leave days per type
   - Add/remove leave types

4. **Step 4: Working Hours** (new)
   - Set standard hours or flexible schedule
   - Define core hours if flexible

5. **Step 5: Holidays** (new)
   - Select country for default holidays
   - Add custom holidays

6. **Step 6: Finalize** (new)
   - Review all settings
   - Confirm and create policy

#### Implementation
```typescript
// web/app/hr/onboarding-setup/page.tsx
export default function OnboardingSetup() {
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState('default');
  const [policyData, setPolicyData] = useState({});
  
  const handleFinalize = async () => {
    // Create company policy
    await initializeCompanyPolicy(companyId, template);
    
    // Redirect to dashboard
    router.push('/hr/dashboard');
  };
}
```

## How It All Works Together

### Scenario: New Company Registers

1. **HR signs up** → Company record created in database
2. **First login** → Redirected to policy setup wizard (optional)
3. **HR configures policies** → Saved to `constraint_policies` table
4. **Employee requests leave** → Leave request analysis action called
5. **Analysis action** → Calls Python constraint engine with `org_id`
6. **Constraint engine** → Fetches company's policy from DB (cached)
7. **Engine applies rules** → Uses company-specific quotas, holidays, blackouts
8. **Returns recommendation** → Approve/Reject/Review/Escalate
9. **HR sees result** → With policy-specific violation details

### Data Flow
```
Employee Submit Leave
        ↓
Next.js Server Action (analyzeLeaveRequest)
        ↓
Fetch Company Policy (getCompanyPolicy)
        ↓
Build Payload with org_id + policy rules
        ↓
POST to Python Agent (localhost:8001/analyze)
        ↓
Python: get_company_policy(org_id) from PostgreSQL
        ↓
Python: Apply dynamic constraint rules
        ↓
Python: Return recommendation + violations
        ↓
Next.js: Show AI Analysis to HR
        ↓
HR: Approve/Reject based on recommendation
```

## Database Schema

### constraint_policies Table (already exists)
```sql
CREATE TABLE constraint_policies (
  id VARCHAR PRIMARY KEY,
  org_id VARCHAR NOT NULL,  -- Foreign key to companies
  name VARCHAR DEFAULT 'Default Policy',
  rules JSONB NOT NULL,      -- Policy configuration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (org_id) REFERENCES companies(id)
);
```

### Example Query
```sql
-- Fetch active policy for a company
SELECT rules 
FROM constraint_policies 
WHERE org_id = 'company-uuid-123' 
  AND is_active = true 
ORDER BY updated_at DESC 
LIMIT 1;
```

## Environment Variables

### Web (Next.js)
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
AI_AGENT_URL=http://localhost:8001/analyze
```

### Python Agent
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hr_platform
DB_USER=postgres
DB_PASSWORD=yourpassword
CACHE_TTL=300  # seconds
```

## Testing Scenarios

### Test 1: Different Companies, Different Quotas
- Company A: 20 days annual leave
- Company B: 25 days annual leave
- Employee from A requests 22 days → Rejected (exceeds quota)
- Employee from B requests 22 days → Approved (within quota)

### Test 2: Different Holidays
- Company A (India): Diwali is a holiday
- Company B (USA): Thanksgiving is a holiday
- Leave on Diwali:
  - Company A employee → Counts as holiday (not deducted)
  - Company B employee → Counts as leave day (deducted)

### Test 3: Different Blackout Periods
- Company A: Blackout Dec 15-31 (year-end closing)
- Company B: Blackout Apr 1-15 (tax season)
- Company A employee requests Dec 20 → Rejected (blackout)
- Company B employee requests Dec 20 → Approved (no blackout)

## Security Considerations

1. **Multi-Tenancy**: All policy queries filtered by `org_id`
2. **Access Control**: Only HR/Admin can edit policies
3. **Audit Trail**: Policy changes logged in `audit_logs` table
4. **Validation**: Input validation on all policy fields
5. **SQL Injection**: Parameterized queries in Python
6. **Cache Poisoning**: Cache keyed by `org_id`, limited TTL

## Performance Optimization

1. **Caching**: Policy cached for 5 minutes per company
2. **Connection Pooling**: PostgreSQL connection pool in Python
3. **Lazy Loading**: Policies only fetched when needed
4. **Index**: Index on `org_id` + `is_active` for fast lookups
5. **JSON Indexing**: GIN index on `rules` JSONB column for deep queries

## Future Enhancements

1. **Policy Versioning**: Track history of policy changes
2. **A/B Testing**: Test different policies with subset of employees
3. **Policy Templates Marketplace**: Share templates across companies
4. **Compliance Checker**: Validate policies against labor laws
5. **Recommendation Engine**: Suggest optimal policies based on industry
6. **Multi-Location Policies**: Different policies per office/country
7. **Role-Based Policies**: Different quotas for managers vs employees
8. **Dynamic Rules**: If-then rules (e.g., if tenure > 5 years, +5 days)

## Conclusion

The dynamic policy configuration system allows each company to:
- ✅ Define their own leave policies
- ✅ Configure working hours and schedules
- ✅ Set company holidays
- ✅ Define blackout periods
- ✅ Have the constraint engine automatically adapt
- ✅ Update policies anytime without code changes

This makes the platform truly multi-tenant and production-ready for diverse companies with different HR policies.
