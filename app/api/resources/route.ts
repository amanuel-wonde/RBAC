// Resources API - Demonstrates Access Control

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { checkUnifiedAccess } from '@/lib/access-control/unified'
import { logUserActivity, logAccessDenial } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { LogStatus } from '@prisma/client'

// GET - List resources (with access control)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const ipAddress = getClientIp(request)

    // Get all resources
    const resources = await prisma.resource.findMany({
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

    // Filter resources based on access control
    const accessibleResources = []

    for (const resource of resources) {
      const accessDecision = await checkUnifiedAccess({
        userId: user.id,
        userRoleId: user.roleId,
        userClearanceLevel: user.clearanceLevel as any,
        userDepartment: user.department || undefined,
        resourceId: resource.id,
        action: 'view',
        ipAddress
      })

      if (accessDecision.allowed) {
        accessibleResources.push({
          ...resource,
          accessModel: accessDecision.model,
          accessReason: accessDecision.reason
        })

        // Log access
        await logUserActivity(user.id, 'view_resource', {
          resourceId: resource.id,
          resourceType: 'document',
          ipAddress,
          status: LogStatus.SUCCESS,
          details: { model: accessDecision.model }
        })
      } else {
        // Log denied access
        await logAccessDenial(user.id, 'view_resource', accessDecision.reason || 'Access denied', {
          resourceId: resource.id,
          resourceType: 'document',
          ipAddress
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: accessibleResources,
      total: resources.length,
      accessible: accessibleResources.length
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Get resources error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create resource (with MAC security level)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const ipAddress = getClientIp(request)
    const body = await request.json()

    const { title, securityLevel, department } = body

    // Create resource
    const resource = await prisma.resource.create({
      data: {
        title,
        ownerId: user.id,
        securityLevel: securityLevel || 'PUBLIC',
        department: department || null
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Log creation
    await logUserActivity(user.id, 'create_resource', {
      resourceId: resource.id,
      resourceType: 'document',
      ipAddress,
      status: LogStatus.SUCCESS
    })

    return NextResponse.json({
      success: true,
      data: resource
    }, { status: 201 })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Create resource error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

