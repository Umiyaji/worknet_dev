const logoUrl = "cid:worknet-logo";

const createEmailLayout = ({ preheader, title, eyebrow, heading, intro, body, ctaLabel, ctaUrl, footerNote }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 640px) {
      .email-shell {
        border-radius: 16px !important;
      }

      .email-header,
      .email-body,
      .email-footer {
        padding-left: 20px !important;
        padding-right: 20px !important;
      }

      .email-brand-row,
      .email-brand-cell,
      .email-brand-copy {
        display: block !important;
        width: 100% !important;
      }

      .email-brand-copy {
        padding-left: 0 !important;
        padding-top: 14px !important;
      }

      .email-title {
        font-size: 24px !important;
      }

      .email-copy,
      .email-footer-copy {
        font-size: 14px !important;
      }

      .email-card {
        padding: 18px !important;
      }

      .email-button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        text-align: center !important;
      }
    }
  </style>
</head>
<body style="margin:0; padding:24px 12px; background-color:#f4f7fb; font-family:Arial, Helvetica, sans-serif; color:#14213d;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-shell" style="max-width:640px; margin:0 auto; background-color:#ffffff; border:1px solid #d9e2ec; border-radius:20px; overflow:hidden;">
    <tr>
      <td class="email-header" style="padding:32px 32px 20px; background:linear-gradient(135deg, #0f4c81 0%, #1769aa 100%);">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="email-brand-row">
          <tr>
            <td class="email-brand-cell" style="vertical-align:middle;">
              <img src="${logoUrl}" alt="Worknet" style="display:block; width:56px; height:56px; border-radius:14px; background-color:#ffffff; padding:8px;">
            </td>
            <td class="email-brand-copy" style="padding-left:14px; vertical-align:middle;">
              <p style="margin:0; font-size:12px; letter-spacing:1.6px; text-transform:uppercase; color:#dbeafe;">${eyebrow}</p>
              <h1 class="email-title" style="margin:6px 0 0; font-size:28px; line-height:1.2; color:#ffffff;">${heading}</h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="email-body" style="padding:32px;">
        <p class="email-copy" style="margin:0 0 16px; font-size:16px; line-height:1.7; color:#334e68;">${intro}</p>
        ${body}
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">
          <tr>
            <td style="border-radius:999px; background-color:#1769aa;">
              <a href="${ctaUrl}" class="email-button" style="display:inline-block; padding:14px 24px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none;">${ctaLabel}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td class="email-footer" style="padding:24px 32px 32px; border-top:1px solid #e5edf5;">
        <p class="email-footer-copy" style="margin:0 0 10px; font-size:14px; line-height:1.7; color:#486581;">${footerNote}</p>
        <p class="email-footer-copy" style="margin:0; font-size:13px; line-height:1.7; color:#7b8794;">Regards,<br>The Worknet Team</p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export function createWelcomeEmailTemplate(name, profileUrl) {
  return createEmailLayout({
    preheader: "Welcome to Worknet. Complete your profile and start building your network.",
    title: "Welcome to Worknet",
    eyebrow: "Welcome",
    heading: "Your professional network starts here",
    intro: `Hello ${name}, welcome to Worknet. Your account is ready, and you can now start building a stronger professional presence.`,
    body: `
      <p style="margin:0 0 18px; font-size:15px; line-height:1.8; color:#334e68;">
        We designed Worknet to help professionals present their experience clearly, connect with the right people, and discover meaningful opportunities.
      </p>
      <div class="email-card" style="padding:20px 22px; background-color:#f8fbff; border:1px solid #d9e8f5; border-radius:16px;">
        <p style="margin:0 0 12px; font-size:15px; font-weight:700; color:#102a43;">Recommended next steps</p>
        <ul style="margin:0; padding-left:20px; color:#486581;">
          <li style="margin:0 0 8px; font-size:14px; line-height:1.7;">Complete your profile so employers and connections can understand your background.</li>
          <li style="margin:0 0 8px; font-size:14px; line-height:1.7;">Expand your network by connecting with colleagues, recruiters, and peers.</li>
          <li style="margin:0; font-size:14px; line-height:1.7;">Explore relevant posts and job opportunities tailored to your interests.</li>
        </ul>
      </div>
    `,
    ctaLabel: "Complete Your Profile",
    ctaUrl: profileUrl,
    footerNote: "If you need support, simply reply after reaching our team through the platform and we will be happy to help."
  });
}

export function createSignupOtpEmailTemplate(name, otpCode, appUrl) {
  return createEmailLayout({
    preheader: `Your Worknet verification code is ${otpCode}.`,
    title: "Verify Your Email",
    eyebrow: "Email Verification",
    heading: "Confirm your email address",
    intro: `Hello ${name || "there"}, use the verification code below to complete your Worknet signup securely.`,
    body: `
      <p style="margin:0 0 18px; font-size:15px; line-height:1.8; color:#334e68;">
        To protect your account and keep the platform secure, we need to verify that this email address belongs to you.
      </p>
      <div class="email-card" style="padding:24px 22px; background-color:#f8fbff; border:1px solid #d9e8f5; border-radius:16px; text-align:center;">
        <p style="margin:0 0 12px; font-size:13px; letter-spacing:1.2px; text-transform:uppercase; color:#486581;">Your 4-digit verification code</p>
        <p style="margin:0; font-size:32px; font-weight:700; letter-spacing:10px; color:#102a43;">${otpCode}</p>
      </div>
      <p style="margin:18px 0 0; font-size:14px; line-height:1.8; color:#486581;">
        This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.
      </p>
    `,
    ctaLabel: "Open Worknet",
    ctaUrl: appUrl,
    footerNote: "For your security, never share this code with anyone."
  });
}

export const createConnectionAcceptedEmailTemplate = (senderName, recipientName, profileUrl) =>
  createEmailLayout({
    preheader: `${recipientName} accepted your connection request on Worknet.`,
    title: "Connection Request Accepted",
    eyebrow: "Network Update",
    heading: "Your connection request was accepted",
    intro: `Hello ${senderName}, ${recipientName} has accepted your connection request on Worknet.`,
    body: `
      <p style="margin:0 0 18px; font-size:15px; line-height:1.8; color:#334e68;">
        This is a great opportunity to continue the conversation, learn more about their background, and strengthen your professional network.
      </p>
      <div class="email-card" style="padding:20px 22px; background-color:#f8fbff; border:1px solid #d9e8f5; border-radius:16px;">
        <p style="margin:0 0 12px; font-size:15px; font-weight:700; color:#102a43;">Suggested follow-up</p>
        <ul style="margin:0; padding-left:20px; color:#486581;">
          <li style="margin:0 0 8px; font-size:14px; line-height:1.7;">Review ${recipientName}'s profile to understand their experience and interests.</li>
          <li style="margin:0 0 8px; font-size:14px; line-height:1.7;">Send a thoughtful message to introduce yourself or continue an earlier discussion.</li>
          <li style="margin:0; font-size:14px; line-height:1.7;">Look for shared interests, mutual connections, or collaboration opportunities.</li>
        </ul>
      </div>
    `,
    ctaLabel: "View Profile",
    ctaUrl: profileUrl,
    footerNote: "Meaningful professional relationships grow through timely follow-up and clear communication."
  });

export const createCommentNotificationEmailTemplate = (recipientName, commenterName, postUrl, commentContent) =>
  createEmailLayout({
    preheader: `${commenterName} commented on your Worknet post.`,
    title: "New Comment on Your Post",
    eyebrow: "Post Activity",
    heading: "You received a new comment",
    intro: `Hello ${recipientName}, ${commenterName} commented on one of your posts on Worknet.`,
    body: `
      <p style="margin:0 0 18px; font-size:15px; line-height:1.8; color:#334e68;">
        Staying engaged with thoughtful responses helps strengthen visibility and encourages stronger professional conversations.
      </p>
      <div class="email-card" style="padding:20px 22px; background-color:#f8fbff; border:1px solid #d9e8f5; border-radius:16px;">
        <p style="margin:0 0 12px; font-size:15px; font-weight:700; color:#102a43;">Comment preview</p>
        <p style="margin:0; font-size:14px; line-height:1.8; color:#486581;">"${commentContent}"</p>
      </div>
    `,
    ctaLabel: "View Comment",
    ctaUrl: postUrl,
    footerNote: "Prompt replies can help maintain momentum in conversations that matter to your network."
  });
