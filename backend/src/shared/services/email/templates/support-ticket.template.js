// ==============================================================================
// Ardab Market - Support Ticket Email Templates
// ==============================================================================

/**
 * Returns Email Template for Support Notification to Platform Support Staff
 */
export function getSupportStaffNotificationTemplate({
  ticketNumber,
  customerName,
  customerEmail,
  customerPhone,
  city,
  subject,
  messageBody,
  orderNumber,
  priority,
}) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>[Ardab Market Support] Ticket #${ticketNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; color: #ffffff; padding: 24px 28px; border-bottom: 3px solid #10b981; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #f8fafc; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 8px; background: #10b981; color: #ffffff; }
        .content { padding: 28px; line-height: 1.6; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px; }
        .meta-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
        .meta-label { font-weight: 600; color: #64748b; width: 140px; }
        .meta-value { color: #0f172a; font-weight: 500; }
        .message-box { background: #f8fafc; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; padding: 18px 20px; font-size: 15px; color: #334155; white-space: pre-wrap; line-height: 1.6; margin-top: 10px; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>New Customer Support Ticket</h1>
          <div class="badge">Ticket #${ticketNumber}</div>
        </div>
        <div class="content">
          <table class="meta-table">
            <tr>
              <td class="meta-label">Customer Name:</td>
              <td class="meta-value"><strong>${customerName || 'Ardab Customer'}</strong></td>
            </tr>
            <tr>
              <td class="meta-label">Email:</td>
              <td class="meta-value"><a href="mailto:${customerEmail || ''}" style="color: #0d9488;">${customerEmail || 'Not specified'}</a></td>
            </tr>
            <tr>
              <td class="meta-label">Phone:</td>
              <td class="meta-value">${customerPhone || 'Not specified'}</td>
            </tr>
            <tr>
              <td class="meta-label">City:</td>
              <td class="meta-value">${city || 'Gondar'}</td>
            </tr>
            ${orderNumber ? `
            <tr>
              <td class="meta-label">Associated Order:</td>
              <td class="meta-value"><strong style="color: #059669;">#${orderNumber}</strong></td>
            </tr>
            ` : ''}
            <tr>
              <td class="meta-label">Priority:</td>
              <td class="meta-value"><strong>${priority || 'NORMAL'}</strong></td>
            </tr>
            <tr>
              <td class="meta-label">Subject:</td>
              <td class="meta-value"><strong>${subject}</strong></td>
            </tr>
          </table>

          <div style="font-weight: 700; color: #0f172a; margin-top: 16px; margin-bottom: 6px;">Customer Inquiry:</div>
          <div class="message-box">${messageBody}</div>
        </div>
        <div class="footer">
          Central Operations Platform &bull; Ardab Market Support Dispatcher
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
[Ardab Market Support] Ticket #${ticketNumber}
Subject: ${subject}
Customer: ${customerName || 'Ardab Customer'}
Email: ${customerEmail || 'N/A'}
Phone: ${customerPhone || 'N/A'}
City: ${city || 'Gondar'}
${orderNumber ? `Order: #${orderNumber}\n` : ''}Priority: ${priority || 'NORMAL'}

Message:
${messageBody}
  `.trim();

  return { htmlContent, textContent };
}

/**
 * Returns Email Template for Confirmation to the Customer
 */
export function getCustomerSupportConfirmationTemplate({
  ticketNumber,
  customerName,
  subject,
}) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>We Received Your Support Request #${ticketNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: #0f172a; color: #ffffff; padding: 24px; text-align: center; border-bottom: 3px solid #10b981; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #f8fafc; }
        .content { padding: 32px 28px; line-height: 1.6; color: #334155; }
        .ticket-banner { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
        .ticket-number { font-size: 22px; font-weight: 800; color: #047857; letter-spacing: 0.5px; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Ardab Market Customer Care</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${customerName || 'Valued Customer'}</strong>,</p>
          <p>Your support request regarding <em>"${subject}"</em> has been successfully received by our support operations team.</p>
          
          <div class="ticket-banner">
            <div style="font-size: 12px; text-transform: uppercase; color: #065f46; font-weight: 600;">Your Reference Ticket ID</div>
            <div class="ticket-number">#${ticketNumber}</div>
          </div>

          <p>Our customer service representatives in Gondar are currently reviewing your inquiry and will respond directly to your ticket within 24 hours.</p>
          <p>You can also track updates and reply to this inquiry directly in the Ardab Market mobile app under <strong>Profile &rarr; Help & Support</strong>.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Ardab Market Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${customerName || 'Valued Customer'},

Your support request regarding "${subject}" has been successfully received.
Your Reference Ticket ID: #${ticketNumber}

Our customer service team is reviewing your inquiry and will respond directly within 24 hours.
You can track updates and reply inside the Ardab Market mobile application under Profile -> Help & Support.

Ardab Market Customer Care
  `.trim();

  return { htmlContent, textContent };
}
