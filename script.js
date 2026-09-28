/* =========================================================
   YASH RAJ — Support Portal
   script.js
========================================================= */

/* =========================================================
   ⭐ CONFIGURATION — GOOGLE APPS SCRIPT WEB APP URL
   Deployed Web App URL — this is the live endpoint the portal talks to.
========================================================= */
const CONFIG = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbz9kxgJ7JPlVzJCSDc8tUPf-6N7AJegpSrqnsZHwNzBLtXk0KvWdBR2aZCbASon3abtZA/exec",
  // Sound that plays once, the moment someone starts filling the form.
  START_SOUND: "form-start.mp3",
  // Sound that plays when a ticket is submitted successfully.
  SUCCESS_SOUND: "success-sound.mp3"
};
/* ========================================================= */

(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const isConfigured = () =>
    CONFIG.GAS_URL && CONFIG.GAS_URL.indexOf("PASTE_YOUR") === -1;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
  }
  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  /* ---------- Elements ---------- */
  const form = $("supportForm");
  const successCard = $("successCard");
  const submitBtn = $("submitBtn");
  const submitError = $("submitError");

  const issueShort = $("issueShort");
  const issueLong = $("issueLong");
  const countShort = $("count-issueShort");
  const countLong = $("count-issueLong");

  const fileInput = $("screenshot");
  const fileDrop = $("fileDrop");
  const filePreview = $("filePreview");
  const filePreviewImg = $("filePreviewImg");
  const filePreviewName = $("filePreviewName");
  const filePreviewSize = $("filePreviewSize");
  const fileRemoveBtn = $("fileRemove");
  const fileProcessing = $("fileProcessing");

  const priorityGroup = $("priorityGroup");
  const contactGroup = $("contactGroup");

  const visitCounterEl = $("visitCounter");
  const themeToggle = $("themeToggle");
  const soundToggle = $("soundToggle");
  const header = $("siteHeader");

  /* =========================================================
     Theme toggle (light / dark) with a smooth colour fade
  ========================================================= */
  function setTheme(theme) {
    const root = document.documentElement;
    root.classList.add("theme-anim");
    root.setAttribute("data-theme", theme);
    store("yr_theme", theme);
    setTimeout(() => root.classList.remove("theme-anim"), 600);
  }
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      setTheme(current === "dark" ? "light" : "dark");
    });
  }

  /* =========================================================
     Start-of-form sound
     Plays once when the visitor first touches the form.
     (Browsers only allow audio after a tap/click/keypress, so we
      hook the first real interaction instead of page load.)
  ========================================================= */
  const startSound = new Audio(CONFIG.START_SOUND);
  startSound.preload = "auto";
  startSound.volume = 0.75;

  let soundOn = read("yr_sound") !== "off";
  let soundPlayed = false;

  function syncSoundButton() {
    soundToggle.setAttribute("aria-pressed", String(soundOn));
    soundToggle.setAttribute("aria-label", soundOn ? "Turn form sound off" : "Turn form sound on");
  }
  syncSoundButton();

  soundToggle.addEventListener("click", () => {
    soundOn = !soundOn;
    store("yr_sound", soundOn ? "on" : "off");
    if (!soundOn) startSound.pause();
    syncSoundButton();
  });

  function tryPlayStartSound() {
    if (soundPlayed || !soundOn) return;
    try {
      const attempt = startSound.play();
      if (attempt && typeof attempt.then === "function") {
        attempt.then(() => { soundPlayed = true; }).catch(() => { /* blocked — retry on next interaction */ });
      } else {
        soundPlayed = true;
      }
    } catch (e) { /* ignore */ }
  }

  /* Success sound — played together with the party popper */
  const successSound = new Audio(CONFIG.SUCCESS_SOUND);
  successSound.preload = "auto";
  successSound.volume = 0.9;

  // Mobile browsers only allow audio that was "unlocked" by a tap. The submit
  // tap is a real gesture, so we silently prime the sound then and play it for
  // real when the ticket comes back.
  function primeSuccessSound() {
    try {
      successSound.muted = true;
      const p = successSound.play();
      const done = () => { successSound.pause(); successSound.currentTime = 0; successSound.muted = false; };
      if (p && typeof p.then === "function") p.then(done).catch(() => { successSound.muted = false; });
      else done();
    } catch (e) { successSound.muted = false; }
  }
  function playSuccessSound() {
    if (!soundOn) return;
    try {
      successSound.muted = false;
      successSound.currentTime = 0;
      const p = successSound.play();
      if (p && typeof p.catch === "function") p.catch(() => { /* blocked by browser */ });
    } catch (e) { /* ignore */ }
  }

  const INTERACTIVE = "input, select, textarea, button, label, .file-drop";
  function onFormTouch(e) {
    if (e.target && e.target.closest && e.target.closest(INTERACTIVE)) tryPlayStartSound();
  }
  ["pointerdown", "keydown", "focusin"].forEach((evt) => form.addEventListener(evt, onFormTouch));

  /* =========================================================
     Header: shadow + scroll progress line
  ========================================================= */
  let scrollTick = false;
  function onScroll() {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || document.documentElement.scrollTop;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      header.classList.toggle("scrolled", y > 8);
      header.style.setProperty("--sp", max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      scrollTick = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* =========================================================
     Scroll reveal
  ========================================================= */
  const revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  function finishReveal(el) {
    // Once revealed, drop the reveal rules so hover / tilt transforms work normally.
    const cleanup = (ev) => {
      if (ev && ev.target !== el) return;
      el.classList.remove("reveal", "in");
      el.style.removeProperty("--d");
      el.removeEventListener("transitionend", cleanup);
    };
    el.addEventListener("transitionend", cleanup);
    setTimeout(cleanup, 2600);
  }
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          finishReveal(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* =========================================================
     Ripple effect (buttons, controls, tiles, drop zone)
  ========================================================= */
  const RIPPLE_SELECTOR = ".btn, .seg-btn, .icon-btn, .file-remove, .file-drop, .tile";

  function spawnRipple(host, clientX, clientY) {
    const rect = host.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (clientX - rect.left - size / 2) + "px";
    ripple.style.top = (clientY - rect.top - size / 2) + "px";
    host.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
    setTimeout(() => ripple.remove(), 1200);
  }

  document.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button > 0) return;
    const host = e.target.closest && e.target.closest(RIPPLE_SELECTOR);
    if (!host || host.disabled) return;
    spawnRipple(host, e.clientX, e.clientY);
  }, { passive: true });

  // Keyboard-triggered clicks (Enter / Space) get a centred ripple
  document.addEventListener("click", (e) => {
    if (e.detail !== 0) return;
    const host = e.target.closest && e.target.closest(RIPPLE_SELECTOR);
    if (!host || host.disabled) return;
    const rect = host.getBoundingClientRect();
    spawnRipple(host, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  /* =========================================================
     Ripple cursor / touch effect — anywhere on the page
     - every click or tap sends out a ripple from that exact spot
     - on desktop a soft ring follows the cursor and swells over links/buttons
  ========================================================= */
  const tapLayer = document.createElement("div");
  tapLayer.className = "tap-layer";
  tapLayer.setAttribute("aria-hidden", "true");
  document.body.appendChild(tapLayer);

  function tapRipple(x, y) {
    if (reduceMotion) return;
    ["one", "two"].forEach((cls) => {
      const ring = document.createElement("span");
      ring.className = "tap-ring " + cls;
      ring.style.left = x + "px";
      ring.style.top = y + "px";
      tapLayer.appendChild(ring);
      ring.addEventListener("animationend", () => ring.remove());
      setTimeout(() => ring.remove(), 1600);
    });
  }
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button > 0) return;
    tapRipple(e.clientX, e.clientY);
  }, { passive: true });

  if (finePointer && !reduceMotion) {
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);

    let tx = 0, ty = 0, cx = 0, cy = 0, moving = false;
    const HOT = "a, button, input, select, textarea, label, .tile, .file-drop, .seg-btn";

    function follow() {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      ring.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) requestAnimationFrame(follow);
      else moving = false;
    }
    document.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      tx = e.clientX; ty = e.clientY;
      if (!ring.classList.contains("show")) { cx = tx; cy = ty; ring.classList.add("show"); }
      ring.classList.toggle("hot", Boolean(e.target.closest && e.target.closest(HOT)));
      if (!moving) { moving = true; requestAnimationFrame(follow); }
    }, { passive: true });
    document.addEventListener("pointerdown", () => ring.classList.add("down"), { passive: true });
    document.addEventListener("pointerup", () => ring.classList.remove("down"), { passive: true });
    document.documentElement.addEventListener("pointerleave", () => ring.classList.remove("show"));
  }

  /* =========================================================
     Party popper celebration (canvas confetti + streamers)
     Fires from both bottom corners, then a shower from the top.
  ========================================================= */
  function celebrate() {
    if (reduceMotion) return;

    // Popper emojis that "shoot" in from the corners
    ["left", "right"].forEach((side) => {
      const el = document.createElement("div");
      el.className = "popper " + side;
      el.setAttribute("aria-hidden", "true");
      el.textContent = "\uD83C\uDF89";
      document.body.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
      setTimeout(() => el.remove(), 2200);
    });
    const flash = document.createElement("div");
    flash.className = "party-flash";
    flash.setAttribute("aria-hidden", "true");
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1600);

    const canvas = document.createElement("canvas");
    canvas.className = "party-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    function size() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();

    const COLORS = ["#ff3b6b", "#ffcc00", "#22d3ee", "#0a84ff", "#bf5af2", "#30d158", "#ff9f0a", "#ffffff"];
    const parts = [];
    const unit = Math.min(Math.max(H, 500), 900) / 900;   // scale power with screen height
    const rand = (a, b) => a + Math.random() * (b - a);

    function burst(originX, originY, dirDeg, count) {
      for (let i = 0; i < count; i++) {
        const a = (dirDeg + rand(-32, 32)) * Math.PI / 180;
        const speed = rand(9, 27) * unit;
        const kind = Math.random();
        parts.push({
          x: originX, y: originY,
          vx: Math.cos(a) * speed, vy: -Math.sin(a) * speed,
          w: rand(7, 13), h: rand(4, 8),
          rot: rand(0, Math.PI * 2), vr: rand(-0.3, 0.3),
          tilt: rand(0, Math.PI * 2), vt: rand(0.1, 0.32),
          color: COLORS[(Math.random() * COLORS.length) | 0],
          shape: kind < 0.6 ? "rect" : kind < 0.85 ? "dot" : "streamer",
          drag: rand(0.982, 0.992), life: 1, decay: rand(0.004, 0.008)
        });
      }
    }
    function shower(count) {
      for (let i = 0; i < count; i++) {
        parts.push({
          x: rand(0, W), y: rand(-60, -10),
          vx: rand(-2, 2), vy: rand(1, 5),
          w: rand(7, 12), h: rand(4, 7),
          rot: rand(0, Math.PI * 2), vr: rand(-0.2, 0.2),
          tilt: rand(0, Math.PI * 2), vt: rand(0.08, 0.25),
          color: COLORS[(Math.random() * COLORS.length) | 0],
          shape: Math.random() < 0.75 ? "rect" : "dot",
          drag: 0.99, life: 1, decay: rand(0.004, 0.007)
        });
      }
    }

    // Two pops from each corner, then a shower
    const isSmall = W < 640;
    const n = isSmall ? 70 : 110;
    burst(0, H, 62, n);      burst(W, H, 118, n);
    setTimeout(() => { burst(0, H, 72, n); burst(W, H, 108, n); }, 320);
    setTimeout(() => shower(isSmall ? 50 : 90), 650);
    setTimeout(() => shower(isSmall ? 40 : 70), 1200);

    const GRAVITY = 0.36 * unit;
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(2, (now - last) / 16.67); last = now;
      ctx.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vx *= p.drag; p.vy = p.vy * p.drag + GRAVITY * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt; p.tilt += p.vt * dt;
        if (p.y > H * 0.55 || p.vy > 0) p.life -= p.decay * dt;
        if (p.life <= 0 || p.y > H + 40) { parts.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;
        const flutter = Math.cos(p.tilt);
        if (p.shape === "dot") {
          ctx.beginPath(); ctx.arc(0, 0, p.h * 0.6, 0, Math.PI * 2); ctx.fill();
        } else if (p.shape === "streamer") {
          ctx.lineWidth = 2.4; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(-p.w * 1.4, 0);
          ctx.quadraticCurveTo(0, Math.sin(p.tilt) * 9, p.w * 1.4, 0); ctx.stroke();
        } else {
          ctx.scale(1, flutter);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      if (parts.length || now - startedAt < 1800) requestAnimationFrame(frame);
      else canvas.remove();
    }
    const startedAt = performance.now();
    requestAnimationFrame(frame);
    setTimeout(() => canvas.remove(), 9000);   // safety net
  }

  /* =========================================================
     Tile spotlight + tile → pre-select inquiry type
  ========================================================= */
  document.querySelectorAll(".tile").forEach((tile) => {
    tile.addEventListener("pointermove", (e) => {
      const r = tile.getBoundingClientRect();
      tile.style.setProperty("--mx", (e.clientX - r.left) + "px");
      tile.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
    tile.addEventListener("click", () => {
      const type = tile.getAttribute("data-type");
      const select = $("inquiryType");
      if (!type || !select) return;
      select.value = type;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  /* =========================================================
     Ticket card: 3D tilt following the pointer
  ========================================================= */
  const tiltZone = $("tiltZone");
  const ticketCard = $("ticketCard");
  if (tiltZone && ticketCard && finePointer && !reduceMotion) {
    tiltZone.addEventListener("pointermove", (e) => {
      const r = ticketCard.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      ticketCard.classList.add("tilting");
      ticketCard.style.setProperty("--ry", Math.max(-1, Math.min(1, x * 2)) * 14 + "deg");
      ticketCard.style.setProperty("--rx", Math.max(-1, Math.min(1, y * 2)) * -12 + "deg");
    });
    tiltZone.addEventListener("pointerleave", () => {
      ticketCard.classList.remove("tilting");
      ticketCard.style.setProperty("--ry", "0deg");
      ticketCard.style.setProperty("--rx", "0deg");
    });
  }

  /* Ticket ID "decode" effect on the hero card */
  const scrambleEl = $("ticketScramble");
  if (scrambleEl && !reduceMotion) {
    const FINAL = scrambleEl.textContent;
    const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
    let running = false;
    const scramble = () => {
      if (running) return;
      running = true;
      let frame = 0;
      const total = 22;
      const timer = setInterval(() => {
        frame++;
        let out = "";
        for (let i = 0; i < FINAL.length; i++) {
          const ch = FINAL[i];
          if (ch !== "X") { out += ch; continue; }
          out += frame > total - (i % 6) ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        scrambleEl.textContent = out;
        if (frame >= total + 6) {
          clearInterval(timer);
          scrambleEl.textContent = FINAL;
          running = false;
        }
      }, 45);
    };
    setTimeout(scramble, 1300);
    if (ticketCard) ticketCard.addEventListener("pointerenter", scramble);
  }

  /* =========================================================
     Character counters
  ========================================================= */
  function bindCounter(input, counterEl, max) {
    const update = () => {
      const len = input.value.length;
      counterEl.textContent = `${len} / ${max}`;
      counterEl.classList.toggle("near-limit", len >= max * 0.9);
    };
    input.addEventListener("input", update);
    update();
  }
  bindCounter(issueShort, countShort, 150);
  bindCounter(issueLong, countLong, 2000);

  /* =========================================================
     Segmented controls (Priority / Preferred Contact Method)
     The sliding thumb is driven by the --i custom property.
  ========================================================= */
  function bindSegmented(groupEl, hiddenInput) {
    groupEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".seg-btn");
      if (!btn) return;
      const buttons = Array.prototype.slice.call(groupEl.querySelectorAll(".seg-btn"));
      buttons.forEach((p) => p.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      groupEl.style.setProperty("--i", buttons.indexOf(btn));
      hiddenInput.value = btn.dataset.value;
    });
  }
  bindSegmented(priorityGroup, $("priority"));
  bindSegmented(contactGroup, $("contactMethod"));

  function resetSegmented(groupEl, value) {
    const buttons = Array.prototype.slice.call(groupEl.querySelectorAll(".seg-btn"));
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === value)));
    groupEl.style.setProperty("--i", Math.max(0, buttons.findIndex((b) => b.dataset.value === value)));
  }

  /* =========================================================
     Progress bar (required fields completed)
  ========================================================= */
  const progressBar = $("progressBar");
  const progressText = $("progressText");
  const TOTAL_REQUIRED = 8;

  function updateProgress() {
    const v = getFormValues();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email);
    const done = [
      v.fullName.length > 0,
      v.age && Number(v.age) >= 5 && Number(v.age) <= 120,
      emailOk,
      v.phone.replace(/[^0-9]/g, "").length >= 7,
      !!v.inquiryType,
      v.issueShort.length > 0,
      v.issueLong.length >= 10,
      v.consent
    ].filter(Boolean).length;

    progressBar.style.transform = `scaleX(${done / TOTAL_REQUIRED})`;
    if (done === TOTAL_REQUIRED) {
      progressText.textContent = "All set — you're ready to submit";
      progressText.classList.add("done");
    } else {
      progressText.textContent = `${done} of ${TOTAL_REQUIRED} required fields complete`;
      progressText.classList.remove("done");
    }
  }
  form.addEventListener("input", updateProgress);
  form.addEventListener("change", updateProgress);

  /* =========================================================
     Screenshot upload
     - click, drag & drop, or paste (Ctrl/⌘ + V)
     - large images are resized/compressed in the browser so they
       upload reliably (a raw 5 MB image becomes ~7 MB of text when
       sent as base64, which is what made uploads fail before)
  ========================================================= */
  const MAX_FILE_BYTES = 5 * 1024 * 1024;   // 5 MB limit for the original file
  const TARGET_BYTES = 900 * 1024;          // what we actually send
  const MAX_DIMENSION = 1800;               // px, longest side
  let screenshotDataUrl = null;
  let uploadToken = 0;
  let isSubmitting = false;

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function showScreenshotError(msg) { $("err-screenshot").textContent = msg || ""; }

  function clearScreenshot() {
    uploadToken++;
    screenshotDataUrl = null;
    fileInput.value = "";
    filePreview.hidden = true;
    fileProcessing.hidden = true;
    fileDrop.hidden = false;
    filePreviewImg.removeAttribute("src");
    showScreenshotError("");
  }

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("read failed"));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode failed"));
      img.src = src;
    });
  }

  function dataUrlBytes(url) {
    return Math.floor((url.length - url.indexOf(",") - 1) * 3 / 4);
  }

  async function optimiseImage(file) {
    const original = await readAsDataURL(file);
    const img = await loadImage(original);
    const w = img.naturalWidth, h = img.naturalHeight;

    // Small PNG/JPG: send exactly what the visitor picked.
    if (file.size <= TARGET_BYTES && Math.max(w, h) <= MAX_DIMENSION && /^data:image\/(png|jpe?g)/i.test(original)) {
      return { dataUrl: original, bytes: file.size, optimised: false };
    }

    // Otherwise resize + re-encode as JPEG until it is small enough.
    let scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
    let quality = 0.86;
    let out = original;
    for (let i = 0; i < 6; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";                 // flatten transparency
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      out = canvas.toDataURL("image/jpeg", quality);
      if (dataUrlBytes(out) <= TARGET_BYTES) break;
      quality = Math.max(0.5, quality - 0.1);
      scale *= 0.85;
    }
    return { dataUrl: out, bytes: dataUrlBytes(out), optimised: true };
  }

  async function handleFile(file) {
    showScreenshotError("");
    if (!file) return;

    const looksLikeImage = (file.type && file.type.indexOf("image/") === 0) ||
      /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(file.name || "");
    if (!looksLikeImage) {
      showScreenshotError("Please attach an image file (PNG or JPG).");
      fileInput.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showScreenshotError("That file is larger than 5 MB. Please choose a smaller image.");
      fileInput.value = "";
      return;
    }

    const token = ++uploadToken;
    fileDrop.hidden = true;
    filePreview.hidden = true;
    fileProcessing.hidden = false;

    try {
      const result = await optimiseImage(file);
      if (token !== uploadToken) return;          // a newer choice replaced this one

      screenshotDataUrl = result.dataUrl;
      filePreviewImg.src = screenshotDataUrl;
      filePreviewName.textContent = file.name || "screenshot.png";
      filePreviewSize.textContent = result.optimised
        ? `${formatBytes(file.size)} → ${formatBytes(result.bytes)} (optimised)`
        : formatBytes(file.size);
      fileProcessing.hidden = true;
      filePreview.hidden = false;
    } catch (err) {
      if (token !== uploadToken) return;
      screenshotDataUrl = null;
      fileProcessing.hidden = true;
      fileDrop.hidden = false;
      showScreenshotError("We couldn't open that image. Please try a PNG or JPG file.");
    }
    fileInput.value = "";                          // lets the same file be picked again later
  }

  fileInput.addEventListener("change", (e) => handleFile(e.target.files && e.target.files[0]));
  fileRemoveBtn.addEventListener("click", clearScreenshot);

  // Drag & drop
  ["dragenter", "dragover"].forEach((evt) =>
    fileDrop.addEventListener(evt, (e) => {
      e.preventDefault();
      fileDrop.classList.add("dragover");
    })
  );
  fileDrop.addEventListener("dragleave", (e) => {
    if (!fileDrop.contains(e.relatedTarget)) fileDrop.classList.remove("dragover");
  });
  fileDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    fileDrop.classList.remove("dragover");
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  // Stop the browser from opening an image that is dropped outside the drop zone
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => e.preventDefault());

  // Paste a screenshot straight from the clipboard
  document.addEventListener("paste", (e) => {
    if (form.hidden) return;
    const files = e.clipboardData && e.clipboardData.files;
    if (!files || !files.length) return;
    const img = Array.prototype.find.call(files, (f) => f.type && f.type.indexOf("image/") === 0);
    if (img) {
      e.preventDefault();
      handleFile(img);
    }
  });

  /* =========================================================
     Validation
  ========================================================= */
  function setError(fieldId, message) {
    const el = $("err-" + fieldId);
    if (el) el.textContent = message || "";
    const input = $(fieldId);
    if (input) input.classList.toggle("invalid", Boolean(message));
  }

  function getFormValues() {
    return {
      fullName: $("fullName").value.trim(),
      age: $("age").value.trim(),
      email: $("email").value.trim(),
      phone: $("phone").value.trim(),
      inquiryType: $("inquiryType").value,
      issueShort: issueShort.value.trim(),
      issueLong: issueLong.value.trim(),
      priority: $("priority").value,
      contactMethod: $("contactMethod").value,
      consent: $("consent").checked
    };
  }

  function validateForm() {
    let valid = true;
    const values = getFormValues();

    if (!values.fullName) { setError("fullName", "Please enter your full name."); valid = false; }
    else setError("fullName", "");

    if (!values.age || Number(values.age) < 5 || Number(values.age) > 120) {
      setError("age", "Please enter a valid age."); valid = false;
    } else setError("age", "");

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);
    if (!emailOk) { setError("email", "Please enter a valid email address."); valid = false; }
    else setError("email", "");

    if (!values.phone || values.phone.replace(/[^0-9]/g, "").length < 7) {
      setError("phone", "Please enter a valid phone number."); valid = false;
    } else setError("phone", "");

    if (!values.inquiryType) { setError("inquiryType", "Please select an inquiry type."); valid = false; }
    else setError("inquiryType", "");

    if (!values.issueShort) { setError("issueShort", "Please summarize your issue."); valid = false; }
    else setError("issueShort", "");

    if (!values.issueLong || values.issueLong.length < 10) {
      setError("issueLong", "Please provide a bit more detail (at least 10 characters)."); valid = false;
    } else setError("issueLong", "");

    if (!values.consent) { setError("consent", "Please confirm the information is accurate."); valid = false; }
    else setError("consent", "");

    return valid;
  }

  // Clear a field's error as soon as the visitor starts fixing it
  ["fullName", "age", "email", "phone", "inquiryType", "issueShort", "issueLong"].forEach((id) => {
    const el = $(id);
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => { if (el.classList.contains("invalid")) setError(id, ""); });
  });
  $("consent").addEventListener("change", () => { if ($("consent").checked) setError("consent", ""); });

  /* =========================================================
     Submission — hidden iframe + postMessage technique
     (Avoids CORS issues with a plain fetch() POST to Apps Script)
  ========================================================= */
  let submissionTimeout = null;

  function buildAndSubmitHiddenForm(values) {
    const tempForm = document.createElement("form");
    tempForm.action = CONFIG.GAS_URL;
    tempForm.method = "POST";
    tempForm.target = "gas-submit-target";
    tempForm.style.display = "none";

    // Field names here must match exactly what the Apps Script's doPost()
    // reads from e.parameter — the UI's own field names (fullName,
    // contactMethod, etc.) are kept separate from the payload sent over
    // the wire so the two can differ without touching the rest of the form.
    const fields = {
      name: values.fullName,
      age: values.age,
      email: values.email,
      phone: values.phone,
      inquiryType: values.inquiryType,
      issueShort: values.issueShort,
      issueLong: values.issueLong,
      priority: values.priority,
      preferredContact: values.contactMethod,
      consent: values.consent ? "Yes" : "No",
      screenshotData: screenshotDataUrl || "",
      pageOrigin: window.location.href
    };

    Object.keys(fields).forEach((key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = fields[key];
      tempForm.appendChild(input);
    });

    document.body.appendChild(tempForm);
    tempForm.submit();
    document.body.removeChild(tempForm);
  }

  function setLoading(loading) {
    isSubmitting = loading;
    submitBtn.disabled = loading;
    submitBtn.classList.toggle("loading", loading);
  }

  function showSubmitError(message) {
    submitError.textContent = message;
  }

  /* Read whatever the Apps Script page posts back. It may arrive as an
     object, a JSON string, or wrapped inside { data: ... } — accept all. */
  function parseGasMessage(raw) {
    let d = raw;
    if (typeof d === "string") {
      try { d = JSON.parse(d); } catch (e) { return null; }
    }
    if (!d || typeof d !== "object") return null;
    if (typeof d.success === "undefined" && d.data && typeof d.data === "object") d = d.data;

    const status = String(d.status || d.result || "").toLowerCase();
    let ok = null;
    if (d.success === true || d.success === "true" || status === "success" || status === "ok") ok = true;
    else if (d.success === false || d.success === "false" || status === "error" || status === "failed") ok = false;
    if (ok === null) return null;                      // not our message

    const ticket = d.ticketId || d.ticketID || d.ticket_id || d.ticket || d.id || "";
    return { success: ok, ticketId: ticket ? String(ticket) : "", message: d.message || d.error || "" };
  }

  function onSubmitSuccess(ticketId) {
    clearTimeout(submissionTimeout);
    clearTimeout(loadFallbackTimer);
    awaitingResponse = false;

    // The real reply can arrive just after the fallback screen: only refresh the ID.
    if (!successCard.hidden) {
      if (ticketId) $("ticketIdDisplay").textContent = ticketId;
      return;
    }

    setLoading(false);
    form.hidden = true;
    successCard.hidden = false;
    $("ticketIdDisplay").textContent = ticketId || "—";
    successCard.scrollIntoView({ behavior: "smooth", block: "center" });
    celebrate();
    playSuccessSound();
  }

  function onSubmitFailure(message) {
    clearTimeout(submissionTimeout);
    clearTimeout(loadFallbackTimer);
    awaitingResponse = false;
    setLoading(false);
    showSubmitError(message || "Unable to submit your request. Please check your connection and try again.");
  }

  // Listen for the postMessage response coming back from the Apps Script response page
  window.addEventListener("message", (event) => {
    const msg = parseGasMessage(event.data);
    if (!msg) return;                                  // not our message

    if (msg.success) {
      // Only react while a submission is in flight, or to fill in a late ticket ID
      if (isSubmitting || !successCard.hidden) onSubmitSuccess(msg.ticketId);
    } else if (isSubmitting) {
      onSubmitFailure(msg.message);
    }
  });

  /* Safety net: the request reaches the sheet, but Apps Script's reply page
     sometimes can't reach this window (it runs in a sandboxed frame), so no
     message ever arrives. When the response page finishes loading and no
     message follows, treat the request as submitted instead of leaving the
     visitor on a spinner. If the ticket ID arrives later, it fills in. */
  let awaitingResponse = false;
  let loadFallbackTimer = null;
  const gasFrame = $("gasSubmitTarget");
  if (gasFrame) {
    gasFrame.addEventListener("load", () => {
      if (!awaitingResponse) return;                   // initial blank load, ignore
      clearTimeout(loadFallbackTimer);
      loadFallbackTimer = setTimeout(() => {
        if (awaitingResponse && isSubmitting) onSubmitSuccess("Pending");
      }, 2500);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (fileProcessing && !fileProcessing.hidden) {
      showSubmitError("Your screenshot is still being prepared — one moment, then try again.");
      return;
    }

    showSubmitError("");

    if (!validateForm()) {
      const invalids = form.querySelectorAll(".invalid");
      invalids.forEach((el) => {
        el.classList.remove("shake");
        void el.offsetWidth;                     // restart the animation
        el.classList.add("shake");
        setTimeout(() => el.classList.remove("shake"), 600);
      });
      const firstInvalid = invalids[0] || $("err-consent");
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!isConfigured()) {
      showSubmitError("The portal isn't connected to the backend yet. Add your Apps Script URL in script.js.");
      return;
    }

    setLoading(true);
    primeSuccessSound();
    const values = getFormValues();
    awaitingResponse = true;
    buildAndSubmitHiddenForm(values);

    // Fallback: if no postMessage response arrives in time, show an error
    // rather than leaving the user staring at a spinner forever.
    // (45 s — a screenshot upload on a slow connection needs more than 20 s.)
    submissionTimeout = setTimeout(() => {
      onSubmitFailure();
    }, 45000);
  });

  $("resetFormBtn").addEventListener("click", () => {
    form.reset();
    clearScreenshot();
    issueShort.dispatchEvent(new Event("input"));
    issueLong.dispatchEvent(new Event("input"));
    resetSegmented(priorityGroup, "Normal");
    resetSegmented(contactGroup, "Email");
    $("priority").value = "Normal";
    $("contactMethod").value = "Email";
    successCard.hidden = true;
    form.hidden = false;
    showSubmitError("");
    updateProgress();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  updateProgress();

  /* =========================================================
     Visitor counter — JSONP GET request to Apps Script
  ========================================================= */
  function getOrCreateVisitorId() {
    let id = read("yr_visitor_id");
    if (!id) {
      id = "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      store("yr_visitor_id", id);
    }
    return id;
  }

  function jsonp(url, params, callbackName) {
    return new Promise((resolve, reject) => {
      const callbackKey = "__jsonp_" + callbackName + "_" + Date.now();
      const script = document.createElement("script");

      const cleanup = () => {
        delete window[callbackKey];
        script.remove();
      };

      window[callbackKey] = (data) => {
        cleanup();
        resolve(data);
      };

      const query = Object.keys(params)
        .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(params[k]))
        .join("&");

      script.src = `${url}${url.includes("?") ? "&" : "?"}${query}&callback=${callbackKey}`;
      script.onerror = () => {
        cleanup();
        reject(new Error("JSONP request failed"));
      };
      document.body.appendChild(script);

      setTimeout(() => {
        if (window[callbackKey]) {
          cleanup();
          reject(new Error("JSONP request timed out"));
        }
      }, 8000);
    });
  }

  function countUp(el, target) {
    if (reduceMotion || !isFinite(target)) { el.textContent = Number(target).toLocaleString(); return; }
    const duration = 1400;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function recordVisitAndShowCounter() {
    if (!isConfigured()) {
      visitCounterEl.textContent = "—";
      return;
    }

    const params = {
      action: "visit",
      visitorId: getOrCreateVisitorId(),
      page: window.location.pathname,
      referrer: document.referrer || "direct",
      language: navigator.language || "",
      screen: `${window.screen.width}x${window.screen.height}`,
      userAgent: navigator.userAgent
    };

    jsonp(CONFIG.GAS_URL, params, "yrVisit")
      .then((data) => {
        if (data && data.success && typeof data.totalVisits !== "undefined") {
          countUp(visitCounterEl, Number(data.totalVisits));
        } else {
          visitCounterEl.textContent = "—";
        }
      })
      .catch(() => {
        visitCounterEl.textContent = "—";
      });
  }

  recordVisitAndShowCounter();
})();
