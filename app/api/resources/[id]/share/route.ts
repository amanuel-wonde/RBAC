// Share Resource API - DAC Implementation

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { isResourceOwner, grantDACPermission } from '@/lib/access-control/dac'
import { logUserActivity } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { LogStatus } from '@prisma/client'
import { z } from 'zod'

const shareSchema = z.object({
  email: z.string().email(),
  permissions: z.object({
    canView: z.boolean(),
    canEdit: z.boolean(),
    canShare: z.boolean()
  })
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params
    const ipAddress = getClientIp(request)
    const body = await request.json()

    // Validate input
    const validation = shareSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      )
    }

    const { email, permissions } = validation.data

    // Check if user is owner (DAC)
    const isOwner = await isResourceOwner(user.id, id)
    if (!isOwner) {
      await logUserActivity(user.id, 'share_resource_denied', {
        resourceId: id,
        resourceType: 'document',
        ipAddress,
        status: LogStatus.DENIED,
        details: { reason: 'Not resource owner', model: 'DAC' }
      })

      return NextResponse.json({
        success: false,
        error: 'Only the resource owner can share documents',
        accessModel: 'DAC'
      }, { status: 403 })
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email }
    })

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Grant DAC permission
    await grantDACPermission(id, targetUser.id, permissions, user.id)

    // Log activity
    await logUserActivity(user.id, 'share_resource', {
      resourceId: id,
      resourceType: 'document',
      ipAddress,
      status: LogStatus.SUCCESS,
      details: { 
        sharedWith: targetUser.id,
        permissions,
        model: 'DAC'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Permission granted successfully',
      data: {
        accessModel: 'DAC',
        permissions
      }
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Share resource error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

