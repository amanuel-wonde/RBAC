# USEDAMS - Test Cases

Based on PROJECT_REFERENCE.md requirements

---

## ✅ Test Case 1: MAC (Mandatory Access Control)

### Test 1.1: User with PUBLIC clearance accessing PUBLIC resource

**Steps:**

1. Create user with PUBLIC clearance level
2. Create resource with PUBLIC security level
3. Attempt to access resource

**Expected:** ✅ Access granted (MAC allows)

### Test 1.2: User with PUBLIC clearance accessing CONFIDENTIAL resource

**Steps:**

1. Create user with PUBLIC clearance level
2. Create resource with CONFIDENTIAL security level
3. Attempt to access resource

**Expected:** ❌ Access denied (MAC blocks - clearance insufficient)

### Test 1.3: User with CONFIDENTIAL clearance accessing all resources

**Steps:**

1. Create user with CONFIDENTIAL clearance level
2. Create resources with PUBLIC, INTERNAL, CONFIDENTIAL levels
3. Attempt to access all resources

**Expected:** ✅ Access granted to all (highest clearance)

---

## ✅ Test Case 2: DAC (Discretionary Access Control)

### Test 2.1: Resource owner accessing own resource

**Steps:**

1. User A creates a resource
2. User A attempts to view/edit/delete the resource

**Expected:** ✅ Access granted (owner has full control)

### Test 2.2: User with explicit permission accessing resource

**Steps:**

1. User A creates a resource
2. User A grants view permission to User B
3. User B attempts to view the resource

**Expected:** ✅ Access granted (DAC permission exists)

### Test 2.3: User without permission accessing resource

**Steps:**

1. User A creates a resource
2. User B (not owner, no permission) attempts to access

**Expected:** ❌ Access denied (no DAC permission)

### Test 2.4: Permission revocation

**Steps:**

1. User A grants permission to User B
2. User A revokes permission
3. User B attempts to access

**Expected:** ❌ Access denied (permission revoked)

---

## ✅ Test Case 3: RBAC (Role-Based Access Control)

### Test 3.1: ADMIN role accessing all permissions

**Steps:**

1. Login as ADMIN
2. Test permissions: view_confidential, manage_users, approve_leave

**Expected:** ✅ All permissions granted (ADMIN has all)

### Test 3.2: EMPLOYEE role accessing restricted permission

**Steps:**

1. Login as EMPLOYEE
2. Test permission: view_confidential

**Expected:** ❌ Access denied (EMPLOYEE doesn't have this permission)

### Test 3.3: HR_MANAGER role accessing HR permissions

**Steps:**

1. Login as HR_MANAGER
2. Test permissions: approve_leave, manage_employees

**Expected:** ✅ Access granted (HR_MANAGER has these permissions)

### Test 3.4: Role change affecting permissions

**Steps:**

1. User has EMPLOYEE role (no view_confidential)
2. Admin changes role to FINANCE_MANAGER
3. User tests view_confidential permission

**Expected:** ✅ Access granted (new role has permission)

---

## ✅ Test Case 4: RuBAC (Rule-Based Access Control)

### Test 4.1: Access during working hours (8 AM - 6 PM)

**Steps:**

1. Set system time to 10 AM
2. Attempt to access resource

**Expected:** ✅ Access granted (within working hours)

### Test 4.2: Access outside working hours

**Steps:**

1. Set system time to 8 PM
2. Attempt to access resource (if rule active)

**Expected:** ❌ Access denied (outside working hours)

### Test 4.3: Department-based rule

**Steps:**

1. Create rule: "Users can only access resources from their department"
2. User from HR department attempts to access Finance resource

**Expected:** ❌ Access denied (different department)

### Test 4.4: IP-based rule

**Steps:**

1. Create rule: "Only allow access from company network"
2. User from external IP attempts to access

**Expected:** ❌ Access denied (IP not from company network)

---

## ✅ Test Case 5: ABAC (Attribute-Based Access Control)

### Test 5.1: Same department access

**Steps:**

1. User from HR department
2. Resource from HR department
3. Attempt to access

**Expected:** ✅ Access granted (same department attribute)

### Test 5.2: Different department access

**Steps:**

1. User from Finance department
2. Resource from HR department
3. Attempt to access

**Expected:** ❌ Access denied (different department attributes)

### Test 5.3: Active employee accessing own profile

**Steps:**

1. User with ACTIVE employment status
2. Attempt to update own profile

**Expected:** ✅ Access granted (active status attribute)

### Test 5.4: Manager accessing department resources

**Steps:**

1. User with MANAGER job level and Finance department
2. Resource from Finance department
3. Attempt to access

**Expected:** ✅ Access granted (job level + department match)

---

## ✅ Test Case 6: Unified Access Control

### Test 6.1: All models allow access

**Steps:**

1. User with CONFIDENTIAL clearance (MAC ✅)
2. User is resource owner (DAC ✅)
3. User has ADMIN role (RBAC ✅)
4. Access during working hours (RuBAC ✅)
5. Same department (ABAC ✅)
6. Attempt to access

**Expected:** ✅ Access granted (all models allow)

### Test 6.2: MAC denies (highest priority)

**Steps:**

1. User with PUBLIC clearance
2. Resource with CONFIDENTIAL level
3. User is owner, has permissions, correct role, etc.

**Expected:** ❌ Access denied (MAC blocks first)

### Test 6.3: RuBAC denies (second priority)

**Steps:**

1. User passes MAC check
2. Access outside working hours (rule active)

**Expected:** ❌ Access denied (RuBAC blocks)

### Test 6.4: RBAC denies (third priority)

**Steps:**

1. User passes MAC and RuBAC
2. User doesn't have required role permission

**Expected:** ❌ Access denied (RBAC blocks)

---

## ✅ Test Case 7: Create Operations

### Test 7.1: Create Document (Resource)

**Steps:**

1. Login as authenticated user
2. Navigate to Documents page
3. Click "Create Document"
4. Fill form: Title, Security Level (MAC), Department (ABAC)
5. Submit

**Expected:**

- ✅ Document created successfully
- ✅ User becomes owner (DAC)
- ✅ Security level set (MAC)
- ✅ Department set (ABAC)
- ✅ Audit log created

### Test 7.2: Create Employee (User)

**Steps:**

1. Login as ADMIN or HR_MANAGER
2. Navigate to Employees page
3. Click "Add Employee"
4. Fill form: Name, Email, Password, Role (RBAC), Clearance (MAC), Department (ABAC), Job Level (ABAC)
5. Submit

**Expected:**

- ✅ Employee created successfully
- ✅ Role assigned (RBAC)
- ✅ Clearance level set (MAC)
- ✅ Attributes set (ABAC)
- ✅ Audit log created

### Test 7.3: Create with insufficient permissions

**Steps:**

1. Login as EMPLOYEE
2. Attempt to create employee

**Expected:** ❌ Access denied (RBAC - EMPLOYEE doesn't have permission)

---

## ✅ Test Case 8: Authentication & Security

### Test 8.1: User Registration

**Steps:**

1. Navigate to Register page
2. Fill form with valid data
3. Submit

**Expected:**

- ✅ User created
- ✅ Email verification token generated
- ✅ Password hashed
- ✅ Default EMPLOYEE role assigned

### Test 8.2: Login with correct credentials

**Steps:**

1. Enter correct email and password
2. Submit

**Expected:**

- ✅ Login successful
- ✅ JWT token generated
- ✅ Session created
- ✅ Redirect to dashboard

### Test 8.3: Login with incorrect password

**Steps:**

1. Enter correct email, wrong password
2. Repeat 5 times

**Expected:**

- ❌ Login failed (first 4 attempts)
- ❌ Account locked (5th attempt)
- ✅ Audit log created for each attempt

### Test 8.4: Account lockout

**Steps:**

1. Account is locked
2. Attempt to login

**Expected:** ❌ Access denied - account locked message

---

## ✅ Test Case 9: Logging & Audit

### Test 9.1: User activity logging

**Steps:**

1. Perform various actions (view, create, edit, delete)
2. Navigate to Admin → Audit Logs

**Expected:**

- ✅ All actions logged
- ✅ User ID, action, timestamp, IP address recorded
- ✅ Status (success/failed/denied) recorded

### Test 9.2: Access denial logging

**Steps:**

1. Attempt to access resource without permission
2. Check audit logs

**Expected:**

- ✅ Denial logged
- ✅ Reason recorded
- ✅ Model that denied access recorded

### Test 9.3: Log export

**Steps:**

1. Navigate to Admin → Audit Logs
2. Click "Export CSV"

**Expected:**

- ✅ CSV file downloaded
- ✅ All log entries included
- ✅ Properly formatted

---

## ✅ Test Case 10: Backup System

### Test 10.1: Create backup

**Steps:**

1. Login as ADMIN
2. Navigate to Admin → Backups
3. Click "Create Backup"

**Expected:**

- ✅ Backup created
- ✅ Backup file generated
- ✅ Metadata saved
- ✅ Audit log created

### Test 10.2: List backups

**Steps:**

1. Navigate to Admin → Backups

**Expected:**

- ✅ All backups listed
- ✅ Timestamp, size, creator shown
- ✅ Status displayed

### Test 10.3: Backup cleanup

**Steps:**

1. Create backup older than 30 days
2. Run cleanup

**Expected:**

- ✅ Old backup deleted
- ✅ Metadata removed

---

## 📋 Test Execution Checklist

### Access Control Models

- [ ] MAC: Test all clearance level combinations
- [ ] DAC: Test ownership and permissions
- [ ] RBAC: Test all roles and permissions
- [ ] RuBAC: Test time, department, IP rules
- [ ] ABAC: Test attribute matching
- [ ] Unified: Test priority order

### Create Operations

- [ ] Create Document (with MAC security level)
- [ ] Create Employee (with RBAC role, MAC clearance, ABAC attributes)
- [ ] Permission checks for create operations

### Authentication

- [ ] Registration
- [ ] Login/Logout
- [ ] Account lockout
- [ ] Session management

### Logging

- [ ] Activity logging
- [ ] Access denial logging
- [ ] Log export

### Backups

- [ ] Create backup
- [ ] List backups
- [ ] Backup cleanup

---

## 🎯 How to Run Tests

1. **Manual Testing:**

   - Use the Demo page to test each access control model
   - Create resources and employees
   - Check audit logs
   - Verify access control decisions

2. **Automated Testing (Future):**
   - Unit tests for each access control model
   - Integration tests for API endpoints
   - E2E tests for user flows

---

**Status:** All test cases defined based on PROJECT_REFERENCE.md requirements
