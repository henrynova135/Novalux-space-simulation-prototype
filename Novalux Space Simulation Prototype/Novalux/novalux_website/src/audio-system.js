/* NOVALUX procedural audio: no external audio files or third-party assets required. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const toggle = $("audio-toggle"), volume = $("audio-volume"), volumeValue = $("audio-volume-value");
  const ambienceToggle = $("audio-ambience"), hint = $("audio-hint");
  if (!toggle || !volume || !ambienceToggle) return;

  let ctx = null, master = null, engineGain = null, engineOsc = null, engineFilter = null;
  let ambientGain = null, ambientOsc = null, noiseSource = null, noiseGain = null;
  let enabled = true, unlocked = false, ambienceOn = false;
  let savedVolume = NaN;
  try {
    savedVolume = Number(localStorage.getItem("novalux-audio-volume"));
    const savedEnabled = localStorage.getItem("novalux-audio-enabled");
    const savedAmbience = localStorage.getItem("novalux-audio-ambience");
    if (savedEnabled !== null) enabled = savedEnabled === "true";
    if (savedAmbience !== null) ambienceOn = savedAmbience === "true";
  } catch (_) { /* Storage may be disabled. */ }
  if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 100) volume.value = String(savedVolume);
  ambienceToggle.checked = ambienceOn;
  toggle.setAttribute("aria-pressed",String(enabled));
  toggle.textContent=enabled ? "♫ SOUND ON" : "♫ SOUND OFF";
  toggle.setAttribute("aria-label",enabled ? "Mute sound effects" : "Enable sound effects");
  volumeValue.value = `${volume.value}%`;

  function ensureAudio() {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) { hint.textContent = "Audio is not supported by this browser"; return false; }
      ctx = new AudioContext();
      master = ctx.createGain(); master.gain.value = enabled ? Number(volume.value) / 100 : 0; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    unlocked = true;
    hint.textContent = "Sound effects ready";
    return true;
  }
  function setMaster() {
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(enabled ? Number(volume.value) / 100 : 0, ctx.currentTime, .035);
  }
  function tone({freq=600, endFreq=freq, duration=.12, type="sine", gain=.12, delay=0}={}) {
    if (!enabled || !ensureAudio()) return;
    const now = ctx.currentTime + delay, osc = ctx.createOscillator(), amp = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1,endFreq), now + duration);
    amp.gain.setValueAtTime(.0001, now); amp.gain.exponentialRampToValueAtTime(gain, now + .012);
    amp.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(amp); amp.connect(master); osc.start(now); osc.stop(now + duration + .025);
  }
  function noiseBurst(duration=.45, gain=.12, lowpass=1400) {
    if (!enabled || !ensureAudio()) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i=0;i<length;i++) data[i] = (Math.random()*2-1) * (1-i/length);
    const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), amp = ctx.createGain();
    src.buffer = buffer; filter.type = "lowpass"; filter.frequency.value = lowpass;
    amp.gain.setValueAtTime(.0001,ctx.currentTime); amp.gain.linearRampToValueAtTime(gain,ctx.currentTime+.04); amp.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration);
    src.connect(filter); filter.connect(amp); amp.connect(master); src.start();
  }
  function click() { tone({freq:780,endFreq:520,duration:.055,gain:.045,type:"sine"}); }
  function gameStart() {
    tone({freq:180,endFreq:420,duration:.32,gain:.09,type:"triangle"});
    tone({freq:520,endFreq:780,duration:.18,gain:.055,delay:.16});
  }
  function gameThruster() {
    noiseBurst(.12,.035,900);
    tone({freq:115,endFreq:75,duration:.12,gain:.025,type:"triangle"});
  }
  function gameCollect() {
    tone({freq:880,endFreq:1180,duration:.11,gain:.075});
    tone({freq:1320,duration:.13,gain:.05,delay:.09});
  }
  function gameImpact() {
    noiseBurst(.24,.15,650);
    tone({freq:125,endFreq:48,duration:.32,gain:.12,type:"sawtooth"});
    warning();
  }
  function gameSuccess() { success(); }
  function gameFailure() { failure(); }
  function confirm() { tone({freq:523,duration:.12,gain:.08}); tone({freq:784,duration:.18,gain:.07,delay:.11}); }
  function warning() { tone({freq:660,endFreq:440,duration:.22,gain:.1,type:"square"}); tone({freq:660,endFreq:440,duration:.22,gain:.1,type:"square",delay:.28}); }
  function success() { [523,659,784,1046].forEach((f,i)=>tone({freq:f,duration:.24,gain:.075,delay:i*.12})); }
  function failure() { tone({freq:440,endFreq:220,duration:.55,gain:.12,type:"triangle"}); tone({freq:330,endFreq:165,duration:.6,gain:.1,type:"triangle",delay:.25}); }
  function startEngine() {
    if (!enabled || !ensureAudio() || engineOsc) return;
    engineOsc = ctx.createOscillator(); engineOsc.type = "sawtooth"; engineOsc.frequency.value = 54;
    engineFilter = ctx.createBiquadFilter(); engineFilter.type = "lowpass"; engineFilter.frequency.value = 190;
    engineGain = ctx.createGain(); engineGain.gain.setValueAtTime(.0001,ctx.currentTime); engineGain.gain.linearRampToValueAtTime(.095,ctx.currentTime+.8);
    engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master); engineOsc.start();
    noiseBurst(.8,.11,500);
  }
  function stopEngine() {
    if (!engineOsc || !ctx) return;
    const osc=engineOsc, gain=engineGain; engineOsc=null; engineGain=null; engineFilter=null;
    gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.setTargetAtTime(.0001,ctx.currentTime,.09);
    try { osc.stop(ctx.currentTime+.45); } catch (_) {}
  }
  function startAmbience() {
    if (!enabled || !ensureAudio() || ambientOsc) return;
    ambientOsc=ctx.createOscillator(); ambientOsc.type="sine"; ambientOsc.frequency.value=48;
    ambientGain=ctx.createGain(); ambientGain.gain.value=.0001;
    const filter=ctx.createBiquadFilter(); filter.type="lowpass"; filter.frequency.value=120;
    ambientOsc.connect(filter); filter.connect(ambientGain); ambientGain.connect(master); ambientOsc.start();
    ambientGain.gain.setTargetAtTime(.035,ctx.currentTime,.8);
  }
  function stopAmbience() {
    if (!ambientOsc || !ctx) return;
    ambientGain.gain.setTargetAtTime(.0001,ctx.currentTime,.2);
    try { ambientOsc.stop(ctx.currentTime+1); } catch (_) {}
    ambientOsc=null; ambientGain=null;
  }
  function syncAmbience() { ambienceOn=ambienceToggle.checked; if (ambienceOn) startAmbience(); else stopAmbience(); }

  toggle.addEventListener("click", () => {
    enabled=!enabled;
    try { localStorage.setItem("novalux-audio-enabled",String(enabled)); } catch (_) { /* session-only */ }
    toggle.setAttribute("aria-pressed",String(enabled));
    toggle.textContent=enabled ? "♫ SOUND ON" : "♫ SOUND OFF";
    toggle.setAttribute("aria-label",enabled ? "Mute sound effects" : "Enable sound effects");
    if (enabled) { ensureAudio(); setMaster(); click(); if (ambienceOn) startAmbience(); }
    else { setMaster(); stopEngine(); stopAmbience(); }
  });
  volume.addEventListener("input", () => {
    volumeValue.value=`${volume.value}%`;
    try { localStorage.setItem("novalux-audio-volume",volume.value); } catch (_) { if (hint) hint.textContent = "Volume applies for this session; browser storage is unavailable"; }
    setMaster();
  });
  ambienceToggle.addEventListener("change", () => {
    ambienceOn=ambienceToggle.checked;
    try { localStorage.setItem("novalux-audio-ambience",String(ambienceOn)); } catch (_) { /* session-only */ }
    if (enabled) { ensureAudio(); syncAmbience(); }
  });

  // Unlock audio on the first real user gesture, as required by modern browsers.
  document.addEventListener("pointerdown", () => { if (!unlocked && enabled) { ensureAudio(); if (ambienceOn) startAmbience(); } }, {once:true,passive:true});
  document.addEventListener("keydown", () => { if (!unlocked && enabled) { ensureAudio(); if (ambienceOn) startAmbience(); } }, {once:true});

  const special = new Map([
    ["launch-ignite", () => { tone({freq:70,endFreq:42,duration:.7,gain:.18,type:"sawtooth"}); noiseBurst(.9,.22,700); startEngine(); }],
    ["launch-pause", () => { const b=$("launch-pause"); if (b && b.textContent.trim()==="PAUSE") stopEngine(); else startEngine(); click(); }],
    ["launch-fairing", () => { noiseBurst(.55,.13,2200); tone({freq:420,endFreq:180,duration:.4,gain:.07}); }],
    ["launch-cutoff", () => { stopEngine(); tone({freq:180,endFreq:70,duration:.65,gain:.12,type:"triangle"}); }],
    ["launch-separate", () => { noiseBurst(.35,.16,1800); tone({freq:250,endFreq:520,duration:.22,gain:.08}); }],
    ["launch-reset", () => { stopEngine(); click(); }],
    ["launch-transfer", () => { stopEngine(); click(); }]
  ]);
  document.addEventListener("click", event => {
    const button=event.target.closest("button"); if (!button || button.disabled || button.closest("#settings-audio-controls")) return;
    const action=special.get(button.id); if (action) action(); else click();
  }, true);
  document.addEventListener("change", event => {
    if (event.target.matches("select") && !event.target.closest("#settings-audio-controls")) click();
  }, true);
  document.addEventListener("novalux:launchcomplete", () => { stopEngine(); confirm(); });
  document.addEventListener("novalux:launchreset", stopEngine);
  document.addEventListener("novalux:missioncomplete", () => { stopEngine(); success(); });
  document.addEventListener("novalux:game-start", gameStart);
  document.addEventListener("novalux:game-thruster", gameThruster);
  document.addEventListener("novalux:game-collect", gameCollect);
  document.addEventListener("novalux:game-impact", gameImpact);
  document.addEventListener("novalux:game-success", gameSuccess);
  document.addEventListener("novalux:game-failure", gameFailure);

  // Play a short failure cue when the interplanetary result panel reports failure.
  if (window.MutationObserver) {
    let previous="";
    // The existing subsystem result panel is created by a deferred module, so observe the
    // document and detect it whenever that module adds or updates the panel.
    new MutationObserver(() => {
      const result=$("s4-result");
      if (!result) return;
      const value=result.textContent||"";
      if (value!==previous && /MISSION FAILURE/i.test(value)) failure();
      previous=value;
    }).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }
  window.NOVALUXAudio={click,confirm,warning,success,failure,startEngine,stopEngine,gameStart,gameThruster,gameCollect,gameImpact,gameSuccess,gameFailure,setEnabled(value){if(enabled!==!!value)toggle.click();}};
})();
