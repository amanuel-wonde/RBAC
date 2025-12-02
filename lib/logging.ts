// Audit logging utilities

import { prisma } from './prisma'
import { LogStatus } from '@prisma/client'

interface LogData {
  userId?: string
  action: string
  resourceId?: string
  resourceType?: string
  ipAddress?: string
  status?: LogStatus
  details?: any
  changedBy?: string
}

// Create audit log entry
export async function createAuditLog(data: LogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resourceId: data.resourceId,
        resourceType: data.resourceType,
        ipAddress: data.ipAddress,
        status: data.status || LogStatus.SUCCESS,
        details: data.details ? JSON.parse(JSON.stringify(data.details)) : null,
        changedBy: data.changedBy,
        timestamp: new Date()
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw - logging failures shouldn't break the application
  }
}

// Log user activity
export async function logUserActivity(
  userId: string,
  action: string,
  options?: {
    resourceId?: string
    resourceType?: string
    ipAddress?: string
    status?: LogStatus
    details?: any
  }
): Promise<void> {
  await createAuditLog({
    userId,
    action,
    resourceId: options?.resourceId,
    resourceType: options?.resourceType,
    ipAddress: options?.ipAddress,
    status: options?.status,
    details: options?.details
  })
}

// Log system event
export async function logSystemEvent(
  action: string,
  options?: {
    ipAddress?: string
    status?: LogStatus
    details?: any
  }
): Promise<void> {
  await createAuditLog({
    action,
    ipAddress: options?.ipAddress,
    status: options?.status,
    details: options?.details
  })
}

// Log access denial
export async function logAccessDenial(
  userId: string | undefined,
  action: string,
  reason: string,
  options?: {
    resourceId?: string
    resourceType?: string
    ipAddress?: string
  }
): Promise<void> {
  await createAuditLog({
    userId,
    action,
    resourceId: options?.resourceId,
    resourceType: options?.resourceType,
    ipAddress: options?.ipAddress,
    status: LogStatus.DENIED,
    details: { reason }
  })
}

