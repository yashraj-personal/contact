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
  START_SOUND: "form-start.mp3"
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
    ["", "r2", "r3"].forEach((cls) => {        // three staggered rings = water feel
      const ripple = document.createElement("span");
      ripple.className = "ripple " + cls;
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = (clientX - rect.left - size / 2) + "px";
      ripple.style.top = (clientY - rect.top - size / 2) + "px";
      host.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
      setTimeout(() => ripple.remove(), 1800);
    });
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
     Water ripple (page-wide, canvas)
     - click / tap: 3 expanding rings + specular highlight + soft splash
     - drag (touch or mouse held): small ripples follow the finger
     - mouse hover: a faint wake trails the cursor
     Runs its animation loop only while ripples are visible.
  ========================================================= */
  if (!reduceMotion) {
    const canvas = document.createElement("canvas");
    canvas.className = "water-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let dpr = 1, W = 0, H = 0;

    function sizeCanvas() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    function accentRGB() {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      const m = /^#?([0-9a-f]{6})$/i.exec(raw);
      if (!m) return [0, 113, 227];
      const n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }

    const drops = [];
    let running = false;
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    function addDrop(x, y, radius, strength, life) {
      if (drops.length > 28) drops.shift();
      drops.push({ x, y, radius, strength, life, t0: performance.now(), rgb: accentRGB() });
      if (!running) { running = true; requestAnimationFrame(frame); }
    }

    function frame(now) {
      ctx.clearRect(0, 0, W, H);
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        const t = (now - d.t0) / d.life;
        if (t >= 1) { drops.splice(i, 1); continue; }
        const [r, g, b] = d.rgb;

        // soft splash disc at the impact point
        const splashT = Math.min(1, t * 3);
        if (splashT < 1) {
          const sr = d.radius * 0.35 * easeOut(splashT);
          const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, Math.max(1, sr));
          grad.addColorStop(0, `rgba(${r},${g},${b},${0.28 * d.strength * (1 - splashT)})`);
          grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(d.x, d.y, Math.max(1, sr), 0, Math.PI * 2); ctx.fill();
        }

        // three concentric rings, each slightly delayed
        for (let k = 0; k < 3; k++) {
          const rt = (t - k * 0.11) / (1 - k * 0.11);
          if (rt <= 0 || rt >= 1) continue;
          const rad = d.radius * (1 - k * 0.16) * easeOut(rt);
          const fade = Math.pow(1 - rt, 1.6) * d.strength * (1 - k * 0.22);
          if (rad < 1) continue;

          // body of the wave: a soft ring band
          const band = 6 + (1 - rt) * 10;
          const g2 = ctx.createRadialGradient(d.x, d.y, Math.max(0, rad - band), d.x, d.y, rad + band * 0.5);
          g2.addColorStop(0, `rgba(${r},${g},${b},0)`);
          g2.addColorStop(0.7, `rgba(${r},${g},${b},${0.20 * fade})`);
          g2.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.fillStyle = g2;
          ctx.beginPath(); ctx.arc(d.x, d.y, rad + band * 0.5, 0, Math.PI * 2); ctx.fill();

          // crest line
          ctx.lineWidth = 0.8 + (1 - rt) * 2.2;
          ctx.strokeStyle = `rgba(${r},${g},${b},${0.75 * fade})`;
          ctx.beginPath(); ctx.arc(d.x, d.y, rad, 0, Math.PI * 2); ctx.stroke();

          // specular highlight on the upper-left of the crest (light catching the water)
          ctx.lineWidth = 1 + (1 - rt) * 1.4;
          ctx.strokeStyle = `rgba(255,255,255,${0.65 * fade})`;
          ctx.beginPath(); ctx.arc(d.x, d.y, Math.max(0.5, rad - 2.2), Math.PI * 0.95, Math.PI * 1.55); ctx.stroke();
        }
      }
      if (drops.length) requestAnimationFrame(frame);
      else { running = false; ctx.clearRect(0, 0, W, H); }
    }

    let pressed = false, lastX = 0, lastY = 0, lastT = 0;

    document.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button > 0) return;
      pressed = true; lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
      const touch = e.pointerType === "touch";
      addDrop(e.clientX, e.clientY, touch ? 150 : 190, 1, touch ? 1100 : 1300);
    }, { passive: true });

    document.addEventListener("pointermove", (e) => {
      const now = performance.now();
      if (now - lastT < 70) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      const dist = Math.hypot(dx, dy);
      if (pressed) {                                   // dragging: visible little ripples
        if (dist < 22) return;
        addDrop(e.clientX, e.clientY, 58, 0.7, 800);
      } else if (finePointer && e.pointerType === "mouse") {   // hovering: faint wake
        if (dist < 46) return;
        addDrop(e.clientX, e.clientY, 34, 0.32, 650);
      } else { return; }
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    }, { passive: true });

    ["pointerup", "pointercancel"].forEach((evt) =>
      document.addEventListener(evt, () => { pressed = false; }, { passive: true }));
  }

  /* =========================================================
     Success celebration (confetti burst)
  ========================================================= */
  function celebrate() {
    if (reduceMotion) return;
    const host = document.createElement("div");
    host.className = "confetti";
    host.setAttribute("aria-hidden", "true");
    const colors = ["#0a84ff", "#22d3ee", "#bf5af2", "#30d158", "#ff9f0a", "#ff375f"];
    for (let i = 0; i < 46; i++) {
      const p = document.createElement("i");
      const angle = Math.random() * Math.PI * 2;
      const dist = 140 + Math.random() * 260;
      p.style.setProperty("--x", Math.cos(angle) * dist + "px");
      p.style.setProperty("--y", (Math.sin(angle) * dist - 90) + "px");
      p.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
      p.style.setProperty("--c", colors[i % colors.length]);
      p.style.setProperty("--d", (Math.random() * 120) + "ms");
      p.style.width = (6 + Math.random() * 6) + "px";
      p.style.height = (8 + Math.random() * 8) + "px";
      host.appendChild(p);
    }
    successCard.appendChild(host);
    setTimeout(() => host.remove(), 2200);
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
      system: $("systemUsed").value,
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
  let isSubmitting = false;
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
      screenshotData: values.system,   // OS data now travels in the old screenshot slot (Android / Mac / Windows / Linux / Ubuntu)
      system: values.system,           // same value under a clear name, for easy use in Apps Script
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

  function onSubmitSuccess(ticketId) {
    clearTimeout(submissionTimeout);
    setLoading(false);
    form.hidden = true;
    successCard.hidden = false;
    $("ticketIdDisplay").textContent = ticketId || "—";
    successCard.scrollIntoView({ behavior: "smooth", block: "center" });
    celebrate();
  }

  function onSubmitFailure(message) {
    clearTimeout(submissionTimeout);
    setLoading(false);
    showSubmitError(message || "Unable to submit your request. Please check your connection and try again.");
  }

  // Listen for the postMessage response coming back from the Apps Script response page
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (typeof data.success === "undefined") return; // not our message

    if (data.success) {
      onSubmitSuccess(data.ticketId);
    } else {
      onSubmitFailure(data.message);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isSubmitting) return;
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
    const values = getFormValues();
    buildAndSubmitHiddenForm(values);

    // Fallback: if no postMessage response arrives in time, show an error
    // rather than leaving the user staring at a spinner forever.
    submissionTimeout = setTimeout(() => {
      onSubmitFailure();
    }, 45000);
  });

  $("resetFormBtn").addEventListener("click", () => {
    form.reset();
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
