(function () {
  "use strict";

  /* Mobile nav toggle */
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      siteNav.classList.toggle("is-open");
    });

    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.matchMedia("(max-width: 639px)").matches) {
          navToggle.setAttribute("aria-expanded", "false");
          siteNav.classList.remove("is-open");
        }
      });
    });
  }

  /* Subtle fade-in on scroll for project cards */
  const fadeElements = document.querySelectorAll(".fade-in");

  if (fadeElements.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    fadeElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    fadeElements.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* Mission control clocks (homepage) */
  const utcClock = document.getElementById("utc-clock");
  const elapsedClock = document.getElementById("elapsed-clock");

  if (utcClock && elapsedClock) {
    const T0 = Date.UTC(2025, 0, 1, 0, 0, 0);

    function pad(n) {
      return String(n).padStart(2, "0");
    }

    function updateClocks() {
      const now = new Date();
      const h = pad(now.getUTCHours());
      const m = pad(now.getUTCMinutes());
      const s = pad(now.getUTCSeconds());
      const utcString = h + ":" + m + ":" + s + " UTC";

      utcClock.textContent = utcString;
      utcClock.setAttribute("datetime", now.toISOString());

      const elapsedMs = now.getTime() - T0;
      const days = Math.floor(elapsedMs / 86400000);
      const hours = Math.floor((elapsedMs % 86400000) / 3600000);
      const minutes = Math.floor((elapsedMs % 3600000) / 60000);

      elapsedClock.textContent = "T+" + days + "d " + hours + "h " + minutes + "m";
    }

    updateClocks();
    setInterval(updateClocks, 1000);
  }

  /* Homepage creative console features */
  const missionConsole = document.querySelector(".mission-console");

  if (missionConsole) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* Boot sequence — once per session */
  const bootEl = document.getElementById("boot-sequence");
  const bootSkip = document.getElementById("boot-skip");

  function dismissBoot() {
    if (!bootEl) return;
    bootEl.hidden = true;
    document.body.classList.remove("boot-active");
    try {
      sessionStorage.setItem("vn-boot-seen", "1");
    } catch (e) { /* ignore */ }
  }

  if (bootEl && !reducedMotion) {
    try {
      if (!sessionStorage.getItem("vn-boot-seen")) {
        bootEl.hidden = false;
        document.body.classList.add("boot-active");
        setTimeout(dismissBoot, 2200);
      }
    } catch (e) {
      bootEl.hidden = true;
    }
  }

  if (bootSkip) {
    bootSkip.addEventListener("click", dismissBoot);
  }

  /* Cursor track + heading readout */
  const cursorTrack = document.getElementById("cursor-track");
  const headingValue = document.getElementById("heading-value");

  if (finePointer && cursorTrack) {
    document.addEventListener("mousemove", function (e) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const nx = ((e.clientX - cx) / cx).toFixed(2);
      const ny = ((e.clientY - cy) / cy).toFixed(2);
      const signX = nx >= 0 ? "+" : "";
      const signY = ny >= 0 ? "+" : "";
      cursorTrack.textContent = "X " + signX + nx + " Y " + signY + ny;

      if (headingValue) {
        const dx = e.clientX - cx;
        const dy = cy - e.clientY;
        let hdg = Math.atan2(dx, dy) * (180 / Math.PI);
        if (hdg < 0) hdg += 360;
        headingValue.textContent = String(Math.round(hdg)).padStart(3, "0") + "°";
      }
    }, { passive: true });
  }

  /* Scroll depth + progress bar */
  const scrollDepth = document.getElementById("scroll-depth");
  const scrollProgress = document.getElementById("scroll-progress");

  function updateScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 0;
    const padded = String(pct).padStart(3, "0") + "%";
    if (scrollDepth) scrollDepth.textContent = padded;
    if (scrollProgress) scrollProgress.style.width = pct + "%";
  }

  updateScroll();
  window.addEventListener("scroll", updateScroll, { passive: true });

  /* Pipeline bar fill on view */
  const pipelineBar = document.getElementById("pipeline-bar");
  if (pipelineBar && "IntersectionObserver" in window) {
    const target = pipelineBar.getAttribute("data-target") || "55";
    pipelineBar.style.setProperty("--pipeline-pct", target + "%");
    const pipeObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          pipelineBar.classList.add("is-filled");
          pipeObs.unobserve(pipelineBar);
        }
      });
    }, { threshold: 0.5 });
    pipeObs.observe(pipelineBar);
  }
  }
})();
