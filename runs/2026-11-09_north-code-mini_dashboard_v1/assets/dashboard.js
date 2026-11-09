import { sampleData } from './data.js';

class NorthOpsDashboard {
    constructor() {
        this.currentData = [...sampleData];
        this.filteredData = [];
        this.isSimulationActive = false;
        this.simulationInterval = null;
        this.updateCount = 0;
        this.currentTheme = 'light';
        this.notifications = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateCurrentTime();
        this.setInterval(this.updateCurrentTime, 1000);
        this.loadData();
        this.updateTimeSeriesTrend();
        this.renderCharts();
        this.startEventSimulation();
        this.showNotification('Dashboard initialized successfully', 'success');
    }

    setupEventListeners() {
        // Filter controls
        const searchInput = document.getElementById('searchInput');
        const regionFilter = document.getElementById('regionFilter');
        const statusFilter = document.getElementById('statusFilter');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        const minRevenue = document.getElementById('minRevenue');
        const applyFilters = document.getElementById('applyFilters');
        const resetFilters = document.getElementById('resetFilters');
        const exportCSV = document.getElementById('exportCSV');
        const refreshData = document.getElementById('refreshData');
        const startSimulation = document.getElementById('startSimulation');
        const pauseSimulation = document.getElementById('pauseSimulation');
        const resetSimulation = document.getElementById('resetSimulation');
        const simulationSpeed = document.getElementById('simulationSpeed');
        const simulationMode = document.getElementById('simulationMode');

        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => this.applyFilters(), 300));
        }

        if (applyFilters) {
            applyFilters.addEventListener('click', () => this.applyFilters());
        }

        if (resetFilters) {
            resetFilters.addEventListener('click', () => this.resetFilters());
        }

        if (exportCSV) {
            exportCSV.addEventListener('click', () => this.exportToCSV());
        }

        if (refreshData) {
            refreshData.addEventListener('click', () => this.refreshData();
        }

        if (startSimulation) {
            startSimulation.addEventListener('click', () => this.startSimulation();
        }

        if (pauseSimulation) {
            pauseSimulation.addEventListener('click', () => this.pauseSimulation();
        }

        if (resetSimulation) {
            resetSimulation.addEventListener('click', () => this.resetSimulation();
        }

        if (simulationSpeed) {
            simulationSpeed.addEventListener('change', (e) => {
                this.simulationSpeed = parseInt(e.target.value);
                if (this.isSimulationActive) {
                    this.updateSimulationInterval();
                }
            });
        }

        // Chart type switching
        document.querySelectorAll('[data-chart-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartType = e.target.dataset.chartType;
                const chartId = e.target.closest('.chart-container').querySelector('canvas').id;
                this.updateChartType(chartId, chartType);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                searchInput?.focus();
            }
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.resetFilters();
            }
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.exportToCSV();
            }
        });

        // Responsive behavior
        this.setupResponsiveHandlers();
    }

    setupResponsiveHandlers() {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                // Mobile-specific behavior
                document.querySelector('.filters-section').style.gridTemplateColumns = '1fr';
            } else {
                document.querySelector('.filters-section').style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
    }

    loadData() {
        this.filteredData = [...this.currentData];
        this.updateKPIs();
        this.renderDataTable();
        this.populateFilters();
        this.updateCharts();
    }

    applyFilters() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const regionFilter = document.getElementById('regionFilter')?.value || 'all';
        const statusFilter = document.getElementById('statusFilter')?.value || 'all';
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        const minRevenue = parseFloat(document.getElementById('minRevenue')?.value) || 0;

        this.filteredData = this.currentData.filter(item => {
            // Search filter
            const matchesSearch = searchTerm === '' || 
                item.operation.toLowerCase().includes(searchTerm) ||
                item.customer.toLowerCase().includes(searchTerm) ||
                item.id.toLowerCase().includes(searchTerm);

            // Region filter
            const matchesRegion = regionFilter === 'all' || item.region === regionFilter;

            // Status filter
            const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

            // Date range filter
            let matchesDate = true;
            if (startDate && item.timestamp) {
                const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
                matchesDate = itemDate >= startDate && (!endDate || itemDate <= endDate);
            }

            // Revenue filter
            const matchesRevenue = item.revenue >= minRevenue;

            return matchesSearch && matchesRegion && matchesStatus && matchesDate && matchesRevenue;
        });

        this.updateKPIs();
        this.renderDataTable();
        this.updateCharts();
        this.showNotification(`Applied filters - showing ${this.filteredData.length} records`, 'info');
    }

    resetFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('regionFilter').value = 'all';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        document.getElementById('minRevenue').value = '';

        this.loadData();
        this.showNotification('Filters reset', 'success');
    }

    updateKPIs() {
        const totalRevenue = this.filteredData.reduce((sum, item) => sum + item.revenue, 0);
        const activeOperations = this.filteredData.filter(item => 
            item.status === 'in-progress'
        ).length;
        const completedOperations = this.filteredData.filter(item => 
            item.status === 'completed'
        ).length;
        const successRate = completedOperations > 0 ? (completedOperations / this.filteredData.length) * 100 : 0;
        const avgResponseTime = this.filteredData.reduce((sum, item) => sum + item.responseTime, 0) / this.filteredData.length || 0;
        const activeUsers = this.filteredData.reduce((sum, item) => sum + Math.floor(Math.random() * 50) + 10, 0);
        const customerSatisfaction = this.filteredData.reduce((sum, item) => sum + item.satisfaction, 0) / this.filteredData.length || 0;

        // Update KPI values
        document.getElementById('totalRevenue').textContent = `$${totalRevenue.toLocaleString()}`;
        document.getElementById('activeOperations').textContent = activeOperations.toString();
        document.getElementById('successRate').textContent = `${successRate.toFixed(1)}%`;
        document.getElementById('avgResponseTime').textContent = `${avgResponseTime.toFixed(1)}s`;
        document.getElementById('activeUsers').textContent = activeUsers.toLocaleString();
        document.getElementById('customerSatisfaction').textContent = `${customerSatisfaction.toFixed(1)}%`;

        // Update trend indicators
        this.updateKPITrends();
    }

    updateKPITrends() {
        const revenueTrend = document.getElementById('revenueTrend');
        const operationsTrend = document.getElementById('operationsTrend');
        const successTrend = document.getElementById('successTrend');
        const responseTrend = document.getElementById('responseTrend');
        const usersTrend = document.getElementById('usersTrend');
        const satisfactionTrend = document.getElementById('satisfactionTrend');

        // Simulate trend updates
        if (revenueTrend) revenueTrend.innerHTML = '<div class="trend-indicator positive">↗</div>';
        if (operationsTrend) operationsTrend.innerHTML = '<div class="trend-indicator positive">↗</div>';
        if (successTrend) successTrend.innerHTML = '<div class="trend-indicator positive">↗</div>';
        if (responseTrend) responseTrend.innerHTML = '<div class="trend-indicator negative">↗</div>';
        if (usersTrend) usersTrend.innerHTML = '<div class="trend-indicator positive">↗</div>';
        if (satisfactionTrend) satisfactionTrend.innerHTML = '<div class="trend-indicator positive">↗</div>';
    }

    renderDataTable() {
        const tableBody = document.getElementById('dataTableBody');
        
        if (this.filteredData.length ===  Sita) {
            tableBody.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No data matches current filters</p></div>';
            return;
        }

        tableBody.innerHTML = this.filteredData.map(item => {
            return `                <div class="table-row">
                    <div class="table-cell">${item.id}</div>
                    <div class="table-cell">${item.region}</div>
                    <div class="table-cell">${item.operation}</div>
                    <div class="table-cell">
                        <span class="status ${item.status}">${item.status}</span>
                    </div>
                    <div class="table-cell">${item.revenue.toLocaleString()}</div>
                    <div class="table-cell">${item.duration}s</div>
                    <div class="table-cell">${item.responseTime}s</div>
                    <div class="table-cell">${item.customer}</div>
                    <div class="table-cell">${item.satisfaction}</div>
                    <div class="table-cell">${new Date(item.timestamp).toLocaleDateString()}</div>
                </div>`;
        }).join('');

        if (this.filteredData.length === 0) {
            tableBody.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No data matches current filters</p></div>';
            return;
        }

        tableBody.innerHTML = this.filteredData.map(item => {
            return `                <div class="table-row">
                    <div class="table-cell">${item.id}</div>
                    <div class="table-cell">${item.region}</div>
                    <div class="table-cell">${item.operation}</div>
                    <div class="table-cell">
                        <span class="status ${item.status}">${item.status}</span>
                    </div>
                    <div class="table-cell">${item.revenue.toLocaleString()}</div>
                    <div class="table-cell">${item.duration}s</div>
                    <div class="table-cell">${item.responseTime}s</div>
                    <div class="table-cell">${item.customer}</div>
                    <div class="table-cell">${item.satisfaction}</div>
                    <div class="table-cell">${new Date(item.timestamp).toLocaleDateString()}</div>
                </div>`;
        }).join('');
    }

    populateFilters() {
        const regionFilter = document.getElementById('regionFilter');
        const statusFilter = document.getElementById('statusFilter');

        // Populate unique regions
        const regions = ['North', 'South', 'East', 'West'];
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionFilter.appendChild(option);
        });

        // Populate unique statuses
        const statuses = ['all', 'completed', 'in-progress', 'pending', 'cancelled'];
        statuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
            statusFilter.appendChild(option);
        });
    }

    exportToCSV() {
        const headers = ['ID', 'Region', 'Operation', 'Status', 'Revenue', 'Duration', 'Response Time', 'Customer', 'Satisfaction', 'Timestamp'];
        const csvContent = [
            headers.join(','),
            ...this.filteredData.map(item => [
                item.id,
                item.region,
                item.operation,
                item.status,
                item.revenue,
                item.duration,
                item.responseTime,
                item.customer,
                item.satisfaction,
                item.timestamp
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `north-ops-data-${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
        URL.revokeObjectURL(url);

        this.showNotification(`Exported ${this.filteredData.length} records to CSV`, 'success');
    }

    refreshData() {
        this.showNotification('Refreshing data...', 'info');
        setTimeout(() => {
            this.loadData();
            this.showNotification('Data refreshed successfully', 'success');
        }, 1000);
    }

    startEventSimulation() {
        if (this.isSimulationActive) return;

        this.isSimulationActive = true;
        document.getElementById('simulationStatus').textContent = '● Active';
        document.getElementById('simulationStatus').className = 'status-indicator active';

        this.updateSimulationInterval();
        this.showNotification('Live simulation started', 'success');
    }

    pauseSimulation() {
        this.isSimulationActive = false;
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        document.getElementById('simulationStatus').textContent = '● Paused';
        document.getElementById('simulationStatus').className = 'status-indicator';
        this.showNotification('Simulation paused', 'warning');
    }

    resetSimulation() {
        this.pauseSimulation();
        this.updateCount = 0;
        document.getElementById('updateCount').textContent = '0';
        this.generateSimulatedData();
        this.showNotification('Simulation reset', 'info');
    }

    updateSimulationInterval() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }

        const speed = parseInt(document.getElementById('simulationSpeed').value) || 1000;
        this.simulationInterval = setInterval(() => {
            this.generateSimulatedData();
        }, speed);
    }

    generateSimulatedData() {
        this.updateCount++;
        document.getElementById('updateCount').textContent = this.updateCount.toString();

        // Randomly select an operation to update
        const randomIndex = Math.floor(Math.random() * this.currentData.length);
        const operation = this.currentData[randomIndex];

        // Simulate realistic changes
        const changeTypes = [
            { field: 'responseTime', delta: (Math.random() - 0.5) * 0.5, min: 0.5, max: 5.0 },
            { field: 'satisfaction', delta: (Math.random() - 0.5) * 0.5, min: 3.0, max: 5.0 },
            { field: 'duration', delta: (Math.random() - 0.5) * 1.0, min: 1.0, max: 10.0 }
        ];

        const change = changeTypes[Math.floor(Math.random() * changeTypes.length)];
        const newValue = Math.max(change.min, Math.min(change.max, operation[change.field] + change.delta));
        operation[change.field] = newValue;

        // Update timestamp
        operation.timestamp = new Date().toISOString();

        // Re-apply filters and update UI
        this.applyFilters();

        // Show notification for significant changes
        if (Math.abs(change.delta) > 0.5) {
            this.showNotification(`${operation.operation} ${change.field} updated: ${change.field === 'satisfaction' ? change.field : `${change.field}: ${newValue.toFixed(1)}`}`, 'info');
        }
    }

    updateCharts() {
        if (window.revenueChart) window.revenueChart.update();
        if (window.regionChart) window.regionChart.update();
        if (window.performanceChart) window.performanceChart.update();
        if (window.responseChart) window.responseChart.update();
    }

    updateChartType(chartId, chartType) {
        // Implementation for updating chart types
        console.log(`Updating chart ${chartId} to type: ${chartType}`);
    }

    updateTimeSeriesTrend() {
        // Implementation for time series trend updates
    }

    renderCharts() {
        // Initialize charts with sample data
        this.initRevenueChart();
        this.initRegionChart();
        this.initPerformanceChart();
        this.initResponseChart();
    }

    initRevenueChart() {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        window.revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
                datasets: [{
                    label: 'Revenue ($)',
                    data: [12000, 19000, 15000, 25000, 22000, 30000],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    initRegionChart() {
        const ctx = document.getElementById('regionChart').getContext('2d');
        window.regionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['North', 'South', 'East', 'West'],
                datasets: [{
                    label: 'Completed',
                    data: [45, 38, 52, 41],
                    backgroundColor: '#10b981'
                }, {
                    label: 'In Progress',
                    data: [12, 15, 8, 19],
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    initPerformanceChart() {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        window.performanceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Excellent (4.5-5.0)', 'Good (3.5-4.4)', 'Average (2.5-3.4)', 'Below Average (<2.5)'],
                datasets: [{
                    data: [45, 35, 15, 5],
                    backgroundColor: [
                        '#10b981',
                        '#3b82f6',
                        '#f59e0b',
                        '#ef4444'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initResponseChart() {
        const ctx = document.getElementById('responseChart').getContext('2d');
        window.responseChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['<1s', '1-2s', '2-3s', '3-5s', '>5s'],
                datasets: [{
                    label: 'Operations',
                    data: [35, 45, 25, 15, 5],
                    backgroundColor: '#8b5cf6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateCurrentTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true
        });
        document.getElementById('currentTime').textContent = timeStr;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        notification.classList.add(type);

        const container = document.getElementById('notificationContainer');
        container.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    setInterval(func, wait) {
        const timeout = setTimeout(() => func(), wait);
        return timeout;
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new NorthOpsDashboard();

    // Make dashboard globally accessible for debugging
    window.northOpsDashboard = dashboard;
});

// Service Worker for offline functionality
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .catch(error => console.log('Service Worker registration failed:', error));
    });
}