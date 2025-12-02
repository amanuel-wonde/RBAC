// Unified Access Control System
// Combines all 5 access control models: MAC, DAC, RBAC, RuBAC, ABAC

import { checkMAC } from './mac'
import { checkDAC } from './dac'
import { checkRBAC } from './rbac'
import { checkRuBAC } from './rubac'
import { checkABAC, getUserAttributes, getResourceAttributes, ABACContext, sameDepartmentPolicy } from './abac'
import { AccessDecision } from '@/types'
import { SecurityLevel } from '@prisma/client'
import { getClientIp } from '@/lib/utils'

export interface UnifiedAccessContext {
  userId: string
  userRoleId: string
  userClearanceLevel: SecurityLevel
  userDepartment?: string | null
  resourceId?: string
  action: 'view' | 'edit' | 'delete' | 'share'
  permissionName?: string
  ipAddress?: string
}

/**
 * Unified access control check
 * Evaluates all 5 models in priority order:
 * 1. MAC (Mandatory) - Highest priority, cannot be overridden
 * 2. RuBAC (Rules) - System-wide rules
 * 3. RBAC (Roles) - Role-based permissions
 * 4. ABAC (Attributes) - Attribute-based policies
 * 5. DAC (Discretionary) - Owner-controlled permissions
 */
export async function checkUnifiedAccess(
  context: UnifiedAccessContext
): Promise<AccessDecision> {
  const { userId, userRoleId, userClearanceLevel, resourceId, action, permissionName, ipAddress } = context

  // 1. MAC Check (if resource has security level)
  if (resourceId) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { securityLevel: true }
    })

    if (resource) {
      const macDecision = checkMAC(userClearanceLevel, resource.securityLevel)
      if (!macDecision.allowed) {
        return macDecision
      }
    }
  }

  // 2. RuBAC Check (Rule-Based)
  const rubacContext: any = {
    userDepartment: context.userDepartment,
    ipAddress: ipAddress || 'unknown'
  }

  if (resourceId) {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { department: true }
    })
    rubacContext.resourceDepartment = resource?.department
  }

  const rubacDecision = await checkRuBAC(rubacContext)
  if (!rubacDecision.allowed) {
    return rubacDecision
  }

  // 3. RBAC Check (Role-Based)
  if (permissionName) {
    const rbacDecision = await checkRBAC(userRoleId, permissionName)
    if (!rbacDecision.allowed) {
      return rbacDecision
    }
  }

  // 4. ABAC Check (Attribute-Based)
  if (resourceId) {
    try {
      const userAttrs = await getUserAttributes(userId)
      const resourceAttrs = await getResourceAttributes(resourceId)

      const abacContext: ABACContext = {
        userDepartment: userAttrs.department || undefined,
        userLocation: userAttrs.location || undefined,
        userEmploymentStatus: userAttrs.employmentStatus,
        userJobLevel: userAttrs.jobLevel || undefined,
        resourceDepartment: resourceAttrs.department || undefined,
        resourceSecurityLevel: resourceAttrs.securityLevel,
        timeOfAccess: new Date(),
        ipAddress: ipAddress || undefined
      }

      // Apply same department policy for internal resources
      const abacDecision = await checkABAC(abacContext, sameDepartmentPolicy)
      if (!abacDecision.allowed && resourceAttrs.securityLevel !== 'PUBLIC') {
        // For non-public resources, department must match
        return abacDecision
      }
    } catch (error) {
      // If attributes can't be fetched, continue to DAC
      console.warn('ABAC check failed:', error)
    }
  }

  // 5. DAC Check (Discretionary) - Last priority
  if (resourceId) {
    const dacDecision = await checkDAC(userId, resourceId, action)
    if (!dacDecision.allowed && action !== 'view') {
      // For view, if DAC fails, check if it's a public resource
      if (resourceId) {
        const resource = await prisma.resource.findUnique({
          where: { id: resourceId },
          select: { securityLevel: true }
        })
        if (resource?.securityLevel === 'PUBLIC') {
          return { allowed: true, model: 'MAC', reason: 'Public resource' }
        }
      }
    }
    return dacDecision
  }

  // If no resource, only RBAC applies
  if (permissionName) {
    return await checkRBAC(userRoleId, permissionName)
  }

  // Default deny if no checks passed
  return {
    allowed: false,
    reason: 'No access control checks passed',
    model: 'RBAC'
  }
}

// Import prisma for unified access
import { prisma } from '@/lib/prisma'

