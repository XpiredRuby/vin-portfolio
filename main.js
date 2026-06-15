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
})();
