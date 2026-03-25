import { Resend } from "resend";

export async function sendEmail(to: string, subject: string, text: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject,
    text,
  });
}
