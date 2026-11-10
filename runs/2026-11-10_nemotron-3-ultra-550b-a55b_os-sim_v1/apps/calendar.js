/* ==========================================================================
   Lumina OS — Calendar App
   Events, reminders, month/week/day views
   ========================================================================== */

class CalendarApp {
  constructor(window, options = {}) {
    this.window = window;
    this.currentDate = new Date();
    this.view = 'month'; // month, week, day
    this.events = [];
    this.selectedDate = null;
    this.dragEvent = null;
  }

  init() {
    this.loadEvents();
    this.render();
    this.bindEvents();
  }

  loadEvents() {
    try {
      const content = OS.filesystem.readFile('/.calendar_events.json');
      this.events = JSON.parse(content);
    } catch {
      // Demo events
      const today = new Date();
      this.events = [
        { id: '1', title: 'Team Meeting', start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0), color: '#6366f1', allDay: false },
        { id: '2', title: 'Lunch with Alex', start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 30), end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 30), color: '#a855f7', allDay: false },
        { id: '3', title: 'Project Deadline', start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3), color: '#ec4899', allDay: true },
        { id: '4', title: 'Birthday: Sam', start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6), color: '#059669', allDay: true },
        { id: '5', title: 'Code Review', start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 14, 0), end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 15, 30), color: '#d97706', allDay: false },
      ];
      this.saveEvents();
    }
  }

  saveEvents() {
    try {
      OS.filesystem.writeFile('/.calendar_events.json', JSON.stringify(this.events.map(e => ({
        ...e,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
      }))));
    } catch {}
  }

  render() {
    const content = this.window.element.querySelector('.window-content');
    content.innerHTML = `
      <div class="calendar-app" style="height:100%;display:flex;flex-direction:column;background:#f8fafc;color:#0f172a;">
        <!-- Toolbar -->
        <div class="calendar-toolbar" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:white;border-bottom:1px solid #e2e8f0;">
          <div style="display:flex;align-items:center;gap:12px;">
            <button class="cal-btn" id="btn-prev" title="Previous"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
            <button class="cal-btn" id="btn-next" title="Next"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
            <button class="cal-btn" id="btn-today" title="Today">Today</button>
            <div style="width:1px;height:24px;background:#e2e8f0;"></div>
            <span id="current-period" style="font-size:16px;font-weight:600;min-width:200px;"></span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="view-buttons" style="display:flex;background:#f1f5f9;border-radius:8px;padding:2px;">
              <button class="view-btn active" data-view="month" style="padding:6px 12px;border:none;background:transparent;border-radius:6px;font:inherit;font-size:13px;font-weight:500;color:#475569;cursor:pointer;">Month</button>
              <button class="view-btn" data-view="week" style="padding:6px 12px;border:none;background:transparent;border-radius:6px;font:inherit;font-size:13px;font-weight:500;color:#475569;cursor:pointer;">Week</button>
              <button class="view-btn" data-view="day" style="padding:6px 12px;border:none;background:transparent;border-radius:6px;font:inherit;font-size:13px;font-weight:500;color:#475569;cursor:pointer;">Day</button>
            </div>
            <button class="cal-btn primary" id="btn-new-event" style="padding:6px 12px;background:#6366f1;color:white;border:none;border-radius:6px;font:inherit;font-size:13px;font-weight:500;cursor:pointer;">New Event</button>
          </div>
        </div>

        <!-- Main Area -->
        <div class="calendar-main" style="flex:1;display:flex;overflow:hidden;">
          <!-- Mini Calendar Sidebar -->
          <aside class="calendar-sidebar" style="width:280px;background:white;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:16px;border-bottom:1px solid #e2e8f0;">
              <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">Calendars</h3>
              <div id="calendar-list" style="display:flex;flex-direction:column;gap:4px;"></div>
            </div>
            <div style="flex:1;overflow:auto;padding:16px;">
              <h3 style="font-size:14px;font-weight:600;margin-bottom:12px;">Mini Calendar</h3>
              <div id="mini-calendar"></div>
            </div>
          </aside>

          <!-- Calendar Grid -->
          <div class="calendar-grid" style="flex:1;overflow:auto;background:#f8fafc;" id="calendar-grid"></div>
        </div>
      </div>
    `;

    this.renderMiniCalendar();
    this.renderCalendarList();
    this.renderGrid();
    this.bindToolbarEvents();
  }

  bindToolbarEvents() {
    const btn = (id, fn) => this.window.element.querySelector(`#${id}`)?.addEventListener('click', fn);

    btn('btn-prev', () => this.navigate(-1));
    btn('btn-next', () => this.navigate(1));
    btn('btn-today', () => this.goToday());
    btn('btn-new-event', () => this.newEvent());

    this.window.element.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.view = btn.dataset.view;
        this.window.element.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderGrid();
      });
    });
  }

  bindEvents() {
    // Keyboard
    this.window.element.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.navigate(-1);
      if (e.key === 'ArrowRight') this.navigate(1);
      if (e.key === 't') this.goToday();
      if (e.key === 'n') this.newEvent();
      if (e.key === 'm') { this.view = 'month'; this.updateViewButtons(); this.renderGrid(); }
      if (e.key === 'w') { this.view = 'week'; this.updateViewButtons(); this.renderGrid(); }
      if (e.key === 'd') { this.view = 'day'; this.updateViewButtons(); this.renderGrid(); }
    });
  }

  updateViewButtons() {
    this.window.element.querySelectorAll('.view-btn').forEach(btn => 
      btn.classList.toggle('active', btn.dataset.view === this.view));
  }

  navigate(delta) {
    if (this.view === 'month') {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
    } else if (this.view === 'week') {
      this.currentDate = new Date(this.currentDate.getTime() + delta * 7 * 86400000);
    } else {
      this.currentDate = new Date(this.currentDate.getTime() + delta * 86400000);
    }
    this.renderGrid();
    this.renderMiniCalendar();
  }

  goToday() {
    this.currentDate = new Date();
    this.renderGrid();
    this.renderMiniCalendar();
  }

  renderMiniCalendar() {
    const container = this.window.element.querySelector('#mini-calendar');
    const date = new Date(this.currentDate);
    date.setDate(1);
    
    const today = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-weight:600;">${monthNames[date.getMonth()]} ${date.getFullYear()}</span>
    </div>`;
    
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;font-size:12px;">';
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d => html += `<div style="text-align:center;color:#94a3b8;font-weight:500;padding:4px;">${d}</div>`);
    
    const firstDay = date.getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      const isSelected = this.selectedDate && d === this.selectedDate.getDate() && date.getMonth() === this.selectedDate.getMonth() && date.getFullYear() === this.selectedDate.getFullYear();
      const hasEvents = this.events.some(e => {
        const ed = new Date(e.start);
        return ed.getDate() === d && ed.getMonth() === date.getMonth() && ed.getFullYear() === date.getFullYear();
      });
      
      html += `<button class="mini-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${hasEvents ? ' has-events' : ''}" data-day="${d}" style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:none;background:${isSelected ? '#6366f1' : 'transparent'};color:${isSelected ? 'white' : isToday ? '#6366f1' : '#0f172a'};border-radius:6px;font:inherit;font-size:12px;cursor:pointer;position:relative;">
        ${d}
        ${hasEvents ? '<span style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:' + (isSelected ? 'white' : '#6366f1') + ';"></span>' : ''}
      </button>`;
    }
    html += '</div>';
    container.innerHTML = html;
    
    container.querySelectorAll('.mini-day').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedDate = new Date(date.getFullYear(), date.getMonth(), parseInt(btn.dataset.day));
        this.view = 'day';
        this.currentDate = new Date(this.selectedDate);
        this.updateViewButtons();
        this.renderGrid();
        this.renderMiniCalendar();
      });
    });
  }

  renderCalendarList() {
    const container = this.window.element.querySelector('#calendar-list');
    const calendars = [
      { id: 'personal', name: 'Personal', color: '#6366f1', visible: true },
      { id: 'work', name: 'Work', color: '#a855f7', visible: true },
      { id: 'family', name: 'Family', color: '#ec4899', visible: true },
      { id: 'birthdays', name: 'Birthdays', color: '#059669', visible: true },
    ];
    
    container.innerHTML = calendars.map(cal => `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;transition:background 100ms;">
        <input type="checkbox" checked data-cal="${cal.id}" style="accent-color:${cal.color};">
        <span style="width:12px;height:12px;border-radius:3px;background:${cal.color};"></span>
        <span style="font-size:13px;">${cal.name}</span>
      </label>
    `).join('');
  }

  renderGrid() {
    const container = this.window.element.querySelector('#calendar-grid');
    const periodEl = this.window.element.querySelector('#current-period');
    
    if (this.view === 'month') this.renderMonthView(container, periodEl);
    else if (this.view === 'week') this.renderWeekView(container, periodEl);
    else this.renderDayView(container, periodEl);
  }

  renderMonthView(container, periodEl) {
    const date = new Date(this.currentDate);
    date.setDate(1);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    periodEl.textContent = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    
    const today = new Date();
    const firstDay = date.getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const prevMonthDays = new Date(date.getFullYear(), date.getMonth(), 0).getDate();
    
    let html = '<div class="month-grid" style="display:grid;grid-template-columns:repeat(7,1fr);height:calc(100% - 40px);">';
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => 
      html += `<div style="padding:8px;font-weight:600;color:#64748b;background:white;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0;text-align:center;font-size:12px;">${d}</div>`
    );
    
    let day = 1;
    for (let week = 0; week < 6; week++) {
      for (let dow = 0; dow < 7; dow++) {
        const cellDate = new Date(date.getFullYear(), date.getMonth(), day);
        const isCurrentMonth = week > 0 || dow >= firstDay;
        const isToday = isCurrentMonth && day === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        const isSelected = this.selectedDate && isCurrentMonth && day === this.selectedDate.getDate() && date.getMonth() === this.selectedDate.getMonth() && date.getFullYear() === this.selectedDate.getFullYear();
        
        let dayEvents = [];
        if (isCurrentMonth) {
          dayEvents = this.events.filter(e => {
            const ed = new Date(e.start);
            return ed.getDate() === day && ed.getMonth() === date.getMonth() && ed.getFullYear() === date.getFullYear();
          });
        }
        
        html += `<div class="month-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${!isCurrentMonth ? ' other-month' : ''}" data-date="${isCurrentMonth ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : ''}" style="position:relative;min-height:100px;padding:4px;background:${isToday ? '#eef2ff' : 'white'};border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;${week === 5 ? 'border-bottom:none' : ''}${dow === 6 ? 'border-right:none' : ''};">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:13px;font-weight:${isToday ? '600' : '400'};color:${isCurrentMonth ? '#0f172a' : '#cbd5e1'};">${isCurrentMonth ? day : ''}</span>
            ${isSelected ? '<span style="width:20px;height:20px;border-radius:50%;background:#6366f1;color:white;display:flex;align-items:center;justify-content:center;font-size:11px;">✓</span>' : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;max-height:80px;overflow:hidden;">
            ${dayEvents.slice(0, 3).map(e => `
              <div class="event-chip" data-id="${e.id}" style="padding:2px 6px;border-radius:3px;font-size:10px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:${e.color};color:white;cursor:pointer;">${this.escapeHtml(e.title)}</div>
            `).join('')}
            ${dayEvents.length > 3 ? `<div style="font-size:10px;color:#94a3b8;text-align:center;padding:2px;">+${dayEvents.length - 3} more</div>` : ''}
          </div>
        </div>`;
        
        if (isCurrentMonth) day++;
        else if (week === 0) day = prevMonthDays - firstDay + dow + 1;
      }
    }
    html += '</div>';
    container.innerHTML = html;
    
    // Bind events
    container.querySelectorAll('.month-cell').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (!e.target.closest('.event-chip') && cell.dataset.date) {
          this.selectedDate = new Date(cell.dataset.date);
          this.renderMonthView(container, periodEl);
        }
      });
      cell.addEventListener('dblclick', (e) => {
        if (!e.target.closest('.event-chip') && cell.dataset.date) {
          this.newEvent(new Date(cell.dataset.date));
        }
      });
    });
    
    container.querySelectorAll('.event-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.editEvent(chip.dataset.id);
      });
    });
  }

  renderWeekView(container, periodEl) {
    const startOfWeek = new Date(this.currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    periodEl.textContent = `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${monthNames[endOfWeek.getMonth()]} ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    
    const today = new Date();
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    let html = '<div class="week-grid" style="display:grid;grid-template-columns:60px repeat(7,1fr);height:100%;">';
    // Time column header
    html += '<div style="background:white;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;"></div>';
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(dayDate.getDate() + d);
      const isToday = dayDate.toDateString() === today.toDateString();
      html += `<div class="week-day-header${isToday ? ' today' : ''}" style="padding:12px 8px;background:${isToday ? '#eef2ff' : 'white'};border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;text-align:center;">
        <div style="font-size:12px;color:#64748b;">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]}</div>
        <div style="font-weight:600;font-size:16px;color:${isToday ? '#6366f1' : '#0f172a'};">${dayDate.getDate()}</div>
      </div>`;
    }
    
    // Time slots
    for (const hour of hours) {
      html += `<div class="time-label" style="padding:0 8px;background:white;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;align-items:flex-end;height:60px;">${hour === 0 ? '12a' : hour < 12 ? hour + 'a' : hour === 12 ? '12p' : hour - 12 + 'p'}</div>`;
      
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(dayDate.getDate() + d);
        const dateStr = dayDate.toISOString().split('T')[0];
        const isToday = dayDate.toDateString() === today.toDateString();
        
        const dayEvents = this.events.filter(e => {
          const ed = new Date(e.start);
          return ed.toISOString().split('T')[0] === dateStr && ed.getHours() === hour;
        });
        
        html += `<div class="week-slot${isToday ? ' today' : ''}" data-date="${dateStr}" data-hour="${hour}" style="position:relative;height:60px;background:${isToday ? '#fafafa' : 'white'};border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">${dayEvents.map(e => `
          <div class="week-event" data-id="${e.id}" style="position:absolute;left:2px;right:2px;top:${(new Date(e.start).getMinutes() / 60) * 60}px;height:${((new Date(e.end) - new Date(e.start)) / 3600000) * 60}px;background:${e.color};color:white;border-radius:4px;padding:2px 6px;font-size:11px;overflow:hidden;cursor:pointer;z-index:1;">
            <div style="font-weight:500;">${this.escapeHtml(e.title)}</div>
          </div>
        `).join('')}</div>`;
      }
    }
    html += '</div>';
    container.innerHTML = html;
    
    // Bind events
    container.querySelectorAll('.week-slot').forEach(slot => {
      slot.addEventListener('click', (e) => {
        if (!e.target.closest('.week-event')) {
          const date = new Date(slot.dataset.date);
          date.setHours(parseInt(slot.dataset.hour));
          this.newEvent(date);
        }
      });
    });
    container.querySelectorAll('.week-event').forEach(evt => {
      evt.addEventListener('click', (e) => {
        e.stopPropagation();
        this.editEvent(evt.dataset.id);
      });
    });
  }

  renderDayView(container, periodEl) {
    const date = new Date(this.currentDate);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    periodEl.textContent = `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const dateStr = date.toISOString().split('T')[0];
    const dayEvents = this.events.filter(e => new Date(e.start).toISOString().split('T')[0] === dateStr).sort((a,b) => new Date(a.start) - new Date(b.start));
    
    let html = '<div class="day-view" style="padding:20px;max-width:800px;margin:0 auto;">';
    // All day events
    const allDayEvents = dayEvents.filter(e => e.allDay);
    if (allDayEvents.length) {
      html += '<div style="margin-bottom:20px;">';
      allDayEvents.forEach(e => {
        html += `<div class="event-chip" data-id="${e.id}" style="display:inline-flex;align-items:center;gap:8px;padding:8px 12px;background:${e.color};color:white;border-radius:8px;margin-right:8px;margin-bottom:8px;cursor:pointer;">
          <span style="font-weight:500;">${this.escapeHtml(e.title)}</span>
          <span style="font-size:11px;opacity:0.8;">All day</span>
        </div>`;
      });
      html += '</div>';
    }
    
    // Time slots
    html += '<div class="day-timeline" style="display:flex;">';
    html += '<div style="width:60px;flex-shrink:0;">';
    for (let h = 0; h < 24; h++) {
      html += `<div style="height:60px;display:flex;align-items:flex-end;justify-content:flex-end;padding:0 8px;font-size:11px;color:#94a3b8;border-bottom:1px solid #e2e8f0;">${h === 0 ? '12 AM' : h < 12 ? h + ' AM' : h === 12 ? '12 PM' : h - 12 + ' PM'}</div>`;
    }
    html += '</div>';
    html += '<div style="flex:1;position:relative;">';
    for (let h = 0; h < 24; h++) {
      const hourEvents = dayEvents.filter(e => !e.allDay && new Date(e.start).getHours() === h);
      html += `<div class="day-hour" data-hour="${h}" style="position:relative;height:60px;border-bottom:1px solid #e2e8f0;${isToday ? 'background:#fafafa' : ''}">`;
      hourEvents.forEach(e => {
        const start = new Date(e.start);
        const end = new Date(e.end);
        const top = (start.getMinutes() / 60) * 60;
        const height = ((end - start) / 3600000) * 60;
        html += `<div class="day-event" data-id="${e.id}" style="position:absolute;left:16px;right:16px;top:${top}px;height:${height}px;background:${e.color};color:white;border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.1);overflow:hidden;">
          <div style="font-weight:600;">${this.escapeHtml(e.title)}</div>
          <div style="font-size:11px;opacity:0.9;">${this.formatTime(start)} - ${this.formatTime(end)}</div>
        </div>`;
      });
      html += '</div>';
    }
    html += '</div></div>';
    container.innerHTML = html;
    
    container.querySelectorAll('.day-hour').forEach(hour => {
      hour.addEventListener('click', (e) => {
        if (!e.target.closest('.day-event')) {
          const date = new Date(this.currentDate);
          date.setHours(parseInt(hour.dataset.hour));
          this.newEvent(date);
        }
      });
    });
    container.querySelectorAll('.day-event, .event-chip').forEach(evt => {
      evt.addEventListener('click', (e) => {
        e.stopPropagation();
        this.editEvent(evt.dataset.id);
      });
    });
  }

  newEvent(date = null) {
    const start = date || new Date();
    start.setMinutes(Math.ceil(start.getMinutes() / 30) * 30);
    const end = new Date(start.getTime() + 3600000);
    
    const colors = ['#6366f1', '#a855f7', '#ec4899', '#059669', '#d97706', '#0891b2', '#7c2d12'];
    
    // Create modal-like dialog
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:480px;box-shadow:0 25px 50px rgba(0,0,0,0.2);">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:20px;">New Event</h2>
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:6px;">Title</label>
            <input type="text" id="event-title" placeholder="Event title" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;outline:none;border-color:#6366f1;">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:6px;">Start</label>
              <input type="datetime-local" id="event-start" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;">
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:6px;">End</label>
              <input type="datetime-local" id="event-end" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;">
            </div>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:6px;">All Day</label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="event-allday" style="accent-color:#6366f1;">
              <span style="font-size:14px;">All day event</span>
            </label>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:6px;">Color</label>
            <div style="display:flex;gap:8px;">
              ${colors.map(c => `<button class="color-pick${c === colors[0] ? ' selected' : ''}" data-color="${c}" style="width:32px;height:32px;border-radius:50%;border:2px solid ${c === colors[0] ? '#6366f1' : 'transparent'};background:${c};cursor:pointer;"></button>`).join('')}
            </div>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
            <button id="event-cancel" style="padding:10px 20px;border:1px solid #e2e8f0;background:white;border-radius:8px;font:inherit;font-size:14px;font-weight:500;cursor:pointer;">Cancel</button>
            <button id="event-save" style="padding:10px 20px;border:none;background:#6366f1;color:white;border-radius:8px;font:inherit;font-size:14px;font-weight:500;cursor:pointer;">Save</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Set defaults
    const fmt = (d) => d.toISOString().slice(0, 16);
    modal.querySelector('#event-start').value = fmt(start);
    modal.querySelector('#event-end').value = fmt(end);
    modal.querySelector('#event-title').focus();
    
    let selectedColor = colors[0];
    modal.querySelectorAll('.color-pick').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedColor = btn.dataset.color;
        modal.querySelectorAll('.color-pick').forEach(b => b.style.borderColor = 'transparent');
        btn.style.borderColor = '#6366f1';
      });
    });
    
    const close = () => modal.remove();
    
    modal.querySelector('#event-cancel').addEventListener('click', close);
    modal.querySelector('#event-save').addEventListener('click', () => {
      const title = modal.querySelector('#event-title').value.trim();
      if (!title) return;
      const allDay = modal.querySelector('#event-allday').checked;
      const start = new Date(modal.querySelector('#event-start').value);
      const end = new Date(modal.querySelector('#event-end').value);
      
      this.events.push({
        id: uid('evt'),
        title,
        start,
        end,
        color: selectedColor,
        allDay,
      });
      this.saveEvents();
      this.renderGrid();
      close();
      if (OS.audio) OS.audio.play('pop');
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  }

  editEvent(id) {
    const event = this.events.find(e => e.id === id);
    if (!event) return;
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:white;border-radius:16px;padding:24px;width:100%;max-width:480px;box-shadow:0 25px 50px rgba(0,0,0,0.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2 style="font-size:18px;font-weight:600;">Edit Event</h2>
          <button id="event-delete" style="padding:6px 12px;border:none;background:#fee2e2;color:#dc2626;border-radius:6px;font:inherit;font-size:13px;font-weight:500;cursor:pointer;">Delete</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:6px;">Title</label>
            <input type="text" id="event-title" value="${this.escapeHtml(event.title)}" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;outline:none;border-color:#6366f1;">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:6px;">Start</label>
              <input type="datetime-local" id="event-start" value="${event.start.toISOString().slice(0,16)}" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;">
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:6px;">End</label>
              <input type="datetime-local" id="event-end" value="${event.end.toISOString().slice(0,16)}" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font:inherit;font-size:14px;">
            </div>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:500;color:#475569;margin-bottom:6px;">All Day</label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
              <input type="checkbox" id="event-allday" ${event.allDay ? 'checked' : ''} style="accent-color:#6366f1;">
              <span style="font-size:14px;">All day event</span>
            </label>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
            <button id="event-cancel" style="padding:10px 20px;border:1px solid #e2e8f0;background:white;border-radius:8px;font:inherit;font-size:14px;font-weight:500;cursor:pointer;">Cancel</button>
            <button id="event-save" style="padding:10px 20px;border:none;background:#6366f1;color:white;border-radius:8px;font:inherit;font-size:14px;font-weight:500;cursor:pointer;">Save</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('#event-title').focus();
    
    const close = () => modal.remove();
    modal.querySelector('#event-cancel').addEventListener('click', close);
    modal.querySelector('#event-delete').addEventListener('click', () => {
      if (confirm('Delete this event?')) {
        this.events = this.events.filter(e => e.id !== id);
        this.saveEvents();
        this.renderGrid();
        close();
        if (OS.audio) OS.audio.play('pop');
      }
    });
    modal.querySelector('#event-save').addEventListener('click', () => {
      const title = modal.querySelector('#event-title').value.trim();
      if (!title) return;
      event.title = title;
      event.start = new Date(modal.querySelector('#event-start').value);
      event.end = new Date(modal.querySelector('#event-end').value);
      event.allDay = modal.querySelector('#event-allday').checked;
      this.saveEvents();
      this.renderGrid();
      close();
      if (OS.audio) OS.audio.play('pop');
    });
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  }

  formatTime(date) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => {
      const map = { '&': '&', '<': '<', '>': '>', '"': '"', "'": '\'' };
      return map[c];
    });
  }

  getState() {
    return { currentDate: this.currentDate.toISOString(), view: this.view, selectedDate: this.selectedDate?.toISOString() };
  }

  restoreState(state) {
    if (!state) return;
    if (state.currentDate) this.currentDate = new Date(state.currentDate);
    if (state.view) this.view = state.view;
    if (state.selectedDate) this.selectedDate = new Date(state.selectedDate);
    this.updateViewButtons();
  }

  destroy() {}
}

// Register
AppRegistry.register({
  id: 'calendar',
  name: 'Calendar',
  icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  class: CalendarApp,
  width: 1000,
  height: 700,
  singleInstance: true,
  keywords: ['schedule', 'events', 'appointments', 'planner'],
});