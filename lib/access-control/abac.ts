// Attribute-Based Access Control (ABAC) Implementation

import { prisma } from '@/lib/prisma'
import { AccessDecision } from '@/types'
import { EmploymentStatus, JobLevel } from '@prisma/client'
import { isWorkingHours } from '@/lib/utils'

/**
 * ABAC: Attribute-Based Access Control
 * Access decisions based on multiple attributes (user, resource, environment)
 */

export interface ABACContext {
  // User attributes
  userDepartment?: string
  userLocation?: string
  userEmploymentStatus?: EmploymentStatus
  userJobLevel?: JobLevel
  
  // Resource attributes
  resourceDepartment?: string
  resourceSecurityLevel?: string
  
  // Environment attributes
  timeOfAccess?: Date
  ipAddress?: string
  device?: string
}

/**
 * Evaluate ABAC policy
 * Policies are defined as functions that check attributes
 */
export async function checkABAC(
  context: ABACContext,
  policy: (ctx: ABACContext) => boolean
): Promise<AccessDecision> {
  const result = policy(context)

  if (result) {
    return {
      allowed: true,
      model: 'ABAC',
      reason: 'Policy conditions met'
    }
  }

  return {
    allowed: false,
    reason: 'Policy conditions not met',
    model: 'ABAC'
  }
}

/**
 * Common ABAC policies
 */

// Policy: Finance Manager + Working Hours → Can approve payroll
export function financePayrollPolicy(context: ABACContext): boolean {
  return (
    context.userDepartment === 'Finance' &&
    context.userJobLevel === JobLevel.MANAGER &&
    isWorkingHours()
  )
}

// Policy: HR Department → Can access HR documents
export function hrDepartmentPolicy(context: ABACContext): boolean {
  return (
    context.userDepartment === 'HR' &&
    context.resourceDepartment === 'HR'
  )
}

// Policy: Active Employee → Can update own profile
export function activeEmployeePolicy(context: ABACContext): boolean {
  return context.userEmploymentStatus === EmploymentStatus.ACTIVE
}

// Policy: Department Manager → Can access department resources
export function departmentManagerPolicy(context: ABACContext): boolean {
  return (
    context.userJobLevel === JobLevel.MANAGER &&
    context.userDepartment === context.resourceDepartment
  )
}

// Policy: Same Department → Can view internal resources
export function sameDepartmentPolicy(context: ABACContext): boolean {
  return context.userDepartment === context.resourceDepartment
}

/**
 * Get user attributes for ABAC
 */
export async function getUserAttributes(userId: string): Promise<{
  department: string | null
  location: string | null
  employmentStatus: EmploymentStatus
  jobLevel: JobLevel | null
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      department: true,
      location: true,
      employmentStatus: true,
      jobLevel: true
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  return {
    department: user.department,
    location: user.location,
    employmentStatus: user.employmentStatus,
    jobLevel: user.jobLevel
  }
}

/**
 * Get resource attributes for ABAC
 */
export async function getResourceAttributes(resourceId: string): Promise<{
  department: string | null
  securityLevel: string
}> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: {
      department: true,
      securityLevel: true
    }
  })

  if (!resource) {
    throw new Error('Resource not found')
  }

  return {
    department: resource.department,
    securityLevel: resource.securityLevel
  }
}

/**
 * Evaluate multiple ABAC policies (OR logic - any policy can allow)
 */
export async function checkABACAny(
  context: ABACContext,
  policies: Array<(ctx: ABACContext) => boolean>
): Promise<AccessDecision> {
  for (const policy of policies) {
    const decision = await checkABAC(context, policy)
    if (decision.allowed) {
      return decision
    }
  }

  return {
    allowed: false,
    reason: 'None of the policies allowed access',
    model: 'ABAC'
  }
}

/**
 * Evaluate multiple ABAC policies (AND logic - all policies must allow)
 */
export async function checkABACAll(
  context: ABACContext,
  policies: Array<(ctx: ABACContext) => boolean>
): Promise<AccessDecision> {
  for (const policy of policies) {
    const decision = await checkABAC(context, policy)
    if (!decision.allowed) {
      return {
        allowed: false,
        reason: 'One or more policies denied access',
        model: 'ABAC'
      }
    }
  }

  return {
    allowed: true,
    model: 'ABAC',
    reason: 'All policies allowed access'
  }
}

