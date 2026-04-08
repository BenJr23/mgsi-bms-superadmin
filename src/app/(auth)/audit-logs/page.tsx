import React from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/get-server'
import { AuditLogsView } from '../components/AuditLogsView'

export default async function AuditLogsPage() {
    const session = await getServerSession()

    if (session?.user?.role !== 'SUPERADMIN') {
        redirect('/dashboard')
    }

    return <AuditLogsView />
}