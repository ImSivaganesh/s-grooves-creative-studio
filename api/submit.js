// Global memory for rate limiting (persists as long as the serverless instance is warm)
const ipCache = new Map();

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- 1. ORIGIN CHECKING (Anti-Postman / Direct Attack) ---
  const origin = req.headers.origin || req.headers.referer || "";
  // Check if the request is coming from your Vercel site or a local testing server
  if (origin && !origin.includes("s-grooves") && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
    console.error("Blocked unauthorized origin:", origin);
    return res.status(403).json({ error: "Forbidden: Invalid Origin" });
  }

  // --- 2. RATE LIMITING (Anti-Spam Loop) ---
  // Allow max 3 submissions per minute per IP address
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (ip !== 'unknown') {
    const userRequests = ipCache.get(ip) || [];
    // Keep only requests from the last 60 seconds
    const recentRequests = userRequests.filter(timestamp => now - timestamp < 60000);
    
    if (recentRequests.length >= 3) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({ error: "Too many requests. Please wait a minute before trying again." });
    }
    
    recentRequests.push(now);
    ipCache.set(ip, recentRequests);
  }

  const payload = req.body;

  // --- EXISTING HONEYPOT CHECK ---
  if (payload.website_url && payload.website_url.trim() !== "") {
    console.log("Bot detected via honeypot.");
    return res.status(200).json({ success: true, message: "Registration received." });
  }
  delete payload.website_url;

  // --- 3. FORMULA SANITIZATION (Anti-Spreadsheet Injection) ---
  // Prevents hackers from typing '=IMPORTXML()' to run malicious code in your Google Sheet
  for (const key in payload) {
    if (typeof payload[key] === "string") {
      payload[key] = payload[key].trim();
      // If the text starts with =, +, -, or @, prepend a single quote to force it as plain text
      if (/^[=+\-@]/.test(payload[key])) {
        payload[key] = "'" + payload[key];
      }
    }
  }

  // Secure backend execution
  const GOOGLE_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbya5D1aErA7NC2zNopII2ODwx9x8ACql7Z4IFiXQch_bAnGoG-hHansKUenAke1JgRq/exec";

  try {
    const response = await fetch(GOOGLE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.text();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Submission error:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}
