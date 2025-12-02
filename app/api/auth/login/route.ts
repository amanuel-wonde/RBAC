// User Login API Route

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, checkAccountLockout, incrementFailedAttempts, resetFailedAttempts, getUserWithRole } from '@/lib/auth'
import { logUserActivity, logAccessDenial, logSystemEvent } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { z } from 'zod'
import { LogStatus } from '@prisma/client'
import jwt from 'jsonwebtoken'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret-key'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ipAddress = getClientIp(request)

    // Validate input
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    // Get user with role
    const user = await getUserWithRole(email)

    if (!user) {
      await logAccessDenial(undefined, 'login_attempt', 'User not found', { ipAddress })
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if account is locked
    if (user.isLocked) {
      await logAccessDenial(user.id, 'login_attempt', 'Account is locked', { ipAddress })
      return NextResponse.json(
        { success: false, error: 'Account is locked. Please contact administrator.' },
        { status: 403 }
      )
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash)

    if (!passwordValid) {
      await incrementFailedAttempts(user.id)
      await logAccessDenial(user.id, 'login_attempt', 'Invalid password', { ipAddress })
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if email is verified (optional - can be enforced)
    if (!user.emailVerified) {
      await logAccessDenial(user.id, 'login_attempt', 'Email not verified', { ipAddress })
      return NextResponse.json(
        { success: false, error: 'Please verify your email before logging in' },
        { status: 403 }
      )
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(user.id)

    // Create session token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role.roleName,
        clearanceLevel: user.clearanceLevel
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    )

    // Create refresh token
    const refreshToken = Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    // Store session in database
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        ipAddress,
        deviceInfo: request.headers.get('user-agent') || undefined
      }
    })

    // Log successful login
    await logUserActivity(user.id, 'login', {
      ipAddress,
      status: LogStatus.SUCCESS
    })

    // Create response with HttpOnly cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.roleName,
          clearanceLevel: user.clearanceLevel
        },
        token
      }
    })

    // Set HttpOnly cookie for refresh token
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    const ipAddress = getClientIp(request)
    await logSystemEvent('login_error', {
      ipAddress,
      status: LogStatus.FAILED,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    })

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

