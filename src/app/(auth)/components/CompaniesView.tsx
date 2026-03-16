'use client'

import React, { useState, useEffect } from 'react'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Building2, AlertTriangle, Zap, Plus, Trash2 } from 'lucide-react'
import { getCompanies, getCompanyUtilizationReport } from '@/app/_actions/companies'
import type { CompanyStats } from '@/app/_actions/companies'
import { AddCompanyModal } from './Modals/AddCompanyModal'
import { EditCompanyModal } from './Modals/EditCompanyModal'
import { DeleteCompanyModal } from './Modals/DeleteCompanyModal'

export function CompaniesView() {
  const [companies, setCompanies] = useState<CompanyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<any>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyStats | null>(null)

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

  const openEditModal = (company: CompanyStats) => {
    setSelectedCompany(company)
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setSelectedCompany(null)
    setIsEditModalOpen(false)
  }

  const openDeleteModal = (company: CompanyStats) => {
    setSelectedCompany(company)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setSelectedCompany(null)
    setIsDeleteModalOpen(false)
  }

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

      {/* Companies Table */}
      {companies.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600">No companies found</p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Company</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Representative</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Credit Usage</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Utilization</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Bookings</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 text-right sticky right-0 bg-slate-50 z-10 shadow-[-1px_0_0_0_#e2e8f0]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((company) => {
                  const isOverLimit = company.utilizationPercentage >= 100
                  const isNearLimit = company.utilizationPercentage >= 80 && company.utilizationPercentage < 100

                  return (
                    <tr key={company.id} className="group hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{company.name}</p>
                            <p className="text-xs text-slate-500">ID: {company.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {company.representative ? (
                          <div>
                            <p className="text-sm font-medium text-slate-900">{company.representative.name}</p>
                            <p className="text-xs text-slate-500">{company.representative.email}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">Not assigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-900">
                          {company.usedCreditHours.toFixed(1)} / {company.allottedCreditHours.toFixed(1)} hrs
                        </p>
                        <p className="text-xs text-slate-500">Remaining: {company.remainingCreditHours.toFixed(1)} hrs</p>
                      </td>

                      <td className="px-4 py-3 w-[220px]">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">{company.utilizationPercentage}%</span>
                            <span className="text-slate-700 font-medium">{Math.min(company.utilizationPercentage, 100)}%</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isOverLimit ? 'bg-red-600' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${Math.min(company.utilizationPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-700 space-y-1">
                          <p>Total: <span className="font-semibold text-slate-900">{company.totalBookingsCount}</span></p>
                          <p>Approved: <span className="font-semibold text-emerald-700">{company.approvedBookingsCount}</span></p>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {isOverLimit ? (
                          <Badge variant="danger" className="text-xs">Over Limit</Badge>
                        ) : isNearLimit ? (
                          <Badge variant="warning" className="text-xs">Near Limit</Badge>
                        ) : (
                          <Badge className="text-xs">Healthy</Badge>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-slate-50/70 transition-colors z-10 shadow-[-1px_0_0_0_#e2e8f0]">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditModal(company)}
                            className="text-xs"
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => openDeleteModal(company)}
                            className="text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchData}
      />
      <EditCompanyModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSuccess={fetchData}
        company={selectedCompany ? {
          id: selectedCompany.id,
          name: selectedCompany.name,
          allottedCreditHours: selectedCompany.allottedCreditHours,
          representativeUserId: selectedCompany.representative?.id ?? null,
        } : null}
      />
      <DeleteCompanyModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onSuccess={fetchData}
        companyId={selectedCompany?.id}
        companyName={selectedCompany?.name}
      />
    </div>
  )
}