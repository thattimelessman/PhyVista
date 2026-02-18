"""
PhyVista - Low-Gravity Vehicle Steering Simulation Backend
A physics-based simulation engine for studying vehicle dynamics under varying gravity conditions.
Optimized version with bug fixes and improved physics calculations
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
import json
from enum import Enum
import warnings


class GravityEnvironment(Enum):
    """Predefined gravity environments"""
    EARTH = 9.81
    MARS = 3.71
    MOON = 1.62
    CUSTOM = 0.0


@dataclass
class VehicleState:
    """Represents the complete state of the vehicle at a given time"""
    time: float
    position: np.ndarray  # [x, y] in meters
    velocity: float  # m/s
    heading: float  # radians
    steering_angle: float  # degrees
    angular_velocity: float  # rad/s
    
    def __post_init__(self):
        """Validate state after initialization"""
        if not isinstance(self.position, np.ndarray):
            self.position = np.array(self.position, dtype=np.float64)
        elif self.position.dtype != np.float64:
            self.position = self.position.astype(np.float64)
        
        # Ensure position is 1D array with 2 elements
        if self.position.shape != (2,):
            raise ValueError(f"Position must be 2D array, got shape {self.position.shape}")
    
    def to_dict(self) -> Dict:
        """Convert state to dictionary for JSON serialization"""
        return {
            'time': float(self.time),
            'position_x': float(self.position[0]),
            'position_y': float(self.position[1]),
            'velocity': float(self.velocity),
            'heading_deg': float(np.degrees(self.heading)),
            'heading_rad': float(self.heading),
            'steering_angle': float(self.steering_angle),
            'angular_velocity_rad': float(self.angular_velocity),
            'angular_velocity_deg': float(np.degrees(self.angular_velocity))
        }
    
    def copy(self) -> 'VehicleState':
        """Create a deep copy of the state"""
        return VehicleState(
            time=self.time,
            position=self.position.copy(),
            velocity=self.velocity,
            heading=self.heading,
            steering_angle=self.steering_angle,
            angular_velocity=self.angular_velocity
        )


@dataclass
class PhysicsParameters:
    """Physical parameters of the vehicle and environment"""
    mass: float  # kg
    gravity: float  # m/s²
    friction_coefficient: float  # dimensionless
    wheelbase: float  # meters
    max_steering_angle: float  # degrees
    
    def __post_init__(self):
        """Validate parameters"""
        if self.mass <= 0:
            raise ValueError(f"Mass must be positive, got {self.mass}")
        if self.gravity < 0:
            raise ValueError(f"Gravity must be non-negative, got {self.gravity}")
        if self.friction_coefficient < 0:
            raise ValueError(f"Friction coefficient must be non-negative, got {self.friction_coefficient}")
        if self.wheelbase <= 0:
            raise ValueError(f"Wheelbase must be positive, got {self.wheelbase}")
        if not 0 <= self.max_steering_angle <= 90:
            raise ValueError(f"Max steering angle must be between 0 and 90 degrees, got {self.max_steering_angle}")
    
    def normal_force(self) -> float:
        """Calculate normal force: N = mg"""
        return self.mass * self.gravity
    
    def max_friction_force(self) -> float:
        """Calculate maximum friction force: F_max = μN"""
        return self.friction_coefficient * self.normal_force()


class PIDController:
    """PID controller for steering angle tracking with anti-windup"""
    
    def __init__(self, kp: float = 0.5, ki: float = 0.1, kd: float = 0.2, 
                 integral_limit: float = 100.0, output_limit: float = 500.0):
        """
        Initialize PID controller
        
        Args:
            kp: Proportional gain
            ki: Integral gain
            kd: Derivative gain
            integral_limit: Anti-windup limit for integral term
            output_limit: Maximum output magnitude (deg/s)
        """
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.integral_limit = integral_limit
        self.output_limit = output_limit
        
        self.integral = 0.0
        self.prev_error = 0.0
        self.prev_time = 0.0
        self.first_call = True
    
    def compute(self, target: float, current: float, time: float) -> float:
        """
        Compute PID control signal
        
        Args:
            target: Desired steering angle (degrees)
            current: Current steering angle (degrees)
            time: Current simulation time (seconds)
        
        Returns:
            Control signal (degrees/second)
        """
        error = target - current
        
        # Calculate time step
        if self.first_call:
            dt = 0.01  # Default dt for first call
            self.first_call = False
        else:
            dt = time - self.prev_time
            if dt <= 0:
                # Prevent division by zero or negative dt
                warnings.warn(f"Invalid time step: {dt}, using 0.01")
                dt = 0.01
        
        # Proportional term
        p_term = self.kp * error
        
        # Integral term with anti-windup
        self.integral += error * dt
        self.integral = np.clip(self.integral, -self.integral_limit, self.integral_limit)
        i_term = self.ki * self.integral
        
        # Derivative term with derivative kick prevention
        if dt > 0:
            derivative = (error - self.prev_error) / dt
        else:
            derivative = 0.0
        d_term = self.kd * derivative
        
        # Compute output with saturation
        output = p_term + i_term + d_term
        output = np.clip(output, -self.output_limit, self.output_limit)
        
        # Update state
        self.prev_error = error
        self.prev_time = time
        
        return output
    
    def reset(self):
        """Reset controller state"""
        self.integral = 0.0
        self.prev_error = 0.0
        self.prev_time = 0.0
        self.first_call = True
    
    def set_gains(self, kp: float, ki: float, kd: float):
        """Update PID gains"""
        self.kp = kp
        self.ki = ki
        self.kd = kd


class VehicleDynamics:
    """Physics engine for vehicle dynamics simulation using bicycle model"""
    
    def __init__(self, params: PhysicsParameters):
        self.params = params
        self._epsilon = 1e-8  # Small value to prevent division by zero
    
    def calculate_turn_radius(self, steering_angle_deg: float) -> float:
        """
        Calculate turn radius using bicycle model
        R = L / tan(δ)
        
        Args:
            steering_angle_deg: Steering angle in degrees
        
        Returns:
            Turn radius in meters (inf for straight motion)
        """
        angle_rad = np.radians(steering_angle_deg)
        
        # Use epsilon to prevent division issues
        if abs(angle_rad) < self._epsilon:
            return np.inf
        
        tan_angle = np.tan(angle_rad)
        if abs(tan_angle) < self._epsilon:
            return np.inf
            
        return self.params.wheelbase / tan_angle
    
    def calculate_centripetal_force(self, velocity: float, turn_radius: float) -> float:
        """
        Calculate required centripetal force
        F_c = mv²/r
        
        Args:
            velocity: Vehicle velocity (m/s)
            turn_radius: Turn radius (m)
        
        Returns:
            Required centripetal force (N)
        """
        if not np.isfinite(turn_radius) or abs(turn_radius) < self._epsilon:
            return 0.0
        
        return (self.params.mass * velocity ** 2) / turn_radius
    
    def calculate_max_safe_velocity(self, steering_angle_deg: float) -> float:
        """
        Calculate maximum safe velocity for given steering angle without slipping
        v_max = sqrt(μgR)
        
        Args:
            steering_angle_deg: Steering angle (degrees)
        
        Returns:
            Maximum safe velocity (m/s)
        """
        turn_radius = self.calculate_turn_radius(steering_angle_deg)
        
        if not np.isfinite(turn_radius):
            return np.inf
        
        max_friction = self.params.max_friction_force()
        if max_friction <= 0:
            return 0.0
        
        # v_max = sqrt((μmg * r) / m) = sqrt(μgr)
        max_velocity = np.sqrt(self.params.friction_coefficient * 
                              self.params.gravity * abs(turn_radius))
        
        return max_velocity
    
    def check_slip_condition(self, velocity: float, steering_angle_deg: float) -> Tuple[bool, float]:
        """
        Check if vehicle will slip during turn
        
        Args:
            velocity: Current velocity (m/s)
            steering_angle_deg: Steering angle (degrees)
        
        Returns:
            Tuple of (can_turn_without_slip, friction_utilization_percent)
        """
        turn_radius = self.calculate_turn_radius(steering_angle_deg)
        required_force = self.calculate_centripetal_force(velocity, turn_radius)
        max_force = self.params.max_friction_force()
        
        if max_force < self._epsilon:
            # No friction available
            if required_force < self._epsilon:
                return True, 0.0  # No force needed, no slip
            else:
                return False, 100.0  # Force needed but no friction
        
        friction_utilization = (required_force / max_force) * 100.0
        can_turn = required_force <= max_force
        
        return can_turn, min(friction_utilization, 100.0)
    
    def update_state(self, state: VehicleState, dt: float, steering_input: float) -> VehicleState:
        """
        Update vehicle state using numerical integration (Improved Euler method)
        
        Args:
            state: Current vehicle state
            dt: Time step (seconds)
            steering_input: Steering angle rate from controller (deg/s)
        
        Returns:
            New vehicle state
        """
        # Validate inputs
        if dt <= 0:
            raise ValueError(f"Time step must be positive, got {dt}")
        
        # Update steering angle with rate limiting and saturation
        new_steering = state.steering_angle + steering_input * dt
        new_steering = np.clip(new_steering, 
                              -self.params.max_steering_angle, 
                              self.params.max_steering_angle)
        
        # Calculate turn radius and check slip
        turn_radius = self.calculate_turn_radius(new_steering)
        can_turn, friction_util = self.check_slip_condition(state.velocity, new_steering)
        
        # Calculate angular velocity based on slip condition
        if np.isfinite(turn_radius) and abs(turn_radius) > self._epsilon:
            if can_turn:
                # No slip: use kinematic relationship ω = v/R
                angular_velocity = state.velocity / turn_radius
            else:
                # Slipping: limited by maximum friction force
                # Maximum lateral acceleration: a_max = μg
                # ω_max = a_max / v = μg / v
                if state.velocity > self._epsilon:
                    max_angular_vel = (self.params.friction_coefficient * 
                                     self.params.gravity) / state.velocity
                    # Apply direction based on steering
                    angular_velocity = max_angular_vel * np.sign(new_steering)
                else:
                    angular_velocity = 0.0
        else:
            # Straight line motion
            angular_velocity = 0.0
        
        # Update heading using semi-implicit Euler
        new_heading = state.heading + angular_velocity * dt
        
        # Normalize heading to [-π, π]
        new_heading = np.arctan2(np.sin(new_heading), np.cos(new_heading))
        
        # Update position using updated heading (improved accuracy)
        # Use midpoint method for better accuracy
        mid_heading = state.heading + 0.5 * angular_velocity * dt
        new_x = state.position[0] + state.velocity * np.cos(mid_heading) * dt
        new_y = state.position[1] + state.velocity * np.sin(mid_heading) * dt
        
        return VehicleState(
            time=state.time + dt,
            position=np.array([new_x, new_y], dtype=np.float64),
            velocity=state.velocity,
            heading=new_heading,
            steering_angle=new_steering,
            angular_velocity=angular_velocity
        )


class Simulation:
    """Main simulation controller with enhanced diagnostic and error handling"""
    
    def __init__(self, params: PhysicsParameters, controller: PIDController,
                 initial_velocity: float = 10.0, dt: float = 0.01):
        """
        Initialize simulation
        
        Args:
            params: Physics parameters
            controller: PID controller instance
            initial_velocity: Initial vehicle velocity (m/s)
            dt: Simulation time step (seconds)
        """
        if dt <= 0:
            raise ValueError(f"Time step must be positive, got {dt}")
        if dt > 1.0:
            warnings.warn(f"Large time step ({dt}s) may cause numerical instability")
        if initial_velocity < 0:
            raise ValueError(f"Initial velocity must be non-negative, got {initial_velocity}")
        
        self.params = params
        self.controller = controller
        self.dynamics = VehicleDynamics(params)
        self.dt = dt
        self.initial_velocity = initial_velocity
        
        # Initialize state
        self.state = VehicleState(
            time=0.0,
            position=np.array([0.0, 0.0], dtype=np.float64),
            velocity=initial_velocity,
            heading=0.0,
            steering_angle=0.0,
            angular_velocity=0.0
        )
        
        self.target_angle = 0.0
        self.history: List[VehicleState] = []
        self.current_time = 0.0  # Track current simulation time
    
    def step(self) -> Dict:
        """
        Execute one simulation step
        
        Returns:
            Dictionary with current state and diagnostics
        """
        # Compute control signal
        control_signal = self.controller.compute(
            self.target_angle, 
            self.state.steering_angle, 
            self.state.time
        )
        
        # Update physics
        self.state = self.dynamics.update_state(self.state, self.dt, control_signal)
        self.current_time = self.state.time
        
        # Store history (deep copy to prevent reference issues)
        self.history.append(self.state.copy())
        
        # Calculate diagnostics
        can_turn, friction_util = self.dynamics.check_slip_condition(
            self.state.velocity, 
            self.state.steering_angle
        )
        
        turn_radius = self.dynamics.calculate_turn_radius(self.state.steering_angle)
        centripetal_force = self.dynamics.calculate_centripetal_force(
            self.state.velocity, turn_radius
        )
        max_safe_vel = self.dynamics.calculate_max_safe_velocity(self.state.steering_angle)
        
        return {
            'state': self.state.to_dict(),
            'diagnostics': {
                'can_turn': bool(can_turn),
                'friction_utilization': float(friction_util),
                'turn_radius': float(turn_radius) if np.isfinite(turn_radius) else None,
                'normal_force': float(self.params.normal_force()),
                'max_friction_force': float(self.params.max_friction_force()),
                'centripetal_force_required': float(centripetal_force),
                'max_safe_velocity': float(max_safe_vel) if np.isfinite(max_safe_vel) else None,
                'pid_error': float(self.target_angle - self.state.steering_angle),
                'pid_integral': float(self.controller.integral),
                'control_signal': float(control_signal)
            }
        }
    
    def run(self, duration: float, target_angle: float) -> List[Dict]:
        """
        Run simulation for specified duration
        
        Args:
            duration: Simulation duration (seconds)
            target_angle: Target steering angle (degrees)
        
        Returns:
            List of state dictionaries
        """
        if duration <= 0:
            raise ValueError(f"Duration must be positive, got {duration}")
        if not -90 <= target_angle <= 90:
            warnings.warn(f"Target angle {target_angle}° is outside typical range [-90, 90]")
        
        self.target_angle = target_angle
        results = []
        
        steps = int(np.ceil(duration / self.dt))
        
        for i in range(steps):
            try:
                result = self.step()
                results.append(result)
            except Exception as e:
                warnings.warn(f"Error at step {i}: {str(e)}")
                break
        
        return results
    
    def reset(self, initial_velocity: Optional[float] = None):
        """Reset simulation to initial state"""
        velocity = initial_velocity if initial_velocity is not None else self.initial_velocity
        
        if velocity < 0:
            raise ValueError(f"Initial velocity must be non-negative, got {velocity}")
        
        self.state = VehicleState(
            time=0.0,
            position=np.array([0.0, 0.0], dtype=np.float64),
            velocity=velocity,
            heading=0.0,
            steering_angle=0.0,
            angular_velocity=0.0
        )
        
        self.controller.reset()
        self.history.clear()
        self.current_time = 0.0
        self.target_angle = 0.0
    
    def export_history(self, filename: str = 'simulation_data.json'):
        """Export simulation history to JSON"""
        data = {
            'parameters': {
                'mass': float(self.params.mass),
                'gravity': float(self.params.gravity),
                'friction_coefficient': float(self.params.friction_coefficient),
                'wheelbase': float(self.params.wheelbase),
                'max_steering_angle': float(self.params.max_steering_angle),
                'dt': float(self.dt),
                'initial_velocity': float(self.initial_velocity),
                'pid_gains': {
                    'kp': float(self.controller.kp),
                    'ki': float(self.controller.ki),
                    'kd': float(self.controller.kd)
                }
            },
            'history': [state.to_dict() for state in self.history],
            'summary': self.get_summary_statistics()
        }
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        return filename
    
    def get_summary_statistics(self) -> Dict:
        """Calculate summary statistics from simulation history"""
        if not self.history:
            return {
                'total_time': 0.0,
                'total_steps': 0,
                'total_distance': 0.0,
                'final_position': [0.0, 0.0],
                'final_heading_deg': 0.0,
                'mean_steering_error': 0.0,
                'max_steering_error': 0.0,
                'rms_steering_error': 0.0,
                'settling_time': None,
                'overshoot': 0.0,
                'steady_state_error': 0.0
            }
        
        # Calculate path length (total distance traveled)
        path_length = 0.0
        for i in range(1, len(self.history)):
            dx = self.history[i].position[0] - self.history[i-1].position[0]
            dy = self.history[i].position[1] - self.history[i-1].position[1]
            path_length += np.sqrt(dx**2 + dy**2)
        
        # Steering errors
        steering_angles = np.array([s.steering_angle for s in self.history])
        errors = np.array([self.target_angle - s.steering_angle for s in self.history])
        abs_errors = np.abs(errors)
        
        # Calculate steady state error (average of last 10% of simulation)
        steady_state_idx = max(1, int(0.9 * len(errors)))
        steady_state_error = float(np.mean(abs_errors[steady_state_idx:]))
        
        return {
            'total_time': float(self.history[-1].time),
            'total_steps': len(self.history),
            'total_distance': float(np.linalg.norm(self.history[-1].position)),
            'path_length': float(path_length),
            'final_position': [float(self.history[-1].position[0]), 
                             float(self.history[-1].position[1])],
            'final_heading_deg': float(np.degrees(self.history[-1].heading)),
            'final_steering_angle': float(self.history[-1].steering_angle),
            'mean_steering_error': float(np.mean(abs_errors)),
            'max_steering_error': float(np.max(abs_errors)),
            'rms_steering_error': float(np.sqrt(np.mean(errors**2))),
            'settling_time': self._calculate_settling_time(errors.tolist()),
            'overshoot': float(self._calculate_overshoot(steering_angles.tolist())),
            'steady_state_error': steady_state_error
        }
    
    def _calculate_settling_time(self, errors: List[float], threshold: float = 0.5) -> Optional[float]:
        """
        Calculate time to settle within threshold (2% or 5% criterion)
        
        Args:
            errors: List of tracking errors
            threshold: Settling threshold in degrees
        
        Returns:
            Settling time in seconds, or None if not settled
        """
        if not errors:
            return None
        
        # Find first point where error stays within threshold
        for i in range(len(errors)):
            if all(abs(e) <= threshold for e in errors[i:]):
                return float(self.history[i].time) if i < len(self.history) else None
        
        return None
    
    def _calculate_overshoot(self, values: List[float]) -> float:
        """
        Calculate maximum overshoot percentage
        
        Args:
            values: List of steering angle values
        
        Returns:
            Overshoot percentage
        """
        if not values or abs(self.target_angle) < 1e-6:
            return 0.0
        
        max_val = max(values) if self.target_angle > 0 else min(values)
        overshoot = max(0.0, (abs(max_val) - abs(self.target_angle)) / abs(self.target_angle) * 100.0)
        
        return overshoot


# Example usage and testing
if __name__ == "__main__":
    print("=" * 70)
    print("PhyVista - Low-Gravity Vehicle Steering Simulation")
    print("=" * 70)
    
    # Create physics parameters for Moon environment
    params = PhysicsParameters(
        mass=500.0,  # kg
        gravity=GravityEnvironment.MOON.value,
        friction_coefficient=0.7,
        wheelbase=2.5,  # meters
        max_steering_angle=45.0  # degrees
    )
    
    print("\nPhysics Parameters:")
    print(f"  Mass: {params.mass} kg")
    print(f"  Gravity: {params.gravity} m/s² (Moon)")
    print(f"  Friction coefficient: {params.friction_coefficient}")
    print(f"  Wheelbase: {params.wheelbase} m")
    print(f"  Max steering angle: {params.max_steering_angle}°")
    print(f"  Normal force: {params.normal_force():.2f} N")
    print(f"  Max friction force: {params.max_friction_force():.2f} N")
    
    # Create PID controller
    controller = PIDController(kp=0.5, ki=0.1, kd=0.2)
    
    print("\nPID Controller Gains:")
    print(f"  Kp: {controller.kp}")
    print(f"  Ki: {controller.ki}")
    print(f"  Kd: {controller.kd}")
    
    # Create simulation
    sim = Simulation(params, controller, initial_velocity=10.0, dt=0.01)
    
    # Run simulation for 10 seconds with 15-degree target
    print("\nRunning simulation...")
    print(f"  Duration: 10.0 s")
    print(f"  Target angle: 15.0°")
    print(f"  Time step: {sim.dt} s")
    
    results = sim.run(duration=10.0, target_angle=15.0)
    
    # Print summary
    print("\n" + "=" * 70)
    print("Simulation Results:")
    print("=" * 70)
    
    stats = sim.get_summary_statistics()
    print(f"Total time: {stats['total_time']:.2f} s")
    print(f"Total steps: {stats['total_steps']}")
    print(f"Path length: {stats['path_length']:.2f} m")
    print(f"Final position: ({stats['final_position'][0]:.2f}, {stats['final_position'][1]:.2f}) m")
    print(f"Final heading: {stats['final_heading_deg']:.2f}°")
    print(f"Final steering angle: {stats['final_steering_angle']:.2f}°")
    print(f"\nControl Performance:")
    print(f"  Mean error: {stats['mean_steering_error']:.3f}°")
    print(f"  Max error: {stats['max_steering_error']:.3f}°")
    print(f"  RMS error: {stats['rms_steering_error']:.3f}°")
    print(f"  Overshoot: {stats['overshoot']:.2f}%")
    print(f"  Steady-state error: {stats['steady_state_error']:.3f}°")
    
    if stats['settling_time'] is not None:
        print(f"  Settling time: {stats['settling_time']:.2f} s")
    else:
        print(f"  Settling time: Did not settle")
    
    # Export data
    filename = sim.export_history('moon_simulation.json')
    print(f"\nData exported to {filename}")
    print("=" * 70)
