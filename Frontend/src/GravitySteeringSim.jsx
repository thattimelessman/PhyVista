import React, { useState } from 'react';
import useSimulation from './hooks/useSimulation';
import TitleBar from './components/TitleBar';
import MenuBar from './components/MenuBar';
import ControlPanel from './components/ControlPanel';
import PhysicsTab from './components/PhysicsTab';
import AnalysisTab from './components/AnalysisTab';
import HelpDialog from './components/HelpDialog';

const GravitySteeringSim = () => {
  const [theme, setTheme] = useState('vista');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('control');
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showSimMenu, setShowSimMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  const sim = useSimulation();

  const closeAllMenus = () => {
    setShowFileMenu(false);
    setShowEditMenu(false);
    setShowSimMenu(false);
    setShowViewMenu(false);
  };

  return (
    <div className={`w-full min-h-screen p-4 transition-colors ${theme === 'vista' ? 'bg-gradient-to-b from-gray-100 to-gray-200' : 'bg-gradient-to-b from-[#d4cfc4] to-[#beb9ad]'}`} onClick={closeAllMenus}>
      <div className="max-w-7xl mx-auto">
        <div className={`overflow-hidden transition-all ${theme === 'vista' ? 'bg-white rounded-lg shadow-2xl border border-gray-300' : 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]'}`} onClick={(e) => e.stopPropagation()}>

          <TitleBar theme={theme} />

          <MenuBar
            theme={theme} isRunning={sim.isRunning}
            showFileMenu={showFileMenu} showEditMenu={showEditMenu}
            showSimMenu={showSimMenu} showViewMenu={showViewMenu}
            setShowFileMenu={setShowFileMenu} setShowEditMenu={setShowEditMenu}
            setShowSimMenu={setShowSimMenu} setShowViewMenu={setShowViewMenu}
            setShowHelpDialog={setShowHelpDialog} setTheme={setTheme}
            resetSimulation={sim.resetSimulation} setIsRunning={sim.setIsRunning}
            setGravityPreset={sim.setGravityPreset} loadPreset={sim.loadPreset}
            exportData={sim.exportData} saveConfig={sim.saveConfig}
            EARTH_GRAVITY={sim.EARTH_GRAVITY} MARS_GRAVITY={sim.MARS_GRAVITY}
            MOON_GRAVITY={sim.MOON_GRAVITY} gravity={sim.gravity}
          />

          {/* Tab Nav */}
          <div className={`border-b ${theme === 'vista' ? 'bg-gradient-to-b from-gray-100 to-gray-200 border-gray-400' : 'bg-[#dddddd] border-b-2 border-black py-2 px-4'}`}>
            <div className="flex gap-1">
              {['control', 'physics', 'analysis'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`${theme === 'vista'
                  ? `px-6 py-2 text-sm font-semibold border-r border-gray-400 transition-colors ${activeTab === tab ? 'bg-white text-black border-b-2 border-b-white' : 'text-gray-600 hover:bg-gray-300'}`
                  : `px-6 py-2 text-xs font-bold border-2 border-black transition-all ${activeTab === tab ? 'bg-white shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.2)]' : 'bg-[#dddddd] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]'}`
                }`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 bg-white">
            {activeTab === 'control' && (
              <ControlPanel theme={theme} {...sim}
                showSettings={showSettings} setShowSettings={setShowSettings}
              />
            )}
            {activeTab === 'physics' && <PhysicsTab theme={theme} {...sim} />}
            {activeTab === 'analysis' && <AnalysisTab theme={theme} {...sim} />}
          </div>

          {/* Bottom Bar */}
          <div className={`px-4 py-2 text-xs ${theme === 'vista' ? 'bg-gradient-to-b from-gray-200 to-gray-300 border-t-2 border-gray-400 text-gray-700' : 'bg-white border-t-2 border-black text-black'}`}>
            <span className="font-bold">PhyVista v2.0</span> | <span className="ml-2">PhyVista Python Engine</span> | <span className="ml-2">© 2026 Aerospace Research Division</span>
          </div>
        </div>

        {/* System Status */}
        <div className={`mt-4 p-4 ${theme === 'vista' ? 'bg-white rounded border-2 border-gray-400 shadow-lg' : 'bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`}>
          <h3 className={`font-bold text-sm mb-2 uppercase tracking-wide ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>System Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {[
              ['Simulation Time', `${sim.time.toFixed(1)}s`],
              ['Data Points', `${sim.historyData.length}/100`],
              ['Turn Radius', sim.turnRadius > 10000 ? '∞' : sim.turnRadius.toFixed(1) + 'm'],
            ].map(([label, value]) => (
              <div key={label} className={`p-2 ${theme === 'vista' ? 'bg-gray-100 rounded border border-gray-300' : 'bg-white border-2 border-black'}`}>
                <div className={`${theme === 'vista' ? 'text-gray-600 font-semibold' : 'text-black font-bold'}`}>{label}</div>
                <div className="font-mono text-lg">{value}</div>
              </div>
            ))}
            <div className={`p-2 flex items-center justify-between ${theme === 'vista' ? 'bg-gray-100 rounded border border-gray-300' : 'bg-white border-2 border-black'}`}>
              <div>
                <div className={`${theme === 'vista' ? 'text-gray-600 font-semibold' : 'text-black font-bold'}`}>Backend Status</div>
                <div className="font-mono text-lg">{sim.simulationId ? 'Connected' : 'Connecting...'}</div>
              </div>
              <div className={`w-4 h-4 ${theme === 'vista' ? 'rounded-full shadow-inner' : 'border-2 border-black'} ${sim.simulationId ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
          </div>
        </div>
      </div>

      {showHelpDialog && <HelpDialog theme={theme} onClose={() => setShowHelpDialog(false)} />}
    </div>
  );
};

export default GravitySteeringSim;
