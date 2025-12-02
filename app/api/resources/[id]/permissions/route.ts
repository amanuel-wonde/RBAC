// Get DAC Permissions for Resource

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { isResourceOwner } from '@/lib/access-control/dac'

// GET - Get all permissions for resource
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { id } = await params

    // Check if user is owner
    const isOwner = await isResourceOwner(user.id, id)
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Only resource owner can view permissions' },
        { status: 403 }
      )
    }

    const permissions = await prisma.dACPermission.findMany({
      where: { resourceId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: permissions
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Get permissions error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

