'use client'

import { DashboardLayout } from '@/components/dashboard/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function DocumentViewPage() {
  const params = useParams()
  const router = useRouter()
  const [document, setDocument] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accessModel, setAccessModel] = useState<string>('')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [sharePermissions, setSharePermissions] = useState({
    canView: true,
    canEdit: false,
    canShare: false
  })
  const [sharedUsers, setSharedUsers] = useState<any[]>([])

  useEffect(() => {
    if (params.id) {
      fetchDocument()
      fetchSharedUsers()
    }
  }, [params.id])

  const fetchSharedUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/resources/${params.id}/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setSharedUsers(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch shared users:', err)
    }
  }

  const fetchDocument = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/resources/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        setDocument(data.data)
        setAccessModel(data.data.accessModel || '')
      } else {
        setError(data.error || 'Failed to load document')
        setAccessModel(data.accessModel || '')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/resources/${params.id}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: shareEmail,
          permissions: sharePermissions
        })
      })

      const data = await response.json()
      if (data.success) {
        setIsShareModalOpen(false)
        setShareEmail('')
        alert('Permission granted successfully!')
        fetchSharedUsers()
      } else {
        alert(data.error || 'Failed to share document')
      }
    } catch (err) {
      alert('An error occurred')
    }
  }

  const getModelColor = (model: string) => {
    const colors: Record<string, string> = {
      MAC: 'bg-blue-100 text-blue-800 border-blue-300',
      DAC: 'bg-green-100 text-green-800 border-green-300',
      RBAC: 'bg-purple-100 text-purple-800 border-purple-300',
      RuBAC: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      ABAC: 'bg-red-100 text-red-800 border-red-300'
    }
    return colors[model] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">Loading...</div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card>
          <div className="text-center py-8">
            <div className={`inline-block px-4 py-2 rounded border-2 ${getModelColor(accessModel)} mb-4`}>
              Access Denied - {accessModel || 'Access Control'}
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/documents')}>Back to Documents</Button>
          </div>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => router.push('/documents')}>
            ← Back
          </Button>
          <div className="flex space-x-2">
            <Button onClick={() => setIsShareModalOpen(true)}>Share Document (DAC)</Button>
            <Button 
              variant="danger" 
              onClick={async () => {
                if (confirm('Are you sure you want to delete this document?')) {
                  try {
                    const token = localStorage.getItem('token')
                    const response = await fetch(`/api/resources/${params.id}`, {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    })
                    const data = await response.json()
                    if (data.success) {
                      router.push('/documents')
                    } else {
                      alert(data.error || 'Failed to delete')
                    }
                  } catch (err) {
                    alert('Error deleting document')
                  }
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        {accessModel && (
          <div className={`p-4 rounded-lg border-2 ${getModelColor(accessModel)}`}>
            <p className="font-semibold">Access Granted via: {accessModel}</p>
            <p className="text-sm mt-1">{document?.accessReason}</p>
          </div>
        )}

        <Card title={document?.title}>
          <div className="space-y-4">
            <div>
              <strong className="text-gray-900">Security Level (MAC):</strong> <span className="text-gray-900">{document?.securityLevel}</span>
            </div>
            <div>
              <strong className="text-gray-900">Owner (DAC):</strong> <span className="text-gray-900">{document?.owner?.name || document?.owner?.email}</span>
            </div>
            {document?.department && (
              <div>
                <strong className="text-gray-900">Department (ABAC):</strong> <span className="text-gray-900">{document.department}</span>
              </div>
            )}
            <div>
              <strong className="text-gray-900">Created:</strong> <span className="text-gray-900">{new Date(document?.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {sharedUsers.length > 0 && (
          <Card title="Shared With (DAC Permissions)">
            <div className="space-y-2">
              {sharedUsers.map((perm) => (
                <div key={perm.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{perm.user.name}</p>
                    <p className="text-sm text-gray-600">{perm.user.email}</p>
                    <div className="flex space-x-2 mt-1">
                      {perm.canView && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">View</span>}
                      {perm.canEdit && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Edit</span>}
                      {perm.canShare && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Share</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      if (confirm('Revoke access for this user?')) {
                        try {
                          const token = localStorage.getItem('token')
                          const response = await fetch(`/api/resources/${params.id}/revoke`, {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ userId: perm.userId })
                          })
                          const data = await response.json()
                          if (data.success) {
                            alert('Permission revoked')
                            fetchSharedUsers()
                          } else {
                            alert(data.error || 'Failed to revoke')
                          }
                        } catch (err) {
                          alert('Error revoking permission')
                        }
                      }
                    }}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Modal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false)
            setShareEmail('')
          }}
          title="Share Document (DAC)"
        >
          <form onSubmit={handleShare} className="space-y-4">
            <Input
              label="User Email"
              type="email"
              placeholder="user@example.com"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              required
              className="text-gray-900"
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Permissions</label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sharePermissions.canView}
                  onChange={(e) => setSharePermissions({ ...sharePermissions, canView: e.target.checked })}
                  className="mr-2"
                />
                Can View
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sharePermissions.canEdit}
                  onChange={(e) => setSharePermissions({ ...sharePermissions, canEdit: e.target.checked })}
                  className="mr-2"
                />
                Can Edit
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={sharePermissions.canShare}
                  onChange={(e) => setSharePermissions({ ...sharePermissions, canShare: e.target.checked })}
                  className="mr-2"
                />
                Can Share
              </label>
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setIsShareModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Grant Permission</Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

