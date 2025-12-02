// MFA (Email OTP) API

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { logUserActivity } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { LogStatus } from '@prisma/client'
import { z } from 'zod'

const mfaSchema = z.object({
  otp: z.string().length(6)
})

// POST - Send MFA OTP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP in user's mfaSecret temporarily (in production, use Redis or separate table)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: otp // Temporary storage
      }
    })

    // In production, send email here
    // For now, return OTP in response (remove in production!)
    console.log(`MFA OTP for ${email}: ${otp}`)

    return NextResponse.json({
      success: true,
      message: 'OTP sent to email',
      // Remove this in production!
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    })

  } catch (error) {
    console.error('Send MFA OTP error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Verify MFA OTP
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const ipAddress = getClientIp(request)
    const body = await request.json()

    // Validate input
    const validation = mfaSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP format' },
        { status: 400 }
      )
    }

    const { otp } = validation.data

    // Get user with MFA secret
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { mfaSecret: true }
    })

    if (!userData || userData.mfaSecret !== otp) {
      await logUserActivity(user.id, 'mfa_failed', {
        ipAddress,
        status: LogStatus.FAILED,
        details: { reason: 'Invalid OTP' }
      })

      return NextResponse.json(
        { success: false, error: 'Invalid OTP' },
        { status: 401 }
      )
    }

    // Clear OTP after successful verification
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: null
      }
    })

    await logUserActivity(user.id, 'mfa_success', {
      ipAddress,
      status: LogStatus.SUCCESS
    })

    return NextResponse.json({
      success: true,
      message: 'MFA verified successfully'
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Verify MFA error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

