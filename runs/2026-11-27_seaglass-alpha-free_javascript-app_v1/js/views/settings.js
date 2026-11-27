/* Fieldwork — settings: theme, storage status, data portability, reset, help. */
(function (App) {
  'use strict';
  var ui = App.ui; var store = App.store; var util = App.util;
  var el = ui.el;

  App.views = App.views || {};
  App.views.settings = function (main) {
    var state = store.getState();
    var status = store.getStatus();
    var container = el('div', { class: 'view view--settings' });
    container.appendChild(el('div', { class: 'page-header' }, [
      el('div', {}, [el('h1', { class: 'page-title', text: 'Settings' }), el('p', { class: 'page-sub', text: 'Appearance, storage, data portability and keyboard help.' })])
    ]));

    /* ---- appearance ---- */
    var theme = (state.settings && state.settings.theme) || 'system';
    var themeField = el('fieldset', { class: 'fieldset' }, [
      el('legend', { class: 'fieldset__legend', text: 'Appearance' }),
      radio('theme', 'system', 'Match system', theme === 'system', onTheme),
      radio('theme', 'light', 'Light', theme === 'light', onTheme),
      radio('theme', 'dark', 'Dark', theme === 'dark', onTheme)
    ]);
    container.appendChild(section('Appearance', themeField));
    function onTheme(e) { var t = e.target.value; store.setTheme(t); if (App.applyTheme) App.applyTheme(); ui.announce('Theme set to ' + t + '.'); }

    /* ---- storage ---- */
    var storageInfo = el('dl', { class: 'deflist' }, [
      def('Storage backend', status.storageAvailable ? 'Browser localStorage (persistent)' : 'In-memory only (not persistent)'),
      def('Last saved', status.lastSavedAt ? util.formatDateTime(status.lastSavedAt) : 'Not saved yet'),
      def('Projects / sources / notes', state.projects.length + ' / ' + state.sources.length + ' / ' + state.notes.length)
    ]);
    var storageCard = el('div', {}, [storageInfo]);
    if (!status.storageAvailable) {
      storageCard.appendChild(el('p', { class: 'notice notice--warn', role: 'status', text:
        'Browser storage is unavailable. Your data will work for this session but will not survive a reload. Use Export to keep a backup.' }));
    }
    if (status.memoryOnly && status.lastSaveError) {
      storageCard.appendChild(el('p', { class: 'notice notice--warn', role: 'status', text: status.lastSaveError }));
    }
    if (status.recovered && status.recoveredReason) {
      storageCard.appendChild(el('p', { class: 'notice notice--warn', role: 'status', text: status.recoveredReason }));
    }
    storageCard.appendChild(el('p', { class: 'notice notice--info', text:
      'Everything is stored locally in your browser. No data is sent to any server. Export a backup to move or protect your data.' }));
    container.appendChild(section('Storage', storageCard));

    /* ---- data portability ---- */
    var dataCard = el('div', { class: 'data-actions' });

    var exportBtn = el('button', { type: 'button', class: 'btn btn-primary', text: 'Export backup (JSON)', on: { click: doExport } });
    var copyBtn = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Copy JSON to clipboard', on: { click: doCopy } });
    dataCard.appendChild(el('div', { class: 'btn-row' }, [exportBtn, copyBtn]));

    // import
    var fileInput = el('input', { type: 'file', id: 'import-file', name: 'import-file', accept: 'application/json,.json', class: 'input input--file', 'aria-describedby': 'import-hint' });
    var modeMerge = radio('import-mode', 'merge', 'Merge (add, skip duplicates)', true, null);
    var modeReplace = radio('import-mode', 'replace', 'Replace all data', false, null);
    var importBtn = el('button', { type: 'button', class: 'btn btn-primary', text: 'Import backup', on: { click: doImport } });
    var importStatus = el('p', { class: 'import-status muted', role: 'status', 'aria-live': 'polite' });
    var importGroup = el('div', { class: 'fieldset' }, [
      el('label', { class: 'field__label', for: 'import-file', text: 'Choose a Fieldwork JSON backup' }),
      fileInput,
      el('p', { class: 'field__hint', id: 'import-hint', text: 'Only valid Fieldwork backups are accepted. Invalid files are rejected without changing your data.' }),
      el('fieldset', { class: 'fieldset fieldset--inline' }, [el('legend', { class: 'fieldset__legend', text: 'Import mode' }), modeMerge, modeReplace]),
      el('div', { class: 'btn-row' }, [importBtn]),
      importStatus
    ]);
    dataCard.appendChild(importGroup);
    container.appendChild(section('Data portability', dataCard));

    function doExport() {
      try {
        var json = store.exportJson();
        var stamp = new Date().toISOString().slice(0, 10);
        var ok = util.download('fieldwork-backup-' + stamp + '.json', json, 'application/json');
        if (ok) ui.toast('Backup exported.', 'success'); else ui.toast('Could not create the download; try Copy JSON instead.', 'error');
      } catch (e) { ui.toast('Export failed.', 'error'); }
    }
    function doCopy() {
      var json;
      try { json = store.exportJson(); } catch (e) { ui.toast('Copy failed.', 'error'); return; }
      util.copyToClipboard(json).then(function (ok) { ui.toast(ok ? 'JSON copied to clipboard.' : 'Could not copy automatically; export instead.', ok ? 'success' : 'error'); });
    }
    function doImport() {
      var file = fileInput.files && fileInput.files[0];
      if (!file) { importStatus.textContent = 'Choose a JSON file first.'; ui.toast('Choose a JSON file first.', 'error'); return; }
      var mode = modeReplace.querySelector('input').checked ? 'replace' : 'merge';
      // guard against huge files
      if (file.size > 25 * 1024 * 1024) { importStatus.textContent = 'That file is too large (max 25 MB).'; ui.toast('File too large.', 'error'); return; }
      var reader = new FileReader();
      reader.onerror = function () { importStatus.textContent = 'Could not read that file.'; ui.toast('Could not read file.', 'error'); };
      reader.onload = function () {
        var text = String(reader.result || '');
        // confirm replace
        proceed(text, mode);
      };
      try { reader.readAsText(file); } catch (e) { importStatus.textContent = 'Could not read that file.'; ui.toast('Could not read file.', 'error'); }

      function proceed(text, mode) {
        var run = function () {
          var res;
          try { res = store.importJson(text, { mode: mode }); } catch (e) { res = { ok: false, error: 'Import failed.' }; }
          if (!res.ok) { importStatus.textContent = res.error || 'Import failed.'; ui.toast(res.error || 'Import failed.', 'error'); return; }
          var added = res.added || {};
          var msg = mode === 'replace'
            ? 'Replaced all data. Now ' + res.after.projects + ' projects, ' + res.after.sources + ' sources, ' + res.after.notes + ' notes.'
            : 'Merged. Added ' + (added.projects || 0) + ' projects, ' + (added.sources || 0) + ' sources, ' + (added.notes || 0) + ' notes.';
          importStatus.textContent = msg;
          ui.toast('Import complete.', 'success');
          if (App.renderRoute) App.renderRoute();
        };
        if (mode === 'replace') {
          ui.confirmDialog({
            title: 'Replace all data?',
            message: 'This will delete your current data and replace it with the backup. Consider exporting a backup first.',
            confirmLabel: 'Replace all data', danger: true
          }).then(function (ok) { if (ok) run(); });
        } else { run(); }
      }
    }

    /* ---- danger zone ---- */
    var danger = el('div', {}, [
      el('p', { class: 'muted', text: 'Permanently remove all projects, sources and notes from this browser. Export a backup first.' }),
      el('button', { type: 'button', class: 'btn btn-danger', text: 'Delete all data', on: { click: doReset } })
    ]);
    container.appendChild(section('Danger zone', danger));
    function doReset() {
      ui.confirmDialog({ title: 'Delete all data?', message: 'This permanently erases every project, source, note and tag in this browser. This cannot be undone.', confirmLabel: 'Delete everything', danger: true })
        .then(function (ok) { if (!ok) return; store.resetAll(); ui.toast('All data deleted.', 'success'); if (App.renderRoute) App.renderRoute(); });
    }

    /* ---- keyboard help ---- */
    var keys = el('div', { class: 'keys' }, [
      keyRow('Tab / Shift+Tab', 'Move between controls'),
      keyRow('Enter / Space', 'Activate buttons and links'),
      keyRow('/', 'Jump to global search'),
      keyRow('Esc', 'Close a dialog'),
      keyRow('Arrow keys', 'Navigate within menus and dialogs'),
      keyRow('Ctrl/Cmd + F', 'Browser find within page')
    ]);
    container.appendChild(section('Keyboard', keys));

    /* ---- about ---- */
    container.appendChild(section('About', el('div', {}, [
      el('p', {}, ['Fieldwork is a vanilla-JavaScript, local-first research workspace. No frameworks, no build step, no server, zero dependencies.']),
      el('p', { class: 'muted', text: 'Data model: Projects contain Sources (with nested Excerpts) and Notes; Notes may link to a Source. All data lives in this browser.' }),
      el('p', { class: 'muted', text: 'Limitations: no real-time collaboration, no cloud sync, no rich-text editor, and import/export uses a single JSON file. There is no backend, so \u201Cno server\u201D means nothing is transmitted; it also means no sharing.' })
    ])));

    main.appendChild(container);

    /* ---- helpers ---- */
    function section(title, content) {
      return el('section', { class: 'card settings-section', 'aria-label': title }, [el('h2', { class: 'section-title', text: title }), content]);
    }
    function def(term, val) { return el('div', { class: 'deflist__row' }, [el('dt', { text: term }), el('dd', { text: val })]); }
    function keyRow(k, d) { return el('div', { class: 'keys__row' }, [el('kbd', { text: k }), el('span', { text: d })]); }
    function radio(name, value, label, checked, onChange) {
      var id = name + '-' + value + '-' + (++radio._n || (radio._n = 1));
      var input = el('input', { type: 'radio', name: name, value: value, id: id, checked: checked });
      if (onChange) input.addEventListener('change', onChange);
      return el('label', { class: 'radio', for: id }, [input, el('span', { text: label })]);
    }
  };
})(window.App = window.App || {});
