'use client'

import { DashboardLayout } from '@/components/dashboard/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

export default function BackupsPage() {
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchBackups()
  }, [])

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/backups', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setBackups(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch backups:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        alert('Backup created successfully!')
        fetchBackups()
      } else {
        alert('Failed to create backup: ' + data.error)
      }
    } catch (err) {
      alert('Error creating backup')
    } finally {
      setCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  return (
    <DashboardLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Backups</h1>
          <Button onClick={handleCreateBackup} disabled={creating}>
            {creating ? 'Creating...' : 'Create Backup'}
          </Button>
        </div>

        <Card>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : (
            <div className="space-y-4">
              {backups.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  No backups found. Create your first backup.
                </div>
              ) : (
                backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        Backup {new Date(backup.timestamp).toLocaleString()}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Created by: {backup.creator?.name || backup.creator?.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        Size: {backup.backupSize ? `${(Number(backup.backupSize) / 1024).toFixed(2)} KB` : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded ${getStatusColor(backup.status)}`}>
                        {backup.status}
                      </span>
                      <Button size="sm" variant="outline">Download</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}

