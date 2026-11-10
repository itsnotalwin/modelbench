/* ==========================================================================
   Lumina OS — Terminal App
   Real command set with pipes, redirection, history, tab completion
   ========================================================================== */

class TerminalApp {
  constructor(window, options = {}) {
    this.window = window;
    this.cwd = options.cwd || '/';
    this.history = [];
    this.historyIndex = -1;
    this.historyFile = '.terminal_history';
    this.buffer = '';
    this.prompt = 'λ';
    this.env = {
      PATH: '/bin:/usr/bin',
      HOME: '/',
      USER: OS.user.name,
      SHELL: 'lumina-shell',
      TERM: 'xterm-256color',
      PWD: '/',
    };
    this.jobs = new Map();
    this.jobCounter = 0;
    this.aliases = {
      'll': 'ls -la',
      'la': 'ls -a',
      '..': 'cd ..',
      '...': 'cd ../..',
      'cls': 'clear',
      'h': 'history',
      'j': 'jobs',
    };
    this.builtins = {
      'cd': this.cmd_cd.bind(this),
      'pwd': this.cmd_pwd.bind(this),
      'ls': this.cmd_ls.bind(this),
      'cat': this.cmd_cat.bind(this),
      'echo': this.cmd_echo.bind(this),
      'mkdir': this.cmd_mkdir.bind(this),
      'touch': this.cmd_touch.bind(this),
      'rm': this.cmd_rm.bind(this),
      'cp': this.cmd_cp.bind(this),
      'mv': this.cmd_mv.bind(this),
      'find': this.cmd_find.bind(this),
      'grep': this.cmd_grep.bind(this),
      'head': this.cmd_head.bind(this),
      'tail': this.cmd_tail.bind(this),
      'wc': this.cmd_wc.bind(this),
      'ps': this.cmd_ps.bind(this),
      'kill': this.cmd_kill.bind(this),
      'jobs': this.cmd_jobs.bind(this),
      'bg': this.cmd_bg.bind(this),
      'fg': this.cmd_fg.bind(this),
      'clear': this.cmd_clear.bind(this),
      'history': this.cmd_history.bind(this),
      'alias': this.cmd_alias.bind(this),
      'unalias': this.cmd_unalias.bind(this),
      'export': this.cmd_export.bind(this),
      'env': this.cmd_env.bind(this),
      'which': this.cmd_which.bind(this),
      'man': this.cmd_man.bind(this),
      'help': this.cmd_help.bind(this),
      'date': this.cmd_date.bind(this),
      'whoami': this.cmd_whoami.bind(this),
      'hostname': this.cmd_hostname.bind(this),
      'uname': this.cmd_uname.bind(this),
      'df': this.cmd_df.bind(this),
      'du': this.cmd_du.bind(this),
      'tree': this.cmd_tree.bind(this),
      'edit': this.cmd_edit.bind(this),
      'calc': this.cmd_calc.bind(this),
      'color': this.cmd_color.bind(this),
      'banner': this.cmd_banner.bind(this),
      'fortune': this.cmd_fortune.bind(this),
      'cowsay': this.cmd_cowsay.bind(this),
      'lolcat': this.cmd_lolcat.bind(this),
      'exit': this.cmd_exit.bind(this),
    };
    this.completions = new Set([
      ...Object.keys(this.builtins),
      ...Object.keys(this.aliases),
      'cd', 'ls', 'cat', 'echo', 'mkdir', 'touch', 'rm', 'cp', 'mv',
      'find', 'grep', 'head', 'tail', 'wc', 'ps', 'kill', 'jobs',
      'clear', 'history', 'alias', 'export', 'env', 'which', 'man',
      'help', 'date', 'whoami', 'hostname', 'uname', 'df', 'du',
      'tree', 'edit', 'calc', 'color', 'banner', 'fortune', 'cowsay',
      'lolcat', 'exit', 'sudo', 'npm', 'node', 'python', 'git',
    ]);
  }

  init() {
    this.loadHistory();
    this.render();
    this.bindEvents();
    this.printWelcome();
    this.showPrompt();
  }

  render() {
    const content = this.window.element.querySelector('.window-content');
    content.innerHTML = `
      <div class="terminal" style="height:100%;display:flex;flex-direction:column;background:#0a0f1a;color:#e2e8f0;font-family:var(--font-mono);font-size:13px;line-height:1.6;">
        <div class="terminal-output" id="term-output" style="flex:1;overflow:auto;padding:12px;white-space:pre-wrap;word-wrap:break-word;"></div>
        <div class="terminal-input-line" style="display:flex;align-items:center;padding:8px 12px;border-top:1px solid rgba(148,163,184,0.2);background:rgba(15,23,42,0.5);">
          <span class="terminal-prompt" style="color:#6366f1;font-weight:600;margin-right:8px;user-select:none;" data-prompt="${this.escapeHtml(this.getPrompt())}">${this.escapeHtml(this.getPrompt())}</span>
          <input type="text" class="terminal-input" id="term-input" style="flex:1;background:transparent;border:none;outline:none;color:inherit;font:inherit;font-size:13px;" spellcheck="false" autocomplete="off" aria-label="Terminal input">
        </div>
      </div>
    `;
    this.outputEl = this.window.element.querySelector('#term-output');
    this.inputEl = this.window.element.querySelector('#term-input');
    this.promptEl = this.window.element.querySelector('.terminal-prompt');
  }

  bindEvents() {
    this.inputEl.addEventListener('keydown', (e) => this.onKeydown(e));
    this.inputEl.addEventListener('input', () => this.updateCompletions());
    
    // Click to focus
    this.window.element.querySelector('.terminal').addEventListener('click', () => this.inputEl.focus());
    
    // Paste
    this.inputEl.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text');
      this.insertAtCursor(text);
    });

    // Context menu
    this.window.element.querySelector('.terminal').addEventListener('contextmenu', (e) => {
      e.preventDefault();
      OS.contextMenu.show(e.clientX, e.clientY, [
        { label: 'Copy', action: 'copy', shortcut: '⌘C', icon: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' },
        { label: 'Paste', action: 'paste', shortcut: '⌘V', icon: '<svg viewBox="0 0 24 24"><path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11"/><path d="M15 4v5h6"/></svg>' },
        'divider',
        { label: 'Clear', action: 'clear', shortcut: '⌘K', icon: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' },
        { label: 'Reset', action: 'reset', icon: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>' },
      ], { terminal: this });
    });
  }

  onKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.executeCommand(this.inputEl.value);
      this.inputEl.value = '';
      this.historyIndex = this.history.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.inputEl.value = this.history[this.historyIndex] || '';
        this.moveCursorToEnd();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.inputEl.value = this.history[this.historyIndex] || '';
      } else {
        this.historyIndex = this.history.length;
        this.inputEl.value = '';
      }
      this.moveCursorToEnd();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.tabComplete();
    } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.sendSignal('SIGINT');
    } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (this.inputEl.value === '') this.cmd_exit();
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.cmd_clear();
    } else if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.clearScrollback();
    } else if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.inputEl.value = '';
    } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.moveCursorToStart();
    } else if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.moveCursorToEnd();
    }
  }

  async executeCommand(line) {
    this.printLine(`${this.getPrompt()} ${this.escapeHtml(line)}`, 'command');
    const trimmed = line.trim();
    if (!trimmed) { this.showPrompt(); return; }

    // Add to history
    if (this.history.length === 0 || this.history[this.history.length - 1] !== trimmed) {
      this.history.push(trimmed);
      if (this.history.length > 1000) this.history.shift();
      this.saveHistory();
    }

    // Parse pipeline
    try {
      await this.runPipeline(trimmed);
    } catch (err) {
      this.printError(err.message);
      this.showPrompt();
    }
  }

  async runPipeline(line) {
    // Simple pipeline parsing: split by | but respect quotes
    const commands = this.parsePipeline(line);
    if (commands.length === 1) {
      this.runCommand(commands[0]);
    } else {
      this.runPipelineChain(commands, 0, '');
    }
  }

  parsePipeline(line) {
    const commands = [];
    let current = '';
    let inSingle = false, inDouble = false, escape = false;
    
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (escape) { current += c; escape = false; continue; }
      if (c === '\\') { escape = true; current += c; continue; }
      if (c === "'" && !inDouble) { inSingle = !inSingle; current += c; continue; }
      if (c === '"' && !inSingle) { inDouble = !inDouble; current += c; continue; }
      if (c === '|' && !inSingle && !inDouble) {
        commands.push(current.trim());
        current = '';
        continue;
      }
      current += c;
    }
    if (current.trim()) commands.push(current.trim());
    return commands;
  }

  async runPipelineChain(commands, index, input) {
    if (index >= commands.length) {
      this.showPrompt();
      return;
    }

    const cmd = this.parseCommand(commands[index]);
    const originalStdin = this.stdin;
    this.stdin = input;

    const captureOutput = (output) => {
      this.stdin = originalStdin;
      if (index === commands.length - 1) {
        if (output) this.printRaw(output);
        this.showPrompt();
      } else {
        this.runPipelineChain(commands, index + 1, output);
      }
    };

    this.runCommandWithCapture(cmd, captureOutput);
  }

  parseCommand(line) {
    // Parse with redirection support
    const tokens = [];
    let current = '';
    let inSingle = false, inDouble = false, escape = false;
    let redirectOut = null, redirectErr = null, redirectAppend = false, redirectIn = null;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (escape) { current += c; escape = false; continue; }
      if (c === '\\') { escape = true; current += c; continue; }
      if (c === "'" && !inDouble) { inSingle = !inSingle; current += c; continue; }
      if (c === '"' && !inSingle) { inDouble = !inDouble; current += c; continue; }
      
      if (!inSingle && !inDouble) {
        if (c === '>' && line[i+1] === '>') {
          redirectAppend = true; i++; continue;
        }
        if (c === '>') { redirectOut = true; continue; }
        if (c === '<') { redirectIn = true; continue; }
        if (c === '2' && line[i+1] === '>') { redirectErr = true; i++; continue; }
      }
      
      if (/\s/.test(c) && !inSingle && !inDouble) {
        if (current) { tokens.push(current); current = ''; }
        continue;
      }
      current += c;
    }
    if (current) tokens.push(current);

    // Handle redirection files
    const args = [];
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === '>' || tokens[i] === '>>') {
        redirectOut = tokens[++i];
        redirectAppend = tokens[i-1] === '>>';
      } else if (tokens[i] === '<') {
        redirectIn = tokens[++i];
      } else if (tokens[i] === '2>') {
        redirectErr = tokens[++i];
      } else {
        args.push(tokens[i]);
      }
    }

    return { args, redirectOut, redirectErr, redirectIn, redirectAppend };
  }

  async runCommand(cmd) {
    const { args, redirectOut, redirectErr, redirectIn, redirectAppend } = cmd;
    if (!args.length) { this.showPrompt(); return; }

    let command = args[0];
    const commandArgs = args.slice(1);

    // Handle aliases
    if (this.aliases[command]) {
      const aliasCmd = this.parseCommand(this.aliases[command]);
      command = aliasCmd.args[0];
      commandArgs.unshift(...aliasCmd.args.slice(1));
    }

    // Input redirection
    let stdinContent = '';
    if (redirectIn) {
      try {
        stdinContent = OS.filesystem.readFile(this.resolvePath(redirectIn));
      } catch (err) {
        this.printError(`${redirectIn}: No such file or directory`);
        this.showPrompt();
        return;
      }
    } else if (this.stdin !== undefined) {
      stdinContent = this.stdin;
    }

    // Builtin
    if (this.builtins[command]) {
      try {
        const output = await this.builtins[command](commandArgs, stdinContent);
        this.handleOutput(output, redirectOut, redirectAppend, redirectErr);
      } catch (err) {
        this.handleError(err.message, redirectErr);
      }
      this.showPrompt();
      return;
    }

    // External command simulation
    this.printError(`${command}: command not found`);
    this.showPrompt();
  }

  async runCommandWithCapture(cmd, callback) {
    const { args, redirectOut, redirectErr, redirectIn, redirectAppend } = cmd;
    if (!args.length) { callback(''); return; }

    let command = args[0];
    const commandArgs = args.slice(1);

    if (this.aliases[command]) {
      const aliasCmd = this.parseCommand(this.aliases[command]);
      command = aliasCmd.args[0];
      commandArgs.unshift(...aliasCmd.args.slice(1));
    }

    let stdinContent = '';
    if (redirectIn) {
      try {
        stdinContent = OS.filesystem.readFile(this.resolvePath(redirectIn));
      } catch (err) {
        callback('');
        return;
      }
    } else if (this.stdin !== undefined) {
      stdinContent = this.stdin;
    }

    if (this.builtins[command]) {
      try {
        const output = await this.builtins[command](commandArgs, stdinContent);
        callback(output || '');
      } catch (err) {
        callback('');
      }
      return;
    }

    callback('');
  }

  handleOutput(output, redirectOut, redirectAppend, redirectErr) {
    if (redirectOut) {
      try {
        const path = this.resolvePath(redirectOut);
        const existing = redirectAppend ? OS.filesystem.readFile(path) : '';
        OS.filesystem.writeFile(path, existing + (output || ''));
      } catch (err) {
        this.printError(`${redirectOut}: ${err.message}`);
      }
    } else if (output) {
      this.printRaw(output);
    }
  }

  handleError(error, redirectErr) {
    if (redirectErr) {
      try {
        OS.filesystem.writeFile(this.resolvePath(redirectErr), error);
      } catch (err) {
        this.printError(`${redirectErr}: ${err.message}`);
      }
    } else {
      this.printError(error);
    }
  }

  printWelcome() {
    const art = `
    ██╗     ███████╗███████╗██████╗  ██████╗ ██████╗ ███████╗
    ██║     ██╔════╝██╔════╝██╔══██╗██╔═══██╗██╔══██╗██╔════╝
    ██║     █████╗  ███████╗██████╔╝██║   ██║██████╔╝███████╗
    ██║     ██╔══╝  ╚════██║██╔═══╝ ██║   ██║██╔══██╗╚════██║
    ███████╗███████╗███████╗██║     ╚██████╔╝██║  ██║███████║
    ╚══════╝╚══════╝╚══════╝═╝      ╚═════╝ ═╝  ═╝╚══════╝
    
    Welcome to Lumina OS Terminal v1.0
    Type 'help' for available commands, 'man <cmd>' for manual.
    `;
    this.printRaw(art, 'welcome');
  }

  getPrompt() {
    const shortPath = this.cwd === '/' ? '~' : this.cwd.split('/').pop();
    return `${this.env.USER}@lumina:${shortPath} ${this.prompt}`;
  }

  updatePrompt() {
    this.promptEl.textContent = this.getPrompt();
    this.promptEl.dataset.prompt = this.getPrompt();
  }

  showPrompt() {
    this.updatePrompt();
    this.inputEl.focus();
    this.scrollToBottom();
  }

  printLine(text, className = '') {
    const div = document.createElement('div');
    div.className = `terminal-line ${className}`;
    div.innerHTML = text;
    this.outputEl.appendChild(div);
    this.scrollToBottom();
  }

  printRaw(text, className = '') {
    const lines = text.split('\n');
    lines.forEach(line => this.printLine(line, className));
  }

  printError(text) {
    this.printLine(`<span style="color:#f87171;">${this.escapeHtml(text)}</span>`, 'error');
  }

  printSuccess(text) {
    this.printLine(`<span style="color:#34d399;">${this.escapeHtml(text)}</span>`, 'success');
  }

  escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => {
      const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": '\'' };
      return map[c];
    });
  }

  scrollToBottom() {
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  moveCursorToEnd() {
    this.inputEl.setSelectionRange(this.inputEl.value.length, this.inputEl.value.length);
  }

  moveCursorToStart() {
    this.inputEl.setSelectionRange(0, 0);
  }

  insertAtCursor(text) {
    const start = this.inputEl.selectionStart;
    const end = this.inputEl.selectionEnd;
    this.inputEl.value = this.inputEl.value.slice(0, start) + text + this.inputEl.value.slice(end);
    this.inputEl.setSelectionRange(start + text.length, start + text.length);
  }

  tabComplete() {
    const value = this.inputEl.value;
    const cursor = this.inputEl.selectionStart;
    const beforeCursor = value.slice(0, cursor);
    const afterCursor = value.slice(cursor);
    
    // Find the word being completed
    const match = beforeCursor.match(/([^\s]+)$/);
    if (!match) return;
    
    const prefix = match[1];
    const prefixStart = cursor - prefix.length;
    
    // Get completions
    let completions = [];
    
    if (prefix.startsWith('/') || prefix.startsWith('./') || prefix.includes('/')) {
      // Path completion
      completions = this.getPathCompletions(prefix);
    } else {
      // Command completion
      completions = [...this.completions].filter(c => c.startsWith(prefix));
    }
    
    if (completions.length === 1) {
      const completion = completions[0];
      const suffix = completion.slice(prefix.length);
      this.inputEl.value = value.slice(0, prefixStart) + completion + afterCursor;
      this.inputEl.setSelectionRange(prefixStart + completion.length, prefixStart + completion.length);
    } else if (completions.length > 1) {
      // Show common prefix
      const common = this.commonPrefix(completions);
      if (common.length > prefix.length) {
        this.inputEl.value = value.slice(0, prefixStart) + common + afterCursor;
        this.inputEl.setSelectionRange(prefixStart + common.length, prefixStart + common.length);
      }
      // Show completions
      this.printLine('');
      this.printLine(completions.join('  '), 'completions');
      this.printLine(`${this.getPrompt()} ${this.escapeHtml(value)}`, 'command');
    }
  }

  getPathCompletions(prefix) {
    const parts = prefix.split('/');
    const dirPath = parts.slice(0, -1).join('/') || '/';
    const namePrefix = parts[parts.length - 1];
    
    try {
      const items = OS.filesystem.list(dirPath);
      return items
        .filter(item => item.name.startsWith(namePrefix))
        .map(item => {
          const fullPath = dirPath === '/' ? '/' + item.name : dirPath + '/' + item.name;
          return item.type === 'directory' ? fullPath + '/' : fullPath;
        });
    } catch {
      return [];
    }
  }

  commonPrefix(strings) {
    if (!strings.length) return '';
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
      while (!strings[i].startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
        if (!prefix) return '';
      }
    }
    return prefix;
  }

  loadHistory() {
    try {
      const content = OS.filesystem.readFile('/' + this.historyFile);
      this.history = content.split('\n').filter(l => l.trim());
    } catch {
      this.history = [];
    }
  }

  saveHistory() {
    try {
      OS.filesystem.writeFile('/' + this.historyFile, this.history.join('\n'));
    } catch {}
  }

  clearScrollback() {
    this.outputEl.innerHTML = '';
  }

  sendSignal(signal) {
    this.printLine(`^C`, 'signal');
    this.showPrompt();
  }

  resolvePath(path) {
    if (path.startsWith('/')) return path;
    if (path === '~') return this.env.HOME;
    if (path.startsWith('~/')) return this.env.HOME + path.slice(1);
    if (this.cwd === '/') return '/' + path;
    return this.cwd + '/' + path;
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'K';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + 'M';
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + 'G';
  }

  // ==========================================================================
  // Built-in Commands
  // ==========================================================================

  cmd_cd(args) {
    const target = args[0] || this.env.HOME;
    const path = this.resolvePath(target);
    try {
      const node = OS.filesystem.getNode(path);
      if (!node || node.type !== 'directory') throw new Error('Not a directory');
      this.cwd = path;
      this.env.PWD = path;
      this.updatePrompt();
    } catch (err) {
      throw new Error(`cd: ${target}: ${err.message}`);
    }
  }

  cmd_pwd() {
    return this.cwd;
  }

  cmd_ls(args) {
    const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al');
    const long = args.includes('-l') || args.includes('-la') || args.includes('-al');
    const path = args.find(a => !a.startsWith('-')) || this.cwd;
    const target = this.resolvePath(path);
    
    try {
      const items = OS.filesystem.list(target);
      if (!long) {
        return items
          .filter(item => showAll || !item.name.startsWith('.'))
          .map(item => {
            const color = item.type === 'directory' ? '#818cf8' : item.name.endsWith('.js') ? '#f0db4f' : '#e2e8f0';
            return `<span style="color:${color};">${this.escapeHtml(item.name)}${item.type === 'directory' ? '/' : ''}</span>`;
          })
          .join('  ');
      }
      
      // Long format
      const lines = ['total ' + items.length];
      for (const item of items) {
        if (!showAll && item.name.startsWith('.')) continue;
        const perms = item.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--';
        const size = this.formatSize(item.metadata?.size || 0);
        const time = new Date(item.modified).toLocaleDateString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const color = item.type === 'directory' ? '#818cf8' : '#e2e8f0';
        lines.push(`${perms} 1 ${this.env.USER}  staff ${size.padStart(8)} ${time} <span style="color:${color}">${this.escapeHtml(item.name)}${item.type === 'directory' ? '/' : ''}</span>`);
      }
      return lines.join('\n');
    } catch (err) {
      throw new Error(`ls: ${path}: ${err.message}`);
    }
  }

  cmd_cat(args, stdin) {
    if (stdin) return stdin;
    if (!args.length) throw new Error('cat: missing file operand');
    
    let output = '';
    for (const arg of args) {
      try {
        const content = OS.filesystem.readFile(this.resolvePath(arg));
        output += content;
      } catch (err) {
        throw new Error(`cat: ${arg}: ${err.message}`);
      }
    }
    return output;
  }

  cmd_echo(args) {
    // Handle flags
    let newline = true;
    let escape = false;
    const filtered = [];
    for (const arg of args) {
      if (arg === '-n') newline = false;
      else if (arg === '-e') escape = true;
      else filtered.push(arg);
    }
    let text = filtered.join(' ');
    if (escape) {
      text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    }
    return text + (newline ? '\n' : '');
  }

  cmd_mkdir(args) {
    if (!args.length) throw new Error('mkdir: missing operand');
    const parents = args.includes('-p');
    const dirs = args.filter(a => !a.startsWith('-'));
    for (const dir of dirs) {
      try {
        if (parents) {
          // Create parent directories
          const parts = this.resolvePath(dir).split('/').filter(Boolean);
          let current = '/';
          for (const part of parts) {
            current = current === '/' ? '/' + part : current + '/' + part;
            try { OS.filesystem.getNode(current); } catch { OS.filesystem.mkdir(current); }
          }
        } else {
          OS.filesystem.mkdir(this.resolvePath(dir));
        }
      } catch (err) {
        throw new Error(`mkdir: ${dir}: ${err.message}`);
      }
    }
  }

  cmd_touch(args) {
    if (!args.length) throw new Error('touch: missing file operand');
    for (const file of args) {
      try {
        const path = this.resolvePath(file);
        try {
          OS.filesystem.readFile(path); // exists
        } catch {
          OS.filesystem.writeFile(path, '');
        }
      } catch (err) {
        throw new Error(`touch: ${file}: ${err.message}`);
      }
    }
  }

  cmd_rm(args) {
    const recursive = args.includes('-r') || args.includes('-R');
    const force = args.includes('-f');
    const files = args.filter(a => !a.startsWith('-'));
    if (!files.length) throw new Error('rm: missing operand');
    
    for (const file of files) {
      try {
        const path = this.resolvePath(file);
        const node = OS.filesystem.getNode(path);
        if (node.type === 'directory' && !recursive) {
          throw new Error('Is a directory (use -r)');
        }
        OS.filesystem.delete(path);
      } catch (err) {
        if (!force) throw new Error(`rm: ${file}: ${err.message}`);
      }
    }
  }

  cmd_cp(args) {
    const recursive = args.includes('-r') || args.includes('-R');
    const files = args.filter(a => !a.startsWith('-'));
    if (files.length < 2) throw new Error('cp: missing operand');
    const dest = files.pop();
    const destPath = this.resolvePath(dest);
    const destNode = OS.filesystem.getNode(destPath);
    
    for (const file of files) {
      try {
        const srcPath = this.resolvePath(file);
        if (destNode && destNode.type === 'directory') {
          OS.filesystem.copy(srcPath, destPath);
        } else {
          OS.filesystem.copy(srcPath, destNode?.parent || '/', destNode?.name);
        }
      } catch (err) {
        throw new Error(`cp: ${file}: ${err.message}`);
      }
    }
  }

  cmd_mv(args) {
    const files = args.filter(a => !a.startsWith('-'));
    if (files.length < 2) throw new Error('mv: missing operand');
    const dest = files.pop();
    const destPath = this.resolvePath(dest);
    const destNode = OS.filesystem.getNode(destPath);
    
    for (const file of files) {
      try {
        const srcPath = this.resolvePath(file);
        if (destNode && destNode.type === 'directory') {
          OS.filesystem.move(srcPath, destPath);
        } else {
          OS.filesystem.move(srcPath, destNode?.parent || '/', destNode?.name);
        }
      } catch (err) {
        throw new Error(`mv: ${file}: ${err.message}`);
      }
    }
  }

  cmd_find(args) {
    const path = args.find(a => !a.startsWith('-')) || this.cwd;
    const nameArg = args.findIndex(a => a === '-name');
    const pattern = nameArg > -1 ? args[nameArg + 1] : null;
    const typeArg = args.findIndex(a => a === '-type');
    const type = typeArg > -1 ? args[typeArg + 1] : null;
    
    const results = [];
    const search = (dirPath, prefix = '') => {
      try {
        const items = OS.filesystem.list(dirPath);
        for (const item of items) {
          const fullPath = prefix + item.name;
          if (pattern && !this.matchGlob(item.name, pattern)) continue;
          if (type && type !== item.type) continue;
          results.push(fullPath + (item.type === 'directory' ? '/' : ''));
          if (item.type === 'directory') {
            search(dirPath + '/' + item.name, fullPath + '/');
          }
        }
      } catch {}
    };
    search(this.resolvePath(path));
    return results.join('\n');
  }

  matchGlob(str, pattern) {
    const regex = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp('^' + regex + '$').test(str);
  }

  cmd_grep(args, stdin) {
    const patternIdx = args.findIndex(a => !a.startsWith('-'));
    if (patternIdx === -1 && !stdin) throw new Error('grep: missing pattern');
    const pattern = patternIdx > -1 ? args[patternIdx] : '';
    const files = args.slice(patternIdx + 1).filter(a => !a.startsWith('-'));
    const ignoreCase = args.includes('-i');
    const lineNum = args.includes('-n');
    const invert = args.includes('-v');
    const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
    
    let output = '';
    const search = (content, filename) => {
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        const match = regex.test(line);
        if ((match && !invert) || (!match && invert)) {
          let prefix = '';
          if (files.length > 1) prefix += `${filename}:`;
          if (lineNum) prefix += `${i + 1}:`;
          output += `${prefix}${line}\n`;
        }
      });
    };
    
    if (stdin) {
      search(stdin, '(standard input)');
    } else {
      for (const file of files) {
        try {
          search(OS.filesystem.readFile(this.resolvePath(file)), file);
        } catch {}
      }
    }
    return output;
  }

  cmd_head(args, stdin) {
    const nIdx = args.findIndex(a => a === '-n');
    const n = nIdx > -1 ? parseInt(args[nIdx + 1]) : 10;
    const files = args.filter(a => !a.startsWith('-') && a !== String(n));
    
    if (stdin) return stdin.split('\n').slice(0, n).join('\n') + '\n';
    if (!files.length) return '';
    
    let output = '';
    for (const file of files) {
      try {
        const content = OS.filesystem.readFile(this.resolvePath(file));
        if (files.length > 1) output += `==> ${file} <==\n`;
        output += content.split('\n').slice(0, n).join('\n') + '\n';
      } catch {}
    }
    return output;
  }

  cmd_tail(args, stdin) {
    const nIdx = args.findIndex(a => a === '-n');
    const n = nIdx > -1 ? parseInt(args[nIdx + 1]) : 10;
    const files = args.filter(a => !a.startsWith('-') && a !== String(n));
    
    if (stdin) return stdin.split('\n').slice(-n).join('\n') + '\n';
    if (!files.length) return '';
    
    let output = '';
    for (const file of files) {
      try {
        const content = OS.filesystem.readFile(this.resolvePath(file));
        if (files.length > 1) output += `==> ${file} <==\n`;
        output += content.split('\n').slice(-n).join('\n') + '\n';
      } catch {}
    }
    return output;
  }

  cmd_wc(args, stdin) {
    const lines = args.includes('-l');
    const words = args.includes('-w');
    const chars = args.includes('-c') || args.includes('-m');
    const files = args.filter(a => !a.startsWith('-'));
    
    let totalLines = 0, totalWords = 0, totalChars = 0;
    let output = '';
    
    const count = (content, filename) => {
      const l = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
      const w = content.split(/\s+/).filter(Boolean).length;
      const c = content.length;
      totalLines += l; totalWords += w; totalChars += c;
      
      let parts = [];
      if (lines || (!words && !chars)) parts.push(l);
      if (words || (!lines && !chars)) parts.push(w);
      if (chars || (!lines && !words)) parts.push(c);
      if (filename) parts.push(filename);
      output += parts.join('\t') + '\n';
    };
    
    if (stdin) count(stdin, '');
    for (const file of files) {
      try { count(OS.filesystem.readFile(this.resolvePath(file)), file); } catch {}
    }
    if (files.length > 1) output += `${totalLines}\t${totalWords}\t${totalChars}\ttotal\n`;
    return output;
  }

  cmd_ps() {
    const lines = ['PID  TTY      TIME CMD'];
    for (const [pid, job] of this.jobs) {
      lines.push(`${String(pid).padStart(4)} pts/0  00:00:00 ${job.cmd}`);
    }
    return lines.join('\n');
  }

  cmd_kill(args) {
    const signal = args.find(a => a.startsWith('-'))?.slice(1) || 'SIGTERM';
    const pids = args.filter(a => !a.startsWith('-')).map(Number);
    for (const pid of pids) {
      const job = this.jobs.get(pid);
      if (job) {
        this.jobs.delete(pid);
        this.printLine(`[${pid}] Terminated`);
      } else {
        this.printError(`kill: ${pid}: No such process`);
      }
    }
  }

  cmd_jobs() {
    if (!this.jobs.size) return '';
    let output = '';
    for (const [pid, job] of this.jobs) {
      output += `[${pid}] ${job.running ? 'Running' : 'Stopped'}  ${job.cmd}\n`;
    }
    return output;
  }

  cmd_bg(args) {
    // Simplified
  }

  cmd_fg(args) {
    // Simplified
  }

  cmd_clear() {
    this.clearScrollback();
  }

  cmd_history(args) {
    const limit = args[0] ? parseInt(args[0]) : this.history.length;
    return this.history.slice(-limit).map((cmd, i) => `${String(i + this.history.length - limit + 1).padStart(4)}  ${cmd}`).join('\n');
  }

  cmd_alias(args) {
    if (!args.length) {
      return Object.entries(this.aliases).map(([k, v]) => `alias ${k}='${v}'`).join('\n');
    }
    const [name, ...value] = args.join(' ').split('=');
    if (value.length) this.aliases[name] = value.join('=').replace(/^['"]|['"]$/g, '');
    else delete this.aliases[name];
  }

  cmd_unalias(args) {
    for (const name of args) delete this.aliases[name];
  }

  cmd_export(args) {
    for (const arg of args) {
      const [key, value] = arg.split('=');
      if (value !== undefined) this.env[key] = value;
    }
  }

  cmd_env() {
    return Object.entries(this.env).map(([k, v]) => `${k}=${v}`).join('\n');
  }

  cmd_which(args) {
    for (const cmd of args) {
      if (this.builtins[cmd] || this.aliases[cmd]) {
        this.printLine(`${cmd}: shell builtin`);
      } else {
        this.printLine(`${cmd}: not found`);
      }
    }
  }

  cmd_man(args) {
    if (!args.length) { this.printError('What manual page do you want?'); return; }
    const cmd = args[0];
    const manuals = {
      'ls': 'ls - List directory contents\nUsage: ls [OPTIONS] [PATH]\nOptions:\n  -l  Long format\n  -a  Show hidden files\n  -la Long format with hidden',
      'cd': 'cd - Change directory\nUsage: cd [DIRECTORY]\nWithout arguments, changes to HOME.',
      'cat': 'cat - Concatenate and print files\nUsage: cat [FILE]...\nReads from stdin if no files given.',
      'grep': 'grep - Search text patterns\nUsage: grep [OPTIONS] PATTERN [FILE]...\nOptions:\n  -i  Ignore case\n  -n  Show line numbers\n  -v  Invert match',
      'find': 'find - Search for files\nUsage: find [PATH] [OPTIONS]\nOptions:\n  -name PATTERN  Match name\n  -type TYPE     File type (f/d)',
      'help': 'help - Show help\nUsage: help [COMMAND]\nShows this message or command-specific help.',
    };
    const manual = manuals[cmd] || `No manual entry for ${cmd}`;
    this.printRaw(manual);
  }

  cmd_help(args) {
    if (args.length) return this.cmd_man(args);
    const cmds = Object.keys(this.builtins).sort();
    return `Lumina Shell Built-in Commands:\n\n${cmds.map(c => `  ${c}`).join('\n')}\n\nUse 'man <command>' for more information.\nAliases: ${Object.keys(this.aliases).join(', ')}`;
  }

  cmd_date() {
    return new Date().toString();
  }

  cmd_whoami() {
    return this.env.USER;
  }

  cmd_hostname() {
    return 'lumina';
  }

  cmd_uname(args) {
    if (args.includes('-a')) return 'Lumina OS 1.0.0 x86_64';
    return 'Lumina';
  }

  cmd_df() {
    try {
      const used = new Blob([JSON.stringify(OS.filesystem.serialize())]).size;
      const total = 1024 * 1024 * 1024; // 1GB virtual
      return `Filesystem     1K-blocks    Used Available Use% Mounted on\nlumina-fs     ${(total/1024).toFixed(0)} ${(used/1024).toFixed(0)} ${((total-used)/1024).toFixed(0)} ${((used/total)*100).toFixed(1)}% /`;
    } catch { return 'df: error'; }
  }

  cmd_du(args) {
    const path = this.resolvePath(args[0] || this.cwd);
    try {
      const node = OS.filesystem.getNode(path);
      if (node.type === 'file') return `${this.formatSize(node.metadata.size)}\t${path}`;
      let total = 0;
      const calc = (n) => {
        if (n.type === 'file') total += n.metadata.size;
        else n.children?.forEach(calc);
      };
      calc(node);
      return `${this.formatSize(total)}\t${path}`;
    } catch { return 'du: error'; }
  }

  cmd_tree(args) {
    const path = this.resolvePath(args[0] || this.cwd);
    let output = '';
    const walk = (dirPath, prefix = '', isLast = true) => {
      try {
        const items = OS.filesystem.list(dirPath).sort((a,b) => a.name.localeCompare(b.name));
        items.forEach((item, i) => {
          const last = i === items.length - 1;
          const connector = last ? '└── ' : '├── ';
          output += `${prefix}${connector}${item.name}${item.type === 'directory' ? '/' : ''}\n`;
          if (item.type === 'directory') {
            walk(dirPath + '/' + item.name, prefix + (last ? '    ' : '│   '), last);
          }
        });
      } catch {}
    };
    output = path.split('/').pop() + '/\n';
    walk(path);
    return output;
  }

  cmd_edit(args) {
    const path = this.resolvePath(args[0] || '');
    AppRegistry.launch('editor', { path });
    return `Opening editor for ${path}...\n`;
  }

  cmd_calc(args) {
    if (!args.length) { this.printError('Usage: calc <expression>'); return; }
    try {
      // Safe evaluation - only math
      const expr = args.join(' ').replace(/[^0-9+\-*/().% ]/g, '');
      const result = Function('"use strict"; return (' + expr + ')')();
      return String(result);
    } catch { this.printError('Invalid expression'); }
  }

  cmd_color(args) {
    // Demo ANSI colors
    let output = 'Standard colors:\n';
    for (let i = 0; i < 8; i++) {
      output += `\x1b[4${i}m  \x1b[0m `;
    }
    output += '\nBright colors:\n';
    for (let i = 8; i < 16; i++) {
      output += `\x1b[4${i}m  \x1b[0m `;
    }
    output += '\n\n256 colors:\n';
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 16; j++) {
        const code = i * 16 + j;
        output += `\x1b[48;5;${code}m  \x1b[0m`;
      }
      output += '\n';
    }
    return output.replace(/\x1b\[([0-9;]+)m/g, (m, codes) => {
      const bg = codes.split(';').find(c => c.startsWith('48;5;') || (c >= 40 && c <= 47) || (c >= 100 && c <= 107));
      if (bg) {
        const num = bg.startsWith('48;5;') ? parseInt(bg.split(';')[2]) : parseInt(bg);
        let r, g, b;
        if (num < 16) {
          const std = [[0,0,0],[128,0,0],[0,128,0],[128,128,0],[0,0,128],[128,0,128],[0,128,128],[192,192,192],
                       [128,128,128],[255,0,0],[0,255,0],[255,255,0],[0,0,255],[255,0,255],[0,255,255],[255,255,255]];
          [r,g,b] = std[num];
        } else if (num < 232) {
          const c = num - 16;
          r = Math.round(255 * [0, 95, 135, 175, 215, 255][Math.floor(c / 36)]);
          g = Math.round(255 * [0, 95, 135, 175, 215, 255][Math.floor(c / 6) % 6]);
          b = Math.round(255 * [0, 95, 135, 175, 215, 255][c % 6]);
        } else {
          const gray = Math.round(255 * (num - 232) / 23);
          r = g = b = gray;
        }
        return `<span style="display:inline-block;width:12px;height:12px;background:rgb(${r},${g},${b});margin:1px;"></span>`;
      }
      return '';
    });
  }

  cmd_banner(args) {
    if (!args.length) { this.printError('Usage: banner <text>'); return; }
    const text = args.join(' ');
    const font = {
      'A': [' ▄▄▄▄▄ ','█     █','███████','█     █','█     █'],
      'B': ['██████ ','█     █','██████ ','█     █','██████ '],
      'C': [' ▄▄▄▄▄ ','█      ','█      ','█      ',' ▄▄▄▄▄ '],
      'D': ['██████ ','█     █','█     █','█     █','██████ '],
      'E': ['███████','█      ','██████ ','█      ','███████'],
      'L': ['█      ','█      ','█      ','█      ','███████'],
      'O': [' ▄▄▄▄▄ ','█     █','█     █','█     █',' ▄▄▄▄▄ '],
      'S': [' ▄▄▄▄▄ ','█      ',' ▄▄▄▄▄ ','      █',' ▄▄▄▄▄ '],
      'U': ['█     █','█     █','█     █','█     █',' ▄▄▄▄▄ '],
      'M': ['█   █ ','██ ██ ','█ █ █ ','█   █ ','█   █ '],
      'I': ['███████','   █   ','   █   ','   █   ','███████'],
      'N': ['█    █','██   █','█ █  █','█  █ █','█   ██'],
      ' ': ['     ','     ','     ','     ','     '],
    };
    let lines = ['', '', '', '', ''];
    for (const ch of text.toUpperCase()) {
      const char = font[ch] || font[' '];
      for (let i = 0; i < 5; i++) lines[i] += char[i];
    }
    return lines.join('\n');
  }

  cmd_fortune() {
    const fortunes = [
      "The best way to predict the future is to invent it.",
      "Code is like humor. When you have to explain it, it's bad.",
      "First, solve the problem. Then, write the code.",
      "Experience is the name everyone gives to their mistakes.",
      "In order to be irreplaceable, one must always be different.",
      "The only way to learn a new programming language is by writing programs in it.",
      "Talk is cheap. Show me the code.",
      "Programs must be written for people to read, and only incidentally for machines to execute.",
      "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
      "The most disastrous thing that you can ever learn is your first programming language.",
    ];
    return fortunes[Math.floor(Math.random() * fortunes.length)];
  }

  cmd_cowsay(args) {
    const text = args.join(' ') || 'Moo!';
    const cow = `
        \\   ^__^
         \\  (${text.length > 20 ? 'o' : 'o'} ${text.length > 20 ? 'o' : 'o'})_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||
    `;
    const bubble = this.makeBubble(text);
    return bubble + cow;
  }

  makeBubble(text) {
    const lines = text.length > 40 ? this.wrapText(text, 40) : [text];
    const maxLen = Math.max(...lines.map(l => l.length));
    let bubble = ' ' + '_'.repeat(maxLen + 2) + '\n';
    lines.forEach((line, i) => {
      const pad = ' '.repeat(maxLen - line.length);
      if (lines.length === 1) bubble += `< ${line}${pad} >\n`;
      else if (i === 0) bubble += `/ ${line}${pad} \\\n`;
      else if (i === lines.length - 1) bubble += `\\ ${line}${pad} /\n`;
      else bubble += `| ${line}${pad} |\n`;
    });
    bubble += ' ' + '-'.repeat(maxLen + 2) + '\n';
    return bubble;
  }

  wrapText(text, width) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).length > width) {
        lines.push(current);
        current = word;
      } else {
        current += (current ? ' ' : '') + word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  cmd_lolcat(args, stdin) {
    const text = stdin || args.join(' ');
    const colors = ['#ff0000','#ff7f00','#ffff00','#00ff00','#0000ff','#4b0082','#9400d3'];
    return text.split('').map((ch, i) => {
      if (ch === '\n') return ch;
      return `<span style="color:${colors[i % colors.length]}">${this.escapeHtml(ch)}</span>`;
    }).join('');
  }

  cmd_exit() {
    OS.windowManager.close(this.window.id);
  }

  onContextAction(action) {
    if (action === 'copy') {
      const selection = window.getSelection().toString();
      if (selection) navigator.clipboard.writeText(selection);
    } else if (action === 'paste') {
      navigator.clipboard.readText().then(text => this.insertAtCursor(text));
    } else if (action === 'clear') {
      this.cmd_clear();
    } else if (action === 'reset') {
      this.clearScrollback();
      this.printWelcome();
    }
  }

  getState() {
    return { cwd: this.cwd, history: this.history };
  }

  restoreState(state) {
    if (state?.cwd) this.cwd = state.cwd;
    if (state?.history) this.history = state.history;
    this.updatePrompt();
  }

  destroy() {}
}

// Register
AppRegistry.register({
  id: 'terminal',
  name: 'Terminal',
  icon: '<svg viewBox="0 0 24 24"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
  class: TerminalApp,
  width: 900,
  height: 600,
  singleInstance: false,
  keywords: ['shell', 'console', 'cli', 'command line', 'bash'],
});