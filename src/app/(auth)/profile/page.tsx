'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from '@/lib/auth-client'
import { getLastLogin } from '@/app/_actions/auth'
import { ProfileView } from '../components/ProfileView'

export default function ProfilePage() {
  const { data: session } = useSession()
  const [lastLogin, setLastLogin] = useState<string | null>(null)

  const sessionUser = session?.user as any
  const userRole = sessionUser?.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN'
  const userName = sessionUser?.name?.trim() || (userRole === 'SUPERADMIN' ? 'Super Admin' : 'Admin User')
  const userEmail = sessionUser?.email || `${userRole.toLowerCase()}@company.com`
  const userImage = sessionUser?.image || null
  const userPhone = sessionUser?.phoneNumber || ''
  const userCompany = sessionUser?.companyName || ''
  const userCreatedAt = sessionUser?.createdAt || null

  useEffect(() => {
    const fetchLastLogin = async () => {
      try {
        const result = await getLastLogin()
        if (result.success && result.lastLogin) {
          const value = result.lastLogin
          setLastLogin(typeof value === 'string' ? value : value.toISOString())
        }
      } catch (error) {
        console.error('Failed to fetch last login:', error)
      }
    }

    void fetchLastLogin()
  }, [])

  return (
    <ProfileView
      userName={userName}
      userEmail={userEmail}
      userRole={userRole}
      userImage={userImage}
      userPhone={userPhone}
      userCompany={userCompany}
      userCreatedAt={userCreatedAt}
      lastLogin={lastLogin}
    />
  )
}
