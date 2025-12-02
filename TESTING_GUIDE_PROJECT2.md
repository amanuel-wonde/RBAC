# Testing Guide - Secure Document Sharing & Permission Management Portal (SDSPMP)

This guide provides step-by-step instructions for testing all access control mechanisms and features in the USEDAMS system, focusing on **Document Sharing & Permission Management** functionality.

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
   - User A: Document owner
   - User B: Regular user (for sharing tests)
   - Create test users with different roles as needed

---

## SECTION 1: Mandatory Access Control (MAC)

### TC-MAC-03: Confidential Document Blocked for Low Clearance

**Pre-condition:**
- User clearance = INTERNAL
- Document = CONFIDENTIAL

**Steps:**
1. Login as a user with INTERNAL clearance
2. Navigate to `/documents`
3. Create a document with CONFIDENTIAL security level (as ADMIN first)
4. Or find an existing CONFIDENTIAL document
5. Attempt to view/download the document

**Expected Result:**
- Access denied
- Error message: "Access denied - Insufficient clearance level"
- Access model: MAC
- Download blocked
- Log entry with status: DENIED

**Verify:**
- Check `/admin/logs` for denial entry
- Should show MAC as denying model
- User's clearance level vs document security level logged

---

## SECTION 2: Discretionary Access Control (DAC)

### TC-DAC-01: Owner Grants View Permission

**Pre-condition:**
- Document belongs to User A
- User B has no access

**Steps:**
1. Login as User A (document owner)
2. Navigate to `/documents`
3. Create a document or select an existing one
4. Click on the document to view details
5. Click "Share Document (DAC)" button
6. Enter User B's email
7. Check "Can View" permission
8. Click "Grant Permission"

**Expected Result:**
- Permission granted successfully
- User B now has view access
- Log entry created: "User A granted User B view access"
- Access model: DAC

**Verify:**
- Logout and login as User B
- Navigate to `/documents`
- Should be able to view the shared document
- Check audit logs for permission grant entry

---

### TC-DAC-02: Revoked Access Blocks User

**Pre-condition:**
- User B previously had access

**Steps:**
1. Login as User A (document owner)
2. Navigate to `/documents`
3. Click on the shared document
4. Scroll to "Shared With (DAC Permissions)" section
5. Find User B in the list
6. Click "Revoke" button
7. Confirm revocation
8. Logout and login as User B
9. Attempt to open the document

**Expected Result:**
- Permission revoked successfully
- User B's access removed
- When User B tries to access:
  - Access denied
  - Error message: "Access denied - No explicit permission"
  - Access model: DAC
  - Log entry with status: DENIED

**Verify:**
- Check audit logs for revocation entry
- User B should not see the document in their list
- Access attempt should be denied

---

### TC-DAC-03: Permission Change Logged

**Steps:**
1. Login as document owner
2. Share document with a user
3. Navigate to `/admin/logs`
4. Filter by action: "grant_permission" or "revoke_permission"

**Expected Result:**
- Log created showing:
  - Action: "grant_permission" or "revoke_permission"
  - Resource ID
  - User who granted/revoked
  - User who received/lost permission
  - Timestamp
  - IP address
  - Status: SUCCESS

**Verify:**
- Check audit logs show all permission changes
- Details include both users involved

---

## SECTION 3: Role-Based Access Control (RBAC)

### TC-RBAC-03: Admin Can Delete Any Document

**Pre-condition:** Role = ADMIN

**Steps:**
1. Login as ADMIN
2. Navigate to `/documents`
3. View any document (even if not owner)
4. Click "Delete" button
5. Confirm deletion

**Expected Result:**
- Deletion successful
- Document removed from database
- Log entry created:
  - Action: "delete_resource"
  - Status: SUCCESS
  - Access model: RBAC (or UNIFIED)

**Verify:**
- Document no longer appears in list
- Check audit logs for deletion entry
- Should show ADMIN as the user who deleted

---

### TC-RBAC-04: Normal Employee Cannot Delete Others' Documents

**Pre-condition:** Role = EMPLOYEE

**Steps:**
1. Login as EMPLOYEE
2. Navigate to `/documents`
3. Find a document owned by another user
4. Attempt to delete it

**Expected Result:**
- Access denied
- Error message: "Access denied - Insufficient permissions"
- Document not deleted
- Log entry with status: DENIED
- Access model: RBAC or DAC

**Verify:**
- Document still exists
- Check audit logs for denial entry
- Should show RBAC or DAC as denying model

---

## SECTION 4: Rule-Based Access Control (RuBAC)

### TC-RuBAC-03: Deny Download Outside Work Hours

**Pre-condition:** Time = 23:00 (outside 8AM-6PM)

**Steps:**
1. **Option 1:** Modify system time or rule temporarily
2. **Option 2:** Test via API with time-based rule
3. Attempt to download/view a document

**Expected Result:**
- Download/view blocked by rule
- Error message: "Access denied outside working hours"
- Access model: RuBAC
- Log entry with status: DENIED

**Note:** To test this easily, you can:
- Temporarily modify the working hours rule in the database
- Or test via API with time-based conditions

---

### TC-RuBAC-04: IP-Restricted Access

**Pre-condition:**
- Rule: "Only corporate IPs may access documents"
- User logs in from home (different IP)

**Steps:**
1. Set up IP restriction rule (if implemented)
2. Login from a non-corporate IP
3. Attempt to access documents

**Expected Result:**
- Access denied by IP rule
- Error message: "Access denied - IP not allowed"
- Access model: RuBAC
- Log entry with status: DENIED

**Note:** IP-based rules can be configured in the Rules table. Check database for active IP rules.

---

## SECTION 5: Attribute-Based Access Control (ABAC)

### TC-ABAC-03: Department-Matching Document Access

**Pre-condition:**
- Document.department = HR
- User.department = HR

**Steps:**
1. Create a user with department = "HR"
2. Create a document with department = "HR"
3. Login as HR user
4. Navigate to `/documents`
5. Attempt to view the HR document

**Expected Result:**
- Access allowed
- Document displayed
- Access model: ABAC
- Log entry with status: SUCCESS

**Verify:**
- Check audit logs
- Access model should be ABAC
- Department attributes matched

---

### TC-ABAC-04: Multi-Attribute Failure

**Pre-condition:**
- User.department = HR
- User.employmentStatus = "inactive" (or TERMINATED)

**Steps:**
1. Create a user with:
   - Department: HR
   - Employment Status: TERMINATED
2. Create a document with department: HR
3. Login as this user
4. Attempt to view HR document

**Expected Result:**
- Access denied
- Reason: Employment status failed (inactive/terminated users cannot access)
- Access model: ABAC
- Log entry with status: DENIED

**Verify:**
- Check audit logs
- Should show ABAC as denying model
- Reason: Employment status mismatch

---

## SECTION 6: Document Sharing Module

### TC-DOC-01: Upload Document

**Pre-condition:** User logged in

**Steps:**
1. Login as any user
2. Navigate to `/documents`
3. Click "Create Document" button
4. Fill in form:
   - Title: "Test Document"
   - Security Level: Select PUBLIC, INTERNAL, or CONFIDENTIAL
   - Department: Optional (e.g., "HR")
5. Click "Create Document"

**Expected Result:**
- File/document saved
- Document appears in list
- User becomes owner (DAC)
- Security level set (MAC)
- Department set (ABAC)
- Log entry created with:
  - Action: "create_resource"
  - Status: SUCCESS
  - User as owner

**Verify:**
- Document appears in documents list
- Owner shown as current user
- Check audit logs for creation entry

---

### TC-DOC-02: Owner Edits Document Metadata

**Steps:**
1. Login as document owner
2. Navigate to `/documents`
3. View your document
4. (If edit functionality exists) Edit title or security level

**Expected Result:**
- Metadata updated
- Changes saved
- Log entry created:
  - Action: "edit_resource"
  - Status: SUCCESS
  - Changes logged

**Note:** Edit functionality may be limited in current implementation. Document creation and sharing are primary features.

---

## SECTION 7: Logging & Audit

### TC-LOG-03: Log Document Download

**Steps:**
1. Login as any user
2. Navigate to `/documents`
3. View a document (access counts as "download" in logs)
4. Navigate to `/admin/logs`

**Expected Result:**
- Download/view action logged
- Log entry shows:
  - Action: "view_resource"
  - Resource ID
  - User ID
  - Timestamp
  - IP address
  - Status: SUCCESS

**Verify:**
- Go to `/admin/logs`
- Filter by action: "view_resource"
- Should see your access logged

---

### TC-LOG-04: Unauthorized Attempt Logged

**Steps:**
1. Login as User A
2. Attempt to access a document you don't have permission for
3. Navigate to `/admin/logs`

**Expected Result:**
- Unauthorized attempt logged
- Log entry shows:
  - Action: "view_resource" (or attempted action)
  - Status: DENIED
  - Reason: "Access denied - [reason]"
  - Access model that denied: MAC/DAC/RBAC/ABAC/RuBAC
  - IP address
  - Timestamp

**Verify:**
- Check `/admin/logs`
- Filter by status: DENIED
- Should see your unauthorized attempt
- Details show which access control model denied access

---

## Unified Access Control Testing

### Test All Models Together

**Steps:**
1. Create a document with:
   - Security Level: CONFIDENTIAL (MAC)
   - Owner: User A (DAC)
   - Department: Finance (ABAC)
2. Login as User B with:
   - Clearance: INTERNAL (insufficient for MAC)
   - Department: IT (mismatch for ABAC)
   - Role: EMPLOYEE (may lack RBAC permissions)
3. Attempt to access the document

**Expected Result:**
- Access denied
- First failing model determines the denial reason
- All models checked in order: MAC → DAC → RBAC → RuBAC → ABAC
- Log shows which model denied access

**Verify:**
- Check audit logs
- Should show unified access control decision
- Model that denied access is logged

---

## Quick Test Checklist

- [ ] MAC blocks insufficient clearance
- [ ] MAC allows sufficient clearance
- [ ] DAC owner can grant permissions
- [ ] DAC owner can revoke permissions
- [ ] DAC blocks users without permission
- [ ] RBAC allows admin to delete any document
- [ ] RBAC blocks employee from deleting others' documents
- [ ] RuBAC enforces time-based rules
- [ ] RuBAC enforces IP-based rules (if configured)
- [ ] ABAC allows department-matched access
- [ ] ABAC blocks department-mismatched access
- [ ] ABAC checks employment status
- [ ] Document creation works
- [ ] Document sharing works
- [ ] Permission revocation works
- [ ] All actions logged
- [ ] Unauthorized attempts logged
- [ ] Unified access control works

---

## Advanced Testing Scenarios

### Scenario 1: Multi-User Document Sharing

1. User A creates CONFIDENTIAL document
2. User A shares with User B (view only)
3. User B shares with User C (should fail - User B doesn't have share permission)
4. User A shares with User C (edit permission)
5. User C tries to delete document (should fail - only owner/admin can delete)

**Expected Results:**
- User B can view but not share
- User C can edit but not delete
- All actions logged

---

### Scenario 2: Role-Based Document Management

1. ADMIN creates document
2. HR_MANAGER views document
3. EMPLOYEE tries to view CONFIDENTIAL document (should fail - MAC)
4. DEPARTMENT_MANAGER views department document (should succeed - ABAC)

**Expected Results:**
- Each role has appropriate access
- Access control models enforced correctly
- All decisions logged

---

## Troubleshooting

1. **Cannot share document:**
   - Verify you are the document owner
   - Check user email exists in system
   - Check browser console for errors

2. **Permission not working:**
   - Verify permission was granted successfully
   - Check audit logs for grant entry
   - Ensure correct user is logged in

3. **Access denied unexpectedly:**
   - Check user's clearance level (MAC)
   - Check user's role (RBAC)
   - Check user's department (ABAC)
   - Check active rules (RuBAC)
   - Check DAC permissions

4. **Logs not showing:**
   - Verify database connection
   - Check user has ADMIN role
   - Refresh logs page

---

## Additional Notes

- All document operations use unified access control
- Access decisions show which model granted/denied access
- Document owners have full DAC control
- Sharing permissions are granular (view/edit/share)
- All actions are audited
- Admin panel shows complete audit trail
- Test with different user roles to see RBAC
- Test with different clearance levels to see MAC
- Test with different departments to see ABAC
- Test permission granting/revoking to see DAC

