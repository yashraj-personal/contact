/* =========================================================
   YASH RAJ — Support Portal
   script.js
========================================================= */

/* =========================================================
   ⭐ CONFIGURATION — GOOGLE APPS SCRIPT WEB APP URL
   Deployed Web App URL — this is the live endpoint the portal talks to.
========================================================= */
const CONFIG = {
  GAS_URL: "https://script.google.com/macros/s/AKfycbz9kxgJ7JPlVzJCSDc8tUPf-6N7AJegpSrqnsZHwNzBLtXk0KvWdBR2aZCbASon3abtZA/exec"
};
/* ========================================================= */

(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const isConfigured = () =>
    CONFIG.GAS_URL && CONFIG.GAS_URL.indexOf("PASTE_YOUR") === -1;

  /* ---------- Elements ---------- */
  const form = $("supportForm");
  const successCard = $("successCard");
  const submitBtn = $("submitBtn");
  const submitError = $("submitError");
  const gasFrame = $("gasSubmitTarget");

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
  const fileDropLabel = $("fileDropLabel");

  const priorityGroup = $("priorityGroup");
  const contactGroup = $("contactGroup");

  const visitCounterEl = $("visitCounter");
  const themeToggle = $("themeToggle");

  /* =========================================================
     Theme toggle (light / dark)
  ========================================================= */
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("yr_theme", theme);
  }
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      setTheme(current === "dark" ? "light" : "dark");
    });
  }

  const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
  let screenshotDataUrl = null;
  let isSubmitting = false;

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
     Pill groups (Priority / Preferred Contact Method)
  ========================================================= */
  function bindPillGroup(groupEl, hiddenInput) {
    groupEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill");
      if (!btn) return;
      groupEl.querySelectorAll(".pill").forEach((p) => p.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      hiddenInput.value = btn.dataset.value;
    });
  }
  bindPillGroup(priorityGroup, $("priority"));
  bindPillGroup(contactGroup, $("contactMethod"));

  /* =========================================================
     Screenshot upload
  ========================================================= */
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function clearScreenshot() {
    screenshotDataUrl = null;
    fileInput.value = "";
    filePreview.hidden = true;
    fileDrop.hidden = false;
    $("err-screenshot").textContent = "";
  }

  function handleFile(file) {
    const errEl = $("err-screenshot");
    errEl.textContent = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      errEl.textContent = "Please attach an image file (PNG or JPG).";
      fileInput.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      errEl.textContent = "That file is larger than 5 MB. Please choose a smaller image.";
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      screenshotDataUrl = reader.result;
      filePreviewImg.src = screenshotDataUrl;
      filePreviewName.textContent = file.name;
      filePreviewSize.textContent = formatBytes(file.size);
      fileDrop.hidden = true;
      filePreview.hidden = false;
    };
    reader.onerror = () => {
      errEl.textContent = "Couldn't read that file. Please try again.";
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));
  fileRemoveBtn.addEventListener("click", clearScreenshot);

  ["dragenter", "dragover"].forEach((evt) =>
    fileDropLabel.addEventListener(evt, (e) => {
      e.preventDefault();
      fileDrop.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    fileDropLabel.addEventListener(evt, (e) => {
      e.preventDefault();
      fileDrop.classList.remove("dragover");
    })
  );
  fileDropLabel.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
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

  function onSubmitSuccess(ticketId) {
    clearTimeout(submissionTimeout);
    setLoading(false);
    form.hidden = true;
    successCard.hidden = false;
    $("ticketIdDisplay").textContent = ticketId || "—";
    successCard.scrollIntoView({ behavior: "smooth", block: "start" });
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
      const firstInvalid = form.querySelector(".invalid");
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
    }, 20000);
  });

  $("resetFormBtn").addEventListener("click", () => {
    form.reset();
    clearScreenshot();
    issueShort.dispatchEvent(new Event("input"));
    issueLong.dispatchEvent(new Event("input"));
    priorityGroup.querySelectorAll(".pill").forEach((p) => p.setAttribute("aria-pressed", p.dataset.value === "Normal"));
    contactGroup.querySelectorAll(".pill").forEach((p) => p.setAttribute("aria-pressed", p.dataset.value === "Email"));
    $("priority").value = "Normal";
    $("contactMethod").value = "Email";
    successCard.hidden = true;
    form.hidden = false;
    showSubmitError("");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* =========================================================
     Visitor counter — JSONP GET request to Apps Script
  ========================================================= */
  function getOrCreateVisitorId() {
    let id = localStorage.getItem("yr_visitor_id");
    if (!id) {
      id = "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("yr_visitor_id", id);
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
          visitCounterEl.textContent = data.totalVisits.toLocaleString();
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
