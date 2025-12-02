// User Logout API Route

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logUserActivity } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { LogStatus } from '@prisma/client'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getClientIp(request)
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value

    if (refreshToken) {
      // Find and delete session
      const session = await prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true }
      })

      if (session) {
        // Log logout
        await logUserActivity(session.userId, 'logout', {
          ipAddress,
          status: LogStatus.SUCCESS
        })

        // Delete session
        await prisma.session.delete({
          where: { refreshToken }
        })
      }
    }

    // Create response and clear cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logout successful'
    })

    response.cookies.delete('refreshToken')

    return response

  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

