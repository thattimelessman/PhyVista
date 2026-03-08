import React from 'react';
import { Play, Pause, RotateCcw, ChevronRight, Settings } from 'lucide-react';

export default function ControlPanel({
  theme, isRunning, setIsRunning, resetSimulation,
  time, steeringAngle, heading, angularVelocity, position,
  targetAngle, setTargetAngle, velocity, setVelocity, updateBackendParam,
  gravity, setGravityPreset, EARTH_GRAVITY, MARS_GRAVITY, MOON_GRAVITY,
  frictionCoeff, setFrictionCoeff, mass, setMass,
  kp, ki, kd, setKp, setKi, setKd,
  showSettings, setShowSettings,
}) {
  const cardClass = theme === 'vista'
    ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-50 to-white p-4 shadow-inner'
    : 'bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]';

  const btnClass = theme === 'vista'
    ? 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 border-2 border-gray-500 rounded text-gray-800 shadow-md active:shadow-inner'
    : 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] hover:bg-gray-100';

  const sliderClass = `w-full h-2 appearance-none cursor-pointer ${theme === 'vista' ? 'bg-gray-300 border border-gray-500 rounded' : 'bg-[#dddddd] border-2 border-black'}`;
  const labelClass = `text-xs font-bold block mb-1 ${theme === 'vista' ? 'text-gray-700' : 'text-black'}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Simulation Control */}
      <div className={cardClass}>
        <div className={`flex items-center gap-2 mb-4 pb-2 ${theme === 'vista' ? 'border-b-2 border-gray-300' : 'border-b-2 border-black'}`}>
          <ChevronRight size={16} className={theme === 'vista' ? 'text-gray-600' : 'text-black'} />
          <h2 className={`text-sm font-bold uppercase tracking-wide ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>Simulation Control</h2>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setIsRunning(!isRunning)} className={`flex-1 px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 ${btnClass}`}>
            {isRunning ? <><Pause size={14} /> PAUSE</> : <><Play size={14} /> START</>}
          </button>
          <button onClick={resetSimulation} className={`px-3 py-2 text-xs font-bold flex items-center gap-2 ${btnClass}`}>
            <RotateCcw size={14} /> RESET
          </button>
        </div>
        <div className={`space-y-2 text-xs font-mono p-3 ${theme === 'vista' ? 'bg-black text-green-400 rounded border-2 border-gray-500' : 'bg-black text-green-400 border-2 border-black'}`}>
          <div className="flex justify-between"><span>TIME:</span><span>{time.toFixed(2)}s</span></div>
          <div className="flex justify-between"><span>STEER:</span><span>{steeringAngle.toFixed(1)}°</span></div>
          <div className="flex justify-between"><span>HEAD:</span><span>{((heading * 180) / Math.PI).toFixed(1)}°</span></div>
          <div className="flex justify-between"><span>ANG.V:</span><span>{(angularVelocity * 180 / Math.PI).toFixed(2)}°/s</span></div>
          <div className={`flex justify-between pt-1 mt-1 border-t border-green-600`}><span>POS.X:</span><span>{position.x.toFixed(1)}m</span></div>
          <div className="flex justify-between"><span>POS.Y:</span><span>{position.y.toFixed(1)}m</span></div>
        </div>
      </div>

      {/* Environment */}
      <div className={cardClass}>
        <div className={`flex items-center gap-2 mb-4 pb-2 ${theme === 'vista' ? 'border-b-2 border-gray-300' : 'border-b-2 border-black'}`}>
          <ChevronRight size={16} className={theme === 'vista' ? 'text-gray-600' : 'text-black'} />
          <h2 className={`text-sm font-bold uppercase tracking-wide ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>Environment</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[['earth', 'EARTH', EARTH_GRAVITY], ['mars', 'MARS', MARS_GRAVITY], ['moon', 'MOON', MOON_GRAVITY]].map(([key, label, g]) => (
            <button key={key} onClick={() => setGravityPreset(key)} className={`px-2 py-3 text-xs font-bold ${
              theme === 'vista'
                ? `rounded border-2 shadow-md active:shadow-inner ${gravity === g ? 'bg-gradient-to-b from-blue-200 to-blue-300 border-blue-500 text-blue-900' : 'bg-gradient-to-b from-gray-200 to-gray-300 border-gray-500 text-gray-800 hover:from-gray-300 hover:to-gray-400'}`
                : `border-2 border-black ${gravity === g ? 'bg-black text-white' : 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100'}`
            }`}>
              {label}<br /><span className="text-[10px] font-normal">{g}m/s²</span>
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>TARGET STEERING: {targetAngle}°</label>
            <input type="range" min="-45" max="45" value={targetAngle} onChange={(e) => setTargetAngle(parseFloat(e.target.value))} className={sliderClass} />
          </div>
          <div>
            <label className={labelClass}>VELOCITY: {velocity} m/s</label>
            <input type="range" min="5" max="30" value={velocity} onChange={(e) => { const val = parseFloat(e.target.value); setVelocity(val); updateBackendParam({ initial_velocity: val }); }} className={sliderClass} />
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div className={cardClass}>
        <div className={`flex items-center gap-2 mb-4 pb-2 ${theme === 'vista' ? 'border-b-2 border-gray-300' : 'border-b-2 border-black'}`}>
          <Settings size={16} className={theme === 'vista' ? 'text-gray-600' : 'text-black'} />
          <h2 className={`text-sm font-bold uppercase tracking-wide ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>Parameters</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>FRICTION μ: {frictionCoeff.toFixed(2)}</label>
            <input type="range" min="0.1" max="1.5" step="0.05" value={frictionCoeff} onChange={(e) => { const val = parseFloat(e.target.value); setFrictionCoeff(val); updateBackendParam({ friction_coefficient: val }); }} className={sliderClass} />
          </div>
          <div>
            <label className={labelClass}>MASS: {mass} kg</label>
            <input type="range" min="100" max="2000" step="50" value={mass} onChange={(e) => { const val = parseFloat(e.target.value); setMass(val); updateBackendParam({ mass: val }); }} className={sliderClass} />
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className={`w-full px-3 py-2 text-xs font-bold ${btnClass}`}>
            {showSettings ? 'HIDE' : 'SHOW'} PID TUNING
          </button>
          {showSettings && (
            <div className={`space-y-2 mt-2 pt-2 ${theme === 'vista' ? 'border-t-2 border-gray-300' : 'border-t-2 border-black'}`}>
              {[['Kp', kp, setKp, 0, 2, 0.1], ['Ki', ki, setKi, 0, 1, 0.05], ['Kd', kd, setKd, 0, 1, 0.05]].map(([name, val, setter, min, max, step]) => (
                <div key={name}>
                  <label className={labelClass}>{name}: {val.toFixed(2)}</label>
                  <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setter(v);
                    updateBackendParam({ pid_gains: { kp: name === 'Kp' ? v : kp, ki: name === 'Ki' ? v : ki, kd: name === 'Kd' ? v : kd } });
                  }} className={sliderClass} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}