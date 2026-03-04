import React from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/get-server'
import { UsersView } from '../components/UsersView'

export default async function UsersPage() {
  const session = await getServerSession()

  if (session?.user?.role !== 'SUPERADMIN') {
    redirect('/dashboard')
  }

  return <UsersView />
}
