// Mandatory Access Control (MAC) Implementation

import { SecurityLevel } from '@prisma/client'
import { AccessDecision } from '@/types'

/**
 * MAC: Mandatory Access Control
 * System-enforced security levels that users cannot override
 * 
 * Security Levels:
 * - PUBLIC (1): Lowest security
 * - INTERNAL (2): Medium security  
 * - CONFIDENTIAL (3): Highest security
 */

const SECURITY_LEVELS: Record<SecurityLevel, number> = {
  PUBLIC: 1,
  INTERNAL: 2,
  CONFIDENTIAL: 3
}

/**
 * Check if user has sufficient clearance level to access resource
 * @param userClearanceLevel User's clearance level
 * @param resourceSecurityLevel Resource's security level
 * @returns AccessDecision
 */
export function checkMAC(
  userClearanceLevel: SecurityLevel,
  resourceSecurityLevel: SecurityLevel
): AccessDecision {
  const userLevel = SECURITY_LEVELS[userClearanceLevel]
  const resourceLevel = SECURITY_LEVELS[resourceSecurityLevel]

  if (userLevel >= resourceLevel) {
    return {
      allowed: true,
      model: 'MAC'
    }
  }

  return {
    allowed: false,
    reason: `User clearance level (${userClearanceLevel}) is insufficient for resource security level (${resourceSecurityLevel})`,
    model: 'MAC'
  }
}

/**
 * Get security level from string
 */
export function getSecurityLevel(level: string): SecurityLevel | null {
  const upperLevel = level.toUpperCase()
  if (upperLevel in SECURITY_LEVELS) {
    return upperLevel as SecurityLevel
  }
  return null
}

/**
 * Check if user can modify security level (only ADMIN)
 */
export function canModifySecurityLevel(userRole: string): boolean {
  return userRole === 'ADMIN'
}

