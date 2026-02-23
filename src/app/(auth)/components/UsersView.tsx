import React, { useEffect, useState } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { AddUserModal } from './Modals/AddUserModal'
import { EditUserModal, type EditableUser } from './Modals/EditUserModal'
import { DeleteUserModal } from './Modals/DeleteUserModal'
import { ResetUserModal } from './Modals/ResetUserModal'
import { Search, UserPlus, Shield } from 'lucide-react'
import { getUsers } from '@/app/_actions/users'

interface UserRow {
  id: string
  name: string
  email: string
  role: 'CLIENT' | 'ADMIN' | 'SUPERADMIN'
  companyName: string | null
  phoneNumber: string | null
  contractEndDate: string | null
  image: string | null
  createdAt: string
  deletedAt: string | null
}

export function UsersView() {
  const ITEMS_PER_PAGE = 10
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [users, setUsers] = useState<UserRow[]>([])
  const [selectedUser, setSelectedUser] = useState<EditableUser | null>(null)
  const [selectedDeleteUserId, setSelectedDeleteUserId] = useState<string | undefined>()
  const [selectedDeleteUserName, setSelectedDeleteUserName] = useState<string | undefined>()
  const [selectedResetUserId, setSelectedResetUserId] = useState<string | undefined>()
  const [selectedResetUserName, setSelectedResetUserName] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [imageErrorIds, setImageErrorIds] = useState<Set<string>>(new Set())

  const loadUsers = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getUsers({
        page: currentPage,
        pageSize: ITEMS_PER_PAGE,
        searchQuery,
      })

      if (result.success && result.data) {
        setUsers(result.data.users)
        setTotalItems(result.data.pagination.totalItems)
        setTotalPages(result.data.pagination.totalPages)
      } else {
        setError(result.error || 'Failed to load users')
        setUsers([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [currentPage, searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const openModal = () => {
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const openEditModal = (user: UserRow) => {
    setSelectedUser(user)
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedUser(null)
  }

  const openDeleteModal = (userId: string, userName: string) => {
    setSelectedDeleteUserId(userId)
    setSelectedDeleteUserName(userName)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setSelectedDeleteUserId(undefined)
    setSelectedDeleteUserName(undefined)
  }

  const openResetModal = (userId: string, userName: string) => {
    setSelectedResetUserId(userId)
    setSelectedResetUserName(userName)
    setIsResetModalOpen(true)
  }

  const closeResetModal = () => {
    setIsResetModalOpen(false)
    setSelectedResetUserId(undefined)
    setSelectedResetUserName(undefined)
  }

  const handleAddUserSuccess = () => {
    loadUsers()
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems)

  const formatJoinedDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  const handleImageError = (userId: string) => {
    setImageErrorIds((prev) => {
      if (prev.has(userId)) return prev
      const next = new Set(prev)
      next.add(userId)
      return next
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

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-md">
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      <Card noPadding>
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value)
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
                      {user.image && !imageErrorIds.has(user.id)
                        ? (
                          <img
                            src={user.image}
                            alt={`${user.name} profile picture`}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={() => handleImageError(user.id)}
                          />
                        )
                        : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs">
                            {getInitials(user.name)}
                          </div>
                        )}
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                      >
                        Edit
                      </button>
                      <span className="text-slate-400 text-xs">/</span>
                      <button
                        onClick={() => openResetModal(user.id, user.name)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                      >
                        Reset
                      </button>
                      <span className="text-slate-400 text-xs">/</span>
                      <button
                        onClick={() => openDeleteModal(user.id, user.name)}
                        className="text-rose-600 hover:text-rose-800 font-medium text-xs"
                      >
                        Delete
                      </button>
                    </div>
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
                {user.image && !imageErrorIds.has(user.id)
                  ? (
                    <img
                      src={user.image}
                      alt={`${user.name} profile picture`}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      onError={() => handleImageError(user.id)}
                    />
                  )
                  : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-sm flex-shrink-0">
                      {getInitials(user.name)}
                    </div>
                  )}
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
              <button
                onClick={() => openEditModal(user)}
                className="w-full px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors text-sm font-medium mb-2"
              >
                Edit User
              </button>
              <button
                onClick={() => openResetModal(user.id, user.name)}
                className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium mb-2"
              >
                Reset Password
              </button>
              <button
                onClick={() => openDeleteModal(user.id, user.name)}
                className="w-full px-4 py-2 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-100 transition-colors text-sm font-medium"
              >
                Delete User
              </button>
            </div>
          ))}
          {users.length === 0 && !isLoading && (
            <div className="p-8 text-center text-slate-500">No users found.</div>
          )}
          {isLoading && (
            <div className="p-8 text-center text-slate-500">Loading users...</div>
          )}
        </div>

        {totalItems > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <span className="text-xs text-slate-500">
              Showing {startItem}-{endItem} of {totalItems}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AddUserModal isOpen={isModalOpen} onClose={closeModal} onSuccess={handleAddUserSuccess} />
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSuccess={handleAddUserSuccess}
        user={selectedUser}
      />
      <DeleteUserModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onSuccess={handleAddUserSuccess}
        userId={selectedDeleteUserId}
        userName={selectedDeleteUserName}
      />
      <ResetUserModal
        isOpen={isResetModalOpen}
        onClose={closeResetModal}
        onSuccess={handleAddUserSuccess}
        userId={selectedResetUserId}
        userName={selectedResetUserName}
      />
    </div>
  )
}