export const MISSION_PROFILES = Object.freeze({
  earth: Object.freeze({code:"NLX-EARTH-001",title:"Earth Observation",destination:"Earth",objectives:["Climate monitoring","Ocean observation","Land surface mapping","Atmospheric research"],defaultObjective:"Climate monitoring",description:"Observe Earth's land, ocean, climate or atmosphere from a suitable Earth orbit.",scienceNeed:"Choose a measurement approach that matches the environmental variable being studied."}),
  moon: Object.freeze({code:"NLX-MOON-002",title:"Lunar Exploration",destination:"Moon",objectives:["Lunar surface mapping","Mineral composition study","Water ice investigation","Lunar environment research"],defaultObjective:"Lunar surface mapping",description:"Investigate lunar surface properties, composition, volatile resources or the local environment.",scienceNeed:"Consider illumination, terrain, surface composition and the region being observed."}),
  mars: Object.freeze({code:"NLX-MARS-003",title:"Mars Exploration",destination:"Mars",objectives:["Martian geology study","Atmospheric research","Surface exploration","Water history investigation"],defaultObjective:"Martian geology study",description:"Study Martian geology, atmosphere, surface processes or evidence related to past water.",scienceNeed:"Deep-space communication, mission lifetime and environmental constraints matter."})
});

export const SCIENCE_INSTRUMENTS = Object.freeze({
  "Multispectral camera": Object.freeze({kind:"Optical imaging",range:"Multiple visible / near-infrared bands (illustrative)",uses:["Climate monitoring","Ocean observation","Land surface mapping","Lunar surface mapping"],why:"Provides broad spectral observations useful for surface and environmental mapping.",limit:"Clouds, lighting and spatial resolution can limit observations."}),
  "High-resolution camera": Object.freeze({kind:"High-resolution optical imaging",range:"Visible wavelengths (illustrative)",uses:["Land surface mapping","Lunar surface mapping","Surface exploration","Martian geology study"],why:"Useful for detailed terrain, surface features and geological context.",limit:"Primarily imaging; it does not directly identify all material composition."}),
  "Scientific sensor suite": Object.freeze({kind:"Multi-sensor payload",range:"Depends on installed sensors",uses:["Climate monitoring","Atmospheric research","Lunar environment research","Surface exploration","Water history investigation"],why:"A broader payload can support multiple measurement types.",limit:"Combined capability increases integration, power and data-management complexity."}),
  "Spectrometer": Object.freeze({kind:"Spectroscopy",range:"Instrument-specific spectral bands",uses:["Atmospheric research","Mineral composition study","Water ice investigation","Martian geology study","Water history investigation"],why:"Spectral measurements can help characterize gases and surface materials.",limit:"Results depend on spectral coverage, calibration and observation geometry."}),
  "Radar instrument": Object.freeze({kind:"Radar remote sensing",range:"Radio / microwave bands (unspecified in this model)",uses:["Ocean observation","Land surface mapping","Lunar surface mapping","Water ice investigation","Water history investigation"],why:"Radar can provide surface and subsurface-related measurements and can operate without sunlight for illumination.",limit:"High power demand and data volume are important design trade-offs."})
});

export function calculateMissionResources(design) {
  if (!design?.components || !design?.selections) return null;
  const selected={};
  for (const category of ["platform","propulsion","power","instrument","communication","launcher"]) {
    const name=design.selections[category];
    const item=design.components[category]?.items?.[name];
    selected[category]=item?{name,...item}:null;
  }
  if (Object.values(selected).some(x=>!x)) return {selected,complete:false};
  const s=selected;
  const dryMass=s.platform.mass+s.propulsion.mass+s.power.mass+s.instrument.mass+s.communication.mass;
  const powerDemand=(s.platform.powerDemand||0)+(s.propulsion.power||0)+(s.instrument.power||0)+(s.communication.power||0);
  const powerOutput=s.power.output||0;
  const budget=Object.values(s).reduce((sum,x)=>sum+(x.cost||0),0);
  const capacity=s.launcher.capacity||0;
  return {selected:s,complete:true,dryMass,powerDemand,powerOutput,powerMargin:powerOutput-powerDemand,budget,science:s.instrument.science||0,capacity,massMargin:capacity-dryMass};
}

export function evaluateMissionRequirements(resources, requirements={}) {
  if (!resources) return [];
  if (!resources.complete) return [{ok:false,label:"Complete all six spacecraft categories in the designer."}];
  const reserve=Math.max(0,Number(requirements.powerReservePercent)||0);
  const objective=requirements.objective;
  const instrument=resources.selected.instrument.name;
  const instrumentInfo=SCIENCE_INSTRUMENTS[instrument];
  const relevant=Boolean(instrumentInfo?.uses.includes(objective));
  return [
    {ok:resources.dryMass<=Number(requirements.maxMass??250),label:`Dry mass ${resources.dryMass.toFixed(1)} kg / requirement ${Number(requirements.maxMass??250)} kg`},
    {ok:resources.dryMass<=resources.capacity,label:`Launch capacity margin ${resources.massMargin.toFixed(1)} kg (${resources.selected.launcher.name})`},
    {ok:resources.powerOutput>=resources.powerDemand*(1+reserve/100),label:`Power reserve ${resources.powerMargin.toFixed(1)} W; required reserve ${reserve}%`},
    {ok:resources.budget<=Number(requirements.maxBudget??150),label:`Modeled component and launch budget ${resources.budget.toFixed(1)} MCr / ${Number(requirements.maxBudget??150)} MCr`},
    {ok:relevant,label:`${instrument} ${relevant?"supports":"may not directly support"} the selected objective`}
  ];
}
