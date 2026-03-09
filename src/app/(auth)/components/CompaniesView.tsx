'use client'

import React, { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Building2, AlertTriangle, Zap, Plus } from 'lucide-react'
import { getCompanies, getCompanyUtilizationReport } from '@/app/_actions/companies'
import type { CompanyStats } from '@/app/_actions/companies'
import { AddCompanyModal } from './Modals/AddCompanyModal'

export function CompaniesView() {
  const [companies, setCompanies] = useState<CompanyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<any>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [companiesRes, reportRes] = await Promise.all([
        getCompanies(),
        getCompanyUtilizationReport(),
      ])

      if (companiesRes.success && companiesRes.data) {
        setCompanies(companiesRes.data)
      } else {
        setError(companiesRes.error || 'Failed to fetch companies')
      }

      if (reportRes.success && reportRes.data) {
        setReport(reportRes.data)
      }
    } catch (err) {
      setError('Error fetching companies data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
        </div>
        <Card>
          <div className="text-center py-12">
            <p className="text-slate-600">Loading companies...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
        </div>
        <Card>
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500 mt-0.5">{companies.length} active companies</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Company
        </Button>
      </div>

      {/* Summary Stats - Compact */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <div className="p-3">
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Total Companies</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{report.totalCompanies}</p>
            </div>
          </Card>

          <Card>
            <div className="p-3">
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Allotted Hours</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{report.totalAllottedHours.toFixed(0)}</p>
            </div>
          </Card>

          <Card>
            <div className="p-3">
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Used Hours</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{report.totalUsedHours.toFixed(0)}</p>
            </div>
          </Card>

          <Card>
            <div className="p-3">
              <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">Avg Utilization</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{report.averageUtilization}%</p>
            </div>
          </Card>
        </div>
      )}

      {/* Alerts - Compact */}
      {(report?.companiesOverLimit.length > 0 || report?.companiesNearLimit.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {report?.companiesOverLimit.length > 0 && (
            <Card>
              <div className="flex items-center gap-3 p-3 bg-red-50 border-l-4 border-red-600">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-red-900">Over Limit</p>
                  <p className="text-xs text-red-700">{report.companiesOverLimit.length} company/companies</p>
                </div>
              </div>
            </Card>
          )}

          {report?.companiesNearLimit.length > 0 && (
            <Card>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border-l-4 border-yellow-600">
                <Zap className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-yellow-900">Near Limit</p>
                  <p className="text-xs text-yellow-700">{report.companiesNearLimit.length} company/companies</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Companies Grid */}
      {companies.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600">No companies found</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {companies.map((company) => {
            const isOverLimit = company.utilizationPercentage >= 100
            const isNearLimit = company.utilizationPercentage >= 80 && company.utilizationPercentage < 100
            const borderColor = isOverLimit ? 'border-red-200' : isNearLimit ? 'border-yellow-200' : 'border-slate-200'
            const bgColor = isOverLimit ? 'bg-red-50' : isNearLimit ? 'bg-yellow-50' : 'bg-white'

            return (
              <Card key={company.id}>
                <div className={`p-4 border-l-4 ${borderColor} ${bgColor} rounded-lg`}
                  style={{
                    borderLeftColor: isOverLimit ? '#dc2626' : isNearLimit ? '#eab308' : '#cbd5e1'
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">{company.name}</h3>
                        {isOverLimit && <Badge variant="error" className="text-xs flex-shrink-0">Over</Badge>}
                        {isNearLimit && <Badge variant="warning" className="text-xs flex-shrink-0">Near</Badge>}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        {company.usedCreditHours.toFixed(1)} / {company.allottedCreditHours.toFixed(1)} hrs
                      </span>
                      <span className="font-semibold text-slate-900">{company.utilizationPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isOverLimit ? 'bg-red-600' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(company.utilizationPercentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200">
                    <span>{company.totalBookingsCount} bookings</span>
                    <span className="text-green-700">✓ {company.approvedBookingsCount}</span>
                    <span className="text-yellow-700">◐ {company.pendingBookingsCount}</span>
                    <span className="text-red-700">✕ {company.rejectedBookingsCount}</span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  )
}