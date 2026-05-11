// Global memory for rate limiting (persists as long as the serverless instance is warm)
const ipCache = new Map();

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- 1. ORIGIN CHECKING (Anti-Postman / Direct Attack) ---
  const origin = req.headers.origin || req.headers.referer || "";
  // More lenient check for testing
  const isAllowed = !origin || 
                    origin.includes("s-grooves") || 
                    origin.includes("vercel.app") || 
                    origin.includes("localhost") || 
                    origin.includes("127.0.0.1");

  if (!isAllowed) {
    console.error("Blocked unauthorized origin:", origin);
    return res.status(403).json({ success: false, error: "Forbidden: Invalid Origin" });
  }

  // --- 2. RATE LIMITING ---
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (ip !== 'unknown') {
    const userRequests = ipCache.get(ip) || [];
    const recentRequests = userRequests.filter(timestamp => now - timestamp < 60000);
    
    if (recentRequests.length >= 5) { // Increased to 5 for easier testing
      return res.status(429).json({ success: false, error: "Too many requests. Please wait a minute." });
    }
    
    recentRequests.push(now);
    ipCache.set(ip, recentRequests);
  }

  const payload = req.body;

  // --- HONEYPOT CHECK ---
  if (payload.website_url && payload.website_url.trim() !== "") {
    return res.status(200).json({ success: true, message: "Spam filtered." });
  }
  delete payload.website_url;

  // --- 3. FORMULA SANITIZATION ---
  for (const key in payload) {
    if (typeof payload[key] === "string") {
      payload[key] = payload[key].trim();
      if (/^[=+\-@]/.test(payload[key])) {
        payload[key] = "'" + payload[key];
      }
    }
  }

  const GOOGLE_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbya5D1aErA7NC2zNopII2ODwx9x8ACql7Z4IFiXQch_bAnGoG-hHansKUenAke1JgRq/exec";

  try {
    const response = await fetch(GOOGLE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "follow", // Explicitly follow Google's redirects
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Script Error:", errorText);
      return res.status(502).json({ success: false, error: "Google Sheets rejected the request." });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Backend error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
