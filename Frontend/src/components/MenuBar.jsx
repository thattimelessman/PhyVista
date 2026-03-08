import React from 'react';

export default function MenuBar({
  theme, isRunning,
  showFileMenu, showEditMenu, showSimMenu, showViewMenu,
  setShowFileMenu, setShowEditMenu, setShowSimMenu, setShowViewMenu, setShowHelpDialog,
  resetSimulation, setIsRunning, setGravityPreset, loadPreset, exportData, saveConfig, setTheme,
  EARTH_GRAVITY, MARS_GRAVITY, MOON_GRAVITY, gravity,
}) {
  const closeAllMenus = () => {
    setShowFileMenu(false);
    setShowEditMenu(false);
    setShowSimMenu(false);
    setShowViewMenu(false);
  };

  const menuItemClass = `w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`;
  const dropdownClass = `absolute top-full left-0 mt-1 z-50 min-w-48 ${theme === 'vista' ? 'bg-white border-2 border-gray-500 shadow-lg' : 'bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`;
  const dividerClass = `border-t-2 ${theme === 'vista' ? 'border-gray-300' : 'border-black'}`;
  const btnClass = `px-3 py-1 ${theme === 'vista' ? 'hover:bg-gray-400 rounded' : 'hover:bg-black hover:text-white'}`;

  return (
    <div className={`px-3 py-1 border-b flex gap-1 text-xs font-bold relative ${
      theme === 'vista'
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
            <div className={`px-3 py-1 border-b-2 text-[10px] uppercase ${theme === 'vista' ? 'bg-gray-200 border-gray-300 text-gray-500 font-bold tracking-wider' : 'bg-black text-white border-black font-bold'}`}>Select View</div>
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
    </div>
  );
}