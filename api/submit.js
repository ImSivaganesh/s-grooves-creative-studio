export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // The Google Apps Script URL is safely kept on the server, hidden from the frontend.
  const GOOGLE_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbya5D1aErA7NC2zNopII2ODwx9x8ACql7Z4IFiXQch_bAnGoG-hHansKUenAke1JgRq/exec";

  const payload = req.body;

  // Honeypot check: If the hidden 'website_url' field is filled out, it's a bot.
  if (payload.website_url && payload.website_url.trim() !== "") {
    console.log("Bot detected via honeypot.");
    // Return fake success so the bot thinks it succeeded
    return res.status(200).json({ success: true, message: "Registration received." });
  }

  // Remove the honeypot field so we don't send it to Google
  delete payload.website_url;

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
