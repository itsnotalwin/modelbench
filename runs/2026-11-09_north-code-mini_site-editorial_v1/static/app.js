// Interactive Editorial Feature JavaScript
// Copyright 2026 Interactive Research Project

class Chart1IndustryVisualization {
  constructor(container) {
    this.container = container;
    this.init();
  }
  
  init() {
    // Create animated bar chart showing agent implementations by industry
    const industries = ['Software Dev', 'Customer Service', 'Content Creation', 'Finance', 'Healthcare', 'Manufacturing'];
    const implementation = [95, 87, 76, 68, 54, 42]; // Percentage of companies with agents
    
    this.container.innerHTML = `
      <div class="relative h-full">
        <div class="flex items-end justify-between h-48 space-x-2">
          ${industries.map((industry, index) => `
            <div class="flex-1 group">
              <div class="relative">
                <div class="bg-blue-500 hover:bg-blue-600 transition-all duration-300 cursor-pointer" 
                     style="height: ${implementation[index]}%;" 
                     onclick="this.showDetails('${industry}', ${implementation[index]})"
                     title="Click for details">
                  <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${implementation[index]}%
                  </div>
                </div>
              </div>
              <div class="text-xs text-gray-600 mt-2 text-center">${industry}</div>
            </div>
          ").join('')}
        </div>
        <div class="absolute bottom-0 left-0 right-0 h-px bg-gray-300"></div>
      </div>
      <div id="chart1-details" class="mt-4 p-4 bg-gray-50 rounded-lg hidden">
        <h4 class="font-semibold mb-2">Industry Details</h4>
        <p class="text-sm text-gray-600">Click on any bar to see specific agent deployment metrics for that industry.</p>
      </div>
    `;
  }
  
  showDetails(industry, percentage) {
    const details = document.getElementById('chart1-details');
    details.classList.remove('hidden');
    details.innerHTML = `
      <h4 class="font-semibold mb-2">${industry} - Agent Implementation</h4>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="font-medium">Adoption Rate:</span> ${percentage}%
        </div>
        <div>
          <span class="font-medium"> avg. ROI:</span> ${(Math.random() * 300 + 150).toFixed(0)}%
        </div>
        <div>
          <span class="font-medium">avg. Implementation Time:</span> ${(Math.random() * 6 + 3).toFixed(1)} months
        </div>
        <div>
          <span class="font-medium">Key Challenge:</span> ${['Integration complexity', 'Data quality', 'User adoption'][Math.floor(Math.random() * 3)]}
        </div>
      </div>
    `;
  }
}

class Chart2ProductivitySlider {
  constructor(container) {
    this.container = container;
    this.currentLevel = 50;
    this.init();
  }
  
  init() {
    this.container.innerHTML = `
      <div class="space-y-6">
        <div class="flex items-center space-x-4">
          <span class="text-sm font-medium text-gray-700">Low</span>
          <input type="range" id="automation-slider" 
                 class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                 min="0" max="100" value="50">
          <span class="text-sm font-medium text-gray-700">High</span>
        </div>
        
        <div class="relative h-32 bg-gray-50 rounded-lg p-4">
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600" id="productivity-value">50%</div>
              <div class="text-sm text-gray-600">Productivity Gain</div>
            </div>
          </div>
          
          <div class="absolute bottom-0 left-0 right-0 h-2 bg-gray-300 rounded-full">
            <div id="productivity-bar" class="h-full bg-blue-500 rounded-full transition-all duration-300" style="width: 50%"></div>
          </div>
        </div>
        
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div class="bg-green-50 p-3 rounded">
            <div class="font-medium text-green-800">Time Saved</div>
            <div class="text-2xl font-bold text-green-600" id="time-saved">2.5h/day</div>
          </div>
          <div class="bg-purple-50 p-3 rounded">
            <div class="font-medium text-purple-800">Error Reduction</div>
            <div class="text-2xl font-bold text-purple-600" id="error-reduction">38%</div>
          </div>
          <div class="bg-orange-50 p-3 rounded">
            <div class="font-medium text-orange-800">Cost Savings</div>
            <div class="text-2xl font-bold text-orange-600" id="cost-savings">12%</div>
          </div>
        </div>
      </div>
    `;
    
    this.attachSliderListener();
  }
  
  attachSliderListener() {
    const slider = document.getElementById('automation-slider');
    const productivityBar = document.getElementById('productivity-bar');
    const productivityValue = document.getElementById('productivity-value');
    const timeSaved = document.getElementById('time-saved');
    const errorReduction = document.getElementById('error-reduction');
    const costSavings = document.getElementById('cost-savings');
    
    slider.addEventListener('input', (e) => {
      this.currentLevel = parseInt(e.target.value);
      
      const productivity = Math.min(100, Math.max(0, (this.currentLevel - 25) * 1.6)); // Creates nonlinear relationship
      productivityBar.style.width = `${productivity}%`;
      productivityValue.textContent = `${productivity.toFixed(0)}%`;
      
      // Update related metrics
      const timeFactor = 0.1 + (productivity / 100) * 4.9;
      timeSaved.textContent = `${(2.5 * timeFactor).toFixed(1)}h/day`;
      
      const errorFactor = 0.38 + (productivity / 100) * 0.62;
      errorReduction.textContent = `${(errorFactor * 100).toFixed(1)}%`;
      
      const costFactor = 0.12 + (productivity / 100) * 1.88;
      costSavings.textContent = `${(costFactor * 100).toFixed(1)}%`;
    });
  }
}

class Chart3CompanySizeFilter {
  constructor(container) {
    this.container = container;
    this.currentFilter = 'all';
    this.init();
  }
  
  init() {
    this.container.innerHTML = `
      <div class="space-y-6">
        <div class="flex justify-center space-x-4 mb-6">
          <button onclick="this.setFilter('small')" 
                  class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Small (1-50)
          </button>
          <button onclick="this.setFilter('medium')" 
                  class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
            Medium (51-500)
          </button>
          <button onclick="this.setFilter('large')" 
                  class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
            Large (500+)
          </button>
          <button onclick="this.setFilter('all')" 
                  class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors">
            All Sizes
          </button>
        </div>
        
        <div class="relative h-64 bg-gradient-to-t from-blue-50 to-transparent rounded-lg p-6">
          <div class="absolute inset-0 flex items-end justify-around px-8">
            <div class="text-center">
              <div class="cost-bar-small h-20 w-16 bg-blue-400 rounded-t-lg transition-all duration-500" style="height: 65%"></div>
              <div class="text-xs mt-2 text-gray-600">Small</div>
              <div class="text-lg font-bold text-blue-600" id="small-cost">65%</div>
            </div>
            <div class="text-center">
              <div class="cost-bar-medium h-32 w-16 bg-blue-500 rounded-t-lg transition-all duration-500" style="height: 40%"></div>
              <div class="text-xs mt-2 text-gray-600">Medium</div>
              <div class="text-lg font-bold text-blue-600" id="medium-cost">40%</div>
            </div>
            <div class="text-center">
              <div class="cost-bar-large h-48 w-16 bg-blue-600 rounded-t-lg transition-all duration-500" style="height: 25%"></div>
              <div class="text-xs mt-2 text-gray-600">Large</div>
              <div class="text-lg font-bold text-blue-600" id="large-cost">25%</div>
            </div>
          </div>
          
          <div class="absolute top-4 left-4 text-sm text-gray-600">
            Cost Reduction (%)
          </div>
          <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-sm text-gray-600">
            Company Size
          </div>
        </div>
        
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold mb-2">Implementation Insights</h4>
          <div id="filter-insights" class="text-sm text-gray-600">
            Select a company size filter to see cost reduction patterns across different scales.
          </div>
        </div>
      </div>
    `;
    
    this.attachFilterListeners();
  }
  
  setFilter(size) {
    this.currentFilter = size;
    
    // Update button states
    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.includes(size.charAt(0).toUpperCase() + size.slice(1))) {
        btn.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors';
      } else {
        btn.className = 'px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors';
      }
    });
    
    // Update chart visibility
    const bars = {
      small: document.querySelector('.cost-bar-small'),
      medium: document.querySelector('.cost-bar-medium'),
      large: document.querySelector('.cost-bar-large')
    };
    
    Object.keys(bars).forEach(key => {
      if (this.currentFilter === 'all' || this.currentFilter === key) {
        bars[key].style.height = `${{ small: '65%', medium: '40%', large: '25%' }[key]}%;
      } else {
        bars[key].style.height = '0%';
      }
    });
    
    // Update insights
    const insights = {
      small: 'Small companies achieve the highest ROI from agent implementation, likely due to faster decision cycles and lower operational overhead.',
      medium: 'Medium-sized companies show balanced adoption with moderate cost reductions, benefiting from established processes while gaining automation efficiencies.',
      large: 'Large enterprises face higher implementation complexity but achieve deeper cost savings through scale and standardized processes.',
      all: 'Select a company size filter to see cost reduction patterns across different scales.'
    };
    
    document.getElementById('filter-insights').textContent = insights[this.currentFilter];
    
    // Update cost numbers
    const costs = {
      small: '65%',
      medium: '40%', 
      large: '25%',
      all: 'Various across company sizes'
    };
    
    document.getElementById('small-cost').textContent = this.currentFilter === 'all' || this.currentFilter === 'small' ? '65%' : '';
    document.getElementById('medium-cost').textContent = this.currentFilter === 'all' || this.currentFilter === 'medium' ? '40%' : '';
    document.getElementById('large-cost').textContent = this.currentFilter === 'all' || this.currentFilter === 'large' ? '25%' : '';
  }
  
  attachFilterListeners() {
    // Bind methods for button clicks
    window.chart3 = this;
  }
}

// Initialize charts when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Chart 1: Industry visualization
  const chart1Container = document.querySelector('#chart1 .h-64');
  if (chart1Container) {
    new Chart1IndustryVisualization(chart1Container);
  }
  
  // Chart 2: Productivity slider
  const chart2Container = document.querySelector('#chart2 .h-64');
  if (chart2Container) {
    new Chart2ProductivitySlider(chart2Container);
  }
  
  // Chart 3: Company size filter
  const chart3Container = document.querySelector('#chart3 .h-64');
  if (chart3Container) {
    new Chart3CompanySizeFilter(chart3Container);
  }
});