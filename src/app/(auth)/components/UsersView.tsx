import React from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Search, UserPlus, Shield } from 'lucide-react';
export function UsersView() {
  const users = [
  {
    id: 'USR-001',
    name: 'Alice Johnson',
    email: 'alice@company.com',
    role: 'SUPERADMIN',
    status: 'ACTIVE',
    joined: 'Jan 12, 2023'
  },
  {
    id: 'USR-002',
    name: 'Bob Smith',
    email: 'bob@company.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    joined: 'Feb 05, 2023'
  },
  {
    id: 'USR-003',
    name: 'Charlie Brown',
    email: 'charlie@client.com',
    role: 'CLIENT',
    status: 'ACTIVE',
    joined: 'Mar 20, 2023'
  },
  {
    id: 'USR-004',
    name: 'Diana Prince',
    email: 'diana@client.com',
    role: 'CLIENT',
    status: 'INACTIVE',
    joined: 'Apr 10, 2023'
  },
  {
    id: 'USR-005',
    name: 'Evan Wright',
    email: 'evan@company.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    joined: 'May 15, 2023'
  }];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500">Manage system access and user roles.</p>
        </div>
        <Button className="flex items-center gap-2">
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
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />

          </div>
        </div>

        <div className="overflow-x-auto">
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
                        {user.name.
                      split(' ').
                      map((n) => n[0]).
                      join('')}
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
                    <Badge
                    variant={user.status === 'ACTIVE' ? 'success' : 'neutral'}>

                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{user.joined}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                      Edit
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>);

}