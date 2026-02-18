from phyvista_backend import Simulation, PhysicsParameters, PIDController, GravityEnvironment

# Configuration of physics for Moon
params = PhysicsParameters(
    mass=500.0,
    gravity=GravityEnvironment.MOON.value,
    friction_coefficient=0.7,
    wheelbase=2.5,
    max_steering_angle=45.0
)

# Configure PID controller
controller = PIDController(kp=0.5, ki=0.1, kd=0.2)

# Create simulation
sim = Simulation(params, controller, initial_velocity=10.0, dt=0.01)

# Run for 5 seconds with 15° target
print("Running simulation...")
results = sim.run(duration=5.0, target_angle=15.0)

# Print results
stats = sim.get_summary_statistics()
print("\n=== SIMULATION RESULTS ===")
print(f"Total time: {stats['total_time']:.2f} seconds")
print(f"Final position: ({stats['final_position'][0]:.2f}, {stats['final_position'][1]:.2f}) meters")
print(f"Final heading: {stats['final_heading_deg']:.2f} degrees")
print(f"Mean steering error: {stats['mean_steering_error']:.2f} degrees")
print(f"Settling time: {stats['settling_time']:.2f} seconds" if stats['settling_time'] else "Did not settle")

print("\n✅ Simulation completed successfully!")
