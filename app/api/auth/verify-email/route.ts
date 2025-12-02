// Email Verification API

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logSystemEvent } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { LogStatus } from '@prisma/client'

// GET - Verify email with token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const ipAddress = getClientIp(request)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token required' },
        { status: 400 }
      )
    }

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token
      }
    })

    if (!user) {
      await logSystemEvent('email_verification_failed', {
        ipAddress,
        status: LogStatus.FAILED,
        details: { reason: 'Invalid token' }
      })

      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Verify email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null
      }
    })

    await logSystemEvent('email_verified', {
      ipAddress,
      status: LogStatus.SUCCESS,
      details: { userId: user.id, email: user.email }
    })

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    })

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

