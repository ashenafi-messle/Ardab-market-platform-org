// ==============================================================================
// Ardab Market - Customer Support Reply Email Template
// ==============================================================================

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Returns Support Reply email templates (HTML & Plain text)
 *
 * @param {object} params
 * @param {string} params.customerName
 * @param {string} params.ticketNumber
 * @param {string} params.subject
 * @param {string} params.messageBody
 * @returns {{ htmlContent: string, textContent: string }}
 */
export function getSupportReplyTemplate({ customerName, ticketNumber, subject, messageBody }) {
  const safeCustomerName = escapeHtml(customerName || 'Valued Customer');
  const safeTicketNumber = escapeHtml(ticketNumber);
  const safeSubject = escapeHtml(subject);
  // Convert newlines to breaks after escaping HTML
  const safeMessageHtml = escapeHtml(messageBody).replace(/\n/g, '<br/>');

  const logoUrl = 'https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Support Update: ${safeTicketNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; text-align: center; border-bottom: 3px solid #10b981; }
        .content { padding: 32px 28px; color: #334155; line-height: 1.6; }
        .ticket-box { background-color: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin: 20px 0; border-left: 4px solid #10b981; }
        .reply-box { background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 24px 0; font-size: 15px; color: #0f172a; line-height: 1.7; box-shadow: 0 2px 6px rgba(0,0,0,0.03); }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle" style="padding-right: 12px;">
                      <img src="${logoUrl}" alt="Ardab Market" width="44" height="44" style="border-radius: 8px; display: block; border: 0;" />
                    </td>
                    <td valign="middle">
                      <span style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                        Ardab <span style="color: #34d399;">Market</span>
                      </span>
                    </td>
                  </tr>
                </table>
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; font-weight: 600; margin-top: 6px;">
                  Customer Support Helpdesk
                </div>
              </td>
            </tr>
          </table>
        </div>

        <div class="content">
          <p style="font-size: 16px; margin-top: 0;">Hello <strong>${safeCustomerName}</strong>,</p>

          <p>A support representative has replied to your support inquiry on the Ardab Market platform.</p>

          <div class="ticket-box">
            <div style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">Ticket Reference</div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">${safeTicketNumber}</div>
            <div style="font-size: 13px; color: #475569; margin-top: 4px;"><strong>Subject:</strong> ${safeSubject}</div>
          </div>

          <div style="font-weight: 700; color: #334155; margin-bottom: 6px;">Support Representative Response:</div>
          <div class="reply-box">
            ${safeMessageHtml}
          </div>

          <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
            You can continue the conversation or view your past orders at any time through the Ardab Market web or mobile application.
          </p>

          <p style="font-size: 14px; color: #334155; margin-top: 28px; margin-bottom: 0;">
            Regards,<br />
            <strong>Ardab Market Customer Support Team</strong>
          </p>
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} Ardab Market Platform. All rights reserved.<br />
          This is an official transactional message regarding support ticket ${safeTicketNumber}.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Ardab Market Customer Support

Hello ${customerName || 'Valued Customer'},

A support representative has replied to your support request.

Ticket: ${ticketNumber}
Subject: ${subject}

--------------------------------------------------
${messageBody}
--------------------------------------------------

You can continue the conversation through the Ardab Market platform.

Regards,
Ardab Market Customer Support`;

  return { htmlContent, textContent };
}
