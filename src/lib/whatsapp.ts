/**
 * Helper utilities for formatting WhatsApp phone numbers and generating direct click-to-chat links.
 */

export function cleanPhoneDigits(input: string): string {
  if (!input) return '';
  // Extract digits
  let digits = input.replace(/\D/g, '');
  if (!digits) return '';

  // Handle leading zeros if present (e.g. 092984567890 -> 92984567890)
  while (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // If 10 or 11 digits (e.g. 92984567890), prepend country code 55 for Brazil
  if (digits.length === 10 || digits.length === 11) {
    if (!digits.startsWith('55')) {
      digits = `55${digits}`;
    }
  }
  return digits;
}

export function buildWhatsAppUrl(rawPhoneOrUrl: string, message?: string): string {
  if (!rawPhoneOrUrl) return '#';

  const trimmed = rawPhoneOrUrl.trim();
  const encodedMsg = message ? encodeURIComponent(message) : '';

  // If user provided a full HTTP/HTTPS or wa.me URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('wa.me/')) {
    // Try to extract digits if it's a standard wa.me URL
    const match = trimmed.match(/(?:wa\.me\/|phone=)(\d+)/);
    if (match && match[1]) {
      const digits = cleanPhoneDigits(match[1]);
      return `https://wa.me/${digits}${encodedMsg ? `?text=${encodedMsg}` : ''}`;
    }
    // Otherwise append text param safely
    const hasParams = trimmed.includes('?');
    const separator = hasParams ? '&' : '?';
    const finalUrl = trimmed.startsWith('wa.me/') ? `https://${trimmed}` : trimmed;
    return encodedMsg ? `${finalUrl}${separator}text=${encodedMsg}` : finalUrl;
  }

  // Raw phone number
  const digits = cleanPhoneDigits(trimmed);
  if (!digits) return '#';

  return `https://wa.me/${digits}${encodedMsg ? `?text=${encodedMsg}` : ''}`;
}

export function formatPhoneDisplay(rawPhone: string): string {
  const digits = cleanPhoneDigits(rawPhone);
  if (!digits) return rawPhone || '';

  let d = digits;
  if (d.startsWith('55') && d.length >= 12) {
    d = d.slice(2);
  }

  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  } else if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }

  return rawPhone;
}

export function getEffectiveWhatsApp(
  captador?: { whatsapp?: string; phone?: string } | null,
  companySettings?: { whatsapp?: string; phone?: string } | null
): string {
  const capWa = captador?.whatsapp?.trim() || '';
  const compWa = companySettings?.whatsapp?.trim() || '';
  const capPhone = captador?.phone?.trim() || '';
  const compPhone = companySettings?.phone?.trim() || '';

  // 1. If captador has a custom WhatsApp defined (and not a placeholder/empty), prefer it
  if (capWa && capWa !== '' && capWa !== '5592984567890' && capWa !== '5592981234567') {
    return capWa;
  }

  // 2. If companySettings has a custom WhatsApp, use it
  if (compWa && compWa !== '') {
    return compWa;
  }

  // 3. Fallback to captador WhatsApp or phone
  if (capWa) return capWa;
  if (capPhone) return capPhone;
  if (compPhone) return compPhone;

  return '5592981234567';
}
