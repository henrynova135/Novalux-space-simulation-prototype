"use strict";

/* =========================================================
   NOVALUX ALPHA 0.2
   VISUAL SPACECRAFT DESIGNER
   Original UI and gameplay preserved
   ========================================================= */

/* =========================================================
   1. MISSION DATABASE
   ========================================================= */

const missions = {
    earth: {
        id: "NLX-EARTH-001",
        name: "Earth Observation",
        destination: "Earth",
        image: "img/earth.jpg",
        code: "NLX-001",
        type: "EARTH SCIENCE",
        description: "Design an observation satellite to collect scientific data about Earth.",
        objectives: [
            "Climate monitoring",
            "Ocean observation",
            "Land surface mapping",
            "Atmospheric research"
        ],
        defaultObjective: "Climate monitoring",
        defaults: {
            platform: "CubeSat",
            propulsion: "Chemical propulsion",
            power: "Solar array",
            instrument: "Multispectral camera",
            communication: "X-band communication",
            launcher: "Medium launch vehicle"
        }
    },

    moon: {
        id: "NLX-MOON-002",
        name: "Lunar Exploration",
        destination: "Moon",
        code: "NLX-002",
        image: "img/moon.jpg",
        type: "LUNAR SCIENCE",
        description: "Design a spacecraft to reach lunar orbit and investigate the Moon.",
        objectives: [
            "Lunar surface mapping",
            "Mineral composition study",
            "Water ice investigation",
            "Lunar environment research"
        ],
        defaultObjective: "Lunar surface mapping",
        defaults: {
            platform: "Small Satellite",
            propulsion: "Chemical propulsion",
            power: "Solar array",
            instrument: "High-resolution camera",
            communication: "X-band communication",
            launcher: "Heavy launch vehicle"
        }
    },

    mars: {
        id: "NLX-MARS-003",
        name: "Mars Exploration",
        destination: "Mars",
        code: "NLX-003",
        image: "img/mars.jpg",
        type: "PLANETARY SCIENCE",
        description: "Design an interplanetary spacecraft to investigate Mars.",
        objectives: [
            "Martian geology study",
            "Atmospheric research",
            "Surface exploration",
            "Water history investigation"
        ],
        defaultObjective: "Martian geology study",
        defaults: {
            platform: "Explorer",
            propulsion: "Advanced propulsion",
            power: "Radioisotope power",
            instrument: "Scientific sensor suite",
            communication: "Deep space communication",
            launcher: "Heavy launch vehicle"
        }
    }
};


/* =========================================================
   2. COMPONENT DATABASE
   Values are fictional game-balance estimates.
   ========================================================= */

const components = {
    platform: {
        label: "Spacecraft Platform",
        description: "Choose the main spacecraft structure and its baseline capabilities.",
        items: {
            "CubeSat": {
                type: "SPACECRAFT PLATFORM",
                description: "A compact modular satellite platform designed for smaller missions.",
                image: "img/smallship.jpg",
                mass: 15,
                powerDemand: 15,
                cost: 5,
                tradeoff: "Low mass and cost, but limited capacity.",
                science: 5
            },
            "Small Satellite": {
                type: "SPACECRAFT PLATFORM",
                description: "A flexible satellite architecture for medium-complexity missions.",
                image: "img/medium.jpg",
                mass: 45,
                powerDemand: 25,
                cost: 12,
                tradeoff: "Balanced capabilities and resource requirements.",
                science: 7
            },
            "Explorer": {
                type: "SPACECRAFT PLATFORM",
                description: "A larger spacecraft architecture for demanding exploration missions.",
                image: "img/largeship.jpg",
                mass: 100,
                powerDemand: 40,
                cost: 25,
                tradeoff: "High capability with increased mass and cost.",
                science: 10
            }
        }
    },

    propulsion: {
        label: "Propulsion Systems",
        description: "Propulsion affects spacecraft maneuvering capability, mass, and electrical demand.",
        items: {
            "Chemical propulsion": {
                type: "CHEMICAL PROPULSION",
                description: "A high-thrust propulsion architecture suitable for major maneuvers.",
                image: "img/chemical.jpg",
                mass: 18,
                power: 5,
                cost: 8,
                capability: 8,
                tradeoff: "High thrust, but relatively demanding propellant requirements."
            },
            "Electric propulsion": {
                type: "ELECTRIC PROPULSION",
                description: "An efficient propulsion system that uses electrical energy.",
                image: "img/electrical.jpg",
                mass: 10,
                power: 35,
                cost: 12,
                capability: 9,
                tradeoff: "High efficiency, but significant electrical demand."
            },
            "Cold gas propulsion": {
                type: "COLD GAS PROPULSION",
                description: "A relatively simple propulsion system for small adjustments.",
                image: "img/coldgas.png",
                mass: 5,
                power: 2,
                cost: 3,
                capability: 4,
                tradeoff: "Simple and inexpensive, with limited maneuvering capability."
            },
            "Advanced propulsion": {
                type: "ADVANCED PROPULSION",
                description: "A fictional advanced propulsion option for high-capability game scenarios.",
                image: "img/advanced.jpg",
                mass: 24,
                power: 20,
                cost: 20,
                capability: 10,
                tradeoff: "Strong modeled capability, but expensive and relatively heavy."
            }
        }
    },

    power: {
        label: "Power Systems",
        description: "Choose how your spacecraft generates and supplies electrical power.",
        items: {
            "Solar array": {
                type: "SOLAR POWER",
                description: "Converts sunlight into electrical energy for spacecraft systems.",
                image: "img/sloar.jpg",
                mass: 12,
                output: 65,
                cost: 7,
                tradeoff: "Lightweight and economical, with limited modeled output."
            },
            "High-efficiency solar array": {
                type: "ADVANCED SOLAR POWER",
                description: "A higher-output solar array for power-intensive spacecraft.",
                image: "img/highefficient.jpg",
                mass: 18,
                output: 110,
                cost: 13,
                tradeoff: "Greater output, but higher mass and cost."
            },
            "Radioisotope power": {
                type: "RADIOISOTOPE POWER",
                description: "A long-duration power source for missions with demanding environmental conditions.",
                image: "img/radioisotope.png",
                mass: 25,
                output: 55,
                cost: 22,
                tradeoff: "Useful for selected exploration scenarios, but expensive and heavy."
            }
        }
    },

    instrument: {
        label: "Scientific Instruments",
        description: "Choose the scientific payload that determines what your mission can investigate.",
        items: {
            "Multispectral camera": {
                type: "OPTICAL INSTRUMENT",
                description: "Collects observations across multiple spectral bands.",
                image: "img/multispectral.jpg",
                mass: 8,
                power: 15,
                cost: 8,
                science: 8,
                tradeoff: "Versatile observations with moderate resource demand."
            },
            "High-resolution camera": {
                type: "OPTICAL INSTRUMENT",
                description: "Captures detailed surface and terrain imagery.",
                image: "img/highresolution.jpg",
                mass: 12,
                power: 22,
                cost: 13,
                science: 10,
                tradeoff: "Detailed observations with increased power demand."
            },
            "Scientific sensor suite": {
                type: "MULTI-INSTRUMENT PAYLOAD",
                description: "Combines several scientific sensors for broader investigations.",
                image: "img/sensorsuite.jpg",
                mass: 16,
                power: 28,
                cost: 16,
                science: 10,
                tradeoff: "Broad scientific capability, but higher resource demand."
            },
            "Spectrometer": {
                type: "SPECTROSCOPY INSTRUMENT",
                description: "Analyzes light to investigate material and atmospheric properties.",
                image: "img/Spectrometer.jpg",
                mass: 10,
                power: 18,
                cost: 11,
                science: 9,
                tradeoff: "Specialized scientific measurements."
            },
            "Radar instrument": {
                type: "RADAR INSTRUMENT",
                description: "Uses radar observations to investigate surfaces and structures.",
                image: "img/radar.jpg",
                mass: 20,
                power: 40,
                cost: 18,
                science: 10,
                tradeoff: "Strong modeled capability, but high power demand."
            }
        }
    },

    communication: {
        label: "Communication Systems",
        description: "Select a communication architecture for sending mission data to Earth.",
        items: {
            "X-band communication": {
                type: "RADIO COMMUNICATION",
                description: "A communication system for medium-range mission scenarios.",
                image: "img/X.jpg",
                mass: 7,
                power: 12,
                cost: 6,
                capability: 7,
                tradeoff: "Balanced communication capability and resource demand."
            },
            "High-gain antenna": {
                type: "HIGH-GAIN COMMUNICATION",
                description: "A directional antenna designed for stronger communication links.",
                image: "img/Highgain.jpg",
                mass: 12,
                power: 18,
                cost: 12,
                capability: 10,
                tradeoff: "Strong modeled capability, with additional mass."
            },
            "Deep space communication": {
                type: "DEEP SPACE COMMUNICATION",
                description: "A communication architecture designed for deep-space scenarios.",
                image: "img/deepspace.jpg",
                mass: 18,
                power: 30,
                cost: 20,
                capability: 10,
                tradeoff: "High capability, but expensive and power-intensive."
            },
            "Low-power communication": {
                type: "LOW-POWER COMMUNICATION",
                description: "A compact communication system for simpler mission scenarios.",
                image: "img/low.jpg",
                mass: 4,
                power: 7,
                cost: 3,
                capability: 4,
                tradeoff: "Low resource demand, but limited communication capability."
            }
        }
    },

    launcher: {
        label: "Launch Vehicles",
        description: "Select a launch vehicle with sufficient modeled payload capacity for your spacecraft.",
        items: {
            "Small launch vehicle": {
                type: "LAUNCH VEHICLE",
                description: "A smaller launch system for lightweight payload scenarios.",
                image: "img/small.jpg",
                capacity: 80,
                cost: 12,
                tradeoff: "Lower launch cost, with limited payload capacity."
            },
            "Medium launch vehicle": {
                type: "LAUNCH VEHICLE",
                description: "A medium-class launch system for more capable spacecraft.",
                image: "img/medium.jpg",
                capacity: 350,
                cost: 28,
                tradeoff: "Balanced modeled payload capacity and cost."
            },
            "Heavy launch vehicle": {
                type: "LAUNCH VEHICLE",
                description: "A heavy launch system for large exploration mission scenarios.",
                image: "img/heavylift.jpg",
                capacity: 1500,
                cost: 65,
                tradeoff: "High payload capacity, but greater launch cost."
            }
        }
    }
};


/* =========================================================
   3. APPLICATION STATE AND HELPERS
   ========================================================= */

const categoryKeys = [
    "platform",
    "propulsion",
    "power",
    "instrument",
    "communication",
    "launcher"
];

const state = {
    mission: "earth",
    objective: "",
    selections: {
        platform: "",
        propulsion: "",
        power: "",
        instrument: "",
        communication: "",
        launcher: ""
    },
    activeCategory: "platform",
    duration: 12,
    lastEvaluation: null,
    reports: []
};

const $ = id => document.getElementById(id);

function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
}

function setHTML(id, value) {
    const element = $(id);
    if (element) element.innerHTML = value;
}

function setWidth(id, value) {
    const element = $(id);
    if (element) element.style.width = value;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function getComponent(category, name) {
    return components[category]?.items[name] || null;
}

function bind(id, event, callback) {
    const element = $(id);
    if (element) element.addEventListener(event, callback);
}


/* =========================================================
   4. NAVIGATION
   ========================================================= */

// Mission gameplay is locked until the launch simulator confirms orbital insertion.
let launchAuthorization = false;
let launchAuthorizationDetail = null;
let missionDestinationReached = false;

document.addEventListener("novalux:launchcomplete", event => {
    launchAuthorization = true;
    launchAuthorizationDetail = event.detail || null;
    missionDestinationReached = (launchAuthorizationDetail.destination || "earth") === "earth";
    showToast(missionDestinationReached ? "EARTH ORBIT ACHIEVED — OPERATIONS UNLOCKED" : "EARTH ORBIT ACHIEVED — INTERPLANETARY TRANSFER AVAILABLE");
    navigate(missionDestinationReached ? "game" : "simulation");
    if (missionDestinationReached) prepareMissionGame();
    else {
        stopMissionGame();
        setText("game-status", "DESTINATION NOT REACHED");
        setText("game-overlay-title", "Complete your interplanetary journey");
        setText("game-overlay-description", "Mission gameplay and surface objectives unlock only after successful arrival and landing at your selected destination.");
        if ($("game-start-button")) { $("game-start-button").disabled = true; $("game-start-button").textContent = "DESTINATION REQUIRED"; }
    }
});

document.addEventListener("novalux:missioncomplete", () => {
    missionDestinationReached = true;
    navigate("game");
    prepareMissionGame();
    showToast("DESTINATION REACHED — MISSION OBJECTIVES UNLOCKED");
});

document.addEventListener("novalux:launchreset", () => {
    launchAuthorization = false;
    launchAuthorizationDetail = null;
    missionDestinationReached = false;
    stopMissionGame();
    const start = $("game-start-button");
    if (start) { start.disabled = true; start.textContent = "MISSION LOCKED — LAUNCH REQUIRED"; }
    setText("game-status", "LAUNCH REQUIRED");
});

document.addEventListener("novalux:designchange", () => {
    launchAuthorization = false;
    launchAuthorizationDetail = null;
    missionDestinationReached = false;
    stopMissionGame();
    const start = $("game-start-button");
    if (start) start.disabled = true;
    setText("game-status", "LAUNCH REQUIRED");
    setText("game-overlay-title", "Launch your spacecraft first");
    setText("game-overlay-description", "Complete a successful rocket launch and verified orbital insertion before mission gameplay becomes available.");
});

function navigate(viewName) {
    if (viewName === "game" && !launchAuthorization) {
        showToast("MISSION LOCKED — achieve orbit with your rocket first");
        viewName = "simulation";
    }
    document.querySelectorAll(".view").forEach(view => {
        view.classList.remove("active");
    });

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === viewName
        );
    });

    const target = $(viewName + "-view");
    if (target) target.classList.add("active");

    const titles = {
        overview: "Mission Overview",
        designer: "Spacecraft Designer",
        simulation: "Mission Simulation",
        reports: "Mission Reports",
        game: "Mission Gameplay",
        phase5: "Advanced Space Exploration",
        expedition: "Expedition Campaign",
        engineering: "Spacecraft Engineering",
        challenge: "Mission Design Challenge"
    };

    setText("page-title", titles[viewName] || "NOVALUX");

    // Notify the separate orbital simulation module once per navigation.
    document.dispatchEvent(new Event("novalux:viewchange"));
}

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        navigate(button.dataset.view);
    });
});

bind("start-design", "click", () => navigate("designer"));

document.querySelectorAll(".mission-link").forEach(button => {
    button.addEventListener("click", () => {
        selectMission(button.dataset.mission);
        navigate("designer");
    });
});


/* =========================================================
   5. MISSION CATALOGUE
   ========================================================= */

function renderMissionCards() {
    const grid = $("mission-grid");
    if (!grid) return;

    grid.innerHTML = "";

    Object.entries(missions).forEach(([key, mission]) => {
        const card = document.createElement("article");
        card.className =
            "mission-card" + (state.mission === key ? " selected" : "");

        const symbol = { earth: "◎", moon: "☾", mars: "◇" }[key];

        card.innerHTML = `
            <div class="mission-art">
                <div class="mission-image-fallback">
                    <div>
                        <span>${symbol}</span>
                        ${escapeHTML(mission.destination.toUpperCase())}
                    </div>
                </div>
                <img src="${escapeHTML(mission.image)}"
                     alt="${escapeHTML(mission.destination)}"
                     loading="lazy">
            </div>
            <div class="mission-card-content">
                <div class="mission-type">${escapeHTML(mission.type)}</div>
                <h3>${escapeHTML(mission.name)}</h3>
                <p>${escapeHTML(mission.description)}</p>
                <div class="mission-card-footer">
                    <span>${escapeHTML(mission.code)}</span>
                    <button type="button">SELECT MISSION →</button>
                </div>
            </div>
        `;

        const image = card.querySelector("img");
        image.addEventListener("load", () => {
            card.querySelector(".mission-image-fallback").style.display = "none";
        });
        image.addEventListener("error", () => {
            image.style.display = "none";
        });

        card.querySelector("button").addEventListener("click", () => {
            selectMission(key);
            navigate("designer");
        });

        grid.appendChild(card);
    });
}


/* =========================================================
   6. MISSION INITIALIZATION
   ========================================================= */

function applyMissionDefaults(key) {
    const mission = missions[key];
    state.objective = mission.defaultObjective;

    categoryKeys.forEach(category => {
        state.selections[category] = mission.defaults[category];
    });
}

function selectMission(key) {
    if (!missions[key]) return;

    state.mission = key;
    applyMissionDefaults(key);

    state.lastEvaluation = null;
    state.activeCategory = "platform";

    populateMissionInterface();
    updateActiveCategoryTab();
    renderComponentCatalogue();
    updateInterface();
    renderMissionCards();
    renderSimulation();

    showToast(missions[key].name + " selected");
}


/* =========================================================
   7. MISSION OBJECTIVE
   ========================================================= */

function populateMissionInterface() {
    const mission = missions[state.mission];
    const objective = $("mission-objective");

    if (objective) {
        objective.innerHTML = "";

        mission.objectives.forEach(item => {
            const option = document.createElement("option");
            option.value = item;
            option.textContent = item;
            objective.appendChild(option);
        });

        objective.value = state.objective;
    }

    setText("mission-id", mission.id);
    setText("designer-mission-name", mission.name);
    setText("designer-mission-code", mission.code);
    setText("simulation-mission-name", mission.name);
    setText("simulation-description", mission.description);

    const duration = $("duration");
    if (duration) duration.value = state.duration;

    setText("duration-value", state.duration + " months");
}

bind("mission-objective", "change", event => {
    state.objective = event.target.value;
    state.lastEvaluation = null;
    updateInterface();
});


/* =========================================================
   8. COMPONENT CATEGORY NAVIGATION
   ========================================================= */

function updateActiveCategoryTab() {
    document.querySelectorAll(".component-tab").forEach(tab => {
        tab.classList.toggle(
            "active",
            tab.dataset.category === state.activeCategory
        );
    });
}

document.querySelectorAll(".component-tab").forEach(button => {
    button.addEventListener("click", () => {
        state.activeCategory = button.dataset.category;
        updateActiveCategoryTab();
        renderComponentCatalogue();
    });
});


/* =========================================================
   9. COMPONENT IMAGE AND CARD RENDERING
   ========================================================= */

function createComponentImage(item) {
    // Images are optional: when item.image is null only the placeholder shows.
    const img = item.image
        ? `<img src="${escapeHTML(item.image)}"
                 alt="${escapeHTML(item.type)}"
                 loading="lazy">`
        : "";

    return `
        <div class="component-image">
            <div class="component-image-fallback">
                <div><span>◇</span>IMAGE PLACEHOLDER</div>
            </div>
            ${img}
        </div>
    `;
}

function getComponentSpecs(category, item) {
    if (category === "platform") {
        return [
            ["MASS", item.mass + " kg"],
            ["BASE POWER", item.powerDemand + " W"],
            ["COST", item.cost + " M"],
            ["SCIENCE", item.science + "/10"]
        ];
    }

    if (category === "power") {
        return [
            ["MASS", item.mass + " kg"],
            ["OUTPUT", item.output + " W"],
            ["COST", item.cost + " M"],
            ["TYPE", "POWER"]
        ];
    }

    if (category === "launcher") {
        return [
            ["CAPACITY", item.capacity + " kg"],
            ["LAUNCH COST", item.cost + " M"],
            ["TYPE", "LAUNCH"],
            ["CLASS", "VEHICLE"]
        ];
    }

    return [
        ["MASS", item.mass + " kg"],
        ["POWER", item.power + " W"],
        ["COST", item.cost + " M"],
        [
            category === "instrument" ? "SCIENCE" : "CAPABILITY",
            (item.science ?? item.capability) + "/10"
        ]
    ];
}

function renderComponentCard(category, name, item) {
    const selected = state.selections[category] === name;
    const specs = getComponentSpecs(category, item);

    return `
        <article class="component-card ${selected ? "selected" : ""}"
                 data-category="${category}"
                 data-component="${escapeHTML(name)}"
                 tabindex="0"
                 role="button"
                 aria-pressed="${selected}"
                 aria-label="Select ${escapeHTML(name)}">
            <div class="selected-check">✓</div>
            ${createComponentImage(item)}
            <div class="component-card-content">
                <div class="component-card-top">
                    <div>
                        <div class="component-type">${escapeHTML(item.type)}</div>
                        <h4>${escapeHTML(name)}</h4>
                    </div>
                </div>
                <p class="component-description">${escapeHTML(item.description)}</p>
                <div class="component-specs">
                    ${specs.map(([label, value]) => `
                        <div class="component-spec">
                            <small>${escapeHTML(label)}</small>
                            <strong>${escapeHTML(value)}</strong>
                        </div>
                    `).join("")}
                </div>
                <div class="component-card-footer">
                    <span class="component-tradeoff">${escapeHTML(item.tradeoff)}</span>
                    <button class="component-select" type="button">
                        ${selected ? "SELECTED ✓" : "SELECT"}
                    </button>
                </div>
            </div>
        </article>
    `;
}

function renderComponentCatalogue() {
    const category = state.activeCategory;
    const catalogue = components[category];
    const grid = $("component-grid");

    if (!catalogue || !grid) return;

    const entries = Object.entries(catalogue.items);

    setText("category-description", catalogue.description);
    setText("component-count", entries.length + " COMPONENTS");

    grid.innerHTML = entries.map(([name, item]) => {
        return renderComponentCard(category, name, item);
    }).join("");

    grid.querySelectorAll(".component-card").forEach(card => {
        const selectCard = () => {
            selectComponent(card.dataset.category, card.dataset.component);
        };

        card.addEventListener("click", selectCard);

        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectCard();
            }
        });
    });

    grid.querySelectorAll(".component-image img").forEach(image => {
        image.addEventListener("load", () => {
            image.parentElement.querySelector(
                ".component-image-fallback"
            ).style.display = "none";
        });

        image.addEventListener("error", () => {
            image.style.display = "none";
        });
    });
}


/* =========================================================
   10. COMPONENT SELECTION AND DURATION
   ========================================================= */

function selectComponent(category, name) {
    if (!getComponent(category, name)) return;

    state.selections[category] = name;
    state.lastEvaluation = null;

    renderComponentCatalogue();
    updateInterface();
    showToast(name + " selected");
}

bind("duration", "input", event => {
    state.duration = Number(event.target.value);
    setText("duration-value", state.duration + " months");

    state.lastEvaluation = null;
    updateInterface();
});


/* =========================================================
   11. CONFIGURATION AND RESOURCE CALCULATIONS
   ========================================================= */

function getMissingComponents() {
    return categoryKeys.filter(category => {
        return !getComponent(category, state.selections[category]);
    });
}

function getConfigurationProgress() {
    const completed = categoryKeys.filter(category => {
        return Boolean(getComponent(category, state.selections[category]));
    }).length;

    const total = categoryKeys.length + 1;
    const progress = completed + (state.objective ? 1 : 0);

    return Math.round(progress / total * 100);
}

function calculateResources() {
    const selected = {};

    for (const category of categoryKeys) {
        selected[category] = getComponent(
            category,
            state.selections[category]
        );

        if (!selected[category]) return null;
    }

    const {
        platform,
        propulsion,
        power,
        instrument,
        communication,
        launcher
    } = selected;

    const totalMass =
        platform.mass +
        propulsion.mass +
        power.mass +
        instrument.mass +
        communication.mass;

    const powerOutput = power.output;

    const powerDemand =
        platform.powerDemand +
        propulsion.power +
        instrument.power +
        communication.power;

    const totalBudget =
        platform.cost +
        propulsion.cost +
        power.cost +
        instrument.cost +
        communication.cost +
        launcher.cost;

    return {
        totalMass,
        powerOutput,
        powerDemand,
        totalBudget,
        availableMass: launcher.capacity,
        massMargin: launcher.capacity - totalMass,
        powerMargin: powerOutput - powerDemand,
        selected
    };
}


/* =========================================================
   12. COMPATIBILITY DIAGNOSTICS
   ========================================================= */

function getCompatibility(resources) {
    if (!resources) {
        return [{
            type: "warning",
            text: "Select all engineering components to run compatibility checks."
        }];
    }

    const checks = [];

    checks.push(resources.massMargin < 0
        ? {
            type: "bad",
            text: "Spacecraft mass exceeds the selected launch vehicle's modeled capacity."
        }
        : {
            type: "good",
            text: "Spacecraft mass is within the modeled launch capacity."
        }
    );

    checks.push(resources.powerMargin < 0
        ? {
            type: "bad",
            text: "Electrical power demand exceeds modeled power generation."
        }
        : {
            type: "good",
            text: "Power generation meets modeled electrical demand."
        }
    );

    const communication = resources.selected.communication;

    if (state.mission === "mars" && communication.capability < 10) {
        checks.push({
            type: "warning",
            text: "The communication system has limited capability for this Mars scenario."
        });
    } else {
        checks.push({
            type: "good",
            text: "Communication capability meets the current scenario requirement."
        });
    }

    if (
        state.mission === "mars" &&
        state.selections.launcher !== "Heavy launch vehicle"
    ) {
        checks.push({
            type: "warning",
            text: "This prototype's Mars scenario recommends a heavy launch vehicle."
        });
    }

    if (state.duration > 36) {
        checks.push({
            type: "warning",
            text: "Long mission duration introduces additional reliability considerations."
        });
    }

    return checks;
}

function renderCompatibility(resources) {
    const checks = getCompatibility(resources);

    setHTML("compatibility-list", checks.map(check => {
        const symbol = {
            good: "✓",
            warning: "!",
            bad: "×"
        }[check.type];

        return `
            <div class="compatibility-item ${check.type}">
                <span class="compatibility-icon">${symbol}</span>
                <span>${escapeHTML(check.text)}</span>
            </div>
        `;
    }).join(""));
}


/* =========================================================
   13. DESIGN READINESS
   ========================================================= */

function calculateReadiness(resources) {
    if (!resources) return 0;

    let score = 100;

    if (resources.massMargin < 0) score -= 35;
    if (resources.powerMargin < 0) score -= 35;

    if (
        resources.massMargin >= 0 &&
        resources.massMargin < resources.totalMass * 0.1
    ) score -= 10;

    if (
        resources.powerMargin >= 0 &&
        resources.powerMargin < resources.powerDemand * 0.1
    ) score -= 10;

    if (
        state.mission === "mars" &&
        resources.selected.communication.capability < 10
    ) score -= 15;

    if (
        state.mission === "mars" &&
        state.selections.launcher !== "Heavy launch vehicle"
    ) score -= 20;

    if (
        state.mission === "moon" &&
        state.selections.launcher === "Small launch vehicle"
    ) score -= 15;

    if (state.duration > 36) score -= 5;

    return Math.max(0, Math.min(100, score));
}


/* =========================================================
   14. SPACECRAFT PREVIEW AND ASSEMBLY
   ========================================================= */

function updateSpacecraftPreview() {
    const platformName = state.selections.platform;
    const platform = getComponent("platform", platformName);
    const preview = $("spacecraft-preview-image");

    if (!platform) {
        setText("spacecraft-preview-name", "Unconfigured Spacecraft");
        setText(
            "spacecraft-preview-description",
            "Select a spacecraft platform to begin."
        );

        if (preview) {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <span>SPACECRAFT</span>
                    <small>SELECT A PLATFORM</small>
                </div>
            `;
        }

        return;
    }

    setText("spacecraft-preview-name", platformName + " Platform");
    setText("spacecraft-preview-description", platform.description);

    if (!preview) return;

    if (!platform.image) {
        preview.innerHTML = `
            <div class="preview-placeholder">
                <span>◇</span>
                <small>PLATFORM IMAGE PLACEHOLDER</small>
            </div>
        `;
        return;
    }

    preview.innerHTML = `
        <img src="${escapeHTML(platform.image)}"
             alt="${escapeHTML(platformName)}">
    `;

    const image = preview.querySelector("img");

    image.addEventListener("error", () => {
        preview.innerHTML = `
            <div class="preview-placeholder">
                <span>◇</span>
                <small>PLATFORM IMAGE PLACEHOLDER</small>
            </div>
        `;
    });
}

function renderAssemblySummary() {
    const container = $("assembly-summary");
    if (!container) return;

    container.innerHTML = categoryKeys.map(category => `
        <div class="assembly-item">
            <span>${escapeHTML(components[category].label)}</span>
            <strong>${escapeHTML(state.selections[category] || "Not selected")}</strong>
        </div>
    `).join("");
}


/* =========================================================
   15. LIVE INTERFACE UPDATE
   ========================================================= */

function updateInterface() {
    document.dispatchEvent(new Event("novalux:designchange"));

    const resources = calculateResources();
    const progress = getConfigurationProgress();

    setText("config-progress-label", progress + "%");
    setWidth("config-progress", progress + "%");

    setText("summary-destination", missions[state.mission].destination);
    setText("summary-spacecraft", state.selections.platform || "Unconfigured");
    setText(
        "summary-score",
        state.lastEvaluation ? state.lastEvaluation.score + "/100" : "--"
    );
    setText(
        "evaluation-status",
        state.lastEvaluation ? "COMPLETED" : "NOT RUN"
    );

    updateSpacecraftPreview();
    renderAssemblySummary();
    renderCompatibility(resources);

    if (!resources) {
        setText("mass-value", "-- kg");
        setText("power-value", "-- W");
        setText("budget-value", "-- M");

        setWidth("mass-bar", "0%");
        setWidth("power-bar", "0%");
        setWidth("budget-bar", "0%");

        setText("readiness-score", "--");
        setText(
            "readiness-description",
            "Select all required components to calculate design readiness."
        );

        return;
    }

    const readiness = calculateReadiness(resources);

    setText("mass-value", resources.totalMass + " kg");
    setText("power-value", resources.powerOutput + " W");
    setText("budget-value", resources.totalBudget + " M");

    setWidth(
        "mass-bar",
        Math.min(100, resources.totalMass /
            Math.max(resources.availableMass, 1) * 100) + "%"
    );

    setWidth(
        "power-bar",
        Math.min(100, resources.powerOutput /
            Math.max(resources.powerDemand * 1.5, 1) * 100) + "%"
    );

    setWidth(
        "budget-bar",
        Math.min(100, resources.totalBudget / 200 * 100) + "%"
    );

    setText("readiness-score", readiness + "%");

    setText(
        "readiness-description",
        readiness >= 85
            ? "Your preliminary design appears promising."
            : readiness >= 65
                ? "Your design has potential, but some constraints need attention."
                : "Your design has significant engineering limitations."
    );
}


/* =========================================================
   16. MISSION EVALUATION
   ========================================================= */

function evaluateMission() {
    if (getMissingComponents().length) {
        showToast("Complete all engineering categories first");
        return null;
    }

    const resources = calculateResources();
    let score = 100;
    const findings = [];

    if (resources.massMargin < 0) {
        score -= 35;
        findings.push({
            type: "bad",
            text: "Spacecraft mass exceeds the selected launch vehicle's modeled capacity."
        });
    } else {
        findings.push({
            type: "good",
            text: "Spacecraft mass is within the selected launch vehicle's modeled capacity."
        });
    }

    if (resources.powerMargin < 0) {
        score -= 30;
        findings.push({
            type: "bad",
            text: "Power demand exceeds available power generation."
        });
    } else {
        findings.push({
            type: "good",
            text: "Available power exceeds modeled spacecraft demand."
        });
    }

    if (
        state.mission === "mars" &&
        resources.selected.communication.capability < 10
    ) {
        score -= 15;
        findings.push({
            type: "warning",
            text: "Communication capability is limited for this deep-space scenario."
        });
    } else {
        findings.push({
            type: "good",
            text: "Communication capability meets the current game-design requirement."
        });
    }

    if (
        state.mission === "mars" &&
        state.selections.launcher !== "Heavy launch vehicle"
    ) {
        score -= 20;
        findings.push({
            type: "warning",
            text: "The selected launch vehicle does not meet this prototype's Mars scenario recommendation."
        });
    }

    if (
        state.mission === "moon" &&
        state.selections.launcher === "Small launch vehicle"
    ) {
        score -= 15;
        findings.push({
            type: "warning",
            text: "The selected launch vehicle has limited capability for this lunar scenario."
        });
    }

    if (resources.selected.instrument.science >= 9) {
        findings.push({
            type: "good",
            text: "The selected scientific payload has strong modeled science capability."
        });
    } else {
        score -= 5;
        findings.push({
            type: "warning",
            text: "Consider a more capable scientific instrument."
        });
    }

    if (state.duration > 36) {
        score -= 5;
        findings.push({
            type: "warning",
            text: "Long mission duration may introduce additional reliability challenges."
        });
    }

    score = Math.max(0, Math.min(100, score));

    const result = {
        mission: missions[state.mission].name,
        missionId: missions[state.mission].id,
        score,
        resources,
        findings,
        date: new Date().toLocaleString(),
        objective: state.objective,
        selections: { ...state.selections },
        duration: state.duration
    };

    state.lastEvaluation = result;
    state.reports.unshift(result);

    updateInterface();
    renderResults(result);
    renderReports();

    return result;
}


/* =========================================================
   17. SIMULATION OUTPUT
   ========================================================= */

function renderResults(result) {
    const panel = $("results-panel");
    if (!panel) return;

    const classification =
        result.score >= 85
            ? "PROMISING DESIGN"
            : result.score >= 65
                ? "PARTIALLY READY"
                : "NEEDS IMPROVEMENT";

    panel.innerHTML = `
        <div class="eyebrow">MISSION EVALUATION COMPLETE</div>
        <h3>${escapeHTML(result.mission)}</h3>
        <div class="result-score">${result.score}/100</div>
        <strong>${classification}</strong>
        <p>Preliminary engineering evaluation for
            ${escapeHTML(result.selections.platform)} spacecraft.</p>

        <ul class="result-list">
            ${result.findings.map(item => `
                <li class="${item.type}">
                    ${item.type === "good" ? "✓" :
                      item.type === "warning" ? "!" : "×"}
                    ${escapeHTML(item.text)}
                </li>
            `).join("")}
        </ul>

        <div class="divider"></div>

        <p>
            Estimated mass: ${result.resources.totalMass} kg<br>
            Modeled launch capacity: ${result.resources.availableMass} kg<br>
            Modeled power generation: ${result.resources.powerOutput} W<br>
            Modeled power demand: ${result.resources.powerDemand} W<br>
            Estimated game budget: ${result.resources.totalBudget} M
        </p>

        <div class="resource-note">
            This is a preliminary game evaluation using fictional balance values.
            It is not a physical trajectory simulation or a real mission feasibility assessment.
        </div>
    `;
}


/* =========================================================
   18. SIMULATION VIEW AND EVALUATION BUTTONS
   ========================================================= */

function renderSimulation() {
    const mission = missions[state.mission];

    setText("simulation-mission-name", mission.name);
    setText("simulation-description", mission.description);

    const planet = $("simulation-planet");
    if (planet) planet.className = "simulation-planet " + state.mission;
}

function openEvaluation(result) {
    if (!result) return;

    renderEvaluationModal(result);

    const modal = $("evaluation-modal");
    if (modal) modal.classList.add("show");
}

bind("evaluate-button", "click", () => {
    openEvaluation(evaluateMission());
});

bind("run-simulation", "click", () => {
    openEvaluation(evaluateMission());
});


/* =========================================================
   19. MISSION REPORTS
   ========================================================= */

function renderReports() {
    const container = $("reports-container");
    if (!container) return;

    if (!state.reports.length) {
        container.innerHTML = `
            <div class="empty-state">
                <span>▤</span>
                <h3>No reports available</h3>
                <p>Your mission evaluations will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = state.reports.map(report => `
        <div class="report-item">
            <div>
                <strong>${escapeHTML(report.mission)}</strong>
                <small>
                    ${escapeHTML(report.missionId)} ·
                    ${escapeHTML(report.date)}
                </small>
            </div>
            <span>${Number(report.score)}/100</span>
        </div>
    `).join("");
}


/* =========================================================
   20. SAVE AND LOAD SYSTEM
   ========================================================= */

function saveDesign() {
    const saveData = {
        version: 2,
        mission: state.mission,
        objective: state.objective,
        selections: state.selections,
        activeCategory: state.activeCategory,
        duration: state.duration,
        reports: state.reports
    };

    try {
        localStorage.setItem("novalux-save", JSON.stringify(saveData));
        showToast("Mission design saved successfully");
    } catch (error) {
        console.error("Save failed:", error);
        showToast("Unable to save mission design");
    }
}

function loadDesign() {
    try {
        const saved = localStorage.getItem("novalux-save");
        if (!saved) return false;

        const data = JSON.parse(saved);

        if (!missions[data.mission]) return false;

        state.mission = data.mission;
        applyMissionDefaults(data.mission);

        if (data.selections && typeof data.selections === "object") {
            categoryKeys.forEach(category => {
                const savedName = data.selections[category];

                if (getComponent(category, savedName)) {
                    state.selections[category] = savedName;
                }
            });
        }

        if (missions[data.mission].objectives.includes(data.objective)) {
            state.objective = data.objective;
        }

        if (Number.isFinite(Number(data.duration))) {
            state.duration = Math.max(1, Math.min(60, Number(data.duration)));
        }

        if (categoryKeys.includes(data.activeCategory)) {
            state.activeCategory = data.activeCategory;
        }

        state.reports = Array.isArray(data.reports)
            ? data.reports.slice(0, 50)
            : [];

        state.lastEvaluation = null;

        return true;
    } catch (error) {
        console.error("Save data could not be loaded:", error);
        return false;
    }
}

bind("save-button", "click", saveDesign);


/* =========================================================
   21. NOTIFICATIONS
   ========================================================= */

let toastTimeout;

function showToast(message) {
    const toast = $("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


/* =========================================================
   22. EVALUATION MODAL
   ========================================================= */

function renderEvaluationModal(result) {
    setText("modal-score", result.score);

    setText(
        "modal-description",
        result.mission + " has completed preliminary evaluation."
    );

    setText("modal-mass", result.resources.totalMass + " kg");
    setText("modal-power", result.resources.powerOutput + " W");
    setText("modal-budget", result.resources.totalBudget + " M");

    const classification = $("modal-classification");

    if (classification) {
        classification.textContent =
            result.score >= 85
                ? "PROMISING DESIGN"
                : result.score >= 65
                    ? "PARTIALLY READY"
                    : "DESIGN NEEDS IMPROVEMENT";

        classification.style.color =
            result.score >= 85
                ? "var(--green)"
                : result.score >= 65
                    ? "var(--orange)"
                    : "var(--red)";
    }

    setHTML("modal-findings", `
        <ul class="result-list">
            ${result.findings.map(item => `
                <li class="${item.type}">
                    ${item.type === "good" ? "✓" :
                      item.type === "warning" ? "!" : "×"}
                    ${escapeHTML(item.text)}
                </li>
            `).join("")}
        </ul>
    `);
}

function closeEvaluationModal() {
    const modal = $("evaluation-modal");
    if (modal) modal.classList.remove("show");
}

bind("modal-close", "click", closeEvaluationModal);

bind("modal-edit-button", "click", () => {
    closeEvaluationModal();
    navigate("designer");
});

bind("modal-proceed-button", "click", () => {
    closeEvaluationModal();
    if (launchAuthorization) {
        navigate("game");
        prepareMissionGame();
        return;
    }
    navigate("simulation");
    showToast("Complete the rocket launch to unlock mission gameplay");
    requestAnimationFrame(() => $("novalux-launch-system")?.scrollIntoView({ behavior: "smooth", block: "start" }));
});

bind("evaluation-modal", "click", event => {
    if (event.target === $("evaluation-modal")) {
        closeEvaluationModal();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeEvaluationModal();
});


/* =========================================================
   23. MISSION GAME ENGINE
   ========================================================= */

function dispatchMissionGameSound(name) {
    document.dispatchEvent(new Event(`novalux:game-${name}`));
}

const missionGame = {
    active: false,
    finished: false,
    animationFrame: null,

    time: 180,
    power: 100,
    fuel: 100,
    fuelBurnRate: 0.8,
    hull: 100,
    communication: 100,
    progress: 0,
    missionElapsed: 0,

    collected: 0,
    obstacles: [],
    collectibles: [],

    lastTime: 0,
    spawnTimer: 0,
    collectibleTimer: 0,

    player: {
        x: 450,
        y: 360,
        width: 34,
        height: 34,
        speed: 330
    },

    keys: {
        left: false,
        right: false,
        up: false,
        down: false
    }
};

const gameCanvas = $("mission-canvas");
const gameContext = gameCanvas
    ? gameCanvas.getContext("2d")
    : null;

const GAME_WIDTH = 900;
const GAME_HEIGHT = 460;

const gameConfigurations = {
    earth: {
        title: "Earth Orbital Navigation",
        description: "Navigate through Earth's orbital environment. Avoid space debris and collect observation data.",
        objective: "REACH THE OBSERVATION ZONE",
        controls: "Use ← → or A / D to navigate",
        obstacle: "debris",
        collectible: "data",
        player: "satellite",
        background: "#06162a"
    },

    moon: {
        title: "Lunar Landing Challenge",
        description: "Guide your lunar spacecraft toward a safe landing area. Avoid obstacles and maintain control.",
        objective: "REACH THE LUNAR LANDING ZONE",
        controls: "Use ← → ↑ ↓ or WASD to control",
        obstacle: "rock",
        collectible: "sample",
        player: "lander",
        background: "#151b27"
    },

    mars: {
        title: "Mars Surface Exploration",
        description: "Navigate the Martian terrain, avoid rocks, and collect scientific research data.",
        objective: "EXPLORE THE MARTIAN SURFACE",
        controls: "Use ← → or A / D to steer",
        obstacle: "rock",
        collectible: "research",
        player: "rover",
        background: "#281b1b"
    }
};


/* =========================================================
   24. GAME PREPARATION
   ========================================================= */

function prepareMissionGame() {
    if (!launchAuthorization) {
        stopMissionGame();
        setText("game-status", "LAUNCH REQUIRED");
        setText("game-overlay-title", "Launch your spacecraft first");
        setText("game-overlay-description", "Mission gameplay unlocks only after a successful launch and verified orbital insertion.");
        const overlay = $("game-overlay");
        if (overlay) overlay.classList.remove("hidden");
        const start = $("game-start-button");
        if (start) { start.disabled = true; start.textContent = "MISSION LOCKED"; }
        return;
    }
    if (!missionDestinationReached) {
        stopMissionGame();
        setText("game-status", "DESTINATION REQUIRED");
        setText("game-overlay-title", "Complete the destination mission first");
        setText("game-overlay-description", "Reach the selected destination, establish orbit and complete a successful landing before mission objectives unlock.");
        const overlay = $("game-overlay");
        if (overlay) overlay.classList.remove("hidden");
        const start = $("game-start-button");
        if (start) { start.disabled = true; start.textContent = "DESTINATION REQUIRED"; }
        return;
    }
    const config = gameConfigurations[state.mission];
    const resources = calculateResources();

    if (!config || !resources) {
        showToast("Complete your spacecraft configuration first");
        navigate("designer");
        return;
    }

    stopMissionGame();

    missionGame.finished = false;
    missionGame.active = false;

    missionGame.time = 180;
    missionGame.fuel = 100;
    missionGame.missionElapsed = 0;
    missionGame.fuelBurnRate = 0.8;
    missionGame.hull = 100;
    missionGame.progress = 0;
    missionGame.collected = 0;

    const propulsionFuelRates = {
        "Chemical propulsion": 0.8,
        "Electric propulsion": 0.22,
        "Cold gas propulsion": 0.5,
        "Advanced propulsion": 0.35
    };

    missionGame.fuelBurnRate =
        propulsionFuelRates[state.selections.propulsion] ?? 0.8;

    const powerRatio =
        resources.powerOutput / Math.max(resources.powerDemand, 1);

    missionGame.power = Math.max(
        55,
        Math.min(100, 70 + (powerRatio - 1) * 30)
    );

    const communicationComponent = resources.selected.communication;

    missionGame.communication = Math.min(
        100,
        Math.max(30, communicationComponent.capability * 10)
    );

    missionGame.obstacles = [];
    missionGame.collectibles = [];

    missionGame.spawnTimer = 0;
    missionGame.collectibleTimer = 0;
    missionGame.lastTime = 0;

    missionGame.player.x = GAME_WIDTH / 2;
    missionGame.player.y = 360;

    missionGame.keys = {
        left: false,
        right: false,
        up: false,
        down: false
    };

    setText("game-title", config.title);
    setText("game-description", config.description);
    setText("game-objective", config.objective);
    setText("game-controls-description", config.controls);
    setText("game-status", "READY");
    setText("game-spacecraft-name", state.selections.platform);
    setText("game-power-generation", resources.powerOutput + " W");
    setText("game-power-demand", resources.powerDemand + " W");
    setText("game-duration", state.duration + " months");
    setText("game-timer", "TIME: 180");

    const overlay = $("game-overlay");
    if (overlay) overlay.classList.remove("hidden");

    setText("game-overlay-title", "Prepare for deployment");
    setText("game-overlay-description", config.description);
    setText("game-start-button", "START MISSION →");
    if ($("game-start-button")) $("game-start-button").disabled = false;

    updateGameTelemetry();
    updateGameChecklist();
    drawMissionGame();
}


/* =========================================================
   25. GAME INPUT AND TOUCH CONTROLS
   ========================================================= */

function setGameKey(key, pressed) {
    if (!missionGame.active) return;

    const normalized = key.toLowerCase();

    let direction = null;
    if (key === "ArrowLeft" || normalized === "a") direction = "left";
    if (key === "ArrowRight" || normalized === "d") direction = "right";
    if (key === "ArrowUp" || normalized === "w") direction = "up";
    if (key === "ArrowDown" || normalized === "s") direction = "down";
    if (direction) {
        const wasPressed = missionGame.keys[direction];
        missionGame.keys[direction] = pressed;
        if (pressed && !wasPressed) dispatchMissionGameSound("thruster");
    }
}

document.addEventListener("keydown", event => {
    const gameView = $("game-view");
    if (!gameView?.classList.contains("active")) return;

    const keys = [
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "a", "d", "w", "s"
    ];

    if (keys.includes(event.key)) {
        event.preventDefault();
        setGameKey(event.key, true);
    }
});

document.addEventListener("keyup", event => {
    setGameKey(event.key, false);
});

window.addEventListener("blur", () => {
    missionGame.keys.left = false;
    missionGame.keys.right = false;
    missionGame.keys.up = false;
    missionGame.keys.down = false;
});

function bindGameControl(buttonId, direction) {
    const button = $(buttonId);
    if (!button) return;

    const press = event => {
        event.preventDefault();
        if (missionGame.active && !missionGame.keys[direction]) {
            missionGame.keys[direction] = true;
            dispatchMissionGameSound("thruster");
        }
    };

    const release = event => {
        event.preventDefault();
        missionGame.keys[direction] = false;
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("pointercancel", release);
}

bindGameControl("game-left", "left");
bindGameControl("game-right", "right");
bindGameControl("game-up", "up");
bindGameControl("game-down", "down");


/* =========================================================
   26. GAME START / STOP
   ========================================================= */

function startMissionGame() {
    if (!launchAuthorization || !missionDestinationReached) {
        prepareMissionGame();
        return;
    }
    if (missionGame.finished) prepareMissionGame();
    if (missionGame.active) return;

    missionGame.active = true;
    missionGame.finished = false;
    missionGame.lastTime = performance.now();
    dispatchMissionGameSound("start");

    $("game-overlay")?.classList.add("hidden");
    setText("game-status", "MISSION ACTIVE");

    missionGame.animationFrame =
        requestAnimationFrame(updateMissionGame);
}

function stopMissionGame() {
    missionGame.active = false;

    if (missionGame.animationFrame !== null) {
        cancelAnimationFrame(missionGame.animationFrame);
        missionGame.animationFrame = null;
    }

    missionGame.keys.left = false;
    missionGame.keys.right = false;
    missionGame.keys.up = false;
    missionGame.keys.down = false;
}

bind("game-start-button", "click", startMissionGame);

bind("game-restart-button", "click", () => {
    if (!launchAuthorization) return;
    prepareMissionGame();
    startMissionGame();
});

bind("game-back-button", "click", () => {
    stopMissionGame();
    navigate("overview");
});


/* =========================================================
   27. GAME UPDATE LOOP AND PLAYER MOVEMENT
   ========================================================= */

function updateMissionGame(timestamp) {
    if (!missionGame.active) return;

    const delta = Math.min(
        (timestamp - missionGame.lastTime) / 1000,
        0.05
    );

    missionGame.lastTime = timestamp;

    updatePlayer(delta);
    updateObstacles(delta);
    updateCollectibles(delta);
    updateGameResources(delta);

    drawMissionGame();
    updateGameTelemetry();
    updateGameChecklist();

    if (
        missionGame.progress >= 100 ||
        missionGame.time <= 0 ||
        missionGame.hull <= 0 ||
        missionGame.power <= 0 ||
        missionGame.fuel <= 0
    ) {
        finishMissionGame();
        return;
    }

    missionGame.animationFrame =
        requestAnimationFrame(updateMissionGame);
}

function updatePlayer(delta) {
    const player = missionGame.player;
    const config = gameConfigurations[state.mission];

    let velocityX = 0;
    let velocityY = 0;

    if (missionGame.keys.left) velocityX -= 1;
    if (missionGame.keys.right) velocityX += 1;
    if (missionGame.keys.up) velocityY -= 1;
    if (missionGame.keys.down) velocityY += 1;

    const movementLength = Math.hypot(velocityX, velocityY);

    if (movementLength > 0) {
        velocityX /= movementLength;
        velocityY /= movementLength;
    }

    let speed = player.speed;

    if (missionGame.fuel <= 0) speed = 0;
    if (missionGame.power < 20) speed *= 0.7;
    if (config.player === "lander") speed *= 0.8;

    player.x += velocityX * speed * delta;
    player.y += velocityY * speed * delta;

    player.x = Math.max(25, Math.min(GAME_WIDTH - 25, player.x));
    player.y = Math.max(45, Math.min(GAME_HEIGHT - 35, player.y));
}


/* =========================================================
   28. OBSTACLES AND SCIENCE COLLECTION
   ========================================================= */

function spawnObstacle() {
    const config = gameConfigurations[state.mission];
    const size = 13 + Math.random() * 20;

    missionGame.obstacles.push({
        x: 25 + Math.random() * (GAME_WIDTH - 50),
        y: -35,
        size,
        speed: 100 + Math.random() * 100,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 2,
        type: config.obstacle,
        hit: false
    });
}

function updateObstacles(delta) {
    missionGame.spawnTimer += delta;

    const spawnInterval = state.mission === "moon" ? 1.05 : 0.85;

    if (missionGame.spawnTimer >= spawnInterval) {
        missionGame.spawnTimer = 0;
        spawnObstacle();
    }

    const player = missionGame.player;

    missionGame.obstacles.forEach(obstacle => {
        obstacle.y += obstacle.speed * delta;
        obstacle.rotation += obstacle.rotationSpeed * delta;

        const distance = Math.hypot(
            player.x - obstacle.x,
            player.y - obstacle.y
        );

        if (!obstacle.hit && distance < obstacle.size + 16) {
            obstacle.hit = true;

            missionGame.hull = Math.max(0, missionGame.hull - 18);
            missionGame.power = Math.max(0, missionGame.power - 5);
            dispatchMissionGameSound("impact");

            showToast("Obstacle impact detected");
        }
    });

    missionGame.obstacles = missionGame.obstacles.filter(
        obstacle => obstacle.y < GAME_HEIGHT + 50
    );
}

function spawnCollectible() {
    const config = gameConfigurations[state.mission];

    missionGame.collectibles.push({
        x: 30 + Math.random() * (GAME_WIDTH - 60),
        y: -20,
        size: 12,
        speed: 115,
        type: config.collectible,
        collected: false
    });
}

function updateCollectibles(delta) {
    missionGame.collectibleTimer += delta;

    if (missionGame.collectibleTimer >= 6.5) {
        missionGame.collectibleTimer = 0;
        spawnCollectible();
    }

    const player = missionGame.player;

    missionGame.collectibles.forEach(item => {
        item.y += item.speed * delta;

        const distance = Math.hypot(
            player.x - item.x,
            player.y - item.y
        );

        if (!item.collected && distance < 27) {
            item.collected = true;
            missionGame.collected++;
            dispatchMissionGameSound("collect");

            missionGame.communication = Math.min(
                100,
                missionGame.communication + 2
            );

            showToast("Scientific data collected");
        }
    });

    missionGame.collectibles = missionGame.collectibles.filter(
        item => !item.collected && item.y < GAME_HEIGHT + 30
    );
}


/* =========================================================
   29. GAME RESOURCES, TELEMETRY AND CHECKLIST
   ========================================================= */

function updateGameResources(delta) {
    const resources = calculateResources();
    if (!resources) return;

    // Power consumption.
    const powerDeficit = Math.max(
        0,
        resources.powerDemand - resources.powerOutput
    );

    const powerDrain = 0.22 + powerDeficit * 0.008;

    missionGame.power = Math.max(
        0,
        missionGame.power - powerDrain * delta
    );

    // Fuel consumption: previously missing from the original code.
    missionGame.fuel = Math.max(
        0,
        missionGame.fuel - missionGame.fuelBurnRate * delta
    );

    if (missionGame.power < 20) {
        missionGame.communication = Math.max(
            0,
            missionGame.communication - 0.35 * delta
        );
    }

    missionGame.time = Math.max(0, missionGame.time - delta);
    missionGame.missionElapsed += delta;

    // Mission progress has one source of truth.
    const timeProgress = missionGame.missionElapsed * 0.12;

    let milestoneProgress = 0;

    if (missionGame.missionElapsed >= 45) milestoneProgress += 8;
    if (missionGame.missionElapsed >= 90) milestoneProgress += 8;
    if (missionGame.missionElapsed >= 135) milestoneProgress += 8;

    const scienceProgress = Math.min(
        76,
        missionGame.collected * 4
    );

    missionGame.progress = Math.min(
        100,
        timeProgress + milestoneProgress + scienceProgress
    );
}

function updateFuelWarning() {
    const gameView = $("game-view");
    if (!gameView) return;

    let warning = $("fuel-warning");

    if (!warning) {
        warning = document.createElement("div");
        warning.id = "fuel-warning";
        warning.className = "fuel-warning";
        gameView.appendChild(warning);
    }

    const fuel = missionGame.fuel;

    if (fuel <= 0) {
        warning.textContent = "FUEL DEPLETED — PROPULSION UNAVAILABLE";
        warning.className = "fuel-warning critical";
    } else if (fuel <= 10) {
        warning.textContent = "CRITICAL FUEL LEVEL — " + Math.ceil(fuel) + "%";
        warning.className = "fuel-warning critical";
    } else if (fuel <= 25) {
        warning.textContent = "LOW FUEL WARNING — " + Math.ceil(fuel) + "%";
        warning.className = "fuel-warning warning";
    } else {
        warning.textContent = "FUEL SYSTEM: NORMAL";
        warning.className = "fuel-warning normal";
    }
}

function updateGameTelemetry() {
    const values = {
        power: missionGame.power,
        fuel: missionGame.fuel,
        hull: missionGame.hull,
        communication: missionGame.communication,
        progress: missionGame.progress
    };

    Object.entries(values).forEach(([key, value]) => {
        const percentage = Math.round(value);

        setText("telemetry-" + key, percentage + "%");
        setWidth("telemetry-" + key + "-bar", percentage + "%");
    });

    setText("game-timer", "TIME: " + Math.ceil(missionGame.time));
}

function updateGameChecklist() {
    const checklist = $("game-checklist");
    if (!checklist) return;

    const items = [
        {
            done: missionGame.active || missionGame.finished,
            text: "Mission deployment"
        },
        {
            done: missionGame.collected >= 1,
            text: "Collect scientific data"
        },
        {
            done: missionGame.collected >= 3,
            text: "Collect three research samples"
        },
        {
            done: missionGame.progress >= 100,
            text: "Complete mission objectives"
        }
    ];

    checklist.innerHTML = items.map(item => `
        <div class="game-check-item ${item.done ? "done" : ""}">
            <span>${item.done ? "✓" : "◇"}</span>
            <span>${item.text}</span>
        </div>
    `).join("");

    updateFuelWarning();
}


/* =========================================================
   30. GAME DRAWING
   ========================================================= */

function drawBackground() {
    if (!gameContext) return;

    const config = gameConfigurations[state.mission];

    gameContext.fillStyle = config.background;
    gameContext.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 85; i++) {
        const x = (i * 137) % GAME_WIDTH;
        const y = (i * 79) % GAME_HEIGHT;

        gameContext.fillStyle =
            i % 4 === 0
                ? "rgba(120,220,255,.8)"
                : "rgba(255,255,255,.4)";

        gameContext.fillRect(x, y, 2, 2);
    }

    if (state.mission === "earth") drawEarthBackground();
    if (state.mission === "moon") drawMoonBackground();
    if (state.mission === "mars") drawMarsBackground();
}

function drawEarthBackground() {
    const ctx = gameContext;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = "#368ac4";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(450, 515, 390, 150, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    const gradient = ctx.createRadialGradient(450, 470, 30, 450, 470, 280);
    gradient.addColorStop(0, "#4aa9db");
    gradient.addColorStop(0.55, "#14558e");
    gradient.addColorStop(1, "#07182d");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(450, 520, 245, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawMoonBackground() {
    const ctx = gameContext;

    ctx.fillStyle = "#525663";
    ctx.beginPath();
    ctx.moveTo(0, 390);
    ctx.lineTo(120, 345);
    ctx.lineTo(220, 375);
    ctx.lineTo(370, 330);
    ctx.lineTo(510, 380);
    ctx.lineTo(670, 340);
    ctx.lineTo(900, 375);
    ctx.lineTo(900, 460);
    ctx.lineTo(0, 460);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(20,24,33,.35)";

    [120, 300, 650, 790].forEach((x, i) => {
        ctx.beginPath();
        ctx.ellipse(x, 410 + i % 2 * 10, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawMarsBackground() {
    const ctx = gameContext;

    ctx.fillStyle = "#914b38";
    ctx.beginPath();
    ctx.moveTo(0, 385);
    ctx.lineTo(140, 350);
    ctx.lineTo(270, 370);
    ctx.lineTo(410, 325);
    ctx.lineTo(590, 380);
    ctx.lineTo(760, 345);
    ctx.lineTo(900, 365);
    ctx.lineTo(900, 460);
    ctx.lineTo(0, 460);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,190,130,.2)";

    [80, 240, 500, 720].forEach(x => {
        ctx.beginPath();
        ctx.arc(x, 405, 15, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawPlayer() {
    const ctx = gameContext;
    const player = missionGame.player;

    ctx.save();
    ctx.translate(player.x, player.y);

    if (state.mission === "earth") {
        ctx.fillStyle = "#d8e7f4";
        ctx.fillRect(-10, -10, 20, 20);

        ctx.fillStyle = "#2877ad";
        ctx.fillRect(-32, -8, 20, 16);
        ctx.fillRect(12, -8, 20, 16);

        ctx.strokeStyle = "#72dafa";
        ctx.lineWidth = 2;
        ctx.strokeRect(-32, -8, 20, 16);
        ctx.strokeRect(12, -8, 20, 16);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-3, -19, 6, 9);
    }

    if (state.mission === "moon") {
        ctx.fillStyle = "#d7e0e9";
        ctx.beginPath();
        ctx.moveTo(0, -19);
        ctx.lineTo(19, 8);
        ctx.lineTo(-19, 8);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#38d9f5";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-12, 8);
        ctx.lineTo(-19, 18);
        ctx.moveTo(12, 8);
        ctx.lineTo(19, 18);
        ctx.stroke();
    }

    if (state.mission === "mars") {
        ctx.fillStyle = "#e2a45d";
        ctx.fillRect(-19, -11, 38, 19);

        ctx.fillStyle = "#202c3b";

        [-12, 12].forEach(x => {
            ctx.beginPath();
            ctx.arc(x, 12, 6, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.strokeStyle = "#dceafa";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(0, -24);
        ctx.stroke();

        ctx.fillStyle = "#38d9f5";
        ctx.fillRect(-4, -28, 8, 5);
    }

    ctx.restore();
}

function drawObstacles() {
    const ctx = gameContext;

    missionGame.obstacles.forEach(obstacle => {
        ctx.save();
        ctx.translate(obstacle.x, obstacle.y);
        ctx.rotate(obstacle.rotation);

        ctx.fillStyle =
            state.mission === "earth" ? "#9aa6b5" : "#8a817c";

        ctx.beginPath();

        for (let i = 0; i < 8; i++) {
            const angle = i / 8 * Math.PI * 2;
            const radius = obstacle.size * (i % 2 === 0 ? 1 : 0.72);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,.3)";
        ctx.stroke();
        ctx.restore();
    });
}

function drawCollectibles() {
    const ctx = gameContext;

    missionGame.collectibles.forEach(item => {
        ctx.save();
        ctx.translate(item.x, item.y);

        ctx.shadowColor = "#38d9f5";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#38d9f5";

        ctx.beginPath();
        ctx.arc(0, 0, item.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px Inter";
        ctx.textAlign = "center";
        ctx.fillText("+", 0, 5);

        ctx.restore();
    });
}

function drawMissionGame() {
    if (!gameContext) return;

    gameContext.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawBackground();
    drawCollectibles();
    drawObstacles();
    drawPlayer();

    gameContext.fillStyle = "rgba(56,217,245,.8)";
    gameContext.font = "10px Inter";

    gameContext.fillText(
        "NOVALUX // " + missions[state.mission].id,
        18,
        25
    );

    gameContext.textAlign = "right";

    gameContext.fillText(
        "RESEARCH DATA: " + missionGame.collected,
        GAME_WIDTH - 18,
        25
    );

    gameContext.textAlign = "left";
}


/* =========================================================
   31. MISSION COMPLETION AND RESULT HISTORY
   ========================================================= */

function finishMissionGame() {
    stopMissionGame();

    missionGame.finished = true;

    const successful =
        missionGame.progress >= 100 &&
        missionGame.hull > 0 &&
        missionGame.power > 0;
    dispatchMissionGameSound(successful ? "success" : "failure");

    setText(
        "game-status",
        successful ? "MISSION COMPLETE" : "MISSION ENDED"
    );

    const overlay = $("game-overlay");
    if (overlay) overlay.classList.remove("hidden");

    setText(
        "game-overlay-title",
        successful
            ? "Mission Successfully Completed"
            : "Mission Ended"
    );

    setText(
        "game-overlay-description",
        successful
            ? "Your spacecraft completed its primary mission objectives."
            : "Your spacecraft could not complete all mission objectives. Review the telemetry and try again."
    );

    setText("game-start-button", "RETRY MISSION →");
    if ($("game-start-button")) $("game-start-button").disabled = !launchAuthorization;

    const finalResult = {
        mission: missions[state.mission].name,
        success: successful,
        progress: Math.round(missionGame.progress),
        collected: missionGame.collected,
        hull: Math.round(missionGame.hull),
        power: Math.round(missionGame.power),
        fuel: Math.round(missionGame.fuel),
        date: new Date().toLocaleString()
    };

    try {
        const history = JSON.parse(
            localStorage.getItem("novalux-game-results") || "[]"
        );

        history.unshift(finalResult);

        localStorage.setItem(
            "novalux-game-results",
            JSON.stringify(history.slice(0, 30))
        );
    } catch (error) {
        console.error("Game result could not be saved:", error);
    }

    updateGameChecklist();

    showToast(
        successful
            ? "Mission completed successfully"
            : "Mission ended — review your spacecraft"
    );
}


/* =========================================================
   32. APPLICATION STARTUP
   ========================================================= */

function initialize() {
    const hasSave = loadDesign();

    // First visit (no saved design): apply the default mission's selections.
    if (!hasSave) {
        applyMissionDefaults(state.mission);
    }

    populateMissionInterface();
    updateActiveCategoryTab();

    renderMissionCards();
    renderComponentCatalogue();
    updateInterface();
    renderReports();
    renderSimulation();

    if (gameCanvas && !gameContext) {
        console.error("NOVALUX: Unable to initialize the mission game canvas.");
    }

    if (hasSave) {
        showToast("Previous mission design restored");
    }
}

// Bridge to the ES-module simulation (src/simulation-bootstrap.js).
window.NOVALUX = Object.freeze({
    getDesign() {
        return {
            mission: state.mission,
            selections: { ...state.selections },
            components
        };
    }
});

initialize();