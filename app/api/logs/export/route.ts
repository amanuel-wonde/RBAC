// Export Audit Logs API Route

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth(request)

    // Only ADMIN can export logs
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only admins can export logs' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json or csv
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: any = {}

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) {
        where.timestamp.gte = new Date(startDate)
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate)
      }
    }

    // Get all logs (no pagination for export)
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        resource: {
          select: {
            title: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    })

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Timestamp', 'User', 'Email', 'Action', 'Resource', 'Status', 'IP Address']
      const rows = logs.map(log => [
        log.timestamp.toISOString(),
        log.user?.name || 'System',
        log.user?.email || '',
        log.action,
        log.resource?.title || '',
        log.status,
        log.ipAddress || ''
      ])

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`
        }
      })
    }

    // Default: JSON
    return NextResponse.json({
      success: true,
      data: logs,
      exportedAt: new Date().toISOString()
    })

  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Export logs error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

