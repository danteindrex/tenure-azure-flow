/**
 * Admin Dashboard - Status System Management
 *
 * Main dashboard for managing:
 * - Status categories
 * - Status values (display names, colors)
 * - Access control rules
 * - Protected routes
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

interface StatusCategory {
  id: number
  code: string
  name: string
  description: string | null
  tableName: string | null
  columnName: string | null
  isSystem: boolean
  isActive: boolean
}

interface StatusValue {
  id: number
  categoryId: number
  code: string
  displayName: string
  description: string | null
  color: string | null
  sortOrder: number
  isDefault: boolean
  isTerminal: boolean
  isActive: boolean
  categoryCode: string
  categoryName: string
}

interface AccessRule {
  id: number
  name: string
  description: string | null
  userStatusIds: number[]
  memberStatusIds: number[]
  subscriptionStatusIds: number[]
  kycStatusIds: number[]
  requiresEmailVerified: boolean
  requiresPhoneVerified: boolean
  requiresProfileComplete: boolean
  requiresActiveSubscription: boolean
  conditionLogic: string
  priority: number
  isActive: boolean
}

interface ProtectedRoute {
  id: number
  routePattern: string
  routeName: string | null
  accessRuleId: number | null
  redirectRoute: string
  requiresAuth: boolean
  isPublic: boolean
  priority: number
  isActive: boolean
  ruleName: string | null
}

type Tab = 'statuses' | 'rules' | 'routes'

export default function AdminDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('statuses')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Data states
  const [categories, setCategories] = useState<StatusCategory[]>([])
  const [values, setValues] = useState<StatusValue[]>([])
  const [rules, setRules] = useState<AccessRule[]>([])
  const [routes, setRoutes] = useState<ProtectedRoute[]>([])

  // Selected category for filtering values
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // Edit modal states
  const [editingValue, setEditingValue] = useState<StatusValue | null>(null)
  const [editingRule, setEditingRule] = useState<AccessRule | null>(null)
  const [editingRoute, setEditingRoute] = useState<ProtectedRoute | null>(null)

  // Check auth and load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [catRes, valRes, ruleRes, routeRes] = await Promise.all([
        fetch('/api/admin/status-system/categories'),
        fetch('/api/admin/status-system/values'),
        fetch('/api/admin/status-system/access-rules'),
        fetch('/api/admin/status-system/routes'),
      ])

      // Check for auth error
      if (catRes.status === 401) {
        router.push('/admin/login')
        return
      }

      const [catData, valData, ruleData, routeData] = await Promise.all([
        catRes.json(),
        valRes.json(),
        ruleRes.json(),
        routeRes.json(),
      ])

      setCategories(catData.categories || [])
      setValues(valData.values || [])
      setRules(ruleData.rules || [])
      setRoutes(routeData.routes || [])
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  const updateStatusValue = async (value: StatusValue) => {
    try {
      const response = await fetch('/api/admin/status-system/values', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      })

      if (!response.ok) throw new Error('Update failed')

      await loadData()
      setEditingValue(null)
    } catch (err) {
      setError('Failed to update status value')
    }
  }

  const updateAccessRule = async (rule: AccessRule) => {
    try {
      const response = await fetch('/api/admin/status-system/access-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      })

      if (!response.ok) throw new Error('Update failed')

      await loadData()
      setEditingRule(null)
    } catch (err) {
      setError('Failed to update access rule')
    }
  }

  const updateRoute = async (route: ProtectedRoute) => {
    try {
      const response = await fetch('/api/admin/status-system/routes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(route),
      })

      if (!response.ok) throw new Error('Update failed')

      await loadData()
      setEditingRoute(null)
    } catch (err) {
      setError('Failed to update route')
    }
  }

  const filteredValues = selectedCategory
    ? values.filter(v => v.categoryCode === selectedCategory)
    : values

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard | Status System</title>
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Dev Admin - Status System</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-900/50 border-b border-red-500 text-red-200 px-4 py-3 text-center">
            {error}
            <button onClick={() => setError('')} className="ml-4 underline">Dismiss</button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex gap-4">
              {(['statuses', 'rules', 'routes'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab === 'statuses' && 'Status Values'}
                  {tab === 'rules' && 'Access Rules'}
                  {tab === 'routes' && 'Protected Routes'}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Status Values Tab */}
          {activeTab === 'statuses' && (
            <div>
              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Filter by Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full max-w-xs px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.code} value={cat.code}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Values Table */}
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Display Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Color</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Order</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredValues.map(value => (
                      <tr key={value.id} className="hover:bg-gray-750">
                        <td className="px-4 py-3 text-sm text-gray-300">{value.categoryName}</td>
                        <td className="px-4 py-3 text-sm text-gray-400 font-mono">{value.code}</td>
                        <td className="px-4 py-3 text-sm text-white">{value.displayName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded"
                              style={{ backgroundColor: value.color || '#6B7280' }}
                            />
                            <span className="text-xs text-gray-400">{value.color}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{value.sortOrder}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs rounded ${
                            value.isActive
                              ? 'bg-green-900/50 text-green-400'
                              : 'bg-red-900/50 text-red-400'
                          }`}>
                            {value.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditingValue(value)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Access Rules Tab */}
          {activeTab === 'rules' && (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Conditions</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {rules.map(rule => (
                    <tr key={rule.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-sm text-white">{rule.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{rule.description || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        <div className="flex flex-wrap gap-1">
                          {rule.requiresEmailVerified && (
                            <span className="px-2 py-0.5 bg-blue-900/50 text-blue-400 text-xs rounded">Email</span>
                          )}
                          {rule.requiresPhoneVerified && (
                            <span className="px-2 py-0.5 bg-blue-900/50 text-blue-400 text-xs rounded">Phone</span>
                          )}
                          {rule.requiresProfileComplete && (
                            <span className="px-2 py-0.5 bg-blue-900/50 text-blue-400 text-xs rounded">Profile</span>
                          )}
                          {rule.userStatusIds?.length > 0 && (
                            <span className="px-2 py-0.5 bg-purple-900/50 text-purple-400 text-xs rounded">
                              {rule.userStatusIds.length} User Status
                            </span>
                          )}
                          {rule.memberStatusIds?.length > 0 && (
                            <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded">
                              {rule.memberStatusIds.length} Member Status
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{rule.priority}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded ${
                          rule.isActive
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Protected Routes Tab */}
          {activeTab === 'routes' && (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Pattern</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Access Rule</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Redirect</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {routes.map(route => (
                    <tr key={route.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-sm text-white font-mono">{route.routePattern}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{route.routeName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{route.ruleName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 font-mono">{route.redirectRoute}</td>
                      <td className="px-4 py-3">
                        {route.isPublic ? (
                          <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded">Public</span>
                        ) : route.requiresAuth ? (
                          <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-400 text-xs rounded">Auth</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded ${
                          route.isActive
                            ? 'bg-green-900/50 text-green-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}>
                          {route.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setEditingRoute(route)}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {/* Edit Status Value Modal */}
        {editingValue && (
          <EditValueModal
            value={editingValue}
            onSave={updateStatusValue}
            onClose={() => setEditingValue(null)}
          />
        )}

        {/* Edit Access Rule Modal */}
        {editingRule && (
          <EditRuleModal
            rule={editingRule}
            values={values}
            onSave={updateAccessRule}
            onClose={() => setEditingRule(null)}
          />
        )}

        {/* Edit Route Modal */}
        {editingRoute && (
          <EditRouteModal
            route={editingRoute}
            rules={rules}
            onSave={updateRoute}
            onClose={() => setEditingRoute(null)}
          />
        )}
      </div>
    </>
  )
}

// Edit Value Modal Component
function EditValueModal({
  value,
  onSave,
  onClose
}: {
  value: StatusValue
  onSave: (value: StatusValue) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(value)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-white mb-4">Edit Status Value</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Code (read-only)</label>
            <input
              value={form.code}
              disabled
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Display Name</label>
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form.color || '#6B7280'}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-12 h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
              />
              <input
                value={form.color || '#6B7280'}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Sort Order</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="rounded"
              />
              Default
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.isTerminal}
                onChange={(e) => setForm({ ...form, isTerminal: e.target.checked })}
                className="rounded"
              />
              Terminal
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Edit Rule Modal Component
function EditRuleModal({
  rule,
  values,
  onSave,
  onClose
}: {
  rule: AccessRule
  values: StatusValue[]
  onSave: (rule: AccessRule) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(rule)

  const userStatuses = values.filter(v => v.categoryCode === 'user_funnel')
  const memberStatuses = values.filter(v => v.categoryCode === 'member_eligibility')
  const subscriptionStatuses = values.filter(v => v.categoryCode === 'subscription_status')
  const kycStatuses = values.filter(v => v.categoryCode === 'kyc_status')

  const toggleStatus = (ids: number[], id: number): number[] => {
    return ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl p-6 my-8">
        <h2 className="text-lg font-bold text-white mb-4">Edit Access Rule</h2>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Priority</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Condition Logic</label>
              <select
                value={form.conditionLogic}
                onChange={(e) => setForm({ ...form, conditionLogic: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="all">ALL (AND)</option>
                <option value="any">ANY (OR)</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Required Verifications</h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.requiresEmailVerified}
                  onChange={(e) => setForm({ ...form, requiresEmailVerified: e.target.checked })}
                />
                Email Verified
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.requiresPhoneVerified}
                  onChange={(e) => setForm({ ...form, requiresPhoneVerified: e.target.checked })}
                />
                Phone Verified
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.requiresProfileComplete}
                  onChange={(e) => setForm({ ...form, requiresProfileComplete: e.target.checked })}
                />
                Profile Complete
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={form.requiresActiveSubscription}
                  onChange={(e) => setForm({ ...form, requiresActiveSubscription: e.target.checked })}
                />
                Active Subscription
              </label>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">User Status (allowed)</h3>
            <div className="flex flex-wrap gap-2">
              {userStatuses.map(s => (
                <button
                  key={s.id}
                  onClick={() => setForm({
                    ...form,
                    userStatusIds: toggleStatus(form.userStatusIds || [], s.id)
                  })}
                  className={`px-3 py-1 rounded text-sm ${
                    form.userStatusIds?.includes(s.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {s.displayName}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Member Status (allowed)</h3>
            <div className="flex flex-wrap gap-2">
              {memberStatuses.map(s => (
                <button
                  key={s.id}
                  onClick={() => setForm({
                    ...form,
                    memberStatusIds: toggleStatus(form.memberStatusIds || [], s.id)
                  })}
                  className={`px-3 py-1 rounded text-sm ${
                    form.memberStatusIds?.includes(s.id)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {s.displayName}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Subscription Status (allowed)</h3>
            <div className="flex flex-wrap gap-2">
              {subscriptionStatuses.map(s => (
                <button
                  key={s.id}
                  onClick={() => setForm({
                    ...form,
                    subscriptionStatusIds: toggleStatus(form.subscriptionStatusIds || [], s.id)
                  })}
                  className={`px-3 py-1 rounded text-sm ${
                    form.subscriptionStatusIds?.includes(s.id)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {s.displayName}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            <span className="text-sm text-gray-300">Rule is Active</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Edit Route Modal Component
function EditRouteModal({
  route,
  rules,
  onSave,
  onClose
}: {
  route: ProtectedRoute
  rules: AccessRule[]
  onSave: (route: ProtectedRoute) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(route)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-white mb-4">Edit Protected Route</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Route Pattern</label>
            <input
              value={form.routePattern}
              onChange={(e) => setForm({ ...form, routePattern: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono"
              placeholder="/dashboard/*"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Route Name</label>
            <input
              value={form.routeName || ''}
              onChange={(e) => setForm({ ...form, routeName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Access Rule</label>
            <select
              value={form.accessRuleId || ''}
              onChange={(e) => setForm({ ...form, accessRuleId: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              <option value="">None</option>
              {rules.map(rule => (
                <option key={rule.id} value={rule.id}>{rule.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Redirect Route</label>
            <input
              value={form.redirectRoute}
              onChange={(e) => setForm({ ...form, redirectRoute: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Priority</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
              />
              Public
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.requiresAuth}
                onChange={(e) => setForm({ ...form, requiresAuth: e.target.checked })}
              />
              Requires Auth
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
