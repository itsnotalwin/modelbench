// ClearOps — client-side enhancements (progressive, no build step).
document.addEventListener("DOMContentLoaded", function () {
  // Confirm destructive actions.
  document.querySelectorAll("form[data-confirm]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      if (!confirm(form.dataset.confirm)) e.preventDefault();
    });
  });

  // Auto-hide flash messages after 8 seconds.
  setTimeout(function () {
    document.querySelectorAll(".flash").forEach(function (el) {
      el.style.transition = "opacity 0.4s";
      el.style.opacity = "0";
      setTimeout(function () { el.remove(); }, 400);
    });
  }, 8000);

  // Select the status option that is the immediate next valid step on detail page.
  var statusSelect = document.querySelector("form[action*='/status'] select");
  if (statusSelect) {
    var options = Array.from(statusSelect.options);
    var current = options.find(function (o) { return o.selected; });
    if (current) {
      var idx = options.indexOf(current);
      // Move focus to the Update button when status changes.
      statusSelect.addEventListener("change", function () {
        var btn = statusSelect.closest("form").querySelector('button[type="submit"]');
        if (btn) btn.focus();
      });
    }
  }

  // Numeric currency fields: keep two decimals on blur.
  document.querySelectorAll('input[type="number"][step="0.01"]').forEach(function (el) {
    el.addEventListener("blur", function () {
      var v = parseFloat(el.value);
      if (!isNaN(v)) el.value = v.toFixed(2);
    });
  });
});
