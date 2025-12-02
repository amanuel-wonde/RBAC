// Authentication utilities

import * as bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { SecurityLevel } from '@prisma/client'

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Password verification
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Password validation
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' }
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' }
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' }
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' }
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' }
  }
  
  return { valid: true }
}

// Account lockout check
export async function checkAccountLockout(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isLocked: true, failedLoginAttempts: true }
  })
  
  return user?.isLocked ?? false
}

// Increment failed login attempts
export async function incrementFailedAttempts(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true }
  })
  
  const attempts = (user?.failedLoginAttempts ?? 0) + 1
  const shouldLock = attempts >= 5
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: attempts,
      isLocked: shouldLock
    }
  })
  
  // Log lockout event
  if (shouldLock) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'account_locked',
        status: 'DENIED',
        details: { reason: 'Too many failed login attempts' }
      }
    })
  }
}

// Reset failed login attempts
export async function resetFailedAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      isLocked: false
    }
  })
}

// Get user with role
export async function getUserWithRole(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          permissions: true
        }
      }
    }
  })
}

// Security level comparison for MAC
export function hasClearance(
  userLevel: SecurityLevel,
  resourceLevel: SecurityLevel
): boolean {
  const levels: Record<SecurityLevel, number> = {
    PUBLIC: 1,
    INTERNAL: 2,
    CONFIDENTIAL: 3
  }
  
  return levels[userLevel] >= levels[resourceLevel]
}

