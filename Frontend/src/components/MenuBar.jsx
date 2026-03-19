import React from 'react';
import { X } from 'lucide-react';

const SCENARIOS = [
  {
    num: '01', title: 'Lunar Rover — Gentle Curve',
    env: 'Moon', gravity: '1.62 m/s²', mass: '500 kg', velocity: '8 m/s',
    friction: 'μ = 0.7', target: '15°', kp: '0.5', ki: '0.1', kd: '0.2', profile: 'Balanced',
    outcome: 'PASS',
    desc: 'Baseline validation for low-gravity operation. Steering converges to 15° within 3–5s. Friction utilization below 60%. No wheel slip. Turn radius approximately 27m.',
    note: 'Run first after any physics engine change to verify no regression.'
  },
  {
    num: '02', title: 'Martian Rover — High-Speed Turn',
    env: 'Mars', gravity: '3.71 m/s²', mass: '600 kg', velocity: '25 m/s',
    friction: 'μ = 0.6', target: '30°', kp: '0.5', ki: '0.1', kd: '0.2', profile: 'Balanced',
    outcome: 'FAIL',
    desc: 'High velocity drives centripetal force above available friction. Friction utilization exceeds 100%. Slip alert triggers. Vehicle loses directional control.',
    note: 'Reduce velocity below 15 m/s or increase friction to 0.9+ to achieve control.'
  },
  {
    num: '03', title: 'Earth Vehicle — Aggressive PID',
    env: 'Earth', gravity: '9.81 m/s²', mass: '800 kg', velocity: '15 m/s',
    friction: 'μ = 0.8', target: '20°', kp: '1.5', ki: '0.3', kd: '0.5', profile: 'Aggressive',
    outcome: 'WARN',
    desc: 'High Kp causes 5–10° overshoot and 2–3s of oscillation before settling. Classic underdamped PID response. Friction stays below 100%.',
    note: 'Compare PID error chart with Scenario 05 to visualize gain-stability tradeoff.'
  },
  {
    num: '04', title: 'Lunar Rover — Slip Boundary',
    env: 'Moon', gravity: '1.62 m/s²', mass: '400 kg', velocity: '10 m/s',
    friction: 'μ = 0.5', target: '35°', kp: '0.5', ki: '0.1', kd: '0.2', profile: 'Balanced',
    outcome: 'WARN',
    desc: 'Low gravity and reduced friction place the vehicle at the exact slip boundary. Friction utilization oscillates 95–110%. Intermittent slip alerts.',
    note: 'Reduce target to 25° or increase friction to 0.7 for full control.'
  },
  {
    num: '05', title: 'Earth Vehicle — Smooth PID',
    env: 'Earth', gravity: '9.81 m/s²', mass: '800 kg', velocity: '15 m/s',
    friction: 'μ = 0.8', target: '20°', kp: '0.2', ki: '0.05', kd: '0.1', profile: 'Smooth',
    outcome: 'PASS',
    desc: 'Low gains produce slow monotonic convergence over 8–12s with no overshoot. Friction utilization below 40%. Demonstrates speed-stability tradeoff.',
    note: 'Pair with Scenario 03 — same vehicle, same target, different PID profile.'
  },
  {
    num: '06', title: 'Mars Rover — Heavy Payload',
    env: 'Mars', gravity: '3.71 m/s²', mass: '1800 kg', velocity: '10 m/s',
    friction: 'μ = 0.75', target: '20°', kp: '0.5', ki: '0.1', kd: '0.2', profile: 'Balanced',
    outcome: 'PASS',
    desc: 'A 1800 kg fully-loaded rover. High mass increases normal force (6678 N) and inertia. Converges within 5–7s. Angular velocity reduced. No wheel slip.',
    note: 'Compare angular velocity chart with Scenario 09 to observe inertia effect.'
  },
  {
    num: '07', title: 'Lunar Rover — High Velocity',
    env: 'Moon', gravity: '1.62 m/s²', mass: '500 kg', velocity: '20 m/s',
    friction: 'μ = 0.7', target: '15°', kp: '0.5', ki: '0.1', kd: '0.2', profile: 'Balanced',
    outcome: 'FAIL',
    desc: 'Identical to Scenario 01 but velocity increased to 20 m/s. Centripetal force ~6x higher. Slip triggers despite identical angle and PID.',
    note: 'Safe velocity for this lunar configuration is approximately 10–12 m/s.'
  },
  {
    num: '08', title: 'Earth Vehicle — Icy Surface',
    env: 'Earth', gravity: '9.81 m/s²', mass: '700 kg', velocity: '12 m/s',
    friction: 'μ = 0.2', target: '25°', kp: '0.5', ki: '0.1', kd: '0.2', profile: 'Balanced',
    outcome: 'FAIL',
    desc: 'Friction coefficient of 0.2 simulates icy road. Max friction = 1373 N. Centripetal demand exceeds limit despite Earth gravity. Slip triggers.',
    note: 'Gravity alone does not guarantee control — surface friction is equally critical.'
  },
  {
    num: '09', title: 'Mars Rover — Balanced Reference',
    env: 'Mars', gravity: '3.71 m/s²', mass: '600 kg', velocity: '12 m/s',
    friction: 'μ = 0.75', target: '20°', kp: '0.5', ki: '0.1', kd: '0.2', profile: 'Balanced',
    outcome: 'PASS',
    desc: 'Standard Martian rover reference. Converges within 4–6s. Friction utilization 55–70%. All four analysis charts show clean smooth curves.',
    note: 'Mars equivalent of Scenario 01. Validate against this after any backend changes.'
  },
  {
    num: '10', title: 'Multi-Environment Comparison',
    env: 'All', gravity: '9.81 / 3.71 / 1.62', mass: '500 kg', velocity: '10 m/s',
    friction: 'μ = 0.7', target: '20°', kp: '0.5', ki: '0.1', kd: '0.2', profile: 'Balanced',
    outcome: 'PASS',
    desc: 'Identical vehicle across Earth, Mars, Moon. Friction utilization: ~30% / ~55% / ~90%. All controlled. Isolates gravity as single variable.',
    note: 'Export CSV after each run for offline cross-environment analysis.'
  },
];

function ScenarioCard({ s, theme }) {
  const isVista = theme === 'vista';

  const outcomeBadgeVista = {
    PASS: 'bg-green-600 text-white',
    WARN: 'bg-yellow-500 text-white',
    FAIL: 'bg-red-600 text-white',
  }[s.outcome];

  const outcomeBadgeMac = 'bg-black text-white border border-white';

  if (isVista) {
    return (
      <div className="border border-gray-300 rounded-lg bg-gradient-to-b from-gray-50 to-white shadow-sm mb-3 overflow-hidden">
        <div className="bg-gradient-to-b from-gray-700 to-gray-800 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs font-mono">{s.num}</span>
            <span className="text-white text-xs font-semibold">{s.title}</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${outcomeBadgeVista}`}>{s.outcome}</span>
        </div>
        <div className="grid grid-cols-6 border-b border-gray-200 text-[10px]">
          {[['ENV', s.env], ['GRAVITY', s.gravity], ['MASS', s.mass], ['VELOCITY', s.velocity], ['FRICTION', s.friction], ['TARGET', s.target]].map(([label, val]) => (
            <div key={label} className="px-2 py-1.5 border-r border-gray-200 last:border-r-0">
              <div className="text-gray-400 font-bold uppercase tracking-wide" style={{ fontSize: '9px' }}>{label}</div>
              <div className="text-gray-800 font-semibold">{val}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 border-b border-gray-200 text-[10px] bg-gray-50">
          {[['Kp', s.kp], ['Ki', s.ki], ['Kd', s.kd], ['PROFILE', s.profile]].map(([label, val]) => (
            <div key={label} className="px-2 py-1.5 border-r border-gray-200 last:border-r-0">
              <div className="text-blue-500 font-bold uppercase tracking-wide" style={{ fontSize: '9px' }}>{label}</div>
              <div className="text-gray-800 font-semibold">{val}</div>
            </div>
          ))}
        </div>
        <div className="px-3 py-2">
          <p className="text-gray-700 text-[11px] leading-relaxed">{s.desc}</p>
          <p className="text-blue-400 text-[10px] mt-1 italic">↳ {s.note}</p>
        </div>
      </div>
    );
  }

  // Classic Mac
  return (
    <div className="border-2 border-black mb-3 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
      <div className="bg-black px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs font-mono">{s.num}</span>
          <span className="text-white text-xs font-bold tracking-wide">{s.title}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 ${outcomeBadgeMac}`}>{s.outcome}</span>
      </div>
      <div className="grid grid-cols-6 border-b-2 border-black text-[10px]">
        {[['ENV', s.env], ['GRAVITY', s.gravity], ['MASS', s.mass], ['VELOCITY', s.velocity], ['FRICTION', s.friction], ['TARGET', s.target]].map(([label, val]) => (
          <div key={label} className="px-2 py-1.5 border-r-2 border-black last:border-r-0">
            <div className="text-gray-500 font-bold uppercase" style={{ fontSize: '9px' }}>{label}</div>
            <div className="text-black font-bold">{val}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 border-b-2 border-black text-[10px] bg-gray-100">
        {[['Kp', s.kp], ['Ki', s.ki], ['Kd', s.kd], ['PROFILE', s.profile]].map(([label, val]) => (
          <div key={label} className="px-2 py-1.5 border-r-2 border-black last:border-r-0">
            <div className="text-gray-500 font-bold uppercase" style={{ fontSize: '9px' }}>{label}</div>
            <div className="text-black font-bold">{val}</div>
          </div>
        ))}
      </div>
      <div className="px-3 py-2">
        <p className="text-black text-[11px] leading-relaxed">{s.desc}</p>
        <p className="text-gray-500 text-[10px] mt-1">↳ {s.note}</p>
      </div>
    </div>
  );
}

export default function MenuBar({
  theme, isRunning,
  showFileMenu, showEditMenu, showSimMenu, showViewMenu,
  setShowFileMenu, setShowEditMenu, setShowSimMenu, setShowViewMenu, setShowHelpDialog,
  resetSimulation, setIsRunning, setGravityPreset, loadPreset, exportData, saveConfig, setTheme,
  EARTH_GRAVITY, MARS_GRAVITY, MOON_GRAVITY, gravity,
}) {
  const [showScenariosDialog, setShowScenariosDialog] = React.useState(false);

  const closeAllMenus = () => {
    setShowFileMenu(false);
    setShowEditMenu(false);
    setShowSimMenu(false);
    setShowViewMenu(false);
  };

  const isVista = theme === 'vista';
  const menuItemClass = `w-full text-left px-4 py-2 text-xs ${isVista ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`;
  const dropdownClass = `absolute top-full left-0 mt-1 z-50 min-w-48 ${isVista ? 'bg-white border-2 border-gray-500 shadow-lg' : 'bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`;
  const dividerClass = `border-t-2 ${isVista ? 'border-gray-300' : 'border-black'}`;
  const btnClass = `px-3 py-1 ${isVista ? 'hover:bg-gray-400 rounded' : 'hover:bg-black hover:text-white'}`;

  const dialogClass = isVista
    ? 'bg-white border-2 border-gray-400 rounded-lg shadow-2xl'
    : 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]';

  const titleBarClass = isVista
    ? 'flex items-center justify-between flex-shrink-0 bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700 px-4 py-3'
    : 'flex items-center justify-between flex-shrink-0 bg-white border-b-2 border-black px-4 py-2';

  const titleTextClass = isVista
    ? 'text-white font-semibold text-sm'
    : 'text-black font-bold text-sm tracking-wide';

  const dlBtnClass = isVista
    ? 'text-xs font-bold px-3 py-1 bg-gradient-to-b from-blue-500 to-blue-600 text-white rounded border border-blue-700 shadow hover:from-blue-600 hover:to-blue-700'
    : 'text-xs font-bold px-3 py-1 bg-white text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100';

  const closeBtnClass = isVista
    ? 'text-white hover:text-red-400'
    : 'text-black hover:text-gray-600';

  const bodyClass = isVista
    ? 'bg-white px-4 py-3 overflow-y-auto flex-1'
    : 'bg-[#dddddd] px-4 py-3 overflow-y-auto flex-1';

  const footerClass = isVista
    ? 'flex justify-end flex-shrink-0 bg-gradient-to-b from-gray-200 to-gray-300 border-t-2 border-gray-400 px-4 py-2'
    : 'flex justify-end flex-shrink-0 bg-white border-t-2 border-black px-4 py-2';

  const closeBtnFooter = isVista
    ? 'px-4 py-2 text-xs font-bold bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 border-2 border-gray-500 rounded text-gray-800 shadow-md active:shadow-inner'
    : 'px-4 py-2 text-xs font-bold bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100';

  return (
    <>
      <div className={`px-3 py-1 border-b flex gap-1 text-xs font-bold relative ${
        isVista
          ? 'bg-gradient-to-b from-gray-200 to-gray-300 border-gray-400 text-gray-800'
          : 'bg-white border-b-2 border-black text-black'
      }`}>

        {/* File */}
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setShowFileMenu(!showFileMenu); setShowEditMenu(false); setShowSimMenu(false); setShowViewMenu(false); }} className={btnClass}>File</button>
          {showFileMenu && (
            <div className={dropdownClass}>
              <button onClick={() => { resetSimulation(); closeAllMenus(); }} className={menuItemClass}>New Session</button>
              <div className={dividerClass}></div>
              <button onClick={() => saveConfig(closeAllMenus)} className={menuItemClass}>Save Configuration...</button>
              <button onClick={() => exportData(closeAllMenus)} className={menuItemClass}>Export Data (CSV)...</button>
              <div className={dividerClass}></div>
              <button onClick={closeAllMenus} className={menuItemClass}>Close</button>
            </div>
          )}
        </div>

        {/* Edit */}
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setShowEditMenu(!showEditMenu); setShowFileMenu(false); setShowSimMenu(false); setShowViewMenu(false); }} className={btnClass}>Edit</button>
          {showEditMenu && (
            <div className={dropdownClass}>
              <button onClick={() => loadPreset('aggressive', closeAllMenus)} className={menuItemClass}>Load Aggressive PID</button>
              <button onClick={() => loadPreset('balanced', closeAllMenus)} className={menuItemClass}>Load Balanced PID</button>
              <button onClick={() => loadPreset('smooth', closeAllMenus)} className={menuItemClass}>Load Smooth PID</button>
              <div className={dividerClass}></div>
              <button onClick={() => { resetSimulation(); closeAllMenus(); }} className={menuItemClass}>Reset All Parameters</button>
            </div>
          )}
        </div>

        {/* View */}
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setShowViewMenu(!showViewMenu); setShowFileMenu(false); setShowEditMenu(false); setShowSimMenu(false); }} className={btnClass}>View</button>
          {showViewMenu && (
            <div className={dropdownClass}>
              <div className={`px-3 py-1 border-b-2 text-[10px] uppercase ${isVista ? 'bg-gray-200 border-gray-300 text-gray-500 font-bold tracking-wider' : 'bg-black text-white border-black font-bold'}`}>Select View</div>
              <button onClick={() => { setTheme('vista'); closeAllMenus(); }} className={menuItemClass}>Frost Vista</button>
              <button onClick={() => { setTheme('mac'); closeAllMenus(); }} className={menuItemClass}>Classic Mac</button>
            </div>
          )}
        </div>

        {/* Simulation */}
        <div className="relative">
          <button onClick={(e) => { e.stopPropagation(); setShowSimMenu(!showSimMenu); setShowFileMenu(false); setShowEditMenu(false); setShowViewMenu(false); }} className={btnClass}>Simulation</button>
          {showSimMenu && (
            <div className={dropdownClass}>
              <button onClick={() => { setIsRunning(!isRunning); closeAllMenus(); }} className={menuItemClass}>{isRunning ? 'Pause' : 'Start'}</button>
              <button onClick={() => { resetSimulation(); closeAllMenus(); }} className={menuItemClass}>Reset</button>
              <div className={dividerClass}></div>
              <button onClick={() => { setGravityPreset('earth'); closeAllMenus(); }} className={menuItemClass}>Set Earth Gravity</button>
              <button onClick={() => { setGravityPreset('mars'); closeAllMenus(); }} className={menuItemClass}>Set Mars Gravity</button>
              <button onClick={() => { setGravityPreset('moon'); closeAllMenus(); }} className={menuItemClass}>Set Moon Gravity</button>
            </div>
          )}
        </div>

        {/* Help */}
        <button onClick={() => setShowHelpDialog(true)} className={btnClass}>Help</button>

        {/* Scenarios */}
        <button onClick={() => setShowScenariosDialog(true)} className={btnClass}>Scenarios</button>

      </div>

      {/* Scenarios Dialog */}
      {showScenariosDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowScenariosDialog(false)}
        >
          <div
            className={`w-full max-w-3xl h-[88vh] flex flex-col ${dialogClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={titleBarClass}>
              <h2 className={titleTextClass}>Scenarios — PhyVista v2.0</h2>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/thattimelessman/PhyVista/raw/main/docs/PhyVista_v2_Scenarios.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={dlBtnClass}
                  onClick={(e) => e.stopPropagation()}
                >
                  Download PDF
                </a>
                <button onClick={() => setShowScenariosDialog(false)} className={closeBtnClass}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className={bodyClass}>
              {isVista ? (
                <p className="text-gray-500 text-xs mb-3 border-b border-gray-200 pb-2">
                  10 standardized scenarios for validating physics engine behavior across gravity environments, vehicle configurations, and PID profiles.
                </p>
              ) : (
                <p className="text-black text-xs font-bold mb-3 uppercase tracking-widest border-b-2 border-black pb-2">
                  10 Simulation Scenarios — PhyVista v2.0
                </p>
              )}
              {SCENARIOS.map((s) => (
                <ScenarioCard key={s.num} s={s} theme={theme} />
              ))}
            </div>

            <div className={footerClass}>
              <button onClick={() => setShowScenariosDialog(false)} className={closeBtnFooter}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}