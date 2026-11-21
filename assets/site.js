/*
 * BDT Talent Group — Unified Navigation, Motion & Inquiry Script
 * Keeps mobile hamburger sheet, desktop Follow drawer ([hidden]-backed),
 * active nav highlighting, subtle scroll-reveals, and Formspree AJAX intact.
 */
(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktopQuery = window.matchMedia("(min-width: 961px)");

  const onMediaChange = (mq, fn) => {
    if (typeof mq.addEventListener === "function") mq.addEventListener("change", fn);
    else mq.addListener(fn);
  };

  // Current year
  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Header scroll state
  const header = document.querySelector(".site-header");
  if (header) {
    let scrollTick = 0;
    const syncHeader = () => {
      scrollTick = 0;
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    const queueHeader = () => {
      if (!scrollTick) scrollTick = window.requestAnimationFrame(syncHeader);
    };
    window.addEventListener("scroll", queueHeader, { passive: true });
    syncHeader();
  }

  // Mobile hamburger menu
  const menuToggle = document.querySelector(".menu-toggle");
  const menu = document.getElementById("primary-menu");
  const menuLabel = menuToggle?.querySelector(".menu-toggle-label");

  if (menuToggle && menu) {
    const setMenuOpen = (open) => {
      menu.classList.toggle("is-open", open);
      root.classList.toggle("menu-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      if (menuLabel) menuLabel.textContent = open ? "Close" : "Menu";
    };

    menuToggle.addEventListener("click", () => {
      setMenuOpen(!menu.classList.contains("is-open"));
    });

    menu.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) {
        setMenuOpen(false);
      }
    });

    document.addEventListener("pointerdown", (event) => {
      if (!menu.classList.contains("is-open")) return;
      const target = event.target;
      if (target instanceof Node && (menu.contains(target) || menuToggle.contains(target))) return;
      setMenuOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        setMenuOpen(false);
        menuToggle.focus();
      }
    });

    onMediaChange(desktopQuery, (e) => {
      if (e.matches) setMenuOpen(false);
    });
  }

  // Desktop Follow social dropdown ([hidden]-backed — immune to ghosting)
  const socialToggle = document.querySelector(".social-toggle");
  const socialMenu = document.getElementById("social-links");

  if (socialToggle && socialMenu) {
    const setSocialOpen = (open) => {
      socialMenu.hidden = !open;
      socialToggle.setAttribute("aria-expanded", String(open));
    };

    socialToggle.addEventListener("click", () => {
      setSocialOpen(socialMenu.hidden);
    });

    document.addEventListener("pointerdown", (event) => {
      if (socialMenu.hidden) return;
      const target = event.target;
      if (target instanceof Node && (socialMenu.contains(target) || socialToggle.contains(target))) return;
      setSocialOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !socialMenu.hidden) {
        setSocialOpen(false);
        socialToggle.focus();
      }
    });

    socialMenu.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) {
        setSocialOpen(false);
      }
    });

    onMediaChange(desktopQuery, () => setSocialOpen(false));
  }

  // Active nav section highlight on homepage
  const navSectionLinks = Array.from(document.querySelectorAll('.nav-links > a[href^="#"]'));
  const setActiveNav = (hash) => {
    navSectionLinks.forEach((link) => {
      const active = link.getAttribute("href") === hash;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  navSectionLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const hash = link.getAttribute("href");
      if (hash) setActiveNav(hash);
    });
  });

  if (window.location.hash) setActiveNav(window.location.hash);

  const navSections = navSectionLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && navSections.length) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveNav(`#${visible.target.id}`);
      },
      { rootMargin: "-22% 0px -58% 0px", threshold: [0.1, 0.35] }
    );
    navSections.forEach((section) => navObserver.observe(section));
  }

  // Subtle progressive scroll-reveal animations
  const revealItems = Array.from(document.querySelectorAll(".reveal"));
  let revealObserver = null;

  const showAllReveals = () => {
    revealObserver?.disconnect();
    root.classList.remove("reveal-enabled");
    revealItems.forEach((item) => {
      item.classList.remove("reveal-pending");
      item.classList.add("is-visible");
    });
  };

  if (revealItems.length && !reduceMotion.matches && "IntersectionObserver" in window) {
    try {
      document.querySelectorAll(".ledger-grid, .plates-grid, .directory-list, .product-duo").forEach((group) => {
        group.querySelectorAll(".reveal").forEach((item, index) => {
          item.style.setProperty("--reveal-delay", `${Math.min(index * 80, 240)}ms`);
        });
      });

      const pending = [];
      revealItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92) {
          item.classList.add("is-visible");
        } else {
          item.classList.add("reveal-pending");
          pending.push(item);
        }
      });

      if (pending.length) {
        revealObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-visible");
              revealObserver?.unobserve(entry.target);
            });
          },
          { threshold: 0.06, rootMargin: "0px 0px -6% 0px" }
        );
        pending.forEach((item) => revealObserver.observe(item));
        root.classList.add("reveal-enabled");
      }

      onMediaChange(reduceMotion, (e) => {
        if (e.matches) showAllReveals();
      });
    } catch {
      showAllReveals();
    }
  } else {
    showAllReveals();
  }

  // Contact / Support AJAX submission via Formspree (shared window.BDTForms)
  const contactForm = document.querySelector(".contact-form");

  function showToast(message, isError = false) {
    const existing = document.getElementById("bdt-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "bdt-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.textContent = message;

    Object.assign(toast.style, {
      position: "fixed",
      bottom: "28px",
      left: "50%",
      transform: "translateX(-50%) translateY(14px)",
      zIndex: "9999",
      padding: "14px 22px",
      borderRadius: "2px",
      border: isError
        ? "1px solid rgba(255, 110, 110, 0.55)"
        : "1px solid rgba(217, 183, 126, 0.55)",
      background: isError
        ? "rgba(56, 12, 16, 0.95)"
        : "rgba(13, 11, 16, 0.96)",
      color: isError ? "#ffb8b8" : "#f4e2bd",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: "0.78rem",
      fontWeight: "600",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      boxShadow: "0 16px 42px rgba(0, 0, 0, 0.65)",
      opacity: "0",
      transition: "opacity 240ms ease, transform 240ms ease",
      width: "max-content",
      maxWidth: "calc(100vw - 40px)",
      whiteSpace: "normal",
      overflowWrap: "anywhere",
      boxSizing: "border-box",
      pointerEvents: "none",
    });

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateX(-50%) translateY(0)";
      });
    });

    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(8px)";
      window.setTimeout(() => toast.remove(), 280);
    }, isError ? 5000 : 3800);
  }

  if (contactForm && window.BDTForms) {
    window.BDTForms.attach(contactForm, {
      report: showToast,
      sending: "Sending your message…",
      success: "Message sent — we'll be in touch.",
    });
  }
})();
