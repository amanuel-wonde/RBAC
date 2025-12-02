'use client'

import { DashboardLayout } from '@/components/dashboard/layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useState, useEffect } from 'react'

export default function LeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLeaveRequests()
  }, [])

  const fetchLeaveRequests = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/leave', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setLeaveRequests(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch leave requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        setIsCreateModalOpen(false)
        setFormData({ startDate: '', endDate: '', reason: '' })
        fetchLeaveRequests()
        alert(data.message)
      } else {
        setError(data.error || 'Failed to create leave request')
      }
    } catch (err) {
      setError('An error occurred')
    }
  }

  const handleApprove = async (id: string, approved: boolean) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/leave/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approved })
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message)
        fetchLeaveRequests()
      } else {
        alert(data.error || 'Failed to approve/reject')
      }
    } catch (err) {
      alert('An error occurred')
    }
  }

  return (
    <DashboardLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Leave Requests</h1>
          <Button onClick={() => setIsCreateModalOpen(true)}>Request Leave</Button>
        </div>

        <Card>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading...</div>
          ) : leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              No leave requests found.
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{request.title}</h3>
                    <p className="text-sm text-gray-600">Owner: {request.owner?.name}</p>
                    <p className="text-sm text-gray-600">Department: {request.department || 'N/A'}</p>
                    <p className="text-sm text-gray-600">Security: {request.securityLevel}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleApprove(request.id, true)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleApprove(request.id, false)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            setFormData({ startDate: '', endDate: '', reason: '' })
            setError('')
          }}
          title="Request Leave (RuBAC & RBAC)"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />

            <Input
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                rows={4}
                required
              />
            </div>

            <div className="p-3 bg-yellow-50 rounded text-sm text-gray-900">
              <strong>Note:</strong> Leave requests greater than 10 days require HR Manager approval (RuBAC rule).
            </div>

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
                  setFormData({ startDate: '', endDate: '', reason: '' })
                  setError('')
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Submit Request</Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

