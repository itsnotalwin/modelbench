/* ==========================================================================
   Lumina OS — Browser App
   Simple web browser with tabs, bookmarks, history
   ========================================================================== */

class BrowserApp {
  constructor(window, options = {}) {
    this.window = window;
    this.tabs = [];
    this.activeTabId = null;
    this.nextTabId = 1;
    this.history = [];
    this.bookmarks = [];
    this.homePage = 'https://www.google.com';
  }

  init() {
    this.loadData();
    this.render();
    this.bindEvents();
    this.newTab(this.options.url || this.homePage);
  }

  loadData() {
    try {
      const history = OS.filesystem.readFile('/.browser_history.json');
      this.history = JSON.parse(history);
    } catch {}
    try {
      const bookmarks = OS.filesystem.readFile('/.browser_bookmarks.json');
      this.bookmarks = JSON.parse(bookmarks);
    } catch {
      this.bookmarks = [
        { title: 'Google', url: 'https://www.google.com' },
        { title: 'GitHub', url: 'https://github.com' },
        { title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
        { title: 'Lumina OS Docs', url: 'https://lumina-os.example.com' },
      ];
    }
  }

  saveData() {
    try {
      OS.filesystem.writeFile('/.browser_history.json', JSON.stringify(this.history.slice(-100)));
      OS.filesystem.writeFile('/.browser_bookmarks.json', JSON.stringify(this.bookmarks));
    } catch {}
  }

  render() {
    const content = this.window.element.querySelector('.window-content');
    content.innerHTML = `
      <div class="browser-app" style="height:100%;display:flex;flex-direction:column;background:#f8fafc;color:#0f172a;">
        <!-- Toolbar -->
        <div class="browser-toolbar" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:white;border-bottom:1px solid #e2e8f0;">
          <div class="nav-buttons" style="display:flex;gap:4px;">
            <button class="browser-btn" id="btn-back" title="Back (⌘[)" disabled><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
            <button class="browser-btn" id="btn-forward" title="Forward (⌘])" disabled><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
            <button class="browser-btn" id="btn-reload" title="Reload (⌘R)"><svg viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></button>
            <button class="browser-btn" id="btn-home" title="Home"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12"/></svg></button>
          </div>
          <div class="url-bar" style="flex:1;display:flex;align-items:center;gap:8px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:0 12px;height:40px;min-width:300px;">
            <svg id="url-icon" viewBox="0 0 24 24" style="width:16px;height:16px;color:#94a3b8;"><path d="M21 12a9 9 0 0 1-9 9c-2.52 0-4.93-.82-6.74-2.16L3 20l5.24-7.31A8.95 8.95 0 0 1 12 3c2.52 0 4.93.82 6.74 2.16L21 4l-5.24 7.31A8.95 8.95 0 0 1 21 12z"/></svg>
            <input type="text" id="url-input" class="url-input" placeholder="Search or enter address" style="flex:1;border:none;background:transparent;font:inherit;font-size:14px;outline:none;color:#0f172a;">
            <button class="browser-btn" id="btn-bookmark" title="Bookmark (⌘D)"><svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>
            <button class="browser-btn" id="btn-menu" title="Menu"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg></button>
          </div>
          <div class="toolbar-actions" style="display:flex;gap:4px;">
            <button class="browser-btn" id="btn-new-tab" title="New Tab (⌘T)"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
          </div>
        </div>

        <!-- Tab Bar -->
        <div class="browser-tabs" style="display:flex;align-items:center;background:white;border-bottom:1px solid #e2e8f0;height:36px;padding:0 4px;overflow-x:auto;">
          <div id="tabs-container" style="display:flex;gap:2px;flex:1;"></div>
          <button class="browser-btn" id="btn-new-tab-2" title="New Tab" style="margin-left:4px;"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        </div>

        <!-- Bookmarks Bar (optional) -->
        <div id="bookmarks-bar" class="bookmarks-bar" style="display:none;background:white;border-bottom:1px solid #e2e8f0;padding:4px 8px;overflow-x:auto;"></div>

        <!-- Web View -->
        <div class="browser-view" style="flex:1;overflow:hidden;position:relative;background:white;">
          <div id="webview-container" style="width:100%;height:100%;position:relative;"></div>
          
          <!-- Start Page -->
          <div id="start-page" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px;text-align:center;">
            <svg viewBox="0 0 24 24" style="width:64px;height:64px;color:#6366f1;margin-bottom:24px;"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/><path d="M2 12a10 10 0 0 0 10 10"/></svg>
            <h1 style="font-size:28px;font-weight:300;color:#0f172a;margin-bottom:8px;">Lumina Browser</h1>
            <p style="font-size:16px;color:#64748b;margin-bottom:32px;">Fast, private, and beautifully integrated</p>
            <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
              ${this.bookmarks.slice(0, 6).map(b => `
                <a href="${b.url}" class="start-link" data-url="${b.url}" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 24px;background:#f1f5f9;border-radius:12px;text-decoration:none;color:#0f172a;min-width:120px;transition:background 100ms;">
                  <svg viewBox="0 0 24 24" style="width:24px;height:24px;color:#6366f1;"><path d="M21 12a9 9 0 0 1-9 9c-2.52 0-4.93-.82-6.74-2.16L3 20l5.24-7.31A8.95 8.95 0 0 1 12 3c2.52 0 4.93.82 6.74 2.16L21 4l-5.24 7.31A8.95 8.95 0 0 1 21 12z"/></svg>
                  <span style="font-size:13px;font-weight:500;">${b.title}</span>
                </a>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Status Bar -->
        <div class="browser-status" style="display:flex;align-items:center;justify-content:space-between;padding:4px 12px;background:#f1f5f9;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;">
          <span id="status-text">Ready</span>
          <div style="display:flex;align-items:center;gap:12px;">
            <span id="status-zoom">100%</span>
            <button class="browser-btn" id="btn-devtools" title="Developer Tools" style="padding:4px;"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M2 12a10 10 0 0 0 10 10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="16" y1="12" x2="12" y2="12"/></svg></button>
          </div>
        </div>
      </div>
    `;

    this.tabsContainer = this.window.element.querySelector('#tabs-container');
    this.urlInput = this.window.element.querySelector('#url-input');
    this.webviewContainer = this.window.element.querySelector('#webview-container');
    this.startPage = this.window.element.querySelector('#start-page');
    this.bookmarksBar = this.window.element.querySelector('#bookmarks-bar');
    this.statusText = this.window.element.querySelector('#status-text');
    this.urlIcon = this.window.element.querySelector('#url-icon');

    this.bindToolbarEvents();
    this.renderTabs();
    this.renderBookmarksBar();
  }

  bindToolbarEvents() {
    const btn = (id, fn) => this.window.element.querySelector(`#${id}`)?.addEventListener('click', fn);

    btn('btn-back', () => this.goBack());
    btn('btn-forward', () => this.goForward());
    btn('btn-reload', () => this.reload());
    btn('btn-home', () => this.navigate(this.homePage));
    btn('btn-new-tab', () => this.newTab());
    btn('btn-new-tab-2', () => this.newTab());
    btn('btn-bookmark', () => this.toggleBookmark());
    btn('btn-menu', () => this.showMenu());
    btn('btn-devtools', () => this.openDevTools());

    this.urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.navigate(this.urlInput.value);
      }
    });

    // Start page links
    this.startPage.addEventListener('click', (e) => {
      const link = e.target.closest('.start-link');
      if (link) {
        e.preventDefault();
        this.navigate(link.dataset.url);
      }
    });
  }

  bindEvents() {
    this.window.element.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.includes('Mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 't' && mod) { e.preventDefault(); this.newTab(); }
      if (e.key === 'w' && mod) { e.preventDefault(); this.closeCurrentTab(); }
      if (e.key === 'r' && mod) { e.preventDefault(); this.reload(); }
      if (e.key === '[' && mod) { this.goBack(); }
      if (e.key === ']' && mod) { this.goForward(); }
      if (e.key === 'd' && mod) { this.toggleBookmark(); }
      if (e.key === 'l' && mod) { e.preventDefault(); this.urlInput.focus(); this.urlInput.select(); }
      if (e.key === '1' && mod) { this.switchTabByIndex(0); }
      if (e.key === '2' && mod) { this.switchTabByIndex(1); }
      if (e.key === '3' && mod) { this.switchTabByIndex(2); }
      if (e.key === '4' && mod) { this.switchTabByIndex(3); }
      if (e.key === '5' && mod) { this.switchTabByIndex(4); }
      if (e.key === '6' && mod) { this.switchTabByIndex(5); }
      if (e.key === '7' && mod) { this.switchTabByIndex(6); }
      if (e.key === '8' && mod) { this.switchTabByIndex(7); }
      if (e.key === '9' && mod) { this.switchTabByIndex(this.tabs.length - 1); }
    });
  }

  newTab(url = null) {
    const id = `tab-${this.nextTabId++}`;
    const tab = {
      id,
      title: 'New Tab',
      url: url || this.homePage,
      history: [],
      historyIndex: -1,
      loading: false,
      favicon: null,
    };
    this.tabs.push(tab);
    this.switchTab(id);
    if (url) this.navigate(url, false);
    this.renderTabs();
  }

  switchTab(id) {
    // Save current tab state
    if (this.activeTabId) {
      const currentTab = this.tabs.find(t => t.id === this.activeTabId);
      if (currentTab && currentTab.webview) {
        currentTab.webview.style.display = 'none';
      }
    }

    const tab = this.tabs.find(t => t.id === id);
    if (!tab) return;

    this.activeTabId = id;
    
    // Create or show webview
    if (!tab.webview) {
      tab.webview = this.createWebview(tab);
      this.webviewContainer.appendChild(tab.webview);
    }
    tab.webview.style.display = 'block';
    
    this.updateUrlBar();
    this.updateNavButtons();
    this.renderTabs();
    this.updateWindowTitle();
  }

  createWebview(tab) {
    const webview = document.createElement('iframe');
    webview.style.cssText = 'width:100%;height:100%;border:none;background:white;';
    webview.src = tab.url;
    webview.addEventListener('load', () => {
      tab.loading = false;
      this.updateTabTitle(tab);
      this.updateUrlBar();
      this.updateNavButtons();
      this.addToHistory(tab.url, tab.title);
      this.statusText.textContent = 'Done';
    });
    webview.addEventListener('error', () => {
      tab.loading = false;
      this.statusText.textContent = 'Failed to load';
    });
    return webview;
  }

  closeTab(id) {
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx === -1) return;

    const tab = this.tabs[idx];
    if (tab.webview) tab.webview.remove();
    this.tabs.splice(idx, 1);

    if (this.activeTabId === id) {
      if (this.tabs.length > 0) {
        this.switchTab(this.tabs[Math.min(idx, this.tabs.length - 1)].id);
      } else {
        this.activeTabId = null;
        this.startPage.style.display = 'flex';
        this.webviewContainer.innerHTML = '';
        this.updateUrlBar();
        this.updateWindowTitle();
      }
    }
    this.renderTabs();
  }

  closeCurrentTab() {
    if (this.activeTabId) this.closeTab(this.activeTabId);
  }

  switchTabByIndex(index) {
    if (index >= 0 && index < this.tabs.length) {
      this.switchTab(this.tabs[index].id);
    }
  }

  navigate(url, addToHistory = true) {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab) return;

    // Normalize URL
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://') && !url.startsWith('about:')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      } else {
        url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
      }
    }

    tab.loading = true;
    this.statusText.textContent = 'Loading...';
    
    if (tab.webview) {
      tab.webview.src = url;
    }
    
    if (addToHistory) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
      tab.history.push(url);
      tab.historyIndex = tab.history.length - 1;
    }
  }

  goBack() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.historyIndex > 0) {
      tab.historyIndex--;
      tab.webview.src = tab.history[tab.historyIndex];
    }
  }

  goForward() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.historyIndex < tab.history.length - 1) {
      tab.historyIndex++;
      tab.webview.src = tab.history[tab.historyIndex];
    }
  }

  reload() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.webview) {
      tab.webview.src = tab.webview.src;
    }
  }

  updateTabTitle(tab) {
    try {
      tab.title = tab.webview.contentDocument?.title || new URL(tab.webview.src).hostname;
      tab.favicon = this.getFavicon(tab.webview.contentDocument);
    } catch {
      tab.title = new URL(tab.webview.src).hostname;
    }
    this.renderTabs();
    this.updateWindowTitle();
  }

  getFavicon(doc) {
    try {
      const icon = doc.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
      return icon ? icon.href : `https://www.google.com/s2/favicons?domain=${new URL(doc.location.href).hostname}&sz=32`;
    } catch {
      return null;
    }
  }

  updateUrlBar() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab) {
      this.urlInput.value = tab.webview?.src || tab.url || '';
      this.updateBookmarkStar(tab);
    } else {
      this.urlInput.value = '';
    }
  }

  updateBookmarkStar(tab) {
    const isBookmarked = this.bookmarks.some(b => b.url === tab.url);
    this.window.element.querySelector('#btn-bookmark svg').style.color = isBookmarked ? '#fbbf24' : '#94a3b8';
  }

  toggleBookmark() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab) return;
    
    const idx = this.bookmarks.findIndex(b => b.url === tab.url);
    if (idx >= 0) {
      this.bookmarks.splice(idx, 1);
    } else {
      this.bookmarks.push({ title: tab.title, url: tab.url });
    }
    this.saveData();
    this.updateBookmarkStar(tab);
    this.renderBookmarksBar();
  }

  renderBookmarksBar() {
    if (this.bookmarks.length === 0) {
      this.bookmarksBar.style.display = 'none';
      return;
    }
    this.bookmarksBar.style.display = 'block';
    this.bookmarksBar.innerHTML = this.bookmarks.map(b => `
      <a href="#" class="bookmark-item" data-url="${b.url}" style="display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:6px;color:#0f172a;text-decoration:none;font-size:12px;font-weight:500;white-space:nowrap;transition:background 100ms;">
        <svg viewBox="0 0 24 24" style="width:14px;height:14px;color:#94a3b8;"><path d="M21 12a9 9 0 0 1-9 9c-2.52 0-4.93-.82-6.74-2.16L3 20l5.24-7.31A8.95 8.95 0 0 1 12 3c2.52 0 4.93.82 6.74 2.16L21 4l-5.24 7.31A8.95 8.95 0 0 1 21 12z"/></svg>
        ${this.escapeHtml(b.title)}
      </a>
    `).join('');
    
    this.bookmarksBar.querySelectorAll('.bookmark-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(link.dataset.url);
      });
    });
  }

  renderTabs() {
    this.tabsContainer.innerHTML = this.tabs.map((tab, i) => `
      <button class="browser-tab${tab.id === this.activeTabId ? ' active' : ''}${tab.loading ? ' loading' : ''}" 
              data-tab-id="${tab.id}" style="display:flex;align-items:center;gap:6px;padding:0 12px;height:30px;border:none;background:transparent;border-radius:6px 6px 0 0;color:${tab.id === this.activeTabId ? '#0f172a' : '#64748b'};font:inherit;font-size:13px;cursor:pointer;min-width:160px;max-width:240px;position:relative;">
        ${tab.favicon ? `<img src="${tab.favicon}" style="width:14px;height:14px;border-radius:2px;">` : '<svg viewBox="0 0 24 24" style="width:14px;height:14px;color:#94a3b8;"><path d="M21 12a9 9 0 0 1-9 9"/></svg>'}
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.escapeHtml(tab.title)}</span>
        <button class="tab-close" style="width:18px;height:18px;border:none;background:transparent;color:#94a3b8;cursor:pointer;border-radius:3px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 100ms;" title="Close">
          <svg viewBox="0 0 24 24" style="width:12px;height:12px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </button>
    `).join('');

    this.tabsContainer.querySelectorAll('.browser-tab').forEach(tabEl => {
      tabEl.addEventListener('click', (e) => {
        if (!e.target.closest('.tab-close')) this.switchTab(tabEl.dataset.tabId);
      });
      tabEl.addEventListener('mouseenter', () => tabEl.querySelector('.tab-close').style.opacity = '1');
      tabEl.addEventListener('mouseleave', () => tabEl.querySelector('.tab-close').style.opacity = '0');
      tabEl.addEventListener('dblclick', () => this.closeTab(tabEl.dataset.tabId));
    });

    this.tabsContainer.querySelectorAll('.tab-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(btn.closest('.browser-tab').dataset.tabId);
      });
    });
  }

  updateNavButtons() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    this.window.element.querySelector('#btn-back').disabled = !tab || tab.historyIndex <= 0;
    this.window.element.querySelector('#btn-forward').disabled = !tab || tab.historyIndex >= tab.history.length - 1;
  }

  updateWindowTitle() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    this.window.title = tab ? `${tab.title} — Lumina Browser` : 'Lumina Browser';
    this.window.element.querySelector('.window-title-text').textContent = this.window.title;
  }

  addToHistory(url, title) {
    if (!url.startsWith('http')) return;
    this.history.unshift({ url, title, time: Date.now() });
    if (this.history.length > 500) this.history.pop();
    this.saveData();
  }

  showMenu() {
    OS.contextMenu.show(
      this.window.element.querySelector('#btn-menu').getBoundingClientRect().right,
      this.window.element.querySelector('#btn-menu').getBoundingClientRect().bottom,
      [
        { label: 'New Tab', action: 'new-tab', shortcut: '⌘T' },
        { label: 'New Window', action: 'new-window', shortcut: '⌘N' },
        'divider',
        { label: 'Bookmarks', action: 'bookmarks', shortcut: '⌘⇧B' },
        { label: 'History', action: 'history', shortcut: '⌘H' },
        { label: 'Downloads', action: 'downloads', shortcut: '⌘⇧J' },
        'divider',
        { label: 'Developer Tools', action: 'devtools', shortcut: '⌘⌥I' },
        { label: 'Settings', action: 'settings' },
      ],
      { browser: this }
    );
  }

  onContextAction(action) {
    switch (action) {
      case 'new-tab': this.newTab(); break;
      case 'new-window': AppRegistry.launch('browser'); break;
      case 'bookmarks': this.showBookmarksManager(); break;
      case 'history': this.showHistory(); break;
      case 'downloads': OS.notifications.show('Browser', 'Downloads panel coming soon'); break;
      case 'devtools': this.openDevTools(); break;
      case 'settings': AppRegistry.launch('settings'); break;
    }
  }

  showBookmarksManager() {
    // Would open a bookmarks manager dialog
    OS.notifications.show('Browser', 'Bookmarks manager coming soon');
  }

  showHistory() {
    // Would open history panel
    OS.notifications.show('Browser', 'History panel coming soon');
  }

  openDevTools() {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.webview) {
      // In a real browser, this would open devtools
      OS.notifications.show('Browser', 'Developer tools would open here');
    }
  }

  escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => {
      const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": '\'' };
      return map[c];
    });
  }

  getState() {
    return {
      tabs: this.tabs.map(t => ({ url: t.url, title: t.title })),
      activeTabId: this.activeTabId,
      bookmarks: this.bookmarks,
    };
  }

  restoreState(state) {
    if (!state) return;
    if (state.bookmarks) this.bookmarks = state.bookmarks;
    if (state.tabs?.length) {
      state.tabs.forEach((t, i) => this.newTab(t.url));
      if (state.activeTabId) {
        const tab = this.tabs.find(t => t.id === state.activeTabId) || this.tabs[0];
        if (tab) this.switchTab(tab.id);
      }
    }
  }

  destroy() {}
}

// Register
AppRegistry.register({
  id: 'browser',
  name: 'Browser',
  icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  class: BrowserApp,
  width: 1200,
  height: 800,
  singleInstance: false,
  keywords: ['web browser', 'internet', 'web', 'surf'],
});