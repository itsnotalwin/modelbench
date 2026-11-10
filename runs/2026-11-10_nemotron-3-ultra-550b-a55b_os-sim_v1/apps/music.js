/* ==========================================================================
   Lumina OS — Music Player App
   Playlist, visualization, library
   ========================================================================== */

class MusicApp {
  constructor(window, options = {}) {
    this.window = window;
    this.audio = null;
    this.playlist = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.volume = 0.7;
    this.repeat = 'none'; // none, one, all
    this.shuffle = false;
    this.currentTime = 0;
    this.duration = 0;
    this.visualizer = null;
    this.analyser = null;
    this.dataArray = null;
    this.animationId = null;
  }

  init() {
    this.loadLibrary();
    this.render();
    this.bindEvents();
    this.setupAudio();
  }

  loadLibrary() {
    // Scan filesystem for audio files
    const scan = (path) => {
      try {
        const items = OS.filesystem.list(path);
        for (const item of items) {
          const fullPath = path === '/' ? '/' + item.name : path + '/' + item.name;
          if (item.type === 'directory') {
            scan(fullPath);
          } else if (this.isAudioFile(item.name)) {
            this.playlist.push({
              path: fullPath,
              name: item.name,
              title: item.name.replace(/\.[^.]+$/, ''),
              artist: 'Unknown',
              duration: 0,
            });
          }
        }
      } catch {}
    };
    scan('/');
    
    // Add some demo tracks if empty
    if (this.playlist.length === 0) {
      this.playlist = [
        { path: 'demo://track1', name: 'Lumina Theme', title: 'Lumina Theme', artist: 'OS Sound Design', duration: 180, demo: true },
        { path: 'demo://track2', name: 'Aurora Dreams', title: 'Aurora Dreams', artist: 'Synthwave Collective', duration: 245, demo: true },
        { path: 'demo://track3', name: 'Neon Nights', title: 'Neon Nights', artist: 'Retro Future', duration: 312, demo: true },
      ];
    }
  }

  isAudioFile(name) {
    return /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(name);
  }

  render() {
    const content = this.window.element.querySelector('.window-content');
    content.innerHTML = `
      <div class="music-app" style="height:100%;display:flex;flex-direction:column;background:#0d1117;color:#e2e8f0;font-family:var(--font-sans);">
        <!-- Sidebar -->
        <div class="music-sidebar" style="width:260px;background:#161b22;border-right:1px solid #30363d;display:flex;flex-direction:column;overflow:hidden;">
          <div style="padding:16px;border-bottom:1px solid #30363d;">
            <h2 style="font-size:18px;font-weight:600;">Library</h2>
          </div>
          <nav style="flex:1;overflow:auto;padding:8px;">
            <div style="margin-bottom:16px;">
              <button class="nav-item active" data-view="library" style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border:none;background:var(--color-primary-light);border-radius:6px;color:var(--color-primary);font:inherit;font-size:13px;cursor:pointer;text-align:left;">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/></svg>
                <span>All Tracks</span>
                <span class="nav-count" style="margin-left:auto;font-size:11px;background:var(--color-primary);color:white;padding:2px 6px;border-radius:10px;">${this.playlist.length}</span>
              </button>
            </div>
            <div style="margin-bottom:16px;">
              <h3 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#8b949e;margin-bottom:8px;padding:0 4px;">Playlists</h3>
              <button class="nav-item" data-view="playlist" data-playlist="favorites" style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border:none;background:transparent;border-radius:6px;color:#e2e8f0;font:inherit;font-size:13px;cursor:pointer;text-align:left;">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span>Favorites</span>
              </button>
              <button class="nav-item" data-view="playlist" data-playlist="recent" style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border:none;background:transparent;border-radius:6px;color:#e2e8f0;font:inherit;font-size:13px;cursor:pointer;text-align:left;">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Recently Played</span>
              </button>
            </div>
            <div>
              <h3 style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#8b949e;margin-bottom:8px;padding:0 4px;">Folders</h3>
              <button class="nav-item" data-view="folder" data-path="/Music" style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border:none;background:transparent;border-radius:6px;color:#e2e8f0;font:inherit;font-size:13px;cursor:pointer;text-align:left;">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                <span>Music Folder</span>
              </button>
            </div>
          </nav>
        </div>

        <!-- Main Content -->
        <div class="music-main" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
          <!-- Now Playing Bar (Top) -->
          <div class="now-playing-bar" style="display:flex;align-items:center;gap:16px;padding:16px 24px;background:#161b22;border-bottom:1px solid #30363d;">
            <div class="track-artwork" style="width:72px;height:72px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;overflow:hidden;">
              <svg id="artwork-icon" viewBox="0 0 24 24" style="width:32px;height:32px;color:white;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <div id="artwork-equalizer" style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:2px;height:16px;opacity:0;">
                <div class="eq-bar" style="width:3px;background:white;border-radius:1px;animation:eq 0.6s ease-in-out infinite;"></div>
                <div class="eq-bar" style="width:3px;background:white;border-radius:1px;animation:eq 0.6s ease-in-out infinite 0.1s;"></div>
                <div class="eq-bar" style="width:3px;background:white;border-radius:1px;animation:eq 0.6s ease-in-out infinite 0.2s;"></div>
                <div class="eq-bar" style="width:3px;background:white;border-radius:1px;animation:eq 0.6s ease-in-out infinite 0.3s;"></div>
                <div class="eq-bar" style="width:3px;background:white;border-radius:1px;animation:eq 0.6s ease-in-out infinite 0.4s;"></div>
              </div>
            </div>
            <div class="track-info" style="flex:1;min-width:0;">
              <div id="track-title" style="font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Select a track</div>
              <div id="track-artist" style="font-size:13px;color:#8b949e;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">No track playing</div>
              <div class="progress-bar" style="margin-top:10px;height:4px;background:#30363d;border-radius:2px;overflow:hidden;cursor:pointer;">
                <div id="progress-fill" style="width:0%;height:100%;background:var(--color-primary);border-radius:2px;transition:width 100ms linear;"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:#8b949e;">
                <span id="current-time">0:00</span>
                <span id="total-time">0:00</span>
              </div>
            </div>
            <div class="track-actions" style="display:flex;align-items:center;gap:8px;">
              <button class="icon-btn" id="btn-lyrics" title="Lyrics"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></button>
              <button class="icon-btn" id="btn-favorite" title="Add to Favorites"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
              <button class="icon-btn" id="btn-share" title="Share"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>
            </div>
          </div>

          <!-- Visualizer -->
          <div class="visualizer-container" style="height:120px;background:#0d1117;position:relative;overflow:hidden;">
            <canvas id="visualizer" style="width:100%;height:100%;display:block;"></canvas>
            <div style="position:absolute;inset:0;background:linear-gradient(to top,#0d1117,transparent);pointer-events:none;"></div>
          </div>

          <!-- Track List -->
          <div class="track-list-container" style="flex:1;overflow:auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 24px;border-bottom:1px solid #30363d;">
              <h3 style="font-size:14px;font-weight:600;">Queue</h3>
              <div style="display:flex;gap:8px;">
                <input type="text" id="search-tracks" placeholder="Search..." style="padding:6px 12px;border:1px solid #30363d;border-radius:6px;background:#0d1117;color:#e2e8f0;font:inherit;font-size:12px;width:200px;">
                <button class="icon-btn" id="btn-shuffle" title="Shuffle"><svg viewBox="0 0 24 24"><polyline points="16 3 21 3 21 8"/><path d="M4 20 21 3"/><polyline points="21 16 21 21 16 21"/><path d="M20 4 3 21"/></svg></button>
                <button class="icon-btn" id="btn-repeat" title="Repeat"><svg viewBox="0 0 24 24"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a2 2 0 0 1 2-2h10"/><path d="M20 13a9 9 0 0 1-9 9"/><path d="M20 20a2 2 0 0 1-2 2H6"/></svg></button>
                <button class="icon-btn" id="btn-clear-queue" title="Clear Queue"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
              </div>
            </div>
            <div id="track-list" style="padding:8px;"></div>
          </div>

          <!-- Player Controls (Bottom) -->
          <div class="player-controls" style="display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:#161b22;border-top:1px solid #30363d;">
            <div style="display:flex;align-items:center;gap:16px;">
              <button class="control-btn" id="btn-prev" title="Previous (⌘←)"><svg viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg></button>
              <button class="control-btn play-btn" id="btn-play" title="Play/Pause (Space)"><svg id="play-icon" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg><svg id="pause-icon" viewBox="0 0 24 24" style="display:none;"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></button>
              <button class="control-btn" id="btn-next" title="Next (⌘→)"><svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></button>
            </div>
            <div style="display:flex;align-items:center;gap:16px;">
              <button class="icon-btn" id="btn-repeat-one" title="Repeat One"><svg viewBox="0 0 24 24"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a2 2 0 0 1 2-2h10"/></svg><span class="repeat-badge">1</span></button>
              <div style="display:flex;align-items:center;gap:8px;">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;color:#8b949e;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>
                <input type="range" id="volume-slider" min="0" max="100" value="${Math.round(this.volume * 100)}" style="width:100px;accent-color:#6366f1;">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.visualizerCanvas = this.window.element.querySelector('#visualizer');
    this.visualizerCtx = this.visualizerCanvas.getContext('2d');
    this.setupVisualizer();
    this.renderTrackList();
    this.bindPlayerEvents();
  }

  setupVisualizer() {
    const resize = () => {
      this.visualizerCanvas.width = this.visualizerCanvas.offsetWidth * window.devicePixelRatio;
      this.visualizerCanvas.height = this.visualizerCanvas.offsetHeight * window.devicePixelRatio;
    };
    resize();
    new ResizeObserver(resize).observe(this.visualizerCanvas);
  }

  setupAudio() {
    this.audio = new Audio();
    this.audio.volume = this.volume;
    this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.audio.addEventListener('ended', () => this.onEnded());
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration;
      this.window.element.querySelector('#total-time').textContent = this.formatTime(this.duration);
    });
    this.audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      this.showError('Failed to load track');
    });

    // Web Audio API for visualization
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const source = this.audioContext.createMediaElementSource(this.audio);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio not available:', e);
    }
  }

  bindPlayerEvents() {
    const btn = (id, fn) => this.window.element.querySelector(`#${id}`)?.addEventListener('click', fn);

    btn('btn-play', () => this.togglePlay());
    btn('btn-prev', () => this.prevTrack());
    btn('btn-next', () => this.nextTrack());
    btn('btn-shuffle', () => this.toggleShuffle());
    btn('btn-repeat', () => this.cycleRepeat());
    btn('btn-repeat-one', () => this.cycleRepeat());
    btn('btn-clear-queue', () => this.clearQueue());
    btn('btn-favorite', () => this.toggleFavorite());
    btn('btn-lyrics', () => this.showLyrics());

    this.window.element.querySelector('#volume-slider').addEventListener('input', (e) => {
      this.volume = e.target.value / 100;
      this.audio.volume = this.volume;
    });

    this.window.element.querySelector('#search-tracks').addEventListener('input', debounce((e) => this.filterTracks(e.target.value), 200));

    // Progress bar click
    this.window.element.querySelector('.progress-bar').addEventListener('click', (e) => {
      const rect = e.target.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      this.seek(percent * this.duration);
    });
  }

  bindEvents() {
    this.window.element.addEventListener('keydown', (e) => this.onKeydown(e));
    
    // Nav items
    this.window.element.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.window.element.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.currentView = item.dataset.view;
        this.currentPlaylist = item.dataset.playlist;
        this.currentFolder = item.dataset.path;
        this.renderTrackList();
      });
    });
  }

  onKeydown(e) {
    if (e.target.tagName === 'INPUT') return;
    const isMac = navigator.platform.includes('Mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (e.key === ' ') { e.preventDefault(); this.togglePlay(); }
    if (e.key === 'ArrowLeft' && mod) { this.prevTrack(); }
    if (e.key === 'ArrowRight' && mod) { this.nextTrack(); }
    if (e.key === 'ArrowUp') { this.volume = Math.min(1, this.volume + 0.05); this.audio.volume = this.volume; this.window.element.querySelector('#volume-slider').value = Math.round(this.volume * 100); }
    if (e.key === 'ArrowDown') { this.volume = Math.max(0, this.volume - 0.05); this.audio.volume = this.volume; this.window.element.querySelector('#volume-slider').value = Math.round(this.volume * 100); }
    if (e.key === 's') { this.toggleShuffle(); }
    if (e.key === 'r') { this.cycleRepeat(); }
    if (e.key === 'f') { this.window.element.querySelector('#search-tracks').focus(); }
  }

  renderTrackList() {
    const list = this.window.element.querySelector('#track-list');
    let tracks = this.playlist;
    
    if (this.currentView === 'playlist' && this.currentPlaylist === 'favorites') {
      tracks = this.playlist.filter(t => t.favorite);
    } else if (this.currentView === 'folder' && this.currentFolder) {
      tracks = this.playlist.filter(t => t.path.startsWith(this.currentFolder));
    }
    
    const search = this.window.element.querySelector('#search-tracks').value.toLowerCase();
    if (search) {
      tracks = tracks.filter(t => t.title.toLowerCase().includes(search) || t.artist.toLowerCase().includes(search));
    }

    list.innerHTML = tracks.map((track, index) => `
      <div class="track-row${track.path === this.currentTrack?.path ? ' playing' : ''}" data-index="${this.playlist.indexOf(track)}" style="display:flex;align-items:center;gap:12px;padding:8px 16px;border-radius:6px;cursor:pointer;transition:background 100ms;${track.path === this.currentTrack?.path ? 'background:var(--color-primary-light);' : ''}">
        <div class="track-number" style="width:32px;text-align:center;font-size:12px;color:#8b949e;">${index + 1}</div>
        <div class="track-art" style="width:40px;height:40px;border-radius:4px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg viewBox="0 0 24 24" style="width:18px;height:18px;color:white;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
        <div class="track-details" style="flex:1;min-width:0;">
          <div class="track-name" style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHtml(track.title)}</div>
          <div class="track-artist" style="font-size:11px;color:#8b949e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.escapeHtml(track.artist)}</div>
        </div>
        <div class="track-duration" style="font-size:12px;color:#8b949e;width:60px;text-align:right;">${this.formatTime(track.duration)}</div>
        <button class="track-fav${track.favorite ? ' active' : ''}" data-index="${this.playlist.indexOf(track)}" style="width:24px;height:24px;border:none;background:transparent;color:${track.favorite ? '#f87171' : '#8b949e'};cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;" title="Favorite">
          <svg viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
    `).join('');

    list.querySelectorAll('.track-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (!e.target.closest('.track-fav')) {
          this.playTrack(parseInt(row.dataset.index));
        }
      });
      row.addEventListener('dblclick', () => this.playTrack(parseInt(row.dataset.index)));
    });

    list.querySelectorAll('.track-fav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const track = this.playlist[parseInt(btn.dataset.index)];
        track.favorite = !track.favorite;
        btn.classList.toggle('active', track.favorite);
        btn.style.color = track.favorite ? '#f87171' : '#8b949e';
      });
    });
  }

  playTrack(index) {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;
    this.currentTrack = this.playlist[index];
    
    // Load audio
    if (this.currentTrack.demo) {
      this.playDemoTrack(this.currentTrack.name);
    } else {
      this.audio.src = this.currentTrack.path;
      this.audio.load();
      this.audio.play().catch(() => {});
    }
    
    this.isPlaying = true;
    this.updatePlayButton();
    this.updateNowPlaying();
    this.renderTrackList();
    this.startVisualizer();
  }

  playDemoTrack(name) {
    // Generate demo audio using Web Audio API
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    const frequencies = {
      'Lumina Theme': [261.63, 329.63, 392.00, 523.25], // C4 E4 G4 C5
      'Aurora Dreams': [220.00, 277.18, 329.63, 440.00], // A3 C#4 E4 A4
      'Neon Nights': [196.00, 246.94, 293.66, 392.00], // G3 B3 D4 G4
    };
    
    const notes = frequencies[name] || frequencies['Lumina Theme'];
    let noteIndex = 0;
    
    const playNote = () => {
      osc.frequency.setValueAtTime(notes[noteIndex], ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      noteIndex = (noteIndex + 1) % notes.length;
      setTimeout(playNote, 1500);
    };
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    playNote();
    
    this.demoOsc = osc;
    this.demoGain = gain;
  }

  togglePlay() {
    if (!this.currentTrack) {
      if (this.playlist.length) this.playTrack(0);
      return;
    }
    
    if (this.isPlaying) {
      this.audio.pause();
      if (this.demoOsc) { this.demoOsc.stop(); this.demoOsc = null; }
    } else {
      this.audio.play().catch(() => {});
      if (this.currentTrack.demo && !this.demoOsc) this.playDemoTrack(this.currentTrack.name);
    }
    this.isPlaying = !this.isPlaying;
    this.updatePlayButton();
    this.updateNowPlaying();
  }

  updatePlayButton() {
    this.window.element.querySelector('#play-icon').style.display = this.isPlaying ? 'none' : 'block';
    this.window.element.querySelector('#pause-icon').style.display = this.isPlaying ? 'block' : 'none';
  }

  updateNowPlaying() {
    if (!this.currentTrack) return;
    this.window.element.querySelector('#track-title').textContent = this.currentTrack.title;
    this.window.element.querySelector('#track-artist').textContent = this.currentTrack.artist;
    this.window.element.querySelector('#btn-favorite').classList.toggle('active', this.currentTrack.favorite);
    this.window.element.querySelector('#btn-favorite svg').style.color = this.currentTrack.favorite ? '#f87171' : '#8b949e';
    
    // Animate artwork
    const eq = this.window.element.querySelector('#artwork-equalizer');
    const icon = this.window.element.querySelector('#artwork-icon');
    if (this.isPlaying) {
      eq.style.opacity = '1';
      icon.style.opacity = '0';
    } else {
      eq.style.opacity = '0';
      icon.style.opacity = '1';
    }
  }

  prevTrack() {
    if (this.shuffle) {
      this.playTrack(Math.floor(Math.random() * this.playlist.length));
    } else {
      this.playTrack((this.currentIndex - 1 + this.playlist.length) % this.playlist.length);
    }
  }

  nextTrack() {
    if (this.shuffle) {
      this.playTrack(Math.floor(Math.random() * this.playlist.length));
    } else {
      this.playTrack((this.currentIndex + 1) % this.playlist.length);
    }
  }

  onTimeUpdate() {
    this.currentTime = this.audio.currentTime;
    const percent = (this.currentTime / this.duration) * 100;
    this.window.element.querySelector('#progress-fill').style.width = `${percent}%`;
    this.window.element.querySelector('#current-time').textContent = this.formatTime(this.currentTime);
  }

  onEnded() {
    if (this.repeat === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
    } else {
      this.nextTrack();
    }
  }

  seek(time) {
    this.audio.currentTime = time;
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    this.window.element.querySelector('#btn-shuffle').classList.toggle('active', this.shuffle);
    this.window.element.querySelector('#btn-shuffle svg').style.color = this.shuffle ? '#6366f1' : '#8b949e';
  }

  cycleRepeat() {
    const modes = ['none', 'all', 'one'];
    const current = modes.indexOf(this.repeat);
    this.repeat = modes[(current + 1) % modes.length];
    
    const repeatBtn = this.window.element.querySelector('#btn-repeat');
    const repeatOneBtn = this.window.element.querySelector('#btn-repeat-one');
    
    if (this.repeat === 'none') {
      repeatBtn.classList.remove('active');
      repeatBtn.querySelector('svg').style.color = '#8b949e';
      repeatOneBtn.classList.remove('active');
    } else if (this.repeat === 'all') {
      repeatBtn.classList.add('active');
      repeatBtn.querySelector('svg').style.color = '#6366f1';
      repeatOneBtn.classList.remove('active');
    } else {
      repeatBtn.classList.remove('active');
      repeatBtn.querySelector('svg').style.color = '#8b949e';
      repeatOneBtn.classList.add('active');
    }
  }

  toggleFavorite() {
    if (!this.currentTrack) return;
    this.currentTrack.favorite = !this.currentTrack.favorite;
    this.updateNowPlaying();
    this.renderTrackList();
  }

  clearQueue() {
    this.playlist = [];
    this.currentIndex = -1;
    this.currentTrack = null;
    this.audio.pause();
    this.audio.src = '';
    this.isPlaying = false;
    this.updatePlayButton();
    this.updateNowPlaying();
    this.renderTrackList();
  }

  showLyrics() {
    OS.notifications.show('Lyrics', 'Lyrics feature coming soon! 🎵');
  }

  // Visualizer
  startVisualizer() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    const draw = () => {
      if (!this.analyser || !this.isPlaying) return;
      this.analyser.getByteFrequencyData(this.dataArray);
      this.drawVisualizer();
      this.animationId = requestAnimationFrame(draw);
    };
    draw();
  }

  drawVisualizer() {
    const ctx = this.visualizerCtx;
    const w = this.visualizerCanvas.width;
    const h = this.visualizerCanvas.height;
    const dpr = window.devicePixelRatio || 1;
    
    ctx.clearRect(0, 0, w, h);
    
    const barWidth = w / this.dataArray.length * 2;
    let x = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const value = this.dataArray[i] / 255;
      const barHeight = value * h * 0.8;
      const hue = 240 + value * 60; // Blue to purple
      
      ctx.fillStyle = `hsl(${hue}, 80%, ${50 + value * 30}%)`;
      ctx.fillRect(x, h - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  filterTracks(query) {
    this.renderTrackList();
  }

  escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => {
      const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": '\'' };
      return map[c];
    });
  }

  showError(msg) {
    OS.notifications.show('Music Player', msg);
  }

  getState() {
    return {
      playlist: this.playlist,
      currentIndex: this.currentIndex,
      volume: this.volume,
      repeat: this.repeat,
      shuffle: this.shuffle,
    };
  }

  restoreState(state) {
    if (!state) return;
    this.playlist = state.playlist || this.playlist;
    this.currentIndex = state.currentIndex || -1;
    this.volume = state.volume || 0.7;
    this.repeat = state.repeat || 'none';
    this.shuffle = state.shuffle || false;
    this.audio.volume = this.volume;
    this.window.element.querySelector('#volume-slider').value = Math.round(this.volume * 100);
    this.cycleRepeat(); // Set correct UI state
    if (this.shuffle) this.toggleShuffle();
    this.renderTrackList();
    if (this.currentIndex >= 0) this.playTrack(this.currentIndex);
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.audio.pause();
    if (this.demoOsc) this.demoOsc.stop();
  }
}

// Register
AppRegistry.register({
  id: 'music',
  name: 'Music',
  icon: '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  class: MusicApp,
  width: 1000,
  height: 700,
  singleInstance: true,
  keywords: ['player', 'audio', 'playlist', 'songs'],
});