/* ==========================================================================
   Lumina OS — Files App (File Manager)
   ========================================================================== */

class FilesApp {
  constructor(window, options = {}) {
    this.window = window;
    this.options = options;
    this.currentPath = options.path || '/';
    this.viewMode = 'grid'; // 'grid' | 'list'
    this.sortBy = 'name';
    this.sortDir = 'asc';
    this.selected = new Set();
    this.clipboard = { files: [], operation: null }; // 'copy' | 'cut'
    this.history = ['/'];
    this.historyIndex = 0;
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadDirectory();
    OS.filesystem.watch(() => this.loadDirectory());
  }

  render() {
    const content = this.window.element.querySelector('.window-content');
    content.innerHTML = `
      <div class="files-app" style="height:100%;display:flex;flex-direction:column;">
        <!-- Toolbar -->
        <div class="files-toolbar" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--color-border);background:var(--glass-bg);backdrop-filter:blur(20px);flex-wrap:wrap;">
          <div class="files-nav" style="display:flex;gap:4px;">
            <button class="toolbar-btn" id="btn-back" title="Back (⌘[)" disabled><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
            <button class="toolbar-btn" id="btn-forward" title="Forward (⌘])" disabled><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
            <button class="toolbar-btn" id="btn-up" title="Up (⌘↑)"><svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg></button>
            <button class="toolbar-btn" id="btn-home" title="Home (⌘H)"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12"/></svg></button>
          </div>
          <div class="files-path" style="flex:1;display:flex;align-items:center;gap:4px;padding:6px 10px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:8px;min-width:200px;overflow:hidden;" role="navigation" aria-label="Path">
            <span class="path-root" data-path="/">Home</span>
            <span id="path-segments"></span>
          </div>
          <div class="files-actions" style="display:flex;gap:4px;">
            <button class="toolbar-btn" id="btn-new-folder" title="New Folder (⌘⇧N)"><svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></button>
            <button class="toolbar-btn" id="btn-new-file" title="New File (⌘N)"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>
            <div style="width:1px;height:24px;background:var(--color-border);margin:0 4px;"></div>
            <button class="toolbar-btn" id="btn-view-grid" title="Grid View" aria-pressed="true"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></button>
            <button class="toolbar-btn" id="btn-view-list" title="List View"><svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
            <div style="width:1px;height:24px;background:var(--color-border);margin:0 4px;"></div>
            <select id="sort-select" class="toolbar-select" style="padding:4px 8px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-bg);color:var(--color-fg);font:inherit;font-size:12px;">
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="modified">Date Modified</option>
              <option value="type">Type</option>
            </select>
          </div>
        </div>

        <!-- Main Area -->
        <div class="files-main" style="flex:1;display:flex;overflow:hidden;position:relative;">
          <!-- Sidebar -->
          <aside class="files-sidebar" style="width:220px;background:var(--color-bg-elevated);border-right:1px solid var(--color-border);display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:12px;border-bottom:1px solid var(--color-border);">
              <h3 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-fg-subtle);margin-bottom:8px;">Favorites</h3>
              <nav id="sidebar-favorites" style="display:flex;flex-direction:column;gap:2px;"></nav>
            </div>
            <div style="padding:12px;flex:1;overflow:auto;">
              <h3 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-fg-subtle);margin-bottom:8px;">Devices</h3>
              <nav id="sidebar-devices" style="display:flex;flex-direction:column;gap:2px;"></nav>
            </div>
            <div style="padding:12px;border-top:1px solid var(--color-border);">
              <h3 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--color-fg-subtle);margin-bottom:8px;">Tags</h3>
              <nav id="sidebar-tags" style="display:flex;flex-wrap:wrap;gap:4px;"></nav>
            </div>
          </aside>

          <!-- File Grid/List -->
          <div class="files-content" style="flex:1;overflow:auto;position:relative;">
            <div id="files-grid" class="files-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;padding:12px;" role="listbox" aria-label="Files"></div>
            <div id="files-list" class="files-list hidden" style="width:100%;border-collapse:collapse;"></div>
            
            <!-- Empty State -->
            <div id="empty-state" class="empty-state" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--color-fg-subtle);text-align:center;padding:24px;">
              <svg viewBox="0 0 24 24" style="width:64px;height:64px;opacity:0.3;margin-bottom:16px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              <p id="empty-text" style="font-size:14px;">This folder is empty</p>
              <button id="empty-action" class="btn-primary" style="margin-top:12px;padding:8px 16px;background:var(--color-primary);color:white;border:none;border-radius:6px;cursor:pointer;">Create File</button>
            </div>
          </div>
        </div>

        <!-- Status Bar -->
        <div class="files-status" style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-top:1px solid var(--color-border);background:var(--glass-bg);backdrop-filter:blur(20px);font-size:12px;color:var(--color-fg-muted);">
          <span id="status-count">0 items</span>
          <span id="status-selection" style="display:none;">• <span id="sel-count">0</span> selected</span>
          <span id="status-size"></span>
        </div>
      </div>
    `;

    this.bindToolbarEvents();
    this.renderSidebar();
  }

  bindToolbarEvents() {
    const btn = (id, fn) => this.window.element.querySelector(`#${id}`)?.addEventListener('click', fn);

    btn('btn-back', () => this.navigateHistory(-1));
    btn('btn-forward', () => this.navigateHistory(1));
    btn('btn-up', () => this.goUp());
    btn('btn-home', () => this.navigate('/'));
    btn('btn-new-folder', () => this.createNew('directory'));
    btn('btn-new-file', () => this.createNew('file'));
    btn('btn-view-grid', () => this.setViewMode('grid'));
    btn('btn-view-list', () => this.setViewMode('list'));
    
    const sortSelect = this.window.element.querySelector('#sort-select');
    sortSelect.value = this.sortBy;
    sortSelect.addEventListener('change', (e) => this.setSort(e.target.value));

    this.window.element.querySelector('#empty-action').addEventListener('click', () => this.createNew('file'));
  }

  bindEvents() {
    // Keyboard shortcuts
    this.window.element.addEventListener('keydown', (e) => this.onKeydown(e));
    
    // Drop zone
    const content = this.window.element.querySelector('.files-content');
    content.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      content.classList.add('drag-over');
    });
    content.addEventListener('dragleave', () => content.classList.remove('drag-over'));
    content.addEventListener('drop', (e) => this.onDrop(e));

    // Click outside to deselect
    content.addEventListener('click', (e) => {
      if (e.target === content || e.target.closest('.files-grid') === content.querySelector('.files-grid') || e.target.closest('.files-list') === content.querySelector('.files-list')) {
        this.clearSelection();
      }
    });
  }

  onKeydown(e) {
    const isMac = navigator.platform.includes('Mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (e.key === '[' && mod) { e.preventDefault(); this.navigateHistory(-1); }
    if (e.key === ']' && mod) { e.preventDefault(); this.navigateHistory(1); }
    if (e.key === 'ArrowUp' && mod) { e.preventDefault(); this.goUp(); }
    if (e.key === 'h' && mod) { e.preventDefault(); this.navigate('/'); }
    if (e.key === 'n' && mod && !e.shiftKey) { e.preventDefault(); this.createNew('file'); }
    if (e.key === 'n' && mod && e.shiftKey) { e.preventDefault(); this.createNew('directory'); }
    if (e.key === 'c' && mod) { this.copySelected(); }
    if (e.key === 'x' && mod) { this.cutSelected(); }
    if (e.key === 'v' && mod) { this.paste(); }
    if (e.key === 'Delete') { this.deleteSelected(); }
    if (e.key === 'Enter' && this.selected.size === 1) { this.openSelected(); }
    if (e.key === 'a' && mod) { e.preventDefault(); this.selectAll(); }
    if (e.key === 'Escape') { this.clearSelection(); }
    if (e.key === 'f' && mod) { e.preventDefault(); this.window.element.querySelector('#path-segments')?.focus(); }
  }

  async loadDirectory() {
    try {
      const items = OS.filesystem.list(this.currentPath);
      this.renderFiles(items);
      this.updatePathBar();
      this.updateNavButtons();
    } catch (err) {
      console.error('Load directory failed:', err);
      this.showError('Failed to load directory');
    }
  }

  renderFiles(items) {
    const grid = this.window.element.querySelector('#files-grid');
    const list = this.window.element.querySelector('#files-list');
    const empty = this.window.element.querySelector('#empty-state');
    const countEl = this.window.element.querySelector('#status-count');

    // Sort
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      let aVal, bVal;
      switch (this.sortBy) {
        case 'size': aVal = a.metadata?.size || 0; bVal = b.metadata?.size || 0; break;
        case 'modified': aVal = a.modified; bVal = b.modified; break;
        case 'type': aVal = a.name.split('.').pop(); bVal = b.name.split('.').pop(); break;
        default: aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase();
      }
      const dir = this.sortDir === 'asc' ? 1 : -1;
      return aVal > bVal ? dir : aVal < bVal ? -dir : 0;
    });

    if (items.length === 0) {
      grid.style.display = 'none';
      list.style.display = 'none';
      empty.style.display = 'flex';
      this.window.element.querySelector('#empty-text').textContent = this.currentPath === '/' ? 'Welcome to Lumina OS! Create your first file or folder.' : 'This folder is empty';
      countEl.textContent = '0 items';
      return;
    }

    empty.style.display = 'none';

    if (this.viewMode === 'grid') {
      grid.style.display = 'grid';
      list.style.display = 'none';
      grid.innerHTML = items.map(item => this.renderFileGridItem(item)).join('');
    } else {
      grid.style.display = 'none';
      list.style.display = 'table';
      list.innerHTML = `
        <thead><tr style="position:sticky;top:0;background:var(--color-bg-elevated);border-bottom:1px solid var(--color-border);">
          <th style="text-align:left;padding:8px 12px;font-weight:600;font-size:11px;color:var(--color-fg-subtle);width:32px;"></th>
          <th style="text-align:left;padding:8px 12px;font-weight:600;font-size:11px;color:var(--color-fg-subtle);">Name</th>
          <th style="text-align:right;padding:8px 12px;font-weight:600;font-size:11px;color:var(--color-fg-subtle);width:100px;">Size</th>
          <th style="text-align:left;padding:8px 12px;font-weight:600;font-size:11px;color:var(--color-fg-subtle);width:160px;">Modified</th>
        </tr></thead>
        <tbody>${items.map(item => this.renderFileListItem(item)).join('')}</tbody>
      `;
    }

    this.bindFileEvents();
    countEl.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
    this.updateSelectionStatus();
  }

  renderFileGridItem(item) {
    const isSelected = this.selected.has(item.id);
    const path = this.getItemPath(item);
    return `
      <div class="file-item${isSelected ? ' selected' : ''}" data-id="${item.id}" data-path="${escapeHtml(path)}" data-type="${item.type}" tabindex="0" role="option" aria-selected="${isSelected}" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;border-radius:10px;cursor:pointer;transition:background 100ms;${isSelected ? 'background:var(--color-primary-light);' : ''}">
        <div class="file-icon" style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:var(--color-bg-elevated);box-shadow:var(--shadow-sm);">${this.getFileIcon(item)}</div>
        <span class="file-name" style="font-size:12px;font-weight:500;text-align:center;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--color-fg);">${escapeHtml(item.name)}</span>
      </div>
    `;
  }

  renderFileListItem(item) {
    const isSelected = this.selected.has(item.id);
    const path = this.getItemPath(item);
    const size = item.type === 'file' ? this.formatSize(item.metadata?.size || 0) : '—';
    const modified = new Date(item.modified).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
      <tr class="file-item${isSelected ? ' selected' : ''}" data-id="${item.id}" data-path="${escapeHtml(path)}" data-type="${item.type}" tabindex="0" role="option" aria-selected="${isSelected}" style="${isSelected ? 'background:var(--color-primary-light);' : ''}">
        <td style="padding:6px 12px;">${this.getFileIcon(item, true)}</td>
        <td style="padding:6px 12px;font-size:13px;color:var(--color-fg);">${escapeHtml(item.name)}</td>
        <td style="padding:6px 12px;text-align:right;font-size:12px;color:var(--color-fg-muted);font-variant-numeric:tabular-nums;">${size}</td>
        <td style="padding:6px 12px;font-size:12px;color:var(--color-fg-muted);">${modified}</td>
      </tr>
    `;
  }

  getFileIcon(item, small = false) {
    const size = small ? 18 : 28;
    if (item.type === 'directory') {
      return `<svg viewBox="0 0 24 24" style="width:${size}px;height:${size}px;color:var(--color-warning);"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    }
    const ext = item.name.split('.').pop().toLowerCase();
    const colors = {
      txt: '#64748b', md: '#64748b', js: '#f0db4f', ts: '#3178c6',
      html: '#e34f26', css: '#264de4', json: '#64748b',
      png: '#ec4899', jpg: '#ec4899', jpeg: '#ec4899', gif: '#ec4899', svg: '#ec4899',
      mp3: '#a855f7', wav: '#a855f7', ogg: '#a855f7',
      mp4: '#6366f1', mov: '#6366f1',
      zip: '#ef4444', gz: '#ef4444', tar: '#ef4444',
      pdf: '#ef4444',
    };
    const icons = {
      txt: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
      md: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
      js: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
      html: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
      png: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
      mp3: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
      pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
      zip: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    };
    return `<svg viewBox="0 0 24 24" style="width:${size}px;height:${size}px;color:${colors[ext] || '#64748b'};">${icons[ext] || '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'}</svg>`;
  }

  getItemPath(item) {
    if (this.currentPath === '/') return '/' + item.name;
    return this.currentPath + '/' + item.name;
  }

  bindFileEvents() {
    this.window.element.querySelectorAll('.file-item').forEach(el => {
      el.addEventListener('click', (e) => this.onFileClick(el, e));
      el.addEventListener('dblclick', (e) => this.onFileDblClick(el, e));
      el.addEventListener('contextmenu', (e) => this.onFileContextMenu(el, e));
      el.addEventListener('keydown', (e) => this.onFileKeydown(el, e));
      el.addEventListener('dragstart', (e) => this.onDragStart(el, e));
      el.addEventListener('dragend', () => this.onDragEnd());
    });
  }

  onFileClick(el, e) {
    const id = el.dataset.id;
    if (e.metaKey || e.ctrlKey) {
      this.toggleSelect(id);
    } else if (e.shiftKey && this.lastSelected) {
      this.selectRange(this.lastSelected, id);
    } else {
      this.selectOnly(id);
    }
    this.lastSelected = id;
  }

  onFileDblClick(el) {
    const type = el.dataset.type;
    const path = el.dataset.path;
    if (type === 'directory') {
      this.navigate(path);
    } else {
      this.openFile(path);
    }
  }

  onFileKeydown(el, e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.onFileDblClick(el);
    }
  }

  onFileContextMenu(el, e) {
    e.preventDefault();
    const path = el.dataset.path;
    const file = OS.filesystem.getNode(path);
    if (file) OS.contextMenu.showFile(e.clientX, e.clientY, file);
  }

  onDragStart(el, e) {
    if (this.selected.size > 1 && !this.selected.has(el.dataset.id)) return;
    this.dragSource = el;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify([...this.selected].map(id => {
      const f = OS.filesystem.getNode(this.window.element.querySelector(`[data-id="${id}"]`)?.dataset.path || '');
      return f ? { name: f.name, type: f.type } : null;
    }).filter(Boolean)));
    if (OS.audio) OS.audio.play('click');
  }

  onDragEnd() {
    if (this.dragSource) this.dragSource.classList.remove('dragging');
    this.dragSource = null;
  }

  onDrop(e) {
    e.preventDefault();
    this.window.element.querySelector('.files-content').classList.remove('drag-over');
    
    // Handle external drops
    if (e.dataTransfer.files.length) {
      this.uploadFiles(e.dataTransfer.files);
      return;
    }

    // Internal drag
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data && data.length) {
        for (const item of data) {
          const srcPath = this.currentPath + '/' + item.name;
          const srcFile = OS.filesystem.getNode(srcPath);
          if (srcFile) {
            OS.filesystem.move(srcPath, this.currentPath);
          }
        }
        if (OS.audio) OS.audio.play('pop');
      }
    } catch (err) {
      console.warn('Drop parse failed:', err);
    }
  }

  async uploadFiles(files) {
    for (const file of files) {
      try {
        const content = await file.text();
        OS.filesystem.writeFile(this.currentPath + '/' + file.name, content);
      } catch (err) {
        console.error('Upload failed:', err);
        try {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          OS.filesystem.writeFile(this.currentPath + '/' + file.name, base64);
        } catch (e) {
          OS.notifications.show('Upload Failed', `Could not upload ${file.name}`, { icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' });
        }
      }
    }
    if (OS.audio) OS.audio.play('success');
  }

  navigate(path) {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(path);
    this.historyIndex = this.history.length - 1;
    this.currentPath = path;
    this.clearSelection();
    this.loadDirectory();
  }

  navigateHistory(delta) {
    const newIndex = this.historyIndex + delta;
    if (newIndex >= 0 && newIndex < this.history.length) {
      this.historyIndex = newIndex;
      this.currentPath = this.history[newIndex];
      this.clearSelection();
      this.loadDirectory();
    }
  }

  goUp() {
    if (this.currentPath === '/') return;
    const parent = this.currentPath.split('/').slice(0, -1).join('/') || '/';
    this.navigate(parent);
  }

  updatePathBar() {
    const segments = this.window.element.querySelector('#path-segments');
    if (this.currentPath === '/') {
      segments.innerHTML = '';
      return;
    }
    const parts = this.currentPath.split('/').filter(Boolean);
    let currentPath = '';
    segments.innerHTML = parts.map((part, i) => {
      currentPath += '/' + part;
      const isLast = i === parts.length - 1;
      return `
        <span style="display:flex;align-items:center;gap:4px;">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;color:var(--color-fg-subtle);flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
          <button class="path-segment${isLast ? ' current' : ''}" data-path="${escapeHtml(currentPath)}" style="padding:2px 8px;border:none;background:${isLast ? 'var(--color-primary-light)' : 'transparent'};color:${isLast ? 'var(--color-primary)' : 'var(--color-fg)'};border-radius:4px;font:inherit;font-size:12px;cursor:pointer;${isLast ? 'font-weight:500;' : ''}">${escapeHtml(part)}</button>
        </span>
      `;
    }).join('');

    segments.querySelectorAll('.path-segment').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.path));
    });
  }

  updateNavButtons() {
    this.window.element.querySelector('#btn-back').disabled = this.historyIndex <= 0;
    this.window.element.querySelector('#btn-forward').disabled = this.historyIndex >= this.history.length - 1;
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.window.element.querySelector('#btn-view-grid').setAttribute('aria-pressed', mode === 'grid');
    this.window.element.querySelector('#btn-view-list').setAttribute('aria-pressed', mode === 'list');
    this.loadDirectory();
  }

  setSort(by) {
    if (this.sortBy === by) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortBy = by; this.sortDir = 'asc'; }
    this.window.element.querySelector('#sort-select').value = this.sortBy;
    this.loadDirectory();
  }

  createNew(type) {
    const baseName = type === 'directory' ? 'New Folder' : 'New File.txt';
    let name = baseName;
    let i = 1;
    while (OS.filesystem.getNode(this.currentPath + '/' + name)) {
      name = baseName.replace(/\.txt$/, '') + ` ${i}` + (type === 'file' ? '.txt' : '');
      i++;
    }
    try {
      if (type === 'directory') {
        OS.filesystem.mkdir(this.currentPath + '/' + name);
      } else {
        OS.filesystem.writeFile(this.currentPath + '/' + name, '');
      }
      // Select and rename
      setTimeout(() => {
        const el = this.window.element.querySelector(`[data-name="${name}"]`);
        if (el) this.startRename(el);
      }, 50);
      if (OS.audio) OS.audio.play('pop');
    } catch (err) {
      OS.notifications.show('Error', err.message, { icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' });
    }
  }

  startRename(el) {
    const nameEl = el.querySelector('.file-name');
    const oldName = nameEl.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = oldName;
    input.style.cssText = 'width:100%;padding:2px 6px;font:inherit;font-size:12px;border:1px solid var(--color-primary);border-radius:4px;background:var(--color-bg);color:var(--color-fg);outline:none;';
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const finish = () => {
      const newName = input.value.trim();
      input.replaceWith(nameEl);
      if (newName && newName !== oldName) {
        try {
          OS.filesystem.rename(input.dataset.path || this.getItemPathFromEl(el), newName);
        } catch (err) {
          OS.notifications.show('Rename Failed', err.message);
        }
      }
      nameEl.textContent = oldName;
    };

    input.dataset.path = el.dataset.path;
    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish();
      if (e.key === 'Escape') { input.value = oldName; finish(); }
    });
  }

  getItemPathFromEl(el) {
    return el.dataset.path;
  }

  openFile(path) {
    AppRegistry.launch('editor', { path });
  }

  openSelected() {
    const selected = this.getSelectedFiles()[0];
    if (selected) {
      const path = this.currentPath + '/' + selected.name;
      if (selected.type === 'directory') this.navigate(path);
      else this.openFile(path);
    }
  }

  getSelectedFiles() {
    return [...this.selected].map(id => {
      const el = this.window.element.querySelector(`[data-id="${id}"]`);
      return el ? OS.filesystem.getNode(el.dataset.path) : null;
    }).filter(Boolean);
  }

  selectOnly(id) {
    this.selected.clear();
    this.selected.add(id);
    this.refreshSelection();
  }

  toggleSelect(id) {
    if (this.selected.has(id)) this.selected.delete(id);
    else this.selected.add(id);
    this.refreshSelection();
  }

  selectRange(startId, endId) {
    const items = [...this.window.element.querySelectorAll('.file-item')];
    const startIdx = items.findIndex(i => i.dataset.id === startId);
    const endIdx = items.findIndex(i => i.dataset.id === endId);
    if (startIdx === -1 || endIdx === -1) return;
    const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
    for (let i = min; i <= max; i++) this.selected.add(items[i].dataset.id);
    this.refreshSelection();
  }

  selectAll() {
    this.window.element.querySelectorAll('.file-item').forEach(el => this.selected.add(el.dataset.id));
    this.refreshSelection();
  }

  clearSelection() {
    this.selected.clear();
    this.refreshSelection();
  }

  refreshSelection() {
    this.window.element.querySelectorAll('.file-item').forEach(el => {
      const selected = this.selected.has(el.dataset.id);
      el.classList.toggle('selected', selected);
      el.setAttribute('aria-selected', selected);
      if (selected) el.style.background = 'var(--color-primary-light)';
      else el.style.background = '';
    });
    this.updateSelectionStatus();
  }

  updateSelectionStatus() {
    const selEl = this.window.element.querySelector('#status-selection');
    const countEl = this.window.element.querySelector('#sel-count');
    if (this.selected.size > 0) {
      selEl.style.display = 'inline';
      countEl.textContent = this.selected.size;
      const totalSize = this.getSelectedFiles().reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
      this.window.element.querySelector('#status-size').textContent = `• ${this.formatSize(totalSize)}`;
    } else {
      selEl.style.display = 'none';
      this.window.element.querySelector('#status-size').textContent = '';
    }
  }

  copySelected() {
    this.clipboard.files = this.getSelectedFiles().map(f => ({ path: this.currentPath + '/' + f.name, name: f.name, type: f.type }));
    this.clipboard.operation = 'copy';
    this.window.element.querySelectorAll('.file-item.selected').forEach(el => el.style.opacity = '0.6');
    if (OS.audio) OS.audio.play('click');
  }

  cutSelected() {
    this.clipboard.files = this.getSelectedFiles().map(f => ({ path: this.currentPath + '/' + f.name, name: f.name, type: f.type }));
    this.clipboard.operation = 'cut';
    this.window.element.querySelectorAll('.file-item.selected').forEach(el => el.style.opacity = '0.4');
    if (OS.audio) OS.audio.play('click');
  }

  paste() {
    if (!this.clipboard.files.length) return;
    for (const item of this.clipboard.files) {
      try {
        if (this.clipboard.operation === 'copy') {
          OS.filesystem.copy(item.path, this.currentPath);
        } else {
          OS.filesystem.move(item.path, this.currentPath);
        }
      } catch (err) {
        console.error('Paste failed:', err);
      }
    }
    this.clipboard = { files: [], operation: null };
    this.window.element.querySelectorAll('.file-item').forEach(el => el.style.opacity = '');
    if (OS.audio) OS.audio.play('pop');
  }

  deleteSelected() {
    if (!this.selected.size) return;
    if (!confirm(`Delete ${this.selected.size} item(s)?`)) return;
    for (const id of this.selected) {
      const el = this.window.element.querySelector(`[data-id="${id}"]`);
      if (el) {
        try {
          OS.filesystem.delete(el.dataset.path);
        } catch (err) {
          OS.notifications.show('Delete Failed', err.message);
        }
      }
    }
    this.selected.clear();
    if (OS.audio) OS.audio.play('pop');
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  }

  renderSidebar() {
    // Favorites
    const favorites = [
      { name: 'Desktop', path: '/', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>' },
      { name: 'Documents', path: '/Documents', icon: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>' },
      { name: 'Downloads', path: '/Downloads', icon: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' },
      { name: 'Pictures', path: '/Pictures', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
      { name: 'Music', path: '/Music', icon: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
      { name: 'Projects', path: '/Projects', icon: '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' },
    ];
    const favNav = this.window.element.querySelector('#sidebar-favorites');
    favNav.innerHTML = favorites.map(f => `
      <button class="sidebar-item${this.currentPath === f.path ? ' active' : ''}" data-path="${f.path}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:none;background:transparent;border-radius:6px;color:var(--color-fg);font:inherit;font-size:13px;cursor:pointer;width:100%;text-align:left;${this.currentPath === f.path ? 'background:var(--color-primary-light);color:var(--color-primary);' : ''}">
        ${f.icon}
        <span>${f.name}</span>
      </button>
    `).join('');
    favNav.querySelectorAll('.sidebar-item').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.path));
    });

    // Devices
    const devices = [
      { name: 'Lumina SSD', path: '/', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>' },
    ];
    const devNav = this.window.element.querySelector('#sidebar-devices');
    devNav.innerHTML = devices.map(d => `
      <button class="sidebar-item${this.currentPath === d.path ? ' active' : ''}" data-path="${d.path}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:none;background:transparent;border-radius:6px;color:var(--color-fg);font:inherit;font-size:13px;cursor:pointer;width:100%;text-align:left;${this.currentPath === d.path ? 'background:var(--color-primary-light);color:var(--color-primary);' : ''}">
        ${d.icon}
        <span>${d.name}</span>
      </button>
    `).join('');
    devNav.querySelectorAll('.sidebar-item').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.path));
    });

    // Tags
    const tags = ['Work', 'Personal', 'Important', 'Archive'];
    const tagNav = this.window.element.querySelector('#sidebar-tags');
    tagNav.innerHTML = tags.map(t => `
      <button class="sidebar-tag" style="padding:4px 10px;border:1px solid var(--color-border);background:var(--color-bg);border-radius:12px;font:inherit;font-size:11px;color:var(--color-fg-muted);cursor:pointer;">${t}</button>
    `).join('');
  }

  showError(msg) {
    OS.notifications.show('Files Error', msg);
  }

  getState() {
    return { path: this.currentPath, viewMode: this.viewMode, sortBy: this.sortBy, sortDir: this.sortDir };
  }

  restoreState(state) {
    if (state?.path) this.currentPath = state.path;
    if (state?.viewMode) this.viewMode = state.viewMode;
    if (state?.sortBy) this.sortBy = state.sortBy;
    if (state?.sortDir) this.sortDir = state.sortDir;
  }

  destroy() {
    OS.filesystem.watch(() => {}); // Clear watcher would need reference
  }
}

// Register
AppRegistry.register({
  id: 'files',
  name: 'Files',
  icon: '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  class: FilesApp,
  width: 1000,
  height: 650,
  singleInstance: true,
  keywords: ['file manager', 'explorer', 'finder', 'documents'],
});