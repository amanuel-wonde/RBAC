// Leave Request API - Demonstrates RuBAC and RBAC

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/middleware'
import { checkRBAC } from '@/lib/access-control/rbac'
import { checkRuBAC } from '@/lib/access-control/rubac'
import { logUserActivity } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { LogStatus } from '@prisma/client'
import { z } from 'zod'

const createLeaveSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(5),
  attachmentId: z.string().optional()
})

// GET - List leave requests
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const ipAddress = getClientIp(request)

    // Get user's leave requests or all if HR_MANAGER/ADMIN
    let leaveRequests

    if (user.role === 'ADMIN' || user.role === 'HR_MANAGER') {
      // HR/Admin can see all
      leaveRequests = await prisma.resource.findMany({
        where: {
          title: { contains: 'Leave Request' }
        },
        include: {
          owner: {
            select: {
              name: true,
              email: true,
              department: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else if (user.role === 'DEPARTMENT_MANAGER') {
      // Department manager sees only their department (ABAC)
      leaveRequests = await prisma.resource.findMany({
        where: {
          title: { contains: 'Leave Request' },
          department: user.department || undefined
        },
        include: {
          owner: {
            select: {
              name: true,
              email: true,
              department: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      // Employee sees only their own
      leaveRequests = await prisma.resource.findMany({
        where: {
          ownerId: user.id,
          title: { contains: 'Leave Request' }
        },
        include: {
          owner: {
            select: {
              name: true,
              email: true,
              department: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    await logUserActivity(user.id, 'view_leave_requests', {
      ipAddress,
      status: LogStatus.SUCCESS
    })

    return NextResponse.json({
      success: true,
      data: leaveRequests
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Get leave requests error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create leave request
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const ipAddress = getClientIp(request)
    const body = await request.json()

    // Validate input
    const validation = createLeaveSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      )
    }

    const { startDate, endDate, reason, attachmentId } = validation.data

    // Calculate days
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Check RuBAC rule: >10 days requires HR Manager approval
    const requiresHRApproval = days > 10

    // Create leave request as a resource
    const leaveRequest = await prisma.resource.create({
      data: {
        title: `Leave Request - ${user.name} - ${days} days`,
        ownerId: user.id,
        securityLevel: attachmentId ? 'CONFIDENTIAL' : 'INTERNAL', // MAC: Medical attachments are confidential
        department: user.department || null,
        filePath: attachmentId || null
      }
    })

    // Store leave details in resource (using a JSON field approach)
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'create_leave_request',
        resourceId: leaveRequest.id,
        resourceType: 'leave_request',
        status: LogStatus.SUCCESS,
        details: {
          startDate,
          endDate,
          days,
          reason,
          requiresHRApproval,
          status: 'pending'
        },
        ipAddress
      }
    })

    await logUserActivity(user.id, 'create_leave_request', {
      resourceId: leaveRequest.id,
      resourceType: 'leave_request',
      ipAddress,
      status: LogStatus.SUCCESS,
      details: { days, requiresHRApproval }
    })

    return NextResponse.json({
      success: true,
      message: requiresHRApproval 
        ? 'Leave request created. Requires HR Manager approval (>10 days).'
        : 'Leave request created successfully.',
      data: {
        ...leaveRequest,
        days,
        requiresHRApproval
      }
    }, { status: 201 })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Create leave request error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

