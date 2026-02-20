import React from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon } from
'lucide-react';
export function CalendarView() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dates = Array.from(
    {
      length: 35
    },
    (_, i) => i + 1
  ); // Simplified calendar grid
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="text-slate-500">
            View booking schedules and availability.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm w-full sm:w-auto">
            <button className="p-2 hover:bg-slate-50 text-slate-600 border-r border-slate-200">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-900 whitespace-nowrap">
              October 2023
            </span>
            <button className="p-2 hover:bg-slate-50 text-slate-600 border-l border-slate-200">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" className="hidden sm:flex flex-1 sm:flex-none">
            Today
          </Button>
          <Button className="flex-1 sm:flex-none">+ Book</Button>
        </div>
      </div>

      <Card noPadding className="flex flex-col overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {days.map((day) =>
          <div
            key={day}
            className="py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-slate-500 border-r border-slate-100 last:border-r-0">

              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 grid-rows-5 flex-1 min-h-[400px] sm:min-h-[500px] lg:min-h-[600px]">
          {dates.map((date, i) => {
            const isToday = date === 24;
            const hasEvent = [2, 5, 12, 15, 24, 28].includes(date);
            return (
              <div
                key={i}
                className={`border-b border-r border-slate-100 p-1 sm:p-2 relative hover:bg-slate-50 transition-colors ${i % 7 === 6 ? 'border-r-0' : ''}`}>

                <span
                  className={`text-xs sm:text-sm font-medium ${isToday ? 'bg-indigo-600 text-white w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full mx-auto sm:mx-0' : 'text-slate-700'}`}>

                  {date <= 31 ? date : ''}
                </span>

                {date <= 31 && hasEvent &&
                <div className="mt-1 sm:mt-2 space-y-0.5 sm:space-y-1">
                    <div className="text-[10px] sm:text-xs p-0.5 sm:p-1 rounded bg-indigo-100 text-indigo-700 truncate border-l-2 border-indigo-500 cursor-pointer hover:opacity-80">
                      <span className="hidden sm:inline">9:00 AM - Team Sync</span>
                      <span className="sm:hidden">9:00 AM</span>
                    </div>
                    {date === 24 &&
                  <div className="text-[10px] sm:text-xs p-0.5 sm:p-1 rounded bg-emerald-100 text-emerald-700 truncate border-l-2 border-emerald-500 cursor-pointer hover:opacity-80">
                        <span className="hidden sm:inline">2:00 PM - Client Meeting</span>
                        <span className="sm:hidden">2:00 PM</span>
                      </div>
                  }
                  </div>
                }
              </div>);

          })}
        </div>
      </Card>
    </div>);

}