'use client'

import { DashboardLayout } from '@/components/dashboard/layout'
import { Card } from '@/components/ui/card'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    employees: 0,
    documents: 0,
    logs: 0,
    backups: 0
  })

  useEffect(() => {
    // Fetch dashboard stats
    // This is a placeholder - implement actual API calls
    setStats({
      employees: 10,
      documents: 25,
      logs: 150,
      backups: 5
    })
  }, [])

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900">{stats.employees}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Documents</p>
                <p className="text-3xl font-bold text-gray-900">{stats.documents}</p>
              </div>
              <div className="text-4xl">📄</div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Audit Logs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.logs}</p>
              </div>
              <div className="text-4xl">📋</div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Backups</p>
                <p className="text-3xl font-bold text-gray-900">{stats.backups}</p>
              </div>
              <div className="text-4xl">💾</div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Access Control Models in Action">
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <div className="font-medium text-blue-900 mb-1">MAC - Mandatory Access Control</div>
                <div className="text-sm text-gray-900">Working: Documents show security levels (PUBLIC, INTERNAL, CONFIDENTIAL). Users need matching clearance to access.</div>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <div className="font-medium text-green-900 mb-1">DAC - Discretionary Access Control</div>
                <div className="text-sm text-gray-900">Working: Document owners can share with specific users. View/Edit/Share permissions are enforced.</div>
              </div>
              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                <div className="font-medium text-purple-900 mb-1">RBAC - Role-Based Access Control</div>
                <div className="text-sm text-gray-900">Working: Only ADMIN/HR_MANAGER can create employees. Roles determine permissions for all operations.</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                <div className="font-medium text-yellow-900 mb-1">RuBAC - Rule-Based Access Control</div>
                <div className="text-sm text-gray-900">Working: System rules check time, IP, and conditions. Rules are evaluated on every access attempt.</div>
              </div>
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <div className="font-medium text-red-900 mb-1">ABAC - Attribute-Based Access Control</div>
                <div className="text-sm text-gray-900">Working: Department, location, job level attributes are checked. Same department users can access department resources.</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-900">
              <strong>Note:</strong> All operations show which access control model granted or denied access. Check Documents page to see models in action.
            </div>
          </Card>

          <Card title="How Access Control Works">
            <div className="space-y-3 text-sm text-gray-900">
              <div>
                <strong className="text-blue-700">MAC:</strong> <span className="text-gray-900">When viewing documents, your clearance level must match or exceed the document's security level.</span>
              </div>
              <div>
                <strong className="text-green-700">DAC:</strong> <span className="text-gray-900">Document owners can share with others. Only owners can grant/revoke permissions.</span>
              </div>
              <div>
                <strong className="text-purple-700">RBAC:</strong> <span className="text-gray-900">Your role (ADMIN, HR_MANAGER, etc.) determines what you can do. Try creating an employee to see RBAC in action.</span>
              </div>
              <div>
                <strong className="text-yellow-700">RuBAC:</strong> <span className="text-gray-900">System rules apply automatically. Working hours, department rules, and IP restrictions are checked.</span>
              </div>
              <div>
                <strong className="text-red-700">ABAC:</strong> <span className="text-gray-900">Your department, location, and job level are checked against resource attributes.</span>
              </div>
              <div className="mt-4 p-2 bg-blue-50 rounded">
                <strong className="text-gray-900">Try it:</strong> <span className="text-gray-900">Create documents with different security levels, then view them to see which model grants access!</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

