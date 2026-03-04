import React from 'react'
import { getProfilePageDataCached } from '@/app/_actions/auth'
import { ProfileView } from '../components/ProfileView'

export default async function ProfilePage() {
  const result = await getProfilePageDataCached()
  const profileData = result.success ? result.data : undefined

  const fallbackRole: 'ADMIN' | 'SUPERADMIN' = 'ADMIN'
  const fallbackName = 'Admin User'
  const fallbackEmail = 'admin@company.com'

  return (
    <ProfileView
      userName={profileData?.name ?? fallbackName}
      userEmail={profileData?.email ?? fallbackEmail}
      userRole={profileData?.role ?? fallbackRole}
      userImage={profileData?.image ?? null}
      userPhone={profileData?.phoneNumber ?? ''}
      userCompany={profileData?.companyName ?? ''}
      userCreatedAt={profileData?.createdAt ?? null}
      lastLogin={profileData?.lastLogin ?? null}
    />
  )
}
