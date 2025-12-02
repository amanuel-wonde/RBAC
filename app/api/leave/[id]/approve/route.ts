// Approve Leave Request API - RBAC and RuBAC

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/middleware'
import { checkRBAC } from '@/lib/access-control/rbac'
import { checkRuBAC } from '@/lib/access-control/rubac'
import { logUserActivity, logAccessDenial } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { LogStatus } from '@prisma/client'

// POST - Approve leave request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['HR_MANAGER', 'DEPARTMENT_MANAGER', 'ADMIN'])
    const { id } = await params
    const ipAddress = getClientIp(request)
    const body = await request.json()
    const { approved } = body

    // Get leave request
    const leaveRequest = await prisma.resource.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            department: true
          }
        }
      }
    })

    if (!leaveRequest || !leaveRequest.title.includes('Leave Request')) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      )
    }

    // Get leave details from audit log
    const leaveLog = await prisma.auditLog.findFirst({
      where: {
        resourceId: id,
        action: 'create_leave_request'
      },
      orderBy: { createdAt: 'desc' }
    })

    const days = leaveLog?.details ? (leaveLog.details as any).days : 0
    const requiresHRApproval = days > 10

    // RBAC Check: >10 days requires HR_MANAGER
    if (requiresHRApproval && user.role !== 'HR_MANAGER' && user.role !== 'ADMIN') {
      await logAccessDenial(user.id, 'approve_leave', 'Only HR Manager can approve >10 days', {
        resourceId: id,
        resourceType: 'leave_request',
        ipAddress
      })

      return NextResponse.json({
        success: false,
        error: 'Only HR Managers can approve leave requests >10 days',
        accessModel: 'RBAC'
      }, { status: 403 })
    }

    // ABAC Check: Department manager can only approve their department
    if (user.role === 'DEPARTMENT_MANAGER' && user.department !== leaveRequest.owner.department) {
      await logAccessDenial(user.id, 'approve_leave', 'Can only approve same department', {
        resourceId: id,
        resourceType: 'leave_request',
        ipAddress
      })

      return NextResponse.json({
        success: false,
        error: 'You can only approve leave requests from your department',
        accessModel: 'ABAC'
      }, { status: 403 })
    }

    // RuBAC Check: Working hours rule
    const rubacDecision = await checkRuBAC({
      userDepartment: user.department || undefined,
      ipAddress
    })

    if (!rubacDecision.allowed) {
      await logAccessDenial(user.id, 'approve_leave', rubacDecision.reason || 'Rule violation', {
        resourceId: id,
        resourceType: 'leave_request',
        ipAddress
      })

      return NextResponse.json({
        success: false,
        error: rubacDecision.reason || 'Access denied by system rule',
        accessModel: 'RuBAC'
      }, { status: 403 })
    }

    // Update leave request status
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: approved ? 'approve_leave' : 'reject_leave',
        resourceId: id,
        resourceType: 'leave_request',
        status: approved ? LogStatus.SUCCESS : LogStatus.DENIED,
        details: {
          approved,
          approvedBy: user.id,
          days,
          accessModels: ['RBAC', 'ABAC', 'RuBAC']
        },
        ipAddress
      }
    })

    await logUserActivity(user.id, approved ? 'approve_leave' : 'reject_leave', {
      resourceId: id,
      resourceType: 'leave_request',
      ipAddress,
      status: approved ? LogStatus.SUCCESS : LogStatus.DENIED,
      details: { days }
    })

    return NextResponse.json({
      success: true,
      message: approved ? 'Leave request approved' : 'Leave request rejected',
      data: {
        approved,
        accessModels: ['RBAC', 'ABAC', 'RuBAC']
      }
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
        { success: false, error: 'Forbidden: Only managers can approve leave' },
        { status: 403 }
      )
    }

    console.error('Approve leave error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

