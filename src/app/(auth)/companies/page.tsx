import React from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/get-server'
import { CompaniesView } from '../components/CompaniesView'

export default async function CompaniesPage() {
  const session = await getServerSession()

  if (session?.user?.role !== 'SUPERADMIN') {
    redirect('/dashboard')
  }

  return <CompaniesView />
}
