import React, { useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Bell, CheckCircle2, Loader2, Lock, Sparkles } from 'lucide-react';

type Field = 'fullName' | 'email' | 'whatsapp';
type FieldErrors = Partial<Record<Field, string>>;
type Status = 'idle' | 'submitting' | 'success';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,24}$/;

function validate(values: Record<Field, string>): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.fullName.trim();
  if (!name) errors.fullName = 'Please enter your full name.';
  else if (name.length < 2) errors.fullName = 'Name must be at least 2 characters.';
  else if (name.length > 80) errors.fullName = 'Name must be 80 characters or fewer.';

  const email = values.email.trim();
  if (!email) errors.email = 'Please enter your email address.';
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.email = 'Please enter a valid email address.';

  const phone = values.whatsapp.trim();
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
      errors.whatsapp = 'Please enter a valid WhatsApp number, including country code.';
    }
  }
  return errors;
}

const PERKS = [
  'Early access before the public launch',
  'First look at new features as they ship',
  'No spam — only meaningful updates',
];

export const Waitlist: React.FC = () => {
  const [values, setValues] = useState<Record<Field, string>>({ fullName: '', email: '', whatsapp: '' });
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const startedAt = useRef(Date.now());
  const inputRefs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  const update = (field: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (formError) setFormError(null);
  };

  const focusFirstError = (errs: FieldErrors) => {
    const first = (['fullName', 'email', 'whatsapp'] as Field[]).find((f) => errs[f]);
    if (first) inputRefs.current[first]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;

    const clientErrors = validate(values);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length) {
      focusFirstError(clientErrors);
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          whatsapp: values.whatsapp.trim(),
          website: honeypot,
          startedAt: startedAt.current,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setStatus('success');
        return;
      }

      setStatus('idle');
      if (data?.fields) {
        setErrors(data.fields);
        focusFirstError(data.fields);
      }
      setFormError(
        data?.error ||
          (res.status === 429
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : 'Something went wrong. Please try again.'),
      );
    } catch {
      setStatus('idle');
      setFormError('Could not reach the server. Check your connection and try again.');
    }
  };

  const inputClass = (field: Field) =>
    `w-full rounded-xl border bg-white px-4 py-3.5 text-base text-brand-navy placeholder:text-brand-muted/80 outline-none transition-smooth focus:ring-4 ${
      errors[field]
        ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
        : 'border-brand-border hover:border-brand-purple/40 focus:border-brand-purple focus:ring-brand-purpleLight'
    }`;

  const submitting = status === 'submitting';

  return (
    <section id="waitlist" className="relative py-20 md:py-28 bg-brand-navy overflow-hidden scroll-mt-20">
      {/* Soft brand glows */}
      <div className="absolute -top-32 -left-24 w-[420px] h-[420px] bg-brand-purple/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-0 w-[460px] h-[460px] bg-brand-mint/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div className="text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-brand-mint" />
              <span>Join the waitlist</span>
            </div>

            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
              Something Better <span className="text-[#A996FF]">Is Coming.</span>
            </h2>

            <p className="text-lg text-white/70 leading-relaxed max-w-xl">
              Meet A Note — Your work, your earnings, your records, all organized in one simple app.
            </p>

            <ul className="space-y-3 pt-2">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-3 text-white/85 text-[15px]">
                  <span className="w-6 h-6 rounded-full bg-brand-mint/15 border border-brand-mint/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-mint" />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-mockup border border-white/10 relative">
            {status === 'success' ? (
              <div className="text-center py-6 sm:py-10 animate-fadeIn" role="status" aria-live="polite">
                <div className="w-16 h-16 rounded-2xl bg-brand-mintLight border border-brand-mint/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-brand-mintDark" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight">You're on the list!</h3>
                <p className="mt-3 text-brand-slate leading-relaxed max-w-sm mx-auto">
                  Thanks for joining A Note. We'll notify you as soon as we have something exciting to share.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-describedby="waitlist-privacy">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-11 h-11 rounded-xl bg-brand-purpleLight flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-brand-purple" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-brand-navy leading-tight">Get early access</h3>
                    <p className="text-sm text-brand-muted">It takes less than 30 seconds.</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="wl-name" className="block text-sm font-semibold text-brand-navy mb-1.5">
                    Full Name <span className="text-brand-purple">*</span>
                  </label>
                  <input
                    id="wl-name"
                    ref={(el) => (inputRefs.current.fullName = el)}
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    placeholder="Your full name"
                    value={values.fullName}
                    onChange={update('fullName')}
                    disabled={submitting}
                    aria-invalid={!!errors.fullName}
                    aria-describedby={errors.fullName ? 'wl-name-err' : undefined}
                    className={inputClass('fullName')}
                  />
                  {errors.fullName && (
                    <p id="wl-name-err" className="mt-1.5 text-sm text-red-600">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="wl-email" className="block text-sm font-semibold text-brand-navy mb-1.5">
                    Email Address <span className="text-brand-purple">*</span>
                  </label>
                  <input
                    id="wl-email"
                    ref={(el) => (inputRefs.current.email = el)}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder="you@example.com"
                    value={values.email}
                    onChange={update('email')}
                    disabled={submitting}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'wl-email-err' : undefined}
                    className={inputClass('email')}
                  />
                  {errors.email && <p id="wl-email-err" className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="wl-whatsapp" className="block text-sm font-semibold text-brand-navy mb-1.5">
                    WhatsApp Number <span className="text-brand-muted font-normal">(optional)</span>
                  </label>
                  <input
                    id="wl-whatsapp"
                    ref={(el) => (inputRefs.current.whatsapp = el)}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={24}
                    placeholder="+880 1XXX XXXXXX"
                    value={values.whatsapp}
                    onChange={update('whatsapp')}
                    disabled={submitting}
                    aria-invalid={!!errors.whatsapp}
                    aria-describedby={errors.whatsapp ? 'wl-wa-err' : undefined}
                    className={inputClass('whatsapp')}
                  />
                  {errors.whatsapp && <p id="wl-wa-err" className="mt-1.5 text-sm text-red-600">{errors.whatsapp}</p>}
                </div>

                {/* Honeypot: hidden from people and assistive tech, bots tend to fill it. */}
                <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                  <label htmlFor="wl-website">Website</label>
                  <input
                    id="wl-website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                {formError && (
                  <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-brand-purple hover:bg-brand-purpleDark disabled:opacity-80 disabled:cursor-wait text-white text-base font-semibold shadow-button hover:shadow-xl transition-smooth active:scale-[0.98] group"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Joining…</span>
                    </>
                  ) : (
                    <>
                      <span>Join the Waitlist</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-smooth" />
                    </>
                  )}
                </button>

                <p id="waitlist-privacy" className="flex items-center justify-center gap-1.5 text-xs text-brand-muted text-center">
                  <Lock className="w-3.5 h-3.5" />
                  We only use your details to contact you about A Note.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
