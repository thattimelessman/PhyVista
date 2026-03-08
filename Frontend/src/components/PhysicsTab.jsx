import React from 'react';

export default function PhysicsTab({ theme, normalForce, maxFriction, centripetalReq, position, heading, turnRadius }) {
  const terminalClass = `p-3 ${theme === 'vista' ? 'bg-black text-green-400 rounded border-2 border-gray-500' : 'bg-black text-green-400 border-2 border-black'}`;
  return (
    <div className={`${theme === 'vista' ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-50 to-white p-6 shadow-inner' : 'bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`}>
      <h2 className={`text-lg font-bold mb-4 uppercase tracking-wide ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>Physics Engine Status (Backend)</h2>
      <div className="grid grid-cols-2 gap-4 text-sm font-mono">
        <div className={terminalClass}>
          <div className="font-bold mb-2">FORCES</div>
          <div>Normal: {normalForce.toFixed(1)} N</div>
          <div>Max Friction: {maxFriction.toFixed(1)} N</div>
          <div>Centripetal Req: {centripetalReq.toFixed(1)} N</div>
        </div>
        <div className={terminalClass}>
          <div className="font-bold mb-2">DYNAMICS</div>
          <div>Position: ({position.x.toFixed(1)}, {position.y.toFixed(1)})</div>
          <div>Heading: {((heading * 180) / Math.PI).toFixed(1)}°</div>
          <div>Turn Radius: {turnRadius > 10000 ? '∞' : turnRadius.toFixed(1) + ' m'}</div>
        </div>
      </div>
    </div>
  );
}