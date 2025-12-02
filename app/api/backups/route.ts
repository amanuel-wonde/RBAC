// Backup API Routes

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/middleware'
import { createBackup, getAllBackups } from '@/lib/backup'

// GET - List all backups
export async function GET(request: NextRequest) {
  try {
    // Require ADMIN role
    const user = await requireRole(request, ['ADMIN'])

    const backups = await getAllBackups()

    return NextResponse.json({
      success: true,
      data: backups
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can view backups' },
        { status: 403 }
      )
    }

    console.error('Get backups error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new backup
export async function POST(request: NextRequest) {
  try {
    // Require ADMIN role
    const user = await requireRole(request, ['ADMIN'])

    const result = await createBackup(user.id)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Backup created successfully',
        data: {
          backupPath: result.backupPath
        }
      }, { status: 201 })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can create backups' },
        { status: 403 }
      )
    }

    console.error('Create backup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

