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

  const poll = document.getElementById('feature-poll');
  if (poll) {
    const projectUrl = 'https://pqblykfmvmqmsmqsfsld.supabase.co';
    const publicKey = 'sb_publishable_uXvsXMwogAeBICKJQJIC2g_XJqbs0pP';
    const turnstileSiteKey = '0x4AAAAAAFOZjgAjfPbONu83';
    const button = poll.querySelector('button[type="submit"]');
    const status = poll.querySelector('[role="status"]');
    let token = '';
    let submitting = false;
    let complete = false;
    let pendingVote = null;
    let widget;

    const resultsStatus = document.getElementById('poll-results-status');
    const resultsList = document.getElementById('poll-results-list');
    const refresh = document.getElementById('poll-results-refresh');
    let resultsRefreshPending = false;
    async function loadResults() {
      if (refresh.disabled) {
        resultsRefreshPending = true;
        return;
      }
      refresh.disabled = true;
      resultsStatus.textContent = 'Uitslag laden…';
      try {
        const response = await fetch(projectUrl + '/functions/v1/feature-poll', {
          headers: { apikey: publicKey },
          cache: 'no-store',
          signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error('Results unavailable');
        const data = await response.json();
        const options = Array.from(poll.querySelectorAll('input[type="radio"]'));
        if (!Array.isArray(data.results) || data.results.some(row =>
          !row || !options.some(option => option.value === row.choice) ||
          !Number.isSafeInteger(row.votes) || row.votes < 0
        ) || new Set(data.results.map(row => row.choice)).size !== data.results.length) {
          throw new Error('Invalid results');
        }
        const total = data.results.reduce((sum, row) => sum + row.votes, 0);
        if (!Number.isSafeInteger(total)) throw new Error('Invalid total');
        const items = options.map(option => {
          const votes = data.results.find(row => row.choice === option.value)?.votes || 0;
          const percentage = total ? Math.round(votes / total * 100) : 0;
          const label = option.closest('label').querySelector('strong').textContent;
          const item = document.createElement('li');
          const name = document.createElement('span');
          name.textContent = label;
          const count = document.createElement('strong');
          count.textContent = votes + (votes === 1 ? ' stem' : ' stemmen') + ' · ' + percentage + '%';
          const meter = document.createElement('meter');
          meter.min = 0;
          meter.max = 100;
          meter.value = percentage;
          meter.setAttribute('aria-label', label + ': ' + percentage + '%');
          item.append(name, count, meter);
          return item;
        });
        resultsList.replaceChildren(...items);
        resultsStatus.textContent = total === 0 ? 'Nog geen stemmen.' :
          total + (total === 1 ? ' stem in totaal.' : ' stemmen in totaal.');
      } catch (_) {
        resultsList.replaceChildren();
        resultsStatus.textContent = 'De uitslag is tijdelijk niet beschikbaar.';
      } finally {
        refresh.disabled = false;
        if (resultsRefreshPending) {
          resultsRefreshPending = false;
          loadResults();
        }
      }
    }
    refresh.addEventListener('click', loadResults);
    loadResults();

    poll.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (submitting || complete || !token || !poll.reportValidity()) return;
      if (poll.querySelector('[name="_gotcha"]').value) return;
      const choice = poll.querySelector('[name="feature_request"]:checked').value;
      if (!pendingVote || pendingVote.choice !== choice) {
        pendingVote = { id: crypto.randomUUID(), choice: choice };
      }
      submitting = true;
      button.disabled = true;
      poll.setAttribute('aria-busy', 'true');
      status.textContent = 'Stem versturen…';
      const controller = new AbortController();
      const timeout = setTimeout(function () { controller.abort(); }, 15000);
      try {
        const response = await fetch(projectUrl + '/functions/v1/feature-poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: publicKey },
          body: JSON.stringify({ ...pendingVote, token: token }),
          signal: controller.signal
        });
        if (!response.ok) throw new Error('Vote rejected');
        const result = await response.json();
        if (result.saved !== true) throw new Error('Vote not confirmed');
        complete = true;
        poll.querySelector('fieldset').disabled = true;
        status.textContent = 'Bedankt! Uw stem is opgeslagen.';
        loadResults();
      } catch (_) {
        status.textContent = 'Uw stem kon niet worden bevestigd. Probeer het opnieuw.';
      } finally {
        clearTimeout(timeout);
        submitting = false;
        token = '';
        poll.removeAttribute('aria-busy');
        if (!complete) window.turnstile.reset(widget);
      }
    });

    if (turnstileSiteKey) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.onload = function () {
        widget = window.turnstile.render('#poll-verification', {
          sitekey: turnstileSiteKey,
          action: 'feature_poll',
          theme: 'dark',
          size: 'compact',
          callback: function (value) {
            token = value;
            button.disabled = submitting || complete;
            if (!submitting && !complete && !pendingVote) status.textContent = '';
          },
          'expired-callback': function () { token = ''; button.disabled = true; },
          'error-callback': function () {
            token = '';
            button.disabled = true;
            status.textContent = 'Spamcontrole niet beschikbaar. Probeer later opnieuw.';
          }
        });
      };
      script.onerror = function () { status.textContent = 'Spamcontrole niet beschikbaar. Probeer later opnieuw.'; };
      document.head.appendChild(script);
    }
  }

  document.querySelectorAll('[data-formspree-form]').forEach(function (form) {
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[role="status"]');
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
  });
})();