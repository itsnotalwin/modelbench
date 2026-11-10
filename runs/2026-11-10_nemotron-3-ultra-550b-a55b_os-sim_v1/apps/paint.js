/* ==========================================================================
   Lumina OS — Paint App
   Drawing, shapes, layers, tools
   ========================================================================== */

class PaintApp {
  constructor(window, options = {}) {
    this.window = window;
    this.canvas = null;
    this.ctx = null;
    this.width = 800;
    this.height = 600;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    
    // Drawing state
    this.tool = 'brush';
    this.color = '#000000';
    this.bgColor = '#ffffff';
    this.brushSize = 5;
    this.opacity = 1;
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.startX = 0;
    this.startY = 0;
    
    // Tools
    this.tools = ['brush', 'eraser', 'pencil', 'fill', 'eyedropper', 'rect', 'ellipse', 'line', 'text', 'select'];
    
    // History for undo/redo
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;
    
    // Layers
    this.layers = [];
    this.activeLayer = 0;
    
    // Selection
    this.selection = null;
    this.selectionCanvas = null;
    
    // Text input
    this.textInput = null;
  }

  init() {
    this.createLayer(this.width, this.height);
    this.render();
    this.bindEvents();
    this.saveState();
  }

  createLayer(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, w, h);
    this.layers.push({ canvas, ctx, visible: true, opacity: 1, name: `Layer ${this.layers.length + 1}` });
    if (this.layers.length === 1) {
      this.canvas = canvas;
      this.ctx = ctx;
    }
  }

  render() {
    const content = this.window.element.querySelector('.window-content');
    content.innerHTML = `
      <div class="paint-app" style="height:100%;display:flex;flex-direction:column;background:#1e1e1e;color:#e2e8f0;font-family:var(--font-sans);">
        <!-- Top Toolbar -->
        <div class="paint-toolbar" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#252526;border-bottom:1px solid #3c3c3c;flex-wrap:wrap;">
          <div class="tool-group" style="display:flex;gap:2px;padding-right:8px;border-right:1px solid #3c3c3c;">
            <button class="tool-btn" data-tool="select" title="Select (V)"><svg viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39 2.51L3 3z"/></svg></button>
            <button class="tool-btn active" data-tool="brush" title="Brush (B)"><svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg></button>
            <button class="tool-btn" data-tool="pencil" title="Pencil (P)"><svg viewBox="0 0 24 24"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="M15 5l4 4"/></svg></button>
            <button class="tool-btn" data-tool="eraser" title="Eraser (E)"><svg viewBox="0 0 24 24"><path d="M20 20H7L2 15l9-9 9 9"/><path d="M12 12v6"/><path d="M9 9l6 6"/></svg></button>
            <button class="tool-btn" data-tool="fill" title="Fill (G)"><svg viewBox="0 0 24 24"><path d="M19 11v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h3"/><line x1="7" y1="11" x2="12" y2="4"/><line x1="12" y1="4" x2="17" y2="11"/><path d="M17 7h3"/><path d="M18.5 5.5c.5.5.5 1.3 0 1.8l-2 2"/></svg></button>
            <button class="tool-btn" data-tool="eyedropper" title="Eyedropper (I)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></button>
          </div>
          
          <div class="tool-group" style="display:flex;gap:2px;padding:0 8px;border-right:1px solid #3c3c3c;">
            <button class="tool-btn" data-tool="rect" title="Rectangle (R)"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></button>
            <button class="tool-btn" data-tool="ellipse" title="Ellipse (C)"><svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="9" ry="9"/></svg></button>
            <button class="tool-btn" data-tool="line" title="Line (L)"><svg viewBox="0 0 24 24"><line x1="3" y1="3" x2="21" y2="21"/></svg></button>
            <button class="tool-btn" data-tool="text" title="Text (T)"><svg viewBox="0 0 24 24"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg></button>
          </div>

          <div style="flex:1;"></div>

          <div class="tool-group" style="display:flex;gap:4px;padding-left:8px;">
            <button class="tool-btn" id="btn-undo" title="Undo (⌘Z)"><svg viewBox="0 0 24 24"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg></button>
            <button class="tool-btn" id="btn-redo" title="Redo (⌘⇧Z)"><svg viewBox="0 0 24 24"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg></button>
            <div style="width:1px;height:24px;background:#3c3c3c;margin:0 4px;"></div>
            <button class="tool-btn" id="btn-clear" title="Clear Canvas"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        </div>

        <!-- Options Bar -->
        <div class="paint-options" style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:#2d2d2d;border-bottom:1px solid #3c3c3c;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:12px;color:#8b949e;">Size</label>
            <input type="range" id="brush-size" min="1" max="100" value="${this.brushSize}" style="width:120px;accent-color:#6366f1;">
            <span id="brush-size-value" style="width:30px;font-size:12px;color:#8b949e;">${this.brushSize}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <label style="font-size:12px;color:#8b949e;">Opacity</label>
            <input type="range" id="brush-opacity" min="0" max="100" value="${Math.round(this.opacity * 100)}" style="width:100px;accent-color:#6366f1;">
            <span id="brush-opacity-value" style="width:30px;font-size:12px;color:#8b949e;">${Math.round(this.opacity * 100)}%</span>
          </div>
          <div style="width:1px;height:24px;background:#3c3c3c;"></div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:12px;color:#8b949e;">FG</span>
            <div id="fg-color" class="color-swatch" style="width:28px;height:28px;border-radius:4px;border:2px solid #3c3c3c;background:${this.color};cursor:pointer;" title="Foreground Color"></div>
            <input type="color" id="fg-color-input" value="${this.color}" style="display:none;">
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:12px;color:#8b949e;">BG</span>
            <div id="bg-color" class="color-swatch" style="width:28px;height:28px;border-radius:4px;border:2px solid #3c3c3c;background:${this.bgColor};cursor:pointer;" title="Background Color"></div>
            <input type="color" id="bg-color-input" value="${this.bgColor}" style="display:none;">
          </div>
          <button class="tool-btn" id="swap-colors" title="Swap Colors (X)" style="width:28px;height:28px;"><svg viewBox="0 0 24 24"><path d="M7 16h10"/><path d="M7 8h10"/><path d="M12 4v12"/><path d="M17 10l-5 5 5 5"/></svg></button>
          <div style="width:1px;height:24px;background:#3c3c3c;"></div>
          <div id="color-presets" style="display:flex;gap:4px;"></div>
        </div>

        <!-- Canvas Area -->
        <div class="paint-canvas-area" style="flex:1;display:flex;overflow:hidden;position:relative;background:#1e1e1e;">
          <!-- Layers Panel -->
          <aside class="paint-layers" style="width:240px;background:#252526;border-right:1px solid #3c3c3c;display:flex;flex-direction:column;overflow:hidden;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #3c3c3c;">
              <h3 style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#8b949e;">Layers</h3>
              <button class="tool-btn" id="btn-add-layer" title="New Layer"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
            </div>
            <div id="layers-list" style="flex:1;overflow:auto;padding:8px;"></div>
          </aside>

          <!-- Canvas -->
          <div class="canvas-wrapper" style="flex:1;display:flex;align-items:center;justify-content:center;overflow:auto;background:#2d2d2d;position:relative;">
            <div id="canvas-container" style="position:relative;transform-origin:0 0;"></div>
          </div>
        </div>

        <!-- Status Bar -->
        <div class="paint-status" style="display:flex;align-items:center;justify-content:space-between;padding:4px 12px;background:#252526;border-top:1px solid #3c3c3c;font-size:11px;color:#8b949e;">
          <div style="display:flex;gap:16px;align-items:center;">
            <span id="status-tool">Brush</span>
            <span id="status-size">${this.width} × ${this.height}</span>
            <span id="status-zoom">100%</span>
            <span id="status-layer">Layer 1</span>
          </div>
          <div style="display:flex;gap:16px;align-items:center;">
            <span id="status-cursor">0, 0</span>
            <span id="status-color" style="display:flex;align-items:center;gap:6px;">FG: <span style="width:12px;height:12px;border-radius:2px;background:${this.color};border:1px solid #3c3c3c;"></span></span>
          </div>
        </div>
      </div>
    `;

    this.setupCanvas();
    this.bindToolbarEvents();
    this.renderLayers();
    this.renderColorPresets();
  }

  setupCanvas() {
    const container = this.window.element.querySelector('#canvas-container');
    this.canvas = this.layers[0].canvas;
    this.ctx = this.layers[0].ctx;
    
    // Create display canvas
    this.displayCanvas = document.createElement('canvas');
    this.displayCanvas.width = this.width;
    this.displayCanvas.height = this.height;
    this.displayCtx = this.displayCanvas.getContext('2d');
    container.appendChild(this.displayCanvas);
    
    this.renderDisplay();
    this.bindCanvasEvents();
  }

  renderDisplay() {
    // Composite all layers
    this.displayCtx.clearRect(0, 0, this.width, this.height);
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      this.displayCtx.globalAlpha = layer.opacity;
      this.displayCtx.drawImage(layer.canvas, 0, 0);
    }
    this.displayCtx.globalAlpha = 1;
    
    // Apply transform
    this.displayCanvas.style.transform = `scale(${this.scale})`;
    this.displayCanvas.style.transformOrigin = '0 0';
  }

  bindCanvasEvents() {
    const canvas = this.displayCanvas;
    const wrapper = this.window.element.querySelector('.canvas-wrapper');
    
    const getCanvasPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / this.scale;
      const y = (e.clientY - rect.top) / this.scale;
      return { x: Math.max(0, Math.min(this.width, x)), y: Math.max(0, Math.min(this.height, y)) };
    };

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const pos = getCanvasPos(e);
      this.startDrawing(pos.x, pos.y, e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDrawing) {
        const pos = getCanvasPos(e);
        this.draw(pos.x, pos.y, e);
      } else {
        const pos = getCanvasPos(e);
        this.updateCursorStatus(pos.x, pos.y);
      }
    });

    window.addEventListener('mouseup', () => this.stopDrawing());

    // Wheel zoom
    wrapper.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.setZoom(this.scale * delta);
      }
    }, { passive: false });

    // Context menu
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      OS.contextMenu.show(e.clientX, e.clientY, [
        { label: 'Undo', action: 'undo', shortcut: '⌘Z' },
        { label: 'Redo', action: 'redo', shortcut: '⌘⇧Z' },
        'divider',
        { label: 'Clear Layer', action: 'clear-layer' },
        { label: 'Delete Layer', action: 'delete-layer', danger: true },
        'divider',
        { label: 'Canvas Size...', action: 'canvas-size' },
      ]);
    });
  }

  bindToolbarEvents() {
    // Tool buttons
    this.window.element.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => this.setTool(btn.dataset.tool));
    });

    // Size/Opacity
    this.window.element.querySelector('#brush-size').addEventListener('input', (e) => {
      this.brushSize = parseInt(e.target.value);
      this.window.element.querySelector('#brush-size-value').textContent = this.brushSize;
    });
    this.window.element.querySelector('#brush-opacity').addEventListener('input', (e) => {
      this.opacity = parseInt(e.target.value) / 100;
      this.window.element.querySelector('#brush-opacity-value').textContent = Math.round(this.opacity * 100) + '%';
    });

    // Colors
    this.window.element.querySelector('#fg-color').addEventListener('click', () => 
      this.window.element.querySelector('#fg-color-input').click());
    this.window.element.querySelector('#bg-color').addEventListener('click', () => 
      this.window.element.querySelector('#bg-color-input').click());
    this.window.element.querySelector('#fg-color-input').addEventListener('input', (e) => this.setFgColor(e.target.value));
    this.window.element.querySelector('#bg-color-input').addEventListener('input', (e) => this.setBgColor(e.target.value));
    this.window.element.querySelector('#swap-colors').addEventListener('click', () => this.swapColors());

    // Actions
    this.window.element.querySelector('#btn-undo').addEventListener('click', () => this.undo());
    this.window.element.querySelector('#btn-redo').addEventListener('click', () => this.redo());
    this.window.element.querySelector('#btn-clear').addEventListener('click', () => this.clearLayer());
    this.window.element.querySelector('#btn-add-layer').addEventListener('click', () => this.addLayer());
  }

  setTool(tool) {
    this.tool = tool;
    this.window.element.querySelectorAll('.tool-btn[data-tool]').forEach(btn => 
      btn.classList.toggle('active', btn.dataset.tool === tool));
    this.window.element.querySelector('#status-tool').textContent = tool.charAt(0).toUpperCase() + tool.slice(1);
    
    // Update cursor
    const cursors = {
      brush: 'crosshair', pencil: 'crosshair', eraser: 'cell', fill: 'copy',
      eyedropper: 'crosshair', rect: 'crosshair', ellipse: 'crosshair',
      line: 'crosshair', text: 'text', select: 'default',
    };
    this.displayCanvas.style.cursor = cursors[tool] || 'default';
    
    if (this.textInput) this.cancelTextInput();
  }

  setFgColor(color) {
    this.color = color;
    this.window.element.querySelector('#fg-color').style.background = color;
    this.window.element.querySelector('#fg-color-input').value = color;
    this.window.element.querySelector('#status-color span').style.background = color;
  }

  setBgColor(color) {
    this.bgColor = color;
    this.window.element.querySelector('#bg-color').style.background = color;
    this.window.element.querySelector('#bg-color-input').value = color;
  }

  swapColors() {
    const temp = this.color;
    this.setFgColor(this.bgColor);
    this.setBgColor(temp);
  }

  renderColorPresets() {
    const presets = [
      '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
      '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff',
      '#ff4444', '#44ff44', '#4444ff', '#ffaa00', '#aa00ff',
    ];
    const container = this.window.element.querySelector('#color-presets');
    container.innerHTML = presets.map(c => `
      <button class="color-preset" style="width:18px;height:18px;border-radius:3px;border:none;background:${c};cursor:pointer;" 
              data-color="${c}" title="${c}"></button>
    `).join('');
    container.querySelectorAll('.color-preset').forEach(btn => {
      btn.addEventListener('click', () => this.setFgColor(btn.dataset.color));
      btn.addEventListener('contextmenu', (e) => { e.preventDefault(); this.setBgColor(btn.dataset.color); });
    });
  }

  // Drawing
  startDrawing(x, y, e) {
    this.isDrawing = true;
    this.startX = x;
    this.startY = y;
    this.lastX = x;
    this.lastY = y;
    
    const layer = this.layers[this.activeLayer];
    this.ctx = layer.ctx;
    this.ctx.globalAlpha = this.opacity;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    switch (this.tool) {
      case 'brush':
      case 'pencil':
        this.ctx.strokeStyle = this.tool === 'eraser' ? this.bgColor : this.color;
        this.ctx.lineWidth = this.brushSize;
        if (this.tool === 'pencil') {
          this.ctx.lineCap = 'butt';
          this.ctx.lineJoin = 'miter';
        }
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        break;
      case 'eraser':
        this.ctx.strokeStyle = this.bgColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        break;
      case 'fill':
        this.floodFill(x, y);
        this.isDrawing = false;
        break;
      case 'eyedropper':
        this.pickColor(x, y);
        this.isDrawing = false;
        break;
      case 'rect':
      case 'ellipse':
      case 'line':
        // Preview handled in draw()
        break;
      case 'text':
        this.startTextInput(x, y);
        this.isDrawing = false;
        break;
      case 'select':
        this.startSelection(x, y);
        break;
    }
    if (OS.audio) OS.audio.play('click');
  }

  draw(x, y, e) {
    if (!this.isDrawing) return;
    
    const layer = this.layers[this.activeLayer];
    this.ctx = layer.ctx;

    switch (this.tool) {
      case 'brush':
      case 'pencil':
      case 'eraser':
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.lastX = x;
        this.lastY = y;
        break;
      case 'rect':
      case 'ellipse':
      case 'line':
        // Redraw preview
        this.renderDisplay();
        const previewCtx = this.displayCtx;
        previewCtx.strokeStyle = this.color;
        previewCtx.lineWidth = this.brushSize;
        previewCtx.setLineDash([5, 5]);
        previewCtx.beginPath();
        if (this.tool === 'rect') {
          previewCtx.rect(this.startX, this.startY, x - this.startX, y - this.startY);
        } else if (this.tool === 'ellipse') {
          const cx = (this.startX + x) / 2;
          const cy = (this.startY + y) / 2;
          const rx = Math.abs(x - this.startX) / 2;
          const ry = Math.abs(y - this.startY) / 2;
          previewCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        } else if (this.tool === 'line') {
          previewCtx.moveTo(this.startX, this.startY);
          previewCtx.lineTo(x, y);
        }
        previewCtx.stroke();
        previewCtx.setLineDash([]);
        break;
    }
    this.updateCursorStatus(x, y);
  }

  stopDrawing() {
    if (!this.isDrawing) return;
    
    const layer = this.layers[this.activeLayer];
    this.ctx = layer.ctx;

    switch (this.tool) {
      case 'brush':
      case 'pencil':
      case 'eraser':
        this.ctx.stroke();
        this.ctx.globalCompositeOperation = 'source-over';
        break;
      case 'rect':
      case 'ellipse':
      case 'line':
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.beginPath();
        if (this.tool === 'rect') {
          this.ctx.rect(this.startX, this.startY, this.lastX - this.startX, this.lastY - this.startY);
        } else if (this.tool === 'ellipse') {
          const cx = (this.startX + this.lastX) / 2;
          const cy = (this.startY + this.lastY) / 2;
          const rx = Math.abs(this.lastX - this.startX) / 2;
          const ry = Math.abs(this.lastY - this.startY) / 2;
          this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        } else if (this.tool === 'line') {
          this.ctx.moveTo(this.startX, this.startY);
          this.ctx.lineTo(this.lastX, this.lastY);
        }
        this.ctx.stroke();
        break;
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
    this.isDrawing = false;
    this.renderDisplay();
    this.saveState();
    if (OS.audio) OS.audio.play('pop');
  }

  // Tools Implementation
  floodFill(x, y) {
    const layer = this.layers[this.activeLayer];
    const ctx = layer.ctx;
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    
    const targetIdx = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    const targetColor = [data[targetIdx], data[targetIdx + 1], data[targetIdx + 2], data[targetIdx + 3]];
    const fillColor = this.hexToRgba(this.color);
    
    if (this.colorsEqual(targetColor, fillColor)) return;
    
    const stack = [{ x: Math.floor(x), y: Math.floor(y) }];
    const visited = new Uint8Array(this.width * this.height);
    
    while (stack.length) {
      const { x, y } = stack.pop();
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
      const idx = (y * this.width + x) * 4;
      if (visited[y * this.width + x]) continue;
      visited[y * this.width + x] = 1;
      
      const pixelColor = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
      if (!this.colorsEqual(pixelColor, targetColor)) continue;
      
      data[idx] = fillColor[0];
      data[idx + 1] = fillColor[1];
      data[idx + 2] = fillColor[2];
      data[idx + 3] = fillColor[3];
      
      stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
    }
    
    ctx.putImageData(imageData, 0, 0);
    this.renderDisplay();
    this.saveState();
  }

  colorsEqual(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }

  hexToRgba(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  }

  pickColor(x, y) {
    const layer = this.layers[this.activeLayer];
    const ctx = layer.ctx;
    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(c => c.toString(16).padStart(2, '0')).join('');
    this.setFgColor(hex);
    if (OS.audio) OS.audio.play('pop');
  }

  startTextInput(x, y) {
    this.textInput = document.createElement('textarea');
    this.textInput.style.cssText = `
      position:absolute;left:${x}px;top:${y}px;min-width:100px;min-height:30px;
      background:rgba(255,255,255,0.9);border:1px solid #6366f1;border-radius:4px;
      font:14px var(--font-sans);color:${this.color};padding:4px 8px;outline:none;
      resize:none;z-index:1000;line-height:1.4;
    `;
    this.textInput.value = '';
    this.displayCanvas.parentElement.appendChild(this.textInput);
    this.textInput.focus();
    
    const finish = () => {
      const text = this.textInput.value;
      if (text) {
        const layer = this.layers[this.activeLayer];
        layer.ctx.font = '14px var(--font-sans)';
        layer.ctx.fillStyle = this.color;
        layer.ctx.fillText(text, parseFloat(this.textInput.style.left), parseFloat(this.textInput.style.top) + 14);
        this.renderDisplay();
        this.saveState();
      }
      this.textInput.remove();
      this.textInput = null;
    };
    
    this.textInput.addEventListener('blur', finish);
    this.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(); }
      if (e.key === 'Escape') { this.textInput.value = ''; finish(); }
    });
  }

  cancelTextInput() {
    if (this.textInput) {
      this.textInput.remove();
      this.textInput = null;
    }
  }

  startSelection(x, y) {
    this.selection = { x1: x, y1: y, x2: x, y2: y };
  }

  // Selection handling would go here for move/copy

  // Layers
  addLayer() {
    this.createLayer(this.width, this.height);
    this.activeLayer = this.layers.length - 1;
    this.canvas = this.layers[this.activeLayer].canvas;
    this.ctx = this.layers[this.activeLayer].ctx;
    this.renderLayers();
    this.renderDisplay();
  }

  deleteLayer() {
    if (this.layers.length <= 1) return;
    this.layers.splice(this.activeLayer, 1);
    this.activeLayer = Math.min(this.activeLayer, this.layers.length - 1);
    this.canvas = this.layers[this.activeLayer].canvas;
    this.ctx = this.layers[this.activeLayer].ctx;
    this.renderLayers();
    this.renderDisplay();
  }

  clearLayer() {
    const layer = this.layers[this.activeLayer];
    layer.ctx.fillStyle = this.bgColor;
    layer.ctx.fillRect(0, 0, this.width, this.height);
    this.renderDisplay();
    this.saveState();
  }

  renderLayers() {
    const list = this.window.element.querySelector('#layers-list');
    list.innerHTML = this.layers.map((layer, i) => `
      <div class="layer-item${i === this.activeLayer ? ' active' : ''}" data-layer="${i}" 
           style="display:flex;align-items:center;gap:8px;padding:8px;background:${i === this.activeLayer ? '#3c3c3c' : 'transparent'};border-radius:4px;cursor:pointer;transition:background 100ms;">
        <button class="layer-vis" style="width:20px;height:20px;border:none;background:${layer.visible ? '#6366f1' : '#3c3c3c'};border-radius:3px;cursor:pointer;" title="${layer.visible ? 'Hide' : 'Show'}">
          ${layer.visible ? '<svg viewBox="0 0 24 24" style="width:12px;height:12px;color:white;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' : '<svg viewBox="0 0 24 24" style="width:12px;height:12px;color:#8b949e;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/></svg>'}
        </button>
        <span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${layer.name}</span>
        <input type="range" class="layer-opacity" min="0" max="100" value="${Math.round(layer.opacity * 100)}" style="width:60px;accent-color:#6366f1;" title="Opacity">
        <button class="layer-del" style="width:20px;height:20px;border:none;background:transparent;color:#8b949e;cursor:pointer;border-radius:3px;" title="Delete"><svg viewBox="0 0 24 24" style="width:12px;height:12px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    `).join('');

    list.querySelectorAll('.layer-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.layer-vis') && !e.target.closest('.layer-opacity') && !e.target.closest('.layer-del')) {
          this.activeLayer = parseInt(item.dataset.layer);
          this.canvas = this.layers[this.activeLayer].canvas;
          this.ctx = this.layers[this.activeLayer].ctx;
          this.renderLayers();
          this.window.element.querySelector('#status-layer').textContent = this.layers[this.activeLayer].name;
        }
      });
      item.querySelector('.layer-vis').addEventListener('click', (e) => {
        e.stopPropagation();
        const i = parseInt(item.dataset.layer);
        this.layers[i].visible = !this.layers[i].visible;
        this.renderLayers();
        this.renderDisplay();
      });
      item.querySelector('.layer-opacity').addEventListener('input', (e) => {
        const i = parseInt(item.dataset.layer);
        this.layers[i].opacity = parseInt(e.target.value) / 100;
        this.renderDisplay();
      });
      item.querySelector('.layer-del').addEventListener('click', (e) => {
        e.stopPropagation();
        const i = parseInt(item.dataset.layer);
        if (this.layers.length > 1) this.deleteLayer(i);
      });
    });
  }

  // History
  saveState() {
    // Save composite of all visible layers
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tempCtx = tempCanvas.getContext('2d');
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      tempCtx.globalAlpha = layer.opacity;
      tempCtx.drawImage(layer.canvas, 0, 0);
    }
    tempCtx.globalAlpha = 1;
    
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(tempCanvas);
    if (this.history.length > this.maxHistory) this.history.shift();
    else this.historyIndex++;
  }

  undo() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    this.restoreState(this.history[this.historyIndex]);
  }

  redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    this.restoreState(this.history[this.historyIndex]);
  }

  restoreState(canvas) {
    // Restore to first layer, clear others
    const ctx = this.layers[0].ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(canvas, 0, 0);
    for (let i = 1; i < this.layers.length; i++) {
      this.layers[i].ctx.clearRect(0, 0, this.width, this.height);
    }
    this.renderDisplay();
  }

  // Zoom
  setZoom(scale) {
    this.scale = Math.max(0.1, Math.min(5, scale));
    this.renderDisplay();
    this.window.element.querySelector('#status-zoom').textContent = Math.round(this.scale * 100) + '%';
  }

  updateCursorStatus(x, y) {
    this.window.element.querySelector('#status-cursor').textContent = `${Math.round(x)}, ${Math.round(y)}`;
  }

  // Keyboard
  onKeydown(e) {
    const isMac = navigator.platform.includes('Mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (e.key === 'z' && mod && !e.shiftKey) { e.preventDefault(); this.undo(); }
    if (e.key === 'z' && mod && e.shiftKey) { e.preventDefault(); this.redo(); }
    if (e.key === 'y' && mod) { e.preventDefault(); this.redo(); }
    if (e.key === 'x') { this.swapColors(); }
    if (e.key === 'b') { this.setTool('brush'); }
    if (e.key === 'p') { this.setTool('pencil'); }
    if (e.key === 'e') { this.setTool('eraser'); }
    if (e.key === 'g') { this.setTool('fill'); }
    if (e.key === 'i') { this.setTool('eyedropper'); }
    if (e.key === 'r') { this.setTool('rect'); }
    if (e.key === 'c') { this.setTool('ellipse'); }
    if (e.key === 'l') { this.setTool('line'); }
    if (e.key === 't') { this.setTool('text'); }
    if (e.key === 'v') { this.setTool('select'); }
    if (e.key === '[') { this.brushSize = Math.max(1, this.brushSize - 1); this.window.element.querySelector('#brush-size').value = this.brushSize; this.window.element.querySelector('#brush-size-value').textContent = this.brushSize; }
    if (e.key === ']') { this.brushSize = Math.min(100, this.brushSize + 1); this.window.element.querySelector('#brush-size').value = this.brushSize; this.window.element.querySelector('#brush-size-value').textContent = this.brushSize; }
    if (e.key === 'Delete' || e.key === 'Backspace') { if (this.tool === 'select' && this.selection) { /* delete selection */ } }
    if (e.key === 'Escape') { this.cancelTextInput(); }
  }

  bindEvents() {
    this.window.element.addEventListener('keydown', (e) => this.onKeydown(e));
  }

  getState() {
    return {
      width: this.width,
      height: this.height,
      layers: this.layers.map(l => ({
        data: l.canvas.toDataURL(),
        visible: l.visible,
        opacity: l.opacity,
        name: l.name,
      })),
      activeLayer: this.activeLayer,
      tool: this.tool,
      color: this.color,
      bgColor: this.bgColor,
      brushSize: this.brushSize,
      opacity: this.opacity,
    };
  }

  restoreState(state) {
    if (!state) return;
    // Restore layers
    this.layers = [];
    const loadLayer = (layerData, i) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        this.layers[i] = { canvas, ctx, visible: layerData.visible, opacity: layerData.opacity, name: layerData.name };
        if (i === state.activeLayer) {
          this.canvas = canvas;
          this.ctx = ctx;
          this.activeLayer = i;
        }
        if (i === state.layers.length - 1) {
          this.renderLayers();
          this.renderDisplay();
        }
      };
      img.src = layerData.data;
    };
    state.layers.forEach(loadLayer);
    this.tool = state.tool;
    this.color = state.color;
    this.bgColor = state.bgColor;
    this.brushSize = state.brushSize;
    this.opacity = state.opacity;
    this.setTool(this.tool);
    this.setFgColor(this.color);
    this.setBgColor(this.bgColor);
  }

  destroy() {}
}

// Register
AppRegistry.register({
  id: 'paint',
  name: 'Paint',
  icon: '<svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
  class: PaintApp,
  width: 1000,
  height: 700,
  singleInstance: false,
  keywords: ['drawing', 'image editor', 'sketch', 'art'],
});