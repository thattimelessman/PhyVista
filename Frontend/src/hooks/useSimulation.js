import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://phyvista-backend.onrender.com';
const API_V1 = `${API_BASE}/api/v1`;

const EARTH_GRAVITY = 9.81;
const MOON_GRAVITY = 1.62;
const MARS_GRAVITY = 3.71;

export default function useSimulation() {
  const socketRef = useRef(null);
  const [simulationId, setSimulationId] = useState(null);
  const [gravity, setGravity] = useState(EARTH_GRAVITY);
  const [mass, setMass] = useState(500);
  const [velocity, setVelocity] = useState(10);
  const [steeringAngle, setSteeringAngle] = useState(0);
  const [targetAngle, setTargetAngle] = useState(15);
  const [frictionCoeff, setFrictionCoeff] = useState(0.7);
  const [propulsionForce, setPropulsionForce] = useState(2000);
  const [kp, setKp] = useState(0.5);
  const [ki, setKi] = useState(0.1);
  const [kd, setKd] = useState(0.2);
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [historyData, setHistoryData] = useState([]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [heading, setHeading] = useState(0);
  const [angularVelocity, setAngularVelocity] = useState(0);
  const [turnRadius, setTurnRadius] = useState(Infinity);
  const [normalForce, setNormalForce] = useState(0);
  const [maxFriction, setMaxFriction] = useState(0);
  const [centripetalReq, setCentripetalReq] = useState(0);

  useEffect(() => {
    const initSim = async () => {
      try {
        const response = await fetch(`${API_V1}/simulation/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mass, gravity, friction_coefficient: frictionCoeff,
            initial_velocity: velocity, dt: 0.1,
            pid_gains: { kp, ki, kd }
          })
        });
        const data = await response.json();
        setSimulationId(data.simulation_id);
        setNormalForce(mass * gravity);
        setMaxFriction(mass * gravity * frictionCoeff);
      } catch (error) {
        console.error("Failed to initialize backend simulation", error);
      }
    };
    initSim();
  }, []);

  const handleStepResult = (nextData) => {
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
  };

  useEffect(() => {
    if (isRunning && simulationId) {
      const socket = io(API_BASE);
      socketRef.current = socket;
      socket.on('connect', () => {
        socket.emit('start_step', { simulation_id: simulationId, target_angle: targetAngle });
      });
      socket.on('step_result', (data) => {
        handleStepResult(data);
        setTimeout(() => {
          socket.emit('start_step', { simulation_id: simulationId, target_angle: targetAngle });
        }, 80);
      });
      socket.on('error', (err) => {
        console.error('Socket error:', err);
        setIsRunning(false);
      });
      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [isRunning, simulationId, targetAngle]);

  const updateBackendParam = async (paramObj) => {
    if (!simulationId) return;
    try {
      await fetch(`${API_V1}/simulation/${simulationId}/update_params`, {
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
      await fetch(`${API_V1}/simulation/${simulationId}/reset`, {
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
    const map = { earth: EARTH_GRAVITY, mars: MARS_GRAVITY, moon: MOON_GRAVITY };
    const newG = map[preset] || EARTH_GRAVITY;
    setGravity(newG);
    updateBackendParam({ gravity: newG });
  };

  const loadPreset = (presetName, closeMenu) => {
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
    if (closeMenu) closeMenu();
  };

  const exportData = (closeMenu) => {
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
    if (closeMenu) closeMenu();
  };

  const saveConfig = (closeMenu) => {
    const config = {
      gravity, mass, velocity, targetAngle, frictionCoeff, propulsionForce,
      kp, ki, kd, timestamp: new Date().toISOString(),
      gravityType: gravity === EARTH_GRAVITY ? 'Earth' : gravity === MARS_GRAVITY ? 'Mars' : 'Moon'
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steering_config_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (closeMenu) closeMenu();
  };

  return {
    simulationId, gravity, mass, velocity, steeringAngle, targetAngle,
    frictionCoeff, propulsionForce, kp, ki, kd, isRunning, time,
    historyData, position, heading, angularVelocity, turnRadius,
    normalForce, maxFriction, centripetalReq,
    EARTH_GRAVITY, MOON_GRAVITY, MARS_GRAVITY,
    setMass, setVelocity, setTargetAngle, setFrictionCoeff,
    setPropulsionForce, setKp, setKi, setKd, setIsRunning,
    resetSimulation, setGravityPreset, loadPreset, exportData,
    saveConfig, updateBackendParam,
  };
}