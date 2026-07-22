(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const glow = document.getElementById("cursor-glow");

  if (!glow || reduceMotion || !finePointer) {
    return;
  }

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
})();
