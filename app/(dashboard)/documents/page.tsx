'use client'

import { DashboardLayout } from '@/components/dashboard/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useState, useEffect } from 'react'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    securityLevel: 'PUBLIC',
    department: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/resources', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setDocuments(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreateLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          securityLevel: formData.securityLevel,
          department: formData.department || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        setIsCreateModalOpen(false)
        setFormData({ title: '', securityLevel: 'PUBLIC', department: '' })
        fetchDocuments() // Refresh list
      } else {
        setError(data.error || 'Failed to create document')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setCreateLoading(false)
    }
  }

  const getSecurityBadgeColor = (level: string) => {
    switch (level) {
      case 'PUBLIC':
        return 'bg-green-100 text-green-800'
      case 'INTERNAL':
        return 'bg-yellow-100 text-yellow-800'
      case 'CONFIDENTIAL':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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

  return (
    <DashboardLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>Create Document</Button>
        </div>

        <Card>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No documents found. Create your first document.
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                    <div className="flex items-center space-x-2 mt-1 flex-wrap gap-2">
                      <p className="text-sm text-gray-600">Owner: {doc.owner?.name || doc.owner?.email}</p>
                      {doc.accessModel && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded border ${getModelColor(doc.accessModel)}`}>
                          Access: {doc.accessModel}
                        </span>
                      )}
                      {doc.accessReason && (
                        <span className="text-xs text-gray-500">({doc.accessReason})</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded ${getSecurityBadgeColor(doc.securityLevel)}`}>
                      {doc.securityLevel}
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.location.href = `/documents/${doc.id}`}
                    >
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.location.href = `/documents/${doc.id}`}
                    >
                      Share
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Create Document Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            setFormData({ title: '', securityLevel: 'PUBLIC', department: '' })
            setError('')
          }}
          title="Create Document"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Document Title"
              placeholder="Enter document title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Security Level (MAC)
              </label>
              <select
                value={formData.securityLevel}
                onChange={(e) => setFormData({ ...formData, securityLevel: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                required
              >
                <option value="PUBLIC">PUBLIC</option>
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                This sets the MAC security level for the document
              </p>
            </div>

            <Input
              label="Department (Optional - for ABAC)"
              placeholder="IT, HR, Finance, etc."
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false)
                  setFormData({ title: '', securityLevel: 'PUBLIC', department: '' })
                  setError('')
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? 'Creating...' : 'Create Document'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
