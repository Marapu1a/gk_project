// src/utils/transborderConsentEmail.ts
import { TRANSBORDER_CONSENT_DOCUMENT } from './transborderConsentDocument';

type BuildTransborderConsentEmailParams = {
  fullName?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildTransborderConsentEmailSubject(): string {
  return 'Согласие на трансграничную передачу персональных данных';
}

export function buildTransborderConsentEmailHtml(
  params: BuildTransborderConsentEmailParams = {},
): string {
  const greeting = params.fullName?.trim()
    ? `Здравствуйте, ${escapeHtml(params.fullName)}!`
    : 'Здравствуйте,';

  const fullTextHtml = escapeHtml(TRANSBORDER_CONSENT_DOCUMENT.fullText).replace(
    /\n/g,
    '<br />',
  );

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #111827;">
      <p>${greeting}</p>

      <p>
        Вы подтвердили согласие на трансграничную передачу персональных данных при работе с сайтом
        и участии в процедуре сертификации в Центре сертификации специалистов прикладного анализа
        поведения (reestrpap.ru).
      </p>

      <p>
        В соответствии с требованиями законодательства направляем вам текст данного согласия.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

      <div>${fullTextHtml}</div>
    </div>
  `.trim();
}
