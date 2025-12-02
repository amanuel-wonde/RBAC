// User Registration API Route

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, validatePassword } from '@/lib/auth'
import { logSystemEvent } from '@/lib/logging'
import { getClientIp } from '@/lib/utils'
import { z } from 'zod'
import { LogStatus } from '@prisma/client'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ipAddress = getClientIp(request)

    // Validate input
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      await logSystemEvent('registration_failed', {
        ipAddress,
        status: LogStatus.FAILED,
        details: { error: 'Validation failed', issues: validation.error.issues }
      })
      return NextResponse.json(
        { success: false, error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      )
    }

    const { name, email, password, department } = validation.data

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      await logSystemEvent('registration_failed', {
        ipAddress,
        status: LogStatus.FAILED,
        details: { error: passwordValidation.error }
      })
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      await logSystemEvent('registration_failed', {
        ipAddress,
        status: LogStatus.FAILED,
        details: { error: 'User already exists', email }
      })
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Get default employee role
    const employeeRole = await prisma.role.findUnique({
      where: { roleName: 'EMPLOYEE' }
    })

    if (!employeeRole) {
      return NextResponse.json(
        { success: false, error: 'System configuration error' },
        { status: 500 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Generate email verification token
    const emailVerificationToken = Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        roleId: employeeRole.id,
        department: department || null,
        emailVerificationToken,
        emailVerified: false // Admin will verify and assign proper role
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: {
            roleName: true
          }
        }
      }
    })

    // Log successful registration
    await logSystemEvent('user_registered', {
      ipAddress,
      status: LogStatus.SUCCESS,
      details: { userId: user.id, email: user.email }
    })

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please wait for admin approval.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.roleName
        }
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    const ipAddress = getClientIp(request)
    await logSystemEvent('registration_error', {
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

