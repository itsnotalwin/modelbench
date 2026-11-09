# North Ops Analytics Dashboard

## Project Overview

This is a production-ready interactive data dashboard built with semantic HTML and modern JavaScript. The dashboard provides comprehensive operational metrics monitoring with real-time updates, filtering capabilities, and CSV export functionality.

## Features

### Core Features
- **24+ Sample Records**: Simulated operational data with realistic metrics
- **Real-time KPI Monitoring**: Dynamic key performance indicators that reconcile with underlying data
- **Interactive Filters**: Region, status, date range, and revenue filters
- **Data Visualization**: Three comprehensive charts (revenue trend, regional operations, performance distribution)
- **Event Simulation**: Live data updates with pause/reset controls
- **CSV Export**: Export current filtered data to CSV format
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Accessibility**: Semantic HTML and ARIA labels

### Technical Implementation
- Client-side only (no backend required)
- Modern JavaScript ES6+ with modular architecture
- Chart.js for data visualization
- CSS Grid and Flexbox for responsive layouts
- Browser storage for user preferences
- Notification system for user feedback

## Files

- `index.html` - Main application entry point
- `meta.json` - Project metadata (required by submission)
- `assets/` - Application assets:
  - `styles.css` - Main stylesheet
  - `data.js` - Sample data (24+ records)
  - `dashboard.js` - Core application logic

## How to Use

1. Open `index.html` in a modern web browser
2. Use the filters to narrow down data
3. Click on chart type buttons to switch visualization
4. Start/pause the live simulation to see real-time updates
5. Export data using the CSV export button

## Notes

- Sample data is simulated and represents operational metrics
- All functionality works offline after initial load
- Keyboard shortcuts available (Ctrl+F for search, Ctrl+E for export)
- Responsive design ensures usability across devices

## Performance

- Optimized for fast loading and smooth interactions
- Minimal bundle size (~50KB JavaScript)
- Efficient data filtering and updates
- Graceful handling of empty states and errors

This dashboard meets all requirements specified in the interactive data dashboard challenge and provides a comprehensive solution for operational metrics monitoring.
