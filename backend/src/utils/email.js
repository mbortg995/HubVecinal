import nodemailer from 'nodemailer';

let cachedTransporter;

// Crea el transporte SMTP si hay configuración; si no, devuelve null (modo dev).
function getTransporter() {
  if (cachedTransporter !== undefined) return cachedTransporter;
  if (process.env.SMTP_HOST) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  } else {
    cachedTransporter = null;
  }
  return cachedTransporter;
}

// Plantilla base reutilizable: título, cuerpo y un botón de acción opcional.
export function baseTemplate({ title, body, actionUrl, actionLabel }) {
  const button = actionUrl
    ? `<p style="margin:24px 0"><a href="${actionUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${actionLabel || 'Abrir'}</a></p>
       <p style="color:#64748b;font-size:13px">Si el botón no funciona, copia este enlace:<br>${actionUrl}</p>`
    : '';
  const text = `${title}\n\n${body}${actionUrl ? `\n\n${actionLabel || 'Abrir'}: ${actionUrl}` : ''}`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
    <h2 style="color:#2563eb">HubVecinal</h2>
    <h3>${title}</h3>
    <p style="line-height:1.5">${body}</p>
    ${button}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="color:#94a3b8;font-size:12px">Este mensaje se ha enviado desde HubVecinal.</p>
  </div>`;
  return { html, text };
}

// Envía un email. En modo dev (sin SMTP) lo registra en consola y no envía nada.
export async function sendEmail({ to, subject, html, text }) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || 'HubVecinal <no-reply@hubvecinal.dev>';

  if (!transporter) {
    console.log(
      `\n[email:dev] (no se envía, SMTP no configurado)\n  Para:    ${to}\n  Asunto:  ${subject}\n  ${(text || '').replace(/\n/g, '\n  ')}\n`
    );
    return { delivered: false, dev: true };
  }

  await transporter.sendMail({ from, to, subject, html, text });
  return { delivered: true };
}
