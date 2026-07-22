(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // True mouse desktops: fine pointer + hover. Do NOT use (pointer: fine) alone —
  // many phones/tablets (and "Request Desktop Website") report fine incorrectly,
  // which previously skipped the entire touch-glow path.
  const mouseDesktop =
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const glow = document.getElementById("cursor-glow");

  // Sticky cursor follow — mouse / trackpad only.
  if (glow && !reduceMotion && mouseDesktop) {
    document.body.classList.add("is-pointer");

    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.4;
    let currentX = targetX;
    let currentY = targetY;
    let rafId = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType && event.pointerType !== "mouse") return;
        targetX = event.clientX;
        targetY = event.clientY;
      },
      { passive: true }
    );

    rafId = window.requestAnimationFrame(tick);

    window.addEventListener(
      "pagehide",
      () => {
        window.cancelAnimationFrame(rafId);
      },
      { once: true }
    );
  }

  // Press / drag glow: pointer events + touch fallback.
  // Runs whenever motion is allowed — if a touch actually fires, show the glow
  // even when the device wrongly reports (pointer: fine).
  if (glow && !reduceMotion) {
    let active = false;
    let pointerId = null;
    let usingTouchFallback = false;
    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.4;
    let currentX = targetX;
    let currentY = targetY;
    let rafId = 0;
    let fadeTimer = 0;

    const spawnReleaseBurst = (x, y) => {
      const burst = document.createElement("span");
      burst.className = "tap-glow tap-glow--release";
      burst.setAttribute("aria-hidden", "true");
      burst.style.left = `${x}px`;
      burst.style.top = `${y}px`;
      document.body.appendChild(burst);

      let removed = false;
      const remove = () => {
        if (removed) return;
        removed = true;
        burst.removeEventListener("animationend", remove);
        burst.remove();
      };
      burst.addEventListener("animationend", remove);
      window.setTimeout(remove, 500);
    };

    const tick = () => {
      if (!active) {
        rafId = 0;
        return;
      }
      // Slightly snappier than desktop sticky follow.
      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      rafId = window.requestAnimationFrame(tick);
    };

    const startFollow = (x, y) => {
      window.clearTimeout(fadeTimer);
      active = true;
      targetX = currentX = x;
      targetY = currentY = y;
      glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      document.body.classList.add("is-touch-glow");
      if (!rafId) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const endFollow = (x, y, withBurst) => {
      if (!active) return;
      active = false;
      pointerId = null;
      usingTouchFallback = false;
      document.body.classList.remove("is-touch-glow");
      if (withBurst) {
        spawnReleaseBurst(x, y);
      }
      // Keep last position until next press; opacity fades via CSS.
      fadeTimer = window.setTimeout(() => {
        if (!active) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
      }, 400);
    };

    // Ignore pure mouse only on real hover desktops (sticky follow owns those).
    // Phones/tablets sometimes report pointerType "mouse" (desktop-site mode).
    const ignoreAsMouse = (event) =>
      mouseDesktop && (event.pointerType === "mouse" || !event.pointerType);

    // --- Pointer Events (preferred) ---
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (ignoreAsMouse(event)) return;
        const type = event.pointerType || "";
        // Accept touch, pen, empty/unknown, and mouse-on-touch devices.
        if (type && type !== "touch" && type !== "pen" && type !== "mouse") return;
        // If touch fallback already owns this gesture, skip.
        if (usingTouchFallback) return;
        pointerId = event.pointerId;
        startFollow(event.clientX, event.clientY);
        try {
          event.target?.setPointerCapture?.(event.pointerId);
        } catch {
          // Capture is best-effort; document listeners still work.
        }
      },
      { passive: true, capture: true }
    );

    document.addEventListener(
      "pointermove",
      (event) => {
        if (!active || usingTouchFallback) return;
        if (pointerId != null && event.pointerId !== pointerId) return;
        if (ignoreAsMouse(event)) return;
        targetX = event.clientX;
        targetY = event.clientY;
      },
      { passive: true, capture: true }
    );

    const onPointerEnd = (event, withBurst) => {
      if (usingTouchFallback) return;
      if (pointerId != null && event.pointerId !== pointerId) return;
      if (ignoreAsMouse(event)) return;
      endFollow(event.clientX, event.clientY, withBurst);
    };

    document.addEventListener(
      "pointerup",
      (event) => onPointerEnd(event, true),
      { passive: true, capture: true }
    );

    document.addEventListener(
      "pointercancel",
      (event) => onPointerEnd(event, false),
      { passive: true, capture: true }
    );

    // --- Touch Events fallback (older iOS / engines without reliable Pointer Events) ---
    const touchPoint = (event) => {
      const t = event.touches[0] || event.changedTouches[0];
      if (!t) return null;
      return { x: t.clientX, y: t.clientY };
    };

    document.addEventListener(
      "touchstart",
      (event) => {
        // Prefer Pointer Events when this gesture already started that way.
        if (active && !usingTouchFallback) return;
        const pt = touchPoint(event);
        if (!pt) return;
        usingTouchFallback = true;
        pointerId = null;
        startFollow(pt.x, pt.y);
      },
      { passive: true, capture: true }
    );

    document.addEventListener(
      "touchmove",
      (event) => {
        if (!active || !usingTouchFallback) return;
        const pt = touchPoint(event);
        if (!pt) return;
        targetX = pt.x;
        targetY = pt.y;
      },
      { passive: true, capture: true }
    );

    document.addEventListener(
      "touchend",
      (event) => {
        if (!usingTouchFallback) return;
        const pt = touchPoint(event);
        endFollow(pt?.x ?? currentX, pt?.y ?? currentY, true);
      },
      { passive: true, capture: true }
    );

    document.addEventListener(
      "touchcancel",
      (event) => {
        if (!usingTouchFallback) return;
        const pt = touchPoint(event);
        endFollow(pt?.x ?? currentX, pt?.y ?? currentY, false);
      },
      { passive: true, capture: true }
    );

    window.addEventListener(
      "pagehide",
      () => {
        window.clearTimeout(fadeTimer);
        window.cancelAnimationFrame(rafId);
      },
      { once: true }
    );
  }

  const openBtn = document.getElementById("notify-open");
  const dialog = document.getElementById("notify-dialog");
  const successDialog = document.getElementById("success-dialog");
  const alreadyDialog = document.getElementById("already-dialog");
  const backdrop = document.getElementById("notify-backdrop");
  const form = document.getElementById("notify-form");
  const statusEl = document.getElementById("notify-status");
  const submitBtn = document.getElementById("notify-submit");
  const emailInput = document.getElementById("notify-email");
  const honeypotInput = document.getElementById("notify-honeypot");
  const successCloseBtn = document.getElementById("success-close");
  const alreadyCloseBtn = document.getElementById("already-close");

  if (!openBtn || !dialog || !backdrop || !form || !successDialog || !alreadyDialog) {
    return;
  }

  const clearHoneypot = () => {
    if (honeypotInput) honeypotInput.value = "";
  };
  clearHoneypot();

  // Password managers sometimes refill honeypots; wipe again when the user
  // interacts with real fields so a human subscribe is not silently dropped.
  emailInput?.addEventListener("focus", clearHoneypot);
  emailInput?.addEventListener("input", clearHoneypot);
  form.phone?.addEventListener("focus", clearHoneypot);
  form.phone?.addEventListener("input", clearHoneypot);

  let resultTimer = 0;

  const setStatus = (message, kind) => {
    if (!statusEl) return;
    if (!message) {
      statusEl.hidden = true;
      statusEl.textContent = "";
      statusEl.className = "notify-status";
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.className = `notify-status is-${kind || "info"}`;
  };

  const hideResultDialogs = () => {
    successDialog.hidden = true;
    successDialog.classList.remove("is-animating");
    alreadyDialog.hidden = true;
    alreadyDialog.classList.remove("is-animating");
  };

  const openSubscribe = () => {
    hideResultDialogs();
    clearHoneypot();
    dialog.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add("notify-open");
    setStatus("");
    emailInput?.focus();
  };

  const closeAll = () => {
    window.clearTimeout(resultTimer);
    dialog.hidden = true;
    hideResultDialogs();
    backdrop.hidden = true;
    document.body.classList.remove("notify-open");
    openBtn.focus();
  };

  const openResultDialog = (resultEl, focusEl) => {
    dialog.hidden = true;
    hideResultDialogs();
    resultEl.hidden = false;
    backdrop.hidden = false;
    document.body.classList.add("notify-open");

    resultEl.classList.remove("is-animating");
    void resultEl.offsetWidth;
    resultEl.classList.add("is-animating");

    focusEl?.focus();

    window.clearTimeout(resultTimer);
    resultTimer = window.setTimeout(() => {
      closeAll();
    }, 4200);
  };

  const openSuccess = () => openResultDialog(successDialog, successCloseBtn);
  const openAlready = () => openResultDialog(alreadyDialog, alreadyCloseBtn);

  openBtn.addEventListener("click", openSubscribe);

  document.querySelectorAll("[data-notify-close]").forEach((el) => {
    el.addEventListener("click", closeAll);
  });

  document.querySelectorAll("[data-success-close]").forEach((el) => {
    el.addEventListener("click", closeAll);
  });

  document.querySelectorAll("[data-already-close]").forEach((el) => {
    el.addEventListener("click", closeAll);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!dialog.hidden || !successDialog.hidden || !alreadyDialog.hidden) {
      closeAll();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    const email = String(form.email.value || "").trim();
    const phone = String(form.phone.value || "").trim();

    // Controlled JSON body: never forward an autofilled honeypot. Bots that POST
    // directly with a trap field and no email still get the server silent-ok path.
    clearHoneypot();

    if (!email) {
      setStatus("Please enter your email.", "error");
      emailInput?.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, phone, website_url_hp: "" }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok || !data.ok) {
        setStatus(data.error || "Something went wrong. Please try again.", "error");
        return;
      }

      form.reset();
      clearHoneypot();
      if (data.already) {
        openAlready();
      } else {
        openSuccess();
      }
    } catch {
      setStatus("Network error. Please try again.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Notify me";
    }
  });
})();
