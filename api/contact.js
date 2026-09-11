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

    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    const company = typeof payload.company === "string" ? payload.company.trim() : "";
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    const honeypot = payload.honeypot || payload.website;
    const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[character]));

    // Bot + validation
    if (honeypot) return res.status(200).json({ ok: true });
    if (!name || !email || !message || name.length > 120 || email.length > 254 || company.length > 200 || message.length > 10000 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(name + company)) {
      return res.status(400).json({ ok: false, error: "Please enter your name, a valid email, and a message." });
    }

    const toEmail = process.env.TO_EMAIL || "alex@blume-visuals.com";
    const subject = `New Blume Inquiry: ${name}${company ? ` @ ${company}` : ""}`;
    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      "",
      "Message:",
      message
    ].filter(Boolean).join("\n");

    // Use Resend onboarding sender unless your domain is verified.
    const fromAddress = process.env.FROM_EMAIL || "Blume <alex@blume-visuals.com>";

    if (!process.env.RESEND_API_KEY) {
      console.error("Contact email is not configured: RESEND_API_KEY is missing.");
      return res.status(503).json({ ok: false, error: "The contact form is temporarily unavailable. Please email alex@blume-visuals.com." });
    }

    const details = [
      ["Name", name],
      ["Email", email],
      ...(company ? [["Company", company]] : [])
    ].map(([label, value]) => `<tr><td style="padding:0 18px 14px 0;color:#8f8f8f;font:600 12px/1.4 Arial,sans-serif;text-transform:uppercase;letter-spacing:.08em;vertical-align:top">${label}</td><td style="padding:0 0 14px;color:#f3f3f3;font:15px/1.5 Arial,sans-serif">${escapeHtml(value)}</td></tr>`).join("");
    const html = `<!doctype html><html><body style="margin:0;background:#111;color:#f3f3f3"><div style="max-width:640px;margin:0 auto;padding:32px 16px;font-family:Arial,sans-serif"><div style="padding:28px 32px;background:#1c1c1c;border:1px solid #343434;border-radius:18px"><p style="margin:0 0 22px;color:#ff6a00;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Blume Studio</p><h1 style="margin:0 0 8px;color:#f3f3f3;font-size:28px;line-height:1.2">New project inquiry</h1><p style="margin:0 0 28px;color:#b3b3b3;font-size:15px;line-height:1.5">A visitor has sent a message through blume-visuals.com.</p><table role="presentation" style="border-collapse:collapse;width:100%;margin:0 0 16px">${details}</table><div style="margin:0 0 28px;padding:20px;background:#292929;border-radius:12px;color:#f3f3f3;font:16px/1.6 Arial,sans-serif;white-space:pre-wrap">${escapeHtml(message)}</div><a href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${subject}`)}" style="display:inline-block;padding:12px 18px;background:#ff6a00;border-radius:10px;color:#000;text-decoration:none;font:700 14px Arial,sans-serif">Reply to inquiry</a></div></div></body></html>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress,                // switch to "Blume <alex@blume-visuals.com>" after DNS verify
        to: [toEmail],
        subject,
        text,
        html,
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
