/* ============================================================
   Vectra Studio — boot
   ============================================================ */
'use strict';
(() => {
  function start() {
    App.R.init();
    App.UI.init();
    App.I.init();
    App.F.init();

    const saved = App.store.loadSaved();
    if (saved && saved.doc.shapes.length) {
      App.state.doc = saved.doc;
      if (saved.view && isFinite(saved.view.k) && saved.view.k > 0) {
        Object.assign(App.state.view, saved.view);
      }
      App.docApi.docChanged();
      App.hist.init();
      App.docApi.viewChanged();
      App.UI.toast('Restored your last drawing session');
    } else {
      App.state.doc = App.SAMPLE.doc();
      App.docApi.docChanged();
      App.hist.init();
      App.R.fitPage();
    }

    App.UI.refreshAll();
    App.R.renderOverlay();
    window.addEventListener('beforeunload', () => App.store.saveNow());
    // periodic autosave safety net
    setInterval(() => App.store.saveNow(), 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
