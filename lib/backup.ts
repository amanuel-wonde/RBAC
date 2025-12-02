// Backup System Implementation

import { prisma } from './prisma'
import { BackupStatus } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { createHash } from 'crypto'

const execAsync = promisify(exec)

const BACKUP_DIR = process.env.BACKUP_DIR || './backups'
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-in-production'

/**
 * Create database backup
 */
export async function createBackup(userId: string): Promise<{
  success: boolean
  backupPath?: string
  error?: string
}> {
  try {
    // Ensure backup directory exists
    await fs.mkdir(BACKUP_DIR, { recursive: true })

    // Generate backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `usedams-backup-${timestamp}.sql`
    const backupPath = path.join(BACKUP_DIR, backupFileName)

    // Get database URL
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not set')
    }

    // Parse database URL
    const url = new URL(databaseUrl.replace('postgresql://', 'http://'))
    const dbUser = url.username
    const dbPassword = url.password
    const dbHost = url.hostname
    const dbPort = url.port || '5432'
    const dbName = url.pathname.slice(1).split('?')[0]

    // Create pg_dump command
    const pgDumpCommand = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F p > "${backupPath}"`

    // Execute backup
    await execAsync(pgDumpCommand)

    // Get backup file size
    const stats = await fs.stat(backupPath)
    const backupSize = stats.size

    // Create hash for integrity check
    const fileContent = await fs.readFile(backupPath)
    const hash = createHash('sha256').update(fileContent).digest('hex')

    // Encrypt backup (simple encryption - in production use proper AES-256)
    const encryptedPath = backupPath + '.encrypted'
    // For now, just copy (implement proper encryption in production)
    await fs.copyFile(backupPath, encryptedPath)

    // Store backup metadata in database
    const backupMetadata = await prisma.backupMetadata.create({
      data: {
        backupPath: encryptedPath,
        backupSize: BigInt(backupSize),
        createdBy: userId,
        status: BackupStatus.SUCCESS
      }
    })

    // Log backup creation
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'backup_created',
        status: 'SUCCESS',
        details: {
          backupId: backupMetadata.id,
          backupPath: encryptedPath,
          backupSize
        }
      }
    })

    return {
      success: true,
      backupPath: encryptedPath
    }

  } catch (error: any) {
    console.error('Backup creation error:', error)

    // Log backup failure
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'backup_failed',
          status: 'FAILED',
          details: {
            error: error.message
          }
        }
      })
    } catch (logError) {
      console.error('Failed to log backup error:', logError)
    }

    return {
      success: false,
      error: error.message || 'Backup failed'
    }
  }
}

/**
 * Get all backups
 */
export async function getAllBackups() {
  return prisma.backupMetadata.findMany({
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { timestamp: 'desc' }
  })
}

/**
 * Get backup by ID
 */
export async function getBackupById(backupId: string) {
  return prisma.backupMetadata.findUnique({
    where: { id: backupId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  })
}

/**
 * Delete old backups (keep last 30 days)
 */
export async function cleanupOldBackups(): Promise<number> {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const oldBackups = await prisma.backupMetadata.findMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo
        }
      }
    })

    let deletedCount = 0

    for (const backup of oldBackups) {
      try {
        // Delete file
        await fs.unlink(backup.backupPath).catch(() => {
          // File might not exist, continue
        })

        // Delete metadata
        await prisma.backupMetadata.delete({
          where: { id: backup.id }
        })

        deletedCount++
      } catch (error) {
        console.error(`Failed to delete backup ${backup.id}:`, error)
      }
    }

    return deletedCount

  } catch (error) {
    console.error('Backup cleanup error:', error)
    return 0
  }
}

