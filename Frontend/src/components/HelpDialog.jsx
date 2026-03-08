import React from 'react';
import { X } from 'lucide-react';

export default function HelpDialog({ theme, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`max-w-3xl w-full max-h-[90vh] overflow-y-auto ${theme === 'vista' ? 'bg-white border-2 border-gray-500 rounded-lg shadow-2xl' : 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`} onClick={(e) => e.stopPropagation()}>
        <div className={`px-4 py-3 flex justify-between items-center ${theme === 'vista' ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700' : 'bg-white border-b-2 border-black'}`}>
          <h2 className={`font-semibold text-sm ${theme === 'vista' ? 'text-white' : 'text-black'}`}>Help - PhyVista v2.0</h2>
          <button onClick={onClose} className={`${theme === 'vista' ? 'text-white hover:text-red-400' : 'text-black hover:text-gray-600'}`}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-bold text-lg mb-2 text-gray-800">What is This Simulator?</h3>
            <p className="text-sm text-gray-700 leading-relaxed">A physics-based simulation tool for aerospace engineers modeling steering dynamics of wheeled vehicles in reduced gravity environments like the Moon (1.62 m/s²) and Mars (3.71 m/s²).</p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2 text-gray-800">How It Works</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p><strong>Physics Model:</strong> Calculations handled by a Python backend using NumPy for high-precision dynamics.</p>
              <p><strong>PID Controller:</strong> Automatically adjusts steering to track the target angle. Tune Kp, Ki, and Kd for optimal response.</p>
              <p><strong>Friction Limit:</strong> When friction utilization exceeds 100%, wheels slip and the vehicle loses directional control.</p>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2 text-gray-800">Quick Start Guide</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
              <li>Select your gravity environment (Earth/Mars/Moon)</li>
              <li>Set target steering angle and vehicle velocity</li>
              <li>Adjust mass and friction coefficient</li>
              <li>Click START to run the simulation</li>
              <li>Monitor real-time telemetry in the control panel</li>
              <li>Switch to Analysis tab to view performance graphs</li>
            </ol>
          </div>
        </div>
        <div className={`px-4 py-3 flex justify-end ${theme === 'vista' ? 'bg-gradient-to-b from-gray-200 to-gray-300 border-t-2 border-gray-400' : 'bg-white border-t-2 border-black'}`}>
          <button onClick={onClose} className={`px-4 py-2 text-xs font-bold ${theme === 'vista' ? 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 border-2 border-gray-500 rounded text-gray-800 shadow-md' : 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100'}`}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}