// Users API Route

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/middleware'
import { hashPassword, validatePassword } from '@/lib/auth'
import { logUserActivity } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { LogStatus } from '@prisma/client'
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string(),
  department: z.string().optional(),
  clearanceLevel: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL']).optional(),
  location: z.string().optional(),
  jobLevel: z.enum(['JUNIOR', 'SENIOR', 'MANAGER', 'EXECUTIVE']).optional(),
})

// GET - List users
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['ADMIN', 'HR_MANAGER'])
    const ipAddress = getClientIp(request)

    const users = await prisma.user.findMany({
      include: {
        role: {
          select: {
            id: true,
            roleName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    await logUserActivity(user.id, 'view_users', {
      ipAddress,
      status: LogStatus.SUCCESS
    })

    return NextResponse.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role.roleName,
        department: u.department,
        clearanceLevel: u.clearanceLevel,
        employmentStatus: u.employmentStatus,
        location: u.location,
        jobLevel: u.jobLevel,
        isLocked: u.isLocked,
        emailVerified: u.emailVerified
      }))
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    console.error('Get users error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create user (Admin/HR only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, ['ADMIN', 'HR_MANAGER'])
    const ipAddress = getClientIp(request)
    const body = await request.json()

    // Validate input
    const validation = createUserSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      )
    }

    const { name, email, password, roleId, department, clearanceLevel, location, jobLevel } = validation.data

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId,
        department: department || null,
        clearanceLevel: clearanceLevel || 'PUBLIC',
        location: location || null,
        jobLevel: jobLevel || null,
        emailVerified: true // Admin/HR creates verified users
      },
      include: {
        role: {
          select: {
            roleName: true
          }
        }
      }
    })

    // Log creation
    await logUserActivity(user.id, 'create_user', {
      ipAddress,
      status: LogStatus.SUCCESS,
      details: {
        createdUserId: newUser.id,
        email: newUser.email,
        role: newUser.role.roleName
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role.roleName
      }
    }, { status: 201 })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins and HR managers can create users' },
        { status: 403 }
      )
    }

    console.error('Create user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

