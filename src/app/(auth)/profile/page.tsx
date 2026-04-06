import React from 'react'
import { getProfilePageDataCached } from '@/app/_actions/auth'
import { getCompanies } from '@/app/_actions/companies'
import { ProfileView } from '../components/ProfileView'

export default async function ProfilePage() {
  const [profileResult, companiesResult] = await Promise.all([
    getProfilePageDataCached(),
    getCompanies(),
  ])

  const result = profileResult
  const profileData = result.success ? result.data : undefined
  const companyOptions = companiesResult.success && companiesResult.data
    ? companiesResult.data.map((company) => ({ id: company.id, name: company.name }))
    : []

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
      userCompanyId={profileData?.companyId ?? null}
      availableCompanies={companyOptions}
      userCreatedAt={profileData?.createdAt ?? null}
      lastLogin={profileData?.lastLogin ?? null}
    />
  )
}
