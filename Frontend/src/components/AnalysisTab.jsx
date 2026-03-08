import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalysisTab({ theme, historyData, isRunning, gravity, EARTH_GRAVITY, MARS_GRAVITY }) {
  const cardClass = `${theme === 'vista' ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-50 to-white p-4 shadow-inner' : 'bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`;
  const titleClass = `text-sm font-bold uppercase tracking-wide mb-3 ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`;
  const chartProps = { strokeDasharray: "3 3", stroke: "#999" };
  const axisProps = { stroke: "#000", style: { fontSize: '11px' } };
  const tooltipProps = { contentStyle: { backgroundColor: '#f5f5f5', border: '2px solid #666', fontSize: '11px' } };
  const legendProps = { wrapperStyle: { fontSize: '11px' } };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={cardClass}>
          <h3 className={titleClass}>Steering Response</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historyData}>
              <CartesianGrid {...chartProps} />
              <XAxis dataKey="time" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Legend {...legendProps} />
              <Line isAnimationActive={false} type="monotone" dataKey="steeringAngle" stroke="#000" name="Actual" dot={false} strokeWidth={2} />
              <Line isAnimationActive={false} type="monotone" dataKey="targetAngle" stroke="#666" name="Target" dot={false} strokeDasharray="5 5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={cardClass}>
          <h3 className={titleClass}>Friction & Control</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historyData}>
              <CartesianGrid {...chartProps} />
              <XAxis dataKey="time" {...axisProps} />
              <YAxis {...axisProps} domain={[0, 150]} />
              <Tooltip {...tooltipProps} />
              <Legend {...legendProps} />
              <Line isAnimationActive={false} type="monotone" dataKey="frictionUtilization" stroke="#ff6b35" name="Friction %" dot={false} strokeWidth={2} />
              <Line isAnimationActive={false} type="monotone" dataKey="canTurn" stroke="#000" name="Slip Alert" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={cardClass}>
          <h3 className={titleClass}>Angular Velocity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historyData}>
              <CartesianGrid {...chartProps} />
              <XAxis dataKey="time" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Legend {...legendProps} />
              <Line isAnimationActive={false} type="monotone" dataKey="angularVelocity" stroke="#2563eb" name="ω (°/s)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={cardClass}>
          <h3 className={titleClass}>PID Error</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historyData}>
              <CartesianGrid {...chartProps} />
              <XAxis dataKey="time" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip {...tooltipProps} />
              <Legend {...legendProps} />
              <Line isAnimationActive={false} type="monotone" dataKey="pidError" stroke="#dc2626" name="Error (°)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`${theme === 'vista' ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-200 to-gray-300 p-2' : 'bg-[#dddddd] border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]'}`}>
        <div className={`text-xs font-bold flex items-center gap-4 ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>
          <span>STATUS: {isRunning ? 'RUNNING' : 'STOPPED'}</span>
          <span>|</span>
          <span>SAMPLES: {historyData.length}</span>
          <span>|</span>
          <span>GRAVITY: {gravity.toFixed(2)} m/s²</span>
          <span>|</span>
          <span>ENV: {gravity === EARTH_GRAVITY ? 'EARTH' : gravity === MARS_GRAVITY ? 'MARS' : 'MOON'}</span>
        </div>
      </div>
    </div>
  );
}