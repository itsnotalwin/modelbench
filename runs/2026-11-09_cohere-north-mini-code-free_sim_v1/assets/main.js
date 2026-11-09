// Simulation parameters and state
const SIMULATION_PARAMS = {
    // Time parameters
    timeStep: 0.1,
    maxTime: 1000,
    currentTime: 0,
    
    // Temperature diffusion parameters
    diffusionRate: 0.01,
    conductivity: 1.0,
    capacity: 1.0,
    
    // System dimensions
    gridSize: 20,
    spatialStep: 1.0,
    
    // Boundary conditions
    leftBoundaryTemp: 100,
    rightBoundaryTemp: 50,
    topBoundaryTemp: 60,
    bottomBoundaryTemp: 40,
    
    // Initial conditions
    initialTemp: 20,
    
    // Scenarios
    scenarios: {
        rapid_equilibration: {
            diffusionRate: 0.05,
            conductivity: 2.0,
            capacity: 1.0,
            leftBoundaryTemp: 120,
            rightBoundaryTemp: 30,
            spatialStep: 2.0
        },
        slow_diffusion: {
            diffusionRate: 0.001,
            conductivity: 0.5,
            capacity: 1.0,
            leftBoundaryTemp: 90,
            rightBoundaryTemp: 55,
            spatialStep: 1.0
        },
        oscillatory: {
            diffusionRate: 0.01,
            conductivity: 1.5,
            capacity: 2.0,
            leftBoundaryTemp: 100 + 30 * Math.sin(Date.now() / 5000),
            rightBoundaryTemp: 50 - 20 * Math.sin(Date.now() / 7000),
            topBoundaryTemp: 60 + 20 * Math.sin(Date.now() / 9000),
            bottomBoundaryTemp: 40 - 10 * Math.sin(Date.now() / 11000),
            spatialStep: 1.5
        }
    }
};

class TemperatureDiffusionSystem {
    constructor(params) {
        this.params = { ...params };
        this.reset();
        this.history = [];
        this.maxHistoryPoints = 1000;
        this.snapshotInterval = 50;
        this.snapshotCount = 0;
    }
    
    reset() {
        const { gridSize, initialTemp, leftBoundaryTemp, rightBoundaryTemp, 
                topBoundaryTemp, bottomBoundaryTemp } = this.params;
        
        this.temperature = Array(gridSize).fill().map(() => 
            Array(gridSize).fill(initialTemp)
        );
        
        // Apply boundary conditions
        for (let i = 0; i < gridSize; i++) {
            this.temperature[i][0] = leftBoundaryTemp;
            this.temperature[i][gridSize - 1] = rightBoundaryTemp;
            this.temperature[0][i] = topBoundaryTemp;
            this.temperature[gridSize - 1][i] = bottomBoundaryTemp;
        }
        
        this.currentTime = 0;
        this.isRunning = false;
        this.speed = 1;
        this.paused = false;
        this.lastTimeStep = 0;
        this.snapshotCount = 0;
        
        // Calculate derived metrics
        this.updateMetrics();
    }
    
    updateMetrics() {
        const { gridSize } = this.params;
        let sum = 0;
        let max = -Infinity;
        let min = Infinity;
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                sum += this.temperature[i][j];
                if (this.temperature[i][j] > max) max = this.temperature[i][j];
                if (this.temperature[i][j] < min) min = this.temperature[i][j];
            }
        }
        
        this.avgTemperature = sum / (gridSize * gridSize);
        this.maxTemperature = max;
        this.minTemperature = min;
        this.temperatureGradient = max - min;
    }
    
    step() {
        if (!this.isRunning || this.paused) return;
        
        const { gridSize, diffusionRate, conductivity, capacity, 
                spatialStep, timeStep } = this.params;
        
        const newTemperature = Array(gridSize).fill().map(() => 
            Array(gridSize).fill(0)
        );
        
        // Calculate new temperatures using finite difference method
        for (let i = 1; i < gridSize - 1; i++) {
            for (let j = 1; j < gridSize - 1; j++) {
                // Laplacian (diffusion) term
                const laplacian = (
                    this.temperature[i + 1][j] + this.temperature[i - 1][j] +
                    this.temperature[i][j + 1] + this.temperature[i][j - 1] -
                    4 * this.temperature[i][j]
                ) / (spatialStep * spatialStep);
                
                // Temperature change rate
                const dT = (diffusionRate * conductivity * laplacian - 
                           capacity * 0.01) * timeStep;
                
                newTemperature[i][j] = this.temperature[i][j] + dT;
            }
        }
        
        // Apply boundary conditions
        for (let i = 0; i < gridSize; i++) {
            newTemperature[i][0] = this.params.leftBoundaryTemp;
            newTemperature[i][gridSize - 1] = this.params.rightBoundaryTemp;
            newTemperature[0][i] = this.params.topBoundaryTemp;
            newTemperature[gridSize - 1][i] = this.params.bottomBoundaryTemp;
        }
        
        this.temperature = newTemperature;
        this.currentTime += timeStep;
        this.lastTimeStep = timeStep;
        
        // Update metrics
        this.updateMetrics();
        
        // Record history
        this.recordHistory();
        
        // Check if we've reached max time
        if (this.currentTime >= this.params.maxTime) {
            this.isRunning = false;
            this.showNotification('Simulation completed!');
        }
    }
    
    recordHistory() {
        const historyPoint = {
            time: this.currentTime,
            avgTemp: this.avgTemperature,
            maxTemp: this.maxTemperature,
            minTemp: this.minTemperature,
            gradient: this.temperatureGradient,
            snapshot: this.snapshotCount % 5 === 0 ? this.getSnapshot() : null
        };
        
        this.history.push(historyPoint);
        
        if (this.history.length > this.maxHistoryPoints) {
            this.history.shift();
        }
        
        if (this.snapshotCount % this.snapshotInterval === 0 && this.snapshotCount > 0) {
            this.snapshotCount++;
            this.showNotification(`Snapshot taken: ${this.snapshotCount}`, 'info');
        }
    }
    
    getSnapshot() {
        // Create a simplified snapshot for visualization
        const { gridSize } = this.params;
        const snapshot = [];
        
        for (let i = 0; i < gridSize; i += 2) {
            const row = [];
            for (let j = 0; j < gridSize; j += 2) {
                row.push(this.temperature[i][j]);
            }
            snapshot.push(row);
        }
        
        return snapshot;
    }
    
    updateBoundaryConditions() {
        // Update boundary conditions for oscillatory scenario
        if (this.params.scenarios.oscillatory) {
            const time = Date.now();
            this.params.leftBoundaryTemp = 100 + 30 * Math.sin(time / 5000);
            this.params.rightBoundaryTemp = 50 - 20 * Math.sin(time / 7000);
            this.params.topBoundaryTemp = 60 + 20 * Math.sin(time / 9000);
            this.params.bottomBoundaryTemp = 40 - 10 * Math.sin(time / 11000);
        }
    }
    
    showNotification(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show';
        setTimeout(() => {
            toast.className = 'toast';
        }, 3000);
    }
    
    exportCSV() {
        if (this.history.length === 0) {
            this.showNotification('No data to export', 'error');
            return;
        }
        
        const headers = ['Time', 'Avg Temperature', 'Max Temperature', 'Min Temperature', 'Temperature Gradient'];
        const csvContent = [
            headers.join(','),
            ...this.history.map(point => 
                [
                    point.time.toFixed(2),
                    point.avgTemp.toFixed(4),
                    point.maxTemp.toFixed(4),
                    point.minTemp.toFixed(4),
                    point.gradient.toFixed(4)
                ].join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simulation_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('CSV exported successfully!', 'success');
    }
}

// Initialize simulation
const simulation = new TemperatureDiffusionSystem(SIMULATION_PARAMS);

// Canvas setup
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const resizeObserver = new ResizeObserver(() => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    drawSimulation();
});
resizeObserver.observe(canvas);

// Chart setup
const chartCtx = document.getElementById('dataChart').getContext('2d');
let chart = new Chart(chartCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Average Temperature',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            },
            {
                label: 'Max Temperature',
                data: [],
                borderColor: '#84fab0',
                backgroundColor: 'rgba(132, 250, 176, 0.1)',
                tension: 0.4
            },
            {
                label: 'Min Temperature',
                data: [],
                borderColor: '#f9a8d4',
                backgroundColor: 'rgba(249, 168, 212, 0.1)',
                tension: 0.4
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                display: true,
                title: { display: true, text: 'Time' },
                min: 0,
                max: SIMULATION_PARAMS.maxTime
            },
            y: {
                display: true,
                title: { display: true, text: 'Temperature (°C)' },
                min: 0,
                max: 150
            }
        },
        plugins: {
            legend: { display: true },
            title: { display: false }
        }
    }
});

// Initialize history table
function updateHistoryTable() {
    const tbody = document.querySelector('#historyTable tbody');
    tbody.innerHTML = '';
    
    const displayData = simulation.history.slice(-20); // Show last 20 points
    
    displayData.forEach(point => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = point.time.toFixed(2);
        row.insertCell(1).textContent = point.avgTemp.toFixed(4);
        row.insertCell(2).textContent = point.maxTemp.toFixed(4);
        row.insertCell(3).textContent = point.minTemp.toFixed(4);
        row.insertCell(4).textContent = point.gradient.toFixed(4);
    });
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.querySelectorAll('.nav button').forEach(button => {
        button.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'simulation') {
        drawSimulation();
    } else if (tabName === 'history') {
        updateHistoryTable();
    } else if (tabName === 'analytics') {
        updateAnalytics();
    }
}

// Draw simulation visualization
function drawSimulation() {
    const { gridSize } = simulation.params;
    const cellSize = Math.min(canvas.width, canvas.height) / gridSize;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw temperature grid
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const temp = simulation.temperature[i][j];
            const normalized = (temp - 20) / 80; // Normalize to 0-1 range
            const color = interpolateColor(normalized);
            
            ctx.fillStyle = color;
            ctx.fillRect(
                j * cellSize,
                i * cellSize,
                cellSize,
                cellSize
            );
            
            // Add border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.strokeRect(
                j * cellSize,
                i * cellSize,
                cellSize,
                cellSize
            );
        }
    }
    
    // Draw temperature scale legend
    drawTemperatureLegend(cellSize * gridSize);
}

function interpolateColor(normalized) {
    // Blue -> Green -> Red gradient
    if (normalized <= 0.5) {
        const green = Math.floor(255 * normalized * 2);
        return `rgb(0, ${green}, 255)`;
    } else {
        const red = Math.floor(255 * (normalized - 0.5) * 2);
        return `rgb(${red}, 255, 0)`;
    }
}

function drawTemperatureLegend(width) {
    const legendY = canvas.height - 30;
    const legendX = canvas.width - width - 50;
    
    // Create gradient for legend
    const gradient = ctx.createLinearGradient(legendX, legendY, legendX + 200, legendY);
    gradient.addColorStop(0, '#0000ff');
    gradient.addColorStop(0.5, '#00ff00');
    gradient.addColorStop(1, '#ff0000');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, legendY - 10, 200, 20);
    
    // Add text labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.fillText('20°C', legendX, legendY + 5);
    ctx.fillText('60°C', legendX + 100, legendY + 5);
    ctx.fillText('100°C', legendX + 190, legendY + 5);
}

// Update analytics
function updateAnalytics() {
    const avgEl = document.getElementById('avgTemp');
    const maxEl = document.getElementById('maxTemp');
    const minEl = document.getElementById('minTemp');
    const gradientEl = document.getElementById('gradient');
    const energyEl = document.getElementById('energy');
    
    avgEl.textContent = simulation.avgTemperature.toFixed(4) + ' °C';
    maxEl.textContent = simulation.maxTemperature.toFixed(4) + ' °C';
    minEl.textContent = simulation.minTemperature.toFixed(4) + ' °C';
    gradientEl.textContent = simulation.temperatureGradient.toFixed(4) + ' °C';
    
    // Calculate approximate energy (sum of all temperatures)
    const energy = simulation.history.reduce((sum, point) => sum + point.avgTemp, 0);
    energyEl.textContent = (energy / (simulation.history.length || 1)).toFixed(4) + ' °C·time';
}

// Simulation controls
function startSimulation() {
    if (!simulation.isRunning) {
        simulation.isRunning = true;
        simulation.paused = false;
        simulation.lastTimeStep = Date.now();
        animate();
        showNotification('Simulation started', 'success');
    }
}

function pauseSimulation() {
    simulation.paused = true;
    showNotification('Simulation paused', 'info');
}

function stopSimulation() {
    simulation.isRunning = false;
    simulation.paused = false;
    showNotification('Simulation stopped', 'warning');
}

function stepSimulation() {
    simulation.updateBoundaryConditions();
    simulation.step();
    drawSimulation();
    updateHistoryTable();
    updateAnalytics();
    updateChart();
    
    if (!simulation.isRunning) {
        showNotification('Step completed', 'info');
    }
}

function resetSimulation() {
    stopSimulation();
    simulation.reset();
    simulation.history = [];
    drawSimulation();
    updateHistoryTable();
    updateAnalytics();
    updateChart();
    showNotification('Simulation reset', 'warning');
}

function setSpeed(speed) {
    simulation.speed = speed;
    document.getElementById('speedDisplay').textContent = speed + 'x';
    if (speed === 1) {
        document.getElementById('speedSlider').value = 1;
    } else if (speed === 2) {
        document.getElementById('speedSlider').value = 2;
    } else if (speed === 5) {
        document.getElementById('speedSlider').value = 3;
    }
}

function selectScenario(scenarioName) {
    if (simulation.params.scenarios[scenarioName]) {
        const scenario = simulation.params.scenarios[scenarioName];
        Object.assign(simulation.params, scenario);
        resetSimulation();
        showNotification(`Scenario switched to: ${scenarioName}`, 'success');
    }
}

// Animation loop
function animate() {
    if (simulation.isRunning && !simulation.paused) {
        const now = Date.now();
        const deltaTime = (now - (simulation.lastTimeStep || now)) / 1000;
        
        simulation.lastTimeStep = now;
        
        // Calculate number of steps based on speed
        const steps = Math.floor(deltaTime * simulation.speed / simulation.params.timeStep);
        
        for (let i = 0; i < steps; i++) {
            simulation.updateBoundaryConditions();
            simulation.step();
        }
        
        // Update displays
        drawSimulation();
        updateHistoryTable();
        updateAnalytics();
        updateChart();
    }
    
    requestAnimationFrame(animate);
}

function updateChart() {
    const timeLabels = simulation.history.map(point => point.time.toFixed(1));
    const avgTemps = simulation.history.map(point => point.avgTemp);
    const maxTemps = simulation.history.map(point => point.maxTemp);
    const minTemps = simulation.history.map(point => point.minTemp);
    
    chart.data.labels = timeLabels;
    chart.data.datasets[0].data = avgTemps;
    chart.data.datasets[1].data = maxTemps;
    chart.data.datasets[2].data = minTemps;
    chart.update();
}

function exportData() {
    simulation.exportCSV();
}

// Event listeners
// Control buttons


// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set initial values
    document.getElementById('timeStep').value = SIMULATION_PARAMS.timeStep;
    document.getElementById('maxTime').value = SIMULATION_PARAMS.maxTime;
    document.getElementById('speedDisplay').textContent = simulation.speed + 'x';
    document.getElementById('speedSlider').value = 1;
    
    // Update initial displays
    drawSimulation();
    updateHistoryTable();
    updateAnalytics();
    
    // Start animation loop
    animate();
    
    showNotification('System simulation loaded successfully!', 'success');
});