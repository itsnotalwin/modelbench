/**
 * Horology — Swiss Lever Escapement Interactive Explainer
 * Physically accurate simulation of a mechanical watch movement
 * Single source of truth: simulation time (seconds)
 */

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const CONFIG = {
  // Movement specifications (typical Swiss lever, 28,800 vph / 4 Hz)
  frequency: 4,                    // Hz (beats per second)
  beatPeriod: 0.25,                // seconds per half-oscillation (tick/tock)
  fullPeriod: 0.5,                 // seconds per full oscillation
  liftAngle: 52,                   // degrees - pallet lift angle
  dropAngle: 1.5,                  // degrees - drop angle
  drawAngle: 12,                   // degrees - draw (lock) angle
  impulseAngle: 28,                // degrees - total impulse (lift - drop - draw)
  balanceAmplitude: 270,           // degrees - typical running amplitude
  balanceInertia: 0.35,            // mg·cm² - balance wheel moment of inertia
  hairspringStiffness: 0.00018,    // N·m/rad - hairspring constant
  mainspringTorque: 3.5e-4,        // N·m - typical mainspring torque (350 µN·m)
  mainspringTurns: 6,              // full turns of barrel
  gearRatios: {
    barrelToCenter: 1/8,           // barrel: 80 teeth, center: 10 leaves
    centerToThird: 1/7.5,          // center: 75 teeth, third: 10 leaves
    thirdToFourth: 1/7,            // third: 70 teeth, fourth: 10 leaves
    fourthToEscape: 1/6,           // fourth: 60 teeth, escape: 10 leaves
  },
  escapeWheelTeeth: 15,
  palletLiftAngle: 10.5,           // degrees per pallet stone
  bankingAngle: 1.5,               // degrees - banking pin clearance

  // Visual
  canvasScale: 1,                  // mm per pixel at 1x zoom
  baseZoom: 1,
  maxZoom: 8,
  minZoom: 0.3,

  // Simulation
  maxSubsteps: 8,
  fixedTimestep: 1/240,            // 240 Hz physics substeps
};

// Derived constants
CONFIG.angularFrequency = 2 * Math.PI * CONFIG.frequency;  // rad/s
CONFIG.impulsePerBeat = CONFIG.mainspringTorque * CONFIG.gearRatios.barrelToCenter *
  CONFIG.gearRatios.centerToThird * CONFIG.gearRatios.thirdToFourth *
  CONFIG.gearRatios.fourthToEscape * 0.45;  // ~45% efficiency to balance

// ============================================================================
// STATE — Single Source of Truth
// ============================================================================

const State = {
  // Core time
  simTime: 0,              // simulation time (seconds)
  realTime: 0,             // wall clock time for interpolation
  lastFrameTime: 0,        // for delta calculation

  // Playback
  playing: false,
  speed: 1,
  targetSpeed: 1,

  // Balance wheel state (the oscillator)
  balanceAngle: 0,         // radians
  balanceVelocity: 0,      // rad/s
  balanceAcceleration: 0,  // rad/s²

  // Escapement state
  escapeWheelAngle: 0,     // radians
  escapeWheelVelocity: 0,  // rad/s
  palletForkAngle: 0,      // radians - pallet fork angle
  palletState: 'idle',     // 'idle', 'impulse', 'lock', 'draw', 'drop'
  lastImpulseTime: 0,
  lastImpulseDirection: 1, // +1 or -1

  // Gear train angles (derived from escape wheel)
  fourthWheelAngle: 0,
  thirdWheelAngle: 0,
  centerWheelAngle: 0,
  barrelAngle: 0,

  // Mainspring
  mainspringTurnsRemaining: CONFIG.mainspringTurns,
  mainspringTorqueCurrent: CONFIG.mainspringTorque,

  // What-if parameters (live adjustable)
  params: {
    mainspringTorque: 1.0,      // multiplier
    balanceInertia: 1.0,        // multiplier
    hairspringStiffness: 1.0,   // multiplier
    palletLubrication: 1.0,     // 0.5 = poor, 1 = normal, 1.5 = excellent
    bankingClearance: 1.0,      // multiplier
    amplitudeTarget: 1.0,       // target amplitude multiplier
  },

  // Failure modes
  failures: {
    mainspringBroken: false,
    hairspringStuck: false,
    palletStoneChipped: false,
    escapeWheelToothBent: false,
    bankingPinBent: false,
    lubricationFailed: false,
    shockDamage: false,
  },

  // View
  viewMode: 'cutaway',         // 'cutaway', 'exploded'
  zoom: CONFIG.baseZoom,
  panX: 0,
  panY: 0,
  selectedComponent: null,
  hoveredComponent: null,

  // Graphs
  graphHistory: {
    torque: [],
    amplitude: [],
    beatError: [],
    rateError: [],
    maxPoints: 400,
  },

  // Interaction
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  dragPanStart: { x: 0, y: 0 },
  canvasRect: null,
};

// ============================================================================
// COMPONENT DEFINITIONS
// ============================================================================

const Components = [
  {
    id: 'mainspring',
    name: 'Mainspring',
    role: 'Power Source',
    color: '#c8b058',
    description: 'Coiled spring steel ribbon (Nivarox or Elinvar alloy) storing potential energy. In a going barrel, the outer end attaches to the barrel wall, inner end to the arbor. As it unwinds, torque decreases non-linearly — highest when fully wound, lowest at 1-2 turns remaining. Typical 6-turn capacity yields ~38-42 hours autonomy.',
    specs: [
      { label: 'Material', value: 'Nivarox CT' },
      { label: 'Turns', value: '6.0' },
      { label: 'Torque (full)', value: '350 µN·m' },
      { label: 'Torque (empty)', value: '180 µN·m' },
      { label: 'Width', value: '1.60 mm' },
      { label: 'Thickness', value: '0.11 mm' },
      { label: 'Length', value: '380 mm' },
    ],
    position: { x: -48, y: 0 }, // mm from center
    radius: 12,
    zOrder: 10,
  },
  {
    id: 'barrel',
    name: 'Going Barrel',
    role: 'First Wheel',
    color: '#b8a048',
    description: 'The mainspring barrel acts as the first wheel of the gear train. Its teeth (typically 80-100) engage the center wheel pinion (10-12 leaves). The barrel rotates once per 6-8 hours. The mainspring arbor is fixed; the barrel rotates around it. Lubrication between barrel wall and mainspring coils is critical — dry coils cause amplitude drop.',
    specs: [
      { label: 'Teeth', value: '80' },
      { label: 'Rotation', value: '1/6 hr' },
      { label: 'Diameter', value: '11.2 mm' },
      { label: 'Arbor Ø', value: '3.0 mm' },
    ],
    position: { x: -48, y: 0 },
    radius: 5.6,
    zOrder: 9,
  },
  {
    id: 'centerWheel',
    name: 'Center Wheel',
    role: 'Second Wheel / Minute',
    color: '#a89888',
    description: 'Rotates once per hour, carries the minute hand (cannon pinion). 75-80 teeth driving third wheel pinion (10 leaves). The cannon pinion slips on the center wheel arbor for hand-setting. Pivot jewels: upper/lower ruby. Typical pivot diameter 0.15-0.18 mm.',
    specs: [
      { label: 'Teeth', value: '80' },
      { label: 'Pinion', value: '12' },
      { label: 'Rotation', value: '1/hr' },
      { label: 'Pivot Ø', value: '0.16 mm' },
      { label: 'Jewels', value: '2 rubies' },
    ],
    position: { x: -22, y: -18 },
    radius: 4.8,
    zOrder: 8,
  },
  {
    id: 'thirdWheel',
    name: 'Third Wheel',
    role: 'Third Wheel',
    color: '#989080',
    description: 'Intermediate wheel — 70-75 teeth driving fourth wheel pinion (8-10 leaves). Rotates once per 7.5-8 minutes. Smaller pivots (0.10-0.12 mm) — more sensitive to lubrication condition. Often the first wheel to show amplitude loss when oil degrades.',
    specs: [
      { label: 'Teeth', value: '72' },
      { label: 'Pinion', value: '10' },
      { label: 'Rotation', value: '7.5 min' },
      { label: 'Pivot Ø', value: '0.11 mm' },
      { label: 'Jewels', value: '2 rubies' },
    ],
    position: { x: 0, y: -28 },
    radius: 3.6,
    zOrder: 7,
  },
  {
    id: 'fourthWheel',
    name: 'Fourth Wheel',
    role: 'Fourth Wheel / Second',
    color: '#888878',
    description: 'Rotates once per minute — carries the seconds hand (direct or via subdial). 60-70 teeth driving escape wheel pinion (6-8 leaves). In sub-seconds layout, extended pivot passes through the plate. Critical for accurate seconds display — any wobble visible.',
    specs: [
      { label: 'Teeth', value: '60' },
      { label: 'Pinion', value: '8' },
      { label: 'Rotation', value: '1/min' },
      { label: 'Pivot Ø', value: '0.10 mm' },
      { label: 'Jewels', value: '2 rubies' },
    ],
    position: { x: 22, y: -18 },
    radius: 3.0,
    zOrder: 6,
  },
  {
    id: 'escapeWheel',
    name: 'Escape Wheel',
    role: 'Escape Wheel',
    color: '#d4b858',
    description: '15-tooth club-tooth escape wheel (Swiss lever). Each tooth impulses the pallet fork twice per revolution (entry and exit pallet). Made of brass or nickel-phosphorus (LIGA/UV-LIGA). Tooth profile: equidistant impulse faces, 24° impulse angle per tooth. Critical surface finish — any roughness destroys amplitude.',
    specs: [
      { label: 'Teeth', value: '15' },
      { label: 'Material', value: 'Ni-P (LIGA)' },
      { label: 'Impulse/Tooth', value: '24°' },
      { label: 'Pivot Ø', value: '0.09 mm' },
      { label: 'Jewels', value: '2 rubies' },
      { label: 'Weight', value: '0.004 g' },
    ],
    position: { x: 38, y: 4 },
    radius: 2.8,
    zOrder: 5,
  },
  {
    id: 'palletFork',
    name: 'Pallet Fork',
    role: 'Escapement / Impulse',
    color: '#c8a848',
    description: 'The heart of the Swiss lever escapement. Two pallet stones (entry/exit) on a forked lever. Stones: synthetic ruby, angled at 12° (draw) + 1.5° (drop) = 13.5° total lock angle. Impulse faces at 45° to radius. Fork horn clearance to roller jewel: 0.02-0.03 mm (freedom). Banking pins limit fork travel — critical for amplitude and safety.',
    specs: [
      { label: 'Stones', value: '2× Synthetic Ruby' },
      { label: 'Lift Angle', value: '52°' },
      { label: 'Draw Angle', value: '12°' },
      { label: 'Drop Angle', value: '1.5°' },
      { label: 'Impulse Angle', value: '28°' },
      { label: 'Fork Length', value: '3.2 mm' },
      { label: 'Freedom', value: '0.025 mm' },
    ],
    position: { x: 28, y: 18 },
    radius: 4.5,
    zOrder: 4,
  },
  {
    id: 'balanceWheel',
    name: 'Balance Wheel',
    role: 'Oscillator / Timekeeper',
    color: '#e8d8a8',
    description: 'The timekeeping oscillator — a weighted rim (glucydur or brass) on a thin spoke. Moment of inertia ~0.35 mg·cm². Pairs with hairspring to form harmonic oscillator at 4 Hz (28,800 vph). Temperature compensation via bimetallic rim (legacy) or monometallic balance + Nivarox hairspring (modern). Poised statically and dynamically.',
    specs: [
      { label: 'Frequency', value: '4 Hz (28,800 vph)' },
      { label: 'Amplitude', value: '270°' },
      { label: 'Inertia', value: '0.35 mg·cm²' },
      { label: 'Material', value: 'Glucydur' },
      { label: 'Rim Ø', value: '10.0 mm' },
      { label: 'Pivot Ø', value: '0.07 mm' },
      { label: 'Jewels', value: '2 rubies + shock' },
    ],
    position: { x: 28, y: 42 },
    radius: 5.0,
    zOrder: 3,
  },
  {
    id: 'hairspring',
    name: 'Hairspring',
    role: 'Restoring Spring',
    color: '#a8c8e8',
    description: 'Flat spiral spring (Nivarox, Elinvar, or silicon) providing restoring torque τ = -κθ. Stiffness κ ~0.00018 N·m/rad. Terminal curve (Breguet overcoil) improves isochronism. Collet friction on balance staff critical — slip causes rate shifts. 11-12 active turns. Stud carrier adjustable for regulation.',
    specs: [
      { label: 'Material', value: 'Nivarox 1' },
      { label: 'Stiffness', value: '0.18 µN·m/rad' },
      { label: 'Active Turns', value: '11.5' },
      { label: 'Wire Ø', value: '0.028 mm' },
      { label: 'Width', value: '0.18 mm' },
      { label: 'Length', value: '210 mm' },
      { label: 'Overcoil', value: 'Breguet' },
    ],
    position: { x: 28, y: 42 },
    radius: 5.5,
    zOrder: 2,
  },
  {
    id: 'rollerJewel',
    name: 'Roller Jewel',
    role: 'Impulse Receiver',
    color: '#e87848',
    description: 'Single ruby pin (D-shape) on the roller table. Receives impulse from pallet fork horn. Dimensions critical: width 0.70-0.75 mm, length 1.8-2.0 mm. Too wide = reduced freedom, banking issues. Too narrow = impulse loss, amplitude drop. Clearance to fork horns: 0.02-0.03 mm (freedom).',
    specs: [
      { label: 'Material', value: 'Synthetic Ruby' },
      { label: 'Width', value: '0.72 mm' },
      { label: 'Length', value: '1.90 mm' },
      { label: 'Freedom', value: '0.025 mm' },
      { label: 'Roller Ø', value: '4.5 mm' },
    ],
    position: { x: 28, y: 42 },
    radius: 2.25,
    zOrder: 1,
  },
  {
    id: 'shockProtection',
    name: 'Shock Protection',
    role: 'Balance Staff Protection',
    color: '#b88868',
    description: 'Incabloc / Kif / Etachoc spring-loaded jewel setting. Under shock (>500g), balance staff pivot yields axially, jewel setting moves, absorbing energy. Spring force ~0.5-1.0 N. Prevents broken pivots — the most common vintage failure. Modern: 3000g+ survival. Reset automatic.',
    specs: [
      { label: 'Type', value: 'Incabloc' },
      { label: 'Spring Force', value: '0.7 N' },
      { label: 'Yield Travel', value: '0.15 mm' },
      { label: 'Shock Rating', value: '3000g' },
    ],
    position: { x: 28, y: 42 },
    radius: 1.5,
    zOrder: 11,
  },
];

// ============================================================================
// PHYSICS ENGINE — Single Source of Truth for All Motion
// ============================================================================

const Physics = {
  // Advance simulation by dt seconds
  step(dt) {
    // Clamp dt for stability
    dt = Math.min(dt, 1/30);

    // Substep for stiff spring dynamics
    const subSteps = Math.min(Math.ceil(dt / CONFIG.fixedTimestep), CONFIG.maxSubsteps);
    const subDt = dt / subSteps;

    for (let i = 0; i < subSteps; i++) {
      this.substep(subDt);
    }

    State.simTime += dt;
    this.updateDerived();
    this.recordGraphData();
  },

  substep(dt) {
    // 1. Mainspring torque (decreases as barrel unwinds)
    if (State.failures.mainspringBroken) {
      State.mainspringTorqueCurrent = 0;
    } else {
      const torqueMultiplier = State.params.mainspringTorque;
      const turnsUsed = CONFIG.mainspringTurns - State.mainspringTurnsRemaining;
      // Non-linear torque curve: high initially, drops faster near end
      const normalizedTurns = turnsUsed / CONFIG.mainspringTurns;
      const torqueFactor = 1 - 0.45 * normalizedTurns - 0.15 * normalizedTurns * normalizedTurns;
      State.mainspringTorqueCurrent = CONFIG.mainspringTorque * torqueFactor * torqueMultiplier;

      // Barrel unwinds based on gear train load
      const barrelLoad = this.computeBarrelLoad();
      const barrelDecel = barrelLoad / (0.05e-6); // barrel+spring inertia ~0.05 mg·cm²
      State.barrelAngle += State.escapeWheelVelocity * CONFIG.gearRatios.fourthToEscape *
        CONFIG.gearRatios.thirdToFourth * CONFIG.gearRatios.centerToThird *
        CONFIG.gearRatios.barrelToCenter * dt;
      State.mainspringTurnsRemaining = Math.max(0, CONFIG.mainspringTurns + State.barrelAngle / (2 * Math.PI));
    }

    // 2. Gear train — escape wheel driven by fourth wheel
    const fourthToEscapeRatio = CONFIG.gearRatios.fourthToEscape;
    const targetEscapeVelocity = State.fourthWheelAngle * 0; // placeholder
    // Escape wheel gets impulse from gear train
    const gearTorque = State.mainspringTorqueCurrent * fourthToEscapeRatio * 0.92; // 92% efficiency per mesh

    // 3. Escapement interaction
    this.computeEscapement(dt, gearTorque);

    // 4. Balance wheel dynamics (harmonic oscillator + impulses)
    this.computeBalance(dt);

    // 5. Update gear train angles from escape wheel
    this.updateGearTrain();
  },

  computeBarrelLoad() {
    // Reflected load from gear train to barrel
    const ratio = CONFIG.gearRatios.barrelToCenter *
      CONFIG.gearRatios.centerToThird *
      CONFIG.gearRatios.thirdToFourth *
      CONFIG.gearRatios.fourthToEscape;
    return State.escapeWheelVelocity * State.escapeWheelVelocity * 0.001 * ratio;
  },

  computeEscapement(dt, gearTorque) {
    const escapeAngle = State.escapeWheelAngle % (2 * Math.PI / CONFIG.escapeWheelTeeth);
    const toothAngle = 2 * Math.PI / CONFIG.escapeWheelTeeth;
    const impulseAngleRad = CONFIG.impulseAngle * Math.PI / 180;
    const dropAngleRad = CONFIG.dropAngle * Math.PI / 180;
    const drawAngleRad = CONFIG.drawAngle * Math.PI / 180;
    const liftAngleRad = CONFIG.liftAngle * Math.PI / 180;

    // Pallet fork angle follows balance via roller jewel
    const forkMaxAngle = (liftAngleRad / 2) * State.params.bankingClearance;
    State.palletForkAngle = Math.max(-forkMaxAngle, Math.min(forkMaxAngle,
      State.balanceAngle * 0.15  // coupling factor
    ));

    // Determine escapement phase based on escape wheel position relative to pallets
    const escapePhase = (State.escapeWheelAngle * CONFIG.escapeWheelTeeth) % (2 * Math.PI);
    const phaseDeg = (escapePhase / (2 * Math.PI)) * 360;
    const toothPhase = phaseDeg % (360 / CONFIG.escapeWheelTeeth);

    // Which pallet is engaged?
    const isEntryPallet = (Math.floor(phaseDeg / (360 / CONFIG.escapeWheelTeeth)) % 2) === 0;
    const palletAngle = State.palletForkAngle * (isEntryPallet ? 1 : -1);

    // Escapement state machine
    let impulseTorque = 0;
    let newPalletState = 'idle';

    if (toothPhase < drawAngleRad * 180 / Math.PI) {
      // Draw (lock) phase - pallet locked, no impulse
      newPalletState = 'lock';
      State.escapeWheelVelocity *= 0.999; // slight drag
    } else if (toothPhase < (drawAngleRad + impulseAngleRad) * 180 / Math.PI) {
      // Impulse phase - tooth pushing pallet
      newPalletState = 'impulse';
      const impulseProgress = (toothPhase - drawAngleRad * 180 / Math.PI) / (impulseAngleRad * 180 / Math.PI);
      // Sinusoidal impulse profile
      const impulseShape = Math.sin(impulseProgress * Math.PI);
      const direction = isEntryPallet ? 1 : -1;
      const lubricationFactor = State.params.palletLubrication;
      if (State.failures.palletStoneChipped) lubricationFactor *= 0.3;
      if (State.failures.lubricationFailed) lubricationFactor *= 0.1;
      impulseTorque = direction * CONFIG.impulsePerBeat * impulseShape * lubricationFactor *
        State.params.mainspringTorque;
      State.lastImpulseDirection = direction;
      State.lastImpulseTime = State.simTime;
    } else if (toothPhase < (drawAngleRad + impulseAngleRad + dropAngleRad) * 180 / Math.PI) {
      // Drop phase - tooth leaving pallet
      newPalletState = 'drop';
      // Small recoil impulse
      impulseTorque = -State.lastImpulseDirection * CONFIG.impulsePerBeat * 0.05;
    } else {
      // Free phase - escape wheel coasting to next tooth
      newPalletState = 'free';
    }

    // Escape wheel acceleration
    const escapeInertia = 0.004e-6; // mg·cm²
    State.escapeWheelAcceleration = (gearTorque + impulseTorque) / escapeInertia;
    State.escapeWheelVelocity += State.escapeWheelAcceleration * dt;
    State.escapeWheelAngle += State.escapeWheelVelocity * dt;

    // Apply banking pins - limit fork travel
    const bankingLimit = CONFIG.bankingAngle * Math.PI / 180 * State.params.bankingClearance;
    if (State.failures.bankingPinBent) {
      // Bent pin reduces banking on one side
      if (State.palletForkAngle > bankingLimit * 0.6) State.palletForkAngle = bankingLimit * 0.6;
      if (State.palletForkAngle < -bankingLimit) State.palletForkAngle = -bankingLimit;
    } else {
      State.palletForkAngle = Math.max(-bankingLimit, Math.min(bankingLimit, State.palletForkAngle));
    }

    State.palletState = newPalletState;

    // Recoil detection
    if (newPalletState === 'drop' && State.escapeWheelVelocity * State.lastImpulseDirection < 0) {
      State.palletState = 'recoil';
    }
  },

  computeBalance(dt) {
    // Balance wheel: I * θ'' = -κθ - bθ' + τ_impulse
    const inertia = CONFIG.balanceInertia * State.params.balanceInertia * 1e-9; // kg·m²
    const stiffness = CONFIG.hairspringStiffness * State.params.hairspringStiffness; // N·m/rad
    const damping = 1.2e-7 * (2 - State.params.palletLubrication); // N·m·s/rad

    if (State.failures.hairspringStuck) {
      // Hairspring stuck - drastically increased stiffness, no oscillation
      State.balanceAcceleration = -stiffness * 100 * State.balanceAngle / inertia;
    } else if (State.failures.shockDamage) {
      // Shock damage - reduced amplitude, increased damping
      State.balanceAcceleration = (-stiffness * State.balanceAngle - damping * 5 * State.balanceVelocity) / inertia;
    } else {
      // Normal harmonic oscillator with escapement impulse
      const impulseTorque = this.getImpulseTorque();
      State.balanceAcceleration = (-stiffness * State.balanceAngle - damping * State.balanceVelocity + impulseTorque) / inertia;
    }

    State.balanceVelocity += State.balanceAcceleration * dt;
    State.balanceAngle += State.balanceVelocity * dt;

    // Amplitude limiting (non-linear hairspring, air drag)
    const maxAmplitude = CONFIG.balanceAmplitude * Math.PI / 180 * State.params.amplitudeTarget;
    if (Math.abs(State.balanceAngle) > maxAmplitude) {
      State.balanceAngle = Math.sign(State.balanceAngle) * maxAmplitude;
      State.balanceVelocity *= -0.3; // energy loss at extremes
    }
  },

  getImpulseTorque() {
    // Impulse delivered to balance via pallet fork -> roller jewel
    if (State.palletState === 'impulse') {
      // Impulse transmitted through fork to roller jewel
      const couplingEfficiency = 0.85 * State.params.palletLubrication;
      if (State.failures.rollerJewelDamaged) couplingEfficiency *= 0.4;
      return State.lastImpulseDirection * CONFIG.impulsePerBeat * 0.6 * couplingEfficiency;
    }
    return 0;
  },

  updateGearTrain() {
    // All wheels driven by escape wheel through fixed ratios
    State.fourthWheelAngle = State.escapeWheelAngle / CONFIG.gearRatios.fourthToEscape;
    State.thirdWheelAngle = State.fourthWheelAngle / CONFIG.gearRatios.thirdToFourth;
    State.centerWheelAngle = State.thirdWheelAngle / CONFIG.gearRatios.centerToThird;
    State.barrelAngle = State.centerWheelAngle / CONFIG.gearRatios.barrelToCenter;
  },

  updateDerived() {
    // Beat error: asymmetry between tick and tock durations
    // Simplified: measure time between successive zero-crossings of balance velocity
    // Rate error: deviation from nominal frequency
    const actualFrequency = Math.abs(State.balanceVelocity) / (2 * Math.PI) * 2; // rough
    const rateError = (actualFrequency - CONFIG.frequency) / CONFIG.frequency * 86400; // s/day

    // Amplitude in degrees
    const amplitude = Math.abs(State.balanceAngle) * 180 / Math.PI * 2; // peak-to-peak

    // Torque at balance
    const balanceTorque = State.mainspringTorqueCurrent *
      CONFIG.gearRatios.barrelToCenter *
      CONFIG.gearRatios.centerToThird *
      CONFIG.gearRatios.thirdToFourth *
      CONFIG.gearRatios.fourthToEscape * 0.45;

    // Store for readouts
    State.derivedAmplitude = amplitude;
    State.derivedRateError = rateError;
    State.derivedBalanceTorque = balanceTorque;
    State.derivedBeatError = Math.abs(State.balanceVelocity) * 0.001; // simplified ms
  },

  recordGraphData() {
    const h = State.graphHistory;
    const max = h.maxPoints;
    const now = State.simTime;

    h.torque.push({ t: now, v: State.derivedBalanceTorque * 1e6 }); // µN·m
    h.amplitude.push({ t: now, v: State.derivedAmplitude });
    h.beatError.push({ t: now, v: State.derivedBeatError });
    h.rateError.push({ t: now, v: State.derivedRateError });

    [h.torque, h.amplitude, h.beatError, h.rateError].forEach(arr => {
      if (arr.length > max) arr.shift();
    });
  },

  // Reset to initial conditions
  reset() {
    State.simTime = 0;
    State.balanceAngle = 0;
    State.balanceVelocity = CONFIG.angularFrequency * CONFIG.balanceAmplitude * Math.PI / 180 * 0.5; // start with some velocity
    State.balanceAcceleration = 0;
    State.escapeWheelAngle = 0;
    State.escapeWheelVelocity = 0;
    State.palletForkAngle = 0;
    State.palletState = 'idle';
    State.lastImpulseTime = 0;
    State.lastImpulseDirection = 1;
    State.fourthWheelAngle = 0;
    State.thirdWheelAngle = 0;
    State.centerWheelAngle = 0;
    State.barrelAngle = 0;
    State.mainspringTurnsRemaining = CONFIG.mainspringTurns;
    State.mainspringTorqueCurrent = CONFIG.mainspringTorque;
    State.graphHistory.torque.length = 0;
    State.graphHistory.amplitude.length = 0;
    State.graphHistory.beatError.length = 0;
    State.graphHistory.rateError.length = 0;
  },
};

// ============================================================================
// RENDERER — Canvas 2D Technical Illustration
// ============================================================================

const Renderer = {
  ctx: null,
  canvas: null,
  width: 0,
  height: 0,
  dpr: 1,
  timeAccumulator: 0,
  lastRenderTime: 0,

  // Visual state for smooth interpolation
  visualState: {
    balanceAngle: 0,
    escapeWheelAngle: 0,
    palletForkAngle: 0,
    fourthWheelAngle: 0,
    thirdWheelAngle: 0,
    centerWheelAngle: 0,
    barrelAngle: 0,
    mainspringCoils: 6,
    palletState: 'idle',
    impulseFlash: 0,
    recoilFlash: 0,
  },

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = Math.floor(rect.width);
    this.height = Math.floor(rect.height);
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.scale(this.dpr, this.dpr);
  },

  // Main render loop
  render(timestamp) {
    if (!this.lastRenderTime) this.lastRenderTime = timestamp;
    const dt = Math.min((timestamp - this.lastRenderTime) / 1000, 1/30);
    this.lastRenderTime = timestamp;

    // Advance physics if playing
    if (State.playing) {
      Physics.step(dt * State.speed);
    }

    // Interpolate visual state for smooth rendering
    this.interpolateVisualState(dt);

    // Clear
    this.ctx.fillStyle = '#0a0a0c';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Setup transform
    this.ctx.save();
    this.ctx.translate(this.width / 2 + State.panX, this.height / 2 + State.panY);
    this.ctx.scale(State.zoom, State.zoom);

    // Draw background grid
    this.drawGrid();

    // Draw components in z-order
    const sorted = [...Components].sort((a, b) => a.zOrder - b.zOrder);
    sorted.forEach(comp => this.drawComponent(comp));

    // Draw connections (gear train lines)
    this.drawGearTrain();

    // Draw impulse flash
    if (this.visualState.impulseFlash > 0) {
      this.drawImpulseFlash();
    }

    // Draw recoil flash
    if (this.visualState.recoilFlash > 0) {
      this.drawRecoilFlash();
    }

    // Draw selection/hover highlights
    this.drawHighlights();

    // Draw scale bar
    this.drawScaleBar();

    this.ctx.restore();

    // Update UI readouts
    UI.updateReadouts();
    UI.updateTimeline();
    UI.updateGraphs();
    UI.updateComponentList();

    requestAnimationFrame((t) => this.render(t));
  },

  interpolateVisualState(dt) {
    const lerp = (a, b, t) => a + (b - a) * t;
    const factor = 1 - Math.exp(-dt * 60); // 60 Hz smoothing

    this.visualState.balanceAngle = lerp(this.visualState.balanceAngle, State.balanceAngle, factor);
    this.visualState.escapeWheelAngle = lerp(this.visualState.escapeWheelAngle, State.escapeWheelAngle, factor);
    this.visualState.palletForkAngle = lerp(this.visualState.palletForkAngle, State.palletForkAngle, factor);
    this.visualState.fourthWheelAngle = lerp(this.visualState.fourthWheelAngle, State.fourthWheelAngle, factor);
    this.visualState.thirdWheelAngle = lerp(this.visualState.thirdWheelAngle, State.thirdWheelAngle, factor);
    this.visualState.centerWheelAngle = lerp(this.visualState.centerWheelAngle, State.centerWheelAngle, factor);
    this.visualState.barrelAngle = lerp(this.visualState.barrelAngle, State.barrelAngle, factor);
    this.visualState.mainspringCoils = lerp(this.visualState.mainspringCoils, State.mainspringTurnsRemaining, factor);
    this.visualState.palletState = State.palletState;

    // Flash decay
    this.visualState.impulseFlash = Math.max(0, this.visualState.impulseFlash - dt * 15);
    this.visualState.recoilFlash = Math.max(0, this.visualState.recoilFlash - dt * 20);

    // Trigger flash on impulse
    if (State.palletState === 'impulse' && this.visualState.palletState !== 'impulse') {
      this.visualState.impulseFlash = 1.0;
    }
    if (State.palletState === 'recoil') {
      this.visualState.recoilFlash = 1.0;
    }
  },

  drawGrid() {
    const ctx = this.ctx;
    const zoom = State.zoom;
    const gridSize = 2 / zoom; // 2mm major grid
    const minorSize = gridSize / 5;

    ctx.save();
    ctx.strokeStyle = 'rgba(60,60,70,0.3)';
    ctx.lineWidth = 0.5 / zoom;

    const extent = Math.max(this.width, this.height) / zoom / 2 + 50;
    for (let x = -extent; x <= extent; x += minorSize) {
      ctx.beginPath();
      ctx.moveTo(x, -extent);
      ctx.lineTo(x, extent);
      ctx.stroke();
    }
    for (let y = -extent; y <= extent; y += minorSize) {
      ctx.beginPath();
      ctx.moveTo(-extent, y);
      ctx.lineTo(extent, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(100,100,110,0.4)';
    ctx.lineWidth = 1 / zoom;
    for (let x = -extent; x <= extent; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -extent);
      ctx.lineTo(x, extent);
      ctx.stroke();
    }
    for (let y = -extent; y <= extent; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-extent, y);
      ctx.lineTo(extent, y);
      ctx.stroke();
    }
    ctx.restore();
  },

  drawScaleBar() {
    const ctx = this.ctx;
    const zoom = State.zoom;
    const barLength = 5; // 5mm
    const pxLength = barLength * zoom;
    const x = -this.width / 2 / zoom + 15;
    const y = this.height / 2 / zoom - 15;

    ctx.save();
    ctx.strokeStyle = 'rgba(180,180,190,0.6)';
    ctx.lineWidth = 1.5 / zoom;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + pxLength, y);
    ctx.stroke();
    // Ticks
    ctx.beginPath();
    ctx.moveTo(x, y - 3/zoom);
    ctx.lineTo(x, y + 3/zoom);
    ctx.moveTo(x + pxLength, y - 3/zoom);
    ctx.lineTo(x + pxLength, y + 3/zoom);
    ctx.stroke();

    ctx.font = `bold ${10/zoom}px 'JetBrains Mono'`;
    ctx.fillStyle = 'rgba(180,180,190,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('5 mm', x + pxLength/2, y - 6/zoom);
    ctx.restore();
  },

  drawComponent(comp) {
    const ctx = this.ctx;
    const pos = comp.position;
    const radius = comp.radius;
    const isSelected = State.selectedComponent === comp.id;
    const isHovered = State.hoveredComponent === comp.id;
    const alpha = isSelected ? 1 : (isHovered ? 0.9 : 0.85);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.globalAlpha = alpha;

    switch (comp.id) {
      case 'mainspring': this.drawMainspring(comp); break;
      case 'barrel': this.drawBarrel(comp); break;
      case 'centerWheel': this.drawGearWheel(comp, 80, 12); break;
      case 'thirdWheel': this.drawGearWheel(comp, 72, 10); break;
      case 'fourthWheel': this.drawGearWheel(comp, 60, 8); break;
      case 'escapeWheel': this.drawEscapeWheel(comp); break;
      case 'palletFork': this.drawPalletFork(comp); break;
      case 'balanceWheel': this.drawBalanceWheel(comp); break;
      case 'hairspring': this.drawHairspring(comp); break;
      case 'rollerJewel': this.drawRollerJewel(comp); break;
      case 'shockProtection': this.drawShockProtection(comp); break;
    }

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = '#d4a843';
      ctx.lineWidth = 2 / State.zoom;
      ctx.setLineDash([4/State.zoom, 4/State.zoom]);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (isHovered) {
      ctx.strokeStyle = '#e8c858';
      ctx.lineWidth = 1.5 / State.zoom;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  },

  drawMainspring(comp) {
    const ctx = this.ctx;
    const coils = this.visualState.mainspringCoils;
    const barrelR = 5.6;
    const arborR = 1.5;
    const maxCoils = 6;

    // Draw spring coils from outside in
    for (let i = 0; i < Math.ceil(coils); i++) {
      const progress = i / maxCoils;
      const r = barrelR - progress * (barrelR - arborR) * 0.9;
      const coilAlpha = 0.6 - progress * 0.2;

      ctx.strokeStyle = `rgba(200, 176, 88, ${coilAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';

      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + Math.PI * 2 * (coils - i);

      ctx.beginPath();
      let first = true;
      for (let a = startAngle; a <= endAngle; a += 0.1) {
        const rr = r + (a - startAngle) / (endAngle - startAngle) * 0.3;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (first) { ctx.moveTo(x, y); first = false; }
        else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
    }

    // Arbor
    ctx.fillStyle = '#887868';
    ctx.beginPath();
    ctx.arc(0, 0, arborR, 0, Math.PI * 2);
    ctx.fill();

    // Barrel wall (partial)
    ctx.strokeStyle = '#a89040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, barrelR, -Math.PI * 0.3, Math.PI * 1.3);
    ctx.stroke();
  },

  drawBarrel(comp) {
    const ctx = this.ctx;
    const angle = this.visualState.barrelAngle;
    const r = comp.radius;

    // Barrel drum
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, '#c8b058');
    grad.addColorStop(0.5, '#b89840');
    grad.addColorStop(1, '#908030');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Teeth
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = '#d4b858';
    ctx.lineWidth = 1;
    const teeth = 80;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r - 0.8), Math.sin(a) * (r - 0.8));
      ctx.lineTo(Math.cos(a) * (r + 0.4), Math.sin(a) * (r + 0.4));
      ctx.stroke();
    }
    ctx.restore();

    // Center hole (arbor)
    ctx.fillStyle = '#504840';
    ctx.beginPath();
    ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Jewel
    this.drawJewel(ctx, 0, -r + 1.2, 0.8, '#c82828');
  },

  drawGearWheel(comp, teeth, pinionLeaves) {
    const ctx = this.ctx;
    const angle = this.getWheelAngle(comp.id);
    const r = comp.radius;

    // Wheel body
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, '#b8a898');
    grad.addColorStop(0.6, '#a09080');
    grad.addColorStop(1, '#887868');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Spokes (3-4 arms)
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = '#908070';
    ctx.lineWidth = 1.5;
    const spokes = 4;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
      ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
      ctx.stroke();
    }
    ctx.restore();

    // Teeth
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = '#c8b8a8';
    ctx.lineWidth = 1;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const r1 = r * 0.92;
      const r2 = r + 0.35;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();

    // Pinion (smaller, on same arbor)
    const pinionR = r * 0.35;
    const pinionAngle = angle * (teeth / pinionLeaves); // opposite rotation
    ctx.save();
    ctx.rotate(pinionAngle);
    ctx.fillStyle = '#706860';
    ctx.beginPath();
    ctx.arc(0, 0, pinionR, 0, Math.PI * 2);
    ctx.fill();
    // Pinion leaves
    ctx.strokeStyle = '#908880';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < pinionLeaves; i++) {
      const a = (i / pinionLeaves) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * pinionR * 0.4, Math.sin(a) * pinionR * 0.4);
      ctx.lineTo(Math.cos(a) * pinionR * 0.9, Math.sin(a) * pinionR * 0.9);
      ctx.stroke();
    }
    ctx.restore();

    // Pivot jewels
    this.drawJewel(ctx, 0, -r - 1.5, 0.7, '#c82828');
    this.drawJewel(ctx, 0, r + 1.5, 0.7, '#c82828');
  },

  getWheelAngle(id) {
    switch (id) {
      case 'centerWheel': return this.visualState.centerWheelAngle;
      case 'thirdWheel': return this.visualState.thirdWheelAngle;
      case 'fourthWheel': return this.visualState.fourthWheelAngle;
      default: return 0;
    }
  },

  drawEscapeWheel(comp) {
    const ctx = this.ctx;
    const angle = this.visualState.escapeWheelAngle;
    const r = comp.radius;

    // Wheel body - lighter, distinctive
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, '#e8d078');
    grad.addColorStop(0.5, '#d4b858');
    grad.addColorStop(1, '#b89840');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 15 club teeth
    ctx.save();
    ctx.rotate(angle);
    const teeth = CONFIG.escapeWheelTeeth;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const isImpulse = this.isToothImpulsing(i, angle);

      // Tooth profile: club tooth with impulse face
      ctx.fillStyle = isImpulse ? '#f0d880' : '#d4b858';
      ctx.strokeStyle = '#a89038';
      ctx.lineWidth = 0.6;

      const rBase = r * 0.7;
      const rTip = r + 0.8;
      const rImpulse = r + 0.4;
      const toothWidth = Math.PI * r / teeth * 0.45;

      ctx.beginPath();
      // Base
      ctx.moveTo(Math.cos(a - toothWidth/r) * rBase, Math.sin(a - toothWidth/r) * rBase);
      // Impulse face (radial)
      ctx.lineTo(Math.cos(a - toothWidth/r) * rImpulse, Math.sin(a - toothWidth/r) * rImpulse);
      // Tip
      ctx.lineTo(Math.cos(a) * rTip, Math.sin(a) * rTip);
      // Locking face (angled)
      ctx.lineTo(Math.cos(a + toothWidth/r) * rImpulse, Math.sin(a + toothWidth/r) * rImpulse);
      // Back to base
      ctx.lineTo(Math.cos(a + toothWidth/r) * rBase, Math.sin(a + toothWidth/r) * rBase);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // Pivot jewels
    this.drawJewel(ctx, 0, -r - 1.2, 0.6, '#c82828');
    this.drawJewel(ctx, 0, r + 1.2, 0.6, '#c82828');
  },

  isToothImpulsing(toothIndex, escapeAngle) {
    // Check if this tooth is currently in impulse phase
    const toothAngle = 2 * Math.PI / CONFIG.escapeWheelTeeth;
    const escapePhase = (escapeAngle * CONFIG.escapeWheelTeeth) % (2 * Math.PI);
    const currentTooth = Math.floor(escapePhase / toothAngle);
    const phaseInTooth = (escapePhase % toothAngle) / toothAngle;
    return toothIndex === currentTooth && phaseInTooth > 0.15 && phaseInTooth < 0.55;
  },

  drawPalletFork(comp) {
    const ctx = this.ctx;
    const angle = this.visualState.palletForkAngle;
    const forkLength = 3.2;
    const forkWidth = 1.8;

    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(angle);

    // Fork body
    const grad = ctx.createLinearGradient(-forkLength, -forkWidth, forkLength, forkWidth);
    grad.addColorStop(0, '#d4b858');
    grad.addColorStop(0.5, '#c8a040');
    grad.addColorStop(1, '#b89038');
    ctx.fillStyle = grad;

    // Fork shape
    ctx.beginPath();
    // Entry pallet (left)
    ctx.moveTo(-forkLength, -forkWidth/2);
    ctx.lineTo(-forkLength + 1.5, -forkWidth/2);
    ctx.lineTo(-forkLength + 1.5, -0.4);
    ctx.lineTo(-0.8, -0.4);
    ctx.lineTo(-0.8, 0.4);
    ctx.lineTo(-forkLength + 1.5, 0.4);
    ctx.lineTo(-forkLength + 1.5, forkWidth/2);
    ctx.lineTo(-forkLength, forkWidth/2);
    // Center post
    ctx.lineTo(-0.5, forkWidth/2);
    ctx.lineTo(-0.5, -forkWidth/2);
    // Exit pallet (right)
    ctx.lineTo(0.8, -0.4);
    ctx.lineTo(forkLength - 1.5, -0.4);
    ctx.lineTo(forkLength - 1.5, -forkWidth/2);
    ctx.lineTo(forkLength, -forkWidth/2);
    ctx.lineTo(forkLength, forkWidth/2);
    ctx.lineTo(forkLength - 1.5, forkWidth/2);
    ctx.lineTo(forkLength - 1.5, 0.4);
    ctx.lineTo(0.8, 0.4);
    ctx.lineTo(-0.5, 0.4);
    ctx.closePath();
    ctx.fill();

    // Pallet stones (ruby)
    // Entry pallet stone
    this.drawPallletStone(ctx, -forkLength + 0.8, 0, 1.2, 0.8, -angle);
    // Exit pallet stone
    this.drawPallletStone(ctx, forkLength - 0.8, 0, 1.2, 0.8, -angle);

    // Fork horns (impulse pins)
    ctx.fillStyle = '#e8d8a8';
    // Upper horn
    ctx.beginPath();
    ctx.ellipse(-0.5, -forkWidth/2 - 0.3, 0.35, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Lower horn
    ctx.beginPath();
    ctx.ellipse(-0.5, forkWidth/2 + 0.3, 0.35, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Banking pins (fixed, not rotating)
    ctx.restore();

    // Draw banking pins in world space
    this.drawBankingPins(ctx, angle);

    // Pivot jewel
    this.drawJewel(ctx, 0, -2.5, 0.6, '#c82828');
  },

  drawPallletStone(ctx, x, y, w, h, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    // Ruby stone with gradient
    const grad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
    grad.addColorStop(0, '#e84848');
    grad.addColorStop(0.5, '#c82828');
    grad.addColorStop(1, '#901818');
    ctx.fillStyle = grad;
    ctx.beginPath();
    // D-shape: flat on impulse face
    ctx.moveTo(-w/2, -h/2);
    ctx.lineTo(w/2, -h/2);
    ctx.quadraticCurveTo(w/2 + 0.2, 0, w/2, h/2);
    ctx.lineTo(-w/2, h/2);
    ctx.closePath();
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(-w/2 + 0.2, -h/2 + 0.2);
    ctx.lineTo(w/2 - 0.2, -h/2 + 0.2);
    ctx.lineTo(w/2 - 0.2, 0);
    ctx.lineTo(-w/2 + 0.2, 0);
    ctx.fill();
    ctx.restore();
  },

  drawBankingPins(ctx, forkAngle) {
    const pinRadius = 0.4;
    const pinDistance = 4.2; // from center
    const bankingAngle = CONFIG.bankingAngle * Math.PI / 180 * State.params.bankingClearance;

    // Upper banking pin
    const upperPinAngle = forkAngle + bankingAngle;
    const upperPinX = Math.sin(upperPinAngle) * pinDistance;
    const upperPinY = -Math.cos(upperPinAngle) * pinDistance - 1.5;

    // Lower banking pin
    const lowerPinAngle = forkAngle - bankingAngle;
    const lowerPinX = Math.sin(lowerPinAngle) * pinDistance;
    const lowerPinY = -Math.cos(lowerPinAngle) * pinDistance + 1.5;

    ctx.fillStyle = '#605850';
    ctx.beginPath();
    ctx.arc(upperPinX, upperPinY, pinRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lowerPinX, lowerPinY, pinRadius, 0, Math.PI * 2);
    ctx.fill();

    // Pin tips (hardened steel)
    ctx.fillStyle = '#908880';
    ctx.beginPath();
    ctx.arc(upperPinX, upperPinY, pinRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lowerPinX, lowerPinY, pinRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  },

  drawBalanceWheel(comp) {
    const ctx = this.ctx;
    const angle = this.visualState.balanceAngle;
    const r = comp.radius;

    ctx.save();
    ctx.rotate(angle);

    // Rim (glucydur - gold/brass color)
    const rimGrad = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r);
    rimGrad.addColorStop(0, '#e8d8a8');
    rimGrad.addColorStop(0.5, '#d4c088');
    rimGrad.addColorStop(1, '#b8a068');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Cutouts for poising (2-4 small holes)
    ctx.fillStyle = '#887860';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spokes (3 arms)
    ctx.strokeStyle = '#c8b088';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
      ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
      ctx.stroke();
    }

    // Hub
    ctx.fillStyle = '#a89880';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Roller table
    const rollerR = 2.25;
    ctx.fillStyle = '#d4c090';
    ctx.beginPath();
    ctx.arc(0, 0, rollerR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Pivot jewels (shock protected)
    this.drawJewel(ctx, 0, -r - 1.5, 0.6, '#c82828', true); // upper with shock spring
    this.drawJewel(ctx, 0, r + 1.5, 0.6, '#c82828');        // lower
  },

  drawHairspring(comp) {
    const ctx = this.ctx;
    const angle = this.visualState.balanceAngle;
    const turns = 11.5;
    const innerR = 1.2;
    const outerR = 5.5;

    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = 'rgba(168, 200, 232, 0.7)';
    ctx.lineWidth = 0.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    let first = true;
    for (let t = 0; t <= turns; t += 0.05) {
      const r = innerR + (t / turns) * (outerR - innerR);
      const a = t * Math.PI * 2;
      // Breguet overcoil: last turn rises
      let z = 0;
      if (t > turns - 1) {
        const overcoilProgress = (t - (turns - 1)) / 1;
        z = Math.sin(overcoilProgress * Math.PI) * 0.8;
        // Project to 2D with slight perspective
      }
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (first) { ctx.moveTo(x, y); first = false; }
      else { ctx.lineTo(x, y); }
    }
    ctx.stroke();

    // Collet (attachment to balance staff)
    ctx.fillStyle = '#887860';
    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
    ctx.fill();

    // Stud (fixed to balance cock)
    const studAngle = angle; // fixed in space
    const studX = Math.cos(studAngle) * outerR;
    const studY = Math.sin(studAngle) * outerR;
    ctx.fillStyle = '#706860';
    ctx.beginPath();
    ctx.arc(studX, studY, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Regulator pins
    const regAngle = angle + Math.PI * 0.1;
    const regX = Math.cos(regAngle) * outerR * 0.9;
    const regY = Math.sin(regAngle) * outerR * 0.9;
    ctx.strokeStyle = '#605850';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(regX - 0.8, regY);
    ctx.lineTo(regX + 0.8, regY);
    ctx.stroke();

    ctx.restore();
  },

  drawRollerJewel(comp) {
    const ctx = this.ctx;
    const angle = this.visualState.balanceAngle;
    const rollerR = 2.25;
    const jewelOffset = rollerR - 0.5;

    ctx.save();
    ctx.rotate(angle);

    // Roller jewel (D-shaped ruby pin)
    const jewelX = Math.cos(0) * jewelOffset;
    const jewelY = Math.sin(0) * jewelOffset;

    ctx.fillStyle = '#e85838';
    ctx.beginPath();
    // D-shape oriented radially
    ctx.moveTo(jewelX - 0.36, jewelY - 0.95);
    ctx.lineTo(jewelX + 0.36, jewelY - 0.95);
    ctx.quadraticCurveTo(jewelX + 0.5, jewelY, jewelX + 0.36, jewelY + 0.95);
    ctx.lineTo(jewelX - 0.36, jewelY + 0.95);
    ctx.closePath();
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(jewelX - 0.2, jewelY - 0.8);
    ctx.lineTo(jewelX + 0.1, jewelY - 0.8);
    ctx.lineTo(jewelX + 0.1, jewelY + 0.8);
    ctx.lineTo(jewelX - 0.2, jewelY + 0.8);
    ctx.fill();

    ctx.restore();
  },

  drawShockProtection(comp) {
    const ctx = this.ctx;
    const angle = this.visualState.balanceAngle;
    const r = 5.0; // balance radius

    // Upper shock setting (Incabloc style)
    const jewelX = 0;
    const jewelY = -r - 1.5;

    ctx.save();
    // Spring clip
    ctx.strokeStyle = '#887860';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(jewelX, jewelY, 1.2, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    // Spring ends
    ctx.beginPath();
    ctx.moveTo(jewelX - 1.1, jewelY - 0.3);
    ctx.lineTo(jewelX - 1.4, jewelY - 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(jewelX + 1.1, jewelY - 0.3);
    ctx.lineTo(jewelX + 1.4, jewelY - 0.6);
    ctx.stroke();

    ctx.restore();
  },

  drawJewel(ctx, x, y, r, color, withShock = false) {
    const grad = ctx.createRadialGradient(x - r*0.3, y - r*0.3, 0, x, y, r);
    grad.addColorStop(0, this.lightenColor(color, 40));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, this.darkenColor(color, 30));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Reflection
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(x - r*0.3, y - r*0.3, r*0.4, 0, Math.PI * 2);
    ctx.fill();
  },

  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + percent);
    const g = Math.min(255, ((num >> 8) & 0xFF) + percent);
    const b = Math.min(255, (num & 0xFF) + percent);
    return `rgb(${r},${g},${b})`;
  },

  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - percent);
    const g = Math.max(0, ((num >> 8) & 0xFF) - percent);
    const b = Math.max(0, (num & 0xFF) - percent);
    return `rgb(${r},${g},${b})`;
  },

  drawGearTrain() {
    const ctx = this.ctx;
    // Draw connection lines between wheel centers
    const connections = [
      { from: 'barrel', to: 'centerWheel' },
      { from: 'centerWheel', to: 'thirdWheel' },
      { from: 'thirdWheel', to: 'fourthWheel' },
      { from: 'fourthWheel', to: 'escapeWheel' },
      { from: 'escapeWheel', to: 'palletFork' },
      { from: 'palletFork', to: 'balanceWheel' },
    ];

    ctx.strokeStyle = 'rgba(120,120,130,0.25)';
    ctx.lineWidth = 0.8 / State.zoom;
    ctx.setLineDash([3/State.zoom, 3/State.zoom]);

    connections.forEach(conn => {
      const from = Components.find(c => c.id === conn.from);
      const to = Components.find(c => c.id === conn.to);
      if (from && to) {
        ctx.beginPath();
        ctx.moveTo(from.position.x, from.position.y);
        ctx.lineTo(to.position.x, to.position.y);
        ctx.stroke();
      }
    });

    ctx.setLineDash([]);
  },

  drawImpulseFlash() {
    const ctx = this.ctx;
    const alpha = this.visualState.impulseFlash * 0.6;
    const fork = Components.find(c => c.id === 'palletFork');
    const escape = Components.find(c => c.id === 'escapeWheel');

    if (!fork || !escape) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd840';

    // Flash at pallet stone contact point
    const forkAngle = this.visualState.palletForkAngle;
    const escapeAngle = this.visualState.escapeWheelAngle;

    // Calculate contact points (simplified)
    const contactX = fork.position.x + Math.sin(forkAngle) * 3.5;
    const contactY = fork.position.y - Math.cos(forkAngle) * 3.5;

    const grad = ctx.createRadialGradient(contactX, contactY, 0, contactX, contactY, 4);
    grad.addColorStop(0, 'rgba(255,216,64,0.8)');
    grad.addColorStop(1, 'rgba(255,216,64,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(contactX, contactY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  drawRecoilFlash() {
    const ctx = this.ctx;
    const alpha = this.visualState.recoilFlash * 0.8;

    ctx.save();
    ctx.globalAlpha = alpha;
    const fork = Components.find(c => c.id === 'palletFork');
    if (!fork) { ctx.restore(); return; }

    // Red flash at banking pins
    const forkAngle = this.visualState.palletForkAngle;
    const bankingAngle = CONFIG.bankingAngle * Math.PI / 180 * State.params.bankingClearance;
    const pinDistance = 4.2;

    const pinAngle = forkAngle + Math.sign(State.lastImpulseDirection) * bankingAngle;
    const pinX = fork.position.x + Math.sin(pinAngle) * pinDistance;
    const pinY = fork.position.y - Math.cos(pinAngle) * pinDistance - 1.5;

    const grad = ctx.createRadialGradient(pinX, pinY, 0, pinX, pinY, 3);
    grad.addColorStop(0, 'rgba(200,72,56,0.9)');
    grad.addColorStop(1, 'rgba(200,72,56,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pinX, pinY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  drawHighlights() {
    // Component labels on hover
    if (State.hoveredComponent && !State.selectedComponent) {
      const comp = Components.find(c => c.id === State.hoveredComponent);
      if (comp) {
        this.drawLabel(comp.position.x, comp.position.y - comp.radius - 4, comp.name);
      }
    }
    if (State.selectedComponent) {
      const comp = Components.find(c => c.id === State.selectedComponent);
      if (comp) {
        this.drawLabel(comp.position.x, comp.position.y - comp.radius - 4, comp.name, true);
      }
    }
  },

  drawLabel(x, y, text, selected = false) {
    const ctx = this.ctx;
    const zoom = State.zoom;
    const fontSize = Math.max(10, 12 / zoom);
    ctx.font = `500 ${fontSize}px 'Space Grotesk'`;
    ctx.textAlign = 'center';
    const metrics = ctx.measureText(text);
    const padX = 8 / zoom;
    const padY = 4 / zoom;
    const w = metrics.width + padX * 2;
    const h = fontSize + padY * 2;

    ctx.fillStyle = selected ? 'rgba(212, 168, 67, 0.95)' : 'rgba(22, 22, 26, 0.95)';
    ctx.strokeStyle = selected ? '#d4a843' : '#3a3a40';
    ctx.lineWidth = 1 / zoom;
    this.roundRect(ctx, x - w/2, y - h - 2/zoom, w, h, 4/zoom);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = selected ? '#0a0a0c' : '#e8e8ec';
    ctx.fillText(text, x, y - 4/zoom);
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },
};

// ============================================================================
// UI CONTROLLER
// ============================================================================

const UI = {
  elements: {},

  init() {
    this.cacheElements();
    this.bindEvents();
    this.populateReadouts();
    this.populateTimelinePhases();
    this.populateComponentList();
    this.populateWhatIfParams();
    this.populateWhatIfFailures();
    this.populateMovementSpecs();
    this.populateGraphs();
    this.buildShortcutsHint();
  },

  cacheElements() {
    this.elements = {
      canvas: document.getElementById('canvas'),
      canvasWrapper: document.getElementById('canvas-wrapper'),
      viewLabel: document.getElementById('view-label'),
      timelineTrack: document.getElementById('timeline-track'),
      timelinePhases: document.getElementById('timeline-phases'),
      timelineScrubber: document.getElementById('timeline-scrubber'),
      btnPlay: document.getElementById('btn-play'),
      playText: document.getElementById('play-text'),
      btnStepBack: document.getElementById('btn-step-back'),
      btnStepForward: document.getElementById('btn-step-forward'),
      speedSelect: document.getElementById('speed-select'),
      speedLabel: document.getElementById('speed-label'),
      readoutsGrid: document.getElementById('readouts-grid'),
      movementSpecsGrid: document.getElementById('movement-specs-grid'),
      componentList: document.getElementById('component-list'),
      componentDetail: document.getElementById('component-detail'),
      inspectorDot: document.getElementById('inspector-dot'),
      inspectorStateText: document.getElementById('inspector-state-text'),
      graphsContainer: document.getElementById('graphs-container'),
      whatifParams: document.getElementById('whatif-params'),
      whatifFailures: document.getElementById('whatif-failures'),
      whatifParamsToggle: document.getElementById('whatif-params-toggle'),
      whatifParamsContent: document.getElementById('whatif-params-content'),
      whatifFailuresToggle: document.getElementById('whatif-failures-toggle'),
      whatifFailuresContent: document.getElementById('whatif-failures-content'),
      tabs: {
        control: document.getElementById('tab-control'),
        inspect: document.getElementById('tab-inspect'),
        graphs: document.getElementById('tab-graphs'),
        whatif: document.getElementById('tab-whatif'),
      },
      panels: {
        control: document.getElementById('panel-control'),
        inspect: document.getElementById('panel-inspect'),
        graphs: document.getElementById('panel-graphs'),
        whatif: document.getElementById('panel-whatif'),
      },
      overlay: document.getElementById('overlay'),
      modalClose: document.getElementById('modal-close'),
      btnHelp: document.getElementById('btn-help'),
      btnViewToggle: document.getElementById('btn-view-toggle'),
      shortcutsHint: document.getElementById('shortcuts-hint'),
    };
  },

  bindEvents() {
    const el = this.elements;

    // Playback
    el.btnPlay.addEventListener('click', () => this.togglePlay());
    el.btnStepBack.addEventListener('click', () => this.step(-1));
    el.btnStepForward.addEventListener('click', () => this.step(1));
    el.speedSelect.addEventListener('change', (e) => this.setSpeed(parseFloat(e.target.value)));

    // Timeline scrubber
    el.timelineTrack.addEventListener('click', (e) => this.scrubTimeline(e));
    el.timelineTrack.addEventListener('mousedown', (e) => this.startScrub(e));
    document.addEventListener('mousemove', (e) => this.dragScrub(e));
    document.addEventListener('mouseup', () => this.endScrub());

    // Touch support
    el.timelineTrack.addEventListener('touchstart', (e) => this.startScrub(e.touches[0]), { passive: true });
    document.addEventListener('touchmove', (e) => this.dragScrub(e.touches[0]), { passive: false });
    document.addEventListener('touchend', () => this.endScrub());

    // Panel tabs
    Object.entries(el.tabs).forEach(([key, tab]) => {
      tab.addEventListener('click', () => this.switchTab(key));
    });

    // What-if toggles
    el.whatifParamsToggle.addEventListener('click', () => this.toggleWhatIf('params'));
    el.whatifFailuresToggle.addEventListener('click', () => this.toggleWhatIf('failures'));
    el.whatifParamsToggle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') this.toggleWhatIf('params'); });
    el.whatifFailuresToggle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') this.toggleWhatIf('failures'); });

    // Canvas interactions
    el.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
    el.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    el.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    el.canvas.addEventListener('mousedown', (e) => this.startPan(e));
    document.addEventListener('mousemove', (e) => this.dragPan(e));
    document.addEventListener('mouseup', () => this.endPan());

    // Touch pan/zoom
    let lastTouchDist = 0;
    el.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) this.startPan(e.touches[0]);
      else if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: false });
    el.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) this.dragPan(e.touches[0]);
      else if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = dist / lastTouchDist;
        this.zoomAt(State.zoom * scale, e.touches[0].clientX, e.touches[0].clientY);
        lastTouchDist = dist;
      }
    }, { passive: false });
    el.canvas.addEventListener('touchend', () => this.endPan());

    // Keyboard
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    el.canvas.addEventListener('keydown', (e) => this.handleCanvasKeydown(e));

    // Modal
    el.btnHelp.addEventListener('click', () => this.showHelp());
    el.modalClose.addEventListener('click', () => this.hideHelp());
    el.overlay.addEventListener('click', (e) => { if (e.target === el.overlay) this.hideHelp(); });

    // View toggle
    el.btnViewToggle.addEventListener('click', () => this.toggleViewMode());

    // Resize observer for canvas
    new ResizeObserver(() => Renderer.resize()).observe(el.canvasWrapper);
  },

  // Playback controls
  togglePlay() {
    State.playing = !State.playing;
    this.elements.btnPlay.classList.toggle('btn-primary', State.playing);
    this.elements.playText.textContent = State.playing ? 'Pause' : 'Play';
    this.elements.btnPlay.innerHTML = State.playing
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg><span id="play-text">Pause</span>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"></svg><span id="play-text">Play</span>';
    this.elements.playText = document.getElementById('play-text');
  },

  step(direction) {
    if (State.playing) this.togglePlay();
    const stepSize = CONFIG.beatPeriod / 4; // 1/4 beat per step
    if (direction > 0) {
      Physics.step(stepSize);
    } else {
      // Reverse step - rewind simulation (simplified)
      State.simTime = Math.max(0, State.simTime - stepSize);
      Physics.reset();
      // Re-simulate to new time (simplified - just jump)
      for (let i = 0; i < State.simTime / CONFIG.fixedTimestep; i++) {
        Physics.substep(CONFIG.fixedTimestep);
      }
    }
    Renderer.render(performance.now());
  },

  setSpeed(speed) {
    State.speed = speed;
    State.targetSpeed = speed;
    this.elements.speedLabel.textContent = speed + '×';
  },

  // Timeline
  populateTimelinePhases() {
    const phases = [
      { name: 'Unlock', start: 0, end: CONFIG.dropAngle / CONFIG.liftAngle },
      { name: 'Impulse', start: CONFIG.dropAngle / CONFIG.liftAngle, end: (CONFIG.dropAngle + CONFIG.impulseAngle) / CONFIG.liftAngle },
      { name: 'Drop', start: (CONFIG.dropAngle + CONFIG.impulseAngle) / CONFIG.liftAngle, end: (CONFIG.dropAngle + CONFIG.impulseAngle + CONFIG.drawAngle) / CONFIG.liftAngle },
      { name: 'Lock', start: (CONFIG.dropAngle + CONFIG.impulseAngle + CONFIG.drawAngle) / CONFIG.liftAngle, end: 1 },
    ];

    this.elements.timelinePhases.innerHTML = phases.map(p => `
      <div class="timeline-phase" style="left: ${p.start * 100}%; width: ${(p.end - p.start) * 100}%;" data-phase="${p.name}">
        ${p.name}
      </div>
    `).join('');
  },

  updateTimeline() {
    // Update scrubber position based on escapement phase
    const escapePhase = (State.escapeWheelAngle * CONFIG.escapeWheelTeeth) % (2 * Math.PI);
    const phaseProgress = escapePhase / (2 * Math.PI);
    this.elements.timelineScrubber.style.left = `${phaseProgress * 100}%`;

    // Update active phase highlight
    const phases = this.elements.timelinePhases.querySelectorAll('.timeline-phase');
    phases.forEach((el, i) => {
      el.classList.toggle('active', this.getCurrentPhaseIndex() === i);
      el.classList.toggle('current', this.getCurrentPhaseIndex() === i);
    });

    // Update aria
    this.elements.timelineTrack.setAttribute('aria-valuenow', phaseProgress.toFixed(3));
  },

  getCurrentPhaseIndex() {
    const escapePhase = (State.escapeWheelAngle * CONFIG.escapeWheelTeeth) % (2 * Math.PI);
    const phaseDeg = (escapePhase / (2 * Math.PI)) * 360;
    const toothPhase = phaseDeg % (360 / CONFIG.escapeWheelTeeth);
    const drawDeg = CONFIG.drawAngle;
    const impulseDeg = CONFIG.impulseAngle;
    const dropDeg = CONFIG.dropAngle;

    if (toothPhase < drawDeg) return 3; // Lock
    if (toothPhase < drawDeg + impulseDeg) return 1; // Impulse
    if (toothPhase < drawDeg + impulseDeg + dropDeg) return 2; // Drop
    return 0; // Unlock (same as lock for next tooth)
  },

  scrubTimeline(e) {
    const rect = this.elements.timelineTrack.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this.seekToPhase(progress);
  },

  startScrub(e) {
    this.isScrubbing = true;
    this.scrubTimeline(e);
    e.preventDefault();
  },

  dragScrub(e) {
    if (this.isScrubbing) {
      this.scrubTimeline(e);
    }
  },

  endScrub() {
    this.isScrubbing = false;
  },

  seekToPhase(progress) {
    // Seek simulation to a specific escapement phase
    // This is approximate - we set the escape wheel angle
    const targetEscapeAngle = progress * 2 * Math.PI / CONFIG.escapeWheelTeeth;
    const fullCycles = Math.floor(State.escapeWheelAngle / (2 * Math.PI / CONFIG.escapeWheelTeeth));
    State.escapeWheelAngle = fullCycles * (2 * Math.PI / CONFIG.escapeWheelTeeth) + targetEscapeAngle;
    Physics.updateGearTrain();
    Physics.updateDerived();
  },

  // Readouts
  populateReadouts() {
    const readouts = [
      { id: 'amplitude', label: 'Amplitude', unit: '°', value: 0, format: v => v.toFixed(1), class: 'accent' },
      { id: 'rate', label: 'Rate Error', unit: 's/day', value: 0, format: v => (v >= 0 ? '+' : '') + v.toFixed(1), class: '' },
      { id: 'beatError', label: 'Beat Error', unit: 'ms', value: 0, format: v => v.toFixed(2), class: '' },
      { id: 'torque', label: 'Balance Torque', unit: 'µN·m', value: 0, format: v => v.toFixed(1), class: 'accent' },
      { id: 'mainspring', label: 'Mainspring', unit: 'turns', value: CONFIG.mainspringTurns, format: v => v.toFixed(2), class: '' },
      { id: 'powerReserve', label: 'Power Reserve', unit: 'hr', value: 40, format: v => v.toFixed(1), class: '' },
    ];

    this.elements.readoutsGrid.innerHTML = readouts.map(r => `
      <div class="readout-card" data-readout="${r.id}">
        <div class="readout-label">${r.label}</div>
        <div class="readout-value ${r.class}" id="readout-${r.id}">${r.format(r.value)}<span class="readout-unit">${r.unit}</span></div>
        <canvas class="readout-sparkline" id="sparkline-${r.id}" width="140" height="36"></canvas>
      </div>
    `).join('');

    this.readoutDefs = readouts;
  },

  updateReadouts() {
    const amplitude = State.derivedAmplitude || 0;
    const rateError = State.derivedRateError || 0;
    const beatError = State.derivedBeatError || 0;
    const torque = State.derivedBalanceTorque * 1e6 || 0;
    const mainspringTurns = State.mainspringTurnsRemaining || 0;
    const powerReserve = mainspringTurns / CONFIG.mainspringTurns * 42;

    const values = {
      amplitude,
      rate: rateError,
      beatError,
      torque,
      mainspring: mainspringTurns,
      powerReserve,
    };

    this.readoutDefs.forEach(r => {
      const el = document.getElementById(`readout-${r.id}`);
      if (el) {
        el.textContent = '';
        const val = values[r.id] !== undefined ? values[r.id] : 0;
        el.appendChild(document.createTextNode(r.format(val)));
        const unitSpan = document.createElement('span');
        unitSpan.className = 'readout-unit';
        unitSpan.textContent = r.unit;
        el.appendChild(unitSpan);

        // Color coding for rate error
        if (r.id === 'rate') {
          el.classList.remove('warning', 'success');
          if (Math.abs(val) > 10) el.classList.add('warning');
          else if (Math.abs(val) < 3) el.classList.add('success');
        }
        if (r.id === 'amplitude') {
          el.classList.remove('warning', 'success');
          if (val < 220) el.classList.add('warning');
          else if (val > 250) el.classList.add('success');
        }
      }
      this.drawSparkline(`sparkline-${r.id}`, State.graphHistory[r.id === 'mainspring' ? 'torque' : r.id] || []);
    });
  },

  drawSparkline(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width = 140 * dpr;
    const h = canvas.height = 36 * dpr;
    ctx.scale(dpr, dpr);

    if (data.length < 2) return;

    const values = data.map(d => d.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    ctx.strokeStyle = '#d4a843';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    data.forEach((d, i) => {
      const x = (i / (data.length - 1)) * 140;
      const y = 36 - ((d.v - min) / range) * 30 - 3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  },

  // Movement specs
  populateMovementSpecs() {
    const specs = [
      { label: 'Frequency', value: `${CONFIG.frequency} Hz (${CONFIG.frequency * 3600} vph)` },
      { label: 'Escapement', value: 'Swiss Lever' },
      { label: 'Escape Wheel', value: `${CONFIG.escapeWheelTeeth} teeth, club tooth` },
      { label: 'Lift Angle', value: `${CONFIG.liftAngle}°` },
      { label: 'Draw Angle', value: `${CONFIG.drawAngle}°` },
      { label: 'Drop Angle', value: `${CONFIG.dropAngle}°` },
      { label: 'Impulse Angle', value: `${CONFIG.impulseAngle}°` },
      { label: 'Balance Amplitude', value: `${CONFIG.balanceAmplitude}°` },
      { label: 'Mainspring Torque', value: `${(CONFIG.mainspringTorque * 1e6).toFixed(0)} µN·m` },
      { label: 'Power Reserve', value: '~42 hours' },
      { label: 'Jewel Count', value: '17 jewels' },
      { label: 'Adjustment', value: '5 positions' },
    ];

    this.elements.movementSpecsGrid.innerHTML = specs.map(s => `
      <div class="spec-item">
        <div class="spec-label">${s.label}</div>
        <div class="spec-value">${s.value}</div>
      </div>
    `).join('');
  },

  // Component list
  populateComponentList() {
    this.elements.componentList.innerHTML = Components.map(comp => `
      <div class="component-item" data-component="${comp.id}" role="option" tabindex="0" aria-selected="false">
        <div class="component-color" style="background: ${comp.color}"></div>
        <div class="component-info">
          <div class="component-name">${comp.name}</div>
          <div class="component-role">${comp.role}</div>
        </div>
        <div class="component-status idle" id="status-${comp.id}">Idle</div>
      </div>
    `).join('');

    // Bind click/keyboard events
    this.elements.componentList.querySelectorAll('.component-item').forEach(item => {
      item.addEventListener('click', () => this.selectComponent(item.dataset.component));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectComponent(item.dataset.component);
        }
      });
    });
  },

  updateComponentList() {
    Components.forEach(comp => {
      const statusEl = document.getElementById(`status-${comp.id}`);
      const itemEl = this.elements.componentList.querySelector(`[data-component="${comp.id}"]`);
      if (!statusEl || !itemEl) return;

      let status = 'idle';
      let statusClass = 'idle';

      switch (comp.id) {
        case 'balanceWheel':
        case 'hairspring':
        case 'rollerJewel':
          status = Math.abs(State.balanceVelocity) > 0.1 ? 'active' : 'idle';
          statusClass = status;
          break;
        case 'escapeWheel':
          status = Math.abs(State.escapeWheelVelocity) > 0.1 ? 'active' : 'idle';
          statusClass = status;
          break;
        case 'palletFork':
          status = State.palletState;
          statusClass = State.palletState === 'impulse' ? 'active' :
            State.palletState === 'recoil' ? 'recoil' : 'idle';
          break;
        case 'mainspring':
        case 'barrel':
          status = State.mainspringTorqueCurrent > 0 ? 'loaded' : 'idle';
          statusClass = status;
          break;
        default:
          status = 'idle';
          statusClass = 'idle';
      }

      statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      statusEl.className = `component-status ${statusClass}`;

      // Selection
      itemEl.classList.toggle('selected', State.selectedComponent === comp.id);
      itemEl.setAttribute('aria-selected', State.selectedComponent === comp.id);
    });
  },

  selectComponent(id) {
    State.selectedComponent = State.selectedComponent === id ? null : id;
    this.updateComponentDetail();
    this.updateComponentList();
  },

  updateComponentDetail() {
    const detailEl = this.elements.componentDetail;
    if (!State.selectedComponent) {
      detailEl.classList.remove('active');
      return;
    }

    const comp = Components.find(c => c.id === State.selectedComponent);
    if (!comp) return;

    detailEl.classList.add('active');
    detailEl.innerHTML = `
      <div class="detail-header">
        <h3 class="detail-title">${comp.name}</h3>
        <button class="detail-close" aria-label="Close detail">&times;</button>
      </div>
      <div class="detail-description">${comp.description}</div>
      <div class="detail-specs">
        ${comp.specs.map(s => `
          <div class="spec-item">
            <div class="spec-label">${s.label}</div>
            <div class="spec-value">${s.value}</div>
          </div>
        `).join('')}
      </div>
      <div class="detail-phase">
        <strong>Current Phase:</strong> ${this.getComponentPhaseText(comp)}
      </div>
    `;

    detailEl.querySelector('.detail-close').addEventListener('click', () => {
      State.selectedComponent = null;
      this.updateComponentDetail();
      this.updateComponentList();
    });
  },

  getComponentPhaseText(comp) {
    switch (comp.id) {
      case 'palletFork':
      case 'escapeWheel':
        return State.palletState.charAt(0).toUpperCase() + State.palletState.slice(1);
      case 'balanceWheel':
      case 'hairspring':
      case 'rollerJewel':
        return `Oscillating @ ${Math.abs(State.balanceVelocity / (2*Math.PI) * 2).toFixed(2)} Hz`;
      case 'mainspring':
      case 'barrel':
        return `${State.mainspringTurnsRemaining.toFixed(2)} turns remaining`;
      default:
        return 'Rotating';
    }
  },

  // Graphs
  populateGraphs() {
    const graphs = [
      { id: 'torque', title: 'Balance Torque', unit: 'µN·m', color: '#d4a843', dataKey: 'torque' },
      { id: 'amplitude', title: 'Amplitude', unit: '°', color: '#48a858', dataKey: 'amplitude' },
      { id: 'beatError', title: 'Beat Error', unit: 'ms', color: '#e87848', dataKey: 'beatError' },
      { id: 'rateError', title: 'Rate Error', unit: 's/day', color: '#a878e8', dataKey: 'rateError' },
    ];

    this.elements.graphsContainer.innerHTML = graphs.map(g => `
      <div class="graph-card" data-graph="${g.id}">
        <div class="graph-header">
          <h3 class="graph-title">${g.title}</h3>
          <div class="graph-legend">
            <div class="legend-item">
              <div class="legend-color" style="background: ${g.color}"></div>
              <span>${g.unit}</span>
            </div>
          </div>
        </div>
        <canvas class="graph-canvas" id="graph-${g.id}"></canvas>
      </div>
    `).join('');

    this.graphDefs = graphs;
  },

  updateGraphs() {
    this.graphDefs.forEach(g => {
      const canvas = document.getElementById(`graph-${g.id}`);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = 160 * dpr;
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = 160;
      const data = State.graphHistory[g.dataKey] || [];
      if (data.length < 2) return;

      const values = data.map(d => d.v);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      // Background
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(60,60,70,0.3)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 4; i++) {
        const y = (i / 4) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Zero line if crossing zero
      if (min < 0 && max > 0) {
        const zeroY = h - (0 - min) / range * h;
        ctx.strokeStyle = 'rgba(120,120,130,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, zeroY);
        ctx.lineTo(w, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Data line
      ctx.strokeStyle = g.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      data.forEach((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((d.v - min) / range) * (h - 20) - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Current value indicator
      const last = data[data.length - 1];
      const lastX = w;
      const lastY = h - ((last.v - min) / range) * (h - 20) - 10;
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(lastX - 2, lastY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Value label
      ctx.font = '500 11px "JetBrains Mono"';
      ctx.fillStyle = g.color;
      ctx.textAlign = 'right';
      ctx.fillText(last.v.toFixed(2), w - 8, lastY - 8);
    });
  },

  // What-if parameters
  populateWhatIfParams() {
    const params = [
      {
        id: 'mainspringTorque',
        name: 'Mainspring Torque',
        min: 0,
        max: 1.5,
        step: 0.05,
        value: 1.0,
        unit: '×',
        presets: [
          { label: 'Fully Wound', value: 1.0 },
          { label: 'Half Wound', value: 0.7 },
          { label: 'Low Reserve', value: 0.4 },
          { label: 'Overwound', value: 1.2 },
        ],
      },
      {
        id: 'balanceInertia',
        name: 'Balance Inertia',
        min: 0.5,
        max: 2.0,
        step: 0.05,
        value: 1.0,
        unit: '×',
        presets: [
          { label: 'Standard', value: 1.0 },
          { label: 'Heavy (Glucydur)', value: 1.15 },
          { label: 'Light (Titanium)', value: 0.85 },
          { label: 'Compensated', value: 1.05 },
        ],
      },
      {
        id: 'hairspringStiffness',
        name: 'Hairspring Stiffness',
        min: 0.5,
        max: 2.0,
        step: 0.05,
        value: 1.0,
        unit: '×',
        presets: [
          { label: 'Nivarox 1', value: 1.0 },
          { label: 'Elinvar', value: 0.95 },
          { label: 'Silicon', value: 1.1 },
          { label: 'Weak (aged)', value: 0.8 },
        ],
      },
      {
        id: 'palletLubrication',
        name: 'Pallet Lubrication',
        min: 0.1,
        max: 1.5,
        step: 0.05,
        value: 1.0,
        unit: '×',
        presets: [
          { label: 'Fresh Oil', value: 1.0 },
          { label: 'Aged (3 yr)', value: 0.6 },
          { label: 'Dry / None', value: 0.15 },
          { label: 'Over-oiled', value: 1.2 },
        ],
      },
      {
        id: 'bankingClearance',
        name: 'Banking Clearance',
        min: 0.5,
        max: 2.0,
        step: 0.05,
        value: 1.0,
        unit: '×',
        presets: [
          { label: 'Correct', value: 1.0 },
          { label: 'Tight', value: 0.7 },
          { label: 'Loose', value: 1.4 },
        ],
      },
      {
        id: 'amplitudeTarget',
        name: 'Target Amplitude',
        min: 0.3,
        max: 1.2,
        step: 0.05,
        value: 1.0,
        unit: '×',
        presets: [
          { label: 'Spec (270°)', value: 1.0 },
          { label: 'Low (220°)', value: 0.8 },
          { label: 'High (310°)', value: 1.15 },
        ],
      },
    ];

    this.elements.whatifParams.innerHTML = params.map(p => `
      <div class="param-item" data-param="${p.id}">
        <div class="param-header">
          <span class="param-name">${p.name}</span>
          <span class="param-value" id="param-val-${p.id}">${p.value}${p.unit}</span>
        </div>
        <input type="range" class="param-slider" id="param-${p.id}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.value}" aria-label="${p.name}">
        <div class="param-range">
          <span>${p.min}${p.unit}</span>
          <span>${p.max}${p.unit}</span>
        </div>
        <div class="param-presets">
          ${p.presets.map(pr => `
            <button class="param-preset ${pr.value === p.value ? 'active' : ''}" data-param="${p.id}" data-value="${pr.value}">${pr.label}</button>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Bind events
    params.forEach(p => {
      const slider = document.getElementById(`param-${p.id}`);
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        State.params[p.id] = val;
        document.getElementById(`param-val-${p.id}`).textContent = val.toFixed(2) + p.unit;
        this.updatePresetButtons(p.id, val);
      });
    });

    this.elements.whatifParams.querySelectorAll('.param-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const paramId = btn.dataset.param;
        const value = parseFloat(btn.dataset.value);
        State.params[paramId] = value;
        const slider = document.getElementById(`param-${paramId}`);
        slider.value = value;
        const paramDef = params.find(p => p.id === paramId);
        document.getElementById(`param-val-${paramId}`).textContent = value.toFixed(2) + paramDef.unit;
        this.updatePresetButtons(paramId, value);
      });
    });
  },

  updatePresetButtons(paramId, value) {
    this.elements.whatifParams.querySelectorAll(`[data-param="${paramId}"]`).forEach(btn => {
      btn.classList.toggle('active', Math.abs(parseFloat(btn.dataset.value) - value) < 0.01);
    });
  },

  // What-if failures
  populateWhatIfFailures() {
    const failures = [
      { id: 'mainspringBroken', name: 'Mainspring Broken', desc: 'Zero torque — movement stops' },
      { id: 'hairspringStuck', name: 'Hairspring Stuck', desc: 'Coils touching — rate spikes, amplitude collapses' },
      { id: 'palletStoneChipped', name: 'Pallet Stone Chipped', desc: 'Impulse surface damaged — amplitude drops 60%+' },
      { id: 'escapeWheelToothBent', name: 'Escape Tooth Bent', desc: 'Irregular impulse — beat error, stopping' },
      { id: 'bankingPinBent', name: 'Banking Pin Bent', desc: 'Asymmetric fork limit — amplitude imbalance' },
      { id: 'lubricationFailed', name: 'Lubrication Failed', desc: 'All pivots dry — amplitude decays rapidly' },
      { id: 'shockDamage', name: 'Shock Damage', desc: 'Balance staff bent — wobble, rate chaos' },
    ];

    this.elements.whatifFailures.innerHTML = failures.map(f => `
      <div class="failure-item" data-failure="${f.id}" role="switch" aria-checked="false" tabindex="0">
        <div class="failure-indicator"></div>
        <div>
          <div class="failure-name">${f.name}</div>
          <div class="failure-desc">${f.desc}</div>
        </div>
      </div>
    `).join('');

    this.elements.whatifFailures.querySelectorAll('.failure-item').forEach(item => {
      item.addEventListener('click', () => this.toggleFailure(item.dataset.failure));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleFailure(item.dataset.failure);
        }
      });
    });
  },

  toggleFailure(id) {
    State.failures[id] = !State.failures[id];
    const item = this.elements.whatifFailures.querySelector(`[data-failure="${id}"]`);
    if (item) {
      item.classList.toggle('active', State.failures[id]);
      item.setAttribute('aria-checked', State.failures[id]);
    }

    // Reset simulation on failure change
    Physics.reset();
    Renderer.render(performance.now());
  },

  toggleWhatIf(type) {
    const toggle = this.elements[`whatif${type.charAt(0).toUpperCase() + type.slice(1)}Toggle`];
    const content = this.elements[`whatif${type.charAt(0).toUpperCase() + type.slice(1)}Content`];
    const isActive = toggle.classList.toggle('active');
    toggle.setAttribute('aria-expanded', isActive);
  },

  // Panel tabs
  switchTab(tabId) {
    Object.entries(this.elements.tabs).forEach(([key, tab]) => {
      const active = key === tabId;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active);
      this.elements.panels[key].classList.toggle('active', active);
    });
  },

  // Canvas interaction
  handleCanvasHover(e) {
    const rect = this.elements.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.width / 2 - State.panX) / State.zoom;
    const y = (e.clientY - rect.top - this.height / 2 - State.panY) / State.zoom;

    let hovered = null;
    let minDist = Infinity;

    Components.forEach(comp => {
      const dx = x - comp.position.x;
      const dy = y - comp.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < comp.radius * 1.5 && dist < minDist) {
        minDist = dist;
        hovered = comp.id;
      }
    });

    State.hoveredComponent = hovered;
  },

  handleCanvasClick(e) {
    const rect = this.elements.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.width / 2 - State.panX) / State.zoom;
    const y = (e.clientY - rect.top - this.height / 2 - State.panY) / State.zoom;

    let clicked = null;
    let minDist = Infinity;

    Components.forEach(comp => {
      const dx = x - comp.position.x;
      const dy = y - comp.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < comp.radius * 1.5 && dist < minDist) {
        minDist = dist;
        clicked = comp.id;
      }
    });

    this.selectComponent(clicked);
  },

  handleWheel(e) {
    e.preventDefault();
    const rect = this.elements.canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    this.zoomAt(State.zoom * zoomFactor, cx, cy);
  },

  zoomAt(newZoom, cx, cy) {
    newZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, newZoom));
    const rect = this.elements.canvas.getBoundingClientRect();
    const wx = (cx - this.width / 2 - State.panX) / State.zoom;
    const wy = (cy - this.height / 2 - State.panY) / State.zoom;
    State.panX = cx - this.width / 2 - wx * newZoom;
    State.panY = cy - this.height / 2 - wy * newZoom;
    State.zoom = newZoom;
  },

  startPan(e) {
    if (e.button !== 0 && e.button !== 2) return; // Only left/right click
    State.isDragging = true;
    State.dragStart = { x: e.clientX, y: e.clientY };
    State.dragPanStart = { x: State.panX, y: State.panY };
    this.elements.canvas.style.cursor = 'grabbing';
    e.preventDefault();
  },

  dragPan(e) {
    if (!State.isDragging) return;
    const dx = e.clientX - State.dragStart.x;
    const dy = e.clientY - State.dragStart.y;
    State.panX = State.dragPanStart.x + dx;
    State.panY = State.dragPanStart.y + dy;
  },

  endPan() {
    State.isDragging = false;
    this.elements.canvas.style.cursor = '';
  },

  // Keyboard
  handleKeydown(e) {
    // Global shortcuts
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        this.togglePlay();
        break;
      case '.':
      case '>':
      case 'ArrowRight':
        e.preventDefault();
        this.step(1);
        break;
      case ',':
      case '<':
      case 'ArrowLeft':
        e.preventDefault();
        this.step(-1);
        break;
      case 'Home':
      case 'r':
      case 'R':
        e.preventDefault();
        this.resetSimulation();
        break;
      case ']':
      case '=':
        e.preventDefault();
        this.adjustSpeed(1);
        break;
      case '[':
      case '-':
        e.preventDefault();
        this.adjustSpeed(-1);
        break;
      case 'v':
      case 'V':
        this.toggleViewMode();
        break;
      case '+':
      case '=':
        if (e.ctrlKey || e.metaKey) return; // Let browser handle zoom
        this.zoomAt(State.zoom * 1.2, this.width / 2, this.height / 2);
        break;
      case '-':
      case '_':
        if (e.ctrlKey || e.metaKey) return;
        this.zoomAt(State.zoom / 1.2, this.width / 2, this.height / 2);
        break;
      case '0':
        this.resetView();
        break;
      case 'Escape':
        State.selectedComponent = null;
        this.updateComponentDetail();
        this.updateComponentList();
        this.hideHelp();
        break;
      case '?':
      case 'h':
      case 'H':
        if (e.shiftKey || e.key === '?') this.showHelp();
        break;
      case '1': this.switchTab('control'); break;
      case '2': this.switchTab('inspect'); break;
      case '3': this.switchTab('graphs'); break;
      case '4': this.switchTab('whatif'); break;
      case 'Tab':
        // Cycle components
        if (!State.selectedComponent) break;
        const indices = Components.map((c, i) => c.id === State.selectedComponent ? i : -1).filter(i => i >= 0);
        if (indices.length) {
          e.preventDefault();
          const idx = indices[0];
          const nextIdx = e.shiftKey ? (idx - 1 + Components.length) % Components.length : (idx + 1) % Components.length;
          this.selectComponent(Components[nextIdx].id);
        }
        break;
      case 'f':
      case 'F':
        this.elements.canvas.focus();
        break;
    }
  },

  handleCanvasKeydown(e) {
    // Canvas-specific keys when focused
    this.handleKeydown(e);
  },

  adjustSpeed(delta) {
    const speeds = [0.1, 0.25, 0.5, 1, 2, 4];
    const currentIdx = speeds.indexOf(State.speed);
    const newIdx = Math.max(0, Math.min(speeds.length - 1, currentIdx + delta));
    this.setSpeed(speeds[newIdx]);
    this.elements.speedSelect.value = speeds[newIdx];
  },

  resetSimulation() {
    Physics.reset();
    State.simTime = 0;
    Renderer.render(performance.now());
  },

  toggleViewMode() {
    State.viewMode = State.viewMode === 'cutaway' ? 'exploded' : 'cutaway';
    this.elements.viewLabel.textContent = State.viewMode === 'cutaway' ? 'Cutaway View' : 'Exploded View';
    // In a full implementation, this would rearrange component positions
  },

  resetView() {
    State.zoom = CONFIG.baseZoom;
    State.panX = 0;
    State.panY = 0;
  },

  showHelp() {
    this.elements.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  hideHelp() {
    this.elements.overlay.classList.remove('active');
    document.body.style.overflow = '';
  },

  buildShortcutsHint() {
    const shortcuts = [
      { keys: ['Space'], desc: 'Play/Pause' },
      { keys: ['.', '→'], desc: 'Step Forward' },
      { keys: [',', '←'], desc: 'Step Back' },
      { keys: ['V'], desc: 'Toggle View' },
      { keys: ['+', '-'], desc: 'Zoom' },
      { keys: ['?'], desc: 'Help' },
    ];

    this.elements.shortcutsHint.innerHTML = shortcuts.map(s => `
      <div class="shortcut">
        ${s.keys.map(k => `<kbd>${k}</kbd>`).join(' ')}
        <span>${s.desc}</span>
      </div>
    `).join('');
  },

  // Getters (as methods to avoid syntax issues)
  width() { return Renderer.width; },
  height() { return Renderer.height; },
};

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    document.documentElement.style.setProperty('--transition', '1ms');
    document.documentElement.style.setProperty('--transition-slow', '1ms');
  }

  // Initialize UI
  UI.init();

  // Initialize Renderer
  Renderer.init(UI.elements.canvas);

  // Start render loop
  requestAnimationFrame((t) => Renderer.render(t));

  // Focus canvas for keyboard
  UI.elements.canvas.focus();

  console.log('Horology — Swiss Lever Escapement Explainer initialized');
  console.log('Keyboard shortcuts: Space=Play/Pause, .=Step, V=View, ?=Help');
}

// Start when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging
window.Horology = { State, Config: CONFIG, Physics, Renderer, UI, Components };