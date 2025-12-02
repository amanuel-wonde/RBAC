// Role-Based Access Control (RBAC) Implementation

import { prisma } from '@/lib/prisma'
import { AccessDecision } from '@/types'

/**
 * RBAC: Role-Based Access Control
 * Access based on user roles, not individual permissions
 */

/**
 * Check if user's role has specific permission
 * @param roleId User's role ID
 * @param permissionName Permission name to check
 * @returns AccessDecision
 */
export async function checkRBAC(
  roleId: string,
  permissionName: string
): Promise<AccessDecision> {
  // Admin role has all permissions
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { roleName: true }
  })

  if (role?.roleName === 'ADMIN') {
    return {
      allowed: true,
      model: 'RBAC',
      reason: 'Admin role has all permissions'
    }
  }

  // Check role permission
  const rolePermission = await prisma.rolePermission.findUnique({
    where: {
      roleId_permissionName: {
        roleId,
        permissionName
      }
    }
  })

  if (rolePermission && rolePermission.allowed) {
    return {
      allowed: true,
      model: 'RBAC',
      reason: `Role has ${permissionName} permission`
    }
  }

  return {
    allowed: false,
    reason: `Role does not have ${permissionName} permission`,
    model: 'RBAC'
  }
}

/**
 * Check if user has any of the required permissions
 */
export async function checkRBACAny(
  roleId: string,
  permissionNames: string[]
): Promise<AccessDecision> {
  for (const permissionName of permissionNames) {
    const decision = await checkRBAC(roleId, permissionName)
    if (decision.allowed) {
      return decision
    }
  }

  return {
    allowed: false,
    reason: `Role does not have any of the required permissions: ${permissionNames.join(', ')}`,
    model: 'RBAC'
  }
}

/**
 * Check if user has all of the required permissions
 */
export async function checkRBACAll(
  roleId: string,
  permissionNames: string[]
): Promise<AccessDecision> {
  for (const permissionName of permissionNames) {
    const decision = await checkRBAC(roleId, permissionName)
    if (!decision.allowed) {
      return {
        allowed: false,
        reason: `Role missing required permission: ${permissionName}`,
        model: 'RBAC'
      }
    }
  }

  return {
    allowed: true,
    model: 'RBAC',
    reason: 'Role has all required permissions'
  }
}

/**
 * Get all permissions for a role
 */
export async function getRolePermissions(roleId: string): Promise<string[]> {
  const permissions = await prisma.rolePermission.findMany({
    where: {
      roleId,
      allowed: true
    },
    select: {
      permissionName: true
    }
  })

  return permissions.map(p => p.permissionName)
}

/**
 * Assign permission to role
 */
export async function assignPermissionToRole(
  roleId: string,
  permissionName: string,
  allowed: boolean = true
): Promise<void> {
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionName: {
        roleId,
        permissionName
      }
    },
    update: { allowed },
    create: {
      roleId,
      permissionName,
      allowed
    }
  })
}

/**
 * Remove permission from role
 */
export async function removePermissionFromRole(
  roleId: string,
  permissionName: string
): Promise<void> {
  await prisma.rolePermission.delete({
    where: {
      roleId_permissionName: {
        roleId,
        permissionName
      }
    }
  })
}

