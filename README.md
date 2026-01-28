# PhyVista - Low-Gravity Vehicle Steering Simulator

A professional physics simulation platform for studying vehicle dynamics and control systems in reduced gravity environments. Built for aerospace engineers, robotics researchers, and anyone curious about how vehicles behave on the Moon and Mars.
--
***NOTE*: It is Suggested if you wait for a minute or so to let [https://phyvista.vercel.app/] connect to backend as I'm burning free tier for now.**

---

## 🚀 What Does It Do?

This simulator models the real-world physics of wheeled vehicles operating in low-gravity conditions. It calculates forces, tracks steering behavior, detects wheel slip, and shows you exactly what happens when friction limits are exceeded—critical knowledge for designing lunar rovers or Martian exploration vehicles.

**Key capabilities:**
- Simulates vehicle dynamics using bicycle model physics
- Computes friction limits and slip conditions in real-time
- Implements PID control for automated steering tracking
- Provides detailed diagnostics and performance metrics
- Supports Earth, Mars, and Moon gravity presets (or custom values)

---

## ✨ Features

### Physics Engine
- **High-fidelity dynamics**: NumPy-powered numerical integration with semi-implicit Euler method
- **Friction modeling**: Real-time calculation of normal force, maximum friction, and centripetal requirements
- **Slip detection**: Automatic detection when turning forces exceed available friction
- **Turn radius calculation**: Bicycle model kinematics for accurate path prediction

### Control System
- **PID controller**: Proportional-Integral-Derivative control with anti-windup
- **Live tuning**: Adjust Kp, Ki, Kd gains in real-time during simulation
- **Preset configurations**: Aggressive, Balanced, and Smooth control profiles
- **Target tracking**: Set desired steering angles and watch the controller respond

### Backend API
- **RESTful endpoints**: Full CRUD operations for simulation management
- **Session handling**: Multiple concurrent simulations with unique IDs
- **Parameter sweeps**: Automated analysis across parameter ranges
- **Data export**: JSON and CSV export for external analysis

### User Interface
- **Dual themes**: Switch between Windows Vista and Classic Mac aesthetics
- **Real-time telemetry**: Live position, heading, forces, and control metrics
- **Multi-chart analysis**: Steering response, friction utilization, angular velocity, PID error
- **Desktop-class UX**: Menu bars, modal dialogs, and familiar desktop patterns

---

## 🛠️ Technology Stack

**Backend:**
- Python 3.8+
- Flask (REST API server)
- NumPy (numerical computation)
- Flask-CORS (cross-origin support)

**Frontend:**
- React 18.x
- Recharts (data visualization)
- Tailwind CSS (styling)
- Lucide React (icons)

**Architecture:**
- Client-server model with HTTP REST API
- Stateful backend simulation engine
- Real-time frontend with 100ms update rate

---

## 📦 Installation

### Prerequisites
- Python 3.8 or higher
- Node.js 16+ and npm
- Git

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/thattimelessman/PhyVista.git
cd PhyVista

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Run the backend server
python phyvista_api.py
```

The API server will start on `http://localhost:5000`

### Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm start
```

The UI will open at `http://localhost:3000`

---

## 🎮 Quick Start

1. **Launch both servers** (backend on port 5000, frontend on port 3000)

2. **Select your environment:**
   - Click Earth, Mars, or Moon buttons
   - Or set custom gravity value

3. **Configure your vehicle:**
   - Mass: 100-2000 kg
   - Friction coefficient: 0.1-1.5
   - Initial velocity: 5-30 m/s

4. **Set target steering angle:**
   - Use slider to set desired angle (-45° to +45°)
   - PID controller will automatically track this target

5. **Run simulation:**
   - Click START to begin
   - Watch real-time telemetry update
   - Switch to Analysis tab for performance charts

6. **Experiment:**
   - Adjust PID gains to see control behavior change
   - Try different gravity levels to compare performance
   - Export data for offline analysis

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Key Endpoints

**Health Check**
```http
GET /health
```

**Create Simulation**
```http
POST /simulation/create
Content-Type: application/json

{
  "mass": 500,
  "gravity": 1.62,
  "friction_coefficient": 0.7,
  "initial_velocity": 10.0,
  "pid_gains": {"kp": 0.5, "ki": 0.1, "kd": 0.2}
}
```

**Run Simulation Step**
```http
POST /simulation/{id}/step
Content-Type: application/json

{
  "target_angle": 15.0
}
```

**Run Full Simulation**
```http
POST /simulation/{id}/run
Content-Type: application/json

{
  "duration": 10.0,
  "target_angle": 15.0
}
```

**Get Simulation History**
```http
GET /simulation/{id}/history
```

**Update Parameters**
```http
PUT /simulation/{id}/update_params
Content-Type: application/json

{
  "velocity": 15.0,
  "mass": 600.0,
  "pid_gains": {"kp": 0.7, "ki": 0.15, "kd": 0.25}
}
```

**Reset Simulation**
```http
POST /simulation/{id}/reset
```

**Delete Simulation**
```http
DELETE /simulation/{id}
```

**Parameter Sweep Analysis**
```http
POST /analysis/parameter_sweep
Content-Type: application/json

{
  "parameter": "friction_coefficient",
  "values": [0.3, 0.5, 0.7, 0.9],
  "duration": 10.0,
  "target_angle": 15.0,
  "base_config": {
    "mass": 500,
    "gravity": 1.62
  }
}
```

**Get Gravity Presets**
```http
GET /presets/gravity
```

**Get PID Presets**
```http
GET /presets/pid
```

---

## 🔬 Physics Model

### Vehicle Dynamics

The simulator uses a **bicycle model** for vehicle kinematics:

- **Turn radius**: `R = L / tan(δ)` where L is wheelbase, δ is steering angle
- **Angular velocity**: `ω = v / R` for no-slip conditions
- **Centripetal force**: `F_c = mv² / R`

### Friction Limits

Critical for low-gravity environments:

- **Normal force**: `N = mg` (much lower on Moon/Mars)
- **Maximum friction**: `F_max = μN`
- **Slip condition**: Vehicle slips when `F_c > F_max`

### Control System

PID controller output:
```
u(t) = Kp·e(t) + Ki·∫e(t)dt + Kd·de(t)/dt
```

With anti-windup saturation on integral term and output limiting.

---

## 📊 Use Cases

**Aerospace Research:**
- Validate steering algorithms before hardware deployment
- Study vehicle behavior in lunar/Martian conditions
- Optimize control parameters for specific missions

**Education:**
- Learn vehicle dynamics fundamentals
- Understand PID control through interactive experimentation
- Visualize physics concepts in reduced gravity

**Robotics Development:**
- Test control strategies for planetary rovers
- Analyze friction-limited scenarios
- Benchmark controller performance

**Algorithm Testing:**
- Parameter sweep analysis for optimization
- Compare control strategies (aggressive vs. smooth)
- Generate datasets for machine learning

---

## 🎨 UI Themes

**Frost Vista** - Modern Windows Vista inspired design with:
- Gradient backgrounds and rounded corners
- Dark title bars with subtle shadows
- Blue highlight colors for active elements

**Classic Mac** - Retro Mac OS inspired design with:
- Beige/tan desktop background
- Black borders with drop shadows
- Monochrome aesthetic with crisp edges

Switch themes via View menu or use default Vista theme.

---

## 📁 Project Structure
```
PhyVista/
├── phyvista_backend.py      # Core physics engine
├── phyvista_api.py           # Flask REST API server
├── src/
│   └── GravitySteeringSim.jsx # React frontend component
├── requirements.txt          # Python dependencies
├── package.json              # Node.js dependencies
└── README.md
```

---

## 💾 Screenshots

![image alt](https://github.com/thattimelessman/PhyVista/blob/f97c84dee38b780925edfb7ce9f86f9c1699eb42/Screenshots/Beige%20Gray%20Minimalist%20Aesthetic%20Photo%20Collage%20Beach%20Desktop%20Wallpaper_20260128_085939_0000.png)
![image alt](https://github.com/thattimelessman/PhyVista/blob/f97c84dee38b780925edfb7ce9f86f9c1699eb42/Screenshots/Screenshot%20(158).png)
![image alt](https://github.com/thattimelessman/PhyVista/blob/f97c84dee38b780925edfb7ce9f86f9c1699eb42/Screenshots/screencapture-phyvista-vercel-app-2026-01-28-01_53_40.png)
![image alt](https://github.com/thattimelessman/PhyVista/blob/f97c84dee38b780925edfb7ce9f86f9c1699eb42/Screenshots/screencapture-phyvista-vercel-app-2026-01-28-01_53_12.png)
![image alt](https://github.com/thattimelessman/PhyVista/blob/f97c84dee38b780925edfb7ce9f86f9c1699eb42/Screenshots/screencapture-phyvista-vercel-app-2026-01-28-01_52_19.png)

---

## 🤝 Areas for contribution

- Additional physics models (e.g., four-wheel dynamics)
- More control algorithms (MPC, LQR, adaptive control)
- Advanced visualization (3D vehicle path, terrain interaction)
- Performance optimizations
- Test coverage
- Documentation improvements

---

## 🐛 Known Issues

- Large time steps (dt > 0.1s) may cause numerical instability
- No terrain interaction modeling yet
- Session storage is in-memory (use Redis for production)
- Maximum 100 concurrent simulations per server instance

See the [Issues](https://github.com/thattimelessman/PhyVista/issues) page for full list and workarounds.

---

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

## 🧧 Acknowledgments

- Physics equations based on vehicle dynamics literature
- Bicycle model from classical robotics textbooks
- UI inspiration from vintage operating systems
- Built with modern web technologies

---

## **Notion**: https://phyvista.notion.site/PhyVista-2ef9b87cb91380ed8148da2aa6e3343b?source=copy_link

## 📧 Contact

Questions? Ideas? Found a bug?

- **Email**: thattimelessman@gmail.com
- **Instagram**: [@thattimelessman](https://instagram.com/thattimelessman)
- **GitHub Issues**: [Report a bug](https://github.com/thattimelessman/PhyVista/issues)

---
**NOTE: Stealing or copying this project would be deeply unappreciated.**
---
**Made with brains for aerospace engineers and robotics enthusiasts**
