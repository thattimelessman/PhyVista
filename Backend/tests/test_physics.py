"""
Unit tests for PhyVista physics engine (phyvista_backend.py)
Run with: pytest Backend/tests/test_physics.py
"""

import pytest
import numpy as np
from phyvista_backend import (
    PhysicsParameters, PIDController, VehicleDynamics,
    VehicleState, Simulation, GravityEnvironment
)


# --- FIXTURES ---

@pytest.fixture
def earth_params():
    return PhysicsParameters(
        mass=500.0,
        gravity=9.81,
        friction_coefficient=0.7,
        wheelbase=2.5,
        max_steering_angle=45.0
    )

@pytest.fixture
def moon_params():
    return PhysicsParameters(
        mass=500.0,
        gravity=1.62,
        friction_coefficient=0.7,
        wheelbase=2.5,
        max_steering_angle=45.0
    )

@pytest.fixture
def pid():
    return PIDController(kp=0.5, ki=0.1, kd=0.2)

@pytest.fixture
def default_state():
    return VehicleState(
        time=0.0,
        position=np.array([0.0, 0.0]),
        velocity=10.0,
        heading=0.0,
        steering_angle=0.0,
        angular_velocity=0.0
    )


# --- PHYSICS PARAMETERS TESTS ---

class TestPhysicsParameters:

    def test_normal_force(self, earth_params):
        # N = mg = 500 * 9.81
        assert earth_params.normal_force() == pytest.approx(500 * 9.81)

    def test_max_friction_force(self, earth_params):
        # F_max = μN = 0.7 * 500 * 9.81
        assert earth_params.max_friction_force() == pytest.approx(0.7 * 500 * 9.81)

    def test_moon_normal_force_lower_than_earth(self, earth_params, moon_params):
        assert moon_params.normal_force() < earth_params.normal_force()

    def test_invalid_mass_raises(self):
        with pytest.raises(ValueError):
            PhysicsParameters(mass=-100, gravity=9.81, friction_coefficient=0.7,
                              wheelbase=2.5, max_steering_angle=45.0)

    def test_invalid_gravity_raises(self):
        with pytest.raises(ValueError):
            PhysicsParameters(mass=500, gravity=-1, friction_coefficient=0.7,
                              wheelbase=2.5, max_steering_angle=45.0)

    def test_invalid_wheelbase_raises(self):
        with pytest.raises(ValueError):
            PhysicsParameters(mass=500, gravity=9.81, friction_coefficient=0.7,
                              wheelbase=0, max_steering_angle=45.0)

    def test_zero_friction_gives_zero_friction_force(self):
        params = PhysicsParameters(mass=500, gravity=9.81, friction_coefficient=0.0,
                                   wheelbase=2.5, max_steering_angle=45.0)
        assert params.max_friction_force() == 0.0


# --- VEHICLE DYNAMICS TESTS ---

class TestVehicleDynamics:

    def test_turn_radius_zero_angle_returns_inf(self, earth_params):
        dynamics = VehicleDynamics(earth_params)
        assert dynamics.calculate_turn_radius(0.0) == np.inf

    def test_turn_radius_positive(self, earth_params):
        dynamics = VehicleDynamics(earth_params)
        # R = L / tan(δ) = 2.5 / tan(45°) = 2.5
        r = dynamics.calculate_turn_radius(45.0)
        assert r == pytest.approx(2.5, rel=1e-3)

    def test_centripetal_force_straight_line(self, earth_params):
        dynamics = VehicleDynamics(earth_params)
        # No turn = no centripetal force
        assert dynamics.calculate_centripetal_force(10.0, np.inf) == 0.0

    def test_centripetal_force_formula(self, earth_params):
        dynamics = VehicleDynamics(earth_params)
        # F_c = mv²/R = 500 * 100 / 10 = 5000
        assert dynamics.calculate_centripetal_force(10.0, 10.0) == pytest.approx(5000.0)

    def test_slip_detection_no_slip(self, earth_params):
        dynamics = VehicleDynamics(earth_params)
        # Slow speed on earth = no slip
        can_turn, util = dynamics.check_slip_condition(5.0, 10.0)
        assert can_turn == True
        assert util <= 100.0

    def test_slip_detection_slip_on_moon(self, moon_params):
        dynamics = VehicleDynamics(moon_params)
        # High speed sharp turn on moon = slip
        can_turn, util = dynamics.check_slip_condition(20.0, 40.0)
        assert can_turn == False

    def test_zero_friction_always_slips(self):
        params = PhysicsParameters(mass=500, gravity=9.81, friction_coefficient=0.0,
                                   wheelbase=2.5, max_steering_angle=45.0)
        dynamics = VehicleDynamics(params)
        can_turn, _ = dynamics.check_slip_condition(10.0, 15.0)
        assert can_turn is False

    def test_state_update_advances_time(self, earth_params, default_state):
        dynamics = VehicleDynamics(earth_params)
        new_state = dynamics.update_state(default_state, dt=0.1, steering_input=0.0)
        assert new_state.time == pytest.approx(0.1)

    def test_state_update_straight_line(self, earth_params, default_state):
        dynamics = VehicleDynamics(earth_params)
        # No steering = straight line = x increases, y stays 0
        new_state = dynamics.update_state(default_state, dt=0.1, steering_input=0.0)
        assert new_state.position[0] > 0.0
        assert new_state.position[1] == pytest.approx(0.0, abs=1e-6)


# --- PID CONTROLLER TESTS ---

class TestPIDController:

    def test_zero_error_gives_zero_output(self, pid):
        output = pid.compute(target=15.0, current=15.0, time=0.1)
        assert output == pytest.approx(0.0, abs=1e-6)

    def test_positive_error_gives_positive_output(self, pid):
        output = pid.compute(target=15.0, current=0.0, time=0.1)
        assert output > 0.0

    def test_negative_error_gives_negative_output(self, pid):
        output = pid.compute(target=-15.0, current=0.0, time=0.1)
        assert output < 0.0

    def test_output_within_limits(self, pid):
        # Large error should be clipped to output_limit
        output = pid.compute(target=10000.0, current=0.0, time=0.1)
        assert abs(output) <= pid.output_limit

    def test_reset_clears_integral(self, pid):
        pid.compute(target=15.0, current=0.0, time=0.1)
        pid.compute(target=15.0, current=0.0, time=0.2)
        assert pid.integral != 0.0
        pid.reset()
        assert pid.integral == 0.0

    def test_set_gains(self, pid):
        pid.set_gains(1.0, 0.5, 0.3)
        assert pid.kp == 1.0
        assert pid.ki == 0.5
        assert pid.kd == 0.3


# --- SIMULATION TESTS ---

class TestSimulation:

    def test_initial_state_is_zero(self, earth_params, pid):
        sim = Simulation(earth_params, pid, initial_velocity=10.0)
        assert sim.state.time == 0.0
        assert sim.state.steering_angle == 0.0
        assert sim.state.velocity == 10.0

    def test_step_advances_time(self, earth_params, pid):
        sim = Simulation(earth_params, pid, initial_velocity=10.0, dt=0.1)
        sim.step()
        assert sim.state.time == pytest.approx(0.1)

    def test_step_adds_to_history(self, earth_params, pid):
        sim = Simulation(earth_params, pid, initial_velocity=10.0)
        sim.step()
        sim.step()
        assert len(sim.history) == 2

    def test_run_returns_correct_steps(self, earth_params, pid):
        sim = Simulation(earth_params, pid, initial_velocity=10.0, dt=0.1)
        results = sim.run(duration=1.0, target_angle=15.0)
        assert len(results) == 10

    def test_reset_clears_history(self, earth_params, pid):
        sim = Simulation(earth_params, pid, initial_velocity=10.0)
        sim.run(duration=1.0, target_angle=15.0)
        sim.reset()
        assert len(sim.history) == 0
        assert sim.state.time == 0.0

    def test_reset_with_new_velocity(self, earth_params, pid):
        sim = Simulation(earth_params, pid, initial_velocity=10.0)
        sim.reset(initial_velocity=20.0)
        assert sim.state.velocity == 20.0

    def test_negative_velocity_raises(self, earth_params, pid):
        with pytest.raises(ValueError):
            Simulation(earth_params, pid, initial_velocity=-5.0)

    def test_step_result_has_required_keys(self, earth_params, pid):
        sim = Simulation(earth_params, pid, initial_velocity=10.0)
        result = sim.step()
        assert 'state' in result
        assert 'diagnostics' in result
        assert 'can_turn' in result['diagnostics']
        assert 'friction_utilization' in result['diagnostics']

    def test_steering_approaches_target(self, earth_params, pid):
        sim = Simulation(earth_params, pid, initial_velocity=10.0, dt=0.01)
        sim.run(duration=5.0, target_angle=15.0)
        # After 5 seconds, steering should be close to target
        assert abs(sim.state.steering_angle - 15.0) < 2.0


# --- EDGE CASES ---

class TestEdgeCases:

    def test_zero_velocity_no_crash(self, earth_params, pid):
        sim = Simulation(earth_params, pid, initial_velocity=0.0)
        result = sim.step()
        assert result is not None

    def test_extreme_gravity(self, pid):
        params = PhysicsParameters(mass=500, gravity=100.0, friction_coefficient=0.7,
                                   wheelbase=2.5, max_steering_angle=45.0)
        sim = Simulation(params, pid, initial_velocity=10.0)
        result = sim.step()
        assert result is not None

    def test_moon_gravity_preset(self):
        assert GravityEnvironment.MOON.value == pytest.approx(1.62)

    def test_mars_gravity_preset(self):
        assert GravityEnvironment.MARS.value == pytest.approx(3.71)

    def test_large_timestep_warning(self, earth_params, pid):
        with pytest.warns(UserWarning):
            Simulation(earth_params, pid, initial_velocity=10.0, dt=2.0)