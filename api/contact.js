// /api/contact.js
export default async function handler(req, res) {
  // CORS (keeps it flexible if you ever post from other origins)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { name, email, company, message, honeypot } = req.body || {};

    // Simple validation
    if (honeypot) return res.status(200).json({ ok: true }); // bot trap
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: "Missing required fields." });
    }

    // Compose email payload
    const toEmail = process.env.TO_EMAIL || "hello@blume-visuals.com";
    const subject = `New Blume Inquiry — ${name}${company ? ` @ ${company}` : ""}`;
    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      "",
      "Message:",
      message
    ].filter(Boolean).join("\n");

    // Send via Resend API (no SDK needed)
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Blume <noreply@blume-visuals.com>",
        to: [toEmail],
        subject,
        text,
        reply_to: email
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ ok: false, error: `Email send failed: ${err}` });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
}
