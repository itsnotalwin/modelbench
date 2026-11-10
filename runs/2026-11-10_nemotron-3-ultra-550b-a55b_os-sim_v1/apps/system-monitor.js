/* ==========================================================================
   Lumina OS — System Monitor App
   CPU, Memory, Disk, Network, Processes
   ========================================================================== */

class SystemMonitorApp {
  constructor(window, options = {}) {
    this.window = window;
    this.tab = 'overview';
    this.history = { cpu: [], mem: [], disk: [], net: [] };
    this.maxHistory = 60;
    this.updateInterval = null;
    this.processes = [];
  }

  init() {
    this.render();
    this.bindEvents();
    this.startMonitoring();
  }

  render() {
    const content = this.window.element.querySelector('.window-content');
    content.innerHTML = `
      <div class="sysmon-app" style="height:100%;display:flex;flex-direction:column;background:#0d1117;color:#e2e8f0;font-family:var(--font-sans);">
        <!-- Header -->
        <div class="sysmon-header" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #30363d;">
          <h1 style="font-size:20px;font-weight:600;">System Monitor</h1>
          <div style="display:flex;align-items:center;gap:12px;">
            <span id="sys-uptime" style="font-size:13px;color:#8b949e;font-family:var(--font-mono);"></span>
            <button class="sys-btn" id="btn-refresh" title="Refresh"><svg viewBox="0 0 24 24"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg></button>
          </div>
        </div>

        <!-- Tab Bar -->
        <div class="sysmon-tabs" style="display:flex;background:#161b22;border-bottom:1px solid #30363d;overflow-x:auto;">
          <button class="sys-tab active" data-tab="overview" style="padding:12px 20px;border:none;background:transparent;color:#e2e8f0;font:inherit;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;border-bottom:2px solid #6366f1;">Overview</button>
          <button class="sys-tab" data-tab="cpu" style="padding:12px 20px;border:none;background:transparent;color:#8b949e;font:inherit;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;">CPU</button>
          <button class="sys-tab" data-tab="memory" style="padding:12px 20px;border:none;background:transparent;color:#8b949e;font:inherit;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;">Memory</button>
          <button class="sys-tab" data-tab="disk" style="padding:12px 20px;border:none;background:transparent;color:#8b949e;font:inherit;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;">Disk</button>
          <button class="sys-tab" data-tab="network" style="padding:12px 20px;border:none;background:transparent;color:#8b949e;font:inherit;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;">Network</button>
          <button class="sys-tab" data-tab="processes" style="padding:12px 20px;border:none;background:transparent;color:#8b949e;font:inherit;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;">Processes</button>
        </div>

        <!-- Tab Content -->
        <div class="sysmon-content" style="flex:1;overflow:auto;" id="sysmon-content"></div>
      </div>
    `;

    this.contentEl = this.window.element.querySelector('#sysmon-content');
    this.bindTabEvents();
    this.renderTab();
  }

  bindTabEvents() {
    this.window.element.querySelectorAll('.sys-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.tab;
        this.window.element.querySelectorAll('.sys-tab').forEach(b => {
          b.classList.remove('active');
          b.style.color = '#8b949e';
          b.style.borderBottomColor = 'transparent';
        });
        btn.classList.add('active');
        btn.style.color = '#e2e8f0';
        btn.style.borderBottomColor = '#6366f1';
        this.renderTab();
      });
    });

    this.window.element.querySelector('#btn-refresh').addEventListener('click', () => this.updateNow());
  }

  bindEvents() {
    this.window.element.addEventListener('keydown', (e) => {
      const tabs = ['overview', 'cpu', 'memory', 'disk', 'network', 'processes'];
      const idx = tabs.indexOf(this.tab);
      if (e.key === 'ArrowRight') this.tab = tabs[(idx + 1) % tabs.length];
      if (e.key === 'ArrowLeft') this.tab = tabs[(idx - 1 + tabs.length) % tabs.length];
      if (e.key === 'r') this.updateNow();
      this.window.element.querySelectorAll('.sys-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === this.tab);
        b.style.color = b.dataset.tab === this.tab ? '#e2e8f0' : '#8b949e';
        b.style.borderBottomColor = b.dataset.tab === this.tab ? '#6366f1' : 'transparent';
      });
      this.renderTab();
    });
  }

  startMonitoring() {
    this.updateNow();
    this.updateInterval = setInterval(() => this.updateNow(), 2000);
  }

  updateNow() {
    // Simulate system metrics
    this.metrics = {
      cpu: this.getCpuUsage(),
      memory: this.getMemoryUsage(),
      disk: this.getDiskUsage(),
      network: this.getNetworkUsage(),
      uptime: this.getUptime(),
      processes: this.getProcesses(),
    };
    
    // Update history
    this.history.cpu.push(this.metrics.cpu.total);
    this.history.mem.push(this.metrics.memory.percent);
    this.history.disk.push(this.metrics.disk.percent);
    this.history.net.push(this.metrics.network.total);
    
    if (this.history.cpu.length > this.maxHistory) {
      this.history.cpu.shift();
      this.history.mem.shift();
      this.history.disk.shift();
      this.history.net.shift();
    }

    this.renderTab();
    this.window.element.querySelector('#sys-uptime').textContent = `Uptime: ${this.formatUptime(this.metrics.uptime)}`;
  }

  getCpuUsage() {
    // Simulate CPU usage
    const total = Math.random() * 30 + 5; // 5-35%
    return {
      total: Math.round(total * 10) / 10,
      user: Math.round(total * 0.7 * 10) / 10,
      system: Math.round(total * 0.3 * 10) / 10,
      cores: navigator.hardwareConcurrency || 8,
      model: 'Apple M2 Pro / Intel i9-13900K (Simulated)',
    };
  }

  getMemoryUsage() {
    const total = 16 * 1024 * 1024 * 1024; // 16GB
    const used = total * (0.3 + Math.random() * 0.4); // 30-70%
    return {
      total,
      used: Math.round(used),
      free: Math.round(total - used),
      percent: Math.round((used / total) * 100 * 10) / 10,
      swapUsed: Math.round(2 * 1024 * 1024 * 1024 * Math.random()),
      swapTotal: 2 * 1024 * 1024 * 1024,
    };
  }

  getDiskUsage() {
    const total = 512 * 1024 * 1024 * 1024; // 512GB
    const used = total * (0.2 + Math.random() * 0.3); // 20-50%
    return {
      total,
      used: Math.round(used),
      free: Math.round(total - used),
      percent: Math.round((used / total) * 100 * 10) / 10,
      readSpeed: Math.round(Math.random() * 500), // MB/s
      writeSpeed: Math.round(Math.random() * 300),
    };
  }

  getNetworkUsage() {
    return {
      download: Math.round(Math.random() * 50 * 1024 * 1024), // bytes/s
      upload: Math.round(Math.random() * 10 * 1024 * 1024),
      total: Math.round((Math.random() * 60) * 1024 * 1024),
      connections: Math.floor(Math.random() * 50) + 10,
    };
  }

  getUptime() {
    return Date.now() - (this.startTime || (this.startTime = Date.now() - Math.random() * 86400000 * 7));
  }

  getProcesses() {
    const names = ['System', 'WindowServer', 'Finder', 'Terminal', 'Editor', 'Browser', 'Music', 'Paint', 'Calendar', 'Settings', 'Node', 'Python', 'Docker', 'VSCodium', 'Spotify', 'Discord', 'Slack', 'Chrome', 'Firefox', 'Safari'];
    return names.map((name, i) => ({
      pid: 100 + i * Math.floor(Math.random() * 100),
      name,
      cpu: Math.random() * 15,
      mem: Math.round((Math.random() * 500 + 50) * 10) / 10, // MB
      threads: Math.floor(Math.random() * 50) + 5,
      user: i < 3 ? 'root' : 'user',
      state: Math.random() > 0.1 ? 'Running' : 'Sleeping',
    })).sort((a, b) => b.cpu - a.cpu);
  }

  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  }

  formatSpeed(bytes) {
    return this.formatBytes(bytes) + '/s';
  }

  formatUptime(ms) {
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  renderTab() {
    switch (this.tab) {
      case 'overview': this.renderOverview(); break;
      case 'cpu': this.renderCpu(); break;
      case 'memory': this.renderMemory(); break;
      case 'disk': this.renderDisk(); break;
      case 'network': this.renderNetwork(); break;
      case 'processes': this.renderProcesses(); break;
    }
  }

  renderOverview() {
    const m = this.metrics;
    this.contentEl.innerHTML = `
      <div style="padding:20px;">
        <!-- Quick Stats -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
          ${this.renderStatCard('CPU Usage', `${m.cpu.total}%`, this.history.cpu, '#6366f1', `${m.cpu.cores} cores • ${m.cpu.model}`)}
          ${this.renderStatCard('Memory', `${m.memory.percent}%`, this.history.mem, '#a855f7', `${this.formatBytes(m.memory.used)} / ${this.formatBytes(m.memory.total)}`)}
          ${this.renderStatCard('Disk', `${m.disk.percent}%`, this.history.disk, '#ec4899', `${this.formatBytes(m.disk.used)} / ${this.formatBytes(m.disk.total)}`)}
          ${this.renderStatCard('Network', this.formatSpeed(m.network.total), this.history.net, '#059669', `↓ ${this.formatSpeed(m.network.download)} ↑ ${this.formatSpeed(m.network.upload)}`)}
        </div>

        <!-- Detail Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">
          <div class="detail-card" style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;">
            <h3 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">CPU Details</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div><span style="color:#8b949e;">Total Usage</span><div style="font-size:24px;font-weight:600;font-family:var(--font-mono);color:#6366f1;">${m.cpu.total}%</div></div>
              <div><span style="color:#8b949e;">User</span><div style="font-size:24px;font-weight:600;font-family:var(--font-mono);color:#a855f7;">${m.cpu.user}%</div></div>
              <div><span style="color:#8b949e;">System</span><div style="font-size:24px;font-weight:600;font-family:var(--font-mono);color:#ec4899;">${m.cpu.system}%</div></div>
              <div><span style="color:#8b949e;">Idle</span><div style="font-size:24px;font-weight:600;font-family:var(--font-mono);color:#059669;">${(100 - m.cpu.total).toFixed(1)}%</div></div>
            </div>
            <div style="margin-top:16px;height:60px;" id="cpu-chart"></div>
            <div style="margin-top:12px;font-size:12px;color:#8b949e;">${m.cpu.cores} logical cores • ${m.cpu.model}</div>
          </div>

          <div class="detail-card" style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;">
            <h3 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">Memory Details</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
              <div><span style="color:#8b949e;">Used</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);">${this.formatBytes(m.memory.used)}</div></div>
              <div><span style="color:#8b949e;">Available</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);">${this.formatBytes(m.memory.free)}</div></div>
              <div><span style="color:#8b949e;">Swap Used</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);">${this.formatBytes(m.memory.swapUsed)}</div></div>
              <div><span style="color:#8b949e;">Cached</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);">${this.formatBytes(Math.round(m.memory.total * 0.15))}</div></div>
            </div>
            <div style="height:60px;" id="mem-chart"></div>
          </div>

          <div class="detail-card" style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;">
            <h3 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">Disk I/O</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
              <div><span style="color:#8b949e;">Read Speed</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);color:#059669;">${m.disk.readSpeed} MB/s</div></div>
              <div><span style="color:#8b949e;">Write Speed</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);color:#ec4899;">${m.disk.writeSpeed} MB/s</div></div>
              <div><span style="color:#8b949e;">Used</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);">${this.formatBytes(m.disk.used)}</div></div>
              <div><span style="color:#8b949e;">Free</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);">${this.formatBytes(m.disk.free)}</div></div>
            </div>
            <div style="height:60px;" id="disk-chart"></div>
          </div>

          <div class="detail-card" style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;">
            <h3 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">Network</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
              <div><span style="color:#8b949e;">Download</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);color:#059669;">${this.formatSpeed(m.network.download)}</div></div>
              <div><span style="color:#8b949e;">Upload</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);color:#ec4899;">${this.formatSpeed(m.network.upload)}</div></div>
              <div><span style="color:#8b949e;">Connections</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);">${m.network.connections}</div></div>
              <div><span style="color:#8b949e;">Total</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);">${this.formatBytes(m.network.total)}</div></div>
            </div>
            <div style="height:60px;" id="net-chart"></div>
          </div>
        </div>

        <!-- Top Processes -->
        <div style="margin-top:24px;">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;color:#8b949e;">Top Processes (CPU)</h3>
          <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="border-bottom:1px solid #30363d;"><th style="padding:12px 16px;text-align:left;color:#8b949e;font-weight:500;">Process</th><th style="padding:12px 16px;text-align:right;color:#8b949e;font-weight:500;">CPU %</th><th style="padding:12px 16px;text-align:right;color:#8b949e;font-weight:500;">Memory</th><th style="padding:12px 16px;text-align:left;color:#8b949e;font-weight:500;">User</th></tr></thead>
              <tbody>
                ${m.processes.slice(0, 8).map(p => `
                  <tr style="border-bottom:1px solid #21262d;">
                    <td style="padding:10px 16px;font-family:var(--font-mono);">${this.escapeHtml(p.name)}</td>
                    <td style="padding:10px 16px;text-align:right;font-family:var(--font-mono);color:#6366f1;">${p.cpu.toFixed(1)}%</td>
                    <td style="padding:10px 16px;text-align:right;font-family:var(--font-mono);">${p.mem} MB</td>
                    <td style="padding:10px 16px;color:#8b949e;">${p.user}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Draw mini charts
    setTimeout(() => {
      this.drawMiniChart('cpu-chart', this.history.cpu, '#6366f1');
      this.drawMiniChart('mem-chart', this.history.mem, '#a855f7');
      this.drawMiniChart('disk-chart', this.history.disk, '#ec4899');
      this.drawMiniChart('net-chart', this.history.net, '#059669');
    }, 0);
  }

  renderStatCard(title, value, history, color, subtitle) {
    return `
      <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <span style="font-size:13px;color:#8b949e;">${title}</span>
          <div style="width:50px;height:30px;" class="sparkline" data-color="${color}"></div>
        </div>
        <div style="font-size:28px;font-weight:600;font-family:var(--font-mono);color:${color};line-height:1;">${value}</div>
        <div style="font-size:12px;color:#8b949e;margin-top:4px;">${subtitle}</div>
      </div>
    `;
  }

  drawMiniChart(id, data, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    el.appendChild(canvas);
    
    if (data.length < 2) return;
    
    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    data.forEach((val, i) => {
      const x = (i / (data.length - 1)) * 200;
      const y = 50 - ((val - min) / range) * 40;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 50);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.lineTo(200, 50);
    ctx.lineTo(0, 50);
    ctx.closePath();
    ctx.fill();
  }

  renderCpu() {
    const m = this.metrics;
    this.contentEl.innerHTML = `
      <div style="padding:20px;">
        <div style="display:grid;grid-template-columns:1fr 300px;gap:24px;">
          <div>
            <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">CPU Usage History</h3>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;height:400px;" id="cpu-history-chart"></div>
          </div>
          <div>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin-bottom:16px;">
              <h4 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">CPU Info</h4>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:13px;">
                <span style="color:#8b949e;">Model</span><span>${m.cpu.model}</span>
                <span style="color:#8b949e;">Cores</span><span>${m.cpu.cores} logical</span>
                <span style="color:#8b949e;">Architecture</span><span>ARM64 / x86_64</span>
                <span style="color:#8b949e;">Frequency</span><span>3.2 GHz (max)</span>
                <span style="color:#8b949e;">L1 Cache</span><span>128 KB/core</span>
                <span style="color:#8b949e;">L2 Cache</span><span>4 MB/core</span>
                <span style="color:#8b949e;">L3 Cache</span><span>24 MB shared</span>
              </div>
            </div>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;">
              <h4 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">Current Usage</h4>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div><span style="color:#8b949e;">Total</span><div style="font-size:28px;font-weight:600;font-family:var(--font-mono);color:#6366f1;">${m.cpu.total}%</div></div>
                <div><span style="color:#8b949e;">Idle</span><div style="font-size:28px;font-weight:600;font-family:var(--font-mono);color:#059669;">${(100 - m.cpu.total).toFixed(1)}%</div></div>
                <div><span style="color:#8b949e;">User</span><div style="font-size:28px;font-weight:600;font-family:var(--font-mono);color:#a855f7;">${m.cpu.user}%</div></div>
                <div><span style="color:#8b949e;">System</span><div style="font-size:28px;font-weight:600;font-family:var(--font-mono);color:#ec4899;">${m.cpu.system}%</div></div>
              </div>
              <div style="margin-top:16px;height:80px;" id="cpu-breakdown-chart"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => {
      this.drawHistoryChart('cpu-history-chart', this.history.cpu, '#6366f1');
      this.drawBreakdownChart('cpu-breakdown-chart', [m.cpu.user, m.cpu.system, 100 - m.cpu.total], ['#a855f7', '#ec4899', '#059669'], ['User', 'System', 'Idle']);
    }, 0);
  }

  renderMemory() {
    const m = this.metrics;
    this.contentEl.innerHTML = `
      <div style="padding:20px;">
        <div style="display:grid;grid-template-columns:1fr 300px;gap:24px;">
          <div>
            <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">Memory Usage History</h3>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;height:400px;" id="mem-history-chart"></div>
          </div>
          <div>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin-bottom:16px;">
              <h4 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">Memory Breakdown</h4>
              <div style="display:flex;flex-direction:column;gap:12px;">
                ${this.renderMemBar('Used', m.memory.used, m.memory.total, '#6366f1')}
                ${this.renderMemBar('Cached', Math.round(m.memory.total * 0.15), m.memory.total, '#a855f7')}
                ${this.renderMemBar('Buffers', Math.round(m.memory.total * 0.05), m.memory.total, '#ec4899')}
                ${this.renderMemBar('Free', m.memory.free, m.memory.total, '#059669')}
              </div>
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid #30363d;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
                  <div><span style="color:#8b949e;">Total</span><div style="font-family:var(--font-mono);">${this.formatBytes(m.memory.total)}</div></div>
                  <div><span style="color:#8b949e;">Available</span><div style="font-family:var(--font-mono);">${this.formatBytes(m.memory.free + Math.round(m.memory.total * 0.2))}</div></div>
                  <div><span style="color:#8b949e;">Swap Total</span><div style="font-family:var(--font-mono);">${this.formatBytes(m.memory.swapTotal)}</div></div>
                  <div><span style="color:#8b949e;">Swap Used</span><div style="font-family:var(--font-mono);color:#f87171;">${this.formatBytes(m.memory.swapUsed)}</div></div>
                </div>
              </div>
            </div>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;">
              <h4 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">Pressure</h4>
              <div style="height:100px;" id="mem-pressure-chart"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => {
      this.drawHistoryChart('mem-history-chart', this.history.mem, '#a855f7');
      this.drawPressureChart('mem-pressure-chart');
    }, 0);
  }

  renderMemBar(label, used, total, color) {
    const pct = (used / total) * 100;
    return `
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:13px;">${label}</span>
          <span style="font-size:13px;font-family:var(--font-mono);color:${color};">${pct.toFixed(1)}%</div>
        </div>
        <div style="height:8px;background:#21262d;border-radius:4px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width 300ms;"></div>
        </div>
      </div>
    `;
  }

  renderDisk() {
    const m = this.metrics;
    this.contentEl.innerHTML = `
      <div style="padding:20px;">
        <div style="display:grid;grid-template-columns:1fr 300px;gap:24px;">
          <div>
            <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">Disk Usage</h3>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;height:200px;" id="disk-usage-chart"></div>
            
            <h3 style="font-size:16px;font-weight:600;margin:24px 0 16px;">I/O Activity</h3>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;height:200px;" id="disk-io-chart"></div>
          </div>
          <div>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin-bottom:16px;">
              <h4 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">Volumes</h4>
              <div style="display:flex;flex-direction:column;gap:12px;">
                ${this.renderDiskVolume('/ (Root)', m.disk.used, m.disk.total)}
                ${this.renderDiskVolume('/Home', Math.round(m.disk.used * 0.6), Math.round(m.disk.total * 0.7))}
                ${this.renderDiskVolume('/Var', Math.round(m.disk.used * 0.1), Math.round(m.disk.total * 0.1))}
              </div>
            </div>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;">
              <h4 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">I/O Stats</h4>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div><span style="color:#8b949e;">Read Speed</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);color:#059669;">${m.disk.readSpeed} MB/s</div></div>
                <div><span style="color:#8b949e;">Write Speed</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);color:#ec4899;">${m.disk.writeSpeed} MB/s</div></div>
                <div><span style="color:#8b949e;">Read Ops/s</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);">${Math.floor(Math.random() * 5000)}</div></div>
                <div><span style="color:#8b949e;">Write Ops/s</span><div style="font-size:20px;font-weight:600;font-family:var(--font-mono);">${Math.floor(Math.random() * 3000)}</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => {
      this.drawDonutChart('disk-usage-chart', m.disk.percent, '#ec4899', this.formatBytes(m.disk.used), this.formatBytes(m.disk.total));
      this.drawHistoryChart('disk-io-chart', this.history.disk, '#ec4899');
    }, 0);
  }

  renderDiskVolume(name, used, total) {
    const pct = (used / total) * 100;
    return `
      <div>
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:13px;">${name}</span>
          <span style="font-size:13px;font-family:var(--font-mono);">${this.formatBytes(used)} / ${this.formatBytes(total)}</span>
        </div>
        <div style="height:6px;background:#21262d;border-radius:3px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${pct > 80 ? '#f87171' : pct > 60 ? '#fbbf24' : '#059669'};border-radius:3px;"></div>
        </div>
      </div>
    `;
  }

  renderNetwork() {
    const m = this.metrics;
    this.contentEl.innerHTML = `
      <div style="padding:20px;">
        <div style="display:grid;grid-template-columns:1fr 300px;gap:24px;">
          <div>
            <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">Network Throughput</h3>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;height:400px;" id="net-history-chart"></div>
          </div>
          <div>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;margin-bottom:16px;">
              <h4 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">Current Rates</h4>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div style="text-align:center;padding:16px;background:#05966920;border-radius:8px;border:1px solid #05966940;">
                  <div style="font-size:12px;color:#8b949e;">DOWNLOAD</div>
                  <div style="font-size:24px;font-weight:600;font-family:var(--font-mono);color:#059669;">${this.formatSpeed(m.network.download)}</div>
                </div>
                <div style="text-align:center;padding:16px;background:#ec489920;border-radius:8px;border:1px solid #ec489940;">
                  <div style="font-size:12px;color:#8b949e;">UPLOAD</div>
                  <div style="font-size:24px;font-weight:600;font-family:var(--font-mono);color:#ec4899;">${this.formatSpeed(m.network.upload)}</div>
                </div>
              </div>
              <div style="height:100px;" id="net-breakdown-chart"></div>
            </div>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px;">
              <h4 style="font-size:14px;font-weight:600;margin-bottom:16px;color:#8b949e;">Interfaces</h4>
              <div style="display:flex;flex-direction:column;gap:12px;">
                ${this.renderNetInterface('en0 (Wi-Fi)', '192.168.1.100', '00:1A:2B:3C:4D:5E', true)}
                ${this.renderNetInterface('lo0 (Loopback)', '127.0.0.1', '00:00:00:00:00:00', true)}
                ${this.renderNetInterface('en1 (Ethernet)', '10.0.0.50', '00:1A:2B:3C:4D:5F', false)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => {
      this.drawDualHistoryChart('net-history-chart', this.history.net, this.history.net.map((_, i) => this.history.net[i] * 0.2), '#059669', '#ec4899');
      this.drawBreakdownChart('net-breakdown-chart', [70, 30], ['#059669', '#ec4899'], ['Download', 'Upload']);
    }, 0);
  }

  renderNetInterface(name, ip, mac, active) {
    return `
      <div style="padding:12px;background:${active ? '#05966910' : '#21262d'};border-radius:8px;border:1px solid ${active ? '#05966930' : '#30363d'};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-weight:500;">${name}</span>
          <span style="width:8px;height:8px;border-radius:50%;background:${active ? '#059669' : '#8b949e'};"></span>
        </div>
        <div style="font-size:12px;color:#8b949e;font-family:var(--font-mono);display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          <span>IPv4</span><span>${ip}</span>
          <span>MAC</span><span>${mac}</span>
        </div>
      </div>
    `;
  }

  renderProcesses() {
    const processes = this.metrics.processes;
    this.contentEl.innerHTML = `
      <div style="padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="font-size:16px;font-weight:600;">Processes (${processes.length})</h3>
          <input type="text" id="process-search" placeholder="Filter processes..." style="padding:8px 12px;border:1px solid #30363d;border-radius:8px;background:#0d1117;color:#e2e8f0;font:inherit;font-size:13px;width:250px;">
        </div>
        <div style="background:#161b22;border:1px solid #30363d;border-radius:12px;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="border-bottom:1px solid #30363d;position:sticky;top:0;background:#161b22;">
                <th style="padding:12px 16px;text-align:left;color:#8b949e;font-weight:500;width:40px;">PID</th>
                <th style="padding:12px 16px;text-align:left;color:#8b949e;font-weight:500;">Process</th>
                <th style="padding:12px 16px;text-align:right;color:#8b949e;font-weight:500;width:80px;">CPU %</th>
                <th style="padding:12px 16px;text-align:right;color:#8b949e;font-weight:500;width:100px;">Memory</th>
                <th style="padding:12px 16px;text-align:center;color:#8b949e;font-weight:500;width:80px;">Threads</th>
                <th style="padding:12px 16px;text-align:left;color:#8b949e;font-weight:500;width:100px;">User</th>
                <th style="padding:12px 16px;text-align:left;color:#8b949e;font-weight:500;width:100px;">State</th>
              </tr>
            </thead>
            <tbody id="process-list">
              ${processes.map(p => `
                <tr style="border-bottom:1px solid #21262d;">
                  <td style="padding:10px 16px;font-family:var(--font-mono);color:#8b949e;">${p.pid}</td>
                  <td style="padding:10px 16px;font-family:var(--font-mono);">${this.escapeHtml(p.name)}</td>
                  <td style="padding:10px 16px;text-align:right;font-family:var(--font-mono);color:#6366f1;">${p.cpu.toFixed(1)}%</td>
                  <td style="padding:10px 16px;text-align:right;font-family:var(--font-mono);">${p.mem} MB</td>
                  <td style="padding:10px 16px;text-align:center;font-family:var(--font-mono);">${p.threads}</td>
                  <td style="padding:10px 16px;color:#8b949e;">${p.user}</td>
                  <td style="padding:10px 16px;">
                    <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:500;background:${p.state === 'Running' ? '#05966920' : '#fbbf2420'};color:${p.state === 'Running' ? '#059669' : '#fbbf24'};">${p.state}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    this.window.element.querySelector('#process-search').addEventListener('input', debounce((e) => {
      const q = e.target.value.toLowerCase();
      const rows = this.window.element.querySelectorAll('#process-list tr');
      rows.forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();
        row.style.display = name.includes(q) ? '' : 'none';
      });
    }, 150));
  }

  // Chart drawing methods
  drawHistoryChart(id, data, color) {
    const el = document.getElementById(id);
    if (!el) return;
    const canvas = document.createElement('canvas');
    canvas.width = el.clientWidth * 2;
    canvas.height = el.clientHeight * 2;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    el.innerHTML = '';
    el.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const padding = 40;
    
    if (data.length < 2) return;
    
    const max = Math.max(...data, 100);
    const min = 0;
    const range = max - min;
    
    // Grid
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (h - 2 * padding) * i / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(w - padding, y);
      ctx.stroke();
      
      // Labels
      ctx.fillStyle = '#484f58';
      ctx.font = '11px var(--font-mono)';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(max * (1 - i / 4)) + '%', padding - 8, y + 4);
    }
    
    // Data line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = padding + (w - 2 * padding) * i / (data.length - 1);
      const y = h - padding - (val - min) / range * (h - 2 * padding);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Fill
    const gradient = ctx.createLinearGradient(0, padding, 0, h - padding);
    gradient.addColorStop(0, color + '30');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.lineTo(w - padding, h - padding);
    ctx.lineTo(padding, h - padding);
    ctx.closePath();
    ctx.fill();
  }

  drawDualHistoryChart(id, data1, data2, color1, color2) {
    const el = document.getElementById(id);
    if (!el) return;
    const canvas = document.createElement('canvas');
    canvas.width = el.clientWidth * 2;
    canvas.height = el.clientHeight * 2;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    el.innerHTML = '';
    el.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const padding = 40;
    
    const allData = [...data1, ...data2];
    const max = Math.max(...allData, 1);
    
    // Grid
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (h - 2 * padding) * i / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(w - padding, y);
      ctx.stroke();
    }
    
    // Data 1
    ctx.strokeStyle = color1;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    data1.forEach((val, i) => {
      const x = padding + (w - 2 * padding) * i / (data1.length - 1);
      const y = h - padding - val / max * (h - 2 * padding);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Data 2
    ctx.strokeStyle = color2;
    ctx.beginPath();
    data2.forEach((val, i) => {
      const x = padding + (w - 2 * padding) * i / (data2.length - 1);
      const y = h - padding - val / max * (h - 2 * padding);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  drawBreakdownChart(id, values, colors, labels) {
    const el = document.getElementById(id);
    if (!el) return;
    const canvas = document.createElement('canvas');
    canvas.width = el.clientWidth * 2;
    canvas.height = el.clientHeight * 2;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    el.innerHTML = '';
    el.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) / 2 - 20;
    
    let startAngle = -Math.PI / 2;
    values.forEach((val, i) => {
      const angle = (val / 100) * Math.PI * 2;
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + angle);
      ctx.closePath();
      ctx.fill();
      startAngle += angle;
    });
    
    // Legend
    ctx.font = '11px var(--font-sans)';
    labels.forEach((label, i) => {
      const y = h - 60 + i * 18;
      ctx.fillStyle = colors[i];
      ctx.fillRect(20, y, 12, 12);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(label, 40, y + 10);
    });
  }

  drawDonutChart(id, percent, color, used, total) {
    const el = document.getElementById(id);
    if (!el) return;
    const canvas = document.createElement('canvas');
    canvas.width = el.clientWidth * 2;
    canvas.height = el.clientHeight * 2;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    el.innerHTML = '';
    el.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) / 2 - 20;
    const thickness = 20;
    
    // Background
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    
    // Progress
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (percent / 100) * Math.PI * 2);
    ctx.stroke();
    
    // Center text
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 24px var(--font-mono)';
    ctx.textAlign = 'center';
    ctx.fillText(percent.toFixed(1) + '%', cx, cy + 8);
    ctx.font = '12px var(--font-sans)';
    ctx.fillStyle = '#8b949e';
    ctx.fillText(`${used} / ${total}`, cx, cy + 28);
  }

  drawPressureChart(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const canvas = document.createElement('canvas');
    canvas.width = el.clientWidth * 2;
    canvas.height = el.clientHeight * 2;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    el.innerHTML = '';
    el.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const padding = 30;
    
    // Simulated pressure data
    const data = Array.from({ length: 30 }, () => Math.random() * 100);
    const max = 100;
    
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (h - 2 * padding) * i / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(w - padding, y);
      ctx.stroke();
    }
    
    // Warning zones
    const warnY = h - padding - 70 / max * (h - 2 * padding);
    const critY = h - padding - 90 / max * (h - 2 * padding);
    ctx.fillStyle = '#fbbf2420';
    ctx.fillRect(padding, warnY, w - 2 * padding, critY - warnY);
    ctx.fillStyle = '#f8717120';
    ctx.fillRect(padding, 0, w - 2 * padding, critY);
    
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = padding + (w - 2 * padding) * i / (data.length - 1);
      const y = h - padding - val / max * (h - 2 * padding);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#f87171';
    ctx.font = '10px var(--font-mono)';
    ctx.fillText('Critical', padding, critY - 4);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('Warning', padding, warnY - 4);
  }

  escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => {
      const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": '\'' };
      return map[c];
    });
  }

  getState() {
    return { tab: this.tab };
  }

  restoreState(state) {
    if (!state) return;
    this.tab = state.tab || 'overview';
  }

  destroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
  }
}

// Register
AppRegistry.register({
  id: 'system-monitor',
  name: 'System Monitor',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  class: SystemMonitorApp,
  width: 1000,
  height: 700,
  singleInstance: true,
  keywords: ['activity monitor', 'task manager', 'performance', 'resources'],
});