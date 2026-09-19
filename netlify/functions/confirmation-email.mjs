// Event-triggered function: Netlify runs `formSubmitted` automatically for every
// verified Netlify Forms submission (no dashboard webhook needed, and it can't be
// called from a public URL). Sends a confirmation email via the Resend API.

const FROM_EMAIL = process.env.FROM_EMAIL || "GutXFuel <hello@gutxfuel.com>";

const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #201A16;">
  <div style="font-weight: 900; font-size: 20px; margin-bottom: 24px;">
    <span style="color: #C1440E;">GUT</span>
    <span style="color: #201A16;">×</span>
    <span style="color: #E8A317;">FUEL</span>
  </div>
  <p style="font-size: 16px; line-height: 1.6;">Thanks for signing up. We'll be in touch shortly with news about our next drop. In the meantime, follow us at <a href="https://www.instagram.com/gutxfuel/" style="color: #C1440E;">instagram.com/gutxfuel</a>.</p>
  <p style="font-size: 16px; line-height: 1.6;">- GutXFuel</p>
</div>
`;

const emailText =
  "Thanks for signing up. We'll be in touch shortly with news about our next drop. In the meantime, follow us at instagram.com/gutxfuel.\n\n- GutXFuel";

export default {
  async formSubmitted(event) {
    const email = event.data?.email;
    if (!email) {
      console.error("Form submission has no email. Fields received:", Object.keys(event.data || {}));
      return;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY is not set");
      return;
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
      console.error("Resend error:", res.status, await res.text());
      return;
    }

    console.log("Confirmation email sent");
  },
};
