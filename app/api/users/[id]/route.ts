// User Profile API

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { logUserActivity } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { LogStatus } from '@prisma/client'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  jobLevel: z.enum(['JUNIOR', 'SENIOR', 'MANAGER', 'EXECUTIVE']).optional()
})

// GET - Get user profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request)
    const { id } = await params
    const ipAddress = getClientIp(request)

    // Users can only view their own profile (unless ADMIN/HR)
    if (currentUser.id !== id && currentUser.role !== 'ADMIN' && currentUser.role !== 'HR_MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only view your own profile' },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          select: {
            roleName: true,
            description: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    await logUserActivity(currentUser.id, 'view_profile', {
      resourceId: id,
      resourceType: 'user',
      ipAddress,
      status: LogStatus.SUCCESS
    })

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.roleName,
        department: user.department,
        clearanceLevel: user.clearanceLevel,
        location: user.location,
        jobLevel: user.jobLevel,
        employmentStatus: user.employmentStatus
      }
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Get user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update user profile (own profile or ADMIN/HR)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth(request)
    const { id } = await params
    const ipAddress = getClientIp(request)
    const body = await request.json()

    // Validate input
    const validation = updateProfileSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      )
    }

    // Check permissions: Users can edit own profile, ADMIN/HR can edit any
    if (currentUser.id !== id && currentUser.role !== 'ADMIN' && currentUser.role !== 'HR_MANAGER') {
      await logUserActivity(currentUser.id, 'edit_profile_denied', {
        resourceId: id,
        resourceType: 'user',
        ipAddress,
        status: LogStatus.DENIED,
        details: { reason: 'Insufficient permissions' }
      })

      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only edit your own profile' },
        { status: 403 }
      )
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(validation.data.name && { name: validation.data.name }),
        ...(validation.data.department !== undefined && { department: validation.data.department || null }),
        ...(validation.data.location !== undefined && { location: validation.data.location || null }),
        ...(validation.data.jobLevel && { jobLevel: validation.data.jobLevel })
      },
      include: {
        role: {
          select: {
            roleName: true
          }
        }
      }
    })

    await logUserActivity(currentUser.id, 'edit_profile', {
      resourceId: id,
      resourceType: 'user',
      ipAddress,
      status: LogStatus.SUCCESS,
      details: { changes: validation.data }
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        department: updatedUser.department,
        location: updatedUser.location,
        jobLevel: updatedUser.jobLevel
      }
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Update user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

