// Authentication and authorization middleware

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  clearanceLevel: string
  roleId: string
  department?: string | null
}

// Get authenticated user from request
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization')
    let token: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      // Try to get from cookie
      const cookieStore = await cookies()
      const refreshToken = cookieStore.get('refreshToken')?.value
      
      if (refreshToken) {
        const session = await prisma.session.findUnique({
          where: { refreshToken },
          include: { user: { include: { role: true } } }
        })

        if (session && session.expiresAt > new Date()) {
          return {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role.roleName,
            clearanceLevel: session.user.clearanceLevel,
            roleId: session.user.roleId,
            department: session.user.department
          }
        }
      }
    }

    if (!token) {
      return null
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
      role: string
      clearanceLevel: string
    }

    // Get user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true }
    })

    if (!user || user.isLocked || !user.emailVerified) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.roleName,
      clearanceLevel: user.clearanceLevel,
      roleId: user.roleId,
      department: user.department
    }

  } catch (error) {
    console.error('Auth middleware error:', error)
    return null
  }
}

// Require authentication middleware
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request)
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

// Require specific role
export async function requireRole(request: NextRequest, allowedRoles: string[]): Promise<AuthUser> {
  const user = await requireAuth(request)
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden: Insufficient permissions')
  }
  
  return user
}

