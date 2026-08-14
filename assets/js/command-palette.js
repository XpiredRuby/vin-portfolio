/* Accessible, dependency-free command palette.
   Progressive enhancement: the portfolio remains fully navigable without it. */
(function () {
  'use strict';

  if (!('HTMLDialogElement' in window)) { return; }

  var scriptSrc = document.currentScript && document.currentScript.src;
  if (!scriptSrc) { return; }

  var siteRoot = new URL('../../', scriptSrc);
  var indexUrl = new URL('../data/search-index.json', scriptSrc);
  var entries = [];
  var activeIndex = 0;
  var lastTrigger = null;

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function scoreEntry(entry, query) {
    if (!query) { return entry.kind === 'Project' ? 40 : 20; }
    var tokens = normalize(query).split(/\s+/).filter(Boolean);
    var title = normalize(entry.title);
    var subtitle = normalize(entry.subtitle);
    var tags = normalize((entry.tags || []).join(' '));
    var haystack = title + ' ' + subtitle + ' ' + tags;
    var score = 0;

    for (var i = 0; i < tokens.length; i += 1) {
      var token = tokens[i];
      if (!haystack.includes(token)) { return -1; }
      if (title === token) { score += 100; }
      else if (title.startsWith(token)) { score += 65; }
      else if (title.includes(token)) { score += 40; }
      else if (tags.includes(token)) { score += 20; }
      else { score += 10; }
    }

    if (entry.kind === 'Project') { score += 8; }
    return score;
  }

  function resolveHref(entry) {
    if (/^https?:\/\//i.test(entry.href)) { return entry.href; }
    return new URL(entry.href, siteRoot).href;
  }

  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'command-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-label', 'Open quick navigation');
  trigger.innerHTML = '<span>Quick jump</span><kbd>' + (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K') + '</kbd>';

  var nav = document.getElementById('primary-nav');
  if (nav) {
    nav.appendChild(trigger);
  } else {
    document.body.appendChild(trigger);
  }

  var dialog = document.createElement('dialog');
  dialog.className = 'command-palette';
  dialog.setAttribute('aria-labelledby', 'command-title');
  dialog.innerHTML = '' +
    '<div class="command-palette__shell">' +
      '<div class="command-palette__head">' +
        '<div><span class="command-palette__eyebrow">NAVIGATE</span><h2 id="command-title">Jump anywhere</h2></div>' +
        '<button type="button" class="command-palette__close" aria-label="Close quick navigation">Esc</button>' +
      '</div>' +
      '<div class="command-palette__search">' +
        '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"/></svg>' +
        '<input id="command-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search projects, skills, pages…" aria-controls="command-results" aria-autocomplete="list">' +
      '</div>' +
      '<div id="command-results" class="command-palette__results" role="listbox" aria-label="Navigation results"></div>' +
      '<div class="command-palette__foot"><span><kbd>↑</kbd><kbd>↓</kbd> select</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>' +
    '</div>';
  document.body.appendChild(dialog);

  var input = dialog.querySelector('#command-input');
  var results = dialog.querySelector('#command-results');
  var closeButton = dialog.querySelector('.command-palette__close');

  function currentResults() {
    return Array.prototype.slice.call(results.querySelectorAll('[role="option"]'));
  }

  function setActive(next) {
    var items = currentResults();
    if (!items.length) {
      activeIndex = 0;
      input.removeAttribute('aria-activedescendant');
      return;
    }
    activeIndex = (next + items.length) % items.length;
    items.forEach(function (item, index) {
      item.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
    });
    input.setAttribute('aria-activedescendant', items[activeIndex].id);
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function render(query) {
    var ranked = entries
      .map(function (entry) { return { entry: entry, score: scoreEntry(entry, query) }; })
      .filter(function (item) { return item.score >= 0; })
      .sort(function (a, b) { return b.score - a.score || a.entry.title.localeCompare(b.entry.title); })
      .slice(0, 9);

    if (!ranked.length) {
      results.innerHTML = '<p class="command-palette__empty">No matching project or page.</p>';
      setActive(0);
      return;
    }

    results.innerHTML = ranked.map(function (item, index) {
      var entry = item.entry;
      return '' +
        '<a id="command-result-' + index + '" class="command-result" role="option" aria-selected="false" href="' + resolveHref(entry) + '"' + (entry.external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
          '<span class="command-result__copy"><strong>' + entry.title + '</strong><small>' + entry.subtitle + '</small></span>' +
          '<span class="command-result__kind">' + entry.kind + '</span>' +
        '</a>';
    }).join('');
    setActive(0);
  }

  function openPalette(origin) {
    lastTrigger = origin || document.activeElement;
    if (!dialog.open) { dialog.showModal(); }
    input.value = '';
    render('');
    requestAnimationFrame(function () { input.focus(); });
  }

  trigger.addEventListener('click', function () { openPalette(trigger); });
  closeButton.addEventListener('click', function () { dialog.close(); });

  dialog.addEventListener('close', function () {
    if (lastTrigger && typeof lastTrigger.focus === 'function') { lastTrigger.focus(); }
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) { dialog.close(); }
  });

  input.addEventListener('input', function () { render(input.value); });
  input.addEventListener('keydown', function (event) {
    var items = currentResults();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === 'Enter' && items[activeIndex]) {
      event.preventDefault();
      items[activeIndex].click();
    }
  });

  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog.open) { dialog.close(); }
      else { openPalette(document.activeElement); }
    }
  });

  fetch(indexUrl)
    .then(function (response) {
      if (!response.ok) { throw new Error('Search index unavailable'); }
      return response.json();
    })
    .then(function (data) {
      entries = Array.isArray(data) ? data : [];
      render('');
    })
    .catch(function () {
      entries = [
        { title: 'About', subtitle: 'Engineering identity', href: 'about.html', kind: 'Page', tags: ['about'] },
        { title: 'Projects', subtitle: 'Engineering case studies', href: 'projects.html', kind: 'Page', tags: ['projects'] },
        { title: 'Experience', subtitle: 'Professional engineering roles', href: 'experience.html', kind: 'Page', tags: ['experience'] },
        { title: 'Skills', subtitle: 'Capabilities and live GitHub repositories', href: 'skills.html', kind: 'Page', tags: ['skills', 'github'] },
        { title: 'Contact', subtitle: 'Get in touch', href: 'contact.html', kind: 'Page', tags: ['contact'] }
      ];
      render('');
    });
})();
