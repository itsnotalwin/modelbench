// Monochrome interactive script — strictly no external dependencies
// Works from file:// and GitHub Pages

(function() {
  // Focus-visible enhancement for navigation links
  const navLinks = document.querySelectorAll('.main-nav a');

  navLinks.forEach(link => {
    link.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  });

  // Skip link accessibility
  const skipLink = document.querySelector('.skip-link a');
  const mainContent = document.getElementById('main');

  if (skipLink && mainContent) {
    skipLink.addEventListener('click', function(e) {
      e.preventDefault();
      mainContent.focus();
    });
  }

  // Sticky header on scroll (respects reduced motion)
  let lastScroll = 0;
  const header = document.querySelector('header');

  if (header) {
    window.addEventListener('scroll', function() {
      const currentScroll = window.pageYOffset;
      
      if (prefersReducedMotion()) {
        return;
      }

      if (currentScroll > lastScroll && currentScroll > 100) {
        header.style.transform = 'translateY(-100%)';
      } else {
        header.style.transform = 'translateY(0)';
      }
      lastScroll = currentScroll <= 0 ? 0 : currentScroll;
    }, { passive: true });
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Reveal animations on scroll (respected prefers-reduced-motion)
  const observeElements = function() {
    if (prefersReducedMotion()) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.section:not(.hero)').forEach(section => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      section.style.transition = 'opacity var(--transition-fast), transform var(--transition-fast)';
      observer.observe(section);
    });
  };

  // Initialize
  observeElements();

  // Smooth focus management for nav
  const focusNavFirst = function() {
    const firstLink = document.querySelector('.main-nav a');
    if (firstLink) firstLink.focus();
  };

  // Check on page load if we're not already focused
  if (document.activeElement === document.body) {
    focusNavFirst();
  }
})();