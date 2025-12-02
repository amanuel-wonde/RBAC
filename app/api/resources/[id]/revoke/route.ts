// Revoke DAC Permission API

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { isResourceOwner, revokeDACPermission } from '@/lib/access-control/dac'
import { logUserActivity } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { LogStatus } from '@prisma/client'
import { z } from 'zod'

const revokeSchema = z.object({
  userId: z.string()
})

// POST - Revoke permission (DAC)
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
    const validation = revokeSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      )
    }

    const { userId } = validation.data

    // Check if user is owner (DAC)
    const isOwner = await isResourceOwner(user.id, id)
    if (!isOwner) {
      await logUserActivity(user.id, 'revoke_permission_denied', {
        resourceId: id,
        resourceType: 'document',
        ipAddress,
        status: LogStatus.DENIED,
        details: { reason: 'Not resource owner', model: 'DAC' }
      })

      return NextResponse.json({
        success: false,
        error: 'Only the resource owner can revoke permissions',
        accessModel: 'DAC'
      }, { status: 403 })
    }

    // Revoke permission
    await revokeDACPermission(id, userId)

    // Log activity
    await logUserActivity(user.id, 'revoke_permission', {
      resourceId: id,
      resourceType: 'document',
      ipAddress,
      status: LogStatus.SUCCESS,
      details: {
        revokedFrom: userId,
        model: 'DAC'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Permission revoked successfully',
      data: {
        accessModel: 'DAC'
      }
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Revoke permission error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

