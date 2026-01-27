import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Play, Pause, RotateCcw, Settings, ChevronRight, X } from 'lucide-react';

const GravitySteeringSim = () => {
  const API_BASE = fetch('https://phyvista-backend.onrender.com/api/data');

  // --- Theme State ---
  const [theme, setTheme] = useState('vista'); 
  const [showViewMenu, setShowViewMenu] = useState(false);

  // Physics constants
  const EARTH_GRAVITY = 9.81;
  const MOON_GRAVITY = 1.62;
  const MARS_GRAVITY = 3.71;
  
  // Backend Session
  const [simulationId, setSimulationId] = useState(null);

  // Simulation state
  const [gravity, setGravity] = useState(EARTH_GRAVITY);
  const [mass, setMass] = useState(500);
  const [velocity, setVelocity] = useState(10);
  const [steeringAngle, setSteeringAngle] = useState(0);
  const [targetAngle, setTargetAngle] = useState(15);
  const [frictionCoeff, setFrictionCoeff] = useState(0.7);
  const [propulsionForce, setPropulsionForce] = useState(2000);
  
  // PID controller gains
  const [kp, setKp] = useState(0.5);
  const [ki, setKi] = useState(0.1);
  const [kd, setKd] = useState(0.2);
  
  // Simulation control
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [historyData, setHistoryData] = useState([]);
  
  // Vehicle state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [heading, setHeading] = useState(0);
  const [angularVelocity, setAngularVelocity] = useState(0);
  const [turnRadius, setTurnRadius] = useState(Infinity);
  
  // Physics diagnostics
  const [normalForce, setNormalForce] = useState(0);
  const [maxFriction, setMaxFriction] = useState(0);
  const [centripetalReq, setCentripetalReq] = useState(0);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('control');
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showSimMenu, setShowSimMenu] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  
  // 1. INITIALIZE SIMULATION ON BACKEND
  useEffect(() => {
    const initSim = async () => {
      try {
        const response = await fetch(`${API_BASE}/simulation/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mass: mass,
            gravity: gravity,
            friction_coefficient: frictionCoeff,
            initial_velocity: velocity,
            dt: 0.1,
            pid_gains: { kp, ki, kd }
          })
        });
        const data = await response.json();
        setSimulationId(data.simulation_id);
        
        // Initial static values
        setNormalForce(mass * gravity);
        setMaxFriction(mass * gravity * frictionCoeff);
      } catch (error) {
        console.error("Failed to initialize backend simulation", error);
      }
    };
    initSim();
  }, []); 

  // 2. SIMULATION STEP FUNCTION
  const simulationStep = async () => {
    if (!simulationId) return;

    try {
      const response = await fetch(`${API_BASE}/simulation/${simulationId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_angle: targetAngle })
      });
      
      const nextData = await response.json();
      
      if (nextData.error) {
        console.error("Backend Error:", nextData.error);
        setIsRunning(false);
        return; 
      }

      const state = nextData.state;
      const diag = nextData.diagnostics;

      setPosition({ x: state.position_x, y: state.position_y });
      setHeading(state.heading_rad);
      setAngularVelocity(state.angular_velocity_rad);
      setSteeringAngle(state.steering_angle);
      setTime(state.time);
      setTurnRadius(diag.turn_radius || Infinity);
      setNormalForce(diag.normal_force);
      setMaxFriction(diag.max_friction_force);
      setCentripetalReq(diag.centripetal_force_required);

      setHistoryData(prev => [...prev, {
        time: state.time.toFixed(2),
        steeringAngle: state.steering_angle.toFixed(2),
        targetAngle: targetAngle,
        heading: state.heading_deg.toFixed(2),
        frictionUtilization: diag.friction_utilization.toFixed(1),
        canTurn: diag.can_turn ? 100 : 0,
        angularVelocity: state.angular_velocity_deg.toFixed(2),
        pidError: diag.pid_error.toFixed(2),
        velocity: state.velocity.toFixed(2)
      }].slice(-100));

    } catch (error) {
      console.error("Network error:", error);
      setIsRunning(false);
    }
  };

  // 3. MAIN LOOP
  useEffect(() => {
    let intervalId;
    if (isRunning && simulationId) {
      intervalId = setInterval(() => {
        simulationStep();
      }, 100); 
    }
    return () => clearInterval(intervalId);
  }, [isRunning, simulationId, targetAngle]);  

  const updateBackendParam = async (paramObj) => {
    if (!simulationId) return;
    try {
      await fetch(`${API_BASE}/simulation/${simulationId}/update_params`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paramObj)
      });
    } catch (e) {
      console.error("Failed to update params", e);
    }
  };
  
  const resetSimulation = async () => {
    setIsRunning(false);
    if (simulationId) {
      await fetch(`${API_BASE}/simulation/${simulationId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initial_velocity: velocity })
      });
    }
    setTime(0);
    setSteeringAngle(0);
    setHeading(0);
    setPosition({ x: 0, y: 0 });
    setAngularVelocity(0);
    setHistoryData([]);
  };
  
  const setGravityPreset = (preset) => {
    let newG = EARTH_GRAVITY;
    switch(preset) {
      case 'earth': newG = EARTH_GRAVITY; break;
      case 'mars': newG = MARS_GRAVITY; break;
      case 'moon': newG = MOON_GRAVITY; break;
    }
    setGravity(newG);
    updateBackendParam({ gravity: newG });
  };

  const exportData = () => {
    const csvContent = [
      ['Time(s)', 'Steering Angle(°)', 'Target Angle(°)', 'Heading(°)', 'Friction(%)', 'Angular Velocity(°/s)', 'PID Error(°)', 'Velocity(m/s)'],
      ...historyData.map(d => [d.time, d.steeringAngle, d.targetAngle, d.heading, d.frictionUtilization, d.angularVelocity, d.pidError, d.velocity])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steering_sim_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowFileMenu(false);
  };

  const saveConfig = () => {
    const config = {
      gravity, mass, velocity, targetAngle, frictionCoeff, propulsionForce,
      kp, ki, kd, 
      timestamp: new Date().toISOString(),
      gravityType: gravity === EARTH_GRAVITY ? 'Earth' : gravity === MARS_GRAVITY ? 'Mars' : 'Moon'
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steering_config_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowFileMenu(false);
  };

  const loadPreset = (presetName) => {
    const presets = {
      aggressive: { kp: 1.5, ki: 0.3, kd: 0.5 },
      balanced: { kp: 0.5, ki: 0.1, kd: 0.2 },
      smooth: { kp: 0.2, ki: 0.05, kd: 0.1 }
    };
    const preset = presets[presetName];
    if (preset) {
      setKp(preset.kp);
      setKi(preset.ki);
      setKd(preset.kd);
      updateBackendParam({ pid_gains: preset });
    }
    setShowEditMenu(false);
  };

  const closeAllMenus = () => {
    setShowFileMenu(false);
    setShowEditMenu(false);
    setShowSimMenu(false);
    setShowViewMenu(false);
  };

  return (
    // DESKTOP BACKGROUND (Vista: Gradient White/Gray | Mac: Classic Beige/Tan)
    <div className={`w-full min-h-screen p-4 transition-colors ${theme === 'vista' ? 'bg-gradient-to-b from-gray-100 to-gray-200' : 'bg-gradient-to-b from-[#d4cfc4] to-[#beb9ad]'}`} onClick={closeAllMenus}>
      <div className="max-w-7xl mx-auto">
        
        {/* WINDOW CONTAINER (Vista: Boxy | Mac: Classic White with Black Border) */}
        <div className={`overflow-hidden transition-all ${
          theme === 'vista' 
            ? 'bg-white rounded-lg shadow-2xl border border-gray-300' 
            : 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]'
        }`} onClick={(e) => e.stopPropagation()}>
          
          {/* TITLE BAR (Vista: Dark Gradient | Mac: White with Thin Stripes) */}
          <div className={`${
            theme === 'vista'
              ? 'bg-gradient-to-b from-gray-800 to-gray-900 px-4 py-3 border-b border-gray-700'
              : 'bg-white px-4 py-2 border-b-2 border-black relative overflow-hidden'
          }`}>
            {/* Mac: Horizontal Stripe Pattern */}
            {theme === 'mac' && (
              <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)'
              }}></div>
            )}
            <div className={`flex items-center relative z-10 ${theme === 'mac' ? 'justify-between' : 'gap-3'}`}>
              <div className={`flex gap-1.5`}>
                <div className={`w-3 h-3 ${theme === 'vista' ? 'rounded-full bg-red-500 border border-red-600' : 'bg-white border-2 border-black'}`}></div>
                <div className={`w-3 h-3 ${theme === 'vista' ? 'rounded-full bg-yellow-500 border border-yellow-600' : 'hidden'}`}></div>
                <div className={`w-3 h-3 ${theme === 'vista' ? 'rounded-full bg-green-500 border border-green-600' : 'hidden'}`}></div>
              </div>
              <h1 className={`${theme === 'vista' ? 'font-semibold text-sm tracking-wide text-white' : 'font-bold text-xs tracking-tight text-black text-center flex-1'} select-none`}>
                Low-Gravity Vehicle Steering Simulator
              </h1>
              {theme === 'mac' && <div className="w-3"></div>}
            </div>
          </div>
          
          {/* MENU BAR */}
          <div className={`px-3 py-1 border-b flex gap-1 text-xs font-bold relative ${
            theme === 'vista' 
              ? 'bg-gradient-to-b from-gray-200 to-gray-300 border-gray-400 text-gray-800' 
              : 'bg-white border-b-2 border-black text-black'
          }`}>
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFileMenu(!showFileMenu);
                  setShowEditMenu(false);
                  setShowSimMenu(false);
                  setShowViewMenu(false);
                }}
                className={`px-3 py-1 ${theme === 'vista' ? 'hover:bg-gray-400 rounded' : 'hover:bg-black hover:text-white'}`}
              >
                <span className={theme === 'mac' ? 'font-chicago' : ''}>File</span>
              </button>
              {showFileMenu && (
                <div className={`absolute top-full left-0 mt-1 z-50 min-w-48 ${theme === 'vista' ? 'bg-white border-2 border-gray-500 shadow-lg' : 'bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                  <button onClick={resetSimulation} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>New Session</button>
                  <div className={`border-t-2 ${theme === 'vista' ? 'border-gray-300' : 'border-black'}`}></div>
                  <button onClick={saveConfig} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>Save Configuration...</button>
                  <button onClick={exportData} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>Export Data (CSV)...</button>
                  <div className={`border-t-2 ${theme === 'vista' ? 'border-gray-300' : 'border-black'}`}></div>
                  <button onClick={() => setShowFileMenu(false)} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>Close</button>
                </div>
              )}
            </div>
            
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditMenu(!showEditMenu);
                  setShowFileMenu(false);
                  setShowSimMenu(false);
                  setShowViewMenu(false);
                }}
                className={`px-3 py-1 ${theme === 'vista' ? 'hover:bg-gray-400 rounded' : 'hover:bg-black hover:text-white'}`}
              >
                <span className={theme === 'mac' ? 'font-chicago' : ''}>Edit</span>
              </button>
              {showEditMenu && (
                <div className={`absolute top-full left-0 mt-1 z-50 min-w-48 ${theme === 'vista' ? 'bg-white border-2 border-gray-500 shadow-lg' : 'bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                  <button onClick={() => loadPreset('aggressive')} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>Load Aggressive PID</button>
                  <button onClick={() => loadPreset('balanced')} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>Load Balanced PID</button>
                  <button onClick={() => loadPreset('smooth')} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>Load Smooth PID</button>
                  <div className={`border-t-2 ${theme === 'vista' ? 'border-gray-300' : 'border-black'}`}></div>
                  <button onClick={resetSimulation} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>Reset All Parameters</button>
                </div>
              )}
            </div>
            
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewMenu(!showViewMenu);
                  setShowFileMenu(false);
                  setShowEditMenu(false);
                  setShowSimMenu(false);
                }}
                className={`px-3 py-1 ${theme === 'vista' ? 'hover:bg-gray-400 rounded' : 'hover:bg-black hover:text-white'}`}
              >
                <span className={theme === 'mac' ? 'font-chicago' : ''}>View</span>
              </button>
              {showViewMenu && (
                <div className={`absolute top-full left-0 mt-1 z-50 min-w-48 ${theme === 'vista' ? 'bg-white border-2 border-gray-500 shadow-lg' : 'bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                  <div className={`px-3 py-1 border-b-2 text-[10px] uppercase ${theme === 'vista' ? 'bg-gray-200 border-gray-300 text-gray-500 font-bold tracking-wider' : 'bg-black text-white border-black font-bold'}`}>Select View</div>
                  <button onClick={() => { setTheme('vista'); setShowViewMenu(false); }} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white font-bold' : 'hover:bg-black hover:text-white'}`}>Frost Vista</button>
                  <button onClick={() => { setTheme('mac'); setShowViewMenu(false); }} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white font-bold'}`}>Classic Mac</button>
                </div>
              )}
            </div>
            
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSimMenu(!showSimMenu);
                  setShowFileMenu(false);
                  setShowEditMenu(false);
                  setShowViewMenu(false);
                }}
                className={`px-3 py-1 ${theme === 'vista' ? 'hover:bg-gray-400 rounded' : 'hover:bg-black hover:text-white'}`}
              >
                <span className={theme === 'mac' ? 'font-chicago' : ''}>Simulation</span>
              </button>
              {showSimMenu && (
                <div className={`absolute top-full left-0 mt-1 z-50 min-w-48 ${theme === 'vista' ? 'bg-white border-2 border-gray-500 shadow-lg' : 'bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                  <button onClick={() => { setIsRunning(!isRunning); setShowSimMenu(false); }} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>{isRunning ? 'Pause' : 'Start'}</button>
                  <button onClick={() => { resetSimulation(); setShowSimMenu(false); }} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>Reset</button>
                  <div className={`border-t-2 ${theme === 'vista' ? 'border-gray-300' : 'border-black'}`}></div>
                  <button onClick={() => { setGravityPreset('earth'); setShowSimMenu(false); }} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>Set Earth Gravity</button>
                  <button onClick={() => { setGravityPreset('mars'); setShowSimMenu(false); }} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>Set Mars Gravity</button>
                  <button onClick={() => { setGravityPreset('moon'); setShowSimMenu(false); }} className={`w-full text-left px-4 py-2 text-xs ${theme === 'vista' ? 'hover:bg-blue-500 hover:text-white' : 'hover:bg-black hover:text-white'}`}>Set Moon Gravity</button>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setShowHelpDialog(true)}
              className={`px-3 py-1 ${theme === 'vista' ? 'hover:bg-gray-400 rounded' : 'hover:bg-black hover:text-white'}`}
            >
              <span className={theme === 'mac' ? 'font-chicago' : ''}>Help</span>
            </button>
          </div>
          
          {/* TAB NAVIGATION (Vista: Flat Text | Mac: Classic Button Tabs) */}
          <div className={`border-b ${theme === 'vista' ? 'bg-gradient-to-b from-gray-100 to-gray-200 border-gray-400' : 'bg-[#dddddd] border-b-2 border-black py-2 px-4'}`}>
            <div className={`flex gap-1 ${theme === 'mac' ? '' : ''}`}>
              {['control', 'physics', 'analysis'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${theme === 'vista' 
                    ? `px-6 py-2 text-sm font-semibold border-r border-gray-400 transition-colors ${activeTab === tab ? 'bg-white text-black border-b-2 border-b-white' : 'text-gray-600 hover:bg-gray-300'}`
                    : `px-6 py-2 text-xs font-bold border-2 border-black transition-all ${activeTab === tab ? 'bg-white shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.2)]' : 'bg-[#dddddd] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:shadow-[inset_2px_2px_0px_0px_rgba(0,0,0,0.2)]'}`
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* MAIN CONTENT AREA */}
          <div className={`p-6 ${theme === 'vista' ? 'bg-white' : 'bg-white'}`}>
            {activeTab === 'control' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Simulation Controls */}
                  <div className={`${theme === 'vista' ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-50 to-white p-4 shadow-inner' : 'bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`}>
                    <div className={`flex items-center gap-2 mb-4 pb-2 ${theme === 'vista' ? 'border-b-2 border-gray-300' : 'border-b-2 border-black'}`}>
                      <ChevronRight size={16} className={`${theme === 'vista' ? 'text-gray-600' : 'text-black'}`} />
                      <h2 className={`text-sm font-bold uppercase tracking-wide ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>Simulation Control</h2>
                    </div>
                    
                    {/* Buttons (Mac: Rounded Rect with 3D effect) */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setIsRunning(!isRunning)}
                        className={`flex-1 px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 ${
                          theme === 'vista' 
                            ? 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 border-2 border-gray-500 rounded text-gray-800 shadow-md active:shadow-inner' 
                            : 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] hover:bg-gray-100'
                        }`}
                      >
                        {isRunning ? <><Pause size={14} /> PAUSE</> : <><Play size={14} /> START</>}
                      </button>
                      <button
                        onClick={resetSimulation}
                        className={`px-3 py-2 text-xs font-bold flex items-center gap-2 ${
                          theme === 'vista' 
                            ? 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 border-2 border-gray-500 rounded text-gray-800 shadow-md active:shadow-inner' 
                            : 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] hover:bg-gray-100'
                        }`}
                      >
                        <RotateCcw size={14} /> RESET
                      </button>
                    </div>
                    
                    <div className={`space-y-2 text-xs font-mono p-3 ${
                      theme === 'vista' 
                        ? 'bg-black text-green-400 rounded border-2 border-gray-500' 
                        : 'bg-black text-green-400 border-2 border-black'
                    }`}>
                      <div className="flex justify-between"><span>TIME:</span><span>{time.toFixed(2)}s</span></div>
                      <div className="flex justify-between"><span>STEER:</span><span>{steeringAngle.toFixed(1)}°</span></div>
                      <div className="flex justify-between"><span>HEAD:</span><span>{((heading * 180) / Math.PI).toFixed(1)}°</span></div>
                      <div className="flex justify-between"><span>ANG.V:</span><span>{(angularVelocity * 180 / Math.PI).toFixed(2)}°/s</span></div>
                      <div className={`flex justify-between pt-1 mt-1 ${theme === 'vista' ? 'border-t border-green-600' : 'border-t border-green-600'}`}><span>POS.X:</span><span>{position.x.toFixed(1)}m</span></div>
                      <div className="flex justify-between"><span>POS.Y:</span><span>{position.y.toFixed(1)}m</span></div>
                    </div>
                  </div>
                  
                  {/* Gravity Settings */}
                  <div className={`${theme === 'vista' ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-50 to-white p-4 shadow-inner' : 'bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`}>
                    <div className={`flex items-center gap-2 mb-4 pb-2 ${theme === 'vista' ? 'border-b-2 border-gray-300' : 'border-b-2 border-black'}`}>
                      <ChevronRight size={16} className={`${theme === 'vista' ? 'text-gray-600' : 'text-black'}`} />
                      <h2 className={`text-sm font-bold uppercase tracking-wide ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>Environment</h2>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <button
                        onClick={() => setGravityPreset('earth')}
                        className={`px-2 py-3 text-xs font-bold ${
                          theme === 'vista'
                            ? `rounded border-2 shadow-md active:shadow-inner ${gravity === EARTH_GRAVITY ? 'bg-gradient-to-b from-blue-200 to-blue-300 border-blue-500 text-blue-900' : 'bg-gradient-to-b from-gray-200 to-gray-300 border-gray-500 text-gray-800 hover:from-gray-300 hover:to-gray-400'}`
                            : `border-2 border-black ${gravity === EARTH_GRAVITY ? 'bg-black text-white' : 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] hover:bg-gray-100'}`
                        }`}
                      >
                        EARTH<br/><span className="text-[10px] font-normal">{EARTH_GRAVITY}m/s²</span>
                      </button>
                      <button
                        onClick={() => setGravityPreset('mars')}
                        className={`px-2 py-3 text-xs font-bold ${
                          theme === 'vista'
                            ? `rounded border-2 shadow-md active:shadow-inner ${gravity === MARS_GRAVITY ? 'bg-gradient-to-b from-red-200 to-red-300 border-red-500 text-red-900' : 'bg-gradient-to-b from-gray-200 to-gray-300 border-gray-500 text-gray-800 hover:from-gray-300 hover:to-gray-400'}`
                            : `border-2 border-black ${gravity === MARS_GRAVITY ? 'bg-black text-white' : 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] hover:bg-gray-100'}`
                        }`}
                      >
                        MARS<br/><span className="text-[10px] font-normal">{MARS_GRAVITY}m/s²</span>
                      </button>
                      <button
                        onClick={() => setGravityPreset('moon')}
                        className={`px-2 py-3 text-xs font-bold ${
                          theme === 'vista'
                            ? `rounded border-2 shadow-md active:shadow-inner ${gravity === MOON_GRAVITY ? 'bg-gradient-to-b from-gray-300 to-gray-400 border-gray-600 text-gray-900' : 'bg-gradient-to-b from-gray-200 to-gray-300 border-gray-500 text-gray-800 hover:from-gray-300 hover:to-gray-400'}`
                            : `border-2 border-black ${gravity === MOON_GRAVITY ? 'bg-black text-white' : 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] hover:bg-gray-100'}`
                        }`}
                      >
                        MOON<br/><span className="text-[10px] font-normal">{MOON_GRAVITY}m/s²</span>
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className={`text-xs font-bold block mb-1 ${theme === 'vista' ? 'text-gray-700' : 'text-black'}`}>TARGET STEERING: {targetAngle}°</label>
                        <input type="range" min="-45" max="45" value={targetAngle} onChange={(e) => setTargetAngle(parseFloat(e.target.value))} className={`w-full h-2 appearance-none cursor-pointer ${theme === 'vista' ? 'bg-gray-300 border border-gray-500 rounded' : 'bg-[#dddddd] border-2 border-black'}`} />
                      </div>
                      <div>
                        <label className={`text-xs font-bold block mb-1 ${theme === 'vista' ? 'text-gray-700' : 'text-black'}`}>VELOCITY: {velocity} m/s</label>
                        <input type="range" min="5" max="30" value={velocity} onChange={(e) => { const val = parseFloat(e.target.value); setVelocity(val); updateBackendParam({ initial_velocity: val }); }} className={`w-full h-2 appearance-none cursor-pointer ${theme === 'vista' ? 'bg-gray-300 border border-gray-500 rounded' : 'bg-[#dddddd] border-2 border-black'}`} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Physics Parameters */}
                  <div className={`${theme === 'vista' ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-50 to-white p-4 shadow-inner' : 'bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`}>
                    <div className={`flex items-center gap-2 mb-4 pb-2 ${theme === 'vista' ? 'border-b-2 border-gray-300' : 'border-b-2 border-black'}`}>
                      <Settings size={16} className={`${theme === 'vista' ? 'text-gray-600' : 'text-black'}`} />
                      <h2 className={`text-sm font-bold uppercase tracking-wide ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>Parameters</h2>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className={`text-xs font-bold block mb-1 ${theme === 'vista' ? 'text-gray-700' : 'text-black'}`}>FRICTION μ: {frictionCoeff.toFixed(2)}</label>
                        <input type="range" min="0.1" max="1.5" step="0.05" value={frictionCoeff} onChange={(e) => { const val = parseFloat(e.target.value); setFrictionCoeff(val); updateBackendParam({ friction_coefficient: val }); }} className={`w-full h-2 appearance-none cursor-pointer ${theme === 'vista' ? 'bg-gray-300 border border-gray-500 rounded' : 'bg-[#dddddd] border-2 border-black'}`} />
                      </div>
                      <div>
                        <label className={`text-xs font-bold block mb-1 ${theme === 'vista' ? 'text-gray-700' : 'text-black'}`}>MASS: {mass} kg</label>
                        <input type="range" min="100" max="2000" step="50" value={mass} onChange={(e) => { const val = parseFloat(e.target.value); setMass(val); updateBackendParam({ mass: val }); }} className={`w-full h-2 appearance-none cursor-pointer ${theme === 'vista' ? 'bg-gray-300 border border-gray-500 rounded' : 'bg-[#dddddd] border-2 border-black'}`} />
                      </div>
                      
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`w-full px-3 py-2 text-xs font-bold ${
                          theme === 'vista' 
                            ? 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 border-2 border-gray-500 rounded text-gray-800 shadow-md active:shadow-inner' 
                            : 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] hover:bg-gray-100'
                        }`}
                      >
                        {showSettings ? 'HIDE' : 'SHOW'} PID TUNING
                      </button>
                      
                      {showSettings && (
                        <div className={`space-y-2 mt-2 pt-2 ${theme === 'vista' ? 'border-t-2 border-gray-300' : 'border-t-2 border-black'}`}>
                          <div>
                            <label className={`text-xs font-bold block mb-1 ${theme === 'vista' ? 'text-gray-700' : 'text-black'}`}>Kp: {kp.toFixed(2)}</label>
                            <input type="range" min="0" max="2" step="0.1" value={kp} onChange={(e) => { const val = parseFloat(e.target.value); setKp(val); updateBackendParam({ pid_gains: { kp: val, ki, kd } }); }} className={`w-full h-2 appearance-none cursor-pointer ${theme === 'vista' ? 'bg-gray-300 border border-gray-500 rounded' : 'bg-[#dddddd] border-2 border-black'}`} />
                          </div>
                          <div>
                            <label className={`text-xs font-bold block mb-1 ${theme === 'vista' ? 'text-gray-700' : 'text-black'}`}>Ki: {ki.toFixed(2)}</label>
                            <input type="range" min="0" max="1" step="0.05" value={ki} onChange={(e) => { const val = parseFloat(e.target.value); setKi(val); updateBackendParam({ pid_gains: { kp, ki: val, kd } }); }} className={`w-full h-2 appearance-none cursor-pointer ${theme === 'vista' ? 'bg-gray-300 border border-gray-500 rounded' : 'bg-[#dddddd] border-2 border-black'}`} />
                          </div>
                          <div>
                            <label className={`text-xs font-bold block mb-1 ${theme === 'vista' ? 'text-gray-700' : 'text-black'}`}>Kd: {kd.toFixed(2)}</label>
                            <input type="range" min="0" max="1" step="0.05" value={kd} onChange={(e) => { const val = parseFloat(e.target.value); setKd(val); updateBackendParam({ pid_gains: { kp, ki, kd: val } }); }} className={`w-full h-2 appearance-none cursor-pointer ${theme === 'vista' ? 'bg-gray-300 border border-gray-500 rounded' : 'bg-[#dddddd] border-2 border-black'}`} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'physics' && (
              <div className={`${theme === 'vista' ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-50 to-white p-6 shadow-inner' : 'bg-white p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`}>
                <h2 className={`text-lg font-bold mb-4 uppercase tracking-wide ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>Physics Engine Status (Backend)</h2>
                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div className="space-y-2">
                    <div className={`p-3 ${theme === 'vista' ? 'bg-black text-green-400 rounded border-2 border-gray-500' : 'bg-black text-green-400 border-2 border-black'}`}>
                      <div className="font-bold mb-2">FORCES</div>
                      <div>Normal: {normalForce.toFixed(1)} N</div>
                      <div>Max Friction: {maxFriction.toFixed(1)} N</div>
                      <div>Centripetal Req: {centripetalReq.toFixed(1)} N</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className={`p-3 ${theme === 'vista' ? 'bg-black text-green-400 rounded border-2 border-gray-500' : 'bg-black text-green-400 border-2 border-black'}`}>
                      <div className="font-bold mb-2">DYNAMICS</div>
                      <div>Position: ({position.x.toFixed(1)}, {position.y.toFixed(1)})</div>
                      <div>Heading: {((heading * 180) / Math.PI).toFixed(1)}°</div>
                      <div>Turn Radius: {turnRadius > 10000 ? '∞' : turnRadius.toFixed(1) + ' m'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'analysis' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className={`${theme === 'vista' ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-50 to-white p-4 shadow-inner' : 'bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`}>
                    <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>Steering Response</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#999" />
                        <XAxis dataKey="time" stroke="#000" style={{ fontSize: '11px' }} />
                        <YAxis stroke="#000" style={{ fontSize: '11px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '2px solid #666', fontSize: '11px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line isAnimationActive={false} type="monotone" dataKey="steeringAngle" stroke="#000" name="Actual" dot={false} strokeWidth={2} />
                        <Line isAnimationActive={false} type="monotone" dataKey="targetAngle" stroke="#666" name="Target" dot={false} strokeDasharray="5 5" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className={`${theme === 'vista' ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-50 to-white p-4 shadow-inner' : 'bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`}>
                    <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>Friction & Control</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#999" />
                        <XAxis dataKey="time" stroke="#000" style={{ fontSize: '11px' }} />
                        <YAxis stroke="#000" domain={[0, 150]} style={{ fontSize: '11px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '2px solid #666', fontSize: '11px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line isAnimationActive={false} type="monotone" dataKey="frictionUtilization" stroke="#ff6b35" name="Friction %" dot={false} strokeWidth={2} />
                        <Line isAnimationActive={false} type="monotone" dataKey="canTurn" stroke="#000" name="Slip Alert" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className={`${theme === 'vista' ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-50 to-white p-4 shadow-inner' : 'bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`}>
                    <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>Angular Velocity</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#999" />
                        <XAxis dataKey="time" stroke="#000" style={{ fontSize: '11px' }} />
                        <YAxis stroke="#000" style={{ fontSize: '11px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '2px solid #666', fontSize: '11px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line isAnimationActive={false} type="monotone" dataKey="angularVelocity" stroke="#2563eb" name="ω (°/s)" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className={`${theme === 'vista' ? 'border-2 border-gray-400 rounded bg-gradient-to-b from-gray-50 to-white p-4 shadow-inner' : 'bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`}>
                    <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>PID Error</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#999" />
                        <XAxis dataKey="time" stroke="#000" style={{ fontSize: '11px' }} />
                        <YAxis stroke="#000" style={{ fontSize: '11px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#f5f5f5', border: '2px solid #666', fontSize: '11px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
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
            )}
          </div>
          
          {/* Bottom Info Bar */}
          <div className={`px-4 py-2 text-xs ${theme === 'vista' ? 'bg-gradient-to-b from-gray-200 to-gray-300 border-t-2 border-gray-400 text-gray-700' : 'bg-white border-t-2 border-black text-black'}`}>
            <span className="font-bold">Low-Gravity Vehicle Steering Simulator v2.0</span> | 
            <span className="ml-2">PhyVista Python Engine</span> | 
            <span className="ml-2">© 2026 Aerospace Research Division</span>
          </div>
        </div>
        
        {/* Help Dialog */}
        {showHelpDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowHelpDialog(false)}>
            <div className={`max-w-3xl w-full max-h-[90vh] overflow-y-auto ${theme === 'vista' ? 'bg-white border-2 border-gray-500 rounded-lg shadow-2xl' : 'bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'}`} onClick={(e) => e.stopPropagation()}>
              <div className={`px-4 py-3 flex justify-between items-center ${theme === 'vista' ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700' : 'bg-white border-b-2 border-black'}`}>
                <h2 className={`font-semibold text-sm ${theme === 'vista' ? 'text-white' : 'text-black'}`}>Help - Low-Gravity Vehicle Steering Simulator</h2>
                <button onClick={() => setShowHelpDialog(false)} className={`${theme === 'vista' ? 'text-white hover:text-red-400' : 'text-black hover:text-gray-600'}`}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-800">What is This Simulator?</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    This is a physics-based simulation tool designed for aerospace engineers and researchers working on low-gravity vehicle control systems. It models the steering dynamics of wheeled vehicles operating in reduced gravity environments like the Moon (1.62 m/s²) and Mars (3.71 m/s²).
                  </p>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-800">How It Works</h3>
                  <div className="text-sm text-gray-700 space-y-2">
                    <p><strong>Physics Model:</strong> Calculations are handled by a Python backend engine (PhyVista) utilizing NumPy for high-precision dynamics.</p>
                    <p><strong>PID Controller:</strong> A Proportional-Integral-Derivative controller automatically adjusts steering to track the target angle you set. Tune Kp, Ki, and Kd parameters for optimal response.</p>
                    <p><strong>Friction Limit:</strong> When friction utilization exceeds 100%, the wheels slip and the vehicle loses directional control - critical in low-gravity scenarios.</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg mb-2 text-gray-800">Quick Start Guide</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 ml-2">
                    <li>Select your gravity environment (Earth/Mars/Moon)</li>
                    <li>Set target steering angle and vehicle velocity</li>
                    <li>Adjust mass and friction coefficient to match your vehicle</li>
                    <li>Click START to run the simulation</li>
                    <li>Monitor real-time telemetry in the control panel</li>
                    <li>Switch to Analysis tab to view performance graphs</li>
                  </ol>
                </div>
              </div>
              
              <div className={`px-4 py-3 flex justify-end ${theme === 'vista' ? 'bg-gradient-to-b from-gray-200 to-gray-300 border-t-2 border-gray-400' : 'bg-white border-t-2 border-black'}`}>
                <button 
                  onClick={() => setShowHelpDialog(false)}
                  className={`px-4 py-2 text-xs font-bold ${theme === 'vista' ? 'bg-gradient-to-b from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 border-2 border-gray-500 rounded text-gray-800 shadow-md active:shadow-inner' : 'bg-white border-2 border-black text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3)] hover:bg-gray-100'}`}
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* External Info Panel */}
        <div className={`mt-4 p-4 ${theme === 'vista' ? 'bg-white rounded border-2 border-gray-400 shadow-lg' : 'bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]'}`}>
          <h3 className={`font-bold text-sm mb-2 uppercase tracking-wide ${theme === 'vista' ? 'text-gray-800' : 'text-black'}`}>System Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className={`p-2 ${theme === 'vista' ? 'bg-gray-100 rounded border border-gray-300' : 'bg-white border-2 border-black'}`}>
              <div className={`${theme === 'vista' ? 'text-gray-600 font-semibold' : 'text-black font-bold'}`}>Simulation Time</div>
              <div className="font-mono text-lg">{time.toFixed(1)}s</div>
            </div>
            <div className={`p-2 ${theme === 'vista' ? 'bg-gray-100 rounded border border-gray-300' : 'bg-white border-2 border-black'}`}>
              <div className={`${theme === 'vista' ? 'text-gray-600 font-semibold' : 'text-black font-bold'}`}>Data Points</div>
              <div className="font-mono text-lg">{historyData.length}/100</div>
            </div>
            <div className={`p-2 ${theme === 'vista' ? 'bg-gray-100 rounded border border-gray-300' : 'bg-white border-2 border-black'}`}>
              <div className={`${theme === 'vista' ? 'text-gray-600 font-semibold' : 'text-black font-bold'}`}>Turn Radius</div>
              <div className="font-mono text-lg">{turnRadius > 10000 ? '∞' : turnRadius.toFixed(1) + 'm'}</div>
            </div>
            <div className={`p-2 flex items-center justify-between ${theme === 'vista' ? 'bg-gray-100 rounded border border-gray-300' : 'bg-white border-2 border-black'}`}>
              <div>
                <div className={`${theme === 'vista' ? 'text-gray-600 font-semibold' : 'text-black font-bold'}`}>Backend Status</div>
                <div className="font-mono text-lg">{simulationId ? "Connected" : "Connecting..."}</div>
              </div>
              <div className={`w-4 h-4 ${theme === 'vista' ? 'rounded-full shadow-inner' : 'border-2 border-black'} ${simulationId ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GravitySteeringSim;
