
"use strict";

import * as THREE from
    "https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js";

import { PHYSICS } from "../physics/constants.js";

/*
=========================================================
NOVALUX ALPHA 0.3
3D ORBITAL VISUALIZATION ENGINE
=========================================================

Physics positions come from OrbitalEngine.
This class is responsible only for visualization.

Features:
- Earth visualization
- Spacecraft visualization
- Spacecraft trajectory
- Satellite and debris visualization
- Orbital paths
- Individual movement trails
- Reusable trail buffers
=========================================================
*/

const SCALE = 1 / PHYSICS.EARTH_RADIUS;

const TRAIL_LIMIT = 600;
const SPACECRAFT_TRAIL_LIMIT = 1800;

const SPACECRAFT_TRAIL_DISTANCE = 0.00008;
const HAZARD_TRAIL_DISTANCE = 0.00012;

const HAZARD_VISUAL_SIZE = {
    satellite: 0.025,
    debris: 0.018,
    asteroid: 0.032
};

/* VECTOR HELPERS */

function toVisualPosition(position) {
    return new THREE.Vector3(
        position.x * SCALE,
        position.y * SCALE,
        position.z * SCALE
    );
}

function distanceBetween(a, b) {
    return a.distanceTo(b);
}

/*
 * Creates a line with a reusable position buffer.
 * This avoids allocating a new BufferGeometry for
 * every additional trail point.
 */
function createTrailGeometry(capacity) {
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(
        capacity * 3
    );

    const attribute = new THREE.BufferAttribute(
        positions,
        3
    );

    attribute.setUsage(THREE.DynamicDrawUsage);

    geometry.setAttribute(
        "position",
        attribute
    );

    geometry.setDrawRange(0, 0);

    return geometry;
}

function updateTrailGeometry(geometry, points) {
    const attribute = geometry.getAttribute("position");

    const count = Math.min(
        points.length,
        attribute.count
    );

    for (let i = 0; i < count; i++) {
        const point = points[i];

        attribute.setXYZ(
            i,
            point.x,
            point.y,
            point.z
        );
    }

    attribute.needsUpdate = true;

    geometry.setDrawRange(0, count);
}

/* PROCEDURAL EARTH TEXTURES */
function makeEarthSurfaceTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 2048; canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const ocean = ctx.createLinearGradient(0, 0, 0, 1024);
    ocean.addColorStop(0, "#164d78"); ocean.addColorStop(.48, "#1477a3"); ocean.addColorStop(1, "#082b52");
    ctx.fillStyle = ocean; ctx.fillRect(0, 0, 2048, 1024);
    // Stylized but recognizable continent silhouettes, drawn as filled land masses.
    const shapes = [
        [[115,250],[170,150],[275,115],[365,180],[410,290],[370,410],[435,510],[365,650],[300,620],[260,760],[185,690],[150,530],[90,420]],
        [[510,95],[680,75],[790,145],[930,130],[1040,205],[1165,180],[1280,250],[1225,355],[1110,390],[1030,510],[910,470],[825,570],[710,500],[610,415],[520,285]],
        [[910,510],[1015,555],[1060,680],[1010,820],[955,960],[870,880],[880,720],[830,610]],
        [[1400,390],[1520,310],[1640,355],[1710,465],[1650,590],[1560,625],[1490,520]],
        [[1580,700],[1700,680],[1800,760],[1750,900],[1650,925],[1570,820]],
        [[1180,570],[1250,525],[1330,580],[1310,675],[1230,710],[1160,625]]
    ];
    const landColors = ["#397b59", "#4b865b", "#39734f", "#477d54", "#56885c", "#36704d"];
    shapes.forEach((poly, i) => {
        ctx.beginPath(); poly.forEach(([x,y],j) => j ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();
        ctx.fillStyle = landColors[i]; ctx.fill();
        ctx.strokeStyle = "rgba(17,65,55,.38)"; ctx.lineWidth = 8; ctx.stroke();
        // Subtle terrain variation gives the continents more depth than flat dots.
        ctx.globalAlpha = .12; ctx.fillStyle = "#c6bd83";
        for (let k=0;k<18;k++) { const x=poly[k%poly.length][0], y=poly[k%poly.length][1]; ctx.beginPath(); ctx.ellipse(x,y,24+(k%4)*14,8+(k%3)*5,k*.17,0,Math.PI*2); ctx.fill(); }
        ctx.globalAlpha = 1;
    });
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
    return texture;
}
function makeEarthCloudTexture() {
    const canvas = document.createElement("canvas"); canvas.width=2048; canvas.height=1024;
    const ctx=canvas.getContext("2d"); ctx.clearRect(0,0,2048,1024);
    for(let i=0;i<560;i++) {
        const x=(i*193)%2048, y=(i*317)%1024;
        ctx.fillStyle=`rgba(242,250,255,${.07+(i%6)*.025})`;
        ctx.beginPath(); ctx.ellipse(x,y,18+(i%9)*16,5+(i%5)*5,Math.sin(i)*.28,0,Math.PI*2); ctx.fill();
    }
    const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace; texture.anisotropy=8; return texture;
}

/* SCENE CLASS */

export class OrbitalScene {
    constructor(container) {
        this.container = container;

        this.scene = new THREE.Scene();

        this.scene.background = new THREE.Color(
            "#030b19"
        );

        /* CAMERA */

        this.camera = new THREE.PerspectiveCamera(
            45,
            1,
            0.01,
            100
        );

        this.camera.position.set(
            0,
            2.2,
            4.5
        );

        this.camera.lookAt(0, 0, 0);

        /* RENDERER */

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });

        this.renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio || 1,
                1.25
            )
        );

        this.renderer.outputColorSpace =
            THREE.SRGBColorSpace;

        this.container.appendChild(
            this.renderer.domElement
        );

        /* SPACECRAFT TRAJECTORY */

        this.trajectoryPoints = [];
        this.lastSpacecraftTrailPoint = null;

        this.spacecraftTrailMaterial =
            new THREE.LineBasicMaterial({
                color: 0x38d9f5,
                transparent: true,
                opacity: 0.95
            });

        this.trajectoryGeometry =
            createTrailGeometry(
                SPACECRAFT_TRAIL_LIMIT
            );

        this.trajectoryLine = new THREE.Line(
            this.trajectoryGeometry,
            this.spacecraftTrailMaterial
        );

        this.scene.add(this.trajectoryLine);

        /* HAZARD DATA */

        this.hazardMeshes = new Map();

        /* INITIALIZE WORLD */

        this.createLighting();
        this.createEarth();
        this.createStars();
        this.createOrbit();
        this.createSpacecraft();
        this.createHazardObjects();

        /* RESPONSIVE RESIZE */

        this.resizeObserver = new ResizeObserver(() => {
            this.resize();
        });

        this.resizeObserver.observe(this.container);

        this.resize();
        this.installViewportCameraControls();

        this.render();
    }

    /* LIGHTING */

    createLighting() {
        const ambient = new THREE.AmbientLight(
            0x8cb8e8,
            1.1
        );

        this.scene.add(ambient);

        const sunlight = new THREE.DirectionalLight(
            0xffffff,
            3
        );

        sunlight.position.set(5, 3, 5);

        this.scene.add(sunlight);
    }

    /* EARTH */

    createEarth() {
        const geometry = new THREE.SphereGeometry(
            1,
            64,
            64
        );

        const earthTexture = makeEarthSurfaceTexture();
        const material = new THREE.MeshBasicMaterial({
            map: earthTexture,
            color: 0xffffff
        });

        this.earth = new THREE.Mesh(
            geometry,
            material
        );

        this.scene.add(this.earth);

        this.clouds = new THREE.Mesh(
            new THREE.SphereGeometry(1.012, 64, 64),
            new THREE.MeshBasicMaterial({
                map: makeEarthCloudTexture(), transparent: true,
                opacity: 0.42, depthWrite: false
            })
        );
        this.scene.add(this.clouds);

        /* ATMOSPHERE */

        const atmosphereGeometry =
            new THREE.SphereGeometry(
                1.025,
                64,
                64
            );

        const atmosphereMaterial =
            new THREE.MeshBasicMaterial({
                color: 0x37aaff,
                transparent: true,
                opacity: 0.12,
                side: THREE.BackSide
            });

        this.atmosphere = new THREE.Mesh(
            atmosphereGeometry,
            atmosphereMaterial
        );

        this.scene.add(this.atmosphere);

        this.createContinents();
    }

    /* CONTINENTS */
    // Continents are now filled, textured land masses on the Earth surface map
    // (rather than sparse green vertex points that looked like scattered dots).
    createContinents() {
        // Earth surface texture is created in createEarth().
    }

    /* STARS */

    createStars() {
        const geometry = new THREE.BufferGeometry();

        const positions = [];

        for (let i = 0; i < 1200; i++) {
            positions.push(
                (Math.random() - 0.5) * 35,
                (Math.random() - 0.5) * 35,
                (Math.random() - 0.5) * 35
            );
        }

        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(
                positions,
                3
            )
        );

        const material = new THREE.PointsMaterial({
            color: 0xc5e7ff,
            size: 0.018
        });

        this.stars = new THREE.Points(
            geometry,
            material
        );

        this.scene.add(this.stars);
    }

    /* INITIAL ORBIT REFERENCE */

    createOrbit() {
        const points = [];

        const orbitRadius =
            (
                PHYSICS.EARTH_RADIUS +
                PHYSICS.INITIAL_ALTITUDE
            ) * SCALE;

        for (let i = 0; i <= 256; i++) {
            const angle =
                i / 256 * Math.PI * 2;

            points.push(
                new THREE.Vector3(
                    Math.cos(angle) * orbitRadius,
                    0,
                    Math.sin(angle) * orbitRadius
                )
            );
        }

        const geometry =
            new THREE.BufferGeometry()
                .setFromPoints(points);

        const material = new THREE.LineBasicMaterial({
            color: 0x38d9f5,
            transparent: true,
            opacity: 0.35
        });

        this.orbitLine = new THREE.Line(
            geometry,
            material
        );

        this.scene.add(this.orbitLine);
    }

    /* SPACECRAFT MODEL */

    createSpacecraft() {
        this.spacecraft = new THREE.Group();
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xc7d4df, metalness: 0.72, roughness: 0.28
        });
        const trimMaterial = new THREE.MeshStandardMaterial({
            color: 0x657d91, metalness: 0.78, roughness: 0.24
        });
        const panelMaterial = new THREE.MeshStandardMaterial({
            color: 0x1768a8, metalness: 0.42, roughness: 0.32
        });
        const goldMaterial = new THREE.MeshStandardMaterial({
            color: 0xc38c3c, metalness: 0.7, roughness: 0.3
        });
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0x54c4df, metalness: 0.55, roughness: 0.16
        });
        const add = (geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) => {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(...position);
            mesh.rotation.set(...rotation);
            this.spacecraft.add(mesh);
            return mesh;
        };

        // Compact satellite bus with a clear forward/aft axis and metallic collars.
        add(new THREE.CylinderGeometry(0.026, 0.026, 0.09, 16), bodyMaterial, [0, 0, 0], [Math.PI / 2, 0, 0]);
        add(new THREE.TorusGeometry(0.026, 0.004, 6, 16), trimMaterial, [0, 0, 0.043]);
        add(new THREE.TorusGeometry(0.026, 0.004, 6, 16), trimMaterial, [0, 0, -0.043]);
        // Forward optical payload and aft propulsion nozzle.
        add(new THREE.CylinderGeometry(0.012, 0.018, 0.035, 12), trimMaterial, [0, 0, 0.061], [Math.PI / 2, 0, 0]);
        add(new THREE.CircleGeometry(0.011, 16), glassMaterial, [0, 0, 0.079]);
        add(new THREE.CylinderGeometry(0.009, 0.018, 0.032, 12, 1, true), goldMaterial, [0, 0, -0.062], [Math.PI / 2, 0, 0]);
        // Twin solar wings with visible cell segmentation and support booms.
        for (const side of [-1, 1]) {
            const boom = add(new THREE.CylinderGeometry(0.002, 0.002, 0.105, 6), trimMaterial, [side * 0.09, 0, 0]);
            boom.rotation.z = Math.PI / 2;
            add(new THREE.BoxGeometry(0.085, 0.006, 0.052), panelMaterial, [side * 0.15, 0, 0]);
            for (let i = -2; i <= 2; i++) {
                add(new THREE.BoxGeometry(0.0018, 0.007, 0.05), trimMaterial, [side * 0.15 + i * 0.016, 0, 0]);
            }
            add(new THREE.BoxGeometry(0.083, 0.007, 0.0018), trimMaterial, [side * 0.15, 0, 0]);
        }
        // Small high-gain dish on the upper bus surface.
        add(new THREE.CylinderGeometry(0.0025, 0.0025, 0.025, 8), trimMaterial, [0, 0.035, 0.025]);
        const dish = add(new THREE.SphereGeometry(0.018, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), bodyMaterial, [0, 0.052, 0.025], [-Math.PI / 2, 0, 0]);
        dish.scale.set(1, 1, 0.25);
        add(new THREE.SphereGeometry(0.0028, 8, 6), glassMaterial, [0, 0.056, 0.025]);

        this.spacecraft.traverse((object) => {
            if (object.isMesh) {
                object.castShadow = false;
                object.receiveShadow = false;
            }
        });
        this.scene.add(this.spacecraft);
    }

    /* SPACECRAFT POSITION */

    updateSpacecraft(position) {
        if (!position || !this.spacecraft) {
            return;
        }

        const scaledPosition =
            toVisualPosition(position);

        this.spacecraft.position.copy(
            scaledPosition
        );

        this.spacecraft.lookAt(0, 0, 0);

        const shouldAddPoint =
            !this.lastSpacecraftTrailPoint ||
            distanceBetween(
                scaledPosition,
                this.lastSpacecraftTrailPoint
            ) >= SPACECRAFT_TRAIL_DISTANCE;

        if (!shouldAddPoint) {
            return;
        }

        this.trajectoryPoints.push(
            scaledPosition.clone()
        );

        this.lastSpacecraftTrailPoint =
            scaledPosition.clone();

        if (
            this.trajectoryPoints.length >
            SPACECRAFT_TRAIL_LIMIT
        ) {
            this.trajectoryPoints.shift();
        }

        this.updateTrajectory();
    }

    /* UPDATE SPACECRAFT TRAJECTORY */

    updateTrajectory() {
        updateTrailGeometry(
            this.trajectoryGeometry,
            this.trajectoryPoints
        );
    }

    /* RESET SPACECRAFT TRAJECTORY */

    resetTrajectory() {
        this.trajectoryPoints = [];
        this.lastSpacecraftTrailPoint = null;

        this.trajectoryGeometry.setDrawRange(0, 0);
    }

    /* HAZARD STYLE HELPERS */

    getHazardStyle(type) {
        if (type === "satellite") {
            return "satellite";
        }

        if (type === "asteroid") {
            return "asteroid";
        }

        return "debris";
    }

    /* HAZARD MATERIALS */

    createHazardObjects() {
        this.hazardMeshes = new Map();

        this.hazardMaterials = {
            satellite: new THREE.MeshStandardMaterial({
                color: 0xffbd59,
                emissive: 0x663300,
                emissiveIntensity: 1.2
            }),

            debris: new THREE.MeshStandardMaterial({
                color: 0xff657a,
                emissive: 0x55101c,
                emissiveIntensity: 1.4
            }),

            asteroid: new THREE.MeshStandardMaterial({
                color: 0xa98bff,
                emissive: 0x30205c,
                emissiveIntensity: 1.0
            })
        };

        this.hazardOrbitMaterials = {
            satellite: new THREE.LineBasicMaterial({
                color: 0xffbd59,
                transparent: true,
                opacity: 0.22
            }),

            debris: new THREE.LineBasicMaterial({
                color: 0xff657a,
                transparent: true,
                opacity: 0.18
            }),

            asteroid: new THREE.LineBasicMaterial({
                color: 0xa98bff,
                transparent: true,
                opacity: 0.2
            })
        };

        this.hazardTrailMaterials = {
            satellite: new THREE.LineBasicMaterial({
                color: 0xffd18b,
                transparent: true,
                opacity: 0.8
            }),

            debris: new THREE.LineBasicMaterial({
                color: 0xff788b,
                transparent: true,
                opacity: 0.75
            }),

            asteroid: new THREE.LineBasicMaterial({
                color: 0xc2aaff,
                transparent: true,
                opacity: 0.75
            })
        };

        // Shared by all hazard meshes.
        this.hazardGeometry =
            new THREE.SphereGeometry(
                1,
                16,
                16
            );
    }

    /* GENERATE HAZARD ORBIT */

    createHazardOrbit(hazard) {
        const radius =
            (
                PHYSICS.EARTH_RADIUS +
                hazard.altitude
            ) * SCALE;

        const points = [];

        const sinI = Math.sin(
            hazard.inclination
        );

        const cosI = Math.cos(
            hazard.inclination
        );

        for (let i = 0; i <= 256; i++) {
            const angle =
                i / 256 * Math.PI * 2;

            const x = radius * Math.cos(angle);

            const y =
                radius *
                Math.sin(angle) *
                sinI;

            const z =
                radius *
                Math.sin(angle) *
                cosI;

            points.push(
                new THREE.Vector3(x, y, z)
            );
        }

        const geometry =
            new THREE.BufferGeometry()
                .setFromPoints(points);

        const style = this.getHazardStyle(
            hazard.type
        );

        return new THREE.Line(
            geometry,
            this.hazardOrbitMaterials[style]
        );
    }

    /* CREATE HAZARD RECORD */

    createHazardMesh(hazard) {
        const style = this.getHazardStyle(
            hazard.type
        );

        const mesh = new THREE.Mesh(
            this.hazardGeometry,
            this.hazardMaterials[style]
        );

        const orbitLine =
            this.createHazardOrbit(hazard);

        const trailGeometry =
            createTrailGeometry(TRAIL_LIMIT);

        const trailLine = new THREE.Line(
            trailGeometry,
            this.hazardTrailMaterials[style]
        );

        this.scene.add(mesh);
        this.scene.add(orbitLine);
        this.scene.add(trailLine);

        const record = {
            mesh,
            orbitLine,
            trailLine,

            trailGeometry,
            trailPoints: [],

            lastTrailPoint: null,

            id: hazard.id,
            type: hazard.type
        };

        this.hazardMeshes.set(
            hazard.id,
            record
        );

        return record;
    }

    /* UPDATE ONE HAZARD TRAIL */

    updateHazardTrail(record, position) {
        const shouldAddPoint =
            !record.lastTrailPoint ||
            distanceBetween(
                position,
                record.lastTrailPoint
            ) >= HAZARD_TRAIL_DISTANCE;

        if (!shouldAddPoint) {
            return;
        }

        record.trailPoints.push(
            position.clone()
        );

        record.lastTrailPoint =
            position.clone();

        if (
            record.trailPoints.length >
            TRAIL_LIMIT
        ) {
            record.trailPoints.shift();
        }

        updateTrailGeometry(
            record.trailGeometry,
            record.trailPoints
        );
    }

    /* UPDATE ALL HAZARDS */

    updateHazards(hazards) {
        if (!Array.isArray(hazards)) {
            return;
        }

        const activeIds = new Set();

        for (const hazard of hazards) {
            if (
                !hazard ||
                !hazard.id ||
                !hazard.position
            ) {
                continue;
            }

            activeIds.add(hazard.id);

            let record =
                this.hazardMeshes.get(hazard.id);

            if (!record) {
                record = this.createHazardMesh(
                    hazard
                );
            }

            const visualPosition =
                toVisualPosition(
                    hazard.position
                );

            record.mesh.position.copy(
                visualPosition
            );

            /*
             * Visual marker size is intentionally separate
             * from the physical collision radius.
             */
            const style = this.getHazardStyle(
                hazard.type
            );

            const visualRadius =
                HAZARD_VISUAL_SIZE[style] || 0.018;

            record.mesh.scale.setScalar(
                visualRadius
            );

            this.updateHazardTrail(
                record,
                visualPosition
            );
        }

        /* REMOVE INACTIVE OBJECTS */

        for (const [id, record] of this.hazardMeshes) {
            if (!activeIds.has(id)) {
                this.removeHazardRecord(record);
                this.hazardMeshes.delete(id);
            }
        }
    }

    /* REMOVE ONE HAZARD RECORD */

    removeHazardRecord(record) {
        this.scene.remove(record.mesh);
        this.scene.remove(record.orbitLine);
        this.scene.remove(record.trailLine);

        // These geometries are unique to this record.
        record.orbitLine.geometry.dispose();
        record.trailGeometry.dispose();
    }

    /* RESET HAZARD TRAILS */

    resetHazardTrails() {
        for (const record of this.hazardMeshes.values()) {
            record.trailPoints = [];
            record.lastTrailPoint = null;

            record.trailGeometry.setDrawRange(0, 0);
        }
    }


    /* VIEWPORT-LOCAL CAMERA CONTROLS */
    installViewportCameraControls() {
        const canvas = this.renderer.domElement;
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        this.cameraDistance = this.camera.position.distanceTo(this.cameraTarget);
        this.cameraTheta = Math.atan2(this.camera.position.x, this.camera.position.z);
        this.cameraPhi = Math.acos(
            THREE.MathUtils.clamp(
                this.camera.position.y / this.cameraDistance,
                -1,
                1
            )
        );
        this.cameraPointer = null;

        const updateCamera = () => {
            const sinPhi = Math.sin(this.cameraPhi);
            this.camera.position.set(
                this.cameraTarget.x + this.cameraDistance * sinPhi * Math.sin(this.cameraTheta),
                this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraPhi),
                this.cameraTarget.z + this.cameraDistance * sinPhi * Math.cos(this.cameraTheta)
            );
            this.camera.lookAt(this.cameraTarget);
            this.render();
        };

        canvas.style.touchAction = "none";
        canvas.style.cursor = "grab";

        canvas.addEventListener("pointerdown", event => {
            if (event.button !== 0) return;
            this.cameraPointer = { x: event.clientX, y: event.clientY };
            canvas.setPointerCapture?.(event.pointerId);
            canvas.style.cursor = "grabbing";
        });

        canvas.addEventListener("pointermove", event => {
            if (!this.cameraPointer) return;
            const dx = event.clientX - this.cameraPointer.x;
            const dy = event.clientY - this.cameraPointer.y;
            this.cameraPointer = { x: event.clientX, y: event.clientY };
            this.cameraTheta -= dx * 0.006;
            this.cameraPhi = THREE.MathUtils.clamp(
                this.cameraPhi + dy * 0.006,
                0.12,
                Math.PI - 0.12
            );
            updateCamera();
        });

        const endDrag = () => {
            this.cameraPointer = null;
            canvas.style.cursor = "grab";
        };
        canvas.addEventListener("pointerup", endDrag);
        canvas.addEventListener("pointercancel", endDrag);
        canvas.addEventListener("lostpointercapture", endDrag);

        canvas.addEventListener("wheel", event => {
            event.preventDefault();
            this.cameraDistance = THREE.MathUtils.clamp(
                this.cameraDistance * (event.deltaY > 0 ? 1.08 : 0.92),
                1.6,
                12
            );
            updateCamera();
        }, { passive: false });

        canvas.addEventListener("dblclick", () => {
            this.cameraTheta = 0;
            this.cameraPhi = Math.acos(2.2 / 4.5);
            this.cameraDistance = 4.5;
            updateCamera();
        });
    }

    /* RESPONSIVE RESIZE */

    resize() {
        const width = Math.max(
            1,
            this.container.clientWidth
        );

        const height = Math.max(
            1,
            this.container.clientHeight
        );

        this.camera.aspect = width / height;

        this.camera.updateProjectionMatrix();

        this.renderer.setSize(
            width,
            height
        );
    }

    /* RENDER */

    render() {
        if (this.earth) this.earth.rotation.y += 0.00035;
        if (this.clouds) this.clouds.rotation.y += 0.00048;
        this.renderer.render(
            this.scene,
            this.camera
        );
    }

    /* CLEANUP */

    destroy() {
        this.resizeObserver?.disconnect();

        /*
         * Remove hazard-specific geometries first.
         * Their materials and shared mesh geometry are
         * disposed separately below.
         */
        for (const record of this.hazardMeshes.values()) {
            this.removeHazardRecord(record);
        }

        this.hazardMeshes.clear();

        /*
         * Dispose shared hazard resources once.
         */
        this.hazardGeometry?.dispose();

        for (const material of Object.values(
            this.hazardMaterials || {}
        )) {
            material.dispose();
        }

        for (const material of Object.values(
            this.hazardOrbitMaterials || {}
        )) {
            material.dispose();
        }

        for (const material of Object.values(
            this.hazardTrailMaterials || {}
        )) {
            material.dispose();
        }

        /*
         * Dispose remaining scene resources only once,
         * even if a geometry or material is referenced
         * by more than one object.
         */
        const geometries = new Set();
        const materials = new Set();

        this.scene.traverse(object => {
            if (object.geometry) {
                geometries.add(object.geometry);
            }

            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => {
                        materials.add(material);
                    });
                } else {
                    materials.add(object.material);
                }
            }
        });

        for (const geometry of geometries) {
            geometry.dispose();
        }

        for (const material of materials) {
            material.dispose();
        }

        this.renderer.dispose();

        if (
            this.renderer.domElement.parentNode ===
            this.container
        ) {
            this.container.removeChild(
                this.renderer.domElement
            );
        }
    }
}
