// Individual Resource API - Access Control Demo

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { checkUnifiedAccess } from '@/lib/access-control/unified'
import { logUserActivity, logAccessDenial } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { LogStatus } from '@prisma/client'

// GET - Get resource (with access control check)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const ipAddress = getClientIp(request)

    // Get resource
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      )
    }

    // Check access using unified access control
    const accessDecision = await checkUnifiedAccess({
      userId: user.id,
      userRoleId: user.roleId,
      userClearanceLevel: user.clearanceLevel as any,
      userDepartment: user.department || undefined,
      resourceId: id,
      action: 'view',
      ipAddress
    })

    if (!accessDecision.allowed) {
      // Log denied access
      await logAccessDenial(user.id, 'view_resource', accessDecision.reason || 'Access denied', {
        resourceId: id,
        resourceType: 'document',
        ipAddress
      })

      return NextResponse.json({
        success: false,
        error: accessDecision.reason || 'Access denied',
        accessModel: accessDecision.model,
        userClearance: user.clearanceLevel,
        resourceSecurity: resource.securityLevel
      }, { status: 403 })
    }

    // Log successful access
    await logUserActivity(user.id, 'view_resource', {
      resourceId: id,
      resourceType: 'document',
      ipAddress,
      status: LogStatus.SUCCESS,
      details: { model: accessDecision.model }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...resource,
        accessModel: accessDecision.model,
        accessReason: accessDecision.reason
      }
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Get resource error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete resource (with access control)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const ipAddress = getClientIp(request)

    // Check access
    const accessDecision = await checkUnifiedAccess({
      userId: user.id,
      userRoleId: user.roleId,
      userClearanceLevel: user.clearanceLevel as any,
      userDepartment: user.department || undefined,
      resourceId: id,
      action: 'delete',
      ipAddress
    })

    if (!accessDecision.allowed) {
      await logAccessDenial(user.id, 'delete_resource', accessDecision.reason || 'Access denied', {
        resourceId: id,
        resourceType: 'document',
        ipAddress
      })

      return NextResponse.json({
        success: false,
        error: accessDecision.reason || 'Access denied',
        accessModel: accessDecision.model
      }, { status: 403 })
    }

    // Delete resource
    await prisma.resource.delete({
      where: { id }
    })

    await logUserActivity(user.id, 'delete_resource', {
      resourceId: id,
      resourceType: 'document',
      ipAddress,
      status: LogStatus.SUCCESS,
      details: { model: accessDecision.model }
    })

    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully'
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Delete resource error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

