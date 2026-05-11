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
    website_url: payload.website_url || "",
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
  // --- SECURE: Always use the backend API ---
  // The Google Apps Script URL is stored safely in Vercel Environment Variables.
  // It is NEVER exposed to the browser or public code.
  const endpoint = "/api/submit";

  const fetchOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  };

  const response = await fetch(endpoint, fetchOptions);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Server submission failed");
  }
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

    // --- SECURITY CHECK: HONEYPOT ---
    if (payload.website_url) {
      console.warn("Spam attempt blocked by honeypot.");
      // Pretend it worked to fool the bot
      setStatus(form, "Thank you! Your registration is received.");
      form.reset();
      if (buttonText) buttonText.textContent = "Submitted";
      return;
    }

    if (submitButton) submitButton.disabled = true;
    if (buttonText) buttonText.textContent = "RESERVING...";
    setStatus(form, "Syncing your rhythm with Coach Siva...");

    try {
      saveLocalBackup(payload);

      await submitToGoogleSheet(payload);
      
      const isQuickForm = form.id === "quickForm";
      const successMsg = isQuickForm 
        ? `<span class="success-emoji" aria-hidden="true">⚡</span><span class="success-title">Got it, ${escapeHTML(payload.fullName)}!</span><span class="success-sub">I've received your request. Coach Siva will personally reach out to you within 24 hours to sync your rhythm!</span><span class="success-mini" aria-hidden="true">🕺 ✨</span>`
        : `<span class="success-emoji" aria-hidden="true">🎉</span><span class="success-title">Welcome to the S-Grooves family, ${escapeHTML(payload.fullName)}!</span><span class="success-sub">Your spot is being reserved. Check your email for a copy of your response. Coach Siva will personally contact you within 24 hours!</span><span class="success-mini" aria-hidden="true">🎧 ✨ 🕺</span>`;

      setStatus(form, successMsg, "success");
      form.reset();
      if (buttonText) buttonText.textContent = "Submitted";
    } catch (error) {
      console.error("Submission error details:", error);
      setStatus(form, `Error: ${error.message}. Please try again or WhatsApp me.`, "error");
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



// ===== FAQ Accordion Logic =====
document.querySelectorAll(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    const faqItem = button.parentElement;
    const answer = faqItem.querySelector(".faq-answer");
    const isOpen = button.getAttribute("aria-expanded") === "true";

    // Close all other FAQ items first
    document.querySelectorAll(".faq-question").forEach((otherButton) => {
      if (otherButton !== button) {
        otherButton.setAttribute("aria-expanded", "false");
        otherButton.parentElement.querySelector(".faq-answer").style.maxHeight = null;
      }
    });

    // Toggle current item
    button.setAttribute("aria-expanded", !isOpen);
    
    if (!isOpen) {
      answer.style.maxHeight = answer.scrollHeight + "px";
    } else {
      answer.style.maxHeight = null;
    }
  });
});
