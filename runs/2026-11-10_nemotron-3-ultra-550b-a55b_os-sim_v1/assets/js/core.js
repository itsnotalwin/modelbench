/* ==========================================================================
   Lumina OS — Core System
   Window Manager, Virtual Filesystem, App Runtime, Settings, Sounds
   ========================================================================== */

// ==========================================================================
// Global State & Configuration
// ==========================================================================
const OS = {
  name: 'Lumina',
  version: '1.0.0',
  theme: 'light',
  wallpaper: 'aurora',
  user: { name: 'User', avatar: 'U' },
  
  windows: new Map(),
  windowsOrder: [], // z-order, front at end
  focusedWindowId: null,
  nextWindowId: 1,
  nextFileId: 1,
  
  filesystem: null,
  settings: null,
  audioContext: null,
  sounds: new Map(),
  
  notifications: [],
  notificationId: 1,
  
  dragState: null,
  resizeState: null,
  
  altTabActive: false,
  altTabSelection: 0,
  
  launcherOpen: false,
  notificationCenterOpen: false,
  lockScreenActive: true,
  
  mountedApps: new Map(),
  
  // Keyboard shortcuts
  shortcuts: new Map(),
  
  // Context menu
  contextMenuTarget: null,
};

// ==========================================================================
// Utility Functions
// ==========================================================================
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function throttle(fn, ms) {
  let last = 0; return (...a) => { const now = Date.now(); if (now - last >= ms) { last = now; fn(...a); } };
}

function formatTime(date = new Date(), options = {}) {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', ...options });
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => {
    const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": '\'' };
    return map[c];
  });
}

function createElement(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ==========================================================================
// Virtual Filesystem
// ==========================================================================
class VirtualFileSystem {
  constructor() {
    this.root = {
      id: 'root',
      name: 'Home',
      type: 'directory',
      parent: null,
      children: new Map(),
      created: Date.now(),
      modified: Date.now(),
      metadata: { system: true }
    };
    this.cwd = this.root;
    this.watchers = new Set();
    this.load();
  }

  // Path resolution
  resolvePath(path, from = this.cwd) {
    if (!path || path === '/') return this.root;
    if (path.startsWith('/')) from = this.root;
    
    const parts = path.split('/').filter(p => p && p !== '.');
    let current = from;
    
    for (const part of parts) {
      if (part === '..') {
        current = current.parent || this.root;
        continue;
      }
      const child = current.children.get(part);
      if (!child || child.type !== 'directory') return null;
      current = child;
    }
    return current;
  }

  resolveParent(path) {
    const parts = path.split('/').filter(p => p);
    if (parts.length === 0) return this.root;
    const name = parts.pop();
    const parent = this.resolvePath(parts.join('/'));
    return { parent, name };
  }

  // Node operations
  createNode(name, type, parent, content = '', metadata = {}) {
    const node = {
      id: `file-${OS.nextFileId++}`,
      name,
      type, // 'file' | 'directory'
      parent,
      children: type === 'directory' ? new Map() : null,
      content: type === 'file' ? content : null,
      created: Date.now(),
      modified: Date.now(),
      metadata: { ...metadata, size: type === 'file' ? new Blob([content]).size : 0 }
    };
    parent.children.set(name, node);
    parent.modified = Date.now();
    this.notify();
    return node;
  }

  mkdir(path) {
    const { parent, name } = this.resolveParent(path);
    if (!parent || parent.children.has(name)) throw new Error('Path exists or invalid');
    return this.createNode(name, 'directory', parent);
  }

  writeFile(path, content = '') {
    const { parent, name } = this.resolveParent(path);
    if (!parent) throw new Error('Invalid path');
    if (parent.children.has(name)) {
      const node = parent.children.get(name);
      if (node.type !== 'file') throw new Error('Not a file');
      node.content = content;
      node.modified = Date.now();
      node.metadata.size = new Blob([content]).size;
    } else {
      this.createNode(name, 'file', parent, content);
    }
    this.notify();
    return this.readFile(path);
  }

  readFile(path) {
    const node = this.resolvePath(path);
    if (!node || node.type !== 'file') throw new Error('File not found');
    return node.content;
  }

  delete(path) {
    const { parent, name } = this.resolveParent(path);
    if (!parent || !parent.children.has(name)) throw new Error('Not found');
    const node = parent.children.get(name);
    if (node.type === 'directory' && node.children.size > 0) {
      throw new Error('Directory not empty');
    }
    parent.children.delete(name);
    parent.modified = Date.now();
    this.notify();
  }

  rename(path, newName) {
    const { parent, name } = this.resolveParent(path);
    if (!parent || !parent.children.has(name)) throw new Error('Not found');
    if (parent.children.has(newName)) throw new Error('Name exists');
    const node = parent.children.get(name);
    parent.children.delete(name);
    node.name = newName;
    node.modified = Date.now();
    parent.children.set(newName, node);
    parent.modified = Date.now();
    this.notify();
    return node;
  }

  move(path, destPath) {
    const node = this.resolvePath(path);
    if (!node) throw new Error('Source not found');
    const dest = this.resolvePath(destPath);
    if (!dest || dest.type !== 'directory') throw new Error('Destination not a directory');
    if (dest === node || this.isDescendant(dest, node)) throw new Error('Invalid move');
    
    node.parent.children.delete(node.name);
    node.parent.modified = Date.now();
    node.parent = dest;
    node.modified = Date.now();
    dest.children.set(node.name, node);
    dest.modified = Date.now();
    this.notify();
  }

  copy(path, destPath, newName = null) {
    const node = this.resolvePath(path);
    if (!node) throw new Error('Source not found');
    const dest = this.resolvePath(destPath);
    if (!dest || dest.type !== 'directory') throw new Error('Destination not a directory');
    
    const copyNode = this.deepCopy(node, dest, newName);
    this.notify();
    return copyNode;
  }

  deepCopy(node, parent, newName = null) {
    const copy = {
      id: `file-${OS.nextFileId++}`,
      name: newName || node.name,
      type: node.type,
      parent,
      children: node.type === 'directory' ? new Map() : null,
      content: node.content,
      created: Date.now(),
      modified: Date.now(),
      metadata: { ...node.metadata }
    };
    parent.children.set(copy.name, copy);
    if (node.type === 'directory') {
      for (const child of node.children.values()) {
        this.deepCopy(child, copy);
      }
    }
    return copy;
  }

  isDescendant(parent, child) {
    let current = child.parent;
    while (current) {
      if (current === parent) return true;
      current = current.parent;
    }
    return false;
  }

  list(path = '.') {
    const dir = this.resolvePath(path);
    if (!dir || dir.type !== 'directory') return [];
    return [...dir.children.values()].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  getNode(path) {
    return this.resolvePath(path);
  }

  // Persistence
  serialize() {
    const serializeNode = (node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      content: node.content,
      created: node.created,
      modified: node.modified,
      metadata: node.metadata,
      children: node.type === 'directory' ? [...node.children.values()].map(serializeNode) : undefined
    });
    return { root: serializeNode(this.root), version: 1 };
  }

  deserialize(data) {
    const deserializeNode = (obj, parent = null) => {
      const node = {
        id: obj.id,
        name: obj.name,
        type: obj.type,
        parent,
        children: obj.type === 'directory' ? new Map() : null,
        content: obj.content,
        created: obj.created,
        modified: obj.modified,
        metadata: obj.metadata
      };
      if (obj.children) {
        for (const child of obj.children) {
          const c = deserializeNode(child, node);
          node.children.set(c.name, c);
        }
      }
      return node;
    };
    this.root = deserializeNode(data.root);
    this.cwd = this.root;
    OS.nextFileId = Math.max(OS.nextFileId, this.findMaxId(this.root) + 1);
  }

  findMaxId(node) {
    let max = parseInt(node.id.split('-')[1]) || 0;
    if (node.children) {
      for (const child of node.children.values()) {
        max = Math.max(max, this.findMaxId(child));
      }
    }
    return max;
  }

  save() {
    try {
      localStorage.setItem('lumina-fs', JSON.stringify(this.serialize()));
    } catch (e) {
      console.warn('Failed to save filesystem:', e);
    }
  }

  load() {
    try {
      const data = localStorage.getItem('lumina-fs');
      if (data) this.deserialize(JSON.parse(data));
    } catch (e) {
      console.warn('Failed to load filesystem:', e);
    }
    // Create default structure if empty
    if (this.root.children.size === 0) {
      this.createDefaults();
    }
  }

  createDefaults() {
    const docs = this.createNode('Documents', 'directory', this.root);
    const downloads = this.createNode('Downloads', 'directory', this.root);
    const pictures = this.createNode('Pictures', 'directory', this.root);
    const music = this.createNode('Music', 'directory', this.root);
    const projects = this.createNode('Projects', 'directory', this.root);
    
    this.createNode('Welcome.txt', 'file', docs, `Welcome to Lumina OS! 🌟

This is your virtual filesystem. It persists between sessions.

Try:
- Creating files and folders
- Opening them in the Text Editor
- Running commands in Terminal
- Drag & drop between apps

Your data is saved automatically to localStorage.`);
    
    this.createNode('readme.md', 'file', projects, `# Lumina OS Projects

Start building something amazing here.

## Ideas
- [ ] A personal website
- [ ] A small game
- [ ] A utility script
- [ ] Digital art`);

    this.save();
  }

  // Watchers
  watch(callback) {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }

  notify() {
    this.save();
    for (const cb of this.watchers) cb();
  }
}

// ==========================================================================
// Audio System
// ==========================================================================
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;
    this.volume = 0.5;
    this.sounds = new Map();
  }

  async init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = this.volume;
      
      // Generate system sounds procedurally
      await this.generateSounds();
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }

  async generateSounds() {
    const tones = {
      'click': { freq: 800, dur: 0.05, type: 'sine', gain: 0.1 },
      'pop': { freq: 600, dur: 0.08, type: 'sine', gain: 0.15, decay: 0.02 },
      'whoosh': { freq: 200, dur: 0.3, type: 'sawtooth', gain: 0.08, sweep: true },
      'chime': { freq: [523, 659, 784], dur: 0.5, type: 'sine', gain: 0.12 },
      'error': { freq: 200, dur: 0.2, type: 'square', gain: 0.15 },
      'success': { freq: [440, 554, 659], dur: 0.4, type: 'sine', gain: 0.12 },
      'notification': { freq: [880, 1108], dur: 0.3, type: 'sine', gain: 0.1 },
      'window-open': { freq: 400, dur: 0.15, type: 'sine', gain: 0.08, attack: 0.01 },
      'window-close': { freq: 300, dur: 0.1, type: 'sine', gain: 0.08 },
      'minimize': { freq: 500, dur: 0.08, type: 'sine', gain: 0.07 },
      'maximize': { freq: 600, dur: 0.1, type: 'sine', gain: 0.08 },
      'snap': { freq: 700, dur: 0.06, type: 'sine', gain: 0.09 },
      'boot': { freq: [220, 330, 440, 554, 659], dur: 1.5, type: 'sine', gain: 0.15 },
    };

    for (const [name, config] of Object.entries(tones)) {
      this.sounds.set(name, this.createTone(config));
    }
  }

  createTone(config) {
    return () => {
      if (!this.ctx || !this.enabled) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const now = this.ctx.currentTime;
      const freqs = Array.isArray(config.freq) ? config.freq : [config.freq];
      const dur = config.dur || 0.1;
      const type = config.type || 'sine';
      const gain = config.gain || 0.1;

      for (let i = 0; i < freqs.length; i++) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freqs[i];
        g.gain.value = 0;

        if (config.attack) {
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(gain / freqs.length, now + config.attack);
        } else {
          g.gain.setValueAtTime(gain / freqs.length, now);
        }

        if (config.sweep) {
          osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.3, now + dur);
        }

        if (config.decay) {
          g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        } else {
          g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        }

        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now + i * 0.05);
        osc.stop(now + dur + i * 0.05);
      }
    };
  }

  play(name) {
    const sound = this.sounds.get(name);
    if (sound) sound();
  }

  setVolume(vol) {
    this.volume = clamp(vol, 0, 1);
    if (this.masterGain) this.masterGain.gain.value = this.volume;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// ==========================================================================
// Settings Manager
// ==========================================================================
class SettingsManager {
  constructor() {
    this.defaults = {
      theme: 'light',
      wallpaper: 'aurora',
      animations: true,
      sounds: true,
      soundVolume: 0.5,
      autoSave: true,
      showDesktopIcons: true,
      taskbarPosition: 'bottom',
      launcherStyle: 'grid',
      language: 'en',
      timeFormat: '24h',
      reducedMotion: false,
      highContrast: false,
    };
    this.data = { ...this.defaults };
    this.listeners = new Map();
  }

  load() {
    try {
      const saved = localStorage.getItem('lumina-settings');
      if (saved) this.data = { ...this.defaults, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Settings load failed:', e);
    }
    this.apply();
  }

  save() {
    try {
      localStorage.setItem('lumina-settings', JSON.stringify(this.data));
    } catch (e) {
      console.warn('Settings save failed:', e);
    }
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    const old = this.data[key];
    this.data[key] = value;
    this.save();
    this.apply();
    this.emit(key, value, old);
  }

  apply() {
    // Theme
    document.documentElement.setAttribute('data-theme', this.data.theme);
    OS.theme = this.data.theme;

    // Wallpaper
    this.applyWallpaper(this.data.wallpaper);

    // Animations
    document.documentElement.style.setProperty('--motion-fast', this.data.animations ? '100ms' : '0ms');
    document.documentElement.style.setProperty('--motion-base', this.data.animations ? '160ms' : '0ms');
    document.documentElement.style.setProperty('--motion-slow', this.data.animations ? '240ms' : '0ms');
    document.documentElement.style.setProperty('--motion-slower', this.data.animations ? '320ms' : '0ms');
    document.documentElement.style.setProperty('--motion-slowest', this.data.animations ? '480ms' : '0ms');

    // Sounds
    if (OS.audio) {
      OS.audio.setEnabled(this.data.sounds);
      OS.audio.setVolume(this.data.soundVolume);
    }

    // Reduced motion
    if (this.data.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }

    // High contrast
    if (this.data.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Desktop icons
    $('#desktop-icons').style.display = this.data.showDesktopIcons ? 'grid' : 'none';

    // Taskbar position (simplified - just bottom for now)
  }

  applyWallpaper(name) {
    OS.wallpaper = name;
    const wallpaperEl = $('#wallpaper');
    const gradients = {
      'aurora': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      'ocean': 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)',
      'forest': 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)',
      'sunset': 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)',
      'midnight': 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
      'rose': 'linear-gradient(135deg, #9d174d 0%, #be185d 50%, #db2777 100%)',
      'amber': 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)',
      'emerald': 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
      'violet': 'linear-gradient(135deg, #3b0764 0%, #4c1d95 50%, #5b21b6 100%)',
      'slate': 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
    };
    wallpaperEl.style.setProperty('--wallpaper-url', gradients[name] || gradients.aurora);
  }

  on(key, callback) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key).add(callback);
    return () => this.listeners.get(key).delete(callback);
  }

  emit(key, value, old) {
    if (this.listeners.has(key)) {
      for (const cb of this.listeners.get(key)) cb(value, old);
    }
  }

  reset() {
    this.data = { ...this.defaults };
    this.save();
    this.apply();
  }

  export() {
    return JSON.stringify(this.data, null, 2);
  }

  import(json) {
    try {
      this.data = { ...this.defaults, ...JSON.parse(json) };
      this.save();
      this.apply();
      return true;
    } catch {
      return false;
    }
  }
}

// ==========================================================================
// Window Manager
// ==========================================================================
class WindowManager {
  constructor() {
    this.container = $('#windows-container');
    this.template = $('#window-template');
    this.zBase = 1000;
  }

  create(appId, options = {}) {
    const id = `win-${OS.nextWindowId++}`;
    const winEl = this.template.content.firstElementChild.cloneNode(true);
    winEl.id = id;
    winEl.dataset.appId = appId;
    winEl.dataset.instanceId = uid('inst');

    // Set initial position/size
    const width = options.width || 900;
    const height = options.height || 600;
    const x = options.x !== undefined ? options.x : (window.innerWidth - width) / 2 - (OS.windows.size * 20);
    const y = options.y !== undefined ? options.y : (window.innerHeight - height - 48) / 2 - (OS.windows.size * 20);

    winEl.style.width = `${width}px`;
    winEl.style.height = `${height}px`;
    winEl.style.left = `${clamp(x, 0, window.innerWidth - 100)}px`;
    winEl.style.top = `${clamp(y, 0, window.innerHeight - 48 - 100)}px`;

    // Title & Icon
    winEl.querySelector('.window-title-text').textContent = options.title || 'Window';
    if (options.icon) {
      winEl.querySelector('.window-icon').innerHTML = options.icon;
    }

    // App content container
    const contentEl = winEl.querySelector('.window-content');
    contentEl.dataset.appId = appId;

    // Event listeners
    this.bindWindowEvents(winEl);

    // Store window data
    const winData = {
      id,
      element: winEl,
      appId,
      instanceId: winEl.dataset.instanceId,
      title: options.title || 'Window',
      icon: options.icon,
      bounds: { x, y, width, height },
      maximized: false,
      minimized: false,
      focused: false,
      appInstance: null,
      state: {},
    };

    OS.windows.set(id, winData);
    OS.windowsOrder.push(id);
    this.container.appendChild(winEl);

    this.focus(id);
    this.updateTaskbar();

    if (OS.audio) OS.audio.play('window-open');

    return winData;
  }

  bindWindowEvents(winEl) {
    const titlebar = winEl.querySelector('.window-titlebar');
    const closeBtn = winEl.querySelector('.window-btn.close');
    const maxBtn = winEl.querySelector('.window-btn.maximize');
    const minBtn = winEl.querySelector('.window-btn.minimize');
    const handles = winEl.querySelectorAll('.resize-handle');

    // Focus on click
    winEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.window-btn') || e.target.closest('.resize-handle')) return;
      this.focus(winEl.id);
    });

    // Drag
    titlebar.addEventListener('mousedown', (e) => this.startDrag(winEl.id, e));
    titlebar.addEventListener('dblclick', () => this.toggleMaximize(winEl.id));

    // Buttons
    closeBtn.addEventListener('click', () => this.close(winEl.id));
    maxBtn.addEventListener('click', () => this.toggleMaximize(winEl.id));
    minBtn.addEventListener('click', () => this.minimize(winEl.id));

    // Resize
    handles.forEach(h => h.addEventListener('mousedown', (e) => this.startResize(winEl.id, e, h.dataset.dir)));

    // Prevent context menu on titlebar
    titlebar.addEventListener('contextmenu', e => e.preventDefault());
  }

  focus(id) {
    const win = OS.windows.get(id);
    if (!win || win.minimized) return;

    // Remove focus from previous
    if (OS.focusedWindowId && OS.focusedWindowId !== id) {
      const prev = OS.windows.get(OS.focusedWindowId);
      if (prev) {
        prev.element.classList.remove('focused');
        prev.focused = false;
      }
    }

    // Bring to front
    this.bringToFront(id);

    // Apply focus
    win.element.classList.add('focused');
    win.focused = true;
    OS.focusedWindowId = id;

    // Focus the content for keyboard
    win.element.focus();

    this.updateTaskbar();

    // Notify app
    if (win.appInstance && win.appInstance.onFocus) {
      win.appInstance.onFocus();
    }
  }

  bringToFront(id) {
    const idx = OS.windowsOrder.indexOf(id);
    if (idx > -1) {
      OS.windowsOrder.splice(idx, 1);
      OS.windowsOrder.push(id);
    }
    this.reorderZIndex();
  }

  reorderZIndex() {
    OS.windowsOrder.forEach((id, i) => {
      const win = OS.windows.get(id);
      if (win) win.element.style.zIndex = 1000 + i;
    });
  }

  close(id) {
    const win = OS.windows.get(id);
    if (!win) return;

    // Notify app
    if (win.appInstance && win.appInstance.onClose) {
      const shouldClose = win.appInstance.onClose();
      if (shouldClose === false) return;
    }

    // Cleanup
    if (win.appInstance && win.appInstance.destroy) {
      win.appInstance.destroy();
    }

    win.element.remove();
    OS.windows.delete(id);
    OS.windowsOrder = OS.windowsOrder.filter(w => w !== id);
    
    if (OS.focusedWindowId === id) {
      OS.focusedWindowId = null;
      // Focus next window
      const next = OS.windowsOrder[OS.windowsOrder.length - 1];
      if (next) this.focus(next);
    }

    this.updateTaskbar();
    if (OS.audio) OS.audio.play('window-close');
  }

  minimize(id) {
    const win = OS.windows.get(id);
    if (!win || win.minimized) return;

    win.minimized = true;
    win.element.classList.add('minimized');
    win.element.style.display = 'none';

    if (OS.focusedWindowId === id) {
      OS.focusedWindowId = null;
      const next = OS.windowsOrder[OS.windowsOrder.length - 2];
      if (next) this.focus(next);
    }

    this.updateTaskbar();
    if (OS.audio) OS.audio.play('minimize');
  }

  restore(id) {
    const win = OS.windows.get(id);
    if (!win || !win.minimized) return;

    win.minimized = false;
    win.element.style.display = 'flex';
    win.element.classList.remove('minimized');
    this.focus(id);
    this.updateTaskbar();
  }

  toggleMaximize(id) {
    const win = OS.windows.get(id);
    if (!win || win.minimized) return;

    if (win.maximized) {
      this.unmaximize(id);
    } else {
      this.maximize(id);
    }
  }

  maximize(id) {
    const win = OS.windows.get(id);
    if (!win || win.maximized) return;

    // Save bounds
    win.bounds = {
      x: parseFloat(win.element.style.left),
      y: parseFloat(win.element.style.top),
      width: parseFloat(win.element.style.width),
      height: parseFloat(win.element.style.height),
    };

    win.maximized = true;
    win.element.classList.add('maximized');
    win.element.style.left = '0';
    win.element.style.top = '0';
    win.element.style.width = '100vw';
    win.element.style.height = `calc(100vh - ${getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height').trim() || '48px'})`;
    win.element.querySelector('.window-btn.maximize').classList.add('maximized');

    if (OS.audio) OS.audio.play('maximize');
  }

  unmaximize(id) {
    const win = OS.windows.get(id);
    if (!win || !win.maximized) return;

    win.maximized = false;
    win.element.classList.remove('maximized');
    win.element.style.left = `${win.bounds.x}px`;
    win.element.style.top = `${win.bounds.y}px`;
    win.element.style.width = `${win.bounds.width}px`;
    win.element.style.height = `${win.bounds.height}px`;
    win.element.querySelector('.window-btn.maximize').classList.remove('maximized');

    if (OS.audio) OS.audio.play('window-open');
  }

  startDrag(id, e) {
    const win = OS.windows.get(id);
    if (!win || win.maximized || win.minimized) return;

    this.focus(id);

    OS.dragState = {
      windowId: id,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: parseFloat(win.element.style.left),
      startTop: parseFloat(win.element.style.top),
    };

    document.addEventListener('mousemove', this.onDragMove.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));
    document.body.style.userSelect = 'none';
    win.element.classList.add('dragging');
    e.preventDefault();
  }

  onDragMove(e) {
    if (!OS.dragState) return;
    const win = OS.windows.get(OS.dragState.windowId);
    if (!win) return this.onDragEnd(e);

    let x = OS.dragState.startLeft + (e.clientX - OS.dragState.startX);
    let y = OS.dragState.startTop + (e.clientY - OS.dragState.startY);

    // Snap to edges
    const snapThreshold = 20;
    const vw = window.innerWidth;
    const vh = window.innerHeight - 48; // taskbar
    const w = parseFloat(win.element.style.width);
    const h = parseFloat(win.element.style.height);
    let snapped = false;

    if (Math.abs(x) < snapThreshold) { x = 0; snapped = true; }
    if (Math.abs(y) < snapThreshold) { y = 0; snapped = true; }
    if (Math.abs(x + w - vw) < snapThreshold) { x = vw - w; snapped = true; }
    if (Math.abs(y + h - vh) < snapThreshold) { y = vh - h; snapped = true; }

    // Screen edge snap (half screen)
    if (Math.abs(x - vw / 2) < snapThreshold) { x = vw / 2; snapped = true; }
    if (y < snapThreshold && h > vh / 2) {
      // Top edge -> maximize
      this.maximize(OS.dragState.windowId);
      this.onDragEnd(e);
      return;
    }

    win.element.style.left = `${x}px`;
    win.element.style.top = `${y}px`;

    if (snapped && OS.audio) OS.audio.play('snap');
  }

  onDragEnd(e) {
    if (!OS.dragState) return;
    const win = OS.windows.get(OS.dragState.windowId);
    if (win) win.element.classList.remove('dragging');
    document.removeEventListener('mousemove', this.onDragMove.bind(this));
    document.removeEventListener('mouseup', this.onDragEnd.bind(this));
    document.body.style.userSelect = '';
    OS.dragState = null;
  }

  startResize(id, e, dir) {
    const win = OS.windows.get(id);
    if (!win || win.maximized || win.minimized) return;

    this.focus(id);

    const rect = win.element.getBoundingClientRect();
    OS.resizeState = {
      windowId: id,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height,
    };

    document.addEventListener('mousemove', this.onResizeMove.bind(this));
    document.addEventListener('mouseup', this.onResizeEnd.bind(this));
    document.body.style.userSelect = 'none';
    win.element.classList.add('resizing');
    e.preventDefault();
    e.stopPropagation();
  }

  onResizeMove(e) {
    if (!OS.resizeState) return;
    const win = OS.windows.get(OS.resizeState.windowId);
    if (!win) return this.onResizeEnd(e);

    const dx = e.clientX - OS.resizeState.startX;
    const dy = e.clientY - OS.resizeState.startY;

    let left = OS.resizeState.startLeft;
    let top = OS.resizeState.startTop;
    let width = OS.resizeState.startWidth;
    let height = OS.resizeState.startHeight;

    const minW = 320;
    const minH = 200;
    const maxW = window.innerWidth;
    const maxH = window.innerHeight - 48;

    if (OS.resizeState.dir.includes('e')) width = clamp(OS.resizeState.startWidth + dx, minW, maxW);
    if (OS.resizeState.dir.includes('w')) {
      width = clamp(OS.resizeState.startWidth - dx, minW, maxW);
      left = OS.resizeState.startLeft + (OS.resizeState.startWidth - width);
    }
    if (OS.resizeState.dir.includes('s')) height = clamp(OS.resizeState.startHeight + dy, minH, maxH);
    if (OS.resizeState.dir.includes('n')) {
      height = clamp(OS.resizeState.startHeight - dy, minH, maxH);
      top = OS.resizeState.startTop + (OS.resizeState.startHeight - height);
    }

    win.element.style.left = `${left}px`;
    win.element.style.top = `${top}px`;
    win.element.style.width = `${width}px`;
    win.element.style.height = `${height}px`;
  }

  onResizeEnd(e) {
    if (!OS.resizeState) return;
    const win = OS.windows.get(OS.resizeState.windowId);
    if (win) win.element.classList.remove('resizing');
    document.removeEventListener('mousemove', this.onResizeMove.bind(this));
    document.removeEventListener('mouseup', this.onResizeEnd.bind(this));
    document.body.style.userSelect = '';
    OS.resizeState = null;
  }

  updateTaskbar() {
    const container = $('#taskbar-apps');
    container.innerHTML = '';

    for (const id of OS.windowsOrder) {
      const win = OS.windows.get(id);
      if (!win || win.minimized) continue;

      const btn = document.createElement('button');
      btn.className = `taskbar-app${win.focused ? ' active' : ''}${!win.minimized ? ' running' : ''}`;
      btn.dataset.windowId = id;
      btn.setAttribute('aria-label', win.title);
      btn.innerHTML = win.icon || `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
      
      const title = document.createElement('span');
      title.className = 'taskbar-app-title';
      title.textContent = win.title;
      btn.appendChild(title);

      btn.addEventListener('click', () => {
        if (win.minimized) this.restore(id);
        else if (win.focused) this.minimize(id);
        else this.focus(id);
      });

      container.appendChild(btn);
    }
  }

  // Alt-Tab
  showAltTab() {
    OS.altTabActive = true;
    OS.altTabSelection = 0;
    const switcher = $('#alt-tab-switcher');
    switcher.removeAttribute('aria-hidden');
    this.updateAltTab();
  }

  hideAltTab() {
    OS.altTabActive = false;
    $('#alt-tab-switcher').setAttribute('aria-hidden', 'true');
  }

  nextAltTab() {
    const windows = OS.windowsOrder.filter(id => {
      const w = OS.windows.get(id);
      return w && !w.minimized;
    });
    if (windows.length === 0) return;
    OS.altTabSelection = (OS.altTabSelection + 1) % windows.length;
    this.updateAltTab();
  }

  prevAltTab() {
    const windows = OS.windowsOrder.filter(id => {
      const w = OS.windows.get(id);
      return w && !w.minimized;
    });
    if (windows.length === 0) return;
    OS.altTabSelection = (OS.altTabSelection - 1 + windows.length) % windows.length;
    this.updateAltTab();
  }

  selectAltTab() {
    const windows = OS.windowsOrder.filter(id => {
      const w = OS.windows.get(id);
      return w && !w.minimized;
    });
    if (windows[OS.altTabSelection]) {
      this.focus(windows[OS.altTabSelection]);
    }
    this.hideAltTab();
  }

  updateAltTab() {
    const list = $('#alt-tab-list');
    list.innerHTML = '';

    const windows = OS.windowsOrder.filter(id => {
      const w = OS.windows.get(id);
      return w && !w.minimized;
    }).reverse(); // Most recent first

    for (let i = 0; i < windows.length; i++) {
      const win = OS.windows.get(windows[i]);
      const item = document.createElement('button');
      item.className = `alt-tab-item${i === OS.altTabSelection ? ' selected' : ''}`;
      item.dataset.windowId = windows[i];
      item.innerHTML = `
        <div class="alt-tab-item-icon">${win.icon || '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>'}</div>
        <span class="alt-tab-item-label">${escapeHtml(win.title)}</span>
      `;
      item.addEventListener('click', () => {
        OS.altTabSelection = i;
        this.selectAltTab();
      });
      list.appendChild(item);
    }
  }

  // Get all windows for an app
  getAppWindows(appId) {
    return [...OS.windows.values()].filter(w => w.appId === appId);
  }

  // Cascade windows
  cascade() {
    let x = 50, y = 50;
    const offset = 30;
    for (const win of OS.windows.values()) {
      if (!win.minimized && !win.maximized) {
        win.element.style.left = `${x}px`;
        win.element.style.top = `${y}px`;
        x += offset;
        y += offset;
        if (x > window.innerWidth - 300) x = 50;
        if (y > window.innerHeight - 300) y = 50;
      }
    }
  }

  // Tile windows
  tile() {
    const windows = [...OS.windows.values()].filter(w => !w.minimized && !w.maximized);
    if (windows.length === 0) return;

    const cols = Math.ceil(Math.sqrt(windows.length));
    const rows = Math.ceil(windows.length / cols);
    const w = window.innerWidth / cols;
    const h = (window.innerHeight - 48) / rows;

    windows.forEach((win, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      win.element.style.left = `${col * w}px`;
      win.element.style.top = `${row * h}px`;
      win.element.style.width = `${w}px`;
      win.element.style.height = `${h}px`;
    });
  }
}

// ==========================================================================
// Notification System
// ==========================================================================
class NotificationSystem {
  constructor() {
    this.container = $('#notification-list');
    this.empty = $('#notification-empty');
    this.badge = $('#notification-badge');
    this.notifications = [];
  }

  show(title, body, options = {}) {
    const id = `notif-${OS.notificationId++}`;
    const notif = {
      id,
      title,
      body,
      time: Date.now(),
      read: false,
      appId: options.appId || 'system',
      icon: options.icon,
      actions: options.actions || [],
      persistent: options.persistent || false,
    };

    this.notifications.unshift(notif);
    this.render();
    this.updateBadge();

    // Play sound
    if (OS.audio && OS.settings.get('sounds')) {
      OS.audio.play('notification');
    }

    // Auto-dismiss non-persistent
    if (!notif.persistent) {
      setTimeout(() => this.dismiss(id), 8000);
    }

    return id;
  }

  dismiss(id) {
    const idx = this.notifications.findIndex(n => n.id === id);
    if (idx > -1) {
      this.notifications.splice(idx, 1);
      this.render();
      this.updateBadge();
    }
  }

  markRead(id) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.render();
    }
  }

  clearAll() {
    this.notifications = [];
    this.render();
    this.updateBadge();
  }

  updateBadge() {
    const unread = this.notifications.filter(n => !n.read).length;
    this.badge.textContent = unread > 99 ? '99+' : unread;
    this.badge.style.display = unread > 0 ? 'flex' : 'none';
  }

  render() {
    if (this.notifications.length === 0) {
      this.container.innerHTML = '';
      this.empty.hidden = false;
      return;
    }
    this.empty.hidden = true;

    this.container.innerHTML = this.notifications.map(n => `
      <div class="notification-item${n.read ? '' : ' unread'}" data-id="${n.id}">
        <div class="notification-item-icon">
          ${n.icon || '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'}
        </div>
        <div class="notification-item-content">
          <div class="notification-item-title">${escapeHtml(n.title)}</div>
          <div class="notification-item-body">${escapeHtml(n.body)}</div>
          <div class="notification-item-time">${this.formatTime(n.time)}</div>
        </div>
        <button class="notification-item-close" aria-label="Dismiss" data-id="${n.id}">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');

    // Event delegation
    this.container.onclick = (e) => {
      const closeBtn = e.target.closest('.notification-item-close');
      if (closeBtn) this.dismiss(closeBtn.dataset.id);
      
      const item = e.target.closest('.notification-item');
      if (item && !closeBtn) this.markRead(item.dataset.id);
    };
  }

  formatTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString();
  }
}

// ==========================================================================
// Launcher
// ==========================================================================
class Launcher {
  constructor() {
    this.el = $('#launcher');
    this.searchInput = $('#launcher-search');
    this.appsContainer = $('#launcher-apps');
    this.recentContainer = $('#launcher-recent');
    this.recentList = $('#launcher-recent-list');
    this.filesContainer = $('#launcher-files');
    this.filesList = $('#launcher-files-list');
    this.searchTimeout = null;
  }

  init() {
    this.renderApps();
    this.bindEvents();
  }

  bindEvents() {
    // Search
    this.searchInput.addEventListener('input', debounce(() => this.search(this.searchInput.value), 80));

    // Click backdrop to close
    this.el.querySelector('.launcher-backdrop').addEventListener('click', () => this.close());

    // Keyboard
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowDown') this.focusFirstResult();
    });

    // Power buttons
    $('#btn-lock').addEventListener('click', () => OS.lock());
    $('#btn-restart').addEventListener('click', () => OS.restart());
    $('#btn-shutdown').addEventListener('click', () => OS.shutdown());
  }

  open() {
    if (this.el.hasAttribute('aria-hidden')) {
      this.el.removeAttribute('aria-hidden');
      OS.launcherOpen = true;
      this.searchInput.value = '';
      this.search('');
      this.searchInput.focus();
      if (OS.audio) OS.audio.play('whoosh');
    }
  }

  close() {
    if (!this.el.hasAttribute('aria-hidden')) {
      this.el.setAttribute('aria-hidden', 'true');
      OS.launcherOpen = false;
      this.searchInput.blur();
    }
  }

  toggle() {
    if (this.el.hasAttribute('aria-hidden')) this.open();
    else this.close();
  }

  renderApps() {
    const apps = AppRegistry.getAll();
    this.appsContainer.innerHTML = apps.map(app => `
      <button class="launcher-app" data-app-id="${app.id}" aria-label="${escapeHtml(app.name)}">
        <div class="launcher-app-icon">${app.icon}</div>
        <span class="launcher-app-label">${escapeHtml(app.name)}</span>
      </button>
    `).join('');

    this.appsContainer.querySelectorAll('.launcher-app').forEach(btn => {
      btn.addEventListener('click', () => {
        AppRegistry.launch(btn.dataset.appId);
        this.close();
      });
    });
  }

  search(query) {
    const q = query.toLowerCase().trim();
    
    if (!q) {
      this.appsContainer.hidden = false;
      this.recentContainer.hidden = true;
      this.filesContainer.hidden = true;
      return;
    }

    this.appsContainer.hidden = true;
    
    // Search apps
    const apps = AppRegistry.search(q);
    if (apps.length > 0) {
      this.recentContainer.hidden = false;
      this.recentList.innerHTML = apps.map(app => `
        <button class="launcher-item" data-app-id="${app.id}">
          <div class="launcher-item-icon">${app.icon}</div>
          <div class="launcher-item-info">
            <span class="launcher-item-name">${escapeHtml(app.name)}</span>
            <span class="launcher-item-meta">Application</span>
          </div>
        </button>
      `).join('');
    } else {
      this.recentContainer.hidden = true;
    }

    // Search files
    const files = OS.filesystem.list('/').filter(f => 
      f.name.toLowerCase().includes(q) || (f.type === 'file' && f.content?.toLowerCase().includes(q))
    ).slice(0, 10);

    if (files.length > 0) {
      this.filesContainer.hidden = false;
      this.filesList.innerHTML = files.map(f => `
        <button class="launcher-item" data-path="${this.getPath(f)}">
          <div class="launcher-item-icon">${this.getFileIcon(f)}</div>
          <div class="launcher-item-info">
            <span class="launcher-item-name">${escapeHtml(f.name)}</span>
            <span class="launcher-item-meta">${f.type === 'directory' ? 'Folder' : 'File'}</span>
          </div>
        </button>
      `).join('');
    } else {
      this.filesContainer.hidden = true;
    }

    // Bind events
    this.recentList.querySelectorAll('[data-app-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        AppRegistry.launch(btn.dataset.appId);
        this.close();
      });
    });

    this.filesList.querySelectorAll('[data-path]').forEach(btn => {
      btn.addEventListener('click', () => {
        AppRegistry.launch('files', { path: btn.dataset.path });
        this.close();
      });
    });
  }

  focusFirstResult() {
    const first = this.el.querySelector('.launcher-app, .launcher-item');
    if (first) first.focus();
  }

  getPath(node) {
    let path = node.name;
    let current = node.parent;
    while (current && current !== OS.filesystem.root) {
      path = current.name + '/' + path;
      current = current.parent;
    }
    return '/' + path;
  }

  getFileIcon(node) {
    if (node.type === 'directory') {
      return `<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    }
    const ext = node.name.split('.').pop().toLowerCase();
    const icons = {
      txt: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      md: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      js: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      html: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      css: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      json: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      png: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      jpg: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      mp3: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    };
    return icons[ext] || '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  }
}

// ==========================================================================
// Context Menu Manager
// ==========================================================================
class ContextMenuManager {
  constructor() {
    this.el = $('#context-menu');
    this.target = null;
  }

  show(x, y, items, target = null) {
    this.target = target;
    this.el.innerHTML = items.map(item => {
      if (item === 'divider') return '<div class="context-menu-divider"></div>';
      if (item.section) return `<div class="context-menu-section">${escapeHtml(item.section)}</div>`;
      return `
        <button class="context-menu-item${item.disabled ? ' disabled' : ''}${item.danger ? ' danger' : ''}" 
                data-action="${escapeHtml(item.action)}" ${item.disabled ? 'disabled' : ''}>
          ${item.icon ? `<span class="context-menu-item-icon">${item.icon}</span>` : ''}
          <span>${escapeHtml(item.label)}</span>
          ${item.shortcut ? `<kbd class="context-menu-item-shortcut">${escapeHtml(item.shortcut)}</kbd>` : ''}
        </button>
      `;
    }).join('');

    // Position
    const rect = this.el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 10;
    if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 10;
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;

    this.el.removeAttribute('aria-hidden');
    
    // Events
    this.el.onclick = (e) => {
      const item = e.target.closest('.context-menu-item');
      if (item && !item.disabled) {
        const action = item.dataset.action;
        this.hide();
        if (item.onclick) item.onclick();
        if (this.target && this.target.onContextAction) {
          this.target.onContextAction(action, this.target);
        }
      }
    };
  }

  hide() {
    this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML = '';
    this.target = null;
  }

  // Desktop context menu
  showDesktop(x, y) {
    this.show(x, y, [
      { label: 'New Folder', action: 'new-folder', icon: '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' },
      { label: 'New File', action: 'new-file', icon: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
      'divider',
      { label: 'Paste', action: 'paste', shortcut: '⌘V', disabled: true },
      'divider',
      { label: 'Sort By', action: 'sort', section: true },
      { label: 'Name', action: 'sort-name' },
      { label: 'Size', action: 'sort-size' },
      { label: 'Date Modified', action: 'sort-date' },
      { label: 'Type', action: 'sort-type' },
      'divider',
      { label: 'Refresh', action: 'refresh', shortcut: '⌘R' },
      { label: 'Properties', action: 'properties' },
    ], { type: 'desktop' });
  }

  // File context menu
  showFile(x, y, file) {
    const isDir = file.type === 'directory';
    this.show(x, y, [
      { label: isDir ? 'Open' : 'Open With...', action: 'open', icon: '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' },
      { label: 'Duplicate', action: 'duplicate', shortcut: '⌘D', icon: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' },
      { label: 'Rename', action: 'rename', shortcut: 'Enter', icon: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5"/></svg>' },
      { label: 'Move To...', action: 'move', icon: '<svg viewBox="0 0 24 24"><path d="M19 17h2c.6 0 1-.4 1-1v-4c0-.6-.4-1-1-1H5c-.6 0-1 .4-1 1v4c0 .6.4 1 1 1h2"/><polyline points="12 3 17 8 12 13"/></svg>' },
      'divider',
      { label: 'Copy Path', action: 'copy-path', shortcut: '⌘⇧C' },
      { label: 'Get Info', action: 'info', shortcut: '⌘I' },
      'divider',
      { label: 'Delete', action: 'delete', danger: true, shortcut: '⌘⌫', icon: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' },
    ], { file });
  }

  // Window context menu (taskbar)
  showWindow(x, y, window) {
    this.show(x, y, [
      { label: window.minimized ? 'Restore' : 'Minimize', action: window.minimized ? 'restore' : 'minimize', shortcut: '⌘M' },
      { label: window.maximized ? 'Unmaximize' : 'Maximize', action: window.maximized ? 'unmaximize' : 'maximize' },
      'divider',
      { label: 'Move to Left', action: 'snap-left', shortcut: '⌘←' },
      { label: 'Move to Right', action: 'snap-right', shortcut: '⌘→' },
      'divider',
      { label: 'Close', action: 'close', danger: true, shortcut: '⌘W' },
    ], window);
  }
}

// ==========================================================================
// Tooltip Manager
// ==========================================================================
class TooltipManager {
  constructor() {
    this.el = $('#tooltip');
    this.timeout = null;
  }

  show(element, text) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      const rect = element.getBoundingClientRect();
      this.el.textContent = text;
      this.el.removeAttribute('aria-hidden');
      
      const tooltipRect = this.el.getBoundingClientRect();
      let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      let top = rect.top - tooltipRect.height - 8;
      
      if (left < 8) left = 8;
      if (left + tooltipRect.width > window.innerWidth - 8) left = window.innerWidth - tooltipRect.width - 8;
      if (top < 8) top = rect.bottom + 8;
      
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
    }, 500);
  }

  hide() {
    clearTimeout(this.timeout);
    this.el.setAttribute('aria-hidden', 'true');
  }
}

// ==========================================================================
// App Registry
// ==========================================================================
class AppRegistry {
  static apps = new Map();
  static instances = new Map();

  static register(app) {
    this.apps.set(app.id, app);
  }

  static get(id) {
    return this.apps.get(id);
  }

  static getAll() {
    return [...this.apps.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  static search(query) {
    const q = query.toLowerCase();
    return this.getAll().filter(app => 
      app.name.toLowerCase().includes(q) || 
      (app.keywords && app.keywords.some(k => k.toLowerCase().includes(q)))
    );
  }

  static launch(appId, options = {}) {
    const app = this.apps.get(appId);
    if (!app) {
      console.warn(`App not found: ${appId}`);
      return null;
    }

    // Check for single instance
    if (app.singleInstance) {
      const existing = OS.windowManager.getAppWindows(appId)[0];
      if (existing) {
        OS.windowManager.focus(existing.id);
        if (options.path && existing.appInstance && existing.appInstance.openPath) {
          existing.appInstance.openPath(options.path);
        }
        return existing;
      }
    }

    // Create window
    const win = OS.windowManager.create(appId, {
      title: options.title || app.name,
      icon: app.icon,
      width: options.width || app.width,
      height: options.height || app.height,
      x: options.x,
      y: options.y,
    });

    // Initialize app
    const instance = new app.class(win, options);
    win.appInstance = instance;
    this.instances.set(win.id, instance);

    if (instance.init) instance.init();

    return win;
  }

  static close(appId) {
    const windows = OS.windowManager.getAppWindows(appId);
    windows.forEach(w => OS.windowManager.close(w.id));
  }
}

// ==========================================================================
// Desktop Icons
// ==========================================================================
class DesktopIcons {
  constructor() {
    this.container = $('#desktop-icons');
    this.selected = new Set();
    this.dragSource = null;
  }

  init() {
    this.render();
    this.bindItemEvents();
    OS.filesystem.watch(() => this.render());
  }

  render() {
    if (!OS.settings.get('showDesktopIcons')) {
      this.container.style.display = 'none';
      return;
    }
    this.container.style.display = 'grid';

    const items = OS.filesystem.list('/');
    this.container.innerHTML = items.map(item => `
      <div class="desktop-icon${this.selected.has(item.id) ? ' selected' : ''}" 
           data-id="${item.id}" 
           data-name="${escapeHtml(item.name)}"
           data-type="${item.type}"
           tabindex="0" role="listitem" aria-label="${escapeHtml(item.name)}">
        <div class="desktop-icon-icon">${this.getIcon(item)}</div>
        <span class="desktop-icon-label">${escapeHtml(item.name)}</span>
      </div>
    `).join('');

    this.bindItemEvents();
  }

  getIcon(item) {
    if (item.type === 'directory') {
      return `<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    }
    const ext = item.name.split('.').pop().toLowerCase();
    const icons = {
      txt: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      md: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      js: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      html: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      css: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      json: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      png: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      jpg: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      mp3: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    };
    return icons[ext] || '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
  }

  bindItemEvents() {
    this.container.querySelectorAll('.desktop-icon').forEach(icon => {
      // Click
      icon.addEventListener('click', (e) => this.onClick(icon, e));
      // Double click
      icon.addEventListener('dblclick', (e) => this.onDoubleClick(icon, e));
      // Keyboard
      icon.addEventListener('keydown', (e) => this.onKeyDown(icon, e));
      // Context menu
      icon.addEventListener('contextmenu', (e) => this.onContextMenu(icon, e));
      // Drag start
      icon.addEventListener('dragstart', (e) => this.onDragStart(icon, e));
      icon.addEventListener('dragend', () => this.onDragEnd());
      // Drop events
      icon.addEventListener('dragover', (e) => e.preventDefault());
      icon.addEventListener('drop', (e) => this.onDrop(icon, e));
    });
  }

  onClick(icon, e) {
    const id = icon.dataset.id;
    if (e.metaKey || e.ctrlKey) {
      this.toggleSelect(id);
    } else if (e.shiftKey && this.lastSelected) {
      this.selectRange(this.lastSelected, id);
    } else {
      this.selectOnly(id);
    }
    this.lastSelected = id;
  }

  onDoubleClick(icon) {
    const type = icon.dataset.type;
    const name = icon.dataset.name;
    if (type === 'directory') {
      AppRegistry.launch('files', { path: '/' + name });
    } else {
      AppRegistry.launch('editor', { path: '/' + name });
    }
  }

  onKeyDown(icon, e) {
    const id = icon.dataset.id;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.onDoubleClick(icon);
    } else if (e.key === 'Delete') {
      this.deleteSelected();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.navigateSelection(e.key);
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      this.selectAll();
    }
  }

  onContextMenu(icon, e) {
    e.preventDefault();
    const file = OS.filesystem.getNode('/' + icon.dataset.name);
    if (file) OS.contextMenu.showFile(e.clientX, e.clientY, file);
  }

  onDragStart(icon, e) {
    this.dragSource = icon;
    icon.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', icon.dataset.id);
    if (OS.audio) OS.audio.play('click');
  }

  onDragEnd() {
    if (this.dragSource) this.dragSource.classList.remove('dragging');
    this.dragSource = null;
  }

  onDrop(target, e) {
    e.preventDefault();
    if (!this.dragSource || this.dragSource === target) return;
    
    const sourceId = this.dragSource.dataset.id;
    const targetId = target.dataset.id;
    const sourceFile = OS.filesystem.getNode('/' + this.dragSource.dataset.name);
    const targetFile = OS.filesystem.getNode('/' + target.dataset.name);

    if (sourceFile && targetFile && targetFile.type === 'directory') {
      try {
        OS.filesystem.move('/' + sourceFile.name, '/' + targetFile.name);
        if (OS.audio) OS.audio.play('pop');
      } catch (err) {
        console.error(err);
        if (OS.audio) OS.audio.play('error');
      }
    }
  }

  selectOnly(id) {
    this.selected.clear();
    this.selected.add(id);
    this.render();
  }

  toggleSelect(id) {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
    this.render();
  }

  selectRange(startId, endId) {
    const items = [...this.container.querySelectorAll('.desktop-icon')];
    const startIdx = items.findIndex(i => i.dataset.id === startId);
    const endIdx = items.findIndex(i => i.dataset.id === endId);
    if (startIdx === -1 || endIdx === -1) return;
    const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
    for (let i = min; i <= max; i++) this.selected.add(items[i].dataset.id);
    this.render();
  }

  selectAll() {
    const items = [...this.container.querySelectorAll('.desktop-icon')];
    items.forEach(i => this.selected.add(i.dataset.id));
    this.render();
  }

  deleteSelected() {
    for (const id of this.selected) {
      const icon = this.container.querySelector(`[data-id="${id}"]`);
      if (icon) {
        try {
          OS.filesystem.delete('/' + icon.dataset.name);
        } catch (e) { console.error(e); }
      }
    }
    this.selected.clear();
    if (OS.audio) OS.audio.play('pop');
  }

  navigateSelection(key) {
    const items = [...this.container.querySelectorAll('.desktop-icon')];
    if (items.length === 0) return;
    
    let currentIdx = -1;
    if (this.selected.size === 1) {
      currentIdx = items.findIndex(i => this.selected.has(i.dataset.id));
    }
    
    const cols = Math.floor(this.container.clientWidth / 96);
    let nextIdx = currentIdx;
    
    switch (key) {
      case 'ArrowRight': nextIdx = Math.min(currentIdx + 1, items.length - 1); break;
      case 'ArrowLeft': nextIdx = Math.max(currentIdx - 1, 0); break;
      case 'ArrowDown': nextIdx = Math.min(currentIdx + cols, items.length - 1); break;
      case 'ArrowUp': nextIdx = Math.max(currentIdx - cols, 0); break;
    }
    
    if (nextIdx !== currentIdx) {
      this.selectOnly(items[nextIdx].dataset.id);
      items[nextIdx].focus();
    }
  }

  getSelectedFiles() {
    return [...this.selected].map(id => {
      const icon = this.container.querySelector(`[data-id="${id}"]`);
      return icon ? OS.filesystem.getNode('/' + icon.dataset.name) : null;
    }).filter(Boolean);
  }
}

// ==========================================================================
// Main OS Initialization
// ==========================================================================
async function initOS() {
  console.log('🌟 Lumina OS initializing...');

  // Initialize core systems
  OS.filesystem = new VirtualFileSystem();
  OS.settings = new SettingsManager();
  OS.settings.load();
  OS.windowManager = new WindowManager();
  OS.notifications = new NotificationSystem();
  OS.launcher = new Launcher();
  OS.contextMenu = new ContextMenuManager();
  OS.tooltip = new TooltipManager();
  OS.desktopIcons = new DesktopIcons();

  // Audio
  OS.audio = new AudioSystem();
  await OS.audio.init();
  OS.audio.setEnabled(OS.settings.get('sounds'));
  OS.audio.setVolume(OS.settings.get('soundVolume'));

  // Boot sequence
  await bootSequence();

  // Initialize desktop
  OS.desktopIcons.init();
  OS.launcher.init();

  // Setup global event listeners
  setupGlobalEvents();

  // Start clock
  startClock();

  // Load session
  restoreSession();

  console.log('✨ Lumina OS ready');
}

async function bootSequence() {
  const bootScreen = $('#boot-screen');
  const status = $('.boot-status', bootScreen);
  const progress = $('.boot-progress-bar', bootScreen);

  const steps = [
    { text: 'Initializing kernel...', progress: 10 },
    { text: 'Mounting filesystem...', progress: 25 },
    { text: 'Loading design system...', progress: 40 },
    { text: 'Starting window manager...', progress: 55 },
    { text: 'Registering applications...', progress: 70 },
    { text: 'Initializing audio...', progress: 80 },
    { text: 'Applying settings...', progress: 90 },
    { text: 'Ready!', progress: 100 },
  ];

  for (const step of steps) {
    status.textContent = step.text;
    progress.style.width = `${step.progress}%`;
    await new Promise(r => setTimeout(r, 200 + Math.random() * 150));
  }

  // Play boot sound
  if (OS.audio) OS.audio.play('boot');

  // Fade out boot screen
  await new Promise(r => setTimeout(r, 300));
  bootScreen.classList.add('hidden');

  // Show lock screen
  await new Promise(r => setTimeout(r, 200));
  showLockScreen();
}

function showLockScreen() {
  const lockScreen = $('#lock-screen');
  lockScreen.removeAttribute('aria-hidden');
  OS.lockScreenActive = true;
  updateLockScreen();
}

function updateLockScreen() {
  const now = new Date();
  $('#lock-time').textContent = formatTime(now);
  $('#lock-date').textContent = formatDate(now);
  
  const hour = now.getHours();
  let greeting = 'Welcome back';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else greeting = 'Good evening';
  $('#lock-greeting').textContent = greeting;

  // Notifications on lock screen
  const notifs = OS.notifications.notifications.slice(0, 3);
  $('#lock-notifications').innerHTML = notifs.map((n, i) => `
    <div class="lock-notification" style="--i: ${i}">
      <div class="lock-notification-title">${escapeHtml(n.title)}</div>
      <div class="lock-notification-body">${escapeHtml(n.body)}</div>
    </div>
  `).join('');
}

function unlockScreen() {
  if (!OS.lockScreenActive) return;
  OS.lockScreenActive = false;
  const lockScreen = $('#lock-screen');
  lockScreen.setAttribute('aria-hidden', 'true');
  $('#desktop').removeAttribute('aria-hidden');
  if (OS.audio) OS.audio.play('whoosh');
}

function startClock() {
  const update = () => {
    const now = new Date();
    $('#taskbar-clock').textContent = formatTime(now);
    if (OS.lockScreenActive) {
      $('#lock-time').textContent = formatTime(now);
      $('#lock-date').textContent = formatDate(now);
    }
  };
  update();
  setInterval(update, 1000);
}

function setupGlobalEvents() {
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => handleGlobalKeydown(e));

  // Click outside to close menus
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.context-menu')) OS.contextMenu.hide();
    if (!e.target.closest('.launcher') && !e.target.closest('#start-button')) OS.launcher.close();
    if (!e.target.closest('.notification-center') && !e.target.closest('#notifications-button')) {
      $('#notification-center').setAttribute('aria-hidden', 'true');
      OS.notificationCenterOpen = false;
    }
    OS.tooltip.hide();
    OS.desktopIcons.selected.clear();
    OS.desktopIcons.render();
  });

  // Start button
  $('#start-button').addEventListener('click', () => OS.launcher.toggle());

  // Notifications button
  $('#notifications-button').addEventListener('click', () => toggleNotificationCenter());

  // System tray
  $('#system-tray').addEventListener('click', () => AppRegistry.launch('settings'));

  // Desktop context menu
  $('#desktop').addEventListener('contextmenu', (e) => {
    if (e.target === $('#desktop') || e.target === $('#wallpaper') || e.target === $('#desktop-icons')) {
      e.preventDefault();
      OS.contextMenu.showDesktop(e.clientX, e.clientY);
    }
  });

  // Window resize handling
  window.addEventListener('resize', debounce(() => {
    // Adjust maximized windows
    for (const win of OS.windows.values()) {
      if (win.maximized) {
        win.element.style.height = `calc(100vh - ${getComputedStyle(document.documentElement).getPropertyValue('--taskbar-height').trim() || '48px'})`;
      }
    }
  }, 100));

  // Prevent default drag behavior on desktop
  $('#desktop').addEventListener('dragover', e => e.preventDefault());
  $('#desktop').addEventListener('drop', e => {
    e.preventDefault();
    // Handle file drops from outside
  });
}

function handleGlobalKeydown(e) {
  // Alt+Tab
  if (e.key === 'Tab' && e.altKey) {
    e.preventDefault();
    if (!OS.altTabActive) OS.windowManager.showAltTab();
    if (e.shiftKey) OS.windowManager.prevAltTab();
    else OS.windowManager.nextAltTab();
    return;
  }

  // Release Alt to select
  if (e.key === 'Alt' && OS.altTabActive) {
    OS.windowManager.selectAltTab();
    return;
  }

  // Escape closes menus
  if (e.key === 'Escape') {
    OS.contextMenu.hide();
    OS.launcher.close();
    $('#notification-center').setAttribute('aria-hidden', 'true');
    OS.notificationCenterOpen = false;
    OS.tooltip.hide();
    return;
  }

  // Global shortcuts
  const isMac = navigator.platform.includes('Mac');
  const mod = isMac ? e.metaKey : e.ctrlKey;

  if (mod && e.key === ' ') {
    e.preventDefault();
    OS.launcher.toggle();
    return;
  }

  if (mod && e.key === 'n') {
    e.preventDefault();
    AppRegistry.launch('files');
    return;
  }

  if (mod && e.key === 't') {
    e.preventDefault();
    AppRegistry.launch('terminal');
    return;
  }

  if (mod && e.shiftKey && e.key === 'N') {
    e.preventDefault();
    AppRegistry.launch('editor');
    return;
  }

  if (e.key === 'F11') {
    e.preventDefault();
    const win = OS.windows.get(OS.focusedWindowId);
    if (win) OS.windowManager.toggleMaximize(win.id);
    return;
  }

  // Pass to focused app
  const focusedWin = OS.windows.get(OS.focusedWindowId);
  if (focusedWin && focusedWin.appInstance && focusedWin.appInstance.onKeydown) {
    focusedWin.appInstance.onKeydown(e);
  }
}

function toggleNotificationCenter() {
  const center = $('#notification-center');
  const isOpen = !center.hasAttribute('aria-hidden');
  if (isOpen) {
    center.setAttribute('aria-hidden', 'true');
    OS.notificationCenterOpen = false;
  } else {
    center.removeAttribute('aria-hidden');
    OS.notificationCenterOpen = true;
    OS.notifications.render();
  }
  if (OS.audio) OS.audio.play('click');
}

// Session management
function restoreSession() {
  try {
    const session = JSON.parse(localStorage.getItem('lumina-session') || '{}');
    if (session.windows) {
      for (const winData of session.windows) {
        AppRegistry.launch(winData.appId, winData.options);
      }
    }
  } catch (e) {
    console.warn('Session restore failed:', e);
  }
}

function saveSession() {
  try {
    const windows = [];
    for (const win of OS.windows.values()) {
      if (!win.minimized && win.appInstance) {
        const state = win.appInstance.getState ? win.appInstance.getState() : {};
        windows.push({
          appId: win.appId,
          options: {
            title: win.title,
            width: parseFloat(win.element.style.width),
            height: parseFloat(win.element.style.height),
            x: parseFloat(win.element.style.left),
            y: parseFloat(win.element.style.top),
            maximized: win.maximized,
            state,
          },
        });
      }
    }
    localStorage.setItem('lumina-session', JSON.stringify({ windows, timestamp: Date.now() }));
  } catch (e) {
    console.warn('Session save failed:', e);
  }
}

// Auto-save session
setInterval(saveSession, 30000);
window.addEventListener('beforeunload', saveSession);

// OS Methods
OS.lock = () => {
  saveSession();
  showLockScreen();
  if (OS.audio) OS.audio.play('chime');
};

OS.restart = () => {
  if (confirm('Restart Lumina OS?')) {
    localStorage.removeItem('lumina-session');
    location.reload();
  }
};

OS.shutdown = () => {
  if (confirm('Shutdown Lumina OS?')) {
    saveSession();
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:var(--color-bg);font-family:var(--font-sans);flex-direction:column;gap:1rem;color:var(--color-fg);">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--color-primary);"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="8"/></svg>
        <h1 style="font-weight:300;font-size:2rem;">Shutting down...</h1>
        <p style="color:var(--color-fg-muted);">See you soon! 👋</p>
      </div>
    `;
    setTimeout(() => window.close(), 1500);
  }
};

// Unlock on any interaction
document.addEventListener('keydown', () => unlockScreen());
document.addEventListener('click', (e) => {
  if (OS.lockScreenActive && e.target.closest('#lock-screen')) unlockScreen();
}, { passive: true });

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOS);
} else {
  initOS();
}

// Export for global access
window.LuminaOS = OS;