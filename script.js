const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbya5D1aErA7NC2zNopII2ODwx9x8ACql7Z4IFiXQch_bAnGoG-hHansKUenAke1JgRq/exec";

const forms = document.querySelectorAll(".sg-form");

function escapeHTML(value) {
  if (!value) return "";
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

function setStatus(formElement, message, type = "") {
  const statusEl = formElement.querySelector(".formStatus");
  if (statusEl) {
    statusEl.innerHTML = message;
    statusEl.className = `formStatus form-success show ${type}`.trim();
  }
}

function getPayload(formElement) {
  const formData = new FormData(formElement);
  const payload = Object.fromEntries(formData.entries());

  return {
    submittedAt: new Date().toISOString(),
    fullName: payload.fullName || "",
    email: payload.email || "",
    phone: payload.phone || "",
    plan: payload.plan || "",
    experience: payload.experience || "",
    message: payload.message || "",
    source: payload.source || "S-Grooves landing page main form",
  };
}

function saveLocalBackup(payload) {
  const key = "sGroovesRegistrations";
  const saved = JSON.parse(localStorage.getItem(key) || "[]");
  saved.push(payload);
  localStorage.setItem(key, JSON.stringify(saved));
}

async function submitToGoogleSheet(payload) {
  await fetch(GOOGLE_SHEET_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });
}

forms.forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = getPayload(form);
    const submitButton = form.querySelector("button[type='submit']");
    const buttonText = form.querySelector(".btnText");
    const originalText = buttonText ? buttonText.textContent : "Submit";

    if (submitButton) submitButton.disabled = true;
    if (buttonText) buttonText.textContent = "Sending...";
    setStatus(form, "Submitting your registration...");

    try {
      saveLocalBackup(payload);

      if (GOOGLE_SHEET_WEB_APP_URL) {
        await submitToGoogleSheet(payload);
        setStatus(
          form,
          `<span class="success-emoji" aria-hidden="true">🎉</span><span class="success-title">Welcome to the groove, ${escapeHTML(payload.fullName)}!</span><span class="success-sub">Your registration is received. We will contact you within 24 hours to confirm your personal slot.</span><span class="success-mini" aria-hidden="true">🎧 ✨ 🕺</span>`,
          "success",
        );
      } else {
        setStatus(
          form,
          `<span class="success-emoji" aria-hidden="true">🎉</span><span class="success-title">Nice, ${escapeHTML(payload.fullName)}!</span><span class="success-sub">Saved in this browser. Add your Google Apps Script URL in script.js to record it in Google Sheets.</span><span class="success-mini" aria-hidden="true">🎧 ✨ 🕺</span>`,
          "success",
        );
      }

      form.reset();
      if (buttonText) buttonText.textContent = "Submitted";
    } catch (error) {
      setStatus(form, "Submission failed. Please try again or message on WhatsApp.", "error");
      if (buttonText) buttonText.textContent = originalText;
    } finally {
      setTimeout(() => {
        if (submitButton) submitButton.disabled = false;
        if (buttonText) buttonText.textContent = originalText;
      }, 2000);
    }
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.1 },
);

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
