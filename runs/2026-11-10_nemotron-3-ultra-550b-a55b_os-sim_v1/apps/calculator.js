/* ==========================================================================
   Lumina OS — Calculator App
   Scientific, programmer, and basic modes
   ========================================================================== */

class CalculatorApp {
  constructor(window, options = {}) {
    this.window = window;
    this.mode = 'basic'; // basic, scientific, programmer
    this.expression = '';
    this.result = '0';
    this.history = [];
    this.angleMode = 'deg'; // deg, rad
    this.memory = 0;
    this.lastOperator = null;
    this.lastValue = null;
    this.waitingForOperand = true;
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    const content = this.window.element.querySelector('.window-content');
    content.innerHTML = `
      <div class="calc-app" style="height:100%;display:flex;flex-direction:column;background:#1e1e1e;color:#e2e8f0;">
        <!-- Mode Tabs -->
        <div class="calc-tabs" style="display:flex;background:#252526;border-bottom:1px solid #3c3c3c;">
          <button class="calc-tab active" data-mode="basic" style="flex:1;padding:12px;border:none;background:transparent;color:#e2e8f0;font:inherit;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid #6366f1;">Basic</button>
          <button class="calc-tab" data-mode="scientific" style="flex:1;padding:12px;border:none;background:transparent;color:#8b949e;font:inherit;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;">Scientific</button>
          <button class="calc-tab" data-mode="programmer" style="flex:1;padding:12px;border:none;background:transparent;color:#8b949e;font:inherit;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;">Programmer</button>
        </div>

        <!-- Display -->
        <div class="calc-display" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end;padding:24px;background:#1e1e1e;min-height:160px;overflow:hidden;">
          <div class="calc-history" id="calc-history" style="height:40px;font-size:14px;color:#6a6a6a;text-align:right;margin-bottom:8px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;"></div>
          <div class="calc-expression" id="calc-expression" style="height:32px;font-size:18px;color:#9a9a9a;text-align:right;margin-bottom:4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;"></div>
          <div class="calc-result" id="calc-result" style="font-size:48px;font-weight:300;font-family:var(--font-mono);text-align:right;color:#e2e8f0;line-height:1;">0</div>
        </div>

        <!-- Memory Indicator -->
        <div class="calc-memory" id="calc-memory" style="padding:0 24px 8px;font-size:11px;color:#6366f1;display:none;">M</div>

        <!-- Keypad -->
        <div class="calc-keypad" id="calc-keypad" style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#2d2d2d;padding:1px;">
          ${this.getKeypadHTML()}
        </div>
      </div>
    `;

    this.keypadEl = this.window.element.querySelector('#calc-keypad');
    this.resultEl = this.window.element.querySelector('#calc-result');
    this.exprEl = this.window.element.querySelector('#calc-expression');
    this.historyEl = this.window.element.querySelector('#calc-history');
    this.memoryEl = this.window.element.querySelector('#calc-memory');

    this.bindKeypadEvents();
    this.bindModeEvents();
  }

  getKeypadHTML() {
    const basic = [
      ['MC', 'MR', 'M+', 'M-'],
      ['C', '⌫', '%', '÷'],
      ['7', '8', '9', '×'],
      ['4', '5', '6', '−'],
      ['1', '2', '3', '+'],
      ['±', '0', '.', '='],
    ];

    const scientific = [
      ['mc', 'mr', 'm+', 'm-', 'ms', 'm▼'],
      ['2nd', 'π', 'e', 'C', '⌫', '÷'],
      ['sin', 'cos', 'tan', '×', 'x²', 'xʸ'],
      ['sin⁻¹', 'cos⁻¹', 'tan⁻¹', '−', 'x³', 'y√x'],
      ['log', 'ln', '10ˣ', '+', '√x', 'ˣ√y'],
      ['n!', '(', ')', '=', '±', 'RAD'],
    ];

    const programmer = [
      ['HEX', 'DEC', 'OCT', 'BIN', 'C', '⌫'],
      ['AND', 'OR', 'XOR', 'NOT', '÷', '×'],
      ['Lsh', 'Rsh', 'RoL', 'RoR', '−', '+'],
      ['A', 'B', 'C', 'D', 'E', 'F'],
      ['(', ')', '←', '→', '±', '='],
      ['0', '1', '2', '3', '4', '5'],
    ];

    const keys = this.mode === 'basic' ? basic : this.mode === 'scientific' ? scientific : programmer;
    
    return keys.map(row => row.map(key => this.renderKey(key)).join('')).join('');
  }

  renderKey(key) {
    const styles = this.getKeyStyle(key);
    return `<button class="calc-key${styles.class}" data-key="${key}" style="${styles.style}">${key}</button>`;
  }

  getKeyStyle(key) {
    const operators = ['÷', '×', '−', '+', '=', 'AND', 'OR', 'XOR', 'NOT', 'Lsh', 'Rsh', 'RoL', 'RoR'];
    const functions = ['C', '⌫', '%', '±', 'MC', 'MR', 'M+', 'M-', 'ms', 'm▼', '2nd', 'sin', 'cos', 'tan', 'sin⁻¹', 'cos⁻¹', 'tan⁻¹', 'log', 'ln', '10ˣ', 'n!', 'x²', 'x³', 'xʸ', 'y√x', 'ˣ√y', '√x', 'π', 'e', '(', ')', 'RAD', 'HEX', 'DEC', 'OCT', 'BIN', 'AND', 'OR', 'XOR', 'NOT', 'Lsh', 'Rsh', 'RoL', 'RoR', '←', '→'];
    const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'A', 'B', 'C', 'D', 'E', 'F'];
    
    let bg, color, fontSize = '20px';
    
    if (key === '=') {
      bg = '#6366f1'; color = 'white';
    } else if (operators.includes(key)) {
      bg = '#3a3a3a'; color = '#f0a500';
    } else if (functions.includes(key)) {
      bg = '#333333'; color = '#e2e8f0'; fontSize = '16px';
    } else {
      bg = '#2d2d2d'; color = '#e2e8f0';
    }
    
    const wide = ['0', 'C', '⌫', '='].includes(key) ? 'grid-column:span 2;' : '';
    const tall = false;
    
    return {
      class: '',
      style: `background:${bg};color:${color};font-size:${fontSize};font-weight:500;border:none;cursor:pointer;transition:all 50ms;${wide}${tall ? 'grid-row:span 2;' : ''}`,
    };
  }

  bindKeypadEvents() {
    this.keypadEl.addEventListener('click', (e) => {
      const key = e.target.closest('.calc-key');
      if (key) this.handleKey(key.dataset.key);
    });
  }

  bindModeEvents() {
    this.window.element.querySelectorAll('.calc-tab').forEach(btn => {
      btn.addEventListener('click', () => this.switchMode(btn.dataset.mode));
    });
  }

  switchMode(mode) {
    this.mode = mode;
    this.clearAll();
    this.keypadEl.innerHTML = this.getKeypadHTML();
    this.bindKeypadEvents();
    this.window.element.querySelectorAll('.calc-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
      btn.style.color = btn.dataset.mode === mode ? '#e2e8f0' : '#8b949e';
      btn.style.borderBottomColor = btn.dataset.mode === mode ? '#6366f1' : 'transparent';
    });
  }

  bindEvents() {
    this.window.element.addEventListener('keydown', (e) => this.onKeydown(e));
  }

  onKeydown(e) {
    const keyMap = {
      'Escape': 'C', 'Backspace': '⌫', 'Enter': '=', '=': '=',
      '+': '+', '-': '−', '*': '×', '/': '÷', '%': '%', '.': '.',
      '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
      '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    };
    
    if (keyMap[e.key]) {
      e.preventDefault();
      this.handleKey(keyMap[e.key]);
      this.flashKey(keyMap[e.key]);
    }
  }

  flashKey(key) {
    const btn = this.keypadEl.querySelector(`[data-key="${key}"]`);
    if (btn) {
      btn.style.transform = 'scale(0.95)';
      btn.style.background = '#4a4a4a';
      setTimeout(() => {
        btn.style.transform = '';
        btn.style.background = '';
      }, 100);
    }
  }

  handleKey(key) {
    if (OS.audio) OS.audio.play('click');

    switch (key) {
      case 'C': this.clearAll(); break;
      case '⌫': this.backspace(); break;
      case '±': this.toggleSign(); break;
      case '%': this.percent(); break;
      case '=': this.calculate(); break;
      case 'MC': this.memoryClear(); break;
      case 'MR': this.memoryRecall(); break;
      case 'M+': this.memoryAdd(); break;
      case 'M-': this.memorySubtract(); break;
      case 'ms': this.memoryStore(); break;
      case 'm▼': this.memoryList(); break;
      case 'π': this.inputConstant(Math.PI); break;
      case 'e': this.inputConstant(Math.E); break;
      case 'RAD': this.toggleAngleMode(); break;
      case '2nd': this.toggleSecond(); break;
      case 'sin': this.trig('sin'); break;
      case 'cos': this.trig('cos'); break;
      case 'tan': this.trig('tan'); break;
      case 'sin⁻¹': this.trig('asin'); break;
      case 'cos⁻¹': this.trig('acos'); break;
      case 'tan⁻¹': this.trig('atan'); break;
      case 'log': this.math('log10'); break;
      case 'ln': this.math('log'); break;
      case '10ˣ': this.math('pow10'); break;
      case 'x²': this.math('square'); break;
      case 'x³': this.math('cube'); break;
      case 'xʸ': this.operator('pow'); break;
      case 'y√x': this.operator('root'); break;
      case 'ˣ√y': this.operator('xroot'); break;
      case '√x': this.math('sqrt'); break;
      case 'n!': this.math('factorial'); break;
      case '(': this.inputParen('('); break;
      case ')': this.inputParen(')'); break;
      case 'AND': this.bitwise('and'); break;
      case 'OR': this.bitwise('or'); break;
      case 'XOR': this.bitwise('xor'); break;
      case 'NOT': this.math('not'); break;
      case 'Lsh': this.operator('lshift'); break;
      case 'Rsh': this.operator('rshift'); break;
      case 'RoL': this.bitwise('rol'); break;
      case 'RoR': this.bitwise('ror'); break;
      case '←': this.bitwise('left'); break;
      case '→': this.bitwise('right'); break;
      case 'HEX': this.setBase(16); break;
      case 'DEC': this.setBase(10); break;
      case 'OCT': this.setBase(8); break;
      case 'BIN': this.setBase(2); break;
      case 'A': case 'B': case 'C': case 'D': case 'E': case 'F':
        this.inputHex(key); break;
      case '÷': case '×': case '−': case '+':
        this.operator(key); break;
      default:
        if (/^[0-9.]$/.test(key)) this.inputDigit(key);
    }
    this.updateDisplay();
  }

  // Basic operations
  inputDigit(digit) {
    if (this.waitingForOperand) {
      this.result = digit === '.' ? '0.' : digit;
      this.waitingForOperand = false;
    } else {
      if (digit === '.' && this.result.includes('.')) return;
      this.result = this.result === '0' ? digit : this.result + digit;
    }
  }

  inputHex(digit) {
    if (this.mode !== 'programmer') return;
    this.inputDigit(digit);
  }

  inputDigit(digit) {
    if (this.waitingForOperand) {
      this.result = digit === '.' ? '0.' : digit;
      this.waitingForOperand = false;
    } else {
      if (digit === '.' && this.result.includes('.')) return;
      if (this.result === '0' && digit !== '.') this.result = digit;
      else this.result += digit;
    }
  }

  operator(op) {
    if (this.lastOperator && !this.waitingForOperand) {
      this.calculate();
    }
    this.lastValue = this.parseNumber(this.result);
    this.lastOperator = op;
    this.waitingForOperand = true;
    this.expression = this.formatNumber(this.lastValue) + ' ' + this.getOpSymbol(op) + ' ';
    this.updateDisplay();
  }

  getOpSymbol(op) {
    const map = { '÷': '÷', '×': '×', '−': '−', '+': '+', 'pow': '^', 'root': '√', 'xroot': '√', 'lshift': '<<', 'rshift': '>>' };
    return map[op] || op;
  }

  calculate() {
    if (!this.lastOperator || this.waitingForOperand) return;
    
    const current = this.parseNumber(this.result);
    let result;
    
    try {
      switch (this.lastOperator) {
        case '÷': result = this.lastValue / current; break;
        case '×': result = this.lastValue * current; break;
        case '−': result = this.lastValue - current; break;
        case '+': result = this.lastValue + current; break;
        case 'pow': result = Math.pow(this.lastValue, current); break;
        case 'root': result = Math.pow(this.lastValue, 1/current); break;
        case 'xroot': result = Math.pow(current, 1/this.lastValue); break;
        case 'lshift': result = Math.floor(this.lastValue) << Math.floor(current); break;
        case 'rshift': result = Math.floor(this.lastValue) >> Math.floor(current); break;
        case 'and': result = Math.floor(this.lastValue) & Math.floor(current); break;
        case 'or': result = Math.floor(this.lastValue) | Math.floor(current); break;
        case 'xor': result = Math.floor(this.lastValue) ^ Math.floor(current); break;
        default: return;
      }
      
      this.addToHistory(`${this.formatNumber(this.lastValue)} ${this.getOpSymbol(this.lastOperator)} ${this.formatNumber(current)} = ${this.formatNumber(result)}`);
      this.result = this.formatNumber(result);
      this.lastOperator = null;
      this.lastValue = null;
      this.waitingForOperand = true;
    } catch (e) {
      this.result = 'Error';
      this.waitingForOperand = true;
    }
  }

  // Functions
  trig(func) {
    const val = this.parseNumber(this.result);
    let result;
    const isDeg = this.angleMode === 'deg';
    const deg = isDeg ? Math.PI / 180 : 1;
    
    switch (func) {
      case 'sin': result = Math.sin(val * deg); break;
      case 'cos': result = Math.cos(val * deg); break;
      case 'tan': result = Math.tan(val * deg); break;
      case 'asin': result = (isDeg ? 180/Math.PI : 1) * Math.asin(val); break;
      case 'acos': result = (isDeg ? 180/Math.PI : 1) * Math.acos(val); break;
      case 'atan': result = (isDeg ? 180/Math.PI : 1) * Math.atan(val); break;
    }
    
    if (result !== undefined) {
      this.addToHistory(`${func}(${this.formatNumber(val)}) = ${this.formatNumber(result)}`);
      this.result = this.formatNumber(result);
      this.waitingForOperand = true;
    }
  }

  math(func) {
    const val = this.parseNumber(this.result);
    let result;
    
    switch (func) {
      case 'sqrt': result = Math.sqrt(val); break;
      case 'square': result = val * val; break;
      case 'cube': result = val * val * val; break;
      case 'pow10': result = Math.pow(10, val); break;
      case 'log10': result = Math.log10(val); break;
      case 'log': result = Math.log(val); break;
      case 'factorial': result = this.factorial(Math.floor(val)); break;
      case 'not': result = ~Math.floor(val); break;
    }
    
    if (result !== undefined) {
      this.addToHistory(`${func}(${this.formatNumber(val)}) = ${this.formatNumber(result)}`);
      this.result = this.formatNumber(result);
      this.waitingForOperand = true;
    }
  }

  factorial(n) {
    if (n < 0) return NaN;
    if (n > 170) return Infinity;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  inputConstant(val) {
    this.result = this.formatNumber(val);
    this.waitingForOperand = true;
  }

  inputParen(paren) {
    // Simplified - just add to expression
    this.expression += paren;
  }

  percent() {
    const val = this.parseNumber(this.result);
    this.result = this.formatNumber(val / 100);
    this.waitingForOperand = true;
  }

  toggleSign() {
    if (this.result !== '0' && this.result !== 'Error') {
      if (this.result.startsWith('-')) this.result = this.result.slice(1);
      else this.result = '-' + this.result;
    }
  }

  backspace() {
    if (this.waitingForOperand || this.result === 'Error') return;
    if (this.result.length <= 1 || (this.result.length === 2 && this.result.startsWith('-'))) {
      this.result = '0';
    } else {
      this.result = this.result.slice(0, -1);
    }
  }

  clearAll() {
    this.result = '0';
    this.expression = '';
    this.lastOperator = null;
    this.lastValue = null;
    this.waitingForOperand = true;
  }

  // Memory
  memoryClear() { this.memory = 0; this.updateMemoryIndicator(); }
  memoryRecall() { this.result = this.formatNumber(this.memory); this.waitingForOperand = true; }
  memoryAdd() { this.memory += this.parseNumber(this.result); this.updateMemoryIndicator(); }
  memorySubtract() { this.memory -= this.parseNumber(this.result); this.updateMemoryIndicator(); }
  memoryStore() { this.memory = this.parseNumber(this.result); this.updateMemoryIndicator(); }
  memoryList() { OS.notifications.show('Calculator', `Memory: ${this.formatNumber(this.memory)}`); }
  updateMemoryIndicator() { this.memoryEl.style.display = this.memory !== 0 ? 'block' : 'none'; }

  // Bitwise
  bitwise(op) {
    const val = Math.floor(this.parseNumber(this.result));
    let result;
    switch (op) {
      case 'and': this.operator('and'); return;
      case 'or': this.operator('or'); return;
      case 'xor': this.operator('xor'); return;
      case 'not': result = ~val; break;
      case 'rol': result = (val << 1) | (val >> 31); break;
      case 'ror': result = (val >> 1) | (val << 31); break;
      case 'left': result = val << 1; break;
      case 'right': result = val >> 1; break;
    }
    if (result !== undefined) {
      this.result = this.formatNumber(result >>> 0);
      this.waitingForOperand = true;
    }
  }

  setBase(base) {
    // Simplified
    OS.notifications.show('Calculator', `Base-${base} mode`);
  }

  toggleAngleMode() {
    this.angleMode = this.angleMode === 'deg' ? 'rad' : 'deg';
    this.window.element.querySelector('[data-key="RAD"]').textContent = this.angleMode.toUpperCase();
  }

  toggleSecond() {
    // Would toggle sin/cos/tan to asin/acos/atan
    OS.notifications.show('Calculator', '2nd function toggle');
  }

  // Helpers
  parseNumber(str) {
    if (this.mode === 'programmer') return parseInt(str, 16) || 0;
    return parseFloat(str) || 0;
  }

  formatNumber(num) {
    if (!isFinite(num)) return 'Error';
    if (this.mode === 'programmer') return (num >>> 0).toString(16).toUpperCase();
    if (Math.abs(num) >= 1e10 || (Math.abs(num) < 1e-6 && num !== 0)) return num.toExponential(6);
    return Number(num.toPrecision(12)).toString();
  }

  addToHistory(str) {
    this.history.unshift(str);
    if (this.history.length > 50) this.history.pop();
    this.historyEl.textContent = this.history[0] || '';
  }

  updateDisplay() {
    this.resultEl.textContent = this.result || '0';
    this.exprEl.textContent = this.expression || '';
  }

  escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => {
      const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": '\'' };
      return map[c];
    });
  }

  getState() {
    return { mode: this.mode, memory: this.memory, history: this.history, angleMode: this.angleMode };
  }

  restoreState(state) {
    if (!state) return;
    this.mode = state.mode || 'basic';
    this.memory = state.memory || 0;
    this.history = state.history || [];
    this.angleMode = state.angleMode || 'deg';
    this.updateMemoryIndicator();
    this.historyEl.textContent = this.history[0] || '';
    this.switchMode(this.mode);
  }

  destroy() {}
}

// Register
AppRegistry.register({
  id: 'calculator',
  name: 'Calculator',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  class: CalculatorApp,
  width: 360,
  height: 520,
  singleInstance: true,
  keywords: ['calc', 'math', 'scientific', 'programmer'],
});