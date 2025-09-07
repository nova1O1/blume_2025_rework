// /api/contact.js
export default async function handler(req, res) {
  // CORS (optional when posting from same origin)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Robust body parsing (works even if req.body is undefined)
    let payload = {};
    if (req.body && typeof req.body === "object") {
      payload = req.body;
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");
      payload = raw ? JSON.parse(raw) : {};
    }

    const { name, email, company, message, honeypot } = payload;

    // Bot + validation
    if (honeypot) return res.status(200).json({ ok: true });
    if (!name || !email || !message) {
      return res.status(400).json({ ok: false, error: "Missing required fields." });
    }

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

    // Use Resend onboarding sender unless your domain is verified.
    const fromAddress = process.env.FROM_EMAIL || "Blume <hello@blume-visuals.com>";

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress,                // switch to "Blume <hello@blume-visuals.com>" after DNS verify
        to: [toEmail],
        subject,
        text,
        // optional nicer formatting:
        // html: `<pre style="font:14px/1.5 ui-sans-serif,system-ui">${text.replace(/</g,"&lt;")}</pre>`,
        reply_to: email                   // so hitting “Reply” goes to the sender
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("Resend error:", err); // visible in Vercel function logs
      return res.status(500).json({ ok: false, error: "Email send failed." });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Handler error:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
}
