// Individual Backup API Route

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/middleware'
import { getBackupById } from '@/lib/backup'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs/promises'
import * as path from 'path'

// GET - Get backup details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require ADMIN role
    const user = await requireRole(request, ['ADMIN'])
    const { id } = await params
    const backup = await getBackupById(id)

    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: backup
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

    console.error('Get backup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete backup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require ADMIN role
    const user = await requireRole(request, ['ADMIN'])
    const { id } = await params
    const backup = await getBackupById(id)

    if (!backup) {
      return NextResponse.json(
        { success: false, error: 'Backup not found' },
        { status: 404 }
      )
    }

    // Delete file
    try {
      await fs.unlink(backup.backupPath)
    } catch (fileError) {
      // File might not exist, continue
      console.warn('Backup file not found:', backup.backupPath)
    }

    // Delete metadata
    await prisma.backupMetadata.delete({
      where: { id }
    })

    // Log deletion
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'backup_deleted',
        status: 'SUCCESS',
        details: {
          backupId: id
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully'
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
        { success: false, error: 'Forbidden: Only admins can delete backups' },
        { status: 403 }
      )
    }

    console.error('Delete backup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

