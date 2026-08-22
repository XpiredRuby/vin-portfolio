/* Accessible, dependency-free command palette.
   Progressive enhancement: the portfolio remains fully navigable without it. */
(function () {
  'use strict';

  if (!('HTMLDialogElement' in window)) { return; }

  var scriptSrc = document.currentScript && document.currentScript.src;
  if (!scriptSrc) { return; }

  var siteRoot = new URL('../../', scriptSrc);
  /* Inherit this script's version so the index cannot be served stale. */
  var version = new URL(scriptSrc).search;
  var indexUrl = new URL('../data/search-index.json' + version, scriptSrc);
  var textIndexUrl = new URL('../data/search-text.json' + version, scriptSrc);
  var fallbackEntries = [
    { title: 'About', subtitle: 'Engineering identity', href: 'about.html', kind: 'Page', tags: ['about'] },
    { title: 'Projects', subtitle: 'Engineering case studies', href: 'projects.html', kind: 'Page', tags: ['projects'] },
    { title: 'Experience', subtitle: 'Professional engineering roles', href: 'experience.html', kind: 'Page', tags: ['experience'] },
    { title: 'Skills', subtitle: 'Technical capabilities and tools', href: 'skills.html', kind: 'Page', tags: ['skills'] },
    { title: 'Contact', subtitle: 'Get in touch', href: 'contact.html', kind: 'Page', tags: ['contact'] }
  ];
  var entries = fallbackEntries;
  /* Section-level page text. ~105 KB, so it is fetched on first open rather
     than on every page load: nobody can search before the palette exists. */
  var sections = [];
  var sectionsRequested = false;
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
    if (!query) {
      if (entry.kind === 'Project') { return 40; }
      if (entry.kind === 'Model') { return 30; }
      return entry.kind === 'Tool' ? 5 : 20;
    }
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
    else if (entry.kind === 'Model') { score += 6; }
    else if (entry.kind === 'Tool') { score += 7; }
    return score;
  }

  function occurrences(haystack, token) {
    var n = 0;
    var at = haystack.indexOf(token);
    while (at !== -1) { n += 1; at = haystack.indexOf(token, at + token.length); }
    return n;
  }

  /* Score a page section. Every token must appear somewhere, and a body hit is
     divided by the square root of the section length: without that, one passing
     mention inside a 6,000-character landing page outranks the section actually
     about the term — "Abaqus" returned the contact page above the skill grid. */
  function scoreSection(section, tokens) {
    var heading = section._h || (section._h = normalize(section.s));
    var page = section._p || (section._p = normalize(section.p));
    var body = section._n || (section._n = normalize(section.x));
    var density = Math.sqrt(Math.max(body.length, 120) / 120);
    var score = 0;

    for (var i = 0; i < tokens.length; i += 1) {
      var token = tokens[i];
      var inHeading = heading.includes(token);
      var inPage = page.includes(token);
      var hits = occurrences(body, token);
      if (!inHeading && !inPage && !hits) { return -1; }

      if (inHeading) { score += heading === token ? 34 : 24; }
      if (inPage) { score += 14; }
      // Repeat mentions help, but with diminishing returns.
      score += (Math.min(hits, 4) * 9) / density;
    }

    // Whole-phrase hits beat scattered tokens.
    if (tokens.length > 1) {
      var phrase = tokens.join(' ');
      if (heading.includes(phrase)) { score += 30; }
      else if (body.includes(phrase)) { score += 18; }
    }

    /* Preference is applied as a multiplier, never a subtraction. Subtracting
       drove weak-but-real hits below the -1 that means "no match", so "Abaqus"
       and "Onshape" — which appear only in long page-level buckets — returned
       nothing at all; clamping them to a floor instead collapsed their order
       into a tie. Scaling keeps every genuine hit positive and still ranked. */
    // A case study is a better answer than a page that merely lists the word.
    if (section.h.indexOf('projects/') === 0) { score *= 1.6; }
    // A whole-page bucket is the least specific place a term can live.
    if (section.h.indexOf('#') === -1) { score *= 0.55; }
    return score;
  }

  /* Show the sentence the match sits in, so a reviewer can tell whether the
     hit is the one they wanted without opening the page. */
  function excerpt(section, tokens) {
    var text = section.x;
    var lower = text.toLowerCase();
    var at = -1;
    for (var i = 0; i < tokens.length && at < 0; i += 1) {
      at = lower.indexOf(tokens[i]);
    }
    if (at < 0) { return text.slice(0, 120); }
    var start = Math.max(0, at - 46);
    var end = Math.min(text.length, at + 96);
    // Avoid cutting mid-word at either end.
    if (start > 0) { start = text.indexOf(' ', start) + 1 || start; }
    if (end < text.length) {
      var stop = text.lastIndexOf(' ', end);
      if (stop > start) { end = stop; }
    }
    return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Mark every query token in an already-escaped string. */
  function highlight(value, tokens) {
    var html = escapeHtml(value);
    for (var i = 0; i < tokens.length; i += 1) {
      var token = tokens[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (!token) { continue; }
      html = html.replace(new RegExp('(' + token + ')(?![^<]*>)', 'ig'), '<mark>$1</mark>');
    }
    return html;
  }

  function loadSections() {
    if (sectionsRequested) { return; }
    sectionsRequested = true;
    fetch(textIndexUrl)
      .then(function (response) {
        if (!response.ok) { throw new Error('Text index unavailable'); }
        return response.json();
      })
      .then(function (data) {
        sections = (data && data.sections) || [];
        /* Tool entries are curated in shape, so they join the top tier and
           rank against the hand-written navigation rather than behind it. */
        if (data && data.tools && data.tools.length) {
          entries = entries.concat(data.tools);
        }
        if (dialog.open) { render(input.value); }
      })
      .catch(function () { sections = []; });
  }

  function resolveHref(entry) {
    if (/^https?:\/\//i.test(entry.href)) { return entry.href; }
    return new URL(entry.href, siteRoot).href;
  }

  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'command-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
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
        '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path d="m21 21-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"/></svg>' +
        '<input id="command-input" type="search" autocomplete="off" spellcheck="false" placeholder="Search projects, models, skills, pages…" aria-controls="command-results" aria-autocomplete="list">' +
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
    var tokens = normalize(query).split(/\s+/).filter(Boolean);

    var ranked = entries
      .map(function (entry) { return { entry: entry, score: scoreEntry(entry, query) }; })
      .filter(function (item) { return item.score >= 0; })
      .sort(function (a, b) { return b.score - a.score || a.entry.title.localeCompare(b.entry.title); })
      .slice(0, 8)
      .map(function (item, rank) {
        var entry = item.entry;
        return {
          href: resolveHref(entry),
          title: escapeHtml(entry.title),
          detail: escapeHtml(entry.subtitle),
          kind: escapeHtml(entry.kind),
          external: !!entry.external,
          sort: 1000 - rank
        };
      });

    /* Full-text hits only make sense once there is something to match. One
       result per page keeps a single verbose case study from filling the list. */
    var deep = [];
    if (tokens.length) {
      var seen = {};
      sections
        .map(function (section) { return { section: section, score: scoreSection(section, tokens) }; })
        .filter(function (item) { return item.score >= 0; })
        .sort(function (a, b) { return b.score - a.score; })
        .forEach(function (item) {
          var page = item.section.h.split('#')[0];
          if (seen[page] || deep.length >= 6) { return; }
          seen[page] = true;
          // Lead with the page, because that is the question a reviewer is
          // answering ("where does this live?"); the section and the matched
          // sentence follow underneath.
          deep.push({
            href: new URL(item.section.h, siteRoot).href,
            title: highlight(item.section.p.split(':')[0].split('|')[0].trim(), tokens),
            where: highlight(item.section.s, tokens),
            detail: highlight(excerpt(item.section, tokens), tokens),
            kind: 'In page',
            external: false,
            sort: item.score,
            deep: true
          });
        });
    }

    var shown = ranked.concat(deep).slice(0, 12);
    if (!shown.length) {
      results.innerHTML = '<p class="command-palette__empty">' +
        (sectionsRequested && !sections.length
          ? 'No matching project or page.'
          : 'No match in any project, page or case-study section.') +
        '</p>';
      setActive(0);
      return;
    }

    results.innerHTML = shown.map(function (item, index) {
      return '' +
        '<a id="command-result-' + index + '" class="command-result' + (item.deep ? ' command-result--deep' : '') + '" role="option" aria-selected="false" href="' + item.href + '"' + (item.external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
          '<span class="command-result__copy"><strong>' + item.title + '</strong>' +
            (item.where ? '<span class="command-result__where">' + item.where + '</span>' : '') +
            '<small>' + item.detail + '</small></span>' +
          '<span class="command-result__kind">' + item.kind + '</span>' +
        '</a>';
    }).join('');
    setActive(0);
  }

  function openPalette(origin) {
    loadSections();
    lastTrigger = origin || document.activeElement;
    if (!dialog.open) { dialog.showModal(); }
    trigger.setAttribute('aria-expanded', 'true');
    input.value = '';
    render('');
    requestAnimationFrame(function () { input.focus(); });
  }

  trigger.addEventListener('click', function () { openPalette(trigger); });
  closeButton.addEventListener('click', function () { dialog.close(); });

  dialog.addEventListener('close', function () {
    trigger.setAttribute('aria-expanded', 'false');
    if (lastTrigger && typeof lastTrigger.focus === 'function') { lastTrigger.focus(); }
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) { dialog.close(); }
    else if (event.target.closest && event.target.closest('.command-result')) { dialog.close(); }
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
      entries = fallbackEntries;
      render('');
    });
})();
