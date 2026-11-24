/**
 * OFFSET — Design Engineering Journal
 * Main application module. Initializes all interactive figures.
 * No external dependencies. Vanilla ES modules.
 */

// ============================================================================
// Reactive Signal Primitive (~300 bytes)
// ============================================================================

function signal(initial) {
    let value = initial;
    const subscribers = new Set();

    const s = {
        get value() { return value; },
        set value(v) {
            if (Object.is(value, v)) return;
            value = v;
            subscribers.forEach(fn => fn(value));
        },
        subscribe(fn) {
            subscribers.add(fn);
            return () => subscribers.delete(fn);
        }
    };
    return s;
}

function computed(fn) {
    const s = signal(fn());
    const unsub = signal(0).subscribe(() => {
        s.value = fn();
    });
    // Trigger initial computation
    unsub();
    return s;
}

function effect(fn) {
    let cleanup;
    const s = signal(0);
    const unsub = s.subscribe(() => {
        if (cleanup) cleanup();
        cleanup = fn();
    });
    unsub();
    return () => { if (cleanup) cleanup(); };
}

// ============================================================================
// Canvas Helper
// ============================================================================

function setupCanvas(canvas) {
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
    };
    resize();
    window.addEventListener('resize', resize);
    return { ctx, resize, get width() { return canvas.width / (window.devicePixelRatio || 1); }, get height() { return canvas.height / (window.devicePixelRatio || 1); } };
}

function clear(ctx, w, h, color = 'transparent') {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
    } else {
        ctx.clearRect(0, 0, w, h);
    }
    ctx.restore();
}

// ============================================================================
// Figure 1: Whitespace — Force-Directed Layout
// ============================================================================

function initWhitespaceFigure(canvas) {
    const { ctx, width, height } = setupCanvas(canvas);
    const blocks = [];
    const blockCount = 8;
    const minGap = 16;
    const repulsionStrength = 8000;
    const damping = 0.85;
    const springStrength = 0.15;
    const targetPositions = [];

    // Initialize blocks
    for (let i = 0; i < blockCount; i++) {
        const w = 60 + Math.random() * 100;
        const h = 30 + Math.random() * 50;
        blocks.push({
            x: 0, y: 0,
            vx: 0, vy: 0,
            w, h,
            targetX: 0, targetY: 0,
            dragging: false,
            dragOffsetX: 0, dragOffsetY: 0
        });
    }

    function computeTargets() {
        const containerW = width;
        const containerH = height;
        const padding = 24;
        const availableW = containerW - padding * 2;
        const availableH = containerH - padding * 2;

        // Flow layout: arrange in rows
        let x = padding;
        let y = padding;
        let rowHeight = 0;

        blocks.forEach((block, i) => {
            if (x + block.w > containerW - padding && i > 0) {
                x = padding;
                y += rowHeight + minGap;
                rowHeight = 0;
            }
            block.targetX = x;
            block.targetY = y;
            x += block.w + minGap;
            rowHeight = Math.max(rowHeight, block.h);
        });

        // Center vertically
        const totalH = blocks.reduce((max, b) => Math.max(max, b.targetY + b.h), 0) - padding;
        const offsetY = (containerH - totalH) / 2;
        blocks.forEach(b => b.targetY += offsetY);
    }

    function applyForces() {
        // Repulsion between blocks
        for (let i = 0; i < blocks.length; i++) {
            const a = blocks[i];
            if (a.dragging) continue;

            for (let j = i + 1; j < blocks.length; j++) {
                const b = blocks[j];
                if (b.dragging) continue;

                const dx = (b.x + b.w/2) - (a.x + a.w/2);
                const dy = (b.y + b.h/2) - (a.y + a.h/2);
                const dist = Math.sqrt(dx*dx + dy*dy) || 0.001;
                const minDist = (a.w + b.w)/2 + minGap;

                if (dist < minDist * 2) {
                    const force = repulsionStrength * (1 - dist / (minDist * 2)) / (dist * dist);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    a.vx -= fx; a.vy -= fy;
                    b.vx += fx; b.vy += fy;
                }
            }
        }

        // Spring to target positions
        blocks.forEach(b => {
            if (b.dragging) return;
            const dx = b.targetX - b.x;
            const dy = b.targetY - b.y;
            b.vx += dx * springStrength;
            b.vy += dy * springStrength;
        });

        // Damping and integration
        blocks.forEach(b => {
            if (b.dragging) return;
            b.vx *= damping;
            b.vy *= damping;
            b.x += b.vx;
            b.y += b.vy;
        });
    }

    function render() {
        clear(ctx, width, height);
        ctx.fillStyle = '#1a1a1a';

        blocks.forEach(b => {
            ctx.fillRect(Math.round(b.x), Math.round(b.y), Math.round(b.w), Math.round(b.h));
        });

        // Draw gap indicators
        ctx.strokeStyle = '#737373';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        for (let i = 0; i < blocks.length; i++) {
            for (let j = i + 1; j < blocks.length; j++) {
                const a = blocks[i], b = blocks[j];
                const cx1 = a.x + a.w/2, cy1 = a.y + a.h/2;
                const cx2 = b.x + b.w/2, cy2 = b.y + b.h/2;
                const dx = cx2 - cx1, dy = cy2 - cy1;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const minDist = (a.w + b.w)/2 + minGap;

                if (dist < minDist * 1.5 && dist > 1) {
                    ctx.beginPath();
                    ctx.moveTo(cx1, cy1);
                    ctx.lineTo(cx2, cy2);
                    ctx.stroke();
                }
            }
        }
        ctx.setLineDash([]);
    }

    function animate() {
        applyForces();
        render();
        requestAnimationFrame(animate);
    }

    // Interaction
    function getBlockAt(x, y) {
        for (let i = blocks.length - 1; i >= 0; i--) {
            const b = blocks[i];
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
                return b;
            }
        }
        return null;
    }

    let draggedBlock = null;

    canvas.addEventListener('pointerdown', e => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const block = getBlockAt(x, y);
        if (block) {
            block.dragging = true;
            block.dragOffsetX = x - block.x;
            block.dragOffsetY = y - block.y;
            draggedBlock = block;
            canvas.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('pointermove', e => {
        if (!draggedBlock) return;
        const rect = canvas.getBoundingClientRect();
        draggedBlock.x = e.clientX - rect.left - draggedBlock.dragOffsetX;
        draggedBlock.y = e.clientY - rect.top - draggedBlock.dragOffsetY;
        draggedBlock.targetX = draggedBlock.x;
        draggedBlock.targetY = draggedBlock.y;
    });

    window.addEventListener('pointerup', () => {
        if (draggedBlock) {
            draggedBlock.dragging = false;
            draggedBlock = null;
            canvas.style.cursor = '';
        }
    });

    canvas.addEventListener('pointerleave', () => {
        if (draggedBlock) {
            draggedBlock.dragging = false;
            draggedBlock = null;
            canvas.style.cursor = '';
        }
    });

    canvas.style.cursor = 'grab';

    computeTargets();
    blocks.forEach(b => { b.x = b.targetX; b.y = b.targetY; });
    animate();
}

// ============================================================================
// Figure 2: Motion — Phi Phenomenon Demonstrations
// ============================================================================

function initMotionFigure(canvas) {
    const { ctx, width, height } = setupCanvas(canvas);
    const techniques = ['phi', 'beta', 'color-phi'];
    let currentTechnique = 0;
    let frame = 0;
    let lastTime = 0;
    const fps = 30;
    const frameInterval = 1000 / fps;

    const objects = {
        phi: { x: 0, targets: [0.2, 0.8] },
        beta: { state: 0, states: ['●', '■', '▲', '◆'] },
        colorPhi: { hue: 0 }
    };

    function renderPhi() {
        clear(ctx, width, height);
        const y = height / 2;
        const radius = Math.min(width, height) * 0.08;

        // Two positions alternating
        const pos = objects.phi.targets[frame % 2];
        const x = width * pos;

        // Draw trail for persistence visualization
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    function renderBeta() {
        clear(ctx, width, height);
        const centerX = width / 2;
        const centerY = height / 2;
        const size = Math.min(width, height) * 0.15;

        const state = objects.beta.states[objects.beta.state];
        ctx.font = `${size}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText(state, centerX, centerY);
    }

    function renderColorPhi() {
        clear(ctx, width, height);
        const y = height / 2;
        const radius = Math.min(width, height) * 0.1;
        const positions = [width * 0.3, width * 0.7];

        // Alternate between two greys
        const grey1 = frame % 2 === 0 ? '#2d2d2d' : '#737373';
        const grey2 = frame % 2 === 0 ? '#737373' : '#2d2d2d';

        ctx.fillStyle = grey1;
        ctx.beginPath();
        ctx.arc(positions[0], y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = grey2;
        ctx.beginPath();
        ctx.arc(positions[1], y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    const renderers = { phi: renderPhi, beta: renderBeta, 'color-phi': renderColorPhi };

    function animate(time) {
        if (time - lastTime >= frameInterval) {
            frame++;
            lastTime = time;

            // Update technique-specific state
            if (techniques[currentTechnique] === 'beta' && frame % 8 === 0) {
                objects.beta.state = (objects.beta.state + 1) % objects.beta.states.length;
            }
        }
        renderers[techniques[currentTechnique]]();
        requestAnimationFrame(animate);
    }

    // Click to cycle techniques
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', () => {
        currentTechnique = (currentTechnique + 1) % techniques.length;
        frame = 0;
        objects.beta.state = 0;
    });

    // Keyboard support
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('role', 'button');
    canvas.setAttribute('aria-label', 'Click to cycle motion techniques');
    canvas.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            currentTechnique = (currentTechnique + 1) % techniques.length;
            frame = 0;
            objects.beta.state = 0;
        }
    });

    animate(0);
}

// ============================================================================
// Figure 3: Systems — Reactive Token Engine
// ============================================================================

function initSystemsFigure(canvas) {
    const { ctx, width, height } = setupCanvas(canvas);

    // Primitive tokens (reactive)
    const primitives = {
        baseScale: signal(1.125),
        baseSpace: signal(4),
        contrast: signal(0.85),
        radiusFactor: signal(0.25)
    };

    // Derived tokens
    const tokens = {
        space: (step) => computed(() => primitives.baseSpace.value * Math.pow(primitives.baseScale.value, step)),
        typeSize: (step) => computed(() => 16 * Math.pow(primitives.baseScale.value, step)),
        radius: (sizeSignal) => computed(() => sizeSignal.value * primitives.radiusFactor.value),
        textColor: (bgSignal) => computed(() => bgSignal.value > 0.5 ? 0.1 : 0.95)
    };

    // UI State
    const sliderValues = {
        baseScale: signal(1.125),
        baseSpace: signal(4),
        contrast: signal(0.85),
        radiusFactor: signal(0.25)
    };

    // Sync primitives with sliders
    Object.keys(primitives).forEach(key => {
        sliderValues[key].subscribe(v => primitives[key].value = v);
    });

    // Generate token display data
    function getTokenDisplay() {
        const spaceSteps = [-2, -1, 0, 1, 2, 3, 4, 5];
        const typeSteps = [-2, -1, 0, 1, 2, 3, 4];
        const radiusSizes = [8, 12, 16, 24, 32, 48];
        const bgValues = [0.05, 0.15, 0.3, 0.5, 0.7, 0.85, 0.95];

        return {
            space: spaceSteps.map(s => ({ step: s, value: tokens.space(s).value })),
            type: typeSteps.map(s => ({ step: s, value: tokens.typeSize(s).value })),
            radius: radiusSizes.map(s => ({ size: s, value: tokens.radius(signal(s)).value })),
            contrast: bgValues.map(bg => ({ bg, color: tokens.textColor(signal(bg)).value }))
        };
    }

    // Render
    function render() {
        clear(ctx, width, height, '#fafafa');
        const data = getTokenDisplay();
        const padding = 24;
        const colWidth = (width - padding * 3) / 2;
        const rowHeight = 40;

        ctx.font = '11px ui-monospace, monospace';
        ctx.textBaseline = 'middle';

        // Column 1: Space & Type
        let x = padding;
        let y = padding;

        // Space tokens
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText('SPACE TOKENS', x, y);
        y += 20;

        data.space.forEach(t => {
            const barWidth = Math.min(t.value, colWidth - 80);
            ctx.fillStyle = '#e5e5e5';
            ctx.fillRect(x + 70, y + 2, colWidth - 80, 12);
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + 70, y + 2, barWidth, 12);
            ctx.fillStyle = '#404040';
            ctx.fillText(`space[${t.step >= 0 ? '+' : ''}${t.step}]`, x, y + 8);
            ctx.fillText(`${t.value.toFixed(1)}px`, x + colWidth - 45, y + 8);
            y += rowHeight;
        });

        y += 16;
        // Type tokens
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText('TYPE TOKENS', x, y);
        y += 20;

        data.type.forEach(t => {
            const fontSize = Math.min(Math.max(t.value, 10), 24);
            ctx.font = `${fontSize}px ui-serif, serif`;
            ctx.fillStyle = '#1a1a1a';
            ctx.fillText('Aa', x, y + fontSize/2);
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillStyle = '#404040';
            ctx.fillText(`type[${t.step >= 0 ? '+' : ''}${t.step}]`, x + 35, y + 8);
            ctx.fillText(`${t.value.toFixed(1)}px`, x + colWidth - 45, y + 8);
            y += rowHeight;
        });

        // Column 2: Radius & Contrast
        x = padding * 2 + colWidth;
        y = padding;

        ctx.fillStyle = '#1a1a1a';
        ctx.fillText('RADIUS TOKENS', x, y);
        y += 20;

        data.radius.forEach(t => {
            const r = t.value;
            ctx.fillStyle = '#e5e5e5';
            ctx.beginPath();
            ctx.roundRect(x + 70, y + 2, 40, 12, r);
            ctx.fill();
            ctx.strokeStyle = '#1a1a1a';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#404040';
            ctx.fillText(`radius(${t.size})`, x, y + 8);
            ctx.fillText(`${r.toFixed(1)}px`, x + colWidth - 45, y + 8);
            y += rowHeight;
        });

        y += 16;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillText('CONTRAST TOKENS', x, y);
        y += 20;

        data.contrast.forEach(t => {
            const bgGrey = Math.round(t.bg * 255);
            const textGrey = Math.round(t.color * 255);
            ctx.fillStyle = `rgb(${bgGrey}, ${bgGrey}, ${bgGrey})`;
            ctx.fillRect(x + 70, y + 2, 40, 12);
            ctx.fillStyle = `rgb(${textGrey}, ${textGrey}, ${textGrey})`;
            ctx.font = '10px ui-sans-serif, sans-serif';
            ctx.fillText('Text', x + 74, y + 9);
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillStyle = '#404040';
            ctx.fillText(`on ${(t.bg*100).toFixed(0)}%`, x, y + 8);
            ctx.fillText(`${(t.color*100).toFixed(0)}%`, x + colWidth - 45, y + 8);
            y += rowHeight;
        });
    }

    // Create slider UI overlay
    function createSliders() {
        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            pointer-events: none; display: flex; flex-direction: column;
            padding: 12px; gap: 8px; font: 11px ui-sans-serif, sans-serif;
        `;

        const params = [
            { key: 'baseScale', label: 'Base Scale', min: 1.05, max: 1.5, step: 0.01 },
            { key: 'baseSpace', label: 'Base Space (px)', min: 2, max: 8, step: 1 },
            { key: 'contrast', label: 'Contrast Threshold', min: 0.3, max: 0.9, step: 0.05 },
            { key: 'radiusFactor', label: 'Radius Factor', min: 0, max: 0.5, step: 0.01 }
        ];

        params.forEach(p => {
            const row = document.createElement('div');
            row.style.cssText = 'pointer-events: auto; display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.9); padding: 6px 10px; border-radius: 4px; border: 1px solid #e5e5e5; backdrop-filter: blur(4px);';
            row.innerHTML = `
                <label style="min-width: 130px; color: #404040;">${p.label}</label>
                <input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${sliderValues[p.key].value}" style="flex: 1;">
                <output style="min-width: 45px; text-align: right; color: #1a1a1a; font-family: ui-monospace, monospace;">${sliderValues[p.key].value}</output>
            `;
            const input = row.querySelector('input');
            const output = row.querySelector('output');
            input.addEventListener('input', () => {
                const val = parseFloat(input.value);
                sliderValues[p.key].value = val;
                output.value = val;
            });
            container.appendChild(row);
        });

        canvas.parentElement.style.position = 'relative';
        canvas.parentElement.appendChild(container);

        // Subscribe to re-render
        Object.values(sliderValues).forEach(s => s.subscribe(render));
    }

    createSliders();
    render();
}

// ============================================================================
// Figure 4: Constraint — Luminance Structure Analysis
// ============================================================================

function initConstraintFigure(canvas) {
    const { ctx, width, height } = setupCanvas(canvas);

    // Analyze the actual page structure
    function analyzePageStructure() {
        const elements = [];
        const essays = document.querySelectorAll('.essay');

        essays.forEach((essay, essayIndex) => {
            const rect = essay.getBoundingClientRect();
            const title = essay.querySelector('.essay-title');
            const body = essay.querySelector('.essay-body');
            const pullquote = essay.querySelector('.essay-pullquote');

            if (title) {
                const tr = title.getBoundingClientRect();
                elements.push({
                    type: 'title',
                    essay: essayIndex,
                    y: tr.top + tr.height/2 - window.scrollY,
                    weight: 600,
                    size: parseFloat(getComputedStyle(title).fontSize),
                    text: title.textContent.slice(0, 30)
                });
            }
            if (body) {
                const paragraphs = body.querySelectorAll('p');
                paragraphs.forEach((p, i) => {
                    const pr = p.getBoundingClientRect();
                    elements.push({
                        type: 'body',
                        essay: essayIndex,
                        y: pr.top + pr.height/2 - window.scrollY,
                        weight: 400,
                        size: parseFloat(getComputedStyle(p).fontSize),
                        text: p.textContent.slice(0, 40)
                    });
                });
            }
            if (pullquote) {
                const qr = pullquote.getBoundingClientRect();
                elements.push({
                    type: 'pullquote',
                    essay: essayIndex,
                    y: qr.top + qr.height/2 - window.scrollY,
                    weight: 500,
                    size: parseFloat(getComputedStyle(pullquote).fontSize),
                    text: pullquote.textContent.slice(0, 30)
                });
            }
        });

        // Hero
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
            const hr = heroTitle.getBoundingClientRect();
            elements.push({
                type: 'hero',
                essay: -1,
                y: hr.top + hr.height/2 - window.scrollY,
                weight: 600,
                size: parseFloat(getComputedStyle(heroTitle).fontSize),
                text: 'Hero Title'
            });
        }

        return elements;
    }

    let structureData = [];
    let lastAnalysis = 0;

    function render() {
        clear(ctx, width, height);

        // Re-analyze periodically
        const now = performance.now();
        if (now - lastAnalysis > 2000) {
            structureData = analyzePageStructure();
            lastAnalysis = now;
        }

        if (structureData.length === 0) return;

        const pageHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollY = window.scrollY;

        // Draw page map background
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);

        // Viewport indicator
        const vpTop = (scrollY / pageHeight) * height;
        const vpH = (viewportHeight / pageHeight) * height;
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(0, vpTop, width, vpH);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, vpTop, width, vpH);

        // Draw element bands
        const bandWidth = width * 0.8;
        const bandLeft = width * 0.1;

        structureData.forEach(el => {
            const y = (el.y / pageHeight) * height;
            const bandHeight = Math.max(2, Math.min(8, el.size * el.weight / 400 * 4));

            // Luminance based on weight
            const luminance = 1 - (el.weight - 400) / 500;
            const grey = Math.round(20 + luminance * 200);
            ctx.fillStyle = `rgb(${grey}, ${grey}, ${grey})`;

            ctx.fillRect(bandLeft, y - bandHeight/2, bandWidth, bandHeight);
        });

        // Draw rhythm lines (baseline grid)
        ctx.strokeStyle = 'rgba(0,0,0,0.03)';
        ctx.lineWidth = 0.5;
        const baseLineHeight = 24; // CSS line-height equivalent
        for (let y = 0; y < height; y += (baseLineHeight / pageHeight) * height) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    function animate() {
        render();
        requestAnimationFrame(animate);
    }

    // Initial analysis
    structureData = analyzePageStructure();
    animate();
}

// ============================================================================
// Figure 0: Hero Canvas — Wave Field
// ============================================================================

function initHeroCanvas(canvas) {
    const { ctx, width, height } = setupCanvas(canvas);

    const waves = [];
    const waveCount = 6;

    for (let i = 0; i < waveCount; i++) {
        waves.push({
            amplitude: 15 + Math.random() * 25,
            frequency: 0.003 + Math.random() * 0.005,
            phase: Math.random() * Math.PI * 2,
            speed: 0.0005 + Math.random() * 0.001,
            offset: (i / waveCount) * height,
            opacity: 0.03 + Math.random() * 0.05
        });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        targetMouseX = e.clientX - rect.left;
        targetMouseY = e.clientY - rect.top;
    });

    function render() {
        clear(ctx, width, height);

        // Smooth mouse follow
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        ctx.lineWidth = 1;
        ctx.lineCap = 'round';

        waves.forEach((wave, i) => {
            wave.phase += wave.speed;

            ctx.beginPath();
            ctx.strokeStyle = `rgba(0,0,0,${wave.opacity})`;

            const steps = 80;
            for (let s = 0; s <= steps; s++) {
                const x = (s / steps) * width;
                const progress = s / steps;

                // Base wave
                let y = wave.offset + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;

                // Mouse influence
                const dx = x - mouseX;
                const dy = y - mouseY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < 300) {
                    const influence = (1 - dist / 300) * 40 * (i / waveCount + 0.5);
                    y += Math.sin(wave.phase * 2 + dist * 0.05) * influence;
                }

                if (s === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });
    }

    function animate() {
        render();
        requestAnimationFrame(animate);
    }

    animate();
}

// ============================================================================
// Navigation & Scroll Observers
// ============================================================================

function initNavigation() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');

    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', !expanded);
            menu.classList.toggle('is-open');
        });

        // Close on link click
        menu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                toggle.setAttribute('aria-expanded', 'false');
                menu.classList.remove('is-open');
            });
        });

        // Close on escape
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && menu.classList.contains('is-open')) {
                toggle.setAttribute('aria-expanded', 'false');
                menu.classList.remove('is-open');
                toggle.focus();
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const headerHeight = document.querySelector('.site-header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });
}

// ============================================================================
// Intersection Observer for Figure Initialization
// ============================================================================

function initFigures() {
    const figureConfigs = [
        { selector: '#hero-canvas', init: initHeroCanvas, once: true },
        { selector: '[data-figure="whitespace"]', init: initWhitespaceFigure },
        { selector: '[data-figure="motion"]', init: initMotionFigure },
        { selector: '[data-figure="systems"]', init: initSystemsFigure },
        { selector: '[data-figure="constraint"]', init: initConstraintFigure }
    ];

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const canvas = entry.target;
                const config = figureConfigs.find(c => canvas.matches(c.selector));
                if (config && !canvas.dataset.initialized) {
                    config.init(canvas);
                    canvas.dataset.initialized = 'true';
                    if (config.once) observer.unobserve(canvas);
                }
            }
        });
    }, { rootMargin: '100px', threshold: 0.1 });

    figureConfigs.forEach(config => {
        document.querySelectorAll(config.selector).forEach(canvas => {
            observer.observe(canvas);
        });
    });
}

// ============================================================================
// Initialize App
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFigures();

    // Announce dynamic content for screen readers
    const announce = (message) => {
        const region = document.createElement('div');
        region.setAttribute('role', 'status');
        region.setAttribute('aria-live', 'polite');
        region.style.position = 'absolute';
        region.style.left = '-9999px';
        region.textContent = message;
        document.body.appendChild(region);
        setTimeout(() => region.remove(), 1000);
    };

    // Keyboard shortcuts hint
    document.addEventListener('keydown', e => {
        if (e.key === '?' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            announce('Keyboard shortcuts: Tab to navigate, Enter/Space to activate figures, Escape to close menu');
        }
    });
});

// Handle prefers-reduced-motion changes
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
motionQuery.addEventListener('change', e => {
    if (e.matches) {
        document.documentElement.classList.add('reduced-motion');
    } else {
        document.documentElement.classList.remove('reduced-motion');
    }
});