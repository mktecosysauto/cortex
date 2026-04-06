import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resend) resend = new Resend(apiKey);
  return resend;
}

export interface BriefingEmailData {
  clientEmail: string;
  clientName: string;
  projectName: string;
  senderName: string;
  formLink: string;
  brandColor?: string;
  brandLogoUrl?: string;
  customMessage?: string;
}

export async function sendBriefingEmail(data: BriefingEmailData): Promise<{ ok: boolean; error?: string }> {
  const client = getResend();
  if (!client) {
    return { ok: false, error: "RESEND_API_KEY não configurada. Configure a chave para envio de emails." };
  }

  const accentColor = data.brandColor ?? "#BA7517";
  const logoHtml = data.brandLogoUrl
    ? `<img src="${data.brandLogoUrl}" alt="${data.projectName}" style="height:48px;object-fit:contain;margin-bottom:24px;" />`
    : `<div style="font-family:monospace;font-size:20px;font-weight:700;letter-spacing:4px;color:#fff;margin-bottom:24px;">${data.projectName.toUpperCase()}</div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Briefing — ${data.projectName}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #1a1a1a;max-width:560px;width:100%;">
        <!-- Header -->
        <tr><td style="padding:40px 40px 32px;border-bottom:1px solid #1a1a1a;text-align:center;">
          ${logoHtml}
          <div style="font-family:monospace;font-size:9px;letter-spacing:4px;color:#333;text-transform:uppercase;">BRIEFING CRIATIVO</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="font-family:monospace;font-size:11px;color:#888;letter-spacing:1px;margin:0 0 8px;">Olá, ${data.clientName}</p>
          <p style="font-family:monospace;font-size:14px;color:#fff;font-weight:700;letter-spacing:2px;margin:0 0 24px;text-transform:uppercase;">${data.projectName}</p>
          <p style="font-family:sans-serif;font-size:14px;color:#888;line-height:1.6;margin:0 0 24px;">
            ${data.customMessage ?? `${data.senderName} enviou um formulário de briefing para você. Suas respostas ajudarão a criar um projeto personalizado e alinhado com a identidade da sua marca.`}
          </p>
          <p style="font-family:sans-serif;font-size:13px;color:#666;line-height:1.6;margin:0 0 32px;">
            O formulário é rápido, intuitivo e pode ser respondido pelo celular. Leva cerca de 5 a 10 minutos.
          </p>
          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
            <tr><td style="background:${accentColor};padding:0;">
              <a href="${data.formLink}" target="_blank" style="display:inline-block;padding:16px 40px;font-family:monospace;font-size:10px;font-weight:700;letter-spacing:4px;color:#fff;text-decoration:none;text-transform:uppercase;">RESPONDER BRIEFING →</a>
            </td></tr>
          </table>
          <!-- Link fallback -->
          <p style="font-family:monospace;font-size:9px;color:#333;letter-spacing:1px;margin:0 0 4px;text-transform:uppercase;">Ou acesse o link diretamente:</p>
          <p style="font-family:monospace;font-size:10px;color:#555;word-break:break-all;margin:0;">${data.formLink}</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;border-top:1px solid #1a1a1a;">
          <p style="font-family:monospace;font-size:8px;color:#333;letter-spacing:2px;text-transform:uppercase;margin:0;">Enviado por ${data.senderName} via CÓRTEX</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const result = await client.emails.send({
      from: "CÓRTEX <briefing@cortexdesign.app>",
      to: data.clientEmail,
      subject: `Briefing: ${data.projectName} — ${data.senderName}`,
      html,
    });
    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido ao enviar email";
    return { ok: false, error: msg };
  }
}
