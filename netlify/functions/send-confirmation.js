// Triggered by a Netlify Forms "Outgoing webhook" notification on the
// "subscribe" form (configured in the Netlify dashboard, not in code).
// Sends a short "thanks for signing up" email via the Resend API.

const FROM_EMAIL = process.env.FROM_EMAIL || "GutXFuel <hello@gutxfuel.com>";

const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #201A16;">
  <div style="font-weight: 900; font-size: 20px; margin-bottom: 24px;">
    <span style="color: #C1440E;">GUT</span>
    <span style="color: #201A16;">×</span>
    <span style="color: #E8A317;">FUEL</span>
  </div>
  <p style="font-size: 16px; line-height: 1.6;">Thanks for signing up. We'll be in touch shortly with news about our next drop.</p>
  <p style="font-size: 16px; line-height: 1.6;">- GutXFuel</p>
</div>
`;

const emailText =
  "Thanks for signing up. We'll be in touch shortly with news about our next drop.\n\n- GutXFuel";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set");
    return { statusCode: 500, body: "Email service not configured" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  // Netlify's outgoing webhook payload nests the submitted fields under
  // payload.data (falls back to a couple of other shapes just in case).
  const data = payload.payload?.data || payload.data || payload.payload || payload;
  const email = data.email;

  if (!email) {
    return { statusCode: 400, body: "Missing email" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "You're on the list!",
      text: emailText,
      html: emailHtml,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Resend error:", errText);
    return { statusCode: 502, body: "Failed to send confirmation email" };
  }

  return { statusCode: 200, body: "OK" };
};
