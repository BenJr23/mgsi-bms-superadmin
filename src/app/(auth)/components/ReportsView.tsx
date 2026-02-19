import React from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Download, TrendingUp, DollarSign, Clock } from 'lucide-react';
export function ReportsView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500">Analytics and system usage insights.</p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Bookings</p>
              <h3 className="text-2xl font-bold text-slate-900">1,248</h3>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 w-[75%]"></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">+12% from last month</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Revenue (Est.)</p>
              <h3 className="text-2xl font-bold text-slate-900">$42,500</h3>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[60%]"></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">+5% from last month</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg. Duration</p>
              <h3 className="text-2xl font-bold text-slate-900">2.5 hrs</h3>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 w-[45%]"></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">-2% from last month</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-slate-900 mb-6">
            Booking Volume by Month
          </h3>
          <div className="h-64 flex items-end justify-between gap-2 px-2">
            {[35, 45, 30, 60, 75, 50, 65, 80, 70, 55, 90, 85].map((h, i) =>
            <div
              key={i}
              className="w-full bg-indigo-100 rounded-t-sm relative group hover:bg-indigo-200 transition-colors"
              style={{
                height: `${h}%`
              }}>

                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {h * 10}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between mt-4 text-xs text-slate-400 uppercase">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 mb-6">
            Room Usage Distribution
          </h3>
          <div className="space-y-4">
            {[
            {
              label: 'Conference Room A',
              val: 85,
              color: 'bg-indigo-500'
            },
            {
              label: 'Auditorium',
              val: 45,
              color: 'bg-blue-500'
            },
            {
              label: 'Huddle Room 1',
              val: 72,
              color: 'bg-emerald-500'
            },
            {
              label: 'Training Lab',
              val: 30,
              color: 'bg-amber-500'
            },
            {
              label: 'Executive Suite',
              val: 60,
              color: 'bg-purple-500'
            }].
            map((item, i) =>
            <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{item.label}</span>
                  <span className="font-medium text-slate-900">
                    {item.val}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                  className={`h-full ${item.color}`}
                  style={{
                    width: `${item.val}%`
                  }}>
                </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>);

}