(function () {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  if (toggle && nav) {
    function closeMenu() {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Menu openen');
      toggle.innerHTML = '<i class="ti ti-menu-2" aria-hidden="true"></i>';
    }

    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
      toggle.innerHTML = open
        ? '<i class="ti ti-x" aria-hidden="true"></i>'
        : '<i class="ti ti-menu-2" aria-hidden="true"></i>';
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
    document.addEventListener('click', function (event) {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('open')) {
        closeMenu();
        toggle.focus();
      }
    });
    const mobile = window.matchMedia('(max-width: 1100px)');
    mobile.addEventListener('change', closeMenu);
  }

  const form = document.getElementById('sponsor-contact');
  if (form) {
    const button = form.querySelector('button[type="submit"]');
    const status = document.getElementById('contact-status');
    let submitting = false;
    form.addEventListener('submit', function (event) {
      if (submitting) {
        event.preventDefault();
        return;
      }
      submitting = true;
      button.disabled = true;
      form.setAttribute('aria-busy', 'true');
      status.textContent = 'Beveiligde verzending openen…';
    });
    window.addEventListener('pageshow', function () {
      submitting = false;
      button.disabled = false;
      form.removeAttribute('aria-busy');
      status.textContent = '';
    });
  }
})();