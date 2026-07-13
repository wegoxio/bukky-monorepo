import type { BookingNotificationBusinessContext } from '../notifications.types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatExpiry(expiresAt: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(expiresAt);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }

  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function appendCacheBuster(url: string, version: string): string {
  if (!url || url.startsWith('data:')) {
    return url;
  }

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('v', version);
    return parsed.toString();
  } catch {
    return url;
  }
}

function toAbsoluteUrl(url: string, appPublicUrl: string): string {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return '';
  }

  try {
    return new URL(normalizedUrl).toString();
  } catch {
    return new URL(
      normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`,
      appPublicUrl.endsWith('/') ? appPublicUrl : `${appPublicUrl}/`,
    ).toString();
  }
}

function resolveLogoUrl(input: {
  business: BookingNotificationBusinessContext | null;
  assetBaseUrl: string;
  appPublicUrl: string;
}): string {
  const business = input.business;
  const logoKey = business?.logoKey?.replace(/^\/+/, '') ?? '';

  if (logoKey && input.assetBaseUrl) {
    return appendCacheBuster(`${input.assetBaseUrl}/${logoKey}`, business?.settingsUpdatedAt ?? '');
  }

  const brandingLogo = business?.branding.logoUrl?.trim() || '/bukky-logo.svg';
  return appendCacheBuster(
    toAbsoluteUrl(brandingLogo, input.appPublicUrl),
    business?.settingsUpdatedAt ?? '',
  );
}

function initialsFromName(value: string): string {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || 'B';
}

type AccountAccessEmailTemplateInput = {
  businessName: string;
  preheader: string;
  eyebrow: string;
  headline: string;
  intro: string;
  actionLabel: string;
  actionUrl: string;
  expiryLabel: string;
  supportLabel: string;
  appPublicUrl: string;
  assetBaseUrl: string;
  business: BookingNotificationBusinessContext | null;
};

export function buildAccountAccessEmail(input: AccountAccessEmailTemplateInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Bukky | ${input.eyebrow} | ${input.businessName}`;
  const business = input.business;
  const primary = business?.theme.primary || '#9759ef';
  const secondary = business?.theme.secondary || '#f7f1ff';
  const tertiary = business?.theme.tertiary || '#6b7280';
  const textPrimary = business?.theme.textPrimary || '#1f2937';
  const textSecondary = business?.theme.textSecondary || '#4b5563';
  const appName = business?.branding.appName?.trim() || 'Bukky';
  const logoUrl = resolveLogoUrl({
    business,
    assetBaseUrl: input.assetBaseUrl,
    appPublicUrl: input.appPublicUrl,
  });
  const logoFallback = initialsFromName(appName);

  const escapedBusinessName = escapeHtml(input.businessName);
  const escapedEyebrow = escapeHtml(input.eyebrow);
  const escapedHeadline = escapeHtml(input.headline);
  const escapedIntro = escapeHtml(input.intro);
  const escapedActionLabel = escapeHtml(input.actionLabel);
  const escapedActionUrl = escapeHtml(input.actionUrl);
  const escapedExpiryLabel = escapeHtml(input.expiryLabel);
  const escapedSupportLabel = escapeHtml(input.supportLabel);
  const escapedAppName = escapeHtml(appName);
  const escapedLogoUrl = escapeHtml(logoUrl);
  const escapedLogoFallback = escapeHtml(logoFallback);

  const html = `
  <!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(subject)}</title>
    </head>
    <body style="margin:0;padding:0;background:${escapeHtml(secondary)};font-family:Arial,Helvetica,sans-serif;color:${escapeHtml(textPrimary)};">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;background:linear-gradient(180deg,${escapeHtml(withAlpha(primary, 0.14))} 0%,#ffffff 100%);">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid ${escapeHtml(withAlpha(primary, 0.18))};box-shadow:0 28px 72px rgba(17,24,39,0.12);">
              <tr>
                <td style="padding:18px 28px;background:#111827;color:#ffffff;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="vertical-align:middle;">
                        <table role="presentation" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="width:34px;height:34px;border-radius:12px;background:${escapeHtml(primary)};text-align:center;vertical-align:middle;overflow:hidden;">
                              ${
                                logoUrl
                                  ? `<img src="${escapedLogoUrl}" alt="${escapedAppName}" width="34" height="34" style="display:block;width:34px;height:34px;object-fit:contain;border-radius:12px;background:#ffffff;" />`
                                  : `<span style="display:inline-block;padding-top:8px;font-size:15px;font-weight:800;color:#ffffff;">${escapedLogoFallback}</span>`
                              }
                            </td>
                            <td style="padding-left:12px;font-size:14px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;">${escapedAppName}</td>
                          </tr>
                        </table>
                      </td>
                      <td align="right" style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
                        ${escapedBusinessName}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:34px 30px 24px;background:linear-gradient(135deg,${escapeHtml(primary)} 0%,${escapeHtml(withAlpha(primary, 0.78))} 100%);color:#ffffff;">
                  <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.16);font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">
                    ${escapedEyebrow}
                  </div>
                  <h1 style="margin:18px 0 12px;font-size:31px;line-height:1.18;font-weight:800;color:#ffffff;">
                    ${escapedHeadline}
                  </h1>
                  <p style="margin:0;font-size:15px;line-height:1.75;color:rgba(255,255,255,0.94);">
                    ${escapedIntro}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:26px 30px 12px;">
                  <div style="padding:24px;border-radius:22px;background:${escapeHtml(withAlpha(primary, 0.06))};border:1px solid ${escapeHtml(withAlpha(primary, 0.24))};">
                    <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:${escapeHtml(textSecondary)};">
                      Para continuar, usa este enlace seguro y completa tu acceso.
                    </p>
                    <a href="${escapedActionUrl}" style="display:inline-block;padding:15px 24px;border-radius:16px;background:${escapeHtml(primary)};color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;box-shadow:0 14px 30px ${escapeHtml(withAlpha(primary, 0.28))};">
                      ${escapedActionLabel}
                    </a>
                    <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:${escapeHtml(tertiary)};">
                      ${escapedExpiryLabel}
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 30px 28px;">
                  <p style="margin:0;font-size:13px;line-height:1.7;color:${escapeHtml(textSecondary)};">
                    ${escapedSupportLabel}
                  </p>
                  <p style="margin:14px 0 0;font-size:12px;line-height:1.7;color:${escapeHtml(tertiary)};">
                    Si no solicitaste este acceso, puedes ignorar este correo.
                  </p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-top:1px solid ${escapeHtml(withAlpha(tertiary, 0.18))};padding-top:18px;">
                    <tr>
                      <td style="font-size:12px;line-height:1.6;color:${escapeHtml(tertiary)};">
                        Equipo Bukky<br />
                        Enviado de forma segura para ${escapedBusinessName}.
                      </td>
                      <td align="right" style="font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:${escapeHtml(withAlpha(primary, 0.9))};">
                        Bukky
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  const text = [
    `${input.headline} (${input.businessName})`,
    '',
    input.intro,
    '',
    `Acción: ${input.actionLabel}`,
    `Enlace seguro: ${input.actionUrl}`,
    input.expiryLabel,
    '',
    input.supportLabel,
    'Si no solicitaste este acceso, puedes ignorar este correo.',
    '',
    'Equipo Bukky',
  ].join('\n');

  return {
    subject,
    html,
    text,
  };
}

export function buildTenantAdminInvitationEmail(input: {
  tenantName: string;
  setupUrl: string;
  expiresAt: Date;
  appPublicUrl: string;
  assetBaseUrl: string;
  business: BookingNotificationBusinessContext | null;
}): {
  subject: string;
  html: string;
  text: string;
} {
  return buildAccountAccessEmail({
    businessName: input.tenantName,
    preheader: 'Activa tu acceso y define tu contraseña segura.',
    eyebrow: 'Activación de acceso',
    headline: 'Verifica tu correo y completa tu acceso',
    intro: `Te han invitado a administrar ${input.tenantName} desde Bukky. Al abrir este enlace verificaremos tu correo y podrás definir la contraseña con la que entrarás al panel.`,
    actionLabel: 'Activar acceso',
    actionUrl: input.setupUrl,
    expiryLabel: `Este enlace expira el ${formatExpiry(input.expiresAt)}.`,
    supportLabel:
      'Si el enlace expira, puedes usar la opción "Olvidé mi contraseña" para recibir uno nuevo.',
    appPublicUrl: input.appPublicUrl,
    assetBaseUrl: input.assetBaseUrl,
    business: input.business,
  });
}

export function buildPasswordResetEmail(input: {
  businessName: string;
  resetUrl: string;
  expiresAt: Date;
  appPublicUrl: string;
  assetBaseUrl: string;
  business: BookingNotificationBusinessContext | null;
}): {
  subject: string;
  html: string;
  text: string;
} {
  return buildAccountAccessEmail({
    businessName: input.businessName,
    preheader: 'Restablece tu contraseña de forma segura.',
    eyebrow: 'Recuperación de acceso',
    headline: 'Restablece tu contraseña',
    intro:
      'Recibimos una solicitud para actualizar tu contraseña. Usa este enlace seguro para definir una nueva clave de acceso.',
    actionLabel: 'Restablecer contraseña',
    actionUrl: input.resetUrl,
    expiryLabel: `Este enlace expira el ${formatExpiry(input.expiresAt)}.`,
    supportLabel:
      'Si no pediste este cambio, ignora este mensaje y tu acceso actual no se modificará.',
    appPublicUrl: input.appPublicUrl,
    assetBaseUrl: input.assetBaseUrl,
    business: input.business,
  });
}
