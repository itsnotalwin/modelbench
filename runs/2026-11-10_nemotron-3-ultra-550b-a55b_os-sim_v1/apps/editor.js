/* ==========================================================================
   Lumina OS — Editor App (Code/Text Editor)
   Syntax highlighting, tabs, search, multiple files
   ========================================================================== */

class EditorApp {
  constructor(window, options = {}) {
    this.window = window;
    this.options = options;
    this.tabs = [];
    this.activeTabId = null;
    this.nextTabId = 1;
    this.searchQuery = '';
    this.searchMatches = [];
    this.searchIndex = -1;
    this.fontSize = 14;
    this.theme = 'dark';
    this.wordWrap = false;
    this.showLineNumbers = true;
    this.tabSize = 2;
  }

  init() {
    this.loadSettings();
    this.render();
    this.bindEvents();
    
    // Open initial file if provided
    if (this.options.path) {
      this.openFile(this.options.path);
    } else {
      this.newFile();
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('lumina-editor-settings');
      if (saved) Object.assign(this, JSON.parse(saved));
    } catch {}
  }

  saveSettings() {
    try {
      localStorage.setItem('lumina-editor-settings', JSON.stringify({
        fontSize: this.fontSize,
        theme: this.theme,
        wordWrap: this.wordWrap,
        showLineNumbers: this.showLineNumbers,
        tabSize: this.tabSize,
      }));
    } catch {}
  }

  render() {
    const content = this.window.element.querySelector('.window-content');
    content.innerHTML = `
      <div class="editor-app" style="height:100%;display:flex;flex-direction:column;background:#0d1117;">
        <!-- Tab Bar -->
        <div class="editor-tabs" style="display:flex;align-items:center;background:#161b22;border-bottom:1px solid #30363d;min-height:36px;padding:0 8px;position:relative;z-index:10;">
          <div class="tabs-container" style="display:flex;gap:2px;flex:1;overflow-x:auto;" role="tablist">
            <div id="tabs-list" style="display:flex;gap:2px;"></div>
          </div>
          <button class="tab-btn" id="btn-new-tab" title="New File (⌘N)" style="width:28px;height:28px;border:none;background:transparent;border-radius:4px;color:#8b949e;cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <!-- Toolbar -->
        <div class="editor-toolbar" style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#161b22;border-bottom:1px solid #30363d;flex-wrap:wrap;">
          <div class="toolbar-group" style="display:flex;gap:4px;">
            <button class="toolbar-btn" id="btn-save" title="Save (⌘S)"><svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg></button>
            <button class="toolbar-btn" id="btn-save-as" title="Save As (⌘⇧S)"><svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg></button>
          </div>
          <div style="width:1px;height:24px;background:#30363d;margin:0 8px;"></div>
          <div class="toolbar-group" style="display:flex;gap:4px;">
            <button class="toolbar-btn" id="btn-undo" title="Undo (⌘Z)"><svg viewBox="0 0 24 24"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg></button>
            <button class="toolbar-btn" id="btn-redo" title="Redo (⌘⇧Z)"><svg viewBox="0 0 24 24"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg></button>
          </div>
          <div style="width:1px;height:24px;background:#30363d;margin:0 8px;"></div>
          <div class="toolbar-group" style="display:flex;gap:4px;">
            <button class="toolbar-btn" id="btn-find" title="Find (⌘F)"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></button>
            <button class="toolbar-btn" id="btn-replace" title="Replace (⌘⇧F)"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><line x1="7" y1="7" x2="17" y2="17"/></svg></button>
            <button class="toolbar-btn" id="btn-goto" title="Go to Line (⌘G)"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div style="flex:1;"></div>
          <div class="toolbar-group" style="display:flex;gap:4px;align-items:center;">
            <select id="language-select" class="toolbar-select" style="padding:4px 8px;border:1px solid #30363d;border-radius:4px;background:#0d1117;color:#e2e8f0;font:inherit;font-size:12px;"></select>
            <span id="encoding" style="font-size:11px;color:#8b949e;">UTF-8</span>
            <span id="line-endings" style="font-size:11px;color:#8b949e;">LF</span>
            <span id="cursor-pos" style="font-size:11px;color:#8b949e;margin-left:8px;">Ln 1, Col 1</span>
          </div>
        </div>

        <!-- Find Bar (hidden by default) -->
        <div id="find-bar" class="find-bar" style="display:none;align-items:center;gap:8px;padding:6px 10px;background:#161b22;border-bottom:1px solid #30363d;">
          <button class="find-close" id="find-close" title="Close" style="width:24px;height:24px;border:none;background:transparent;color:#8b949e;cursor:pointer;border-radius:4px;"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          <input type="text" id="find-input" placeholder="Find" style="flex:1;padding:6px 10px;border:1px solid #30363d;border-radius:4px;background:#0d1117;color:#e2e8f0;font:inherit;font-size:13px;">
          <input type="text" id="replace-input" placeholder="Replace" style="flex:1;padding:6px 10px;border:1px solid #30363d;border-radius:4px;background:#0d1117;color:#e2e8f0;font:inherit;font-size:13px;display:none;">
          <button class="toolbar-btn" id="find-prev" title="Previous (⌘↑)"><svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg></button>
          <button class="toolbar-btn" id="find-next" title="Next (⌘↓)"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button>
          <button class="toolbar-btn" id="replace-btn" title="Replace" style="display:none;">Replace</button>
          <button class="toolbar-btn" id="replace-all-btn" title="Replace All" style="display:none;">Replace All</button>
          <span id="find-count" style="font-size:11px;color:#8b949e;margin-left:auto;"></span>
        </div>

        <!-- Editor Area -->
        <div class="editor-area" style="flex:1;display:flex;overflow:hidden;position:relative;">
          <!-- Line Numbers -->
          <div id="line-numbers" class="line-numbers" style="padding:8px 0;background:#161b22;border-right:1px solid #30363d;text-align:right;user-select:none;overflow:hidden;font-family:var(--font-mono);font-size:13px;line-height:1.6;color:#484f58;min-width:50px;display:${this.showLineNumbers ? 'block' : 'none'};"></div>
          
          <!-- Editor -->
          <div class="editor-wrapper" style="flex:1;overflow:auto;position:relative;">
            <textarea id="editor" class="editor-textarea" style="width:100%;height:100%;border:none;outline:none;resize:none;background:transparent;color:#e2e8f0;font-family:var(--font-mono);font-size:${this.fontSize}px;line-height:1.6;padding:8px 12px;tab-size:${this.tabSize};white-space:${this.wordWrap ? 'pre-wrap' : 'pre'};"></textarea>
          </div>
        </div>

        <!-- Status Bar -->
        <div class="editor-status" style="display:flex;align-items:center;justify-content:space-between;padding:4px 12px;background:#161b22;border-top:1px solid #30363d;font-size:11px;color:#8b949e;">
          <div style="display:flex;gap:16px;align-items:center;">
            <span id="status-file">No file</span>
            <span id="status-modified" style="color:#f87171;display:none;">● Modified</span>
            <span id="status-readonly" style="color:#fbbf24;display:none;">🔒 Read-only</span>
          </div>
          <div style="display:flex;gap:16px;align-items:center;">
            <span id="status-language">Plain Text</span>
            <span id="status-encoding">UTF-8</span>
            <span id="status-line-endings">LF</span>
            <span id="status-position">Ln 1, Col 1</span>
            <span id="status-selection" style="display:none;"></span>
          </div>
        </div>
      </div>
    `;

    this.tabsList = this.window.element.querySelector('#tabs-list');
    this.editor = this.window.element.querySelector('#editor');
    this.lineNumbers = this.window.element.querySelector('#line-numbers');
    this.findBar = this.window.element.querySelector('#find-bar');
    this.findInput = this.window.element.querySelector('#find-input');
    this.replaceInput = this.window.element.querySelector('#replace-input');
    this.findCount = this.window.element.querySelector('#find-count');
    this.languageSelect = this.window.element.querySelector('#language-select');

    this.setupLanguageSelect();
    this.bindEditorEvents();
    this.bindToolbarEvents();
    this.renderTabs();
  }

  setupLanguageSelect() {
    const languages = [
      { value: 'plain', label: 'Plain Text' },
      { value: 'javascript', label: 'JavaScript' },
      { value: 'typescript', label: 'TypeScript' },
      { value: 'html', label: 'HTML' },
      { value: 'css', label: 'CSS' },
      { value: 'json', label: 'JSON' },
      { value: 'markdown', label: 'Markdown' },
      { value: 'python', label: 'Python' },
      { value: 'rust', label: 'Rust' },
      { value: 'go', label: 'Go' },
      { value: 'cpp', label: 'C++' },
      { value: 'c', label: 'C' },
      { value: 'java', label: 'Java' },
      { value: 'shell', label: 'Shell' },
      { value: 'sql', label: 'SQL' },
      { value: 'yaml', label: 'YAML' },
      { value: 'xml', label: 'XML' },
    ];
    this.languageSelect.innerHTML = languages.map(l => `<option value="${l.value}">${l.label}</option>`).join('');
  }

  bindEditorEvents() {
    this.editor.addEventListener('input', () => this.onInput());
    this.editor.addEventListener('scroll', () => this.syncLineNumbers());
    this.editor.addEventListener('keydown', (e) => this.onKeydown(e));
    this.editor.addEventListener('keyup', () => this.updateCursorPosition());
    this.editor.addEventListener('click', () => this.updateCursorPosition());
    this.editor.addEventListener('contextmenu', (e) => this.onContextMenu(e));

    // Tab key handling
    this.editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const spaces = ' '.repeat(this.tabSize);
        this.editor.value = this.editor.value.slice(0, start) + spaces + this.editor.value.slice(end);
        this.editor.selectionStart = this.editor.selectionEnd = start + this.tabSize;
        this.onInput();
      }
    });
  }

  bindToolbarEvents() {
    const btn = (id, fn) => this.window.element.querySelector(`#${id}`)?.addEventListener('click', fn);

    btn('btn-new-tab', () => this.newFile());
    btn('btn-save', () => this.saveFile());
    btn('btn-save-as', () => this.saveFile(true));
    btn('btn-undo', () => this.execCommand('undo'));
    btn('btn-redo', () => this.execCommand('redo'));
    btn('btn-find', () => this.toggleFindBar(false));
    btn('btn-replace', () => this.toggleFindBar(true));
    btn('btn-goto', () => this.gotoLine());
    btn('find-close', () => this.hideFindBar());
    btn('find-prev', () => this.findPrev());
    btn('find-next', () => this.findNext());
    btn('replace-btn', () => this.replace());
    btn('replace-all-btn', () => this.replaceAll());

    this.findInput.addEventListener('input', () => this.find(this.findInput.value));
    this.findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.findNext();
      if (e.key === 'Escape') this.hideFindBar();
    });
    this.replaceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.replace();
      if (e.key === 'Escape') this.hideFindBar();
    });

    this.languageSelect.addEventListener('change', () => this.updateLanguage());
  }

  onInput() {
    this.updateLineNumbers();
    this.highlightSyntax();
    this.updateStatus();
    this.updateTabModified();
  }

  onKeydown(e) {
    const isMac = navigator.platform.includes('Mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (e.key === 's' && mod && !e.shiftKey) { e.preventDefault(); this.saveFile(); }
    if (e.key === 's' && mod && e.shiftKey) { e.preventDefault(); this.saveFile(true); }
    if (e.key === 'f' && mod && !e.shiftKey) { e.preventDefault(); this.toggleFindBar(false); }
    if (e.key === 'f' && mod && e.shiftKey) { e.preventDefault(); this.toggleFindBar(true); }
    if (e.key === 'g' && mod) { e.preventDefault(); this.gotoLine(); }
    if (e.key === 'z' && mod && !e.shiftKey) { this.execCommand('undo'); }
    if (e.key === 'z' && mod && e.shiftKey) { this.execCommand('redo'); }
    if (e.key === 'y' && mod) { this.execCommand('redo'); }
    if (e.key === 'Enter' && e.altKey) { this.togglePreview(); }
    if (e.key === 'F11') { e.preventDefault(); OS.windowManager.toggleMaximize(this.window.id); }
    
    // Auto-pair brackets
    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
    if (pairs[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const start = this.editor.selectionStart;
      const end = this.editor.selectionEnd;
      if (start === end) {
        e.preventDefault();
        const after = this.editor.value.slice(start);
        if (!after.startsWith(pairs[e.key])) {
          this.editor.value = this.editor.value.slice(0, start) + e.key + pairs[e.key] + after;
          this.editor.selectionStart = this.editor.selectionEnd = start + 1;
          this.onInput();
        }
      }
    }
  }

  onContextMenu(e) {
    e.preventDefault();
    OS.contextMenu.show(e.clientX, e.clientY, [
      { label: 'Undo', action: 'undo', shortcut: '⌘Z' },
      { label: 'Redo', action: 'redo', shortcut: '⌘⇧Z' },
      'divider',
      { label: 'Cut', action: 'cut', shortcut: '⌘X' },
      { label: 'Copy', action: 'copy', shortcut: '⌘C' },
      { label: 'Paste', action: 'paste', shortcut: '⌘V' },
      'divider',
      { label: 'Select All', action: 'selectAll', shortcut: '⌘A' },
      'divider',
      { label: 'Toggle Comment', action: 'comment', shortcut: '⌘/' },
      { label: 'Format Document', action: 'format', shortcut: '⌘⇧F' },
    ], { editor: this });
  }

  onContextAction(action) {
    switch (action) {
      case 'undo': this.execCommand('undo'); break;
      case 'redo': this.execCommand('redo'); break;
      case 'cut': this.execCommand('cut'); break;
      case 'copy': this.execCommand('copy'); break;
      case 'paste': this.paste(); break;
      case 'selectAll': this.editor.select(); break;
      case 'comment': this.toggleComment(); break;
      case 'format': this.formatDocument(); break;
    }
  }

  async paste() {
    try {
      const text = await navigator.clipboard.readText();
      this.execCommand('insertText', text);
    } catch {}
  }

  // Tab Management
  newFile(content = '', path = null, language = 'plain') {
    const tab = {
      id: `tab-${this.nextTabId++}`,
      path,
      name: path ? path.split('/').pop() : `Untitled-${this.tabs.length + 1}`,
      content,
      language,
      modified: false,
      readonly: false,
      cursorPos: { start: 0, end: 0 },
      scrollPos: 0,
    };
    this.tabs.push(tab);
    this.switchTab(tab.id);
    this.renderTabs();
    return tab;
  }

  switchTab(id) {
    // Save current tab state
    if (this.activeTabId) {
      const currentTab = this.tabs.find(t => t.id === this.activeTabId);
      if (currentTab) {
        currentTab.content = this.editor.value;
        currentTab.cursorPos = { start: this.editor.selectionStart, end: this.editor.selectionEnd };
        currentTab.scrollPos = this.editor.scrollTop;
      }
    }

    const tab = this.tabs.find(t => t.id === id);
    if (!tab) return;

    this.activeTabId = id;
    this.editor.value = tab.content;
    this.languageSelect.value = tab.language;
    this.editor.readOnly = tab.readonly;
    
    // Restore cursor
    setTimeout(() => {
      this.editor.selectionStart = tab.cursorPos.start;
      this.editor.selectionEnd = tab.cursorPos.end;
      this.editor.scrollTop = tab.scrollPos;
    }, 0);

    this.renderTabs();
    this.updateLineNumbers();
    this.highlightSyntax();
    this.updateStatus();
    this.updateWindowTitle();
  }

  closeTab(id) {
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx === -1) return;

    const tab = this.tabs[idx];
    if (tab.modified && !confirm(`Save changes to ${tab.name}?`)) return;
    if (tab.modified) { this.switchTab(id); this.saveFile(); }

    this.tabs.splice(idx, 1);

    if (this.activeTabId === id) {
      if (this.tabs.length > 0) {
        this.switchTab(this.tabs[Math.min(idx, this.tabs.length - 1)].id);
      } else {
        this.activeTabId = null;
        this.editor.value = '';
        this.renderTabs();
        this.updateStatus();
      }
    }
    this.renderTabs();
  }

  renderTabs() {
    this.tabsList.innerHTML = this.tabs.map(tab => `
      <button class="tab${tab.id === this.activeTabId ? ' active' : ''}${tab.modified ? ' modified' : ''}" 
              data-tab-id="${tab.id}" role="tab" aria-selected="${tab.id === this.activeTabId}"
              style="display:flex;align-items:center;gap:6px;padding:6px 10px;border:none;background:transparent;border-radius:4px 4px 0 0;color:${tab.id === this.activeTabId ? '#e2e8f0' : '#8b949e'};font:inherit;font-size:12px;cursor:pointer;min-width:120px;max-width:200px;position:relative;"
              title="${tab.path || 'Untitled'}">
        ${tab.modified ? '<span style="width:6px;height:6px;border-radius:50%;background:#f87171;flex-shrink:0;"></span>' : ''}
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.escapeHtml(tab.name)}</span>
        <button class="tab-close" data-tab-id="${tab.id}" style="width:16px;height:16px;border:none;background:transparent;color:#8b949e;cursor:pointer;border-radius:2px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 100ms;" title="Close">
          <svg viewBox="0 0 24 24" style="width:12px;height:12px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </button>
    `).join('');

    // Bind tab events
    this.tabsList.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        if (!e.target.closest('.tab-close')) this.switchTab(tab.dataset.tabId);
      });
      tab.addEventListener('mouseenter', () => tab.querySelector('.tab-close').style.opacity = '1');
      tab.addEventListener('mouseleave', () => tab.querySelector('.tab-close').style.opacity = '0');
    });
    this.tabsList.querySelectorAll('.tab-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(btn.dataset.tabId);
      });
    });

    // Context menu on tabs
    this.tabsList.addEventListener('contextmenu', (e) => {
      const tab = e.target.closest('.tab');
      if (tab) {
        e.preventDefault();
        OS.contextMenu.show(e.clientX, e.clientY, [
          { label: 'Close', action: 'close', danger: true },
          { label: 'Close Others', action: 'close-others' },
          { label: 'Close All', action: 'close-all' },
          'divider',
          { label: 'Copy Path', action: 'copy-path' },
          { label: 'Reveal in Files', action: 'reveal' },
        ], { tabId: tab.dataset.tabId });
      }
    });
  }

  updateTabModified() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab) {
      tab.modified = tab.content !== this.editor.value;
      this.renderTabs();
    }
  }

  // File Operations
  async openFile(path) {
    try {
      const content = OS.filesystem.readFile(path);
      const existing = this.tabs.find(t => t.path === path);
      if (existing) {
        this.switchTab(existing.id);
        return;
      }
      const lang = this.detectLanguage(path);
      this.newFile(content, path, lang);
    } catch (err) {
      OS.notifications.show('Editor', `Failed to open ${path}: ${err.message}`);
    }
  }

  saveFile(saveAs = false) {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab) return;

    let path = tab.path;
    if (!path || saveAs) {
      // In a real app, show file picker
      const name = prompt('Save as:', tab.name || 'untitled.txt');
      if (!name) return;
      path = tab.path ? tab.path.replace(/[^/]+$/, name) : '/' + name;
    }

    try {
      OS.filesystem.writeFile(path, this.editor.value);
      tab.path = path;
      tab.name = path.split('/').pop();
      tab.modified = false;
      tab.content = this.editor.value;
      this.renderTabs();
      this.updateWindowTitle();
      this.updateStatus();
      if (OS.audio) OS.audio.play('pop');
    } catch (err) {
      OS.notifications.show('Editor', `Failed to save: ${err.message}`);
    }
  }

  detectLanguage(path) {
    const ext = path.split('.').pop().toLowerCase();
    const map = {
      js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript',
      html: 'html', htm: 'html', css: 'css', scss: 'css', less: 'css',
      json: 'json', md: 'markdown', markdown: 'markdown',
      py: 'python', rs: 'rust', go: 'go', cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
      c: 'c', h: 'c', hpp: 'cpp', java: 'java', kt: 'kotlin',
      sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell',
      sql: 'sql', yaml: 'yaml', yml: 'yaml', xml: 'xml', svg: 'xml',
    };
    return map[ext] || 'plain';
  }

  // Syntax Highlighting (Simple)
  highlightSyntax() {
    // This is a simplified version - in production would use a proper highlighter
    // For now, we just update the language display
    this.updateLanguage();
  }

  updateLanguage() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab) tab.language = this.languageSelect.value;
    this.window.element.querySelector('#status-language').textContent = 
      this.languageSelect.options[this.languageSelect.selectedIndex].text;
  }

  // Line Numbers
  updateLineNumbers() {
    if (!this.showLineNumbers) return;
    const lines = this.editor.value.split('\n');
    this.lineNumbers.innerHTML = lines.map((_, i) => 
      `<div style="height:1.6em;padding:0 8px;${i === this.getCurrentLine() - 1 ? 'color:#e2e8f0;font-weight:600;' : ''}">${i + 1}</div>`
    ).join('');
  }

  syncLineNumbers() {
    this.lineNumbers.scrollTop = this.editor.scrollTop;
  }

  getCurrentLine() {
    const text = this.editor.value.slice(0, this.editor.selectionStart);
    return text.split('\n').length;
  }

  // Find/Replace
  toggleFindBar(showReplace) {
    if (this.findBar.style.display === 'flex' && !showReplace) {
      this.hideFindBar();
    } else {
      this.findBar.style.display = 'flex';
      this.findInput.style.display = 'block';
      this.replaceInput.style.display = showReplace ? 'block' : 'none';
      this.window.element.querySelector('#replace-btn').style.display = showReplace ? 'block' : 'none';
      this.window.element.querySelector('#replace-all-btn').style.display = showReplace ? 'block' : 'none';
      this.findInput.value = this.searchQuery;
      this.replaceInput.value = '';
      this.findInput.focus();
      this.findInput.select();
    }
  }

  hideFindBar() {
    this.findBar.style.display = 'none';
    this.clearSearchHighlight();
    this.editor.focus();
  }

  find(query) {
    this.searchQuery = query;
    this.clearSearchHighlight();
    if (!query) { this.findCount.textContent = ''; return; }

    const text = this.editor.value;
    const regex = new RegExp(this.escapeRegExp(query), 'gi');
    this.searchMatches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      this.searchMatches.push({ start: match.index, end: match.index + match[0].length });
    }

    this.findCount.textContent = `${this.searchMatches.length} match${this.searchMatches.length !== 1 ? 'es' : ''}`;
    this.searchIndex = -1;
    this.highlightCurrentMatch();
  }

  findNext() {
    if (!this.searchMatches.length) return;
    this.searchIndex = (this.searchIndex + 1) % this.searchMatches.length;
    this.highlightCurrentMatch();
  }

  findPrev() {
    if (!this.searchMatches.length) return;
    this.searchIndex = (this.searchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
    this.highlightCurrentMatch();
  }

  highlightCurrentMatch() {
    this.clearSearchHighlight();
    if (this.searchIndex < 0 || this.searchIndex >= this.searchMatches.length) return;
    
    const match = this.searchMatches[this.searchIndex];
    this.editor.setSelectionRange(match.start, match.end);
    this.editor.focus();
    
    // Scroll to match
    const textBefore = this.editor.value.slice(0, match.start);
    const lineHeight = this.fontSize * 1.6;
    const line = textBefore.split('\n').length;
    this.editor.scrollTop = (line - 5) * lineHeight;
    
    this.findCount.textContent = `${this.searchIndex + 1} of ${this.searchMatches.length}`;
  }

  clearSearchHighlight() {
    if (this.searchMatches.length > 0 && this.editor.selectionStart !== this.editor.selectionEnd) {
      // Only clear if we're on a search match
      const sel = this.editor.value.slice(this.editor.selectionStart, this.editor.selectionEnd);
      if (this.searchQuery && sel.toLowerCase() === this.searchQuery.toLowerCase()) {
        this.editor.setSelectionRange(this.editor.selectionEnd, this.editor.selectionEnd);
      }
    }
  }

  replace() {
    if (this.searchIndex >= 0 && this.searchIndex < this.searchMatches.length) {
      const match = this.searchMatches[this.searchIndex];
      const before = this.editor.value.slice(0, match.start);
      const after = this.editor.value.slice(match.end);
      const replacement = this.replaceInput.value;
      this.editor.value = before + replacement + after;
      this.onInput();
      this.find(this.findInput.value); // Refresh matches
    }
  }

  replaceAll() {
    if (!this.searchQuery) return;
    const replacement = this.replaceInput.value;
    this.editor.value = this.editor.value.split(this.searchQuery).join(replacement);
    this.onInput();
    this.find(this.findInput.value);
  }

  gotoLine() {
    const line = prompt('Go to line:', this.getCurrentLine());
    if (!line) return;
    const n = parseInt(line);
    if (isNaN(n) || n < 1) return;
    
    const lines = this.editor.value.split('\n');
    if (n > lines.length) return;
    
    let pos = 0;
    for (let i = 0; i < n - 1; i++) pos += lines[i].length + 1;
    
    this.editor.setSelectionRange(pos, pos);
    this.editor.focus();
    
    // Scroll to line
    const lineHeight = this.fontSize * 1.6;
    this.editor.scrollTop = (n - 5) * lineHeight;
    this.updateCursorPosition();
  }

  // Editing Helpers
  execCommand(cmd, arg) {
    switch (cmd) {
      case 'undo': document.execCommand('undo'); break;
      case 'redo': document.execCommand('redo'); break;
      case 'cut': document.execCommand('cut'); break;
      case 'copy': document.execCommand('copy'); break;
      case 'insertText': document.execCommand('insertText', false, arg); break;
    }
    this.onInput();
  }

  toggleComment() {
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    if (start === end) return;

    const text = this.editor.value.slice(start, end);
    const lines = text.split('\n');
    const commentChar = this.getCommentChar();
    if (!commentChar) return;

    const allCommented = lines.every(l => l.trim().startsWith(commentChar));
    const newLines = lines.map(l => {
      if (allCommented) return l.replace(new RegExp('^(\\s*)' + this.escapeRegExp(commentChar) + '\\s?'), '$1');
      return l.replace(/^(\s*)/, '$1' + commentChar + ' ');
    });

    this.editor.value = this.editor.value.slice(0, start) + newLines.join('\n') + this.editor.value.slice(end);
    this.onInput();
  }

  getCommentChar() {
    const lang = this.languageSelect.value;
    if (['javascript', 'typescript', 'java', 'cpp', 'c', 'go', 'rust', 'css'].includes(lang)) return '//';
    if (['python', 'shell', 'yaml'].includes(lang)) return '#';
    if (['html', 'xml'].includes(lang)) return '<!--'; // Simplified
    return '//';
  }

  formatDocument() {
    // Simple formatting - just fix indentation
    const lines = this.editor.value.split('\n');
    let indent = 0;
    const formatted = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) indent = Math.max(0, indent - 1);
      const result = ' '.repeat(indent * this.tabSize) + trimmed;
      if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) indent++;
      return result;
    });
    this.editor.value = formatted.join('\n');
    this.onInput();
  }

  // Status Bar
  updateCursorPosition() {
    const pos = this.editor.selectionStart;
    const text = this.editor.value.slice(0, pos);
    const lines = text.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    
    this.window.element.querySelector('#cursor-pos').textContent = `Ln ${line}, Col ${col}`;
    this.window.element.querySelector('#status-position').textContent = `Ln ${line}, Col ${col}`;

    // Selection info
    if (this.editor.selectionStart !== this.editor.selectionEnd) {
      const selText = this.editor.value.slice(this.editor.selectionStart, this.editor.selectionEnd);
      const selLines = selText.split('\n').length;
      const selChars = selText.length;
      this.window.element.querySelector('#status-selection').textContent = `${selLines} line${selLines !== 1 ? 's' : ''}, ${selChars} char${selChars !== 1 ? 's' : ''}`;
      this.window.element.querySelector('#status-selection').style.display = 'inline';
    } else {
      this.window.element.querySelector('#status-selection').style.display = 'none';
    }
  }

  updateStatus() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab) return;

    this.window.element.querySelector('#status-file').textContent = tab.path ? tab.path : tab.name;
    this.window.element.querySelector('#status-modified').style.display = tab.modified ? 'inline' : 'none';
    this.window.element.querySelector('#status-readonly').style.display = tab.readonly ? 'inline' : 'none';
    this.updateCursorPosition();
  }

  updateWindowTitle() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab) {
      this.window.title = tab.name + (tab.modified ? ' ●' : '');
      this.window.element.querySelector('.window-title-text').textContent = this.window.title;
    }
  }

  escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => {
      const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": '\'' };
      return map[c];
    });
  }

  escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  getState() {
    return {
      tabs: this.tabs.map(t => ({
        path: t.path, name: t.name, content: t.content,
        language: t.language, modified: t.modified, readonly: t.readonly,
        cursorPos: t.cursorPos, scrollPos: t.scrollPos,
      })),
      activeTabId: this.activeTabId,
      fontSize: this.fontSize,
      theme: this.theme,
      wordWrap: this.wordWrap,
      showLineNumbers: this.showLineNumbers,
      tabSize: this.tabSize,
    };
  }

  restoreState(state) {
    if (!state) return;
    if (state.fontSize) this.fontSize = state.fontSize;
    if (state.theme) this.theme = state.theme;
    if (state.wordWrap !== undefined) this.wordWrap = state.wordWrap;
    if (state.showLineNumbers !== undefined) this.showLineNumbers = state.showLineNumbers;
    if (state.tabSize) this.tabSize = state.tabSize;
    
    this.lineNumbers.style.display = this.showLineNumbers ? 'block' : 'none';
    this.editor.style.fontSize = this.fontSize + 'px';
    this.editor.style.tabSize = this.tabSize;
    this.editor.style.whiteSpace = this.wordWrap ? 'pre-wrap' : 'pre';

    if (state.tabs?.length) {
      state.tabs.forEach(t => {
        const tab = this.newFile(t.content, t.path, t.language);
        tab.modified = t.modified;
        tab.readonly = t.readonly;
        tab.cursorPos = t.cursorPos;
        tab.scrollPos = t.scrollPos;
      });
      if (state.activeTabId) {
        const tab = this.tabs.find(t => t.path === state.activeTabId || t.id === state.activeTabId);
        if (tab) this.switchTab(tab.id);
      }
    }
  }

  destroy() {}
}

// Register
AppRegistry.register({
  id: 'editor',
  name: 'Editor',
  icon: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5"/></svg>',
  class: EditorApp,
  width: 1000,
  height: 700,
  singleInstance: false,
  keywords: ['code editor', 'text editor', 'IDE', 'notepad'],
});