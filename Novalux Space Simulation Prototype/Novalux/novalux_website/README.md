# NOVALUX — Interactive Space Mission Design & Operations Game

NOVALUX is an educational browser-based space mission design and operations game. Players define a mission, build a spacecraft, choose instruments and launch systems, plan orbits and communications, run mission operations, evaluate science return, and organize a small project team.

## Main capabilities

- **Mission planning:** mission concepts, objectives, requirements, maturity tracking, engineering review, and instrument suitability.
- **Spacecraft design:** platform, propulsion, power, science payload, communications, and launch vehicle selection.
- **Launch and exploration:** staged launch simulation, orbital operations, rover exploration, rendezvous and docking activities.
- **Engineering workbench:** modular spacecraft assembly, deployment, mass properties, propulsion operations, and component failure testing.
- **Mission operations planning:** launch-vehicle compatibility, circular-orbit estimates, engineering trade studies, and ground-link budget estimates.
- **Mission Control:** accelerated mission timeline, telemetry, resource tracking, operational events, and player decisions.
- **Science Results:** objective relevance, observation yield, data return, engineering checks, and JSON report export.
- **Team Workspace:** up to four local collaborators, role assignments, task board, review sign-offs, and portable project import/export.
- **Mission Scenarios:** Guided Discovery, Standard Mission, Anomaly Response, Science Campaign, and Open Sandbox. Scenario choice changes the educational operations model.
- **Readiness & Release:** automated project checks, manual release checklist, readiness score, and final mission dossier export.

## Run locally

### Requirements
- Node.js 20 or newer
- A modern browser with WebGL support
- Internet access for the Three.js CDN module and Google Fonts
- No npm packages are required

### Start

```bash
cd novalux_website
npm run dev
```

Open **http://127.0.0.1:8000**. Do not open `index.html` directly with `file://`; the application uses JavaScript ES modules.

### Verify

```bash
npm run check
npm test
```

## Project structure

- `index.html`, `styles.css`, `app.js` — primary application interface and spacecraft designer.
- `src/mission-architecture.js`, `src/mission-workspace.js` — mission concept and planning workspace.
- `src/mission-control.js` — mission execution, telemetry, science evaluation, and team workspace.
- `src/scenario-config.js`, `src/scenario-release.js` — scenario modes, release readiness, and final dossier generation.
- `src/physics/` and `src/ship/` — orbital, launch, spacecraft, and engineering models.
- `tests/` — automated model, integration, and source checks.

## Documentation

- `PROJECT_AUDIT.md` — original project audit and stabilization notes.
- `MISSION_PLANNER_IMPLEMENTATION.md` — mission concept, requirements, and instrument-planning implementation.
- `MISSION_OPERATIONS_IMPLEMENTATION.md` — launch/orbit, trade-study, and communications implementation.
- `MISSION_CONTROL_AND_TEAM_IMPLEMENTATION.md` — mission operations, science return, and collaboration details.
- `FINAL_RELEASE_NOTES.md` — scenario modes, readiness workflow, test results, and known limitations.

## Educational model limitations

NOVALUX is an educational game, not a professional aerospace engineering tool. Mission timelines, resource usage, launch-vehicle capacities, component costs, science scores, and anomaly events are simplified game models. Orbit calculations are not a complete trajectory design system. Ground-link estimates do not use real station visibility or schedules. No live spacecraft telemetry or NASA Deep Space Network integration is provided. Team collaboration is local-browser and portable-file based; it is not online multiplayer or real-time cloud synchronization.

## Project links

- Live demo: https://novalux-space-simulation-prototype.vercel.app/
- GitHub: https://github.com/henrynova135/Novalux-space-simulation-prototype

## Credits

Built with HTML, CSS, JavaScript, and Three.js. AI tools were used as development assistance for coding support, debugging, troubleshooting, and documentation. External assets and libraries should be credited according to their respective licences.

**NOVALUX — Explore. Design. Simulate. Discover.**

## Player experience & accessibility

- **Game Guide:** step-by-step first mission walkthrough, laptop keyboard keycaps, mobile touch instructions, advanced exploration tips, and mission strategy.
- **Settings:** sound effects and optional ambience controls, saved control preferences, touch-pad opacity, reduced-motion preference, and higher-contrast interface option.
- **Responsive gameplay controls:** phones and touch devices show a directional overlay only while Mission Gameplay is running; desktop players see keyboard keycaps and use WASD or arrow keys.
- **3D rover update:** six-wheel articulated rocker-bogie layout, instrument mast details, responsive rendering resolution, and viewport resize handling.

Sound options currently control procedural effects and optional ambient audio. They do not represent a separate licensed music soundtrack.
