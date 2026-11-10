/**
 * HEX DOMINION - Main Game Module
 * Turn-based strategy game with AI opponent
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const PLAYER = 0;
const ENEMY = 1;
const NEUTRAL = -1;

const TERRAIN_TYPES = {
  PLAINS: { name: 'Plains', moveCost: 1, defense: 0, energy: 0, metal: 0, color: '#2d4a3e' },
  FOREST: { name: 'Forest', moveCost: 2, defense: 2, energy: 0, metal: 0, color: '#1e3a2e' },
  MOUNTAIN: { name: 'Mountain', moveCost: 3, defense: 3, energy: 0, metal: 2, color: '#3a3a3a' },
  HILLS: { name: 'Hills', moveCost: 2, defense: 1, energy: 0, metal: 1, color: '#3d4a2d' },
  WATER: { name: 'Water', moveCost: 99, defense: 0, energy: 0, metal: 0, color: '#1a3a5c', impassable: true },
  FACTORY: { name: 'Factory', moveCost: 1, defense: 1, energy: 3, metal: 1, color: '#2a2a3a' },
  REACTOR: { name: 'Reactor', moveCost: 1, defense: 0, energy: 5, metal: 0, color: '#3a1a1a' },
  MINE: { name: 'Mine', moveCost: 1, defense: 1, energy: 0, metal: 4, color: '#2a2a1a' },
  BASE: { name: 'Command Base', moveCost: 1, defense: 2, energy: 2, metal: 1, color: '#1a1a3a' },
};

const UNIT_TYPES = {
  SCOUT: {
    name: 'Scout',
    icon: '🔍',
    cost: { energy: 3, metal: 1 },
    hp: 30,
    maxHp: 30,
    attack: 8,
    range: 1,
    move: 4,
    sight: 4,
    abilities: ['capture', 'scout'],
    description: 'Fast reconnaissance unit. Can capture structures.',
  },
  SOLDIER: {
    name: 'Soldier',
    icon: '🛡️',
    cost: { energy: 5, metal: 2 },
    hp: 60,
    maxHp: 60,
    attack: 18,
    range: 1,
    move: 2,
    sight: 2,
    abilities: ['capture', 'fortify'],
    description: 'Standard infantry. Good defense, can fortify.',
  },
  TANK: {
    name: 'Tank',
    icon: '🚀',
    cost: { energy: 8, metal: 5 },
    hp: 100,
    maxHp: 100,
    attack: 30,
    range: 1,
    move: 3,
    sight: 2,
    abilities: ['crush'],
    description: 'Heavy armor. High damage, can crush weaker units.',
  },
  ARTILLERY: {
    name: 'Artillery',
    icon: '💥',
    cost: { energy: 10, metal: 4 },
    hp: 40,
    maxHp: 40,
    attack: 25,
    range: 3,
    move: 2,
    sight: 3,
    abilities: ['bombard'],
    description: 'Long-range siege unit. Attacks from distance.',
  },
  DRONE: {
    name: 'Drone',
    icon: '🚁',
    cost: { energy: 6, metal: 3 },
    hp: 35,
    maxHp: 35,
    attack: 12,
    range: 2,
    move: 5,
    sight: 5,
    abilities: ['fly', 'strike'],
    description: 'Flying unit. Ignores terrain, strikes and retreats.',
  },
  ENGINEER: {
    name: 'Engineer',
    icon: '🔧',
    cost: { energy: 4, metal: 2 },
    hp: 40,
    maxHp: 40,
    attack: 5,
    range: 1,
    move: 2,
    sight: 2,
    abilities: ['build', 'repair', 'capture'],
    description: 'Support unit. Builds structures, repairs units.',
  },
};

const DIFFICULTY_SETTINGS = {
  easy: { depth: 2, thinkTime: 100, aggression: 0.6, expansion: 0.5, tactical: 0.4 },
  normal: { depth: 3, thinkTime: 300, aggression: 0.8, expansion: 0.7, tactical: 0.6 },
  hard: { depth: 4, thinkTime: 600, aggression: 1.0, expansion: 0.9, tactical: 0.8 },
  expert: { depth: 5, thinkTime: 1000, aggression: 1.2, expansion: 1.0, tactical: 1.0 },
};

const SCENARIOS = [
  {
    id: 'tutorial',
    name: 'First Contact',
    description: 'Learn the basics of Hex Dominion. Capture the enemy base to win.',
    difficulty: 'easy',
    mapWidth: 12,
    mapHeight: 10,
    playerStart: { q: 1, r: 1 },
    enemyStart: { q: 10, r: 8 },
    playerUnits: [
      { type: 'SOLDIER', q: 1, r: 1 },
      { type: 'SCOUT', q: 2, r: 1 },
      { type: 'ENGINEER', q: 1, r: 2 },
    ],
    enemyUnits: [
      { type: 'SOLDIER', q: 10, r: 8 },
      { type: 'SCOUT', q: 9, r: 8 },
    ],
    playerStructures: [{ type: 'BASE', q: 1, r: 1 }],
    enemyStructures: [{ type: 'BASE', q: 10, r: 8 }],
    objectives: [
      'Capture the enemy Command Base',
      'Build a Factory to increase production',
    ],
    winCondition: 'capture_base',
    tutorial: true,
  },
  {
    id: 'scenario1',
    name: 'Iron Valley',
    description: 'A resource-rich valley. Control the mines and outproduce your opponent.',
    difficulty: 'normal',
    mapWidth: 16,
    mapHeight: 12,
    playerStart: { q: 2, r: 2 },
    enemyStart: { q: 13, r: 9 },
    playerUnits: [
      { type: 'SOLDIER', q: 2, r: 2 },
      { type: 'SOLDIER', q: 3, r: 2 },
      { type: 'SCOUT', q: 2, r: 3 },
      { type: 'ENGINEER', q: 3, r: 3 },
    ],
    enemyUnits: [
      { type: 'SOLDIER', q: 13, r: 9 },
      { type: 'SOLDIER', q: 12, r: 9 },
      { type: 'SCOUT', q: 13, r: 10 },
      { type: 'TANK', q: 12, r: 10 },
    ],
    playerStructures: [{ type: 'BASE', q: 2, r: 2 }, { type: 'FACTORY', q: 3, r: 2 }],
    enemyStructures: [{ type: 'BASE', q: 13, r: 9 }, { type: 'FACTORY', q: 12, r: 9 }],
    objectives: [
      'Capture and hold 3 Mines',
      'Destroy all enemy units',
    ],
    winCondition: 'dominate',
    mines: [
      { q: 8, r: 4 }, { q: 8, r: 6 }, { q: 9, r: 5 },
      { q: 7, r: 7 }, { q: 10, r: 4 },
    ],
  },
  {
    id: 'scenario2',
    name: 'Island Hopping',
    description: 'Archipelago warfare. Naval superiority is key - but you have no navy. Use air units.',
    difficulty: 'hard',
    mapWidth: 18,
    mapHeight: 14,
    playerStart: { q: 2, r: 6 },
    enemyStart: { q: 15, r: 7 },
    playerUnits: [
      { type: 'DRONE', q: 2, r: 6 },
      { type: 'DRONE', q: 3, r: 5 },
      { type: 'ARTILLERY', q: 2, r: 7 },
      { type: 'ENGINEER', q: 3, r: 6 },
    ],
    enemyUnits: [
      { type: 'DRONE', q: 15, r: 7 },
      { type: 'DRONE', q: 14, r: 8 },
      { type: 'TANK', q: 15, r: 8 },
      { type: 'ARTILLERY', q: 14, r: 7 },
    ],
    playerStructures: [{ type: 'BASE', q: 2, r: 6 }, { type: 'REACTOR', q: 3, r: 6 }],
    enemyStructures: [{ type: 'BASE', q: 15, r: 7 }, { type: 'REACTOR', q: 14, r: 7 }],
    objectives: [
      'Secure the central island Reactors',
      'Eliminate enemy air superiority',
    ],
    winCondition: 'capture_base',
    waterLevel: 0.4,
  },
  {
    id: 'scenario3',
    name: 'Mountain Pass',
    description: 'Choke points and high ground. Artillery dominates, but supply lines are fragile.',
    difficulty: 'expert',
    mapWidth: 14,
    mapHeight: 14,
    playerStart: { q: 1, r: 6 },
    enemyStart: { q: 12, r: 7 },
    playerUnits: [
      { type: 'ARTILLERY', q: 1, r: 6 },
      { type: 'ARTILLERY', q: 2, r: 5 },
      { type: 'SOLDIER', q: 1, r: 7 },
      { type: 'SOLDIER', q: 2, r: 6 },
      { type: 'ENGINEER', q: 2, r: 7 },
    ],
    enemyUnits: [
      { type: 'ARTILLERY', q: 12, r: 7 },
      { type: 'ARTILLERY', q: 11, r: 8 },
      { type: 'TANK', q: 12, r: 8 },
      { type: 'SOLDIER', q: 11, r: 7 },
      { type: 'ENGINEER', q: 12, r: 6 },
    ],
    playerStructures: [{ type: 'BASE', q: 1, r: 6 }, { type: 'MINE', q: 2, r: 5 }],
    enemyStructures: [{ type: 'BASE', q: 12, r: 7 }, { type: 'MINE', q: 11, r: 8 }],
    objectives: [
      'Break through the mountain pass',
      'Capture enemy Base',
    ],
    winCondition: 'capture_base',
    mountainRange: true,
  },
];

const BUILDABLE_STRUCTURES = [
  { type: 'FACTORY', name: 'Factory', cost: { energy: 15, metal: 10 }, requires: 'BASE', produces: ['SOLDIER', 'TANK', 'ENGINEER'] },
  { type: 'REACTOR', name: 'Reactor', cost: { energy: 10, metal: 5 }, produces: [] },
  { type: 'MINE', name: 'Mine', cost: { energy: 12, metal: 8 }, requires: 'HILLS', produces: [] },
];

const BUILDABLE_UNITS = [
  { type: 'SCOUT', name: 'Scout' },
  { type: 'SOLDIER', name: 'Soldier' },
  { type: 'TANK', name: 'Tank' },
  { type: 'ARTILLERY', name: 'Artillery' },
  { type: 'DRONE', name: 'Drone' },
  { type: 'ENGINEER', name: 'Engineer' },
];

// ============================================================================
// HEX GRID UTILITIES
// ============================================================================

class Hex {
  constructor(q, r) {
    this.q = q;
    this.r = r;
    this.s = -q - r;
  }

  static fromCube(x, y, z) {
    return new Hex(x, z);
  }

  toCube() {
    return { x: this.q, y: this.r, z: this.s };
  }

  add(other) {
    return new Hex(this.q + other.q, this.r + other.r);
  }

  subtract(other) {
    return new Hex(this.q - other.q, this.r - other.r);
  }

  scale(k) {
    return new Hex(this.q * k, this.r * k);
  }

  rotateLeft() {
    return new Hex(-this.s, -this.q);
  }

  rotateRight() {
    return new Hex(-this.r, -this.s);
  }

  equals(other) {
    return this.q === other.q && this.r === other.r;
  }

  distance(other) {
    const dq = Math.abs(this.q - other.q);
    const dr = Math.abs(this.r - other.r);
    const ds = Math.abs(this.s - other.s);
    return Math.max(dq, dr, ds);
  }

  neighbors() {
    const dirs = [
      new Hex(1, 0), new Hex(1, -1), new Hex(0, -1),
      new Hex(-1, 0), new Hex(-1, 1), new Hex(0, 1)
    ];
    return dirs.map(dir => this.add(dir));
  }

  neighbor(dir) {
    const dirs = [
      new Hex(1, 0), new Hex(1, -1), new Hex(0, -1),
      new Hex(-1, 0), new Hex(-1, 1), new Hex(0, 1)
    ];
    return this.add(dirs[dir]);
  }

  ring(radius) {
    if (radius === 0) return [this];
    const results = [];
    let hex = this.add(new Hex(0, -radius));
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < radius; j++) {
        results.push(hex);
        hex = hex.neighbor(i);
      }
    }
    return results;
  }

  spiral(radius) {
    const results = [this];
    for (let r = 1; r <= radius; r++) {
      results.push(...this.ring(r));
    }
    return results;
  }

  toString() {
    return `(${this.q},${this.r})`;
  }

  hash() {
    return `${this.q},${this.r}`;
  }

  static fromHash(hash) {
    const [q, r] = hash.split(',').map(Number);
    return new Hex(q, r);
  }
}

const HEX_DIRECTIONS = [
  new Hex(1, 0), new Hex(1, -1), new Hex(0, -1),
  new Hex(-1, 0), new Hex(-1, 1), new Hex(0, 1)
];

// ============================================================================
// GAME STATE CLASSES
// ============================================================================

class Unit {
  constructor(data) {
    this.id = data.id || crypto.randomUUID();
    this.type = data.type;
    const template = UNIT_TYPES[data.type];
    this.name = template.name;
    this.icon = template.icon;
    this.owner = data.owner;
    this.q = data.q;
    this.r = data.r;
    this.hp = data.hp ?? template.maxHp;
    this.maxHp = template.maxHp;
    this.attack = template.attack;
    this.range = template.range;
    this.move = template.move;
    this.maxMove = template.move;
    this.sight = template.sight;
    this.abilities = [...template.abilities];
    this.hasMoved = false;
    this.hasAttacked = false;
    this.fortified = false;
    this.carrying = null;
    this.level = 1;
    this.experience = 0;
  }

  getTemplate() {
    return UNIT_TYPES[this.type];
  }

  canMove() {
    return !this.hasMoved && this.move > 0 && this.hp > 0;
  }

  canAttack() {
    return !this.hasAttacked && this.hp > 0;
  }

  isAlive() {
    return this.hp > 0;
  }

  getDefense() {
    let defense = this.fortified ? 2 : 0;
    const terrain = gameState.map.getTerrain(this.q, this.r);
    if (terrain) defense += terrain.defense;
    return defense;
  }

  getEffectiveAttack(target) {
    let atk = this.attack;
    if (this.type === 'TANK' && target.type === 'SOLDIER') atk *= 1.5;
    if (this.type === 'ARTILLERY' && target.type === 'TANK') atk *= 1.3;
    if (this.fortified) atk *= 0.5;
    return Math.round(atk);
  }

  getMoveCost(targetQ, targetR) {
    const terrain = gameState.map.getTerrain(targetQ, targetR);
    if (!terrain || terrain.impassable) return 99;
    if (this.abilities.includes('fly')) return 1;
    return terrain.moveCost;
  }

  clone() {
    const cloned = new Unit({
      id: this.id,
      type: this.type,
      owner: this.owner,
      q: this.q,
      r: this.r,
      hp: this.hp,
    });
    cloned.hasMoved = this.hasMoved;
    cloned.hasAttacked = this.hasAttacked;
    cloned.fortified = this.fortified;
    cloned.level = this.level;
    cloned.experience = this.experience;
    return cloned;
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      owner: this.owner,
      q: this.q,
      r: this.r,
      hp: this.hp,
      maxHp: this.maxHp,
      hasMoved: this.hasMoved,
      hasAttacked: this.hasAttacked,
      fortified: this.fortified,
      level: this.level,
      experience: this.experience,
    };
  }

  static deserialize(data) {
    const unit = new Unit({ type: data.type, owner: data.owner, q: data.q, r: data.r, hp: data.hp });
    unit.id = data.id;
    unit.maxHp = data.maxHp;
    unit.hasMoved = data.hasMoved;
    unit.hasAttacked = data.hasAttacked;
    unit.fortified = data.fortified;
    unit.level = data.level;
    unit.experience = data.experience;
    return unit;
  }
}

class Structure {
  constructor(data) {
    this.id = data.id || crypto.randomUUID();
    this.type = data.type;
    const template = TERRAIN_TYPES[data.type];
    this.name = template.name;
    this.owner = data.owner;
    this.q = data.q;
    this.r = data.r;
    this.hp = data.hp ?? 100;
    this.maxHp = 100;
    this.captureProgress = 0;
    this.productionQueue = [];
    this.productionProgress = 0;
  }

  getTemplate() {
    return TERRAIN_TYPES[this.type];
  }

  getProduction() {
    const template = this.getTemplate();
    return { energy: template.energy, metal: template.metal };
  }

  canProduce(unitType) {
    const buildable = BUILDABLE_STRUCTURES.find(s => s.type === this.type);
    return buildable && buildable.produces.includes(unitType);
  }

  clone() {
    const cloned = new Structure({ type: this.type, owner: this.owner, q: this.q, r: this.r, hp: this.hp });
    cloned.productionQueue = [...this.productionQueue];
    cloned.productionProgress = this.productionProgress;
    cloned.captureProgress = this.captureProgress;
    return cloned;
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      owner: this.owner,
      q: this.q,
      r: this.r,
      hp: this.hp,
      captureProgress: this.captureProgress,
      productionQueue: this.productionQueue,
      productionProgress: this.productionProgress,
    };
  }

  static deserialize(data) {
    const struct = new Structure({ type: data.type, owner: data.owner, q: data.q, r: data.r, hp: data.hp });
    struct.id = data.id;
    struct.captureProgress = data.captureProgress;
    struct.productionQueue = data.productionQueue;
    struct.productionProgress = data.productionProgress;
    return struct;
  }
}

class Terrain {
  constructor(q, r, type = 'PLAINS') {
    this.q = q;
    this.r = r;
    this.type = type;
    this.template = TERRAIN_TYPES[type];
    this.owner = NEUTRAL;
    this.visibility = { [PLAYER]: 0, [ENEMY]: 0 };
    this.structure = null;
  }

  getMoveCost(unit) {
    if (this.template.impassable) return 99;
    if (unit && unit.abilities.includes('fly')) return 1;
    return this.template.moveCost;
  }

  getDefenseBonus() {
    return this.template.defense;
  }

  getProduction() {
    if (this.structure) return this.structure.getProduction();
    return { energy: this.template.energy, metal: this.template.metal };
  }

  clone() {
    const cloned = new Terrain(this.q, this.r, this.type);
    cloned.owner = this.owner;
    cloned.visibility = { ...this.visibility };
    if (this.structure) cloned.structure = this.structure.clone();
    return cloned;
  }
}

class Map {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tiles = new Map();
    this.generate(width, height);
  }

  generate(width, height, options = {}) {
    this.tiles.clear();
    for (let q = 0; q < width; q++) {
      for (let r = 0; r < height; r++) {
        // Skip invalid hex coordinates for rectangular maps
        if (q + r < 0 || q + r >= width + height - 1) continue;
        let type = 'PLAINS';
        const rand = Math.random();
        if (options.waterLevel && rand < options.waterLevel) type = 'WATER';
        else if (options.mountainRange && (q === 6 || q === 7) && r >= 2 && r <= 11) type = 'MOUNTAIN';
        else if (rand < 0.15) type = 'FOREST';
        else if (rand < 0.25) type = 'HILLS';
        else if (rand < 0.3) type = 'MOUNTAIN';
        this.tiles.set(`${q},${r}`, new Terrain(q, r, type));
      }
    }
    // Ensure starting positions are plains
    if (options.playerStart) this.setTerrain(options.playerStart.q, options.playerStart.r, 'PLAINS');
    if (options.enemyStart) this.setTerrain(options.enemyStart.q, options.enemyStart.r, 'PLAINS');
    // Place mines
    if (options.mines) {
      options.mines.forEach(m => this.setTerrain(m.q, m.r, 'HILLS'));
    }
  }

  getTerrain(q, r) {
    return this.tiles.get(`${q},${r}`);
  }

  setTerrain(q, r, type) {
    const tile = this.tiles.get(`${q},${r}`);
    if (tile) tile.type = type;
  }

  getTile(q, r) {
    return this.tiles.get(`${q},${r}`);
  }

  hasTile(q, r) {
    return this.tiles.has(`${q},${r}`);
  }

  getAllTiles() {
    return Array.from(this.tiles.values());
  }

  getNeighbors(q, r) {
    const hex = new Hex(q, r);
    return hex.neighbors().map(n => this.getTile(n.q, n.r)).filter(Boolean);
  }

  getTilesInRange(q, r, range) {
    const center = new Hex(q, r);
    return center.spiral(range).map(h => this.getTile(h.q, h.r)).filter(Boolean);
  }

  findPath(startQ, startR, endQ, endR, unit) {
    const start = new Hex(startQ, startR);
    const goal = new Hex(endQ, endR);
    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(start.hash(), 0);
    fScore.set(start.hash(), start.distance(goal));

    while (openSet.length > 0) {
      openSet.sort((a, b) => (fScore.get(a.hash()) || Infinity) - (fScore.get(b.hash()) || Infinity));
      const current = openSet.shift();

      if (current.equals(goal)) {
        const path = [current];
        let curr = current;
        while (cameFrom.has(curr.hash())) {
          curr = cameFrom.get(curr.hash());
          path.unshift(curr);
        }
        return path;
      }

      for (const neighbor of current.neighbors()) {
        const tile = this.getTile(neighbor.q, neighbor.r);
        if (!tile || tile.template.impassable) continue;
        if (unit && !unit.abilities.includes('fly') && tile.template.impassable) continue;

        const moveCost = unit ? unit.getMoveCost(neighbor.q, neighbor.r) : tile.template.moveCost;
        if (moveCost >= 99) continue;

        const tentativeG = (gScore.get(current.hash()) || 0) + moveCost;
        const nHash = neighbor.hash();
        if (tentativeG < (gScore.get(nHash) || Infinity)) {
          cameFrom.set(nHash, current);
          gScore.set(nHash, tentativeG);
          fScore.set(nHash, tentativeG + neighbor.distance(goal));
          if (!openSet.some(h => h.equals(neighbor))) openSet.push(neighbor);
        }
      }
    }
    return null;
  }

  getReachableTiles(q, r, movePoints, unit) {
    const start = new Hex(q, r);
    const reachable = new Map();
    const queue = [{ hex: start, cost: 0 }];
    reachable.set(start.hash(), 0);

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const { hex, cost } = queue.shift();

      if (cost > movePoints) continue;

      for (const neighbor of hex.neighbors()) {
        const tile = this.getTile(neighbor.q, neighbor.r);
        if (!tile) continue;
        const moveCost = unit.getMoveCost(neighbor.q, neighbor.r);
        if (moveCost >= 99) continue;
        const newCost = cost + moveCost;
        const nHash = neighbor.hash();
        if (newCost <= movePoints && newCost < (reachable.get(nHash) || Infinity)) {
          reachable.set(nHash, newCost);
          queue.push({ hex: neighbor, cost: newCost });
        }
      }
    }
    return reachable;
  }

  getAttackableTiles(q, r, range, unit) {
    const center = new Hex(q, r);
    return center.spiral(range).map(h => this.getTile(h.q, h.r)).filter(t => t !== undefined);
  }

  clone() {
    const cloned = new Map(this.width, this.height);
    cloned.tiles.clear();
    this.tiles.forEach((tile, key) => {
      cloned.tiles.set(key, tile.clone());
    });
    return cloned;
  }

  serialize() {
    const data = { width: this.width, height: this.height, tiles: [] };
    this.tiles.forEach(tile => {
      data.tiles.push({
        q: tile.q,
        r: tile.r,
        type: tile.type,
        owner: tile.owner,
        visibility: tile.visibility,
        structure: tile.structure ? tile.structure.serialize() : null,
      });
    });
    return data;
  }

  static deserialize(data) {
    const map = new Map(data.width, data.height);
    map.tiles.clear();
    data.tiles.forEach(t => {
      const tile = new Terrain(t.q, t.r, t.type);
      tile.owner = t.owner;
      tile.visibility = t.visibility;
      if (t.structure) tile.structure = Structure.deserialize(t.structure);
      map.tiles.set(`${t.q},${t.r}`, tile);
    });
    return map;
  }
}

// ============================================================================
// GAME STATE
// ============================================================================

class GameState {
  constructor() {
    this.map = null;
    this.units = [];
    this.currentPlayer = PLAYER;
    this.turn = 1;
    this.phase = 'playing'; // playing, paused, gameover
    this.winner = null;
    this.resources = {
      [PLAYER]: { energy: 10, metal: 5 },
      [ENEMY]: { energy: 10, metal: 5 },
    };
    this.income = { [PLAYER]: { energy: 0, metal: 0 }, [ENEMY]: { energy: 0, metal: 0 } };
    this.selectedUnit = null;
    this.actionMode = null; // move, attack, capture, build
    this.validTargets = [];
    this.movePath = null;
    this.actionHistory = [];
    this.maxHistory = 50;
    this.scenario = null;
    this.difficulty = 'normal';
    this.settings = {
      animQuality: 'medium',
      particles: true,
      reducedMotion: false,
      masterVol: 70,
      musicVol: 50,
      sfxVol: 80,
      aiDifficulty: 'normal',
      movePreview: true,
      autoSave: true,
      confirmAttack: true,
      highContrast: false,
      colorBlind: 'none',
      largeUI: false,
    };
    this.objectives = [];
    this.completedObjectives = new Set();
    this.logEntries = [];
    this.maxLogEntries = 100;
    this.tutorialStep = 0;
    this.inTutorial = false;
    this.gameSpeed = 1;
    this.paused = false;
  }

  addLog(message, type = 'system') {
    this.logEntries.unshift({
      time: this.turn,
      message,
      type,
      timestamp: Date.now(),
    });
    if (this.logEntries.length > this.maxLogEntries) this.logEntries.pop();
  }

  addToHistory() {
    const snapshot = this.serializeForUndo();
    this.actionHistory.push(snapshot);
    if (this.actionHistory.length > this.maxHistory) this.actionHistory.shift();
  }

  serializeForUndo() {
    return {
      units: this.units.map(u => u.serialize()),
      currentPlayer: this.currentPlayer,
      turn: this.turn,
      resources: JSON.parse(JSON.stringify(this.resources)),
      income: JSON.parse(JSON.stringify(this.income)),
      map: this.map.serialize(),
      objectives: [...this.objectives],
      completedObjectives: [...this.completedObjectives],
    };
  }

  restoreFromHistory(snapshot) {
    this.units = snapshot.units.map(u => Unit.deserialize(u));
    this.currentPlayer = snapshot.currentPlayer;
    this.turn = snapshot.turn;
    this.resources = snapshot.resources;
    this.income = snapshot.income;
    this.map = Map.deserialize(snapshot.map);
    this.objectives = snapshot.objectives;
    this.completedObjectives = new Set(snapshot.completedObjectives);
    this.selectedUnit = null;
    this.actionMode = null;
    this.validTargets = [];
    this.movePath = null;
  }

  canUndo() {
    return this.actionHistory.length > 0 && this.currentPlayer === PLAYER && this.phase === 'playing';
  }

  undo() {
    if (!this.canUndo()) return false;
    const snapshot = this.actionHistory.pop();
    this.restoreFromHistory(snapshot);
    this.addLog('Move undone', 'system');
    return true;
  }

  getPlayerUnits(player) {
    return this.units.filter(u => u.owner === player && u.isAlive());
  }

  getPlayerStructures(player) {
    const structs = [];
    this.map.tiles.forEach(tile => {
      if (tile.structure && tile.structure.owner === player) structs.push(tile.structure);
    });
    return structs;
  }

  getUnitAt(q, r) {
    return this.units.find(u => u.q === q && u.r === r && u.isAlive());
  }

  getStructureAt(q, r) {
    const tile = this.map.getTile(q, r);
    return tile?.structure || null;
  }

  calculateIncome() {
    this.income = { [PLAYER]: { energy: 0, metal: 0 }, [ENEMY]: { energy: 0, metal: 0 } };
    [PLAYER, ENEMY].forEach(player => {
      this.map.tiles.forEach(tile => {
        if (tile.owner === player) {
          const prod = tile.getProduction();
          this.income[player].energy += prod.energy;
          this.income[player].metal += prod.metal;
        }
      });
    });
  }

  applyIncome() {
    this.calculateIncome();
    [PLAYER, ENEMY].forEach(player => {
      this.resources[player].energy += this.income[player].energy;
      this.resources[player].metal += this.income[player].metal;
    });
  }

  spendResources(player, cost) {
    this.resources[player].energy -= cost.energy || 0;
    this.resources[player].metal -= cost.metal || 0;
  }

  canAfford(player, cost) {
    return this.resources[player].energy >= (cost.energy || 0) &&
           this.resources[player].metal >= (cost.metal || 0);
  }

  nextTurn() {
    this.addToHistory();
    this.currentPlayer = 1 - this.currentPlayer;
    if (this.currentPlayer === PLAYER) {
      this.turn++;
      this.addLog(`Turn ${this.turn} begins`, 'system');
    }
    this.units.forEach(u => {
      if (u.owner === this.currentPlayer) {
        u.hasMoved = false;
        u.hasAttacked = false;
        u.move = u.maxMove;
      }
    });
    this.applyIncome();
    this.checkObjectives();
    this.checkWinCondition();
    if (this.currentPlayer === ENEMY && this.phase === 'playing') {
      setTimeout(() => aiTakeTurn(), 500);
    }
  }

  checkObjectives() {
    this.objectives.forEach((obj, index) => {
      if (this.completedObjectives.has(index)) return;
      if (obj.check && obj.check(this)) {
        this.completedObjectives.add(index);
        this.addLog(`Objective completed: ${obj.text}`, 'success');
      }
    });
  }

  checkWinCondition() {
    if (!this.scenario) return;
    const playerUnits = this.getPlayerUnits(PLAYER);
    const enemyUnits = this.getPlayerUnits(ENEMY);
    const playerBases = this.getPlayerStructures(PLAYER).filter(s => s.type === 'BASE');
    const enemyBases = this.getPlayerStructures(ENEMY).filter(s => s.type === 'BASE');

    if (enemyBases.length === 0 && this.scenario.winCondition === 'capture_base') {
      this.endGame(PLAYER);
    } else if (playerBases.length === 0 && this.scenario.winCondition === 'capture_base') {
      this.endGame(ENEMY);
    } else if (enemyUnits.length === 0 && this.scenario.winCondition === 'dominate') {
      this.endGame(PLAYER);
    } else if (playerUnits.length === 0 && this.scenario.winCondition === 'dominate') {
      this.endGame(ENEMY);
    }
  }

  endGame(winner) {
    this.phase = 'gameover';
    this.winner = winner;
    const isVictory = winner === PLAYER;
    this.addLog(isVictory ? 'VICTORY!' : 'DEFEAT', isVictory ? 'success' : 'error');
    showGameOverModal(isVictory);
  }

  serialize() {
    return {
      map: this.map.serialize(),
      units: this.units.map(u => u.serialize()),
      currentPlayer: this.currentPlayer,
      turn: this.turn,
      phase: this.phase,
      winner: this.winner,
      resources: this.resources,
      income: this.income,
      scenario: this.scenario?.id,
      difficulty: this.difficulty,
      settings: this.settings,
      objectives: this.objectives,
      completedObjectives: [...this.completedObjectives],
      logEntries: this.logEntries,
      tutorialStep: this.tutorialStep,
      inTutorial: this.inTutorial,
      actionHistory: this.actionHistory.map(s => ({
        ...s,
        units: s.units.map(u => Unit.deserialize(u).serialize()),
        map: s.map,
      })),
    };
  }

  static deserialize(data) {
    const state = new GameState();
    state.map = Map.deserialize(data.map);
    state.units = data.units.map(u => Unit.deserialize(u));
    state.currentPlayer = data.currentPlayer;
    state.turn = data.turn;
    state.phase = data.phase;
    state.winner = data.winner;
    state.resources = data.resources;
    state.income = data.income;
    state.scenario = SCENARIOS.find(s => s.id === data.scenario);
    state.difficulty = data.difficulty;
    state.settings = data.settings;
    state.objectives = data.objectives;
    state.completedObjectives = new Set(data.completedObjectives);
    state.logEntries = data.logEntries;
    state.tutorialStep = data.tutorialStep;
    state.inTutorial = data.inTutorial;
    state.actionHistory = data.actionHistory.map(s => ({
      ...s,
      units: s.units.map(u => Unit.deserialize(u)),
      map: Map.deserialize(s.map),
    }));
    return state;
  }
}

// ============================================================================
// AI SYSTEM
// ============================================================================

class AI {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty;
    this.settings = DIFFICULTY_SETTINGS[difficulty];
    this.nodesEvaluated = 0;
    this.startTime = 0;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.settings = DIFFICULTY_SETTINGS[difficulty];
  }

  evaluatePosition(state) {
    this.nodesEvaluated++;
    let score = 0;

    // Unit value
    state.units.forEach(unit => {
      const template = UNIT_TYPES[unit.type];
      const value = template.cost.energy * 2 + template.cost.metal * 3 + unit.maxHp / 2;
      if (unit.owner === ENEMY) score += value * (unit.hp / unit.maxHp);
      else score -= value * (unit.hp / unit.maxHp);
    });

    // Structure value
    state.map.tiles.forEach(tile => {
      if (tile.structure) {
        const value = tile.structure.type === 'BASE' ? 500 :
                     tile.structure.type === 'FACTORY' ? 300 :
                     tile.structure.type === 'REACTOR' ? 200 :
                     tile.structure.type === 'MINE' ? 250 : 100;
        if (tile.structure.owner === ENEMY) score += value;
        else score -= value;
      }
    });

    // Territory control
    let playerTerritory = 0, enemyTerritory = 0;
    state.map.tiles.forEach(tile => {
      if (tile.owner === PLAYER) playerTerritory++;
      else if (tile.owner === ENEMY) enemyTerritory++;
    });
    score += (enemyTerritory - playerTerritory) * 10;

    // Resource income
    score += (state.income[ENEMY].energy - state.income[PLAYER].energy) * 5;
    score += (state.income[ENEMY].metal - state.income[PLAYER].metal) * 8;

    // Resource stockpiles
    score += (state.resources[ENEMY].energy - state.resources[PLAYER].energy) * 0.5;
    score += (state.resources[ENEMY].metal - state.resources[PLAYER].metal) * 0.8;

    // Strategic positioning - units near enemy base
    const enemyBases = state.getPlayerStructures(PLAYER).filter(s => s.type === 'BASE');
    const playerBases = state.getPlayerStructures(ENEMY).filter(s => s.type === 'BASE');
    state.getPlayerUnits(ENEMY).forEach(unit => {
      enemyBases.forEach(base => {
        const dist = new Hex(unit.q, unit.r).distance(new Hex(base.q, base.r));
        score += Math.max(0, 20 - dist * 2);
      });
    });

    return score;
  }

  getPossibleActions(state, unit) {
    const actions = [];

    // Move actions
    if (unit.canMove()) {
      const reachable = state.map.getReachableTiles(unit.q, unit.r, unit.move, unit);
      reachable.forEach((cost, hash) => {
        const hex = Hex.fromHash(hash);
        if (hex.equals(new Hex(unit.q, unit.r))) return;
        const targetUnit = state.getUnitAt(hex.q, hex.r);
        const targetStruct = state.getStructureAt(hex.q, hex.r);
        if (targetUnit && targetUnit.owner !== unit.owner) return; // Can't move onto enemy
        if (targetStruct && targetStruct.owner !== unit.owner && targetStruct.owner !== NEUTRAL) return;
        actions.push({
          type: 'move',
          unit: unit,
          targetQ: hex.q,
          targetR: hex.r,
          path: state.map.findPath(unit.q, unit.r, hex.q, hex.r, unit),
          cost: cost,
        });
      });
    }

    // Attack actions
    if (unit.canAttack()) {
      const attackable = state.map.getAttackableTiles(unit.q, unit.r, unit.range, unit);
      attackable.forEach(tile => {
        const target = state.getUnitAt(tile.q, tile.r);
        if (target && target.owner !== unit.owner) {
          actions.push({
            type: 'attack',
            unit: unit,
            target: target,
            targetQ: tile.q,
            targetR: tile.r,
          });
        }
      });
    }

    // Capture actions
    if (unit.canMove() && unit.abilities.includes('capture')) {
      const reachable = state.map.getReachableTiles(unit.q, unit.r, unit.move, unit);
      reachable.forEach((cost, hash) => {
        const hex = Hex.fromHash(hash);
        const struct = state.getStructureAt(hex.q, hex.r);
        if (struct && struct.owner !== unit.owner) {
          actions.push({
            type: 'capture',
            unit: unit,
            target: struct,
            targetQ: hex.q,
            targetR: hex.r,
            path: state.map.findPath(unit.q, unit.r, hex.q, hex.r, unit),
          });
        }
      });
    }

    // Build actions (for engineers)
    if (unit.canMove() && unit.abilities.includes('build')) {
      const reachable = state.map.getReachableTiles(unit.q, unit.r, unit.move, unit);
      reachable.forEach((cost, hash) => {
        const hex = Hex.fromHash(hash);
        const tile = state.map.getTile(hex.q, hex.r);
        if (tile && !tile.structure && tile.owner === unit.owner) {
          BUILDABLE_STRUCTURES.forEach(build => {
            if (state.canAfford(unit.owner, build.cost)) {
              if (!build.requires || (tile.type === build.requires)) {
                actions.push({
                  type: 'build',
                  unit: unit,
                  structureType: build.type,
                  targetQ: hex.q,
                  targetR: hex.r,
                  cost: build.cost,
                  path: state.map.findPath(unit.q, unit.r, hex.q, hex.r, unit),
                });
              }
            }
          });
        }
      });
    }

    // Fortify
    if (unit.canMove() && unit.abilities.includes('fortify') && !unit.fortified) {
      actions.push({ type: 'fortify', unit: unit });
    }

    // Repair (engineers)
    if (unit.canMove() && unit.abilities.includes('repair')) {
      const reachable = state.map.getReachableTiles(unit.q, unit.r, unit.move, unit);
      reachable.forEach((cost, hash) => {
        const hex = Hex.fromHash(hash);
        const target = state.getUnitAt(hex.q, hex.r);
        if (target && target.owner === unit.owner && target.hp < target.maxHp) {
          actions.push({
            type: 'repair',
            unit: unit,
            target: target,
            targetQ: hex.q,
            targetR: hex.r,
            path: state.map.findPath(unit.q, unit.r, hex.q, hex.r, unit),
          });
        }
      });
    }

    // Produce from structures
    state.getPlayerStructures(ENEMY).forEach(struct => {
      if (struct.type === 'FACTORY' || struct.type === 'BASE') {
        ['SCOUT', 'SOLDIER', 'TANK', 'ENGINEER'].forEach(unitType => {
          if (struct.canProduce(unitType)) {
            const template = UNIT_TYPES[unitType];
            if (state.canAfford(ENEMY, template.cost)) {
              // Find spawn spot
              const spawns = state.map.getNeighbors(struct.q, struct.r).filter(t =>
                t && !state.getUnitAt(t.q, t.r) && !t.template.impassable
              );
              if (spawns.length > 0) {
                actions.push({
                  type: 'produce',
                  structure: struct,
                  unitType: unitType,
                  cost: template.cost,
                  spawnQ: spawns[0].q,
                  spawnR: spawns[0].r,
                });
              }
            }
          }
        });
      }
    });

    return actions;
  }

  getAllActions(state) {
    const allActions = [];
    state.getPlayerUnits(ENEMY).forEach(unit => {
      allActions.push(...this.getPossibleActions(state, unit));
    });
    return allActions;
  }

  simulateAction(state, action) {
    const newState = this.cloneState(state);
    const unit = newState.units.find(u => u.id === action.unit.id);
    if (!unit) return newState;

    switch (action.type) {
      case 'move':
        if (action.path) {
          unit.q = action.targetQ;
          unit.r = action.targetR;
          unit.hasMoved = true;
          unit.move -= action.cost;
        }
        break;
      case 'attack':
        const target = newState.units.find(u => u.id === action.target.id);
        if (target) {
          const damage = Math.max(1, unit.getEffectiveAttack(target) - target.getDefense());
          target.hp = Math.max(0, target.hp - damage);
          unit.hasAttacked = true;
          if (target.hp <= 0) {
            // Unit destroyed
          }
        }
        break;
      case 'capture':
        unit.q = action.targetQ;
        unit.r = action.targetR;
        unit.hasMoved = true;
        const struct = newState.map.getTile(action.targetQ, action.targetR)?.structure;
        if (struct) {
          struct.captureProgress += 25;
          if (struct.captureProgress >= 100) {
            struct.owner = ENEMY;
            struct.captureProgress = 0;
            newState.map.getTile(action.targetQ, action.targetR).owner = ENEMY;
          }
        }
        break;
      case 'build':
        unit.q = action.targetQ;
        unit.r = action.targetR;
        unit.hasMoved = true;
        newState.spendResources(ENEMY, action.cost);
        const newStruct = new Structure({ type: action.structureType, owner: ENEMY, q: action.targetQ, r: action.targetR });
        newState.map.getTile(action.targetQ, action.targetR).structure = newStruct;
        newState.map.getTile(action.targetQ, action.targetR).owner = ENEMY;
        break;
      case 'fortify':
        unit.fortified = true;
        unit.hasMoved = true;
        break;
      case 'repair':
        unit.q = action.targetQ;
        unit.r = action.targetR;
        unit.hasMoved = true;
        const repairTarget = newState.units.find(u => u.id === action.target.id);
        if (repairTarget) {
          repairTarget.hp = Math.min(repairTarget.maxHp, repairTarget.hp + 20);
        }
        break;
      case 'produce':
        newState.spendResources(ENEMY, action.cost);
        const newUnit = new Unit({ type: action.unitType, owner: ENEMY, q: action.spawnQ, r: action.spawnR });
        newState.units.push(newUnit);
        break;
    }
    return newState;
  }

  cloneState(state) {
    const cloned = new GameState();
    cloned.map = state.map.clone();
    cloned.units = state.units.map(u => u.clone());
    cloned.currentPlayer = state.currentPlayer;
    cloned.turn = state.turn;
    cloned.resources = JSON.parse(JSON.stringify(state.resources));
    cloned.income = JSON.parse(JSON.stringify(state.income));
    return cloned;
  }

  minimax(state, depth, alpha, beta, maximizingPlayer) {
    if (depth === 0 || state.phase === 'gameover') {
      return this.evaluatePosition(state);
    }

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      const actions = this.getAllActions(state);
      if (actions.length === 0) return this.evaluatePosition(state);

      // Sort actions by heuristic for better pruning
      actions.sort((a, b) => this.heuristicActionValue(b, state) - this.heuristicActionValue(a, state));

      for (const action of actions) {
        if (Date.now() - this.startTime > this.settings.thinkTime) break;
        const newState = this.simulateAction(state, action);
        const evalScore = this.minimax(newState, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      // Simplified player response evaluation
      const playerActions = this.getPlayerActions(state);
      if (playerActions.length === 0) return this.evaluatePosition(state);

      for (const action of playerActions.slice(0, 10)) { // Limit branching
        const newState = this.simulateAction(state, action);
        const evalScore = this.minimax(newState, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  heuristicActionValue(action, state) {
    let value = 0;
    switch (action.type) {
      case 'attack':
        const target = action.target;
        const damage = Math.max(1, action.unit.getEffectiveAttack(target) - target.getDefense());
        value = damage * 2;
        if (target.hp <= damage) value += 50; // Kill bonus
        break;
      case 'capture':
        value = 40;
        if (action.target.type === 'BASE') value = 100;
        if (action.target.type === 'FACTORY') value = 60;
        break;
      case 'produce':
        value = 30;
        break;
      case 'build':
        value = 35;
        break;
      case 'move':
        // Value moves toward objectives
        const enemyBases = state.getPlayerStructures(PLAYER).filter(s => s.type === 'BASE');
        if (enemyBases.length > 0) {
          const distBefore = new Hex(action.unit.q, action.unit.r).distance(new Hex(enemyBases[0].q, enemyBases[0].r));
          const distAfter = new Hex(action.targetQ, action.targetR).distance(new Hex(enemyBases[0].q, enemyBases[0].r));
          value = (distBefore - distAfter) * 5;
        }
        break;
    }
    return value;
  }

  getPlayerActions(state) {
    const actions = [];
    state.getPlayerUnits(PLAYER).forEach(unit => {
      actions.push(...this.getPossibleActions(state, unit));
    });
    return actions;
  }

  findBestAction(state) {
    this.nodesEvaluated = 0;
    this.startTime = Date.now();
    const actions = this.getAllActions(state);
    if (actions.length === 0) return null;

    let bestAction = null;
    let bestScore = -Infinity;

    // Use MCTS for higher difficulties
    if (this.difficulty === 'expert' || this.difficulty === 'hard') {
      return this.mctsSearch(state, actions);
    }

    // Minimax for normal and below
    actions.sort((a, b) => this.heuristicActionValue(b, state) - this.heuristicActionValue(a, state));

    for (const action of actions) {
      if (Date.now() - this.startTime > this.settings.thinkTime) break;
      const newState = this.simulateAction(state, action);
      const score = this.minimax(newState, this.settings.depth - 1, -Infinity, Infinity, false);
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    // Fallback to heuristic if no time for search
    if (!bestAction) {
      bestAction = actions.reduce((best, a) => {
        const val = this.heuristicActionValue(a, state);
        return val > this.heuristicActionValue(best, state) ? a : best;
      }, actions[0]);
    }

    return bestAction;
  }

  mctsSearch(state, actions, iterations = 200) {
    const root = new MCTSNode(null, null, state);
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      if (Date.now() - startTime > this.settings.thinkTime) break;
      const node = this.select(root);
      const reward = this.simulate(node.state);
      this.backpropagate(node, reward);
    }

    let bestChild = null;
    let bestVisits = -1;
    root.children.forEach(child => {
      if (child.visits > bestVisits) {
        bestVisits = child.visits;
        bestChild = child;
      }
    });

    return bestChild?.action || actions[0];
  }

  select(node) {
    while (node.children.length > 0) {
      let bestChild = null;
      let bestScore = -Infinity;
      node.children.forEach(child => {
        const ucb1 = child.wins / child.visits + Math.sqrt(2 * Math.log(node.visits) / child.visits);
        if (ucb1 > bestScore) {
          bestScore = ucb1;
          bestChild = child;
        }
      });
      if (!bestChild) break;
      node = bestChild;
    }
    if (node.state.phase !== 'gameover' && node.untriedActions.length > 0) {
      return this.expand(node);
    }
    return node;
  }

  expand(node) {
    const action = node.untriedActions.pop();
    const newState = this.simulateAction(node.state, action);
    const child = new MCTSNode(node, action, newState);
    node.children.push(child);
    return child;
  }

  simulate(state) {
    const simState = this.cloneState(state);
    let currentPlayer = ENEMY;
    let turns = 0;

    while (simState.phase === 'playing' && turns < 10) {
      const units = simState.getPlayerUnits(currentPlayer);
      if (units.length === 0) break;

      const allActions = [];
      units.forEach(u => allActions.push(...this.getPossibleActions(simState, u)));
      if (allActions.length === 0) {
        currentPlayer = 1 - currentPlayer;
        turns++;
        continue;
      }

      // Random playout with light heuristic
      allActions.sort((a, b) => Math.random() - 0.5);
      const action = allActions[0];
      this.simulateAction(simState, action);
      currentPlayer = 1 - currentPlayer;
      turns++;
    }

    return this.evaluatePosition(simState);
  }

  backpropagate(node, reward) {
    while (node) {
      node.visits++;
      node.wins += reward;
      node = node.parent;
    }
  }
}

class MCTSNode {
  constructor(parent, action, state) {
    this.parent = parent;
    this.action = action;
    this.state = state;
    this.children = [];
    this.wins = 0;
    this.visits = 0;
    this.untriedActions = new AI().getAllActions(state);
  }
}

// ============================================================================
// RENDERING SYSTEM
// ============================================================================

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hexSize = 36;
    this.originX = 0;
    this.originY = 0;
    this.scale = 1;
    this.targetScale = 1;
    this.targetOriginX = 0;
    this.targetOriginY = 0;
    this.animationTime = 0;
    this.particles = [];
    this.combatAnimations = [];
    this.moveAnimations = [];
    this.hoveredHex = null;
    this.selectedHex = null;
    this.validMoveHexes = new Set();
    this.validAttackHexes = new Set();
    this.validCaptureHexes = new Set();
    this.pathPreview = [];
    this.lastFrameTime = 0;
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
    this.logicalWidth = rect.width;
    this.logicalHeight = rect.height;
    this.centerView();
  }

  centerView() {
    if (!gameState.map) return;
    const mapWidth = gameState.map.width * this.hexSize * 1.5;
    const mapHeight = gameState.map.height * this.hexSize * 1.73;
    this.targetOriginX = (this.logicalWidth - mapWidth) / 2;
    this.targetOriginY = (this.logicalHeight - mapHeight) / 2;
    this.originX = this.targetOriginX;
    this.originY = this.targetOriginY;
  }

  hexToPixel(q, r) {
    const x = this.hexSize * 1.5 * q;
    const y = this.hexSize * Math.sqrt(3) * (r + q / 2);
    return { x: x + this.originX, y: y + this.originY };
  }

  pixelToHex(x, y) {
    x -= this.originX;
    y -= this.originY;
    const q = (2/3 * x) / this.hexSize;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / this.hexSize;
    return this.hexRound(q, r);
  }

  hexRound(q, r) {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(s);
    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return new Hex(rq, rr);
  }

  getHexCorners(centerX, centerY) {
    const corners = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      corners.push({
        x: centerX + this.hexSize * Math.cos(angle),
        y: centerY + this.hexSize * Math.sin(angle),
      });
    }
    return corners;
  }

  drawHex(q, r, fillColor, strokeColor, lineWidth = 1) {
    const pos = this.hexToPixel(q, r);
    const corners = this.getHexCorners(pos.x, pos.y);
    this.ctx.beginPath();
    this.ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      this.ctx.lineTo(corners[i].x, corners[i].y);
    }
    this.ctx.closePath();
    if (fillColor) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
    }
    if (strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = lineWidth;
      this.ctx.stroke();
    }
  }

  drawTerrain(tile) {
    const pos = this.hexToPixel(tile.q, tile.r);
    const corners = this.getHexCorners(pos.x, pos.y);

    // Base terrain
    this.ctx.beginPath();
    this.ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) this.ctx.lineTo(corners[i].x, corners[i].y);
    this.ctx.closePath();

    // Terrain gradient
    const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, this.hexSize);
    const baseColor = tile.template.color;
    gradient.addColorStop(0, this.lightenColor(baseColor, 20));
    gradient.addColorStop(1, this.darkenColor(baseColor, 10));
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Terrain details
    this.drawTerrainDetails(tile, pos);

    // Owner border
    if (tile.owner !== NEUTRAL) {
      this.ctx.strokeStyle = tile.owner === PLAYER ? '#00d4aa' : '#ff6b6b';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    // Fog of war
    const vis = tile.visibility[gameState.currentPlayer] || 0;
    if (vis === 0) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fill();
    } else if (vis === 1) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      this.ctx.fill();
    }
  }

  drawTerrainDetails(tile, pos) {
    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);

    switch (tile.type) {
      case 'FOREST':
        for (let i = 0; i < 3; i++) {
          const angle = (i * 2.1) + this.animationTime * 0.1;
          const x = Math.cos(angle) * this.hexSize * 0.3;
          const y = Math.sin(angle) * this.hexSize * 0.3;
          this.ctx.fillStyle = '#2d5a3e';
          this.ctx.beginPath();
          this.ctx.arc(x, y, this.hexSize * 0.18, 0, Math.PI * 2);
          this.ctx.fill();
        }
        break;
      case 'MOUNTAIN':
        this.ctx.fillStyle = '#4a4a4a';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -this.hexSize * 0.4);
        this.ctx.lineTo(-this.hexSize * 0.35, this.hexSize * 0.1);
        this.ctx.lineTo(this.hexSize * 0.35, this.hexSize * 0.1);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = '#5a5a5a';
        this.ctx.beginPath();
        this.ctx.moveTo(-this.hexSize * 0.15, -this.hexSize * 0.1);
        this.ctx.lineTo(-this.hexSize * 0.3, this.hexSize * 0.2);
        this.ctx.lineTo(0, this.hexSize * 0.05);
        this.ctx.closePath();
        this.ctx.fill();
        break;
      case 'HILLS':
        this.ctx.fillStyle = '#4d5a3d';
        for (let i = 0; i < 2; i++) {
          this.ctx.beginPath();
          this.ctx.arc((i - 0.5) * this.hexSize * 0.3, 0, this.hexSize * 0.15, 0, Math.PI * 2);
          this.ctx.fill();
        }
        break;
      case 'WATER':
        this.ctx.strokeStyle = '#3a6ab8';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          this.ctx.beginPath();
          this.ctx.moveTo(-this.hexSize * 0.4, (i - 1) * this.hexSize * 0.3);
          this.ctx.quadraticCurveTo(0, (i - 1) * this.hexSize * 0.3 - 5, this.hexSize * 0.4, (i - 1) * this.hexSize * 0.3);
          this.ctx.stroke();
        }
        break;
    }

    this.ctx.restore();
  }

  drawStructure(structure) {
    const pos = this.hexToPixel(structure.q, structure.r);
    const tile = gameState.map.getTile(structure.q, structure.r);

    // Structure base
    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);

    const colors = {
      BASE: { primary: '#1a1a3a', secondary: '#00d4aa', accent: '#3498db' },
      FACTORY: { primary: '#2a2a3a', secondary: '#ffaa00', accent: '#ff8800' },
      REACTOR: { primary: '#3a1a1a', secondary: '#ff6b6b', accent: '#ff3333' },
      MINE: { primary: '#2a2a1a', secondary: '#a0b0c0', accent: '#8899aa' },
    };
    const c = colors[structure.type] || colors.BASE;

    // Building shape
    this.ctx.fillStyle = c.primary;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -this.hexSize * 0.5);
    this.ctx.lineTo(this.hexSize * 0.4, -this.hexSize * 0.2);
    this.ctx.lineTo(this.hexSize * 0.4, this.hexSize * 0.3);
    this.ctx.lineTo(-this.hexSize * 0.4, this.hexSize * 0.3);
    this.ctx.lineTo(-this.hexSize * 0.4, -this.hexSize * 0.2);
    this.ctx.closePath();
    this.ctx.fill();

    // Details
    this.ctx.strokeStyle = c.secondary;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Type indicator
    this.ctx.fillStyle = c.accent;
    this.ctx.font = 'bold 14px JetBrains Mono';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const symbols = { BASE: '★', FACTORY: '⚙', REACTOR: '⚡', MINE: '⛏' };
    this.ctx.fillText(symbols[structure.type] || '◆', 0, this.hexSize * 0.05);

    // Owner indicator
    this.ctx.fillStyle = structure.owner === PLAYER ? '#00d4aa' : '#ff6b6b';
    this.ctx.beginPath();
    this.ctx.arc(0, -this.hexSize * 0.55, 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Capture progress
    if (structure.captureProgress > 0 && structure.captureProgress < 100) {
      this.ctx.strokeStyle = '#ffaa00';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.hexSize * 0.45, -Math.PI / 2, -Math.PI / 2 + (structure.captureProgress / 100) * Math.PI * 2);
      this.ctx.stroke();
    }

    // HP bar
    if (structure.hp < structure.maxHp) {
      this.drawHPBar(0, this.hexSize * 0.45, this.hexSize * 0.8, 4, structure.hp / structure.maxHp);
    }

    this.ctx.restore();
  }

  drawUnit(unit) {
    const pos = this.hexToPixel(unit.q, unit.r);
    const isSelected = gameState.selectedUnit?.id === unit.id;
    const isEnemy = unit.owner === ENEMY;

    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);

    // Selection ring
    if (isSelected) {
      this.ctx.strokeStyle = '#00d4aa';
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = '#00d4aa';
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.hexSize * 0.6, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    // Unit base circle
    const gradient = this.ctx.createRadialGradient(-3, -3, 0, 0, 0, this.hexSize * 0.45);
    const baseColor = isEnemy ? '#cc4444' : '#00aa88';
    const lightColor = isEnemy ? '#ff8888' : '#00ffcc';
    gradient.addColorStop(0, lightColor);
    gradient.addColorStop(1, baseColor);
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.hexSize * 0.4, 0, Math.PI * 2);
    this.ctx.fill();

    // Unit icon
    this.ctx.font = `${this.hexSize * 0.5}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(unit.icon, 0, 1);

    // HP bar
    if (unit.hp < unit.maxHp || isSelected) {
      this.drawHPBar(0, this.hexSize * 0.45, this.hexSize * 0.7, 3, unit.hp / unit.maxHp);
    }

    // Status indicators
    if (unit.fortified) {
      this.ctx.fillStyle = '#ffaa00';
      this.ctx.font = '10px Arial';
      this.ctx.fillText('🛡', -this.hexSize * 0.35, -this.hexSize * 0.4);
    }
    if (unit.hasMoved) {
      this.ctx.globalAlpha = 0.5;
    }

    this.ctx.restore();
  }

  drawHPBar(x, y, width, height, ratio) {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(x - width/2, y, width, height);
    const color = ratio > 0.6 ? '#4ade80' : ratio > 0.3 ? '#ffaa00' : '#ff6b6b';
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x - width/2, y, width * ratio, height);
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - width/2, y, width, height);
  }

  drawValidMoves() {
    this.validMoveHexes.forEach(hash => {
      const hex = Hex.fromHash(hash);
      const pos = this.hexToPixel(hex.q, hex.r);
      this.ctx.fillStyle = 'rgba(0, 212, 170, 0.2)';
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.hexSize * 0.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(0, 212, 170, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    });
  }

  drawValidAttacks() {
    this.validAttackHexes.forEach(hash => {
      const hex = Hex.fromHash(hash);
      const pos = this.hexToPixel(hex.q, hex.r);
      this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.hexSize * 0.55, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    });
  }

  drawValidCaptures() {
    this.validCaptureHexes.forEach(hash => {
      const hex = Hex.fromHash(hash);
      const pos = this.hexToPixel(hex.q, hex.r);
      this.ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.hexSize * 0.55, 0, Math.PI * 2);
      this.ctx.stroke();
    });
  }

  drawPathPreview() {
    if (this.pathPreview.length < 2) return;
    this.ctx.strokeStyle = 'rgba(0, 212, 170, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    this.pathPreview.forEach((hex, i) => {
      const pos = this.hexToPixel(hex.q, hex.r);
      if (i === 0) this.ctx.moveTo(pos.x, pos.y);
      else this.ctx.lineTo(pos.x, pos.y);
    });
    this.ctx.stroke();

    // Arrow at end
    const last = this.pathPreview[this.pathPreview.length - 1];
    const prev = this.pathPreview[this.pathPreview.length - 2];
    const lastPos = this.hexToPixel(last.q, last.r);
    const prevPos = this.hexToPixel(prev.q, prev.r);
    const angle = Math.atan2(lastPos.y - prevPos.y, lastPos.x - prevPos.x);
    this.ctx.fillStyle = 'rgba(0, 212, 170, 0.8)';
    this.ctx.beginPath();
    this.ctx.moveTo(lastPos.x + Math.cos(angle) * 10, lastPos.y + Math.sin(angle) * 10);
    this.ctx.lineTo(lastPos.x + Math.cos(angle - 0.5) * 10, lastPos.y + Math.sin(angle - 0.5) * 10);
    this.ctx.lineTo(lastPos.x + Math.cos(angle + 0.5) * 10, lastPos.y + Math.sin(angle + 0.5) * 10);
    this.ctx.fill();
  }

  drawHoveredHex() {
    if (!this.hoveredHex) return;
    const pos = this.hexToPixel(this.hoveredHex.q, this.hoveredHex.r);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    const corners = this.getHexCorners(pos.x, pos.y);
    this.ctx.beginPath();
    this.ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) this.ctx.lineTo(corners[i].x, corners[i].y);
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  drawCombatAnimation(anim) {
    const progress = anim.progress;
    const startPos = this.hexToPixel(anim.fromQ, anim.fromR);
    const endPos = this.hexToPixel(anim.toQ, anim.toR);

    if (anim.type === 'attack') {
      // Projectile
      const x = startPos.x + (endPos.x - startPos.x) * progress;
      const y = startPos.y + (endPos.y - startPos.y) * progress;
      this.ctx.fillStyle = '#ffaa00';
      this.ctx.shadowColor = '#ffaa00';
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4 * (1 - progress * 0.5), 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      // Impact
      if (progress > 0.9) {
        const impactProgress = (progress - 0.9) / 0.1;
        this.ctx.strokeStyle = `rgba(255, 107, 107, ${1 - impactProgress})`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(endPos.x, endPos.y, this.hexSize * 0.3 * (1 + impactProgress), 0, Math.PI * 2);
        this.ctx.stroke();
      }
    } else if (anim.type === 'move') {
      const x = startPos.x + (endPos.x - startPos.x) * progress;
      const y = startPos.y + (endPos.y - startPos.y) * progress;
      // Dust trail
      for (let i = 0; i < 5; i++) {
        const t = progress - i * 0.1;
        if (t > 0 && t < 1) {
          const tx = startPos.x + (endPos.x - startPos.x) * t;
          const ty = startPos.y + (endPos.y - startPos.y) * t;
          this.ctx.fillStyle = `rgba(160, 176, 192, ${t * 0.5})`;
          this.ctx.beginPath();
          this.ctx.arc(tx, ty, 3 * (1 - t), 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }

  drawParticles() {
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  addParticle(x, y, color, size, life) {
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2 - 1,
      color,
      size,
      life,
      maxLife: life,
    });
  }

  addCombatAnimation(type, fromQ, fromR, toQ, toR) {
    this.combatAnimations.push({
      type,
      fromQ, fromR,
      toQ, toR,
      progress: 0,
      duration: type === 'attack' ? 400 : 600,
      startTime: Date.now(),
    });
  }

  addMoveAnimation(unit, fromQ, fromR, toQ, toR) {
    this.moveAnimations.push({
      unit,
      fromQ, fromR,
      toQ, toR,
      progress: 0,
      duration: 500,
      startTime: Date.now(),
    });
  }

  updateAnimations(deltaTime) {
    this.animationTime += deltaTime / 1000;

    // Update particles
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= deltaTime / p.maxLife;
      return p.life > 0;
    });

    // Update combat animations
    this.combatAnimations = this.combatAnimations.filter(anim => {
      anim.progress = (Date.now() - anim.startTime) / anim.duration;
      return anim.progress < 1;
    });

    // Update move animations
    this.moveAnimations = this.moveAnimations.filter(anim => {
      anim.progress = (Date.now() - anim.startTime) / anim.duration;
      return anim.progress < 1;
    });

    // Smooth camera
    this.originX += (this.targetOriginX - this.originX) * 0.1;
    this.originY += (this.targetOriginY - this.originY) * 0.1;
    this.scale += (this.targetScale - this.scale) * 0.1;
  }

  render(gameState) {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.updateAnimations(deltaTime);

    // Clear
    this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);

    // Background
    this.ctx.fillStyle = '#0a0e14';
    this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

    // Draw grid
    if (gameState.map) {
      gameState.map.tiles.forEach(tile => {
        this.drawTerrain(tile);
        if (tile.structure) this.drawStructure(tile.structure);
      });
    }

    // Draw valid move/attack highlights
    this.drawValidMoves();
    this.drawValidAttacks();
    this.drawValidCaptures();
    this.drawPathPreview();

    // Draw units
    if (gameState.map) {
      gameState.units.forEach(unit => {
        if (unit.isAlive()) this.drawUnit(unit);
      });
    }

    // Draw animations
    this.combatAnimations.forEach(anim => this.drawCombatAnimation(anim));
    this.drawParticles();

    // Draw hovered hex
    this.drawHoveredHex();
  }

  lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }

  darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 + (B > 255 ? 255 : B < 0 ? 0 : B))
      .toString(16).slice(1);
  }

  screenToHex(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left) * devicePixelRatio;
    const y = (screenY - rect.top) * devicePixelRatio;
    return this.pixelToHex(x / devicePixelRatio, y / devicePixelRatio);
  }

  pan(dx, dy) {
    this.targetOriginX += dx;
    this.targetOriginY += dy;
  }

  zoom(factor, centerX, centerY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = centerX - rect.left;
    const y = centerY - rect.top;
    const worldX = (x - this.originX) / this.scale;
    const worldY = (y - this.originY) / this.scale;
    this.targetScale = Math.max(0.5, Math.min(2, this.targetScale * factor));
    this.targetOriginX = x - worldX * this.targetScale;
    this.targetOriginY = y - worldY * this.targetScale;
  }
}

// ============================================================================
// AUDIO SYSTEM
// ============================================================================

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.sounds = {};
    this.music = null;
    this.musicGain = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.volumes = { master: 0.7, music: 0.5, sfx: 0.8 };
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.setVolume('master', this.volumes.master);
    this.setVolume('music', this.volumes.music);
    this.setVolume('sfx', this.volumes.sfx);
    this.generateSounds();
    this.startMusic();
  }

  setVolume(type, value) {
    this.volumes[type] = value / 100;
    switch (type) {
      case 'master': this.masterGain.gain.value = this.volumes.master; break;
      case 'music': this.musicGain.gain.value = this.volumes.music; break;
      case 'sfx': this.sfxGain.gain.value = this.volumes.sfx; break;
    }
  }

  generateSounds() {
    // Click
    this.sounds.click = this.createTone(800, 0.1, 'square', 0.3);
    // Move
    this.sounds.move = this.createTone(400, 0.15, 'sine', 0.2);
    // Attack
    this.sounds.attack = this.createNoise(0.2, 0.4);
    // Capture
    this.sounds.capture = this.createArpeggio([523, 659, 784], 0.15, 0.3);
    // Build
    this.sounds.build = this.createTone(300, 0.3, 'sawtooth', 0.25);
    // Victory
    this.sounds.victory = this.createArpeggio([523, 659, 784, 1047], 0.2, 0.5);
    // Defeat
    this.sounds.defeat = this.createTone(200, 1, 'sawtooth', 0.3);
    // Select
    this.sounds.select = this.createTone(600, 0.08, 'sine', 0.2);
    // Error
    this.sounds.error = this.createTone(200, 0.2, 'square', 0.3);
  }

  createTone(freq, duration, type, volume) {
    return () => {
      if (!this.enabled || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume * this.volumes.sfx;
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.stop(this.ctx.currentTime + duration);
    };
  }

  createNoise(duration, volume) {
    return () => {
      if (!this.enabled || !this.ctx) return;
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      }
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = volume * this.volumes.sfx;
      source.connect(gain);
      gain.connect(this.sfxGain);
      source.start();
    };
  }

  createArpeggio(freqs, noteDuration, volume) {
    return () => {
      if (!this.enabled || !this.ctx) return;
      freqs.forEach((freq, i) => {
        setTimeout(() => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.value = volume * this.volumes.sfx;
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + noteDuration);
          osc.stop(this.ctx.currentTime + noteDuration);
        }, i * noteDuration * 1000);
      });
    };
  }

  startMusic() {
    if (!this.ctx) return;
    // Simple procedural ambient music
    const playNote = (freq, time, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      gain.gain.linearRampToValueAtTime(0.1 * this.volumes.music, time + 0.5);
      gain.gain.linearRampToValueAtTime(0, time + duration);
      osc.stop(time + duration);
    };

    const schedule = () => {
      const now = this.ctx.currentTime;
      const baseFreq = 110; // A2
      const scale = [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8, 2]; // Major scale
      for (let i = 0; i < 8; i++) {
        const time = now + i * 4;
        const note = scale[Math.floor(Math.random() * scale.length)];
        playNote(baseFreq * note, time, 3);
        playNote(baseFreq * note / 2, time + 1, 2);
      }
      this.musicTimeout = setTimeout(schedule, 32000);
    };
    schedule();
  }

  stopMusic() {
    if (this.musicTimeout) clearTimeout(this.musicTimeout);
  }

  play(soundName) {
    if (this.sounds[soundName]) this.sounds[soundName]();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
}

// ============================================================================
// UI MANAGEMENT
// ============================================================================

class UIManager {
  constructor() {
    this.toastContainer = document.getElementById('toastContainer');
  }

  updateHeader() {
    document.getElementById('turnPlayer').textContent = gameState.currentPlayer === PLAYER ? 'YOUR TURN' : 'ENEMY TURN';
    document.getElementById('turnPlayer').classList.toggle('enemy-turn', gameState.currentPlayer === ENEMY);
    document.getElementById('turnNumber').textContent = `Turn ${gameState.turn}`;
    document.getElementById('playerEnergy').textContent = gameState.resources[PLAYER].energy;
    document.getElementById('playerMetal').textContent = gameState.resources[PLAYER].metal;
    document.getElementById('playerFactories').textContent = gameState.getPlayerStructures(PLAYER).filter(s => s.type === 'FACTORY').length;
    document.getElementById('enemyEnergy').textContent = gameState.resources[ENEMY].energy;
    document.getElementById('enemyMetal').textContent = gameState.resources[ENEMY].metal;
    document.getElementById('enemyFactories').textContent = gameState.getPlayerStructures(ENEMY).filter(s => s.type === 'FACTORY').length;
    document.getElementById('enemyUnits').textContent = gameState.getPlayerUnits(ENEMY).length;
    const totalTiles = gameState.map?.getAllTiles().length || 1;
    const enemyTiles = gameState.map?.getAllTiles().filter(t => t.owner === ENEMY).length || 0;
    document.getElementById('enemyTerritory').textContent = Math.round(enemyTiles / totalTiles * 100) + '%';
    const enemyUnits = gameState.getPlayerUnits(ENEMY);
    const threat = enemyUnits.reduce((sum, u) => sum + u.attack, 0);
    document.getElementById('enemyThreat').textContent = threat > 100 ? 'High' : threat > 50 ? 'Medium' : 'Low';
    document.getElementById('enemyDifficulty').textContent = `Difficulty: ${gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1)}`;

    // Undo button
    document.getElementById('btnUndo').disabled = !gameState.canUndo();
    // Pause button
    document.getElementById('btnPause').textContent = gameState.paused ? '▶' : '⏸';
    // Speed button
    const speeds = [0.5, 1, 2, 3];
    const currentIdx = speeds.indexOf(gameState.gameSpeed);
    document.getElementById('btnSpeed').textContent = `${speeds[currentIdx]}×`;
  }

  updateUnitPanel() {
    const panel = document.getElementById('unitInfo');
    const actions = document.getElementById('unitActions');

    if (!gameState.selectedUnit) {
      panel.innerHTML = '<p class="unit-placeholder">Click a unit to view details</p>';
      actions.hidden = true;
      return;
    }

    const unit = gameState.selectedUnit;
    const template = unit.getTemplate();
    const isPlayer = unit.owner === PLAYER;

    panel.innerHTML = `
      <div class="unit-header">
        <div class="unit-icon ${isPlayer ? 'player' : 'enemy'}">${unit.icon}</div>
        <div class="unit-basic">
          <div class="unit-name">${unit.name}</div>
          <div class="unit-class">${unit.type}</div>
        </div>
      </div>
      <div class="unit-stats">
        <div class="stat-item"><div class="stat-value">${unit.attack}</div><div class="stat-label">Attack</div></div>
        <div class="stat-item"><div class="stat-value">${unit.range}</div><div class="stat-label">Range</div></div>
        <div class="stat-item"><div class="stat-value">${unit.move}/${unit.maxMove}</div><div class="stat-label">Move</div></div>
      </div>
      <div class="unit-bars">
        <div class="bar"><span class="bar-label">HP</span><div class="bar-track"><div class="bar-fill hp" style="width: ${unit.hp/unit.maxHp*100}%"></div></div><span class="bar-text">${unit.hp}/${unit.maxHp}</span></div>
        <div class="bar"><span class="bar-label">Move</span><div class="bar-track"><div class="bar-fill move" style="width: ${unit.move/unit.maxMove*100}%"></div></div><span class="bar-text">${unit.move}</span></div>
      </div>
      <div class="unit-abilities">
        ${unit.abilities.map(a => this.renderAbility(a, unit)).join('')}
      </div>
    `;

    // Show actions for player units
    if (isPlayer && gameState.currentPlayer === PLAYER && gameState.phase === 'playing') {
      actions.hidden = false;
      document.getElementById('btnMove').disabled = !unit.canMove();
      document.getElementById('btnAttack').disabled = !unit.canAttack() || unit.range === 0;
      document.getElementById('btnCapture').disabled = !unit.canMove() || !unit.abilities.includes('capture');
      document.getElementById('btnBuild').disabled = !unit.canMove() || !unit.abilities.includes('build');
    } else {
      actions.hidden = true;
    }
  }

  renderAbility(ability, unit) {
    const descriptions = {
      capture: 'Capture enemy/neutral structures',
      fortify: 'Gain +2 defense, cannot move',
      crush: 'Deal 50% more damage to infantry',
      bombard: 'Attack from range 3',
      fly: 'Ignore terrain movement costs',
      strike: 'Attack and retreat',
      build: 'Construct structures on owned tiles',
      repair: 'Heal adjacent friendly units',
      scout: 'Extended sight range',
    };
    const costs = { capture: 0, fortify: 0, crush: 0, bombard: 0, fly: 0, strike: 0, build: 0, repair: 0, scout: 0 };
    const icons = { capture: '🏳️', fortify: '🛡️', crush: '💥', bombard: '🎯', fly: '🕊️', strike: '⚡', build: '🔨', repair: '🔧', scout: '👁️' };
    return `
      <div class="ability">
        <div class="ability-icon">${icons[ability] || '◆'}</div>
        <div class="ability-info">
          <div class="ability-name">${ability.charAt(0).toUpperCase() + ability.slice(1)}</div>
          <div class="ability-desc">${descriptions[ability] || ''}</div>
        </div>
        <div class="ability-cost">${costs[ability] > 0 ? '⚡' + costs[ability] : ''}</div>
      </div>
    `;
  }

  updateBuildPanel() {
    const grid = document.getElementById('buildGrid');
    if (!gameState.selectedUnit || !gameState.selectedUnit.abilities.includes('build')) {
      grid.innerHTML = '<p class="unit-placeholder">Select an Engineer to build</p>';
      return;
    }

    const unit = gameState.selectedUnit;
    const tile = gameState.map.getTile(unit.q, unit.r);
    const ownedTiles = gameState.map.getAllTiles().filter(t => t.owner === PLAYER && !t.structure && !gameState.getUnitAt(t.q, t.r));

    grid.innerHTML = BUILDABLE_STRUCTURES.map(build => {
      const canBuild = gameState.canAfford(PLAYER, build.cost) &&
                       (!build.requires || tile?.type === build.requires) &&
                       ownedTiles.some(t => t.q === unit.q && t.r === unit.r);
      return `
        <button class="build-item ${canBuild ? '' : 'disabled'}" data-type="${build.type}" ${!canBuild ? 'disabled' : ''}>
          <div class="build-icon">${this.getStructureIcon(build.type)}</div>
          <div class="build-name">${build.name}</div>
          <div class="build-cost">
            <span>⚡${build.cost.energy}</span>
            <span>⛏${build.cost.metal}</span>
          </div>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.build-item').forEach(btn => {
      btn.addEventListener('click', () => startBuild(btn.dataset.type));
    });
  }

  getStructureIcon(type) {
    const icons = { FACTORY: '⚙️', REACTOR: '⚡', MINE: '⛏️', BASE: '★' };
    return icons[type] || '◆';
  }

  updateLog() {
    const container = document.getElementById('logContainer');
    container.innerHTML = gameState.logEntries.slice(0, 20).map(entry => `
      <div class="log-entry ${entry.type}">
        <span class="log-time">T${entry.time}</span>
        <span class="log-message">${entry.message}</span>
      </div>
    `).join('');
  }

  updateObjectives() {
    const list = document.getElementById('objectivesList');
    list.innerHTML = gameState.objectives.map((obj, i) => `
      <li class="objective ${gameState.completedObjectives.has(i) ? 'completed' : ''} ${!gameState.completedObjectives.has(i) && i === gameState.tutorialStep ? 'active' : ''}">
        <div class="objective-icon">${gameState.completedObjectives.has(i) ? '✓' : (i === gameState.tutorialStep ? '▸' : '○')}</div>
        <span class="objective-text">${obj.text}</span>
      </li>
    `).join('');
  }

  updateScenario() {
    const info = document.getElementById('scenarioInfo');
    if (!gameState.scenario) {
      info.innerHTML = '<p class="unit-placeholder">No scenario loaded</p>';
      return;
    }
    const s = gameState.scenario;
    info.innerHTML = `
      <div class="scenario-name">${s.name}</div>
      <div class="scenario-desc">${s.description}</div>
      <div class="scenario-meta">
        <span><strong>Difficulty:</strong> ${s.difficulty}</span>
        <span><strong>Map:</strong> ${s.mapWidth}×${s.mapHeight}</span>
        <span><strong>Win:</strong> ${s.winCondition.replace('_', ' ')}</span>
      </div>
    `;
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${message}</span><button class="toast-close">×</button>`;
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    this.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  showModal(modalId) {
    document.getElementById(modalId).showModal();
  }

  hideModal(modalId) {
    document.getElementById(modalId).close();
  }

  updateAll() {
    this.updateHeader();
    this.updateUnitPanel();
    this.updateBuildPanel();
    this.updateLog();
    this.updateObjectives();
    this.updateScenario();
  }
}

// ============================================================================
// GAME LOGIC FUNCTIONS
// ============================================================================

let gameState = new GameState();
let renderer = null;
let audio = new AudioSystem();
let ui = new UIManager();
let ai = new AI('normal');
let animationFrameId = null;

function initGame() {
  // Initialize renderer
  const canvas = document.getElementById('gameCanvas');
  renderer = new Renderer(canvas);
  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());

  // Initialize audio
  audio.init();

  // Load settings
  loadSettings();

  // Set up event listeners
  setupEventListeners();

  // Start with main menu
  ui.showModal('menuModal');

  // Start render loop
  animationFrameId = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  renderer.render(gameState);
  animationFrameId = requestAnimationFrame(gameLoop);
}

function setupEventListeners() {
  // Canvas events
  const canvas = document.getElementById('gameCanvas');
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); cancelAction(); });
  canvas.addEventListener('mousemove', handleCanvasMouseMove);
  canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });
  canvas.addEventListener('mousedown', handleCanvasMouseDown);

  // Keyboard
  document.addEventListener('keydown', handleKeyDown);

  // Header buttons
  document.getElementById('btnUndo').addEventListener('click', undoMove);
  document.getElementById('btnPause').addEventListener('click', togglePause);
  document.getElementById('btnSpeed').addEventListener('click', cycleSpeed);
  document.getElementById('btnMenu').addEventListener('click', () => ui.showModal('menuModal'));
  document.getElementById('btnSave').addEventListener('click', () => ui.showModal('saveModal'));
  document.getElementById('btnLoad').addEventListener('click', () => ui.showModal('loadModal'));
  document.getElementById('btnRestart').addEventListener('click', restartScenario);

  // Menu
  document.getElementById('menuClose').addEventListener('click', () => ui.hideModal('menuModal'));
  document.querySelectorAll('#menuModal .menu-item').forEach(btn => {
    btn.addEventListener('click', () => handleMenuAction(btn.dataset.action));
  });

  // Scenario modal
  document.getElementById('scenarioClose').addEventListener('click', () => ui.hideModal('scenarioModal'));

  // Tutorial modal
  document.getElementById('tutorialClose').addEventListener('click', () => ui.hideModal('tutorialModal'));
  document.getElementById('tutorialPrev').addEventListener('click', () => changeTutorialStep(-1));
  document.getElementById('tutorialNext').addEventListener('click', () => changeTutorialStep(1));
  document.getElementById('tutorialStart').addEventListener('click', startTutorial);

  // Settings modal
  document.getElementById('settingsClose').addEventListener('click', () => ui.hideModal('settingsModal'));
  document.querySelectorAll('#settingsModal select, #settingsModal input').forEach(input => {
    input.addEventListener('change', saveSettings);
  });

  // Save/Load modals
  document.getElementById('saveClose').addEventListener('click', () => ui.hideModal('saveModal'));
  document.getElementById('loadClose').addEventListener('click', () => ui.hideModal('loadModal'));
  document.getElementById('btnCreateSave').addEventListener('click', createNewSave);

  // Game over modal
  document.getElementById('btnPlayAgain').addEventListener('click', () => { ui.hideModal('gameOverModal'); restartScenario(); });
  document.getElementById('btnMainMenu').addEventListener('click', () => { ui.hideModal('gameOverModal'); ui.showModal('menuModal'); });

  // Confirm modal
  document.getElementById('confirmNo').addEventListener('click', () => ui.hideModal('confirmModal'));

  // Unit actions
  document.getElementById('btnMove').addEventListener('click', () => startAction('move'));
  document.getElementById('btnAttack').addEventListener('click', () => startAction('attack'));
  document.getElementById('btnCapture').addEventListener('click', () => startAction('capture'));
  document.getElementById('btnBuild').addEventListener('click', () => startAction('build'));
  document.getElementById('btnDelete').addEventListener('click', deleteUnit);
}

function handleMenuAction(action) {
  ui.hideModal('menuModal');
  switch (action) {
    case 'new-game': ui.showModal('scenarioModal'); loadScenarios(); break;
    case 'scenarios': ui.showModal('scenarioModal'); loadScenarios(); break;
    case 'tutorial': ui.showModal('tutorialModal'); loadTutorial(); break;
    case 'settings': ui.showModal('settingsModal'); break;
    case 'quit': window.close(); break;
  }
}

function loadScenarios() {
  const grid = document.getElementById('scenarioGrid');
  grid.innerHTML = SCENARIOS.map((s, i) => `
    <div class="scenario-card ${i > 0 && !isScenarioUnlocked(s.id) ? 'locked' : ''}" data-id="${s.id}" ${i > 0 && !isScenarioUnlocked(s.id) ? '' : 'tabindex="0"'}>
      <div class="scenario-card-header">
        <div class="scenario-card-name">${s.name}</div>
        <span class="scenario-card-difficulty ${s.difficulty}">${s.difficulty}</span>
      </div>
      <div class="scenario-card-desc">${s.description}</div>
      <div class="scenario-card-meta">
        <span>Map: ${s.mapWidth}×${s.mapHeight}</span>
        <span>Win: ${s.winCondition.replace('_', ' ')}</span>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.scenario-card:not(.locked)').forEach(card => {
    card.addEventListener('click', () => startScenario(card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') startScenario(card.dataset.id); });
  });
}

function isScenarioUnlocked(id) {
  const saves = getSaves();
  return saves.some(s => s.scenario === id && s.won);
}

function startScenario(id) {
  const scenario = SCENARIOS.find(s => s.id === id);
  if (!scenario) return;
  ui.hideModal('scenarioModal');
  newGame(scenario);
}

function newGame(scenario) {
  gameState = new GameState();
  gameState.scenario = scenario;
  gameState.difficulty = scenario.difficulty;
  gameState.settings.aiDifficulty = scenario.difficulty;
  ai.setDifficulty(scenario.difficulty);

  // Generate map
  gameState.map = new Map(scenario.mapWidth, scenario.mapHeight);
  gameState.map.generate(scenario.mapWidth, scenario.mapHeight, {
    waterLevel: scenario.waterLevel,
    mountainRange: scenario.mountainRange,
    playerStart: scenario.playerStart,
    enemyStart: scenario.enemyStart,
    mines: scenario.mines,
  });

  // Place player structures
  scenario.playerStructures.forEach(s => {
    const tile = gameState.map.getTile(s.q, s.r);
    if (tile) {
      tile.structure = new Structure({ type: s.type, owner: PLAYER, q: s.q, r: s.r });
      tile.owner = PLAYER;
    }
  });

  // Place enemy structures
  scenario.enemyStructures.forEach(s => {
    const tile = gameState.map.getTile(s.q, s.r);
    if (tile) {
      tile.structure = new Structure({ type: s.type, owner: ENEMY, q: s.q, r: s.r });
      tile.owner = ENEMY;
    }
  });

  // Place player units
  scenario.playerUnits.forEach(u => {
    const unit = new Unit({ type: u.type, owner: PLAYER, q: u.q, r: u.r });
    gameState.units.push(unit);
    const tile = gameState.map.getTile(u.q, u.r);
    if (tile) tile.owner = PLAYER;
  });

  // Place enemy units
  scenario.enemyUnits.forEach(u => {
    const unit = new Unit({ type: u.type, owner: ENEMY, q: u.q, r: u.r });
    gameState.units.push(unit);
    const tile = gameState.map.getTile(u.q, u.r);
    if (tile) tile.owner = ENEMY;
  });

  // Set objectives
  gameState.objectives = scenario.objectives.map(text => ({ text, check: null }));

  // Add specific objective checks
  if (scenario.winCondition === 'capture_base') {
    gameState.objectives[0].check = (state) => {
      const enemyBases = state.getPlayerStructures(ENEMY).filter(s => s.type === 'BASE');
      return enemyBases.length === 0;
    };
  } else if (scenario.winCondition === 'dominate') {
    gameState.objectives[0].check = (state) => {
      const mines = state.map.getAllTiles().filter(t => t.structure?.type === 'MINE' && t.owner === PLAYER);
      return mines.length >= 3;
    };
  }

  // Tutorial setup
  if (scenario.tutorial) {
    gameState.inTutorial = true;
    gameState.tutorialStep = 0;
    setupTutorialObjectives();
  }

  gameState.calculateIncome();
  gameState.addLog(`Scenario started: ${scenario.name}`, 'system');
  gameState.addLog('Your turn. Select a unit to begin.', 'player');

  ui.updateAll();
  renderer.centerView();
  audio.play('click');
}

function setupTutorialObjectives() {
  const steps = [
    { text: 'Select your Soldier (shield icon)', check: () => gameState.selectedUnit?.type === 'SOLDIER' },
    { text: 'Click Move, then click a highlighted hex to move', check: () => gameState.actionMode === 'move' && gameState.validMoveHexes.size > 0 },
    { text: 'Move adjacent to the enemy Scout', check: () => {
      const soldier = gameState.getPlayerUnits(PLAYER).find(u => u.type === 'SOLDIER');
      const enemy = gameState.getPlayerUnits(ENEMY).find(u => u.type === 'SCOUT');
      return soldier && enemy && new Hex(soldier.q, soldier.r).distance(new Hex(enemy.q, enemy.r)) <= 1;
    }},
    { text: 'Click Attack, then click the enemy Scout', check: () => gameState.actionMode === 'attack' },
    { text: 'Select your Engineer (wrench icon)', check: () => gameState.selectedUnit?.type === 'ENGINEER' },
    { text: 'Click Build, then build a Factory on your Base', check: () => gameState.actionMode === 'build' },
  ];
  gameState.objectives = steps;
}

function loadTutorial() {
  const steps = [
    { title: 'Welcome to Hex Dominion', desc: 'This tutorial will teach you the basics of turn-based strategy. Click Next to begin.' },
    { title: 'Selecting Units', desc: 'Click on your units (green) to select them. Their info appears on the left panel.' },
    { title: 'Moving Units', desc: 'Click the Move button, then click a highlighted green hex to move. Units have limited move points per turn.' },
    { title: 'Attacking', desc: 'Move adjacent to an enemy, click Attack, then click the enemy to attack. Combat is automatic.' },
    { title: 'Capturing Structures', desc: 'Move a unit with Capture ability onto an enemy structure. Each turn adds 25% capture progress.' },
    { title: 'Building & Economy', desc: 'Engineers can build Factories (⚡+3/turn), Reactors (⚡+5/turn), and Mines (⛏+4/turn) on owned tiles.' },
    { title: 'Winning', desc: 'Capture the enemy Command Base (★) to win. Protect your own Base!' },
  ];
  const container = document.getElementById('tutorialSteps');
  container.innerHTML = steps.map((step, i) => `
    <div class="tutorial-step" data-step="${i}">
      <div class="tutorial-step-number">${i + 1}</div>
      <div class="tutorial-step-content">
        <div class="tutorial-step-title">${step.title}</div>
        <div class="tutorial-step-desc">${step.desc}</div>
      </div>
    </div>
  `).join('');
  document.getElementById('stepCounter').textContent = `Step 1 of ${steps.length}`;
  document.getElementById('tutorialPrev').disabled = true;
  document.getElementById('tutorialNext').hidden = false;
  document.getElementById('tutorialStart').hidden = true;
}

function changeTutorialStep(delta) {
  const steps = document.querySelectorAll('.tutorial-step');
  let current = Array.from(steps).findIndex(s => s.classList.contains('active'));
  if (current === -1) current = 0;
  const next = Math.max(0, Math.min(steps.length - 1, current + delta));
  steps.forEach((s, i) => s.classList.toggle('active', i === next));
  document.getElementById('stepCounter').textContent = `Step ${next + 1} of ${steps.length}`;
  document.getElementById('tutorialPrev').disabled = next === 0;
  document.getElementById('tutorialNext').disabled = next === steps.length - 1;
  if (next === steps.length - 1) {
    document.getElementById('tutorialNext').hidden = true;
    document.getElementById('tutorialStart').hidden = false;
  } else {
    document.getElementById('tutorialNext').hidden = false;
    document.getElementById('tutorialStart').hidden = true;
  }
}

function startTutorial() {
  ui.hideModal('tutorialModal');
  newGame(SCENARIOS[0]);
}

function handleCanvasClick(e) {
  if (gameState.phase !== 'playing' || gameState.currentPlayer !== PLAYER) return;
  audio.resume();

  const hex = renderer.screenToHex(e.clientX, e.clientY);
  const tile = gameState.map.getTile(hex.q, hex.r);
  if (!tile) return;

  // If in action mode, execute action
  if (gameState.actionMode) {
    executeAction(hex.q, hex.r);
    return;
  }

  // Otherwise select unit
  const unit = gameState.getUnitAt(hex.q, hex.r);
  if (unit && unit.owner === PLAYER) {
    selectUnit(unit);
  } else if (gameState.selectedUnit) {
    cancelAction();
  }
}

function handleCanvasMouseMove(e) {
  const hex = renderer.screenToHex(e.clientX, e.clientY);
  const tile = gameState.map.getTile(hex.q, hex.r);
  renderer.hoveredHex = tile ? hex : null;

  // Update shortcut text
  const shortcut = document.getElementById('shortcutText');
  if (gameState.actionMode) {
    const modes = { move: 'Click a green hex to move', attack: 'Click a red hex to attack', capture: 'Click an orange hex to capture', build: 'Click a highlighted hex to build' };
    shortcut.textContent = modes[gameState.actionMode] || 'Right-click to cancel';
  } else if (tile) {
    const unit = gameState.getUnitAt(hex.q, hex.r);
    const struct = tile.structure;
    if (unit) shortcut.textContent = `${unit.owner === PLAYER ? 'Your' : 'Enemy'} ${unit.name} | HP: ${unit.hp}/${unit.maxHp}`;
    else if (struct) shortcut.textContent = `${struct.owner === PLAYER ? 'Your' : struct.owner === ENEMY ? 'Enemy' : 'Neutral'} ${struct.name} | HP: ${struct.hp}/100`;
    else shortcut.textContent = `${tile.template.name} | Owner: ${tile.owner === PLAYER ? 'You' : tile.owner === ENEMY ? 'Enemy' : 'Neutral'}`;
  } else {
    shortcut.textContent = 'Click unit → Click hex to move | Right-click to cancel';
  }
}

function handleCanvasWheel(e) {
  e.preventDefault();
  const rect = renderer.canvas.getBoundingClientRect();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  renderer.zoom(factor, e.clientX - rect.left, e.clientY - rect.top);
}

let dragStart = null;
function handleCanvasMouseDown(e) {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    dragStart = { x: e.clientX, y: e.clientY, originX: renderer.targetOriginX, originY: renderer.targetOriginY };
  }
}

document.addEventListener('mousemove', e => {
  if (dragStart) {
    renderer.targetOriginX = dragStart.originX + (e.clientX - dragStart.x);
    renderer.targetOriginY = dragStart.originY + (e.clientY - dragStart.y);
  }
});
document.addEventListener('mouseup', () => { dragStart = null; });

function handleKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.key.toLowerCase()) {
    case 'u': if (gameState.canUndo()) undoMove(); break;
    case ' ': e.preventDefault(); togglePause(); break;
    case 's': cycleSpeed(); break;
    case 'escape': cancelAction(); closeAllModals(); break;
    case 'm': if (gameState.selectedUnit) startAction('move'); break;
    case 'a': if (gameState.selectedUnit) startAction('attack'); break;
    case 'c': if (gameState.selectedUnit) startAction('capture'); break;
    case 'b': if (gameState.selectedUnit) startAction('build'); break;
    case 'delete': if (gameState.selectedUnit) deleteUnit(); break;
    case 'f': if (gameState.selectedUnit?.abilities.includes('fortify')) fortifyUnit(); break;
    case 'r': if (gameState.selectedUnit?.abilities.includes('repair')) startAction('repair'); break;
    case 'end': case 'n': if (gameState.currentPlayer === PLAYER) endTurn(); break;
    case 'arrowup': renderer.pan(0, 40); break;
    case 'arrowdown': renderer.pan(0, -40); break;
    case 'arrowleft': renderer.pan(40, 0); break;
    case 'arrowright': renderer.pan(-40, 0); break;
    case '+': case '=': renderer.zoom(1.1, renderer.logicalWidth/2, renderer.logicalHeight/2); break;
    case '-': renderer.zoom(0.9, renderer.logicalWidth/2, renderer.logicalHeight/2); break;
  }
}

function selectUnit(unit) {
  if (gameState.selectedUnit === unit) return;
  gameState.selectedUnit = unit;
  gameState.actionMode = null;
  gameState.validMoveHexes.clear();
  gameState.validAttackHexes.clear();
  gameState.validCaptureHexes.clear();
  gameState.pathPreview = [];
  renderer.validMoveHexes.clear();
  renderer.validAttackHexes.clear();
  renderer.validCaptureHexes.clear();
  renderer.pathPreview = [];

  if (unit.owner === PLAYER && unit.canMove()) {
    const reachable = gameState.map.getReachableTiles(unit.q, unit.r, unit.move, unit);
    reachable.forEach((cost, hash) => {
      if (hash !== `${unit.q},${unit.r}`) {
        gameState.validMoveHexes.add(hash);
        renderer.validMoveHexes.add(hash);
      }
    });
  }
  if (unit.owner === PLAYER && unit.canAttack()) {
    const attackable = gameState.map.getAttackableTiles(unit.q, unit.r, unit.range, unit);
    attackable.forEach(tile => {
      const target = gameState.getUnitAt(tile.q, tile.r);
      if (target && target.owner !== PLAYER) {
        const hash = `${tile.q},${tile.r}`;
        gameState.validAttackHexes.add(hash);
        renderer.validAttackHexes.add(hash);
      }
    });
  }
  if (unit.owner === PLAYER && unit.canMove() && unit.abilities.includes('capture')) {
    const reachable = gameState.map.getReachableTiles(unit.q, unit.r, unit.move, unit);
    reachable.forEach((cost, hash) => {
      const hex = Hex.fromHash(hash);
      const struct = gameState.getStructureAt(hex.q, hex.r);
      if (struct && struct.owner !== PLAYER) {
        gameState.validCaptureHexes.add(hash);
        renderer.validCaptureHexes.add(hash);
      }
    });
  }

  audio.play('select');
  ui.updateUnitPanel();
}

function startAction(mode) {
  if (!gameState.selectedUnit || gameState.currentPlayer !== PLAYER) return;
  gameState.actionMode = mode;
  audio.play('click');
  ui.updateUnitPanel();
}

function cancelAction() {
  gameState.actionMode = null;
  gameState.validMoveHexes.clear();
  gameState.validAttackHexes.clear();
  gameState.validCaptureHexes.clear();
  gameState.pathPreview = [];
  renderer.validMoveHexes.clear();
  renderer.validAttackHexes.clear();
  renderer.validCaptureHexes.clear();
  renderer.pathPreview = [];
  ui.updateUnitPanel();
}

function executeAction(q, r) {
  const unit = gameState.selectedUnit;
  if (!unit) return;

  const hash = `${q},${r}`;
  let success = false;

  switch (gameState.actionMode) {
    case 'move':
      if (gameState.validMoveHexes.has(hash)) {
        const path = gameState.map.findPath(unit.q, unit.r, q, r, unit);
        if (path) {
          gameState.addToHistory();
          moveUnit(unit, path);
          success = true;
        }
      }
      break;
    case 'attack':
      if (gameState.validAttackHexes.has(hash)) {
        const target = gameState.getUnitAt(q, r);
        if (target && target.owner !== PLAYER) {
          gameState.addToHistory();
          attackUnit(unit, target);
          success = true;
        }
      }
      break;
    case 'capture':
      if (gameState.validCaptureHexes.has(hash)) {
        const path = gameState.map.findPath(unit.q, unit.r, q, r, unit);
        if (path) {
          gameState.addToHistory();
          moveUnit(unit, path, () => captureStructure(unit, q, r));
          success = true;
        }
      }
      break;
    case 'build':
      if (unit.abilities.includes('build')) {
        buildStructure(unit, q, r);
        success = true;
      }
      break;
  }

  if (success) {
    cancelAction();
    gameState.selectedUnit = null;
    ui.updateUnitPanel();
    gameState.checkWinCondition();
  }
}

function moveUnit(unit, path, onComplete) {
  const startQ = unit.q;
  const startR = unit.r;
  const endQ = path[path.length - 1].q;
  const endR = path[path.length - 1].r;

  // Calculate total cost
  let totalCost = 0;
  for (let i = 1; i < path.length; i++) {
    totalCost += unit.getMoveCost(path[i].q, path[i].r);
  }

  unit.q = endQ;
  unit.r = endR;
  unit.hasMoved = true;
  unit.move -= totalCost;
  if (unit.move < 0) unit.move = 0;
  unit.fortified = false;

  // Update tile ownership
  const oldTile = gameState.map.getTile(startQ, startR);
  const newTile = gameState.map.getTile(endQ, endR);
  if (oldTile && !gameState.getUnitAt(startQ, startR)) {
    // Check if any other player unit is there
    const otherUnit = gameState.units.find(u => u !== unit && u.owner === PLAYER && u.q === startQ && u.r === startR);
    if (!otherUnit) oldTile.owner = NEUTRAL;
  }
  if (newTile) newTile.owner = PLAYER;

  // Animate
  renderer.addMoveAnimation(unit, startQ, startR, endQ, endR);
  renderer.pathPreview = path.slice(1).map(h => new Hex(h.q, h.r));
  setTimeout(() => { renderer.pathPreview = []; }, 500);

  gameState.addLog(`${unit.name} moved to (${endQ},${endR})`, 'player');
  audio.play('move');

  if (onComplete) setTimeout(onComplete, 300);
}

function attackUnit(attacker, target) {
  const damage = Math.max(1, attacker.getEffectiveAttack(target) - target.getDefense());
  target.hp = Math.max(0, target.hp - damage);
  attacker.hasAttacked = true;

  renderer.addCombatAnimation('attack', attacker.q, attacker.r, target.q, target.r);
  for (let i = 0; i < 5; i++) {
    const pos = renderer.hexToPixel(target.q, target.r);
    renderer.addParticle(pos.x + (Math.random()-0.5)*20, pos.y + (Math.random()-0.5)*20, '#ff6b6b', 4, 500);
  }

  gameState.addLog(`${attacker.name} attacks ${target.name} for ${damage} damage!`, 'combat');
  audio.play('attack');

  if (target.hp <= 0) {
    gameState.addLog(`${target.name} destroyed!`, 'combat');
    // Remove unit after animation
    setTimeout(() => {
      const idx = gameState.units.indexOf(target);
      if (idx > -1) gameState.units.splice(idx, 1);
      // Check if tile ownership changes
      const tile = gameState.map.getTile(target.q, target.r);
      if (tile && !gameState.getUnitAt(target.q, target.r)) {
        const otherUnits = gameState.units.filter(u => u.q === target.q && u.r === target.r);
        if (otherUnits.length === 0) tile.owner = NEUTRAL;
      }
    }, 500);
  }
}

function captureStructure(unit, q, r) {
  unit.q = q;
  unit.r = r;
  unit.hasMoved = true;
  unit.move = 0;

  const struct = gameState.getStructureAt(q, r);
  if (struct) {
    struct.captureProgress += 25;
    gameState.addLog(`${unit.name} captures ${struct.name} (${struct.captureProgress}%)`, 'player');
    audio.play('capture');

    if (struct.captureProgress >= 100) {
      struct.owner = PLAYER;
      struct.captureProgress = 0;
      const tile = gameState.map.getTile(q, r);
      if (tile) tile.owner = PLAYER;
      gameState.addLog(`${struct.name} captured!`, 'success');
      audio.play('build');
    }
  }
}

function buildStructure(unit, q, r) {
  // Find which structure type is selected (from build panel)
  // For now, build the first affordable one
  const buildable = BUILDABLE_STRUCTURES.find(b => gameState.canAfford(PLAYER, b.cost));
  if (!buildable) { ui.showToast('Not enough resources!', 'error'); return; }

  gameState.spendResources(PLAYER, buildable.cost);
  const struct = new Structure({ type: buildable.type, owner: PLAYER, q, r });
  const tile = gameState.map.getTile(q, r);
  if (tile) {
    tile.structure = struct;
    tile.owner = PLAYER;
  }
  unit.hasMoved = true;
  unit.move = 0;

  gameState.addLog(`Built ${buildable.name} at (${q},${r})`, 'success');
  audio.play('build');
  renderer.addParticle(...Object.values(renderer.hexToPixel(q, r)).flat(), '#00d4aa', 8, 800);
}

function startBuild(type) {
  const buildable = BUILDABLE_STRUCTURES.find(b => b.type === type);
  if (!buildable || !gameState.canAfford(PLAYER, buildable.cost)) return;

  const unit = gameState.selectedUnit;
  const tile = gameState.map.getTile(unit.q, unit.r);
  if (!tile || tile.owner !== PLAYER || tile.structure) return;

  gameState.spendResources(PLAYER, buildable.cost);
  const struct = new Structure({ type: buildable.type, owner: PLAYER, q: unit.q, r: unit.r });
  tile.structure = struct;
  tile.owner = PLAYER;
  unit.hasMoved = true;
  unit.move = 0;

  gameState.addLog(`Built ${buildable.name}`, 'success');
  audio.play('build');
  cancelAction();
  ui.updateAll();
}

function fortifyUnit() {
  const unit = gameState.selectedUnit;
  if (!unit || !unit.abilities.includes('fortify') || unit.fortified) return;
  unit.fortified = true;
  unit.hasMoved = true;
  gameState.addLog(`${unit.name} fortified!`, 'player');
  audio.play('click');
  cancelAction();
  ui.updateUnitPanel();
}

function deleteUnit() {
  if (!gameState.selectedUnit) return;
  const unit = gameState.selectedUnit;
  const idx = gameState.units.indexOf(unit);
  if (idx > -1) gameState.units.splice(idx, 1);
  const tile = gameState.map.getTile(unit.q, unit.r);
  if (tile && !gameState.getUnitAt(unit.q, unit.r)) tile.owner = NEUTRAL;
  gameState.addLog(`${unit.name} disbanded`, 'system');
  audio.play('error');
  cancelAction();
  ui.updateAll();
}

function endTurn() {
  if (gameState.currentPlayer !== PLAYER || gameState.phase !== 'playing') return;
  gameState.nextTurn();
  ui.updateAll();
}

function undoMove() {
  if (gameState.undo()) {
    ui.updateAll();
    audio.play('click');
  }
}

function togglePause() {
  gameState.paused = !gameState.paused;
  document.getElementById('btnPause').textContent = gameState.paused ? '▶' : '⏸';
  if (gameState.paused) {
    ui.showToast('Game paused', 'info');
  } else {
    ui.showToast('Game resumed', 'info');
    if (gameState.currentPlayer === ENEMY && gameState.phase === 'playing') {
      setTimeout(() => aiTakeTurn(), 500);
    }
  }
}

function cycleSpeed() {
  const speeds = [0.5, 1, 2, 3];
  const currentIdx = speeds.indexOf(gameState.gameSpeed);
  gameState.gameSpeed = speeds[(currentIdx + 1) % speeds.length];
  document.getElementById('btnSpeed').textContent = `${gameState.gameSpeed}×`;
  ui.showToast(`Speed: ${gameState.gameSpeed}×`, 'info');
}

function restartScenario() {
  if (gameState.scenario) {
    newGame(gameState.scenario);
  }
  ui.hideModal('gameOverModal');
  ui.hideModal('confirmModal');
}

function closeAllModals() {
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
}

// ============================================================================
// AI TURN
// ============================================================================

async function aiTakeTurn() {
  if (gameState.phase !== 'playing' || gameState.currentPlayer !== ENEMY || gameState.paused) return;

  gameState.addLog('Enemy is thinking...', 'enemy');

  // Give AI time to "think"
  await new Promise(r => setTimeout(r, 500 * gameState.gameSpeed));

  const action = ai.findBestAction(gameState);
  if (action) {
    executeAIAction(action);
  } else {
    // No actions available, end turn
    gameState.addLog('Enemy ends turn', 'enemy');
    gameState.nextTurn();
  }

  ui.updateAll();
}

function executeAIAction(action) {
  const unit = gameState.units.find(u => u.id === action.unit?.id);
  if (!unit) return;

  switch (action.type) {
    case 'move':
      if (action.path) {
        moveUnit(unit, action.path);
      }
      break;
    case 'attack':
      const target = gameState.units.find(u => u.id === action.target?.id);
      if (target) attackUnit(unit, target);
      break;
    case 'capture':
      if (action.path) {
        moveUnit(unit, action.path, () => captureStructure(unit, action.targetQ, action.targetR));
      }
      break;
    case 'build':
      buildStructure(unit, action.targetQ, action.targetR);
      break;
    case 'fortify':
      unit.fortified = true;
      unit.hasMoved = true;
      break;
    case 'repair':
      if (action.path) {
        moveUnit(unit, action.path, () => {
          const target = gameState.units.find(u => u.id === action.target?.id);
          if (target) {
            target.hp = Math.min(target.maxHp, target.hp + 20);
            gameState.addLog(`${unit.name} repairs ${target.name}`, 'enemy');
          }
        });
      }
      break;
    case 'produce':
      gameState.spendResources(ENEMY, action.cost);
      const newUnit = new Unit({ type: action.unitType, owner: ENEMY, q: action.spawnQ, r: action.spawnR });
      gameState.units.push(newUnit);
      gameState.addLog(`Enemy produced ${newUnit.name}`, 'enemy');
      break;
  }

  // Small delay between actions
  setTimeout(() => {
    if (gameState.currentPlayer === ENEMY && gameState.phase === 'playing') {
      aiTakeTurn();
    }
  }, 300 * gameState.gameSpeed);
}

// ============================================================================
// SAVE/LOAD SYSTEM
// ============================================================================

function getSaves() {
  try {
    const data = localStorage.getItem('hexDominion_saves');
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveSaves(saves) {
  try {
    localStorage.setItem('hexDominion_saves', JSON.stringify(saves));
  } catch (e) {
    ui.showToast('Failed to save: ' + e.message, 'error');
  }
}

function createNewSave() {
  const saves = getSaves();
  const slot = saves.length + 1;
  const saveData = {
    id: Date.now(),
    slot,
    name: `Save ${slot}`,
    scenario: gameState.scenario?.id,
    turn: gameState.turn,
    date: new Date().toISOString(),
    won: false,
    data: gameState.serialize(),
  };
  saves.push(saveData);
  saveSaves(saves);
  ui.showToast('Game saved!', 'success');
  ui.hideModal('saveModal');
  ui.hideModal('loadModal');
}

function showSaveModal() {
  const container = document.getElementById('saveSlots');
  const saves = getSaves();
  container.innerHTML = saves.map((save, i) => `
    <div class="save-slot" data-index="${i}">
      <div class="save-slot-info">
        <div class="save-slot-name">${save.name}</div>
        <div class="save-slot-meta">Turn ${save.turn} • ${save.scenario} • ${new Date(save.date).toLocaleString()}</div>
      </div>
      <div class="save-slot-actions">
        <button class="save-slot-action overwrite" title="Overwrite">💾</button>
        <button class="save-slot-action delete" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');

  if (saves.length < 10) {
    container.innerHTML += `<div class="save-slot empty">Empty slot ${saves.length + 1}</div>`;
  }

  container.querySelectorAll('.save-slot:not(.empty)').forEach(slot => {
    slot.querySelector('.overwrite').addEventListener('click', e => {
      e.stopPropagation();
      overwriteSave(parseInt(slot.dataset.index));
    });
    slot.querySelector('.delete').addEventListener('click', e => {
      e.stopPropagation();
      deleteSave(parseInt(slot.dataset.index));
    });
  });
}

function overwriteSave(index) {
  const saves = getSaves();
  saves[index] = {
    ...saves[index],
    turn: gameState.turn,
    date: new Date().toISOString(),
    data: gameState.serialize(),
  };
  saveSaves(saves);
  ui.showToast('Save overwritten!', 'success');
  ui.hideModal('saveModal');
}

function deleteSave(index) {
  const saves = getSaves();
  saves.splice(index, 1);
  saveSaves(saves);
  showSaveModal();
  ui.showToast('Save deleted', 'info');
}

function showLoadModal() {
  const container = document.getElementById('loadSlots');
  const saves = getSaves();
  if (saves.length === 0) {
    container.innerHTML = '<p class="unit-placeholder">No saved games</p>';
    return;
  }
  container.innerHTML = saves.map((save, i) => `
    <div class="save-slot" data-index="${i}">
      <div class="save-slot-info">
        <div class="save-slot-name">${save.name}</div>
        <div class="save-slot-meta">Turn ${save.turn} • ${save.scenario} • ${new Date(save.date).toLocaleString()}</div>
      </div>
      <div class="save-slot-actions">
        <button class="save-slot-action load" title="Load">📂</button>
        <button class="save-slot-action delete" title="Delete">🗑</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.save-slot').forEach(slot => {
    slot.querySelector('.load').addEventListener('click', e => {
      e.stopPropagation();
      loadSave(parseInt(slot.dataset.index));
    });
    slot.querySelector('.delete').addEventListener('click', e => {
      e.stopPropagation();
      deleteSave(parseInt(slot.dataset.index));
      showLoadModal();
    });
  });
}

function loadSave(index) {
  const saves = getSaves();
  const save = saves[index];
  if (!save) return;

  gameState = GameState.deserialize(save.data);
  ai.setDifficulty(gameState.difficulty);

  ui.hideModal('loadModal');
  ui.updateAll();
  renderer.centerView();
  ui.showToast('Game loaded!', 'success');

  if (gameState.currentPlayer === ENEMY && gameState.phase === 'playing') {
    setTimeout(() => aiTakeTurn(), 500);
  }
}

function showGameOverModal(victory) {
  const content = document.getElementById('gameOverContent');
  const playerUnits = gameState.getPlayerUnits(PLAYER).length;
  const enemyUnits = gameState.getPlayerUnits(ENEMY).length;
  const playerStructs = gameState.getPlayerStructures(PLAYER).length;
  const enemyStructs = gameState.getPlayerStructures(ENEMY).length;

  content.innerHTML = `
    <div class="game-over-result ${victory ? 'victory' : 'defeat'}">${victory ? 'VICTORY!' : 'DEFEAT'}</div>
    <p>${victory ? 'You have conquered the enemy!' : 'Your forces have been crushed.'}</p>
    <div class="game-over-stats">
      <div class="game-over-stat">
        <div class="game-over-stat-label">Your Units</div>
        <div class="game-over-stat-value">${playerUnits}</div>
      </div>
      <div class="game-over-stat">
        <div class="game-over-stat-label">Enemy Units</div>
        <div class="game-over-stat-value">${enemyUnits}</div>
      </div>
      <div class="game-over-stat">
        <div class="game-over-stat-label">Turns</div>
        <div class="game-over-stat-value">${gameState.turn}</div>
      </div>
    </div>
  `;
  ui.showModal('gameOverModal');

  // Mark scenario as won
  if (victory && gameState.scenario) {
    const saves = getSaves();
    const autoSave = saves.find(s => s.scenario === gameState.scenario.id && s.name.startsWith('Auto'));
    if (!autoSave) {
      const saveData = {
        id: Date.now(),
        slot: saves.length + 1,
        name: `Auto - ${gameState.scenario.name}`,
        scenario: gameState.scenario.id,
        turn: gameState.turn,
        date: new Date().toISOString(),
        won: true,
        data: gameState.serialize(),
      };
      saves.push(saveData);
      saveSaves(saves);
    }
  }
}

// ============================================================================
// SETTINGS
// ============================================================================

function loadSettings() {
  try {
    const data = localStorage.getItem('hexDominion_settings');
    if (data) {
      const saved = JSON.parse(data);
      gameState.settings = { ...gameState.settings, ...saved };
      applySettings();
    }
  } catch {}
}

function saveSettings() {
  const settings = {
    animQuality: document.getElementById('settingAnimQuality').value,
    particles: document.getElementById('settingParticles').checked,
    reducedMotion: document.getElementById('settingReducedMotion').checked,
    masterVol: parseInt(document.getElementById('settingMasterVol').value),
    musicVol: parseInt(document.getElementById('settingMusicVol').value),
    sfxVol: parseInt(document.getElementById('settingSfxVol').value),
    aiDifficulty: document.getElementById('settingAIDifficulty').value,
    movePreview: document.getElementById('settingMovePreview').checked,
    autoSave: document.getElementById('settingAutoSave').checked,
    confirmAttack: document.getElementById('settingConfirmAttack').checked,
    highContrast: document.getElementById('settingHighContrast').checked,
    colorBlind: document.getElementById('settingColorBlind').value,
    largeUI: document.getElementById('settingLargeUI').checked,
  };
  gameState.settings = settings;
  applySettings();
  try {
    localStorage.setItem('hexDominion_settings', JSON.stringify(settings));
  } catch {}
}

function applySettings() {
  const s = gameState.settings;
  document.body.classList.toggle('high-contrast', s.highContrast);
  document.body.classList.toggle('color-blind-' + s.colorBlind, s.colorBlind !== 'none');
  document.body.classList.toggle('large-ui', s.largeUI);

  audio.setVolume('master', s.masterVol);
  audio.setVolume('music', s.musicVol);
  audio.setVolume('sfx', s.sfxVol);

  ai.setDifficulty(s.aiDifficulty);
  gameState.difficulty = s.aiDifficulty;

  document.getElementById('settingAnimQuality').value = s.animQuality;
  document.getElementById('settingParticles').checked = s.particles;
  document.getElementById('settingReducedMotion').checked = s.reducedMotion;
  document.getElementById('settingMasterVol').value = s.masterVol;
  document.getElementById('settingMusicVol').value = s.musicVol;
  document.getElementById('settingSfxVol').value = s.sfxVol;
  document.getElementById('settingAIDifficulty').value = s.aiDifficulty;
  document.getElementById('settingMovePreview').checked = s.movePreview;
  document.getElementById('settingAutoSave').checked = s.autoSave;
  document.getElementById('settingConfirmAttack').checked = s.confirmAttack;
  document.getElementById('settingHighContrast').checked = s.highContrast;
  document.getElementById('settingColorBlind').value = s.colorBlind;
  document.getElementById('settingLargeUI').checked = s.largeUI;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', initGame);

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (gameState.settings.autoSave && gameState.phase === 'playing' && gameState.scenario) {
    const saves = getSaves();
    const autoSave = saves.find(s => s.scenario === gameState.scenario.id && s.name.startsWith('Auto'));
    if (!autoSave || gameState.turn > autoSave.turn) {
      const saveData = {
        id: Date.now(),
        slot: saves.length + 1,
        name: `Auto - ${gameState.scenario.name}`,
        scenario: gameState.scenario.id,
        turn: gameState.turn,
        date: new Date().toISOString(),
        won: false,
        data: gameState.serialize(),
      };
      if (autoSave) {
        const idx = saves.indexOf(autoSave);
        saves[idx] = saveData;
      } else {
        saves.push(saveData);
      }
      saveSaves(saves);
    }
  }
});