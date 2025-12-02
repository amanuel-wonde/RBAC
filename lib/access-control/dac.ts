// Discretionary Access Control (DAC) Implementation

import { prisma } from '@/lib/prisma'
import { AccessDecision } from '@/types'

/**
 * DAC: Discretionary Access Control
 * Resource owners control who can access their resources
 */

export interface DACPermission {
  canView: boolean
  canEdit: boolean
  canShare: boolean
}

/**
 * Check DAC permissions for user accessing resource
 * @param userId User ID
 * @param resourceId Resource ID
 * @param action Action being performed ('view', 'edit', 'share')
 * @returns AccessDecision
 */
export async function checkDAC(
  userId: string,
  resourceId: string,
  action: 'view' | 'edit' | 'share' | 'delete'
): Promise<AccessDecision> {
  // Get resource to check ownership
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { ownerId: true }
  })

  if (!resource) {
    return {
      allowed: false,
      reason: 'Resource not found',
      model: 'DAC'
    }
  }

  // Owner has full access
  if (resource.ownerId === userId) {
    return {
      allowed: true,
      model: 'DAC',
      reason: 'User is the resource owner'
    }
  }

  // Check explicit permissions
  const permission = await prisma.dACPermission.findUnique({
    where: {
      resourceId_userId: {
        resourceId,
        userId
      }
    }
  })

  if (!permission) {
    return {
      allowed: false,
      reason: 'No explicit permission granted for this resource',
      model: 'DAC'
    }
  }

  // Check specific action permission
  let hasPermission = false
  switch (action) {
    case 'view':
      hasPermission = permission.canView
      break
    case 'edit':
      hasPermission = permission.canEdit
      break
    case 'share':
      hasPermission = permission.canShare
      break
    case 'delete':
      // Delete requires edit permission
      hasPermission = permission.canEdit
      break
  }

  if (hasPermission) {
    return {
      allowed: true,
      model: 'DAC',
      reason: `User has ${action} permission`
    }
  }

  return {
    allowed: false,
    reason: `User does not have ${action} permission for this resource`,
    model: 'DAC'
  }
}

/**
 * Grant DAC permission to user for resource
 */
export async function grantDACPermission(
  resourceId: string,
  userId: string,
  permissions: DACPermission,
  grantedBy: string
): Promise<void> {
  await prisma.dACPermission.upsert({
    where: {
      resourceId_userId: {
        resourceId,
        userId
      }
    },
    update: {
      canView: permissions.canView,
      canEdit: permissions.canEdit,
      canShare: permissions.canShare,
      grantedBy
    },
    create: {
      resourceId,
      userId,
      canView: permissions.canView,
      canEdit: permissions.canEdit,
      canShare: permissions.canShare,
      grantedBy
    }
  })
}

/**
 * Revoke DAC permission from user for resource
 */
export async function revokeDACPermission(
  resourceId: string,
  userId: string
): Promise<void> {
  await prisma.dACPermission.delete({
    where: {
      resourceId_userId: {
        resourceId,
        userId
      }
    }
  })
}

/**
 * Check if user is resource owner
 */
export async function isResourceOwner(
  userId: string,
  resourceId: string
): Promise<boolean> {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { ownerId: true }
  })

  return resource?.ownerId === userId
}

