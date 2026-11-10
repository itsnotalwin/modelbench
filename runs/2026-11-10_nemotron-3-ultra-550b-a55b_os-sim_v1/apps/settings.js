/* ==========================================================================
   Lumina OS — Settings App
   System preferences, appearance, behavior
   ========================================================================== */

class SettingsApp {
  constructor(window, options = {}) {
    this.window = window;
    this.currentCategory = 'general';
    this.categories = [
      { id: 'general', name: 'General', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>' },
      { id: 'appearance', name: 'Appearance', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>' },
      { id: 'desktop', name: 'Desktop & Dock', icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' },
      { id: 'keyboard', name: 'Keyboard', icon: '<svg viewBox="0 0 24 24"><path d="M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="M8 9h8"/><path d="M8 13h6"/><path d="M8 17h4"/></svg>' },
      { id: 'mouse', name: 'Mouse & Trackpad', icon: '<svg viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 6v8"/></svg>' },
      { id: 'sound', name: 'Sound', icon: '<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>' },
      { id: 'network', name: 'Network', icon: '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' },
      { id: 'storage', name: 'Storage', icon: '<svg viewBox="0 0 24 24"><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/></svg>' },
      { id: 'privacy', name: 'Privacy & Security', icon: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
      { id: 'accessibility', name: 'Accessibility', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>' },
      { id: 'updates', name: 'Software Update', icon: '<svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="23 22 23 18 17 18"/><polyline points="17 18 11 12 17 6"/></svg>' },
      { id: 'about', name: 'About', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' },
    ];
  }

  init() {
    this.render();
    this.bindEvents();
    this.showCategory('general');
  }

  render() {
    const content = this.window.element.querySelector('.window-content');
    content.innerHTML = `
      <div class="settings-app" style="height:100%;display:flex;background:#f8fafc;color:#0f172a;">
        <!-- Sidebar -->
        <aside class="settings-sidebar" style="width:260px;background:white;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:20px;border-bottom:1px solid #e2e8f0;">
            <h1 style="font-size:20px;font-weight:600;">Settings</h1>
            <p style="font-size:13px;color:#64748b;margin-top:4px;">Manage your Lumina OS preferences</p>
          </div>
          <nav style="flex:1;overflow:auto;padding:12px;">
            <ul id="category-list" style="list-style:none;display:flex;flex-direction:column;gap:2px;"></ul>
          </nav>
          <div style="padding:16px;border-top:1px solid #e2e8f0;">
            <div style="display:flex;align-items:center;gap:8px;color:#64748b;font-size:12px;">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px;"><circle cx="12" cy="12" r="10"/></svg>
              <span>Lumina OS ${OS.version}</span>
            </div>
          </div>
        </aside>

        <!-- Content -->
        <div class="settings-content" style="flex:1;overflow:auto;padding:32px;max-width:800px;margin:0 auto;width:100%;">
          <div id="category-content"></div>
        </div>
      </div>
    `;

    this.categoryList = this.window.element.querySelector('#category-list');
    this.categoryContent = this.window.element.querySelector('#category-content');
    
    this.renderCategoryList();
  }

  renderCategoryList() {
    this.categoryList.innerHTML = this.categories.map(cat => `
      <li>
        <button class="category-btn${cat.id === this.currentCategory ? ' active' : ''}" data-category="${cat.id}" style="display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:none;background:transparent;border-radius:8px;color:${cat.id === this.currentCategory ? '#6366f1' : '#334155'};font:inherit;font-size:14px;font-weight:${cat.id === this.currentCategory ? '500' : '400'};cursor:pointer;text-align:left;transition:all 100ms;">
          ${cat.icon}
          <span>${cat.name}</span>
        </button>
      </li>
    `).join('');

    this.categoryList.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showCategory(btn.dataset.category));
    });
  }

  showCategory(id) {
    this.currentCategory = id;
    this.renderCategoryList();
    
    const category = this.categories.find(c => c.id === id);
    this.categoryContent.innerHTML = this.getCategoryContent(id);
    
    // Bind category-specific events
    this.bindCategoryEvents(id);
  }

  getCategoryContent(id) {
    switch (id) {
      case 'general': return this.getGeneralContent();
      case 'appearance': return this.getAppearanceContent();
      case 'desktop': return this.getDesktopContent();
      case 'keyboard': return this.getKeyboardContent();
      case 'mouse': return this.getMouseContent();
      case 'sound': return this.getSoundContent();
      case 'network': return this.getNetworkContent();
      case 'storage': return this.getStorageContent();
      case 'privacy': return this.getPrivacyContent();
      case 'accessibility': return this.getAccessibilityContent();
      case 'updates': return this.getUpdatesContent();
      case 'about': return this.getAboutContent();
      default: return '';
    }
  }

  getGeneralContent() {
    return `
      <div style="display:flex;flex-direction:column;gap:32px;">
        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Startup & Login</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Automatically log in</div>
                <div style="font-size:13px;color:#64748b;">Skip the lock screen on startup</div>
              </div>
              <input type="checkbox" id="auto-login" ${OS.settings.get('autoLogin') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Restore previous session</div>
                <div style="font-size:13px;color:#64748b;">Reopen windows and apps from last session</div>
              </div>
              <input type="checkbox" id="restore-session" ${OS.settings.get('restoreSession') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Show boot animation</div>
                <div style="font-size:13px;color:#64748b;">Play the startup sequence</div>
              </div>
              <input type="checkbox" id="boot-animation" ${OS.settings.get('bootAnimation') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Language & Region</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            <div>
              <label style="display:block;font-size:13px;color:#64748b;margin-bottom:6px;">Language</label>
              <select id="lang-select" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;background:white;">
                <option value="en" ${OS.settings.get('language') === 'en' ? 'selected' : ''}>English</option>
                <option value="es" ${OS.settings.get('language') === 'es' ? 'selected' : ''}>Español</option>
                <option value="fr" ${OS.settings.get('language') === 'fr' ? 'selected' : ''}>Français</option>
                <option value="de" ${OS.settings.get('language') === 'de' ? 'selected' : ''}>Deutsch</option>
                <option value="ja" ${OS.settings.get('language') === 'ja' ? 'selected' : ''}>日本語</option>
                <option value="zh" ${OS.settings.get('language') === 'zh' ? 'selected' : ''}>中文</option>
              </select>
            </div>
            <div>
              <label style="display:block;font-size:13px;color:#64748b;margin-bottom:6px;">Time Format</label>
              <select id="time-format" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;background:white;">
                <option value="24h" ${OS.settings.get('timeFormat') === '24h' ? 'selected' : ''}>24-hour (14:30)</option>
                <option value="12h" ${OS.settings.get('timeFormat') === '12h' ? 'selected' : ''}>12-hour (2:30 PM)</option>
              </select>
            </div>
            <div>
              <label style="display:block;font-size:13px;color:#64748b;margin-bottom:6px;">Date Format</label>
              <select id="date-format" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;background:white;">
                <option value="iso" ${OS.settings.get('dateFormat') === 'iso' ? 'selected' : ''}>ISO (YYYY-MM-DD)</option>
                <option value="us" ${OS.settings.get('dateFormat') === 'us' ? 'selected' : ''}>US (MM/DD/YYYY)</option>
                <option value="eu" ${OS.settings.get('dateFormat') === 'eu' ? 'selected' : ''}>EU (DD/MM/YYYY)</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">User Account</h2>
          <div style="display:flex;align-items:center;gap:16px;padding:20px;background:white;border:1px solid #e2e8f0;border-radius:12px;">
            <div class="user-avatar-large" style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;color:white;font-size:24px;font-weight:600;">${OS.user.name.charAt(0)}</div>
            <div style="flex:1;">
              <div style="font-size:18px;font-weight:600;">${OS.user.name}</div>
              <div style="font-size:13px;color:#64748b;">Administrator</div>
            </div>
            <button class="settings-btn" id="btn-change-avatar" style="padding:8px 16px;border:1px solid #e2e8f0;background:white;border-radius:8px;font:inherit;font-size:13px;cursor:pointer;">Change Avatar</button>
          </div>
        </section>
      </div>
    `;
  }

  getAppearanceContent() {
    const themes = [
      { id: 'light', name: 'Light', preview: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' },
      { id: 'dark', name: 'Dark', preview: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' },
      { id: 'auto', name: 'Auto', preview: 'linear-gradient(135deg, #f8fafc 0%, #0f172a 100%)' },
    ];
    const wallpapers = [
      { id: 'aurora', name: 'Aurora', preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)' },
      { id: 'ocean', name: 'Ocean', preview: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0284c7 100%)' },
      { id: 'forest', name: 'Forest', preview: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)' },
      { id: 'sunset', name: 'Sunset', preview: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)' },
      { id: 'midnight', name: 'Midnight', preview: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)' },
      { id: 'rose', name: 'Rose', preview: 'linear-gradient(135deg, #9d174d 0%, #be185d 50%, #db2777 100%)' },
      { id: 'amber', name: 'Amber', preview: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)' },
      { id: 'emerald', name: 'Emerald', preview: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' },
      { id: 'violet', name: 'Violet', preview: 'linear-gradient(135deg, #3b0764 0%, #4c1d95 50%, #5b21b6 100%)' },
      { id: 'slate', name: 'Slate', preview: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)' },
    ];

    return `
      <div style="display:flex;flex-direction:column;gap:32px;">
        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Theme</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            ${themes.map(t => `
              <button class="theme-option${OS.settings.get('theme') === t.id ? ' selected' : ''}" data-theme="${t.id}" style="position:relative;padding:16px;border:2px solid ${OS.settings.get('theme') === t.id ? '#6366f1' : '#e2e8f0'};border-radius:12px;background:${t.preview};cursor:pointer;transition:all 100ms;">
                <div style="font-weight:500;color:${t.id === 'dark' ? 'white' : '#0f172a'};">${t.name}</div>
                ${OS.settings.get('theme') === t.id ? '<div style="position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;background:#6366f1;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;">✓</div>' : ''}
              </button>
            `).join('')}
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Wallpaper</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;">
            ${wallpapers.map(w => `
              <button class="wallpaper-option${OS.settings.get('wallpaper') === w.id ? ' selected' : ''}" data-wallpaper="${w.id}" style="position:relative;aspect-ratio:16/10;border-radius:12px;overflow:hidden;border:2px solid ${OS.settings.get('wallpaper') === w.id ? '#6366f1' : '#e2e8f0'};background:${w.preview};cursor:pointer;transition:all 100ms;">
                <div style="position:absolute;bottom:0;left:0;right:0;padding:12px;background:linear-gradient(to top,rgba(0,0,0,0.7),transparent);color:white;font-size:12px;font-weight:500;">${w.name}</div>
                ${OS.settings.get('wallpaper') === w.id ? '<div style="position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:#6366f1;color:white;display:flex;align-items:center;justify-content:center;font-size:14px;">✓</div>' : ''}
              </button>
            `).join('')}
          </div>
          <div style="margin-top:16px;padding:16px;background:white;border:1px solid #e2e8f0;border-radius:12px;">
            <label style="display:flex;align-items:center;gap:12px;cursor:pointer;">
              <input type="file" id="custom-wallpaper" accept="image/*" style="display:none;">
              <svg viewBox="0 0 24 24" style="width:20px;height:20px;color:#6366f1;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span style="font-weight:500;">Choose Custom Image</span>
            </label>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Visual Effects</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Animations</div>
                <div style="font-size:13px;color:#64748b;">Enable transitions and motion effects</div>
              </div>
              <input type="checkbox" id="animations" ${OS.settings.get('animations') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Transparency</div>
                <div style="font-size:13px;color:#64748b;">Blur and translucency effects</div>
              </div>
              <input type="checkbox" id="transparency" ${OS.settings.get('transparency') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Reduce Motion</div>
                <div style="font-size:13px;color:#64748b;">Minimize non-essential animations</div>
              </div>
              <input type="checkbox" id="reduced-motion" ${OS.settings.get('reducedMotion') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">High Contrast</div>
                <div style="font-size:13px;color:#64748b;">Increase color contrast for readability</div>
              </div>
              <input type="checkbox" id="high-contrast" ${OS.settings.get('highContrast') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Accent Color</h2>
          <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:12px;">
            ${['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'].map(c => `
              <button class="accent-color${OS.settings.get('accentColor') === c ? ' selected' : ''}" data-color="${c}" style="aspect-ratio:1;border-radius:50%;border:3px solid ${OS.settings.get('accentColor') === c ? '#fff' : 'transparent'};background:${c};cursor:pointer;box-shadow:0 0 0 2px ${OS.settings.get('accentColor') === c ? c : '#e2e8f0'};transition:all 100ms;"></button>
            `).join('')}
          </div>
        </section>
      </div>
    `;
  }

  getDesktopContent() {
    return `
      <div style="display:flex;flex-direction:column;gap:32px;">
        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Desktop Icons</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Show desktop icons</div>
                <div style="font-size:13px;color:#64748b;">Display files and folders on the desktop</div>
              </div>
              <input type="checkbox" id="show-desktop-icons" ${OS.settings.get('showDesktopIcons') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Icon size</div>
                <div style="font-size:13px;color:#64748b;">Adjust the size of desktop icons</div>
              </div>
              <select id="icon-size" style="width:160px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;background:white;">
                <option value="small" ${OS.settings.get('iconSize') === 'small' ? 'selected' : ''}>Small</option>
                <option value="medium" ${OS.settings.get('iconSize') === 'medium' ? 'selected' : ''}>Medium</option>
                <option value="large" ${OS.settings.get('iconSize') === 'large' ? 'selected' : ''}>Large</option>
              </select>
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Grid spacing</div>
                <div style="font-size:13px;color:#64748b;">Space between icons</div>
              </div>
              <input type="range" id="grid-spacing" min="80" max="140" value="${OS.settings.get('gridSpacing') || 96}" style="width:200px;accent-color:#6366f1;">
            </label>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Dock / Taskbar</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Position</div>
                <div style="font-size:13px;color:#64748b;">Where the dock appears</div>
              </div>
              <select id="dock-position" style="width:160px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;background:white;">
                <option value="bottom" ${OS.settings.get('taskbarPosition') === 'bottom' ? 'selected' : ''}>Bottom</option>
                <option value="left" ${OS.settings.get('taskbarPosition') === 'left' ? 'selected' : ''}>Left</option>
                <option value="right" ${OS.settings.get('taskbarPosition') === 'right' ? 'selected' : ''}>Right</option>
              </select>
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Auto-hide</div>
                <div style="font-size:13px;color:#64748b;">Hide the dock when not in use</div>
              </div>
              <input type="checkbox" id="dock-autohide" ${OS.settings.get('dockAutohide') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Show recent apps</div>
                <div style="font-size:13px;color:#64748b;">Display recently used apps in the dock</div>
              </div>
              <input type="checkbox" id="dock-recent" ${OS.settings.get('dockRecent') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Icon magnification</div>
                <div style="font-size:13px;color:#64748b;">Enlarge icons on hover</div>
              </div>
              <input type="checkbox" id="dock-magnify" ${OS.settings.get('dockMagnify') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Window Management</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Snap windows</div>
                <div style="font-size:13px;color:#64748b;">Automatically resize windows when dragged to edges</div>
              </div>
              <input type="checkbox" id="window-snap" ${OS.settings.get('windowSnap') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Double-click titlebar</div>
                <div style="font-size:13px;color:#64748b;">Action when double-clicking a window titlebar</div>
              </div>
              <select id="titlebar-dblclick" style="width:200px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;background:white;">
                <option value="maximize" ${OS.settings.get('titlebarDblclick') === 'maximize' ? 'selected' : ''}>Maximize</option>
                <option value="minimize" ${OS.settings.get('titlebarDblclick') === 'minimize' ? 'selected' : ''}>Minimize</option>
                <option value="none" ${OS.settings.get('titlebarDblclick') === 'none' ? 'selected' : ''}>Nothing</option>
              </select>
            </label>
          </div>
        </section>
      </div>
    `;
  }

  getKeyboardContent() {
    return `
      <div style="display:flex;flex-direction:column;gap:32px;">
        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Keyboard Shortcuts</h2>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="border-bottom:1px solid #e2e8f0;"><th style="padding:12px 16px;text-align:left;color:#64748b;font-weight:500;font-size:12px;">Action</th><th style="padding:12px 16px;text-align:left;color:#64748b;font-weight:500;font-size:12px;">Shortcut</th></tr></thead>
              <tbody>
                ${[
                  ['Open Launcher', '⌘ Space'],
                  ['Quick Search', '⌘ K'],
                  ['New Window', '⌘ N'],
                  ['Close Window', '⌘ W'],
                  ['Minimize Window', '⌘ M'],
                  ['Maximize Window', '⌘ ⌥ M'],
                  ['Switch Apps', '⌘ Tab'],
                  ['Switch Windows', '⌘ `'],
                  ['Show Desktop', '⌘ F3'],
                  ['Mission Control', '⌃ ↑'],
                  ['App Exposé', '⌃ ↓'],
                  ['Screenshot', '⌘ ⇧ 4'],
                  ['Screen Recording', '⌘ ⇧ 5'],
                  ['Force Quit', '⌘ ⌥ Esc'],
                  ['Lock Screen', '⌃ ⌘ Q'],
                  ['System Settings', '⌘ ,'],
                ].map(([action, shortcut]) => `
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:12px 16px;">${action}</td>
                    <td style="padding:12px 16px;font-family:var(--font-mono);font-size:13px;color:#64748b;">${shortcut}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Key Repeat</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            <div>
              <label style="display:block;font-size:13px;color:#64748b;margin-bottom:6px;">Key Repeat Speed</label>
              <input type="range" id="key-repeat" min="1" max="120" value="${OS.settings.get('keyRepeat') || 60}" style="width:100%;accent-color:#6366f1;">
            </div>
            <div>
              <label style="display:block;font-size:13px;color:#64748b;margin-bottom:6px;">Delay Until Repeat</label>
              <input type="range" id="key-delay" min="10" max="100" value="${OS.settings.get('keyDelay') || 25}" style="width:100%;accent-color:#6366f1;">
            </div>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Input Sources</h2>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
            <p style="color:#64748b;margin-bottom:16px;">Keyboard layouts and input methods</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;">
              <span class="input-source active" style="padding:8px 16px;background:#6366f1;color:white;border-radius:20px;font-size:13px;">US English</span>
              <span class="input-source" style="padding:8px 16px;background:#f1f5f9;color:#0f172a;border-radius:20px;font-size:13px;">British English</span>
              <span class="input-source" style="padding:8px 16px;background:#f1f5f9;color:#0f172a;border-radius:20px;font-size:13px;">Japanese</span>
            </div>
            <button class="settings-btn" style="margin-top:16px;padding:8px 16px;border:1px solid #e2e8f0;background:white;border-radius:8px;font:inherit;font-size:13px;cursor:pointer;">+ Add Input Source</button>
          </div>
        </section>
      </div>
    `;
  }

  getMouseContent() {
    return `
      <div style="display:flex;flex-direction:column;gap:32px;">
        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Tracking Speed</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            <div>
              <label style="display:block;font-size:13px;color:#64748b;margin-bottom:6px;">Cursor Speed</label>
              <input type="range" id="cursor-speed" min="1" max="10" value="${OS.settings.get('cursorSpeed') || 5}" style="width:100%;accent-color:#6366f1;">
            </div>
            <div>
              <label style="display:block;font-size:13px;color:#64748b;margin-bottom:6px;">Scroll Speed</label>
              <input type="range" id="scroll-speed" min="1" max="10" value="${OS.settings.get('scrollSpeed') || 5}" style="width:100%;accent-color:#6366f1;">
            </div>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Click & Gestures</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Secondary Click</div>
                <div style="font-size:13px;color:#64748b;">Right-click behavior</div>
              </div>
              <select id="secondary-click" style="width:200px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;background:white;">
                <option value="right" ${OS.settings.get('secondaryClick') === 'right' ? 'selected' : ''}>Click on right side</option>
                <option value="left" ${OS.settings.get('secondaryClick') === 'left' ? 'selected' : ''}>Click on left side</option>
                <option value="two-finger" ${OS.settings.get('secondaryClick') === 'two-finger' ? 'selected' : ''}>Two-finger tap</option>
              </select>
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Tap to Click</div>
                <div style="font-size:13px;color:#64748b;">Tap trackpad to click</div>
              </div>
              <input type="checkbox" id="tap-to-click" ${OS.settings.get('tapToClick') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Natural Scrolling</div>
                <div style="font-size:13px;color:#64748b;">Content moves with finger direction</div>
              </div>
              <input type="checkbox" id="natural-scroll" ${OS.settings.get('naturalScroll') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Swipe Between Pages</div>
                <div style="font-size:13px;color:#64748b;">Navigate with two-finger swipe</div>
              </div>
              <input type="checkbox" id="swipe-pages" ${OS.settings.get('swipePages') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Pointer</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Cursor Size</div>
                <div style="font-size:13px;color:#64748b;">Adjust pointer size</div>
              </div>
              <input type="range" id="cursor-size" min="1" max="4" value="${OS.settings.get('cursorSize') || 1}" style="width:200px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Shake to Locate</div>
                <div style="font-size:13px;color:#64748b;">Quickly shake mouse to enlarge cursor</div>
              </div>
              <input type="checkbox" id="shake-locate" ${OS.settings.get('shakeLocate') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
          </div>
        </section>
      </div>
    `;
  }

  getSoundContent() {
    return `
      <div style="display:flex;flex-direction:column;gap:32px;">
        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Volume</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
            <div>
              <label style="display:block;font-size:13px;color:#64748b;margin-bottom:6px;">System Volume</label>
              <div style="display:flex;align-items:center;gap:12px;">
                <svg viewBox="0 0 24 24" style="width:20px;height:20px;color:#64748b;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
                <input type="range" id="system-volume" min="0" max="100" value="${Math.round(OS.settings.get('soundVolume') * 100)}" style="flex:1;accent-color:#6366f1;">
                <span style="width:40px;text-align:right;font-family:var(--font-mono);">${Math.round(OS.settings.get('soundVolume') * 100)}%</span>
              </div>
            </div>
            <div>
              <label style="display:block;font-size:13px;color:#64748b;margin-bottom:6px;">Alert Volume</label>
              <div style="display:flex;align-items:center;gap:12px;">
                <svg viewBox="0 0 24 24" style="width:20px;height:20px;color:#64748b;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <input type="range" id="alert-volume" min="0" max="100" value="${OS.settings.get('alertVolume') || 80}" style="flex:1;accent-color:#6366f1;">
                <span style="width:40px;text-align:right;font-family:var(--font-mono);">${OS.settings.get('alertVolume') || 80}%</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Sound Effects</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Play sound effects</div>
                <div style="font-size:13px;color:#64748b;">UI clicks, notifications, etc.</div>
              </div>
              <input type="checkbox" id="sound-effects" ${OS.settings.get('sounds') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Startup sound</div>
                <div style="font-size:13px;color:#64748b;">Play chime on boot</div>
              </div>
              <input type="checkbox" id="startup-sound" ${OS.settings.get('startupSound') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <div style="padding:16px;background:white;border:1px solid #e2e8f0;border-radius:12px;">
              <h4 style="font-weight:500;margin-bottom:12px;">Test Sounds</h4>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${['click', 'pop', 'whoosh', 'chime', 'notification', 'success', 'error'].map(s => `
                  <button class="sound-test" data-sound="${s}" style="padding:8px 12px;border:1px solid #e2e8f0;background:white;border-radius:8px;font:inherit;font-size:13px;cursor:pointer;">${s}</button>
                `).join('')}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Output Device</h2>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f1f5f9;border-radius:8px;">
              <div>
                <div style="font-weight:500;">Built-in Speakers</div>
                <div style="font-size:13px;color:#64748b;">Default</div>
              </div>
              <span style="width:10px;height:10px;border-radius:50%;background:#059669;"></span>
            </div>
            <button class="settings-btn" style="margin-top:12px;padding:8px 16px;border:1px solid #e2e8f0;background:white;border-radius:8px;font:inherit;font-size:13px;cursor:pointer;">Manage Devices</button>
          </div>
        </section>
      </div>
    `;
  }

  getNetworkContent() {
    return `
      <div style="display:flex;flex-direction:column;gap:32px;">
        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Wi-Fi</h2>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <div>
                <div style="font-weight:500;">Wi-Fi</div>
                <div style="font-size:13px;color:#64748b;">Connected to "Lumina-Network"</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" checked style="display:none;">
                <span class="slider"></span>
              </label>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;font-size:13px;color:#64748b;">
              <div><span style="color:#0f172a;">IP Address:</span> 192.168.1.100</div>
              <div><span style="color:#0f172a;">Router:</span> 192.168.1.1</div>
              <div><span style="color:#0f172a;">DNS:</span> 1.1.1.1, 8.8.8.8</div>
              <div><span style="color:#0f172a;">MAC Address:</span> 00:1A:2B:3C:4D:5E</div>
            </div>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Known Networks</h2>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            ${[
              { name: 'Lumina-Network', security: 'WPA2', auto: true },
              { name: 'Office-WiFi', security: 'WPA3', auto: true },
              { name: 'Guest-Network', security: 'Open', auto: false },
              { name: 'Home-5G', security: 'WPA2', auto: true },
            ].map(n => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #f1f5f9;">
                <div>
                  <div style="font-weight:500;">${n.name}</div>
                  <div style="font-size:12px;color:#64748b;">${n.security} ${n.auto ? '• Auto-join' : ''}</div>
                </div>
                <svg viewBox="0 0 24 24" style="width:20px;height:20px;color:#6366f1;"><polyline points="16 3 21 3 21 8"/><path d="M4 20 21 3"/><polyline points="21 16 21 21 16 21"/><path d="M20 4 3 21"/></svg>
              </div>
            `).join('')}
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Bluetooth</h2>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <div>
                <div style="font-weight:500;">Bluetooth</div>
                <div style="font-size:13px;color:#64748b;">On — 2 devices connected</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" checked style="display:none;">
                <span class="slider"></span>
              </label>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${[
                { name: 'Magic Keyboard', type: 'keyboard', battery: 85, connected: true },
                { name: 'Magic Mouse', type: 'mouse', battery: 42, connected: true },
                { name: 'AirPods Pro', type: 'headphones', battery: 67, connected: false },
              ].map(d => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:#f8fafc;border-radius:8px;">
                  <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:40px;height:40px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">
                      <svg viewBox="0 0 24 24" style="width:20px;height:20px;color:#6366f1;">${d.type === 'keyboard' ? '<rect x="3" y="3" width="18" height="18" rx="2"/>' : d.type === 'mouse' ? '<rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 6v8"/>' : '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'}</svg>
                    </div>
                    <div>
                      <div style="font-weight:500;">${d.name}</div>
                      <div style="font-size:12px;color:#64748b;">${d.type} • ${d.battery}% battery ${d.connected ? '• Connected' : ''}</div>
                    </div>
                  </div>
                  ${d.connected ? '<span style="font-size:11px;color:#059669;font-weight:500;">Connected</span>' : '<button class="settings-btn" style="padding:6px 12px;border:1px solid #e2e8f0;background:white;border-radius:6px;font:inherit;font-size:12px;cursor:pointer;">Connect</button>'}
                </div>
              `).join('')}
            </div>
          </div>
        </section>
      </div>
    `;
  }

  getStorageContent() {
    const total = 512 * 1024 * 1024 * 1024;
    const used = total * 0.35;
    const categories = [
      { name: 'Applications', size: total * 0.08, color: '#6366f1' },
      { name: 'Documents', size: total * 0.05, color: '#a855f7' },
      { name: 'Photos', size: total * 0.06, color: '#ec4899' },
      { name: 'Music', size: total * 0.03, color: '#f97316' },
      { name: 'System', size: total * 0.10, color: '#64748b' },
      { name: 'Other', size: total * 0.03, color: '#94a3b8' },
    ];

    return `
      <div style="display:flex;flex-direction:column;gap:32px;">
        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Storage Overview</h2>
          <div style="display:grid;grid-template-columns:1fr 300px;gap:32px;">
            <div>
              <div style="height:200px;background:white;border:1px solid #e2e8f0;border-radius:12px;position:relative;" id="storage-chart"></div>
              <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:16px;">
                ${categories.map(c => `
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:12px;height:12px;border-radius:2px;background:${c.color}"></div>
                    <span style="font-size:13px;">${c.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            <div>
              <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;">
                <div style="font-size:48px;font-weight:300;font-family:var(--font-mono);color:#0f172a;">${this.formatBytes(total - used)}</div>
                <div style="font-size:14px;color:#64748b;margin-top:4px;">Available of ${this.formatBytes(total)}</div>
                <div style="margin-top:24px;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                  <div style="width:${(used/total)*100}%;height:100%;background:linear-gradient(90deg,#6366f1,#a855f7);border-radius:4px;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#64748b;">
                  <span>Used: ${this.formatBytes(used)}</span>
                  <span>Free: ${this.formatBytes(total - used)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Storage Breakdown</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;">
            ${categories.map(c => `
              <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div style="width:10px;height:10px;border-radius:2px;background:${c.color}"></div>
                    <span style="font-weight:500;">${c.name}</span>
                  </div>
                  <span style="font-family:var(--font-mono);color:${c.color};">${this.formatBytes(c.size)}</span>
                </div>
                <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;">
                  <div style="width:${(c.size/used)*100}%;height:100%;background:${c.color};border-radius:3px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    `;
  }

  getPrivacyContent() {
    return `
      <div style="display:flex;flex-direction:column;gap:32px;">
        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Analytics & Improvements</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Share usage data</div>
                <div style="font-size:13px;color:#64748b;">Help improve Lumina OS by sending anonymous usage statistics</div>
              </div>
              <input type="checkbox" id="share-analytics" ${OS.settings.get('shareAnalytics') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Crash reports</div>
                <div style="font-size:13px;color:#64748b;">Automatically send crash reports to developers</div>
              </div>
              <input type="checkbox" id="crash-reports" ${OS.settings.get('crashReports') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">App Permissions</h2>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            ${[
              { name: 'Files', desc: 'Access to your files and folders', apps: ['Files', 'Editor', 'Terminal', 'Paint'] },
              { name: 'Camera', desc: 'Access to camera for video calls', apps: ['Browser'] },
              { name: 'Microphone', desc: 'Access to microphone for voice input', apps: [] },
              { name: 'Location', desc: 'Access to your location', apps: ['Browser'] },
              { name: 'Notifications', desc: 'Send you notifications', apps: ['Calendar', 'Music', 'System Monitor'] },
              { name: 'Contacts', desc: 'Access to your contacts', apps: [] },
            ].map(p => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #f1f5f9;">
                <div>
                  <div style="font-weight:500;">${p.name}</div>
                  <div style="font-size:13px;color:#64748b;">${p.desc}</div>
                </div>
                <div style="display:flex;align-items:center;gap:12px;">
                  <span style="font-size:13px;color:#64748b;">${p.apps.length} apps</span>
                  <select style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font:inherit;font-size:13px;background:white;">
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                    <option value="ask">Ask each time</option>
                  </select>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Data Management</h2>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <button class="settings-btn danger" style="padding:12px 20px;border:none;background:#fee2e2;color:#dc2626;border-radius:8px;font:inherit;font-size:14px;font-weight:500;cursor:pointer;text-align:left;">Clear All Browsing Data</button>
            <button class="settings-btn danger" style="padding:12px 20px;border:none;background:#fee2e2;color:#dc2626;border-radius:8px;font:inherit;font-size:14px;font-weight:500;cursor:pointer;text-align:left;">Reset All App Data</button>
            <button class="settings-btn" style="padding:12px 20px;border:1px solid #e2e8f0;background:white;color:#0f172a;border-radius:8px;font:inherit;font-size:14px;font-weight:500;cursor:pointer;text-align:left;">Export Personal Data</button>
          </div>
        </section>
      </div>
    `;
  }

  getAccessibilityContent() {
    return `
      <div style="display:flex;flex-direction:column;gap:32px;">
        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Vision</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Reduce Motion</div>
                <div style="font-size:13px;color:#64748b;">Minimize animations and transitions</div>
              </div>
              <input type="checkbox" id="a11y-reduced-motion" ${OS.settings.get('reducedMotion') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">High Contrast</div>
                <div style="font-size:13px;color:#64748b;">Increase color contrast</div>
              </div>
              <input type="checkbox" id="a11y-high-contrast" ${OS.settings.get('highContrast') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Reduce Transparency</div>
                <div style="font-size:13px;color:#64748b;">Disable blur and translucency effects</div>
              </div>
              <input type="checkbox" id="a11y-reduce-transparency" ${OS.settings.get('reduceTransparency') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Larger Text</div>
                <div style="font-size:13px;color:#64748b;">Increase system font size</div>
              </div>
              <input type="range" id="text-size" min="80" max="150" value="${OS.settings.get('textSize') || 100}" style="width:200px;accent-color:#6366f1;">
            </label>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Motor</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Sticky Keys</div>
                <div style="font-size:13px;color:#64748b;">Press modifier keys one at a time</div>
              </div>
              <input type="checkbox" id="sticky-keys" ${OS.settings.get('stickyKeys') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Slow Keys</div>
                <div style="font-size:13px;color:#64748b;">Adjust delay before key press is recognized</div>
              </div>
              <input type="checkbox" id="slow-keys" ${OS.settings.get('slowKeys') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Mouse Keys</div>
                <div style="font-size:13px;color:#64748b;">Control pointer with keyboard</div>
              </div>
              <input type="checkbox" id="mouse-keys" ${OS.settings.get('mouseKeys') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Hearing</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Mono Audio</div>
                <div style="font-size:13px;color:#64748b;">Play both channels in both ears</div>
              </div>
              <input type="checkbox" id="mono-audio" ${OS.settings.get('monoAudio') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Flash Screen on Alert</div>
                <div style="font-size:13px;color:#64748b;">Visual alert for system sounds</div>
              </div>
              <input type="checkbox" id="flash-screen" ${OS.settings.get('flashScreen') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Interaction</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Hold to Speak</div>
                <div style="font-size:13px;color:#64748b;">Press and hold key for voice commands</div>
              </div>
              <input type="checkbox" id="hold-to-speak" ${OS.settings.get('holdToSpeak') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Switch Control</div>
                <div style="font-size:13px;color:#64748b;">Navigate using adaptive accessories</div>
              </div>
              <input type="checkbox" id="switch-control" ${OS.settings.get('switchControl') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
          </div>
        </section>
      </div>
    `;
  }

  getUpdatesContent() {
    return `
      <div style="display:flex;flex-direction:column;gap:32px;">
        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Software Update</h2>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;text-align:center;">
            <div style="width:80px;height:80px;border-radius:50%;background:#05966920;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
              <svg viewBox="0 0 24 24" style="width:40px;height:40px;color:#059669;"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M2 12a10 10 0 0 0 10 10"/></svg>
            </div>
            <h3 style="font-size:20px;font-weight:600;margin-bottom:8px;">Your system is up to date</h3>
            <p style="color:#64748b;margin-bottom:24px;">Lumina OS ${OS.version} — Latest version</p>
            <button class="settings-btn primary" id="btn-check-updates" style="padding:12px 24px;border:none;background:#6366f1;color:white;border-radius:8px;font:inherit;font-size:14px;font-weight:500;cursor:pointer;">Check for Updates</button>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Update Settings</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Automatically check for updates</div>
                <div style="font-size:13px;color:#64748b;">Check for new versions in the background</div>
              </div>
              <input type="checkbox" id="auto-check-updates" ${OS.settings.get('autoCheckUpdates') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Download updates automatically</div>
                <div style="font-size:13px;color:#64748b;">Download when available on Wi-Fi</div>
              </div>
              <input type="checkbox" id="auto-download-updates" ${OS.settings.get('autoDownloadUpdates') !== false ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Install updates automatically</div>
                <div style="font-size:13px;color:#64748b;">Restart to install when convenient</div>
              </div>
              <input type="checkbox" id="auto-install-updates" ${OS.settings.get('autoInstallUpdates') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
            <label class="setting-row">
              <div>
                <div style="font-weight:500;">Include beta updates</div>
                <div style="font-size:13px;color:#64748b;">Receive early access to new features</div>
              </div>
              <input type="checkbox" id="beta-updates" ${OS.settings.get('betaUpdates') ? 'checked' : ''} style="width:44px;height:24px;accent-color:#6366f1;">
            </label>
          </div>
        </section>

        <section>
          <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">Update History</h2>
          <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            ${[
              { version: '1.0.0', date: '2026-11-10', type: 'Major Release', desc: 'Initial release of Lumina OS' },
              { version: '0.9.5', date: '2026-10-15', type: 'Beta', desc: 'Final beta before 1.0' },
              { version: '0.9.0', date: '2026-09-01', type: 'Beta', desc: 'Public beta launch' },
            ].map(u => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #f1f5f9;">
                <div>
                  <div style="display:flex;align-items:center;gap:12px;">
                    <span style="font-family:var(--font-mono);font-weight:600;color:#6366f1;">v${u.version}</span>
                    <span style="font-size:12px;padding:2px 8px;border-radius:4px;background:#eef2ff;color:#6366f1;">${u.type}</span>
                  </div>
                  <div style="font-size:13px;color:#64748b;margin-top:4px;">${u.desc}</div>
                </div>
                <span style="font-size:13px;color:#94a3b8;">${u.date}</span>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    `;
  }

  getAboutContent() {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:40px 20px;">
        <svg viewBox="0 0 120 120" style="width:120px;height:120px;margin-bottom:24px;">
          <defs>
            <linearGradient id="aboutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#6366f1"/>
              <stop offset="50%" stop-color="#a855f7"/>
              <stop offset="100%" stop-color="#ec4899"/>
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="54" fill="url(#aboutGradient)" opacity="0.2"/>
          <path d="M60 18 C35 18 16 37 16 62 C16 78 28 92 44 98 C48 99 52 99 56 98 C72 92 84 78 84 62 C84 37 65 18 60 18 Z" fill="none" stroke="url(#aboutGradient)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M48 58 L56 66 L72 46" fill="none" stroke="url(#aboutGradient)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h1 style="font-size:32px;font-weight:300;color:#0f172a;margin-bottom:8px;">Lumina OS</h1>
        <p style="font-size:18px;color:#64748b;margin-bottom:32px;">Version ${OS.version}</p>
        
        <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;width:100%;max-width:400px;margin-bottom:24px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;text-align:left;">
            <div><div style="font-size:12px;color:#64748b;">Version</div><div style="font-weight:500;font-family:var(--font-mono);">${OS.version}</div></div>
            <div><div style="font-size:12px;color:#64748b;">Build</div><div style="font-weight:500;font-family:var(--font-mono);">20261110</div></div>
            <div><div style="font-size:12px;color:#64748b;">Codename</div><div style="font-weight:500;">Aurora</div></div>
            <div><div style="font-size:12px;color:#64748b;">Architecture</div><div style="font-weight:500;font-family:var(--font-mono);">Web / WASM</div></div>
          </div>
        </div>

        <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;margin-bottom:32px;">
          <button class="settings-btn" id="btn-license" style="padding:10px 20px;border:1px solid #e2e8f0;background:white;border-radius:8px;font:inherit;font-size:13px;cursor:pointer;">License</button>
          <button class="settings-btn" id="btn-credits" style="padding:10px 20px;border:1px solid #e2e8f0;background:white;border-radius:8px;font:inherit;font-size:13px;cursor:pointer;">Credits</button>
          <button class="settings-btn" id="btn-report" style="padding:10px 20px;border:1px solid #e2e8f0;background:white;border-radius:8px;font:inherit;font-size:13px;cursor:pointer;">Report Issue</button>
        </div>

        <p style="font-size:13px;color:#94a3b8;max-width:500px;">Lumina OS is a browser-based desktop operating system built with web technologies. Designed for beauty, performance, and user delight.</p>
        <p style="font-size:12px;color:#94a3b8;margin-top:8px;">© 2026 Lumina OS Team. Open source under MIT License.</p>
      </div>
    `;
  }

  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  }

  bindCategoryEvents(id) {
    // Theme options
    this.categoryContent.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        OS.settings.set('theme', btn.dataset.theme);
      });
    });

    // Wallpaper options
    this.categoryContent.querySelectorAll('.wallpaper-option').forEach(btn => {
      btn.addEventListener('click', () => {
        OS.settings.set('wallpaper', btn.dataset.wallpaper);
      });
    });

    // Accent colors
    this.categoryContent.querySelectorAll('.accent-color').forEach(btn => {
      btn.addEventListener('click', () => {
        OS.settings.set('accentColor', btn.dataset.color);
        document.documentElement.style.setProperty('--color-primary', btn.dataset.color);
      });
    });

    // Custom wallpaper
    const fileInput = this.categoryContent.querySelector('#custom-wallpaper');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            OS.settings.set('wallpaper', 'custom');
            OS.settings.data.customWallpaper = e.target.result;
            OS.settings.save();
            OS.settings.applyWallpaper('custom');
          };
          reader.readAsDataURL(file);
        }
      });
      this.categoryContent.querySelector('label[for="custom-wallpaper"]').addEventListener('click', () => fileInput.click());
    }

    // General settings
    const binds = [
      ['auto-login', 'autoLogin', 'boolean'],
      ['restore-session', 'restoreSession', 'boolean'],
      ['boot-animation', 'bootAnimation', 'boolean'],
      ['lang-select', 'language', 'string'],
      ['time-format', 'timeFormat', 'string'],
      ['date-format', 'dateFormat', 'string'],
      ['animations', 'animations', 'boolean'],
      ['transparency', 'transparency', 'boolean'],
      ['reduced-motion', 'reducedMotion', 'boolean'],
      ['high-contrast', 'highContrast', 'boolean'],
      ['show-desktop-icons', 'showDesktopIcons', 'boolean'],
      ['icon-size', 'iconSize', 'string'],
      ['grid-spacing', 'gridSpacing', 'number'],
      ['dock-position', 'taskbarPosition', 'string'],
      ['dock-autohide', 'dockAutohide', 'boolean'],
      ['dock-recent', 'dockRecent', 'boolean'],
      ['dock-magnify', 'dockMagnify', 'boolean'],
      ['window-snap', 'windowSnap', 'boolean'],
      ['titlebar-dblclick', 'titlebarDblclick', 'string'],
      ['key-repeat', 'keyRepeat', 'number'],
      ['key-delay', 'keyDelay', 'number'],
      ['cursor-speed', 'cursorSpeed', 'number'],
      ['scroll-speed', 'scrollSpeed', 'number'],
      ['secondary-click', 'secondaryClick', 'string'],
      ['tap-to-click', 'tapToClick', 'boolean'],
      ['natural-scroll', 'naturalScroll', 'boolean'],
      ['swipe-pages', 'swipePages', 'boolean'],
      ['cursor-size', 'cursorSize', 'number'],
      ['shake-locate', 'shakeLocate', 'boolean'],
      ['system-volume', 'soundVolume', 'number', 100],
      ['alert-volume', 'alertVolume', 'number'],
      ['sound-effects', 'sounds', 'boolean'],
      ['startup-sound', 'startupSound', 'boolean'],
      ['share-analytics', 'shareAnalytics', 'boolean'],
      ['crash-reports', 'crashReports', 'boolean'],
      ['auto-check-updates', 'autoCheckUpdates', 'boolean'],
      ['auto-download-updates', 'autoDownloadUpdates', 'boolean'],
      ['auto-install-updates', 'autoInstallUpdates', 'boolean'],
      ['beta-updates', 'betaUpdates', 'boolean'],
      ['a11y-reduced-motion', 'reducedMotion', 'boolean'],
      ['a11y-high-contrast', 'highContrast', 'boolean'],
      ['a11y-reduce-transparency', 'reduceTransparency', 'boolean'],
      ['text-size', 'textSize', 'number'],
      ['sticky-keys', 'stickyKeys', 'boolean'],
      ['slow-keys', 'slowKeys', 'boolean'],
      ['mouse-keys', 'mouseKeys', 'boolean'],
      ['mono-audio', 'monoAudio', 'boolean'],
      ['flash-screen', 'flashScreen', 'boolean'],
      ['hold-to-speak', 'holdToSpeak', 'boolean'],
      ['switch-control', 'switchControl', 'boolean'],
    ];

    binds.forEach(([elId, settingKey, type, divisor = 1]) => {
      const el = this.categoryContent.querySelector(`#${elId}`);
      if (el) {
        if (type === 'boolean') {
          el.addEventListener('change', () => OS.settings.set(settingKey, el.checked));
        } else if (type === 'number') {
          el.addEventListener('input', () => OS.settings.set(settingKey, parseInt(el.value) / divisor));
        } else {
          el.addEventListener('change', () => OS.settings.set(settingKey, el.value));
        }
      }
    });

    // Sound test buttons
    this.categoryContent.querySelectorAll('.sound-test').forEach(btn => {
      btn.addEventListener('click', () => {
        if (OS.audio) OS.audio.play(btn.dataset.sound);
      });
    });

    // Check updates button
    const checkBtn = this.categoryContent.querySelector('#btn-check-updates');
    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        checkBtn.textContent = 'Checking...';
        checkBtn.disabled = true;
        setTimeout(() => {
          checkBtn.textContent = 'No updates available';
          setTimeout(() => {
            checkBtn.textContent = 'Check for Updates';
            checkBtn.disabled = false;
          }, 2000);
        }, 1500);
      });
    }

    // About buttons
    ['license', 'credits', 'report'].forEach(btnId => {
      const btn = this.categoryContent.querySelector(`#btn-${btnId}`);
      if (btn) {
        btn.addEventListener('click', () => OS.notifications.show('About', `${btnId.charAt(0).toUpperCase() + btnId.slice(1)} dialog coming soon`));
      }
    });
  }

  bindEvents() {
    // Category buttons already bound in renderCategoryList
  }

  escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => {
      const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": '\'' };
      return map[c];
    });
  }

  getState() {
    return { currentCategory: this.currentCategory };
  }

  restoreState(state) {
    if (state?.currentCategory) this.showCategory(state.currentCategory);
  }

  destroy() {}
}

// Register
AppRegistry.register({
  id: 'settings',
  name: 'Settings',
  icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
  class: SettingsApp,
  width: 900,
  height: 700,
  singleInstance: true,
  keywords: ['preferences', 'options', 'configuration', 'system settings'],
});