'use client'

import React, { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { getAuditLogs } from '@/app/_actions/audit-log'

type AuditAction = 'CREATE' | 'EDIT' | 'DELETE'
type AuditStatus = 'SUCCESS' | 'FAILED'

interface AuditFieldChange {
    field: string
    before: string | null
    after: string | null
}

interface AuditLogRow {
    id: string
    logNumber: string
    actorName: string
    actorEmail: string
    action: AuditAction
    module: string
    target: string
    status: AuditStatus
    timestamp: string
    changes: AuditFieldChange[]
}

const ITEMS_PER_PAGE = 6

export function AuditLogsView() {
    const [logs, setLogs] = useState<AuditLogRow[]>([])
    const [moduleOptions, setModuleOptions] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [actionFilter, setActionFilter] = useState<'ALL' | AuditAction>('ALL')
    const [statusFilter, setStatusFilter] = useState<'ALL' | AuditStatus>('ALL')
    const [moduleFilter, setModuleFilter] = useState<string>('ALL')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [selectedLogForChanges, setSelectedLogForChanges] = useState<AuditLogRow | null>(null)

    const loadAuditLogs = async () => {
        setIsLoading(true)
        setError(null)

        try {
            const result = await getAuditLogs({
                page: currentPage,
                pageSize: ITEMS_PER_PAGE,
                searchQuery,
                action: actionFilter,
                status: statusFilter,
                module: moduleFilter,
            })

            if (!result.success || !result.data) {
                setLogs([])
                setModuleOptions([])
                setTotalItems(0)
                setTotalPages(1)
                setError(result.error || 'Failed to load audit logs')
                return
            }

            setLogs(result.data.logs)
            setModuleOptions(result.data.moduleOptions)
            setTotalItems(result.data.pagination.totalItems)
            setTotalPages(result.data.pagination.totalPages)
        } catch (err) {
            setLogs([])
            setModuleOptions([])
            setTotalItems(0)
            setTotalPages(1)
            setError(err instanceof Error ? err.message : 'An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadAuditLogs()
    }, [currentPage, searchQuery, actionFilter, statusFilter, moduleFilter])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, actionFilter, statusFilter, moduleFilter])

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages)
        }
    }, [currentPage, totalPages])

    const formatTimestamp = (value: string) => {
        const dt = new Date(value)
        if (Number.isNaN(dt.getTime())) return '-'
        return dt.toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        })
    }

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems)

    const getActionVariant = (action: AuditAction) => {
        if (action === 'CREATE') return 'success'
        if (action === 'EDIT') return 'info'
        return 'danger'
    }

    const getStatusVariant = (status: AuditStatus) => {
        if (status === 'SUCCESS') return 'success'
        return 'danger'
    }

    const renderChangeValue = (value: string | null) => {
        if (value === null) return <span className="text-slate-400 italic">(empty)</span>
        return <span className="text-slate-700">{value}</span>
    }

    const clearFilters = () => {
        setSearchQuery('')
        setActionFilter('ALL')
        setStatusFilter('ALL')
        setModuleFilter('ALL')
        setCurrentPage(1)
    }

    const hasActiveFilters = searchQuery.trim().length > 0 || actionFilter !== 'ALL' || statusFilter !== 'ALL' || moduleFilter !== 'ALL'

    const openChangesModal = (log: AuditLogRow) => {
        setSelectedLogForChanges(log)
    }

    const closeChangesModal = () => {
        setSelectedLogForChanges(null)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
                <p className="text-slate-500">Track create, edit, and delete actions with timestamps and detailed field changes.</p>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-md">
                    <p className="text-sm text-rose-700">{error}</p>
                </div>
            )}

            <Card noPadding>
                <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="Search actor, target, module, or log number..."
                            onChange={(event) => {
                                setSearchQuery(event.target.value)
                                setCurrentPage(1)
                            }}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <select
                            value={actionFilter}
                            onChange={(event) => {
                                setActionFilter(event.target.value as 'ALL' | AuditAction)
                                setCurrentPage(1)
                            }}
                            className="w-full sm:w-44 px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="ALL">All actions</option>
                            <option value="CREATE">Create</option>
                            <option value="EDIT">Edit</option>
                            <option value="DELETE">Delete</option>
                        </select>

                        <select
                            value={moduleFilter}
                            onChange={(event) => {
                                setModuleFilter(event.target.value)
                                setCurrentPage(1)
                            }}
                            className="w-full sm:w-48 px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="ALL">All modules</option>
                            {moduleOptions.map((module) => (
                                <option key={module} value={module}>
                                    {module}
                                </option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value as 'ALL' | AuditStatus)
                                setCurrentPage(1)
                            }}
                            className="w-full sm:w-44 px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="ALL">All status</option>
                            <option value="SUCCESS">Success</option>
                            <option value="FAILED">Failed</option>
                        </select>

                        <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters}>
                            Clear
                        </Button>
                    </div>
                </div>

                <div className="hidden xl:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Audit Log #</th>
                                <th className="px-6 py-3">Who</th>
                                <th className="px-6 py-3">Action</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Module / Target</th>
                                <th className="px-6 py-3">Timestamp</th>
                                <th className="px-6 py-3">What Changed</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors align-top">
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-900">{log.logNumber}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-900">{log.actorName}</p>
                                        <p className="text-xs text-slate-500">{log.actorEmail}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={getActionVariant(log.action)}>{log.action}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={getStatusVariant(log.status)}>{log.status}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-slate-900">{log.module}</p>
                                        <p className="text-xs text-slate-500">{log.target}</p>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{formatTimestamp(log.timestamp)}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            type="button"
                                            onClick={() => openChangesModal(log)}
                                            className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                                        >
                                            View Changes
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {logs.length === 0 && !isLoading && (
                                <tr>
                                    <td className="px-6 py-8 text-slate-500" colSpan={7}>
                                        {hasActiveFilters ? 'No logs match your filters.' : 'No audit logs available yet.'}
                                    </td>
                                </tr>
                            )}

                            {isLoading && (
                                <tr>
                                    <td className="px-6 py-8 text-slate-500" colSpan={7}>
                                        Loading audit logs...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="xl:hidden divide-y divide-slate-100">
                    {logs.map((log) => (
                        <div key={log.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs text-slate-500">Audit Log #</p>
                                    <p className="text-xs font-medium text-slate-900 break-all">{log.logNumber}</p>
                                    <p className="font-medium text-slate-900">{log.actorName}</p>
                                    <p className="text-xs text-slate-500">{log.actorEmail}</p>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    <p className="text-xs text-slate-500">Action</p>
                                    <Badge variant={getActionVariant(log.action)}>{log.action}</Badge>
                                    <p className="text-xs text-slate-500 mt-1">Status</p>
                                    <Badge variant={getStatusVariant(log.status)}>{log.status}</Badge>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-slate-500">Module</p>
                                <p className="text-sm font-medium text-slate-900">{log.module}</p>
                                <p className="text-xs text-slate-500">{log.target}</p>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-medium text-slate-500">What changed</p>
                                <button
                                    type="button"
                                    onClick={() => openChangesModal(log)}
                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                                >
                                    View Changes
                                </button>
                            </div>

                            <p className="text-xs text-slate-500">{formatTimestamp(log.timestamp)}</p>
                        </div>
                    ))}

                    {logs.length === 0 && !isLoading && (
                        <div className="p-8 text-center text-slate-500">
                            {hasActiveFilters ? 'No logs match your filters.' : 'No audit logs available yet.'}
                        </div>
                    )}

                    {isLoading && (
                        <div className="p-8 text-center text-slate-500">Loading audit logs...</div>
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
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {selectedLogForChanges && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        aria-label="Close changes modal backdrop"
                        onClick={closeChangesModal}
                        className="absolute inset-0 bg-slate-900/45"
                    />
                    <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl">
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Changes</h2>
                                <p className="text-sm text-slate-500">
                                    {selectedLogForChanges.logNumber} · {selectedLogForChanges.module} · {selectedLogForChanges.target}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeChangesModal}
                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
                                aria-label="Close changes modal"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-3">
                            {selectedLogForChanges.changes.length > 0 ? (
                                selectedLogForChanges.changes.map((change) => (
                                    <div key={`${selectedLogForChanges.id}-modal-${change.field}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-sm font-semibold text-slate-800 mb-1">{change.field}</p>
                                        <p className="text-sm text-slate-600">
                                            <span className="font-medium text-slate-500">Before:</span> {renderChangeValue(change.before)}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            <span className="font-medium text-slate-500">After:</span> {renderChangeValue(change.after)}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500">No field-level changes recorded.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}