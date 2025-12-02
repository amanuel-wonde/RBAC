# Testing Guide - Employee Records & Access Management System (ERAMS)

This guide provides step-by-step instructions for testing all access control mechanisms and features in the USEDAMS system, focusing on **Employee Records & Access Management** functionality.

---

## Prerequisites

1. **System Setup:**

   - Docker and Docker Compose installed
   - Node.js 18+ installed
   - Database running (`docker-compose up -d`)
   - Application running (`npm run dev`)

2. **Default Admin Account:**

   - Email: `admin@usedams.com`
   - Password: `Admin123!@#`
   - Role: ADMIN
   - Clearance: CONFIDENTIAL

3. **Test Users:**
   - Create test users with different roles and clearance levels as needed

---

## SECTION 1: User Management & Authentication

### TC-UM-01: User Registration With Email Verification

**Pre-condition:** User not registered

**Steps:**

1. Navigate to `/register`
2. Fill in the registration form:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "Test123!@#"
   - Confirm Password: "Test123!@#"
3. Click "Register"
4. Check console/logs for verification token
5. Navigate to `/api/auth/verify-email?token=<token>` (or use the token from logs)

**Expected Result:**

- User account created
- Email verification token generated
- After verification, user status shows as verified
- User can now login

---

### TC-UM-02: Password Policy Enforcement

**Pre-condition:** Registration page open

**Steps:**

1. Navigate to `/register`
2. Enter weak password (e.g., "1234")
3. Try to submit

**Expected Result:**

- System rejects password
- Error message shows password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

---

### TC-UM-03: Login With Correct Credentials

**Pre-condition:** Verified user exists

**Steps:**

1. Navigate to `/login`
2. Enter correct email and password
3. Click "Login"

**Expected Result:**

- User authenticated successfully
- Session created
- Redirected to dashboard
- Log entry created in audit logs
- Token stored in localStorage

**Verify in Admin Panel:**

- Go to `/admin/logs`
- Filter by action: "login"
- Should see successful login entry with IP address and timestamp

---

### TC-UM-04: Failed Login Lockout Mechanism

**Pre-condition:** User account exists

**Steps:**

1. Navigate to `/login`
2. Enter correct email but wrong password
3. Repeat 5 times (enter wrong password 5 times)

**Expected Result:**

- After 5 failed attempts:
  - Account locked
  - Error message: "Account is locked. Please contact administrator."
  - Log entry added with status: DENIED
  - Email alert sent (check logs/console)

**Verify:**

- Try to login with correct password - should still be locked
- Check audit logs for 5 failed attempts + 1 lockout event

---

### TC-UM-05: MFA Login Using OTP

**Pre-condition:** MFA enabled (or test with API)

**Steps:**

1. Login with correct credentials
2. If MFA is required:
   - Navigate to `/api/auth/mfa` (POST with email)
   - Check console/logs for OTP (in development mode)
   - Enter OTP via `/api/auth/mfa` (PUT with OTP)

**Expected Result:**

- OTP generated and sent (check console in dev mode)
- Authentication successful with MFA
- MFA log recorded in audit logs

**Note:** In production, OTP would be sent via email. In development, check console output.

---

## SECTION 2: Mandatory Access Control (MAC)

### TC-MAC-01: Confidential Employee Record Access With Insufficient Clearance

**Pre-condition:**

- User clearance = INTERNAL
- Record classification = CONFIDENTIAL

**Steps:**

1. Login as a user with INTERNAL clearance level
2. Create or find a document/resource with CONFIDENTIAL security level
3. Attempt to view the document

**Expected Result:**

- Access denied
- Error message: "Access denied - Insufficient clearance level"
- Access model shown: MAC
- Alert logged in audit logs
- Status: DENIED

**Verify:**

- Check `/admin/logs` for access denial entry
- Entry should show:
  - Action: "view_resource"
  - Status: DENIED
  - Model: MAC
  - Reason: "Insufficient clearance level"

---

### TC-MAC-02: Higher Clearance Access Success

**Pre-condition:**

- User clearance = CONFIDENTIAL
- Record classification = CONFIDENTIAL

**Steps:**

1. Login as ADMIN (has CONFIDENTIAL clearance)
2. Navigate to Documents
3. Create a document with CONFIDENTIAL security level
4. View the document

**Expected Result:**

- Access granted
- Document displayed
- Log entry recorded with status: SUCCESS
- Access model: MAC

**Verify:**

- Check audit logs - should show successful access
- Access model should be "MAC"

---

## SECTION 3: Role-Based Access Control (RBAC)

### TC-RBAC-01: HR Manager Can Approve Leave

**Pre-condition:** User role = HR_MANAGER

**Steps:**

1. Login as HR_MANAGER
2. Navigate to `/leave`
3. View pending leave requests
4. Click "Approve" on a leave request

**Expected Result:**

- Approval successful
- Leave request status updated
- Log generated with:
  - Action: "approve_leave"
  - Status: SUCCESS
  - Access models: RBAC, ABAC, RuBAC

**Verify:**

- Check audit logs for approval entry
- Leave request should show as approved

---

### TC-RBAC-02: Employee Cannot Approve Leave

**Pre-condition:** User role = EMPLOYEE

**Steps:**

1. Login as EMPLOYEE
2. Navigate to `/leave`
3. Try to approve a leave request (if visible)

**Expected Result:**

- Access denied
- Error message: "Only managers can approve leave"
- Action logged with status: DENIED
- Access model: RBAC

**Verify:**

- Check audit logs for denial entry
- Should show RBAC as the denying model

---

## SECTION 4: Rule-Based Access Control (RuBAC)

### TC-RuBAC-01: Deny Login Outside Work Hours

**Pre-condition:** Time = 22:00 (outside allowed hours 8AM-6PM)

**Steps:**

1. **Option 1:** Change system time to 22:00 (or modify rule temporarily)
2. **Option 2:** Test via API with time-based rule
3. Attempt to login

**Expected Result:**

- System denies login due to time-based rule
- Error message: "Access denied outside working hours"
- Access model: RuBAC
- Log entry with status: DENIED

**Note:** To test this easily, you can temporarily modify the working hours rule in the database or test via API.

---

### TC-RuBAC-02: HR Manager Approves Leave >10 Days

**Pre-condition:**

- Rule: "Only HR Managers can approve >10 days"
- Role = HR_MANAGER
- Request = 12 days

**Steps:**

1. Login as HR_MANAGER
2. Navigate to `/leave`
3. Create a leave request for 12 days (start date to end date = 12 days)
4. As HR_MANAGER, approve the request

**Expected Result:**

- Approval successful
- Rule enforced: Only HR_MANAGER can approve >10 days
- Log shows access models: RBAC, RuBAC

**Verify:**

- Try approving as DEPARTMENT_MANAGER - should fail
- Check audit logs for rule enforcement

---

## SECTION 5: Attribute-Based Access Control (ABAC)

### TC-ABAC-01: Department-Based Access Denial

**Pre-condition:**

- User department = IT
- Record department = Finance

**Steps:**

1. Create a user with department = "IT"
2. Create a document with department = "Finance"
3. Login as IT user
4. Attempt to access Finance document

**Expected Result:**

- Access denied due to department mismatch
- Error message: "Access denied - Department mismatch"
- Access model: ABAC
- Log entry with status: DENIED

**Verify:**

- Check audit logs
- Should show ABAC as denying model
- Reason: Department mismatch

---

### TC-ABAC-02: Attribute Combination Successful

**Pre-condition:**
User attributes match policy:

- role = MANAGER (or DEPARTMENT_MANAGER)
- department = Finance
- time = working hours

**Steps:**

1. Create user with:
   - Role: DEPARTMENT_MANAGER
   - Department: Finance
2. Create document with department: Finance
3. Login as this user
4. Access the Finance document

**Expected Result:**

- Action allowed
- Access model: ABAC
- Logged with status: SUCCESS

**Verify:**

- Check audit logs
- Access model should be ABAC
- All attributes matched

---

## SECTION 6: Logging & Audit

### TC-LOG-01: Activity Log Created on Access

**Steps:**

1. Login as any user
2. View a document/resource
3. Navigate to `/admin/logs`

**Expected Result:**

- Log entry created with:
  - userId: Current user ID
  - action: "view_resource"
  - timestamp: Current time
  - IP: User's IP address
  - status: SUCCESS

**Verify:**

- Go to `/admin/logs`
- Filter by your user
- Should see the view action logged

---

### TC-LOG-02: Log Encryption Verification

**Steps:**

1. Access database directly (via Prisma Studio or SQL client)
2. Query `AuditLog` table
3. Check `details` field

**Expected Result:**

- Logs stored in database
- Details stored as JSON (not encrypted in this implementation, but can be verified)
- All sensitive information logged

**Note:** In production, logs should be encrypted. This implementation stores logs as JSON for audit purposes.

---

## Quick Test Checklist

- [ ] User registration works
- [ ] Password policy enforced
- [ ] Login works
- [ ] Account lockout after 5 failed attempts
- [ ] MFA OTP generation works
- [ ] MAC blocks insufficient clearance
- [ ] MAC allows sufficient clearance
- [ ] RBAC allows role-based actions
- [ ] RBAC blocks unauthorized roles
- [ ] RuBAC enforces time-based rules
- [ ] RuBAC enforces leave approval rules
- [ ] ABAC blocks department mismatch
- [ ] ABAC allows matching attributes
- [ ] All actions logged in audit trail
- [ ] Logs accessible via admin panel

---

## Troubleshooting

1. **Database not running:**

   - Run `docker-compose up -d`

2. **Build errors:**

   - Run `npm install`
   - Run `npx prisma generate`
   - Run `npx prisma migrate dev`

3. **No test users:**

   - Use seed script: `npx tsx prisma/seed.ts`
   - Or create users via `/employees` page (as ADMIN)

4. **Logs not showing:**
   - Check database connection
   - Verify user has ADMIN role to view logs

---

## Additional Notes

- All access control decisions are logged
- Access models are displayed in UI when accessing resources
- Admin panel (`/admin/logs`) shows all audit trails
- Test with different user roles to see RBAC in action
- Test with different clearance levels to see MAC in action
- Test with different departments to see ABAC in action
