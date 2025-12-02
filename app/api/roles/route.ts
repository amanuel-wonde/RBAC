// Roles API Route

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

// GET - List all roles
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)

    const roles = await prisma.role.findMany({
      orderBy: { roleName: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: roles
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Get roles error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

