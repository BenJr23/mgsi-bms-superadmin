import React, { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { AddUserModal } from './Modals/AddUserModal'
import { Search, UserPlus, Shield } from 'lucide-react'
import { getUsers } from '@/app/_actions/users'

interface UserRow {
  id: string
  name: string
  email: string
  role: 'CLIENT' | 'ADMIN' | 'SUPERADMIN'
  createdAt: string
  deletedAt: string | null
}

export function UsersView() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadUsers = async (query: string = '') => {
    setIsLoading(true)
    const result = await getUsers(query)
    if (result.success) {
      setUsers(result.users)
    } else {
      setUsers([])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const openModal = () => {
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const handleAddUserSuccess = () => {
    loadUsers(searchQuery)
  }

  const formatJoinedDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500">Manage system access and user roles.</p>
        </div>
        <Button onClick={openModal} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      <Card noPadding>
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(event) => {
                const value = event.target.value
                setSearchQuery(value)
                loadUsers(value)
              }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />

          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Joined Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) =>
              <tr
                key={user.id}
                className="hover:bg-slate-50 transition-colors">

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs">
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {user.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.role === 'SUPERADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : user.role === 'ADMIN' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>

                      {user.role === 'SUPERADMIN' &&
                    <Shield className="w-3 h-3" />
                    }
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.deletedAt ? 'neutral' : 'success'}>
                      {user.deletedAt ? 'INACTIVE' : 'ACTIVE'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatJoinedDate(user.createdAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                      Edit
                    </button>
                  </td>
                </tr>
              )}
              {users.length === 0 && !isLoading && (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>
                    No users found.
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={5}>
                    Loading users...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {users.map((user) => (
            <div key={user.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm flex-shrink-0">
                  {user.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{user.name}</div>
                  <div className="text-sm text-slate-500 truncate">{user.email}</div>
                </div>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Role:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      user.role === 'SUPERADMIN'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : user.role === 'ADMIN'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {user.role === 'SUPERADMIN' && <Shield className="w-3 h-3" />}
                    {user.role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status:</span>
                  <Badge variant={user.deletedAt ? 'neutral' : 'success'}>
                    {user.deletedAt ? 'INACTIVE' : 'ACTIVE'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Joined:</span>
                  <span className="text-slate-900">{formatJoinedDate(user.createdAt)}</span>
                </div>
              </div>
              <button className="w-full px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors text-sm font-medium">
                Edit User
              </button>
            </div>
          ))}
          {users.length === 0 && !isLoading && (
            <div className="p-4 text-sm text-slate-500">No users found.</div>
          )}
          {isLoading && (
            <div className="p-4 text-sm text-slate-500">Loading users...</div>
          )}
        </div>
      </Card>

      <AddUserModal isOpen={isModalOpen} onClose={closeModal} onSuccess={handleAddUserSuccess} />
    </div>
  )
}