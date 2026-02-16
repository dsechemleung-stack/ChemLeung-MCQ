/**
 * Simple Time Travel Button - Easy access to time travel controls
 */

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, RotateCcw } from 'lucide-react';

export default function TimeTravelButton() {
  const [currentDate, setCurrentDate] = useState(() => {
    // Try to get saved date from localStorage, otherwise use today
    const saved = localStorage.getItem('timeTravelDate');
    return saved || new Date().toISOString().split('T')[0];
  });
  const [isOpen, setIsOpen] = useState(false);

  // Apply time travel on component mount if there's a saved date
  useEffect(() => {
    const savedDate = localStorage.getItem('timeTravelDate');
    if (savedDate) {
      const targetDate = new Date(savedDate);
      
      // Override Date.now()
      const originalNow = Date.now;
      Date.now = () => targetDate.getTime();
      
      // Override new Date()
      const OriginalDate = window.Date;
      window.Date = function(...args) {
        if (args.length === 0) {
          return new OriginalDate(targetDate);
        }
        return new OriginalDate(...args);
      };
      
      // Copy static methods
      Object.setPrototypeOf(window.Date, OriginalDate);
      Object.getOwnPropertyNames(OriginalDate).forEach(name => {
        if (typeof OriginalDate[name] === 'function') {
          window.Date[name] = OriginalDate[name];
        }
      });
      
      console.log(`⏰ Restored time travel to: ${savedDate}`);
    }
  }, []);

  const travelTo = (dateString) => {
    console.log(`⏰ Time traveling to: ${dateString}`);
    
    const targetDate = new Date(dateString);
    
    // Save to localStorage so it persists after reload
    localStorage.setItem('timeTravelDate', dateString);
    
    // Override Date.now()
    const originalNow = Date.now;
    Date.now = () => targetDate.getTime();
    
    // Override new Date()
    const OriginalDate = window.Date;
    window.Date = function(...args) {
      if (args.length === 0) {
        return new OriginalDate(targetDate);
      }
      return new OriginalDate(...args);
    };
    
    // Copy static methods
    Object.setPrototypeOf(window.Date, OriginalDate);
    Object.getOwnPropertyNames(OriginalDate).forEach(name => {
      if (typeof OriginalDate[name] === 'function') {
        window.Date[name] = OriginalDate[name];
      }
    });
    
    setCurrentDate(dateString);
    console.log(`✅ Traveled to ${dateString} - Reload page to see UI changes`);
    
    // Auto-reload after a short delay
    setTimeout(() => {
      if (confirm('Reload page to see UI changes?')) {
        location.reload();
      }
    }, 500);
  };

  const addDays = (days) => {
    // Parse the current date properly
    const [year, month, day] = currentDate.split('-').map(Number);
    const current = new Date(year, month - 1, day); // month is 0-indexed
    current.setDate(current.getDate() + days);
    const newDateStr = current.toISOString().split('T')[0];
    console.log(`Adding ${days} days: ${currentDate} → ${newDateStr}`);
    travelTo(newDateStr);
  };

  const resetTime = () => {
    localStorage.removeItem('timeTravelDate');
    location.reload();
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all"
        title="Time Travel Controls"
      >
        <Clock size={20} />
      </button>

      {/* Time Travel Panel */}
      {isOpen && (
        <div className="absolute top-16 right-0 bg-white rounded-lg shadow-xl border-2 border-slate-200 p-4 w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={16} />
              Time Travel
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          {/* Current Date Display */}
          <div className="mb-4 p-2 bg-slate-100 rounded">
            <div className="text-xs text-slate-600">Current Date:</div>
            <div className="font-bold text-slate-800">{currentDate}</div>
          </div>

          {/* Quick Date Buttons */}
          <div className="space-y-2 mb-4">
            <div className="text-xs font-bold text-slate-600 uppercase">Quick Travel:</div>
            
            <button
              onClick={() => travelTo('2026-02-15')}
              className="w-full text-left px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
            >
              📅 15/2 (Should see 80 archived)
            </button>
            
            <button
              onClick={() => travelTo('2026-02-16')}
              className="w-full text-left px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded text-sm"
            >
              📅 16/2 (Should see 60 overdue)
            </button>
            
            <button
              onClick={() => travelTo('2026-02-17')}
              className="w-full text-left px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded text-sm"
            >
              📅 17/2 (Should see 60 overdue)
            </button>
            
            <button
              onClick={() => travelTo('2026-02-24')}
              className="w-full text-left px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-sm"
            >
              📅 24/2 (Should see 80 archived)
            </button>
          </div>

          {/* Day by Day Controls */}
          <div className="space-y-2 mb-4">
            <div className="text-xs font-bold text-slate-600 uppercase">Day by Day:</div>
            
            <div className="flex gap-2">
              <button
                onClick={() => addDays(-1)}
                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm"
              >
                ← -1 Day
              </button>
              
              <button
                onClick={() => addDays(1)}
                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-sm"
              >
                +1 Day →
              </button>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={resetTime}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm"
          >
            <RotateCcw size={14} />
            Reset Time
          </button>

          {/* Instructions */}
          <div className="mt-4 text-xs text-slate-500 border-t pt-2">
            <strong>Testing Guide:</strong><br/>
            • 15/2: 80 archived, 0 overdue<br/>
            • 16/2: 0 archived, 60 overdue<br/>
            • 17/2: 0 archived, 60 overdue<br/>
            • 24/2: 80 archived, 0 overdue
          </div>
        </div>
      )}
    </div>
  );
}
