/**
 * The Last Light of Orio - Core Game Engine
 * A narrative adventure about memory, sacrifice, and what we choose to keep.
 */

// ============================================================================
// REACTIVE STATE MANAGEMENT
// ============================================================================

class ReactiveStore {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.subscribers = new Map();
    this.history = [];
    this.maxHistory = 50;
  }

  get(path) {
    const keys = path.split('.');
    let value = this.state;
    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }
    return value;
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.state;
    for (const key of keys) {
      if (!(key in target)) target[key] = {};
      target = target[key];
    }
    const oldValue = target[lastKey];
    if (oldValue === value) return false;
    
    target[lastKey] = value;
    this.history.push({ path, oldValue, newValue: value, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();
    
    this.notify(path, value, oldValue);
    return true;
  }

  update(path, updater) {
    const current = this.get(path);
    const next = updater(current);
    return this.set(path, next);
  }

  subscribe(path, callback) {
    if (!this.subscribers.has(path)) this.subscribers.set(path, new Set());
    this.subscribers.get(path).add(callback);
    return () => this.subscribers.get(path).delete(callback);
  }

  notify(path, newValue, oldValue) {
    const exact = this.subscribers.get(path);
    if (exact) exact.forEach(cb => cb(newValue, oldValue, path));
    
    // Notify parent paths
    const keys = path.split('.');
    for (let i = keys.length - 1; i > 0; i--) {
      const parentPath = keys.slice(0, i).join('.');
      const parentSubs = this.subscribers.get(parentPath);
      if (parentSubs) {
        const parentValue = this.get(parentPath);
        parentSubs.forEach(cb => cb(parentValue, undefined, parentPath));
      }
    }
    
    // Notify wildcard
    const wild = this.subscribers.get('*');
    if (wild) wild.forEach(cb => cb(this.state, undefined, '*'));
  }

  getSnapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }

  loadSnapshot(snapshot) {
    this.state = JSON.parse(JSON.stringify(snapshot));
    this.notify('*', this.state, undefined);
  }
}

// ============================================================================
// GAME STATE INITIALIZATION
// ============================================================================

const createInitialState = () => ({
  // Meta
  version: 1,
  currentChapter: 0,
  currentScene: 'prologue',
  playtime: 0,
  lastSave: null,
  
  // Protagonist
  protagonist: {
    name: 'Orio',
    title: 'Keeper of the Last Archive',
    flaw: 'Cannot let go — hoards memories others would release',
    want: 'To preserve every memory before the Forgetting consumes all',
    need: 'To accept that some things must be forgotten for new growth'
  },
  
  // Resources
  resources: {
    memory: 12,      // Memory Fragments - currency for recall, trade, abilities
    vitality: 100,   // Physical health
    resolve: 100     // Mental resistance against the Forgetting
  },
  
  // Relationships (0-100, 50 = neutral)
  relationships: {
    elara: { value: 65, status: 'trusted', arc: 'mentor', revealed: true },
    // Elara - Former Keeper, now fading. Taught Orio. Wants him to succeed her properly.
    cinder: { value: 35, status: 'strained', arc: 'rival', revealed: true },
    // Cinder - Scavenger who burns memories for fuel. Pragmatic, sees Orio as naive.
    miren: { value: 50, status: 'neutral', arc: 'ward', revealed: false },
    // Miren - Young archivist Orio found. Innocent, curious. Represents what could be saved.
    the_archivist: { value: 40, status: 'neutral', arc: 'antagonist', revealed: false },
    // The Archivist - Ancient entity that manages the Forgetting. Not evil, but inevitable.
    silas: { value: 55, status: 'neutral', arc: 'ally', revealed: true },
    // Silas - Memory merchant. Trades in fragments. Knows more than he says.
  },
  
  // Inventory
  inventory: {
    items: [
      { id: 'ledger', name: 'Keeper\'s Ledger', type: 'tool', description: 'Records every memory stored, traded, or lost. Bound to your soul.', equipped: true, quantity: 1, properties: { insight: true } },
      { id: 'ember', name: 'Dying Ember', type: 'consumable', description: 'A fragment of the First Fire. Can illuminate one lost memory.', equipped: false, quantity: 3, properties: { restore: 15 } },
      { id: 'key_ash', name: 'Key of Ash', type: 'key', description: 'Opens the vault beneath the library. Warm to the touch.', equipped: false, quantity: 1, properties: {} },
      { id: 'vial_tears', name: 'Vial of Silent Tears', type: 'artifact', description: 'Collected from those who chose to forget. Glows near hidden truths.', equipped: false, quantity: 1, properties: { reveal: true } },
      { id: 'mask_keeper', name: 'Mask of the Keeper', type: 'armor', description: 'Worn by every Keeper. Protects the mind from the Forgetting.', equipped: true, quantity: 1, properties: { resolveBonus: 10 } },
    ],
    capacity: 20
  },
  
  // Quests
  quests: {
    main: {
      id: 'main_quest',
      title: 'The Last Light',
      description: 'The Archive burns. The Forgetting accelerates. You must reach the Vault before the Final Watch.',
      chapter: 1,
      objectives: [
        { id: 'obj1', text: 'Secure the Central Atrium', completed: false },
        { id: 'obj2', text: 'Find Elara in the Stacks', completed: false },
        { id: 'obj3', text: 'Retrieve the Vault Key from Cinder', completed: false },
        { id: 'obj4', text: 'Descend to the Vault', completed: false },
        { id: 'obj5', text: 'Choose what to save', completed: false }
      ]
    },
    side: [
      {
        id: 'side_miren',
        title: 'The Apprentice\'s Burden',
        description: 'Miren carries a memory that isn\'t hers. Help her understand it.',
        chapter: 1,
        objectives: [
          { id: 'm1', text: 'Speak with Miren in the Reading Room', completed: false },
          { id: 'm2', text: 'Use the Ember to reveal the memory', completed: false },
          { id: 'm3', text: 'Decide the memory\'s fate', completed: false }
        ],
        rewards: { memory: 5, relationship: { miren: 15 } }
      },
      {
        id: 'side_silas',
        title: 'Merchant\'s Secret',
        description: 'Silas offers a trade: a forbidden memory for the location of a hidden cache.',
        chapter: 1,
        objectives: [
          { id: 's1', text: 'Meet Silas at the Exchange', completed: false },
          { id: 's2', text: 'Negotiate or refuse the trade', completed: false }
        ],
        rewards: { memory: 8, item: 'map_hidden' }
      }
    ]
  },
  
  // Journal entries
  journal: [
    {
      id: 'j1',
      title: 'Appointment',
      chapter: 1,
      timestamp: 'Cycle 847, First Watch',
      text: 'The Council appointed me Keeper three cycles ago. Elara stepped down — she said the Forgetting took her hands first, then her name. I didn\'t believe her until I found her ledger entry: "Day 1: I forgot the color of my mother\'s eyes. Day 47: I forgot I had a mother."',
      unread: false,
      tags: ['elara', 'personal']
    },
    {
      id: 'j2',
      title: 'The Ember',
      chapter: 1,
      timestamp: 'Cycle 847, Second Watch',
      text: 'Found a Dying Ember in the restricted section. It whispers when I hold it — not words, but feelings. Warmth. Regret. The smell of burning paper. Three left in the Archive. The Council says they\'re dangerous. Elara said they\'re necessary.',
      unread: false,
      tags: ['artifact', 'lore']
    }
  ],
  
  // Codex entries
  codex: [
    {
      id: 'c1',
      title: 'The Forgetting',
      category: 'Phenomena',
      text: 'A gradual erosion of collective memory. Begins with trivial details — the taste of rain, a childhood friend\'s middle name — and progresses to core identity. No known cause. No known cure. Only the Keepers\' Archives slow its spread.',
      unlocked: true
    },
    {
      id: 'c2',
      title: 'Memory Fragments',
      category: 'Resources',
      text: 'Crystallized memories, extracted via ritual or found in the world. Used as currency, fuel for Keeper abilities, and anchors against the Forgetting. Fragments degrade over time unless stabilized in a Ledger.',
      unlocked: true
    },
    {
      id: 'c3',
      title: 'The Vault',
      category: 'Locations',
      text: 'The deepest chamber of the Archive. Said to contain the First Memory — the origin of all consciousness. No Keeper has reached it in three generations. The Key of Ash is required. Its location was lost with Keeper Varen.',
      unlocked: true
    },
    {
      id: 'c4',
      title: 'The Archivist',
      category: 'Entities',
      text: 'An ancient presence that tends the Forgetting. Not malevolent — gardeners do not hate the weeds they pull. Speaks in the voice of your own forgotten thoughts. Some Keepers negotiate. All eventually fail.',
      unlocked: false
    }
  ],
  
  // Flags for choice consequences
  flags: {
    // Chapter 1
    atrium_secured: false,
    elara_found: false,
    elara_trusted: true,
    cinder_negotiated: false,
    cinder_intimidated: false,
    cinder_befriended: false,
    miren_memory_revealed: false,
    miren_memory_kept: false,
    miren_memory_burned: false,
    silas_traded: false,
    silas_refused: false,
    vault_reached: false,
    vault_choice: null, // 'all', 'some', 'one', 'none'
    
    // Cross-chapter
    elara_sacrificed: false,
    cinder_allied: false,
    miren_trained: false,
    archivist_spoken: false,
    
    // Ending determinants
    memories_preserved: 0,
    memories_lost: 0,
    relationships_kept: 0,
    self_sacrificed: false
  },
  
  // Scene stack for nested interactions
  sceneStack: [],
  
  // Settings
  settings: {
    musicVolume: 70,
    sfxVolume: 80,
    textSpeed: 3,
    autoSave: true,
    reducedMotion: false,
    highContrast: false
  }
});

// ============================================================================
// GAME ENGINE
// ============================================================================

class GameEngine {
  constructor() {
    this.store = new ReactiveStore(createInitialState());
    this.currentNarrativeIndex = 0;
    this.narrativeQueue = [];
    this.isTyping = false;
    this.typewriterSpeed = 30;
    this.audioContext = null;
    this.musicNodes = new Map();
    this.initAudio();
    this.bindStore();
    try {
      this.initUI();
    } catch (e) {
      console.error('initUI failed:', e);
      // Fallback: ensure title screen is visible
      const titleScreen = document.getElementById('title-screen');
      if (titleScreen) titleScreen.classList.add('active');
    }
    this.generateAtmosphere();
  }

  // --------------------------------------------------------------------------
  // AUDIO ENGINE (Procedural Synthesis)
  // --------------------------------------------------------------------------
  
  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3;
      this.musicGain = this.audioContext.createGain();
      this.musicGain.connect(this.masterGain);
      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.connect(this.masterGain);
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  resumeAudio() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playTone(frequency, duration, type = 'sine', volume = 0.1, when = 0) {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(this.sfxGain);
    const startTime = this.audioContext.currentTime + when;
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  playChord(frequencies, duration, type = 'sine', volume = 0.08) {
    frequencies.forEach((f, i) => this.playTone(f, duration, type, volume, i * 0.05));
  }

  playSFX(name) {
    const vol = this.store.get('settings.sfxVolume') / 100 * 0.3;
    switch (name) {
      case 'click':
        this.playTone(800, 0.05, 'square', vol * 0.5);
        break;
      case 'hover':
        this.playTone(1200, 0.03, 'sine', vol * 0.3);
        break;
      case 'choice':
        this.playChord([440, 554, 659], 0.3, 'sine', vol);
        break;
      case 'memory':
        this.playChord([523, 659, 784, 1047], 0.5, 'sine', vol * 0.8);
        break;
      case 'warning':
        this.playTone(220, 0.2, 'sawtooth', vol);
        break;
      case 'save':
        this.playChord([659, 880, 1047], 0.2, 'triangle', vol);
        break;
      case 'transition':
        this.playChord([220, 165, 110], 0.8, 'sine', vol * 0.6);
        break;
      case 'heartbeat':
        this.playTone(60, 0.1, 'sine', vol);
        setTimeout(() => this.playTone(60, 0.1, 'sine', vol), 150);
        break;
    }
  }

  startMusic(track) {
    if (!this.audioContext) return;
    this.stopMusic();
    const vol = this.store.get('settings.musicVolume') / 100 * 0.2;
    
    // Procedural ambient music based on track
    const tracks = {
      title: { base: 110, intervals: [0, 7, 12, 19], tempo: 8000 },
      chapter1: { base: 82, intervals: [0, 5, 10, 15], tempo: 10000 },
      tension: { base: 165, intervals: [0, 3, 7, 10], tempo: 4000 },
      vault: { base: 55, intervals: [0, 7, 12, 14], tempo: 15000 },
      ending: { base: 130, intervals: [0, 4, 7, 11], tempo: 12000 }
    };
    
    const config = tracks[track] || tracks.chapter1;
    let noteIndex = 0;
    
    const playNote = () => {
      if (!this.musicNodes.has(track)) return;
      const freq = config.base * Math.pow(2, config.intervals[noteIndex % config.intervals.length] / 12);
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = vol * 0.3;
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      // Fade out
      gain.gain.setValueAtTime(vol * 0.3, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 3);
      osc.stop(this.audioContext.currentTime + 3.1);
      noteIndex++;
      this.musicNodes.get(track) = setTimeout(playNote, config.tempo);
    };
    
    playNote();
    this.musicNodes.set(track, true);
  }

  stopMusic() {
    this.musicNodes.forEach((_, track) => {
      this.musicNodes.set(track, false);
    });
  }

  setMusicVolume(vol) {
    if (this.musicGain) this.musicGain.gain.value = vol / 100 * 0.3;
  }

  setSFXVolume(vol) {
    if (this.sfxGain) this.sfxGain.gain.value = vol / 100 * 0.3;
  }

  // --------------------------------------------------------------------------
  // STORE BINDINGS
  // --------------------------------------------------------------------------
  
  bindStore() {
    // Resources
    this.store.subscribe('resources.memory', (v) => this.updateResourceDisplay('memory', v));
    this.store.subscribe('resources.vitality', (v) => this.updateResourceDisplay('vitality', v));
    this.store.subscribe('resources.resolve', (v) => this.updateResourceDisplay('resolve', v));
    
    // Relationships
    this.store.subscribe('relationships', () => this.renderRelationships());
    
    // Inventory
    this.store.subscribe('inventory.items', () => this.renderInventory());
    
    // Quests
    this.store.subscribe('quests', () => this.renderQuests());
    
    // Journal
    this.store.subscribe('journal', () => this.renderJournal());
    
    // Codex
    this.store.subscribe('codex', () => this.renderCodex());
    
    // Flags for dynamic content
    this.store.subscribe('flags', () => this.checkFlagDependentContent());
    
    // Settings
    this.store.subscribe('settings.musicVolume', (v) => this.setMusicVolume(v));
    this.store.subscribe('settings.sfxVolume', (v) => this.setSFXVolume(v));
    this.store.subscribe('settings.textSpeed', (v) => {
      this.typewriterSpeed = [60, 40, 30, 20, 10][v - 1] || 30;
    });
    this.store.subscribe('settings.reducedMotion', (v) => {
      document.documentElement.style.setProperty('--transition-fast', v ? '0ms' : '120ms');
      document.documentElement.style.setProperty('--transition-med', v ? '0ms' : '280ms');
      document.documentElement.style.setProperty('--transition-slow', v ? '0ms' : '500ms');
    });
    this.store.subscribe('settings.highContrast', (v) => {
      document.body.classList.toggle('high-contrast', v);
    });
  }

  // --------------------------------------------------------------------------
  // UI INITIALIZATION
  // --------------------------------------------------------------------------
  
  initUI() {
    // Screen elements
    this.screens = {
      title: document.getElementById('title-screen'),
      chapter: document.getElementById('chapter-screen'),
      game: document.getElementById('game-screen'),
      credits: document.getElementById('credits-screen'),
      epilogue: document.getElementById('epilogue-screen')
    };
    
    // Modals
    this.modals = {
      pause: document.getElementById('pause-modal'),
      saveLoad: document.getElementById('save-load-modal'),
      settings: document.getElementById('settings-modal'),
      dialogue: document.getElementById('dialogue-modal')
    };
    
    // Game content areas
    this.gameContent = document.getElementById('game-content');
    this.continueBtn = document.getElementById('btn-continue-narrative');
    this.locationDisplay = document.getElementById('location-display');
    this.timeDisplay = document.getElementById('time-display');
    
    // Sidebar panels
    this.panels = {
      journal: document.getElementById('panel-journal'),
      relationships: document.getElementById('panel-relationships'),
      inventory: document.getElementById('panel-inventory'),
      quests: document.getElementById('panel-quests'),
      codex: document.getElementById('panel-codex')
    };
    
    this.journalEntriesEl = document.getElementById('journal-entries');
    this.relationshipsListEl = document.getElementById('relationships-list');
    this.inventoryGridEl = document.getElementById('inventory-grid');
    this.questsListEl = document.getElementById('quests-list');
    this.codexEntriesEl = document.getElementById('codex-entries');
    
    // Toast container
    this.toastContainer = document.getElementById('toast-container');
    
    // Transition
    this.transitionOverlay = document.getElementById('transition-overlay');
    this.transitionText = document.getElementById('transition-text');
    
    // Button bindings
    this.bindButtons();
    
    // Keyboard shortcuts
    this.bindKeyboard();
    
    // Tab switching
    this.bindTabs();
    
    // Settings sliders
    this.bindSettings();
    
    // Check for saves
    this.checkSaves();
    
    // Show title screen
    this.showScreen('title');
    this.startMusic('title');
  }

  bindButtons() {
    // Title screen
    this.bind('btn-new-game', () => this.newGame());
    this.bind('btn-continue', () => this.loadLatestSave());
    this.bind('btn-settings-title', () => this.openModal('settings'));
    this.bind('btn-credits-title', () => this.showScreen('credits'));
    
    // Chapter screen
    this.bind('btn-proceed-chapter', () => this.startChapter());
    
    // Game header
    this.bind('btn-pause', () => this.openModal('pause'));
    
    // Game footer
    this.bind('btn-save-quick', () => this.quickSave());
    this.bind('btn-load-quick', () => this.openModal('saveLoad'));
    this.bind('btn-settings-game', () => this.openModal('settings'));
    this.bind('btn-continue-narrative', () => this.advanceNarrative());
    
    // Pause modal
    this.bind('btn-pause-close', () => this.closeModal('pause'));
    this.bind('btn-resume', () => this.closeModal('pause'));
    this.bind('btn-save-menu', () => { this.closeModal('pause'); this.openModal('saveLoad'); });
    this.bind('btn-load-menu', () => { this.closeModal('pause'); this.openModal('saveLoad'); });
    this.bind('btn-settings-pause', () => { this.closeModal('pause'); this.openModal('settings'); });
    this.bind('btn-main-menu', () => this.returnToTitle());
    
    // Save/Load modal
    this.bind('btn-sl-close', () => this.closeModal('saveLoad'));
    this.bind('btn-sl-cancel', () => this.closeModal('saveLoad'));
    document.getElementById('sl-body').addEventListener('click', (e) => {
      const slot = e.target.closest('.save-slot');
      if (slot) this.handleSaveSlotClick(parseInt(slot.dataset.slot));
    });
    
    // Settings modal
    this.bind('btn-settings-close', () => this.closeModal('settings'));
    this.bind('btn-settings-done', () => this.closeModal('settings'));
    
    // Dialogue modal - handled dynamically
    
    // Add hover sounds
    document.querySelectorAll('.btn, .choice-btn, .dialogue-option, .sidebar-tab, .save-slot').forEach(el => {
      el.addEventListener('mouseenter', () => this.playSFX('hover'));
      el.addEventListener('click', () => this.playSFX('click'));
    });
  }

  bind(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Escape closes modals or pauses
      if (e.key === 'Escape') {
        if (this.isModalOpen('dialogue')) return; // Don't close dialogue with Esc
        if (this.isModalOpen('pause')) this.closeModal('pause');
        else if (this.isModalOpen('saveLoad')) this.closeModal('saveLoad');
        else if (this.isModalOpen('settings')) this.closeModal('settings');
        else if (this.currentScreen === 'game') this.openModal('pause');
      }
      
      // Number keys for choices (1-9)
      if (this.currentScreen === 'game' && !this.isAnyModalOpen()) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9) {
          const choices = this.gameContent.querySelectorAll('.choice-btn:not(.unavailable)');
          if (choices[num - 1]) choices[num - 1].click();
        }
      }
      
      // Tab switching with Ctrl+1-5
      if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabs = ['journal', 'relationships', 'inventory', 'quests', 'codex'];
        this.switchTab(tabs[parseInt(e.key) - 1]);
      }
      
      // Space/Enter to continue narrative
      if ((e.key === ' ' || e.key === 'Enter') && this.currentScreen === 'game' && !this.isAnyModalOpen()) {
        if (this.continueBtn.style.display !== 'none') {
          this.advanceNarrative();
        }
      }
      
      // Quick save/load
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (this.currentScreen === 'game') this.quickSave();
      }
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        if (this.currentScreen === 'game') this.openModal('saveLoad');
      }
    });
  }

  bindTabs() {
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.panel));
    });
  }

  bindSettings() {
    const musicSlider = document.getElementById('setting-music');
    const sfxSlider = document.getElementById('setting-sfx');
    const textSpeedSlider = document.getElementById('setting-text-speed');
    
    musicSlider.addEventListener('input', (e) => {
      document.getElementById('music-value').textContent = e.target.value + '%';
      this.store.set('settings.musicVolume', parseInt(e.target.value));
    });
    
    sfxSlider.addEventListener('input', (e) => {
      document.getElementById('sfx-value').textContent = e.target.value + '%';
      this.store.set('settings.sfxVolume', parseInt(e.target.value));
    });
    
    textSpeedSlider.addEventListener('input', (e) => {
      const labels = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast'];
      document.getElementById('text-speed-value').textContent = labels[parseInt(e.target.value) - 1];
      this.store.set('settings.textSpeed', parseInt(e.target.value));
    });
    
    document.getElementById('setting-autosave').addEventListener('change', (e) => {
      this.store.set('settings.autoSave', e.target.checked);
    });
    
    document.getElementById('setting-reduced-motion').addEventListener('change', (e) => {
      this.store.set('settings.reducedMotion', e.target.checked);
    });
    
    document.getElementById('setting-high-contrast').addEventListener('change', (e) => {
      this.store.set('settings.highContrast', e.target.checked);
    });
    
    // Initialize from store
    musicSlider.value = this.store.get('settings.musicVolume');
    sfxSlider.value = this.store.get('settings.sfxVolume');
    textSpeedSlider.value = this.store.get('settings.textSpeed');
    document.getElementById('setting-autosave').checked = this.store.get('settings.autoSave');
    document.getElementById('setting-reduced-motion').checked = this.store.get('settings.reducedMotion');
    document.getElementById('setting.highContrast').checked = this.store.get('settings.highContrast');
  }

  // --------------------------------------------------------------------------
  // SCREEN MANAGEMENT
  // --------------------------------------------------------------------------
  
  currentScreen = 'title';
  
  showScreen(screenName) {
    Object.values(this.screens).forEach(s => s?.classList.remove('active'));
    this.screens[screenName]?.classList.add('active');
    this.currentScreen = screenName;
  }

  isModalOpen(name) {
    return this.modals[name].classList.contains('active');
  }

  isAnyModalOpen() {
    return Object.values(this.modals).some(m => m.classList.contains('active'));
  }

  openModal(name) {
    this.resumeAudio();
    this.modals[name].classList.add('active');
    // Focus first focusable element
    setTimeout(() => {
      const focusable = this.modals[name].querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }, 50);
  }

  closeModal(name) {
    this.playSFX('click');
    this.modals[name].classList.remove('active');
  }

  async transition(text, duration = 1000) {
    this.transitionText.textContent = text;
    this.transitionOverlay.classList.add('active');
    await this.sleep(duration);
    this.transitionOverlay.classList.remove('active');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --------------------------------------------------------------------------
  // GAME FLOW
  // --------------------------------------------------------------------------
  
  newGame() {
    this.playSFX('choice');
    this.store.loadSnapshot(createInitialState());
    this.bindStore(); // Re-bind after reset
    this.showChapterScreen(1);
  }

  showChapterScreen(chapter) {
    const chapters = [
      { num: 'One', title: 'The Ash Library', subtitle: 'The last archive burns. The Keeper watches. A single choice remains.' },
      { num: 'Two', title: 'The Hollow Stacks', subtitle: 'Deeper now. The memories grow strange. Something watches from between the shelves.' },
      { num: 'Three', title: 'The Vault of First Light', subtitle: 'The origin awaits. But the Archivist tends the threshold. What will you trade?' },
      { num: 'Final', title: 'The Last Light of Orio', subtitle: 'The choice is made. The light flickers. What remains when memory fails?' }
    ];
    
    const ch = chapters[chapter - 1] || chapters[0];
    document.getElementById('chapter-number').textContent = `Chapter ${ch.num}`;
    document.getElementById('chapter-title').textContent = ch.title;
    document.getElementById('chapter-subtitle').textContent = ch.subtitle;
    
    this.store.set('currentChapter', chapter);
    this.showScreen('chapter');
    this.stopMusic();
    this.playSFX('transition');
  }

  startChapter() {
    this.playSFX('choice');
    this.showScreen('game');
    this.currentNarrativeIndex = 0;
    this.narrativeQueue = [];
    this.loadChapterContent(this.store.get('currentChapter'));
  }

  loadChapterContent(chapter) {
    this.updateLocationDisplay();
    this.updateTimeDisplay();
    this.renderAllSidebars();
    
    const content = this.getChapterNarrative(chapter);
    this.queueNarrative(content);
    this.processNarrativeQueue();
  }

  getChapterNarrative(chapter) {
    const narratives = {
      1: this.getChapter1Narrative(),
      2: this.getChapter2Narrative(),
      3: this.getChapter3Narrative(),
      4: this.getChapter4Narrative()
    };
    return narratives[chapter] || [];
  }

  // ============================================================================
  // CHAPTER 1: THE ASH LIBRARY
  // ============================================================================
  
  getChapter1Narrative() {
    const flags = this.store.get('flags');
    return [
      {
        type: 'narrative',
        text: `The Ash Library burns. Not with flame — with <span class="emphasis">absence</span>. Shelves that held centuries crumble into gray dust. The Forgetting accelerates.`,
        delay: 0
      },
      {
        type: 'narrative',
        text: `You are Orio, Keeper of the Last Archive. Your hands tremble as they always do at the Third Watch. The Ledger at your hip pulses — thirteen fragments remain. Thirteen memories you've carved from the chaos.`,
        delay: 1
      },
      {
        type: 'narrative',
        text: `Elara is somewhere in the Stacks. She stepped down as Keeper three cycles ago, but she never truly left. No Keeper does. The role seeps into bone.`,
        delay: 2
      },
      {
        type: 'narrative',
        text: `Cinder waits at the Exchange. The scavenger trades memories for fuel, burns the rest. You've negotiated before. Never liked it. Never had choice.`,
        delay: 3
      },
      {
        type: 'narrative',
        text: `And Miren — the girl you found in the Reading Room, clutching a memory that wasn't hers. She's young. Too young for this place.`,
        delay: 4
      },
      {
        type: 'narrative',
        choices: [
          { id: 'secure_atrium', text: 'Secure the Central Atrium first. Contain the spread.', cost: { vitality: 10 }, req: {} },
          { id: 'find_elara', text: 'Find Elara in the Stacks. She knows the Vault\'s location.', cost: { memory: 2 }, req: {} },
          { id: 'confront_cinder', text: 'Confront Cinder at the Exchange. The Key of Ash is yours by right.', cost: { resolve: 15 }, req: {} },
          { id: 'check_miren', text: 'Check on Miren in the Reading Room. The memory she carries...', cost: { memory: 1 }, req: { 'flags.miren_memory_revealed': false } }
        ],
        context: 'The Atrium burns. Where do you go first?'
      }
    ];
  }

  // ============================================================================
  // CHAPTER 2: THE HOLLOW STACKS
  // ============================================================================
  
  getChapter2Narrative() {
    return [
      {
        type: 'narrative',
        text: `The Stacks breathe. Not air — <span class="emphasis">memory</span>. Each aisle exhales fragments of lives: a first kiss, a last breath, the taste of snow on a tongue that hasn't existed for centuries.`,
        delay: 0
      },
      {
        type: 'narrative',
        text: `Deeper now. The Forgetting doesn't just erase — it <span class="danger-text">replaces</span>. False memories bloom like fungus in the gaps. You've seen Keepers lose themselves to phantoms.`,
        delay: 1
      },
      {
        type: 'narrative',
        text: `Elara waits at the junction of Aisles 7 and 13. Her Ledger floats beside her, pages turning without hands. She looks... thinner. Less substantial.`,
        delay: 2
      },
      {
        type: 'dialogue',
        speaker: 'Elara',
        portrait: '👁️',
        text: 'You came. Good. The Vault key — Cinder has it. But the price has changed.',
        options: [
          { id: 'elara_trust', text: '[TRUST] "What price?"', trait: 'COMPASSION', effects: { relationship: { elara: 10 } } },
          { id: 'elara_demand', text: '[DEMAND] "She has no right. Tell me where she hides it."', trait: 'AUTHORITY', effects: { relationship: { elara: -5 }, resources: { resolve: -10 } } },
          { id: 'elara_memory', text: '[SPEND MEMORY] Offer a fragment for the truth.', cost: { memory: 3 }, trait: 'SACRIFICE', effects: { relationship: { elara: 15 }, resources: { memory: -3 } } }
        ]
      },
      {
        type: 'narrative',
        text: `The junction shudders. Shelves collapse inward. Something <span class="emphasis">watches</span> from the space between forgetting and remembering.`,
        delay: 3
      },
      {
        type: 'choices',
        context: 'The Stacks destabilize. Choose your path:',
        choices: [
          { id: 'stacks_deep', text: 'Press deeper into the Stacks. The Vault lies below.', cost: { vitality: 15 }, req: {} },
          { id: 'stacks_elara', text: 'Stay with Elara. She\'s fading — you can anchor her.', cost: { memory: 5, resolve: 10 }, req: { 'flags.elara_trusted': true } },
          { id: 'stacks_cinder', text: 'Return to the Exchange. Force Cinder\'s hand.', cost: { resolve: 20 }, req: {} },
          { id: 'stacks_investigate', text: 'Investigate the watcher. The false memories have a source.', cost: { memory: 3 }, req: {} }
        ]
      }
    ];
  }

  // ============================================================================
  // CHAPTER 3: THE VAULT OF FIRST LIGHT
  // ============================================================================
  
  getChapter3Narrative() {
    return [
      {
        type: 'narrative',
        text: `The Vault door yawns open. The Key of Ash dissolves in the lock — its purpose fulfilled, its memory spent.`,
        delay: 0
      },
      {
        type: 'narrative',
        text: `Inside: not gold, not jewels. <span class="emphasis">Memories</span>. Millions. The First Memory floats at the center — a single moment of pure awareness, the instant consciousness woke in the universe.`,
        delay: 1
      },
      {
        type: 'narrative',
        text: `But you're not alone. The Archivist manifests from shadow and silence. It wears the faces of everyone you've forgotten.`,
        delay: 2
      },
      {
        type: 'dialogue',
        speaker: 'The Archivist',
        portrait: '∞',
        text: "Every Keeper reaches this moment. Every Keeper chooses. What will you save, Orio? The world's memories? Your own? The girl's? The mentor's? The rival's? You cannot hold all.",
        options: [
          { id: 'archivist_all', text: '[IMPOSSIBLE] "All of them."', trait: 'DEFIANCE', req: { 'resources.memory': 50 }, effects: { special: 'attempt_all' } },
          { id: 'archivist_world', text: 'The world\'s memories. The collective.', trait: 'DUTY', effects: { flags: { vault_choice: 'all' } } },
          { id: 'archivist_personal', text: 'My own. And those I love.', trait: 'SELFISH', effects: { flags: { vault_choice: 'some' } } },
          { id: 'archivist_one', text: 'Just one. The First Memory.', trait: 'WISDOM', effects: { flags: { vault_choice: 'one' } } },
          { id: 'archivist_none', text: 'Nothing. Let the Forgetting take its course.', trait: 'ACCEPTANCE', effects: { flags: { vault_choice: 'none' } } }
        ]
      }
    ];
  }

  // ============================================================================
  // CHAPTER 4: EPILOGUE / ENDING
  // ============================================================================
  
  getChapter4Narrative() {
    const choice = this.store.get('flags.vault_choice');
    const relationships = this.store.get('relationships');
    const flags = this.store.get('flags');
    
    // Calculate ending based on choices
    let ending = this.calculateEnding(choice, relationships, flags);
    
    return [
      {
        type: 'narrative',
        text: ending.narrative,
        delay: 0
      },
      {
        type: 'epilogue',
        text: ending.epilogue,
        choices: ending.choices
      }
    ];
  }

  calculateEnding(choice, relationships, flags) {
    const elara = relationships.elara?.value || 0;
    const cinder = relationships.cinder?.value || 0;
    const miren = relationships.miren?.value || 0;
    const silas = relationships.silas?.value || 0;
    
    let narrative = '';
    let epilogue = '';
    let choices = [];
    
    switch (choice) {
      case 'all':
        narrative = `You reach for everything. The First Memory surges through you — every life, every moment, all at once. Your body cannot contain it. Your mind fractures. But for one perfect instant, <span class="emphasis">nothing is forgotten</span>.`;
        epilogue = `The Archive stands. The Forgetting halts. But the Keeper's chair is empty. They say on quiet nights, you can hear a voice in the Stacks — reciting every memory, one by one, so none are lost. Elara visits. She smiles. Cinder brings fuel but leaves it unburned. Miren becomes the new Keeper, guided by a whisper only she can hear.`;
        choices = [
          { id: 'restart', text: 'Begin again', action: 'restart' },
          { id: 'credits', text: 'View credits', action: 'credits' }
        ];
        break;
        
      case 'some':
        narrative = `You choose the ones you love. Elara's face — whole again. Miren's laughter. Even Cinder's grudging respect. The First Memory burns, and you feed it your chosen few. The rest... the rest drift away like ash on wind.`;
        epilogue = `The Archive survives, diminished. The Forgetting slows but doesn't stop. Elara fades peacefully, her last memory yours. Miren grows into her role, carrying the ones you saved. Cinder still burns memories, but now she saves one fragment per thousand — the ones that remind her of you. Silas tells your story to travelers, embellishing. You remain, Keeper eternal, watching over your small, perfect collection.`;
        choices = [
          { id: 'restart', text: 'Begin again', action: 'restart' },
          { id: 'credits', text: 'View credits', action: 'credits' }
        ];
        break;
        
      case 'one':
        narrative = `You choose the First Memory alone. The origin. The spark. Everything else — Elara's smile, Miren's curiosity, Cinder's fire, your own name — feeds the flame. The Archive becomes a beacon. The Forgetting pauses, confused by such concentrated memory.`;
        epilogue = `The First Memory burns eternal at the Vault's heart. The Archive becomes a lighthouse for lost minds. Elara's ghost tends the flame. Miren studies its light, learning to kindle new memories from the old. Cinder's scavengers pilgrimage to its warmth. Silas writes a new ledger: "Here lies the Keeper who chose the beginning over the end." Your name is forgotten. The light remains.`;
        choices = [
          { id: 'restart', text: 'Begin again', action: 'restart' },
          { id: 'credits', text: 'View credits', action: 'credits' }
        ];
        break;
        
      case 'none':
      default:
        narrative = `You choose nothing. You step back. The First Memory dims, and you do not feed it. The Archivist nods — the first expression you've seen on its borrowed faces. The Forgetting rushes in like a tide.`;
        epilogue = `The Archive falls. But slowly. Gracefully. Elara holds your hand as you both fade. Miren escapes with a single Ember, carrying the Keeper's legacy to a new world. Cinder watches the library burn, and for the first time, she weeps. Silas records the final entry: "The Last Keeper chose release. The cycle turns." Somewhere, a child finds a glowing fragment in ash. The story begins again.`;
        choices = [
          { id: 'restart', text: 'Begin again', action: 'restart' },
          { id: 'credits', text: 'View credits', action: 'credits' }
        ];
        break;
    }
    
    return { narrative, epilogue, choices };
  }

  // ============================================================================
  // NARRATIVE PROCESSING
  // ============================================================================
  
  queueNarrative(blocks) {
    this.narrativeQueue = [...blocks];
    this.currentNarrativeIndex = 0;
  }

  async processNarrativeQueue() {
    while (this.currentNarrativeIndex < this.narrativeQueue.length) {
      const block = this.narrativeQueue[this.currentNarrativeIndex];
      await this.renderNarrativeBlock(block);
      this.currentNarrativeIndex++;
      
      // If block has choices/dialogue, wait for player input
      if (block.type === 'choices' || block.type === 'dialogue') {
        this.showContinueButton(false);
        return; // Wait for player choice
      }
    }
    // Queue exhausted
    this.showContinueButton(true);
  }

  async renderNarrativeBlock(block) {
    switch (block.type) {
      case 'narrative':
        await this.renderNarrativeText(block.text, block.delay || 0);
        break;
      case 'choices':
        this.renderChoices(block.choices, block.context);
        break;
      case 'dialogue':
        this.openDialogue(block);
        break;
      case 'epilogue':
        this.showEpilogue(block.text, block.choices);
        break;
    }
  }

  async renderNarrativeText(text, delayIndex = 0) {
    const div = document.createElement('div');
    div.className = `narrative-block delay-${Math.min(delayIndex, 3)}`;
    div.innerHTML = `<p class="narrative-text">${text}</p>`;
    this.gameContent.appendChild(div);
    
    // Scroll to bottom smoothly
    div.scrollIntoView({ behavior: this.store.get('settings.reducedMotion') ? 'auto' : 'smooth' });
    
    // Small delay for pacing
    await this.sleep(200 + delayIndex * 150);
  }

  renderChoices(choices, context) {
    const container = document.createElement('div');
    container.className = 'choice-set';
    
    if (context) {
      const ctx = document.createElement('p');
      ctx.className = 'small';
      ctx.style.marginBottom = '0.75rem';
      ctx.textContent = context;
      container.appendChild(ctx);
    }
    
    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.dataset.choiceId = choice.id;
      btn.tabIndex = 0;
      
      let costHtml = '';
      if (choice.cost) {
        const costs = Object.entries(choice.cost).map(([k, v]) => {
          const icons = { memory: '◈', vitality: '◆', resolve: '◇' };
          const names = { memory: 'Fragments', vitality: 'Vitality', resolve: 'Resolve' };
          const warning = this.store.get(`resources.${k}`) < v ? ' warning' : '';
          return `<span class="choice-cost${warning}">${icons[k]} ${v} ${names[k]}</span>`;
        }).join(' ');
        costHtml = `<div style="margin-top: 0.5rem;">${costs}</div>`;
      }
      
      if (choice.req && !this.checkRequirements(choice.req)) {
        btn.classList.add('unavailable');
        btn.title = 'Requirements not met';
      }
      
      btn.innerHTML = `${choice.text}${costHtml}`;
      btn.addEventListener('click', () => this.handleChoice(choice));
      container.appendChild(btn);
    });
    
    this.gameContent.appendChild(container);
    container.scrollIntoView({ behavior: 'smooth' });
  }

  checkRequirements(req) {
    for (const [key, value] of Object.entries(req)) {
      if (key.startsWith('resources.')) {
        const resource = key.split('.')[1];
        if (this.store.get(`resources.${resource}`) < value) return false;
      } else if (key.startsWith('flags.')) {
        if (this.store.get(key) !== value) return false;
      }
    }
    return true;
  }

  handleChoice(choice) {
    this.playSFX('choice');
    
    // Apply costs
    if (choice.cost) {
      for (const [resource, amount] of Object.entries(choice.cost)) {
        this.store.update(`resources.${resource}`, v => Math.max(0, v - amount));
      }
    }
    
    // Apply effects
    if (choice.effects) {
      if (choice.effects.relationship) {
        for (const [char, change] of Object.entries(choice.effects.relationship)) {
          this.modifyRelationship(char, change);
        }
      }
      if (choice.effects.resources) {
        for (const [res, change] of Object.entries(choice.effects.resources)) {
          this.store.update(`resources.${res}`, v => Math.max(0, v + change));
        }
      }
      if (choice.effects.flags) {
        for (const [flag, value] of Object.entries(choice.effects.flags)) {
          this.store.set(`flags.${flag}`, value);
        }
      }
      if (choice.effects.special === 'attempt_all') {
        this.handleAttemptAll();
      }
    }
    
    // Mark flags based on choice
    this.store.set(`flags.${choice.id}`, true);
    
    // Update quest objectives
    this.updateQuestsForChoice(choice.id);
    
    // Remove choice UI
    const choiceSet = this.gameContent.querySelector('.choice-set');
    if (choiceSet) choiceSet.remove();
    
    // Continue narrative
    this.currentNarrativeIndex++;
    this.processNarrativeQueue();
  }

  handleAttemptAll() {
    // Dramatic sequence for attempting the impossible
    this.store.update('resources.memory', v => v - 50);
    this.store.update('resources.vitality', v => v - 40);
    this.store.update('resources.resolve', v => v - 40);
    this.showToast('You reach for everything...', 'warning');
    // The narrative will handle the consequence
  }

  updateQuestsForChoice(choiceId) {
    const quests = this.store.get('quests');
    const updateQuest = (quest) => {
      quest.objectives.forEach(obj => {
        if (obj.id === choiceId || obj.id.replace('obj', '') === choiceId || obj.id === `m${choiceId}` || obj.id === `s${choiceId}`) {
          obj.completed = true;
        }
      });
    };
    
    if (quests.main) updateQuest(quests.main);
    quests.side.forEach(updateQuest);
    
    this.store.set('quests', quests); // Trigger re-render
  }

  openDialogue(dialogueData) {
    const modal = this.modals.dialogue;
    document.getElementById('dialogue-speaker').textContent = dialogueData.speaker;
    document.getElementById('dialogue-portrait').textContent = dialogueData.portrait || '◆';
    document.getElementById('dialogue-text').innerHTML = dialogueData.text;
    
    const optionsContainer = document.getElementById('dialogue-options');
    optionsContainer.innerHTML = '';
    
    dialogueData.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-option';
      btn.dataset.optionId = opt.id;
      btn.role = 'option';
      btn.tabIndex = 0;
      
      let reqMet = true;
      if (opt.req) {
        reqMet = this.checkRequirements(opt.req);
      }
      if (!reqMet) btn.classList.add('unavailable');
      
      let costHtml = '';
      if (opt.cost) {
        costHtml = Object.entries(opt.cost).map(([k, v]) => 
          `<span class="choice-cost">◈ ${v}</span>`
        ).join(' ');
      }
      
      btn.innerHTML = `
        ${opt.trait ? `<span class="option-trait">${opt.trait}</span>` : ''}
        ${opt.text}
        ${costHtml}
      `;
      
      btn.addEventListener('click', () => this.handleDialogueChoice(opt, dialogueData));
      optionsContainer.appendChild(btn);
    });
    
    this.openModal('dialogue');
  }

  handleDialogueChoice(option, dialogueData) {
    this.playSFX('choice');
    
    // Apply costs
    if (option.cost) {
      for (const [resource, amount] of Object.entries(option.cost)) {
        this.store.update(`resources.${resource}`, v => Math.max(0, v - amount));
      }
    }
    
    // Apply effects
    if (option.effects) {
      if (option.effects.relationship) {
        for (const [char, change] of Object.entries(option.effects.relationship)) {
          this.modifyRelationship(char, change);
        }
      }
      if (option.effects.resources) {
        for (const [res, change] of Object.entries(option.effects.resources)) {
          this.store.update(`resources.${res}`, v => Math.max(0, v + change));
        }
      }
      if (option.effects.flags) {
        for (const [flag, value] of Object.entries(option.effects.flags)) {
          this.store.set(`flags.${flag}`, value);
        }
      }
    }
    
    this.store.set(`flags.${option.id}`, true);
    this.updateQuestsForChoice(option.id);
    
    this.closeModal('dialogue');
    this.currentNarrativeIndex++;
    this.processNarrativeQueue();
  }

  showEpilogue(text, choices) {
    this.showScreen('epilogue');
    document.getElementById('epilogue-text').innerHTML = text;
    
    const container = document.getElementById('epilogue-choices');
    container.innerHTML = '';
    
    choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.textContent = choice.text;
      btn.addEventListener('click', () => this.handleEpilogueChoice(choice.action));
      container.appendChild(btn);
    });
  }

  handleEpilogueChoice(action) {
    switch (action) {
      case 'restart':
        this.returnToTitle();
        break;
      case 'credits':
        this.showScreen('credits');
        break;
    }
  }

  advanceNarrative() {
    if (this.currentNarrativeIndex < this.narrativeQueue.length) {
      this.processNarrativeQueue();
    }
  }

  showContinueButton(show) {
    this.continueBtn.style.display = show ? 'inline-flex' : 'none';
  }

  // --------------------------------------------------------------------------
  // RELATIONSHIP SYSTEM
  // --------------------------------------------------------------------------
  
  modifyRelationship(character, change) {
    const rel = this.store.get(`relationships.${character}`);
    if (!rel) return;
    
    const newValue = Math.max(0, Math.min(100, rel.value + change));
    let status = rel.status;
    
    if (newValue >= 75) status = 'trusted';
    else if (newValue >= 50) status = 'neutral';
    else if (newValue >= 25) status = 'strained';
    else status = 'broken';
    
    this.store.set(`relationships.${character}.value`, newValue);
    this.store.set(`relationships.${character}.status`, status);
    
    this.showToast(`${this.getCharacterName(character)} relationship changed: ${change > 0 ? '+' : ''}${change}`, change > 0 ? 'success' : 'warning');
  }

  getCharacterName(id) {
    const names = {
      elara: 'Elara',
      cinder: 'Cinder',
      miren: 'Miren',
      the_archivist: 'The Archivist',
      silas: 'Silas'
    };
    return names[id] || id;
  }

  // --------------------------------------------------------------------------
  // RESOURCE DISPLAY
  // --------------------------------------------------------------------------
  
  updateResourceDisplay(resource, value) {
    const el = document.getElementById(`res-${resource}`);
    if (el) {
      el.textContent = value;
      // Animate change
      el.style.transform = 'scale(1.2)';
      el.style.color = 'var(--accent)';
      setTimeout(() => {
        el.style.transform = 'scale(1)';
        el.style.color = '';
      }, 200);
    }
  }

  // --------------------------------------------------------------------------
  // SIDEBAR RENDERING
  // --------------------------------------------------------------------------
  
  renderAllSidebars() {
    this.renderJournal();
    this.renderRelationships();
    this.renderInventory();
    this.renderQuests();
    this.renderCodex();
  }

  switchTab(tabName) {
    document.querySelectorAll('.sidebar-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
    
    const tab = document.getElementById(`tab-${tabName}`);
    const panel = document.getElementById(`panel-${tabName}`);
    if (tab) {
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    }
    if (panel) panel.classList.add('active');
  }

  renderJournal() {
    const entries = this.store.get('journal') || [];
    this.journalEntriesEl.innerHTML = entries.map(entry => `
      <div class="journal-entry ${entry.unread ? 'entry-unread' : ''}" data-id="${entry.id}">
        <div class="entry-title">${entry.title}</div>
        <div class="entry-preview">${entry.text.substring(0, 120)}...</div>
        <div class="entry-meta">${entry.timestamp} · Chapter ${entry.chapter} · ${entry.tags.join(', ')}</div>
      </div>
    `).join('');
  }

  renderRelationships() {
    const relationships = this.store.get('relationships') || {};
    this.relationshipsListEl.innerHTML = Object.entries(relationships).map(([id, rel]) => {
      if (!rel.revealed) return '';
      const statusClass = rel.status === 'strained' ? 'strained' : rel.status === 'broken' ? 'broken' : '';
      return `
        <div class="relationship-card">
          <div class="rel-header">
            <span class="rel-name">${this.getCharacterName(id)}</span>
            <span class="rel-status ${statusClass}">${rel.status}</span>
          </div>
          <div class="rel-bar"><div class="rel-fill" style="width: ${rel.value}%"></div></div>
          <div class="rel-desc">${this.getRelationshipDesc(id, rel.value, rel.arc)}</div>
        </div>
      `;
    }).join('');
  }

  getRelationshipDesc(id, value, arc) {
    const descriptions = {
      elara: {
        trusted: 'Former Keeper. Her memory frays but her guidance remains true.',
        neutral: 'Former Keeper. Distant now. The Forgetting takes more each cycle.',
        strained: 'Former Keeper. She questions your choices. The gap widens.',
        broken: 'Former Keeper. She no longer remembers your name.'
      },
      cinder: {
        trusted: 'Scavenger. Unexpected ally. Burns memories but saves the important ones.',
        neutral: 'Scavenger. Trades in memory and fuel. Pragmatic to a fault.',
        strained: 'Scavenger. Sees you as naive. The deals grow worse.',
        broken: 'Scavenger. Would burn your Ledger for kindling.'
      },
      miren: {
        trusted: 'Apprentice. Carries a foreign memory. Trusts you completely.',
        neutral: 'Apprentice. Found in the Reading Room. Curious, frightened.',
        strained: 'Apprentice. The memory she carries hurts her. She pulls away.',
        broken: 'Apprentice. Lost to the Forgetting. Another name in the ash.'
      },
      the_archivist: {
        trusted: 'The Forgetting\'s gardener. Speaks in your forgotten voice.',
        neutral: 'Ancient entity. Tends the erosion. Not cruel. Inevitable.',
        strained: 'The Forgetting accelerates in its presence.',
        broken: 'It wears your face now. You cannot tell which memories are yours.'
      },
      silas: {
        trusted: 'Memory merchant. Knows the Vault\'s secrets. Smiles too much.',
        neutral: 'Memory merchant. Trades fragments at the Exchange. Well-connected.',
        strained: 'Merchant. Prices rise when you approach. Something changed.',
        broken: 'Merchant. Vanished. His stall empty. A single fragment remains: your name.'
      }
    };
    return descriptions[id]?.[value >= 75 ? 'trusted' : value >= 50 ? 'neutral' : value >= 25 ? 'strained' : 'broken'] || '';
  }

  renderInventory() {
    const items = this.store.get('inventory.items') || [];
    this.inventoryGridEl.innerHTML = items.map(item => `
      <div class="inv-item ${item.equipped ? 'equipped' : ''}" data-id="${item.id}" title="${item.description}">
        <div class="inv-icon">${this.getItemIcon(item.type)}</div>
        <div class="inv-name">${item.name}</div>
        <div class="inv-type">${item.type}</div>
        ${item.quantity > 1 ? `<div class="inv-count">×${item.quantity}</div>` : ''}
      </div>
    `).join('');
  }

  getItemIcon(type) {
    const icons = {
      tool: '📖',
      consumable: '✦',
      key: '🗝️',
      artifact: '🔮',
      armor: '🎭',
      weapon: '⚔️'
    };
    return icons[type] || '◆';
  }

  renderQuests() {
    const quests = this.store.get('quests');
    let html = '';
    
    if (quests.main) {
      html += this.renderQuestItem(quests.main, true);
    }
    
    if (quests.side) {
      quests.side.forEach(q => html += this.renderQuestItem(q, false));
    }
    
    this.questsListEl.innerHTML = html || '<p class="small" style="padding: 1rem;">No active pursuits.</p>';
  }

  renderQuestItem(quest, isMain) {
    const completed = quest.objectives.every(o => o.completed);
    return `
      <div class="quest-item ${quest.active ? 'active' : ''} ${completed ? 'completed' : ''}">
        <div class="quest-title">${quest.title} ${isMain ? '<span class="small" style="font-family: var(--font-ui); margin-left: 0.5rem;">[MAIN]</span>' : ''}</div>
        <div class="quest-desc">${quest.description}</div>
        <div class="quest-objectives">
          ${quest.objectives.map(obj => `
            <div class="quest-obj ${obj.completed ? 'completed' : ''}">${obj.text}</div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderCodex() {
    const entries = this.store.get('codex') || [];
    this.codexEntriesEl.innerHTML = entries.filter(e => e.unlocked).map(entry => `
      <div class="codex-entry" data-id="${entry.id}">
        <div class="entry-title">${entry.title}</div>
        <div class="entry-preview">${entry.text.substring(0, 150)}...</div>
        <div class="entry-meta">${entry.category}</div>
      </div>
    `).join('');
  }

  // --------------------------------------------------------------------------
  // LOCATION & TIME
  // --------------------------------------------------------------------------
  
  updateLocationDisplay() {
    const chapter = this.store.get('currentChapter');
    const locations = {
      1: 'The Ash Library — Central Atrium',
      2: 'The Hollow Stacks — Aisle 7/13 Junction',
      3: 'The Vault of First Light — Threshold',
      4: 'The Last Light — Choice Made'
    };
    this.locationDisplay.textContent = locations[chapter] || 'Unknown';
  }

  updateTimeDisplay() {
    const chapter = this.store.get('currentChapter');
    const watches = {
      1: 'Cycle 847 · Third Watch',
      2: 'Cycle 847 · Fourth Watch',
      3: 'Cycle 847 · Final Watch',
      4: 'Cycle 848 · First Light'
    };
    this.timeDisplay.textContent = watches[chapter] || 'Time Unknown';
  }

  // --------------------------------------------------------------------------
  // FLAG DEPENDENT CONTENT
  // --------------------------------------------------------------------------
  
  checkFlagDependentContent() {
    const flags = this.store.get('flags');
    
    // Unlock codex entries
    if (flags.archivist_spoken) {
      this.store.update('codex', arr => arr.map(e => e.id === 'c4' ? { ...e, unlocked: true } : e));
    }
    
    // Unlock miren relationship
    if (flags.miren_memory_revealed) {
      this.store.update('relationships.miren', r => ({ ...r, revealed: true }));
    }
    
    // Unlock archivist relationship
    if (flags.vault_choice) {
      this.store.update('relationships.the_archivist', r => ({ ...r, revealed: true }));
    }
  }

  // --------------------------------------------------------------------------
  // SAVE/LOAD SYSTEM
  // --------------------------------------------------------------------------
  
  async quickSave() {
    const slot = 0; // Quick save slot
    await this.saveGame(slot);
    this.showToast('Quick saved to slot 1', 'success');
    this.playSFX('save');
  }

  async saveGame(slot) {
    const state = this.store.getSnapshot();
    state.lastSave = new Date().toISOString();
    state.playtime = this.store.get('playtime') || 0;
    
    try {
      // Try IndexedDB first
      if (window.indexedDB) {
        await this.saveToIndexedDB(slot, state);
      } else {
        localStorage.setItem(`orio_save_${slot}`, JSON.stringify(state));
      }
      this.updateSaveSlotsUI();
    } catch (e) {
      console.error('Save failed:', e);
      this.showToast('Save failed', 'error');
    }
  }

  async saveToIndexedDB(slot, state) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OrioSaves', 1);
      request.onupgradeneeded = (e) => {
        e.target.result.createObjectStore('saves');
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('saves', 'readwrite');
        tx.objectStore('saves').put(state, `slot_${slot}`);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async loadGame(slot) {
    try {
      let state;
      if (window.indexedDB) {
        state = await this.loadFromIndexedDB(slot);
      } else {
        const data = localStorage.getItem(`orio_save_${slot}`);
        state = data ? JSON.parse(data) : null;
      }
      
      if (state) {
        this.store.loadSnapshot(state);
        this.bindStore();
        this.showToast('Game loaded', 'success');
        this.playSFX('save');
        this.closeModal('saveLoad');
        
        // Resume at correct chapter
        const chapter = state.currentChapter || 1;
        if (this.currentScreen !== 'game') {
          this.showChapterScreen(chapter);
          setTimeout(() => this.startChapter(), 500);
        } else {
          this.loadChapterContent(chapter);
        }
      }
    } catch (e) {
      console.error('Load failed:', e);
      this.showToast('Load failed', 'error');
    }
  }

  async loadFromIndexedDB(slot) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OrioSaves', 1);
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('saves', 'readonly');
        const getReq = tx.objectStore('saves').get(`slot_${slot}`);
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async loadLatestSave() {
    // Check all slots for most recent
    let latestSlot = 0;
    let latestTime = 0;
    
    for (let i = 0; i < 3; i++) {
      try {
        let state;
        if (window.indexedDB) {
          state = await this.loadFromIndexedDB(i);
        } else {
          const data = localStorage.getItem(`orio_save_${i}`);
          state = data ? JSON.parse(data) : null;
        }
        if (state && state.lastSave) {
          const time = new Date(state.lastSave).getTime();
          if (time > latestTime) {
            latestTime = time;
            latestSlot = i;
          }
        }
      } catch (e) {}
    }
    
    if (latestTime > 0) {
      await this.loadGame(latestSlot);
    }
  }

  checkSaves() {
    this.updateSaveSlotsUI();
    // Enable continue button if any save exists
    const hasSave = [0,1,2].some(i => localStorage.getItem(`orio_save_${i}`));
    document.getElementById('btn-continue').disabled = !hasSave;
  }

  updateSaveSlotsUI() {
    const container = document.getElementById('sl-body');
    const title = document.getElementById('sl-title');
    const isLoading = this.currentScreen === 'title';
    title.textContent = isLoading ? 'Load Game' : 'Save Game';
    
    for (let i = 0; i < 3; i++) {
      const slotEl = container.querySelector(`[data-slot="${i}"]`);
      if (!slotEl) continue;
      
      let state = null;
      try {
        const data = localStorage.getItem(`orio_save_${i}`);
        state = data ? JSON.parse(data) : null;
      } catch (e) {}
      
      if (state) {
        slotEl.classList.remove('empty');
        slotEl.querySelector('.save-slot-chapter').textContent = `Chapter ${state.currentChapter || 1}`;
        slotEl.querySelector('.save-slot-location').textContent = state.locationDisplay || 'Unknown';
        slotEl.querySelector('.save-slot-meta').innerHTML = `
          <span>${new Date(state.lastSave).toLocaleString()}</span>
          <span>${Math.floor((state.playtime || 0) / 60)}m playtime</span>
        `;
      } else {
        slotEl.classList.add('empty');
        slotEl.querySelector('.save-slot-chapter').textContent = 'Empty Slot';
        slotEl.querySelector('.save-slot-location').textContent = '—';
        slotEl.querySelector('.save-slot-meta').innerHTML = '<span>—</span><span>—</span>';
      }
    }
  }

  handleSaveSlotClick(slot) {
    const isLoading = this.currentScreen === 'title' || (this.modals.saveLoad.classList.contains('active') && document.getElementById('sl-title').textContent === 'Load Game');
    
    if (isLoading) {
      this.loadGame(slot);
    } else {
      this.saveGame(slot);
    }
  }

  returnToTitle() {
    this.stopMusic();
    this.startMusic('title');
    this.showScreen('title');
    this.checkSaves();
  }

  // --------------------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // --------------------------------------------------------------------------
  
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '✓',
      warning: '⚠',
      error: '✕',
      info: 'ℹ'
    };
    
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
    `;
    
    this.toastContainer.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('show'));
    
    // Auto remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --------------------------------------------------------------------------
  // ATMOSPHERE PARTICLES
  // --------------------------------------------------------------------------
  
  generateAtmosphere() {
    const container = document.getElementById('atmosphere');
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 15}s`;
      particle.style.animationDuration = `${10 + Math.random() * 10}s`;
      particle.style.opacity = '0';
      container.appendChild(particle);
    }
  }

  // --------------------------------------------------------------------------
  // PLAYTIME TRACKING
  // --------------------------------------------------------------------------
  
  startPlaytimeTracking() {
    this.playtimeInterval = setInterval(() => {
      this.store.update('playtime', (v || 0) + 1);
    }, 1000);
  }

  stopPlaytimeTracking() {
    if (this.playtimeInterval) clearInterval(this.playtimeInterval);
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

let game;

function initGame() {
  game = new GameEngine();
  game.startPlaytimeTracking();
  
  // Handle page unload
  window.addEventListener('beforeunload', () => {
    if (game.store.get('settings.autoSave')) {
      game.quickSave();
    }
    game.stopPlaytimeTracking();
  });
  
  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (game.store.get('settings.autoSave')) {
        game.quickSave();
      }
    } else {
      game.resumeAudio();
    }
  });
}

// Run immediately if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

// Export for debugging
window.__ORIO_GAME__ = () => game;