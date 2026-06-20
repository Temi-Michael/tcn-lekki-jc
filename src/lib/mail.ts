import nodemailer from "nodemailer";

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail({ to, subject, text, html }: EmailPayload) {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || `"TCN Lekki Sunday School" <${user || "no-reply@tcnlekki.org"}>`;

  console.log(`[Email Service] Attempting to send email to ${to}...`);

  if (!user || !pass) {
    console.log("----------------------------------------");
    console.log(`[Email Service] [DRY RUN / NO SMTP CREDENTIALS (SMTP_USER/SMTP_PASS) IN .ENV]`);
    console.log(`TO: ${to}`);
    console.log(`FROM: ${from}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`TEXT CONTENT:\n${text}`);
    console.log("----------------------------------------");
    return { success: true, dryRun: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.log(`[Email Service] Email sent successfully! MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Service] Failed to send email to ${to}:`, error);
    return { success: false, error };
  }
}

export async function sendChildRegistrationEmail(
  parentEmail: string,
  parentName: string,
  childName: string
) {
  const subject = `Sunday School Registration Confirmation - TCN Lekki`;
  const nameToUse = parentName ? parentName : "Parent/Guardian";
  
  const text = `Hello ${nameToUse},\n\nWe are excited to inform you that ${childName} has been successfully registered at TCN Lekki Sunday School.\n\nEvery Sunday, your child will be able to search for their name and check in at our Children Check-in Board Kiosk.\n\nIf you have any questions, please reach out to any Sunday School mentor or administrator.\n\nWarm regards,\nThe TCN Lekki Sunday School Team`;

  const html = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
        <h1 style="color: #2563eb; margin: 0; font-size: 24px; font-weight: 800;">TCN Lekki</h1>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Sunday School Department</p>
      </div>
      
      <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-top: 0;">Hello ${nameToUse},</p>
      
      <p style="font-size: 16px; line-height: 1.6; color: #334155;">
        We are excited to inform you that <strong>${childName}</strong> has been successfully registered at TCN Lekki Sunday School!
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; border-left: 4px solid #2563eb; margin: 24px 0;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569;">
          <strong>What happens next?</strong><br/>
          Every Sunday when you arrive at church, your child can search for their name on the public check-in board tablet and check in. This helps us keep track of attendance, lesson topics taught, and recognize milestones.
        </p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #475569;">
        If you have any questions or need to make corrections to your child's details (such as age or parent contact info), please reach out to any Sunday School mentor or administrator at the check-in desk.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
      
      <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 0;">
        Warm regards,<br/>
        <strong>TCN Lekki Sunday School Team</strong>
      </p>
    </div>
  `;

  return sendEmail({
    to: parentEmail,
    subject,
    text,
    html,
  });
}
