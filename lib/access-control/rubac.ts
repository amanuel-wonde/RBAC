// Rule-Based Access Control (RuBAC) Implementation

import { prisma } from '@/lib/prisma'
import { AccessDecision, RuleCondition } from '@/types'
import { RuleAction } from '@prisma/client'
import { isWorkingHours } from '@/lib/utils'

/**
 * RuBAC: Rule-Based Access Control
 * System-wide conditional rules that apply to all users
 */

/**
 * Evaluate a rule condition
 */
function evaluateCondition(
  condition: RuleCondition,
  context: {
    userDepartment?: string
    resourceDepartment?: string
    ipAddress?: string
    time?: Date
    [key: string]: any
  }
): boolean {
  // Time-based conditions
  if (condition.time === 'workHours') {
    return isWorkingHours()
  }
  if (condition.time === 'afterHours') {
    return !isWorkingHours()
  }

  // Department matching
  if (condition.department) {
    if (condition.department === 'match') {
      return context.userDepartment === context.resourceDepartment
    }
    return context.userDepartment === condition.department
  }

  // IP address conditions
  if (condition.ipAddress) {
    if (condition.ipAddress === 'companyNetwork') {
      // Simple check - in production, validate against company IP ranges
      return context.ipAddress?.startsWith('192.168.') || 
             context.ipAddress?.startsWith('10.') ||
             context.ipAddress === '127.0.0.1'
    }
    return context.ipAddress === condition.ipAddress
  }

  // Custom conditions from context
  for (const [key, value] of Object.entries(condition)) {
    if (key !== 'time' && key !== 'department' && key !== 'ipAddress') {
      if (context[key] !== value) {
        return false
      }
    }
  }

  return true
}

/**
 * Check RuBAC rules for access
 * @param context Context for rule evaluation
 * @returns AccessDecision
 */
export async function checkRuBAC(context: {
  userDepartment?: string
  resourceDepartment?: string
  ipAddress?: string
  resourceType?: string
  [key: string]: any
}): Promise<AccessDecision> {
  // Get all active rules
  const rules = await prisma.rule.findMany({
    where: { isActive: true }
  })

  // Evaluate rules in order
  for (const rule of rules) {
    const condition = rule.conditionJson as RuleCondition
    const conditionMet = evaluateCondition(condition, context)

    if (conditionMet) {
      // Rule applies - return decision based on action
      if (rule.action === RuleAction.DENY) {
        return {
          allowed: false,
          reason: `Access denied by rule: ${rule.ruleName}`,
          model: 'RuBAC'
        }
      } else if (rule.action === RuleAction.ALLOW) {
        return {
          allowed: true,
          reason: `Access allowed by rule: ${rule.ruleName}`,
          model: 'RuBAC'
        }
      }
    }
  }

  // No rules matched - default allow (can be changed to deny if needed)
  return {
    allowed: true,
    model: 'RuBAC',
    reason: 'No matching rules'
  }
}

/**
 * Create a new rule
 */
export async function createRule(
  ruleName: string,
  conditionJson: RuleCondition,
  action: RuleAction,
  description?: string
): Promise<void> {
  await prisma.rule.create({
    data: {
      ruleName,
      conditionJson: conditionJson as any,
      action,
      description,
      isActive: true
    }
  })
}

/**
 * Update a rule
 */
export async function updateRule(
  id: string,
  updates: {
    ruleName?: string
    conditionJson?: RuleCondition
    action?: RuleAction
    description?: string
    isActive?: boolean
  }
): Promise<void> {
  await prisma.rule.update({
    where: { id },
    data: {
      ...updates,
      conditionJson: updates.conditionJson as any
    }
  })
}

/**
 * Get all active rules
 */
export async function getActiveRules() {
  return prisma.rule.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })
}

