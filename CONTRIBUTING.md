# Contributing to PhyVista

Thanks for your interest in contributing. PhyVista is a physics-based vehicle steering simulator for reduced gravity environments. Contributions that improve the physics engine, control systems, or developer experience are especially welcome.

---

## Getting Started

1. Fork the repo and clone your fork
2. Set up the backend and frontend following the [README](README.md)
3. Create a branch: `git checkout -b feat/your-feature-name`
4. Make your changes
5. Run tests before submitting
6. Open a pull request against `main`

---

## Development Setup

### Backend
```bash
cd Backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
python phyvista_api.py
```

### Frontend
```bash
cd Frontend
cp .env.example .env
# Set VITE_API_BASE=http://localhost:5000
npm install
npm run dev
```

---

## Running Tests

```bash
cd Backend
python -m pytest tests/test_physics.py -v
```

All 36 tests must pass before submitting a PR.

---

## Areas Open for Contribution

- **Four-wheel dynamics model** — replace bicycle model with full 4-wheel kinematics
- **Terrain interaction** — slope modeling, uneven surfaces, variable friction zones
- **Alternative controllers** — MPC, LQR, or adaptive control alongside PID
- **Frontend tests** — Vitest component tests for React components
- **3D path visualization** — upgrade PathCanvas from 2D to 3D trajectory
- **Dark mode theme** — third theme option alongside Vista and Classic Mac
- **WebSocket reconnection** — auto-reconnect with user feedback on connection loss
- **Keyboard shortcuts** — Space to start/pause, R to reset

---

## Code Style

**Python:** Follow PEP 8. Use descriptive variable names, especially for physics quantities.

**JavaScript/React:** Functional components and hooks only. Keep components focused — one responsibility per file.

**Commits:** Use conventional commit prefixes — `feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `refactor:`, `test:`.

---

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Update the README if your change affects setup, API, or project structure
- Add or update tests for any physics engine changes
- Don't commit `.env` files, `venv/`, or editor config files

---

## Reporting Bugs

Open an issue at [github.com/thattimelessman/PhyVista/issues](https://github.com/thattimelessman/PhyVista/issues) with:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Environment (OS, Python version, Node version)

---

## Contact

**Email:** thattimelessman@gmail.com  
**Instagram:** [@thattimelessman](https://instagram.com/thattimelessman)