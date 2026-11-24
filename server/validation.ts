export interface WaitlistInput {
  fullName: string;
  email: string;
  whatsapp: string | null;
}

export type FieldErrors = Partial<Record<keyof WaitlistInput, string>>;

// Practical email check: one @, no spaces, a dotted domain with a 2+ letter TLD.
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/;
const URL_LIKE_RE = /(https?:\/\/|www\.|\.(com|net|org|ru|xyz|info|top)\b|<|>)/i;
// Control characters (except normal whitespace collapsed below).
const CONTROL_RE = /[\u0000-\u001F\u007F]/;

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  if (email.length < 6 || email.length > 254) return false;
  if (!EMAIL_RE.test(email)) return false;
  const [local, domain] = email.split('@');
  if (local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (domain.includes('..')) return false;
  return true;
}

export function validateWaitlist(body: Record<string, unknown>): { data?: WaitlistInput; errors?: FieldErrors } {
  const errors: FieldErrors = {};

  const fullName = str(body.fullName).replace(/\s+/g, ' ').trim();
  if (!fullName) errors.fullName = 'Please enter your full name.';
  else if (fullName.length < 2) errors.fullName = 'Name must be at least 2 characters.';
  else if (fullName.length > 80) errors.fullName = 'Name must be 80 characters or fewer.';
  else if (CONTROL_RE.test(fullName) || URL_LIKE_RE.test(fullName) || !/\p{L}/u.test(fullName)) {
    errors.fullName = 'Please enter a valid name.';
  }

  const email = normalizeEmail(str(body.email));
  if (!email) errors.email = 'Please enter your email address.';
  else if (!isValidEmail(email)) errors.email = 'Please enter a valid email address.';

  let whatsapp: string | null = null;
  const rawPhone = str(body.whatsapp).trim();
  if (rawPhone) {
    const digits = rawPhone.replace(/\D/g, '');
    if (!/^\+?[\d\s().-]+$/.test(rawPhone) || digits.length < 7 || digits.length > 15) {
      errors.whatsapp = 'Please enter a valid WhatsApp number, including country code.';
    } else {
      whatsapp = (rawPhone.startsWith('+') ? '+' : '') + digits;
    }
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { data: { fullName, email, whatsapp } };
}
