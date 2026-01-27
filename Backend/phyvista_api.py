"""
PhyVista Flask API Server
REST API for interfacing with the physics simulation backend
Optimized version with bug fixes and performance improvements
"""
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from typing import Dict, Optional, List, Any
import uuid
from functools import wraps
import logging

# Import from the physics engine (assumes phyvista_backend.py is in same directory)
from phyvista_backend import (
    Simulation, PhysicsParameters, PIDController, 
    GravityEnvironment, VehicleState
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Store active simulations (in production, use Redis or database)
active_simulations: Dict[str, Simulation] = {}

# Constants
MAX_SIMULATIONS = 100  # Prevent memory overflow
MAX_DURATION = 300.0  # Max simulation duration in seconds
MAX_PARAMETER_SWEEP_VALUES = 50  # Limit parameter sweep size


# --- OPTIMIZED JSON ENCODER ---
from flask.json.provider import DefaultJSONProvider

class NumpyProvider(DefaultJSONProvider):
    """Custom JSON provider to handle NumPy types efficiently"""
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (np.floating, np.float32, np.float64)):
            return float(obj)
        if isinstance(obj, (np.integer, np.int32, np.int64)):
            return int(obj)
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, np.complexfloating):
            return {'real': float(obj.real), 'imag': float(obj.imag)}
        return super().default(obj)

app.json = NumpyProvider(app)
# ----------------------------


# --- ERROR HANDLING DECORATORS ---
def handle_errors(f):
    """Decorator for consistent error handling"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except KeyError as e:
            logger.error(f"KeyError in {f.__name__}: {str(e)}")
            return jsonify({'error': f'Missing required field: {str(e)}'}), 400
        except ValueError as e:
            logger.error(f"ValueError in {f.__name__}: {str(e)}")
            return jsonify({'error': f'Invalid value: {str(e)}'}), 400
        except TypeError as e:
            logger.error(f"TypeError in {f.__name__}: {str(e)}")
            return jsonify({'error': f'Type error: {str(e)}'}), 400
        except Exception as e:
            logger.error(f"Unexpected error in {f.__name__}: {str(e)}", exc_info=True)
            return jsonify({'error': f'Internal server error: {str(e)}'}), 500
    return decorated_function


def validate_simulation_exists(f):
    """Decorator to validate simulation exists"""
    @wraps(f)
    def decorated_function(sim_id: str, *args, **kwargs):
        if sim_id not in active_simulations:
            return jsonify({'error': 'Simulation not found'}), 404
        return f(sim_id, *args, **kwargs)
    return decorated_function
# ----------------------------


# --- VALIDATION FUNCTIONS ---
def validate_positive_number(value: float, name: str, allow_zero: bool = False) -> None:
    """Validate that a number is positive"""
    if allow_zero and value < 0:
        raise ValueError(f"{name} must be non-negative, got {value}")
    elif not allow_zero and value <= 0:
        raise ValueError(f"{name} must be positive, got {value}")


def validate_range(value: float, name: str, min_val: float, max_val: float) -> None:
    """Validate that a value is within a range"""
    if not min_val <= value <= max_val:
        raise ValueError(f"{name} must be between {min_val} and {max_val}, got {value}")


def parse_gravity(gravity_input) -> float:
    """Parse gravity input (string or number) and validate"""
    if isinstance(gravity_input, str):
        gravity_upper = gravity_input.upper()
        if not hasattr(GravityEnvironment, gravity_upper):
            raise ValueError(f"Invalid gravity preset: {gravity_input}. "
                           f"Valid options: {', '.join([e.name for e in GravityEnvironment])}")
        return GravityEnvironment[gravity_upper].value
    elif isinstance(gravity_input, (int, float)):
        validate_positive_number(gravity_input, "gravity")
        return float(gravity_input)
    else:
        raise TypeError(f"Gravity must be string or number, got {type(gravity_input)}")
# ----------------------------


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'active_simulations': len(active_simulations),
        'max_simulations': MAX_SIMULATIONS
    })


@app.route('/api/simulation/create', methods=['POST'])
@handle_errors
def create_simulation():
    """
    Create a new simulation instance
    
    Request body:
    {
        "mass": 500,
        "gravity": 1.62,  // or "MOON", "MARS", "EARTH"
        "friction_coefficient": 0.7,
        "wheelbase": 2.5,
        "max_steering_angle": 45,
        "initial_velocity": 10.0,
        "dt": 0.01,
        "pid_gains": {
            "kp": 0.5,
            "ki": 0.1,
            "kd": 0.2
        }
    }
    
    Returns:
    {
        "simulation_id": "uuid-string",
        "status": "created"
    }
    """
    # Check simulation limit
    if len(active_simulations) >= MAX_SIMULATIONS:
        return jsonify({
            'error': f'Maximum number of simulations ({MAX_SIMULATIONS}) reached. '
                    'Please delete some simulations first.'
        }), 429
    
    data = request.json
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    # Parse and validate parameters
    mass = float(data.get('mass', 500.0))
    validate_positive_number(mass, "mass")
    
    gravity_input = data.get('gravity', 9.81)
    gravity = parse_gravity(gravity_input)
    
    friction_coefficient = float(data.get('friction_coefficient', 0.7))
    validate_range(friction_coefficient, "friction_coefficient", 0.0, 2.0)
    
    wheelbase = float(data.get('wheelbase', 2.5))
    validate_positive_number(wheelbase, "wheelbase")
    
    max_steering_angle = float(data.get('max_steering_angle', 45.0))
    validate_range(max_steering_angle, "max_steering_angle", 0.0, 90.0)
    
    initial_velocity = float(data.get('initial_velocity', 10.0))
    validate_positive_number(initial_velocity, "initial_velocity", allow_zero=True)
    
    dt = float(data.get('dt', 0.01))
    validate_range(dt, "dt", 0.0001, 1.0)
    
    # Create physics parameters
    params = PhysicsParameters(
        mass=mass,
        gravity=gravity,
        friction_coefficient=friction_coefficient,
        wheelbase=wheelbase,
        max_steering_angle=max_steering_angle
    )
    
    # Parse and validate PID gains
    pid_gains = data.get('pid_gains', {})
    kp = float(pid_gains.get('kp', 0.5))
    ki = float(pid_gains.get('ki', 0.1))
    kd = float(pid_gains.get('kd', 0.2))
    
    validate_positive_number(kp, "kp", allow_zero=True)
    validate_positive_number(ki, "ki", allow_zero=True)
    validate_positive_number(kd, "kd", allow_zero=True)
    
    # Create PID controller
    controller = PIDController(kp=kp, ki=ki, kd=kd)
    
    # Create simulation
    sim = Simulation(
        params=params,
        controller=controller,
        initial_velocity=initial_velocity,
        dt=dt
    )
    
    # Generate unique ID and store
    sim_id = str(uuid.uuid4())
    active_simulations[sim_id] = sim
    
    logger.info(f"Created simulation {sim_id}")
    
    return jsonify({
        'simulation_id': sim_id,
        'status': 'created',
        'parameters': {
            'mass': params.mass,
            'gravity': params.gravity,
            'friction_coefficient': params.friction_coefficient,
            'wheelbase': params.wheelbase,
            'max_steering_angle': params.max_steering_angle,
            'initial_velocity': initial_velocity,
            'dt': dt,
            'pid_gains': {
                'kp': kp,
                'ki': ki,
                'kd': kd
            }
        }
    }), 201


@app.route('/api/simulation/<sim_id>/step', methods=['POST'])
@handle_errors
@validate_simulation_exists
def step_simulation(sim_id: str):
    """
    Execute one simulation step
    
    Request body:
    {
        "target_angle": 15.0  // degrees
    }
    
    Returns current state and diagnostics
    """
    sim = active_simulations[sim_id]
    data = request.json or {}
    
    # Update target angle if provided
    if 'target_angle' in data:
        target_angle = float(data['target_angle'])
        validate_range(target_angle, "target_angle", -90.0, 90.0)
        sim.target_angle = target_angle
    
    # Execute step
    result = sim.step()
    
    return jsonify(result)


@app.route('/api/simulation/<sim_id>/run', methods=['POST'])
@handle_errors
@validate_simulation_exists
def run_simulation(sim_id: str):
    """
    Run simulation for specified duration
    
    Request body:
    {
        "duration": 10.0,  // seconds
        "target_angle": 15.0  // degrees
    }
    
    Returns list of all states
    """
    sim = active_simulations[sim_id]
    data = request.json or {}
    
    duration = float(data.get('duration', 10.0))
    validate_range(duration, "duration", 0.0, MAX_DURATION)
    
    target_angle = float(data.get('target_angle', 0.0))
    validate_range(target_angle, "target_angle", -90.0, 90.0)
    
    logger.info(f"Running simulation {sim_id} for {duration}s with target {target_angle}°")
    
    results = sim.run(duration, target_angle)
    
    return jsonify({
        'results': results,
        'summary': sim.get_summary_statistics(),
        'total_steps': len(results)
    })


@app.route('/api/simulation/<sim_id>/reset', methods=['POST'])
@handle_errors
@validate_simulation_exists
def reset_simulation(sim_id: str):
    """
    Reset simulation to initial state
    
    Request body (optional):
    {
        "initial_velocity": 15.0
    }
    """
    sim = active_simulations[sim_id]
    data = request.json or {}
    
    initial_velocity = None
    if 'initial_velocity' in data:
        initial_velocity = float(data['initial_velocity'])
        validate_positive_number(initial_velocity, "initial_velocity", allow_zero=True)
    
    sim.reset(initial_velocity=initial_velocity)
    
    logger.info(f"Reset simulation {sim_id}")
    
    return jsonify({
        'status': 'reset',
        'state': sim.state.to_dict()
    })


@app.route('/api/simulation/<sim_id>/update_params', methods=['PUT'])
@handle_errors
@validate_simulation_exists
def update_parameters(sim_id: str):
    """
    Update simulation parameters
    
    Request body:
    {
        "velocity": 15.0,
        "mass": 600.0,
        "friction_coefficient": 0.8,
        "gravity": 9.81,
        "pid_gains": {
            "kp": 0.7,
            "ki": 0.15,
            "kd": 0.25
        }
    }
    """
    sim = active_simulations[sim_id]
    data = request.json
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    # Update velocity
    if 'velocity' in data:
        velocity = float(data['velocity'])
        validate_positive_number(velocity, "velocity", allow_zero=True)
        sim.state.velocity = velocity
    
    # Update physics parameters
    if 'mass' in data:
        mass = float(data['mass'])
        validate_positive_number(mass, "mass")
        sim.params.mass = mass
    
    if 'friction_coefficient' in data:
        friction = float(data['friction_coefficient'])
        validate_range(friction, "friction_coefficient", 0.0, 2.0)
        sim.params.friction_coefficient = friction
    
    if 'gravity' in data:
        gravity = parse_gravity(data['gravity'])
        sim.params.gravity = gravity
    
    # Update PID gains
    if 'pid_gains' in data:
        gains = data['pid_gains']
        kp = float(gains.get('kp', sim.controller.kp))
        ki = float(gains.get('ki', sim.controller.ki))
        kd = float(gains.get('kd', sim.controller.kd))
        
        validate_positive_number(kp, "kp", allow_zero=True)
        validate_positive_number(ki, "ki", allow_zero=True)
        validate_positive_number(kd, "kd", allow_zero=True)
        
        sim.controller.set_gains(kp, ki, kd)
    
    logger.info(f"Updated parameters for simulation {sim_id}")
    
    return jsonify({
        'status': 'updated',
        'parameters': {
            'mass': sim.params.mass,
            'gravity': sim.params.gravity,
            'friction_coefficient': sim.params.friction_coefficient,
            'velocity': sim.state.velocity,
            'pid_gains': {
                'kp': sim.controller.kp,
                'ki': sim.controller.ki,
                'kd': sim.controller.kd
            }
        }
    })


@app.route('/api/simulation/<sim_id>/history', methods=['GET'])
@handle_errors
@validate_simulation_exists
def get_history(sim_id: str):
    """Get complete simulation history"""
    sim = active_simulations[sim_id]
    
    return jsonify({
        'history': [state.to_dict() for state in sim.history],
        'summary': sim.get_summary_statistics(),
        'total_steps': len(sim.history)
    })


@app.route('/api/simulation/<sim_id>/statistics', methods=['GET'])
@handle_errors
@validate_simulation_exists
def get_statistics(sim_id: str):
    """Get summary statistics"""
    sim = active_simulations[sim_id]
    
    return jsonify(sim.get_summary_statistics())


@app.route('/api/simulation/<sim_id>', methods=['DELETE'])
@handle_errors
@validate_simulation_exists
def delete_simulation(sim_id: str):
    """Delete simulation instance"""
    del active_simulations[sim_id]
    
    logger.info(f"Deleted simulation {sim_id}")
    
    return jsonify({'status': 'deleted', 'simulation_id': sim_id})


@app.route('/api/simulation/list', methods=['GET'])
def list_simulations():
    """List all active simulations"""
    simulations = []
    for sim_id, sim in active_simulations.items():
        simulations.append({
            'simulation_id': sim_id,
            'current_time': sim.current_time,
            'total_steps': len(sim.history),
            'velocity': sim.state.velocity,
            'mass': sim.params.mass,
            'gravity': sim.params.gravity
        })
    
    return jsonify({
        'simulations': simulations,
        'total_count': len(simulations)
    })


@app.route('/api/presets/gravity', methods=['GET'])
def get_gravity_presets():
    """Get available gravity environment presets"""
    return jsonify({
        'presets': {
            env.name: env.value 
            for env in GravityEnvironment
        }
    })


@app.route('/api/presets/pid', methods=['GET'])
def get_pid_presets():
    """Get PID tuning presets"""
    return jsonify({
        'presets': {
            'aggressive': {'kp': 1.5, 'ki': 0.3, 'kd': 0.5},
            'balanced': {'kp': 0.5, 'ki': 0.1, 'kd': 0.2},
            'smooth': {'kp': 0.2, 'ki': 0.05, 'kd': 0.1}
        }
    })


@app.route('/api/analysis/parameter_sweep', methods=['POST'])
@handle_errors
def parameter_sweep():
    """
    Run parameter sweep analysis
    
    Request body:
    {
        "parameter": "friction_coefficient",  // or "mass", "gravity", etc.
        "values": [0.3, 0.5, 0.7, 0.9],
        "duration": 10.0,
        "target_angle": 15.0,
        "base_config": {
            "mass": 500,
            "gravity": 1.62,
            ...
        }
    }
    """
    data = request.json
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    parameter = data.get('parameter')
    if not parameter:
        return jsonify({'error': 'Parameter name is required'}), 400
    
    values = data.get('values', [])
    if not values or not isinstance(values, list):
        return jsonify({'error': 'Values array is required'}), 400
    
    if len(values) > MAX_PARAMETER_SWEEP_VALUES:
        return jsonify({
            'error': f'Too many values. Maximum is {MAX_PARAMETER_SWEEP_VALUES}'
        }), 400
    
    duration = float(data.get('duration', 10.0))
    validate_range(duration, "duration", 0.0, MAX_DURATION)
    
    target_angle = float(data.get('target_angle', 15.0))
    validate_range(target_angle, "target_angle", -90.0, 90.0)
    
    base_config = data.get('base_config', {})
    
    results = []
    
    logger.info(f"Starting parameter sweep: {parameter} with {len(values)} values")
    
    for idx, value in enumerate(values):
        try:
            # Create temporary simulation with modified parameter
            config = base_config.copy()
            config[parameter] = value
            
            # Parse gravity if needed
            gravity_val = config.get('gravity', 1.62)
            if isinstance(gravity_val, str):
                gravity_val = parse_gravity(gravity_val)
            
            params = PhysicsParameters(
                mass=float(config.get('mass', 500.0)),
                gravity=gravity_val,
                friction_coefficient=float(config.get('friction_coefficient', 0.7)),
                wheelbase=float(config.get('wheelbase', 2.5)),
                max_steering_angle=float(config.get('max_steering_angle', 45.0))
            )
            
            pid_config = config.get('pid_gains', {})
            controller = PIDController(
                kp=float(pid_config.get('kp', 0.5)),
                ki=float(pid_config.get('ki', 0.1)),
                kd=float(pid_config.get('kd', 0.2))
            )
            
            initial_vel = float(config.get('initial_velocity', 10.0))
            dt = float(config.get('dt', 0.01))
            
            sim = Simulation(params, controller, initial_velocity=initial_vel, dt=dt)
            
            # Run simulation
            sim.run(duration, target_angle)
            stats = sim.get_summary_statistics()
            
            results.append({
                'parameter_value': value,
                'statistics': stats
            })
            
            logger.info(f"Completed sweep iteration {idx + 1}/{len(values)}")
            
        except Exception as e:
            logger.error(f"Error in sweep iteration {idx + 1}: {str(e)}")
            results.append({
                'parameter_value': value,
                'error': str(e)
            })
    
    return jsonify({
        'parameter': parameter,
        'results': results,
        'total_iterations': len(values),
        'successful_iterations': len([r for r in results if 'error' not in r])
    })


# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}", exc_info=True)
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("PhyVista API Server Starting...")
    print("=" * 60)
    print("\nAvailable endpoints:")
    print("  GET    /api/health")
    print("  POST   /api/simulation/create")
    print("  GET    /api/simulation/list")
    print("  POST   /api/simulation/<id>/step")
    print("  POST   /api/simulation/<id>/run")
    print("  POST   /api/simulation/<id>/reset")
    print("  PUT    /api/simulation/<id>/update_params")
    print("  GET    /api/simulation/<id>/history")
    print("  GET    /api/simulation/<id>/statistics")
    print("  DELETE /api/simulation/<id>")
    print("  GET    /api/presets/gravity")
    print("  GET    /api/presets/pid")
    print("  POST   /api/analysis/parameter_sweep")
    print("\n" + "=" * 60)
    print(f"Server running on http://localhost:5000")
    print(f"Maximum simulations: {MAX_SIMULATIONS}")
    print(f"Maximum duration: {MAX_DURATION}s")
    print("=" * 60 + "\n")
    
    app.run(debug=True, port=5000)