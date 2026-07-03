'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';

type State = 'idle' | 'sending' | 'sent' | 'oauth' | 'error';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [alert, setAlert] = useState('');
  const [state, setState] = useState<State>('idle');
  const [oauthMessage, setOauthMessage] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert('');
    setEmailError('');

    const value = email.trim();
    if (!value) {
      setEmailError('Email address is required.');
      emailRef.current?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Enter a valid email address.');
      emailRef.current?.focus();
      return;
    }

    setState('sending');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setAlert(data?.message || 'Too many reset requests. Please try again later.');
        setState('idle');
        return;
      }

      if (data?.code === 'oauth_only') {
        setOauthMessage(data.message || 'This account uses a different sign-in method.');
        setState('oauth');
        return;
      }

      // Success — redirect to OTP verification page
      if (data?.ok) {
        const serverMasked = data.email;
        const clientMasked = value.replace(/(^.)(.*)(@.*$)/, (_, a, b, c) => a + '\u2022'.repeat(Math.max(b.length, 1)) + c);
        setMaskedEmail(serverMasked || clientMasked);
        setState('sent');
        // Store email for the OTP page
        sessionStorage.setItem('password_reset_email', value.trim().toLowerCase());
        return;
      }

      // Generic fallback
      setAlert(data?.message || 'Something went wrong. Please try again.');
      setState('idle');
    } catch {
      setAlert('Network error. Please check your connection and try again.');
      setState('idle');
    }
  }, [email]);

  const goToOtp = useCallback(() => {
    router.push('/verify-otp');
  }, [router]);

  // ——— Sent state ———
  if (state === 'sent') {
    return (
      <AuthShell title="Check your email" subtitle="We've sent a verification code to your email.">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 grid place-items-center">
            <Mail className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 m-0 max-w-[36ch]">
            If an account exists for <span className="font-medium text-gray-900 dark:text-gray-100">{maskedEmail}</span>, a 6-digit verification code has been sent.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
            The code expires in 10 minutes. Check your spam folder if you don&rsquo;t see it.
          </p>
          <button
            type="button"
            onClick={goToOtp}
            className="mt-1 flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none"
          >
            <ShieldCheck className="w-[18px] h-[18px]" />
            Enter Verification Code
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline bg-transparent border-none cursor-pointer font-[inherit] p-1 px-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </button>
        </div>
      </AuthShell>
    );
  }

  // ——— OAuth state ———
  if (state === 'oauth') {
    return (
      <AuthShell title="Different sign-in method" subtitle="Use the original provider to access your account.">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line m-0">
            {oauthMessage}
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline bg-transparent border-none cursor-pointer font-[inherit] p-1 px-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </button>
        </div>
      </AuthShell>
    );
  }

  // ——— Form state ———
  return (
    <AuthShell title="Forgot password?" subtitle="Enter your email and we'll send you a verification code.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {alert && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 p-3 text-sm rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
          >
            <span>{alert}</span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="recover-email" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Email Address
          </label>
          <input
            ref={emailRef}
            id="recover-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
              if (alert) setAlert('');
            }}
            aria-invalid={emailError ? 'true' : undefined}
            className={`w-full min-h-[48px] px-3 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none ${
              emailError
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
            }`}
          />
          {emailError && (
            <span className="text-sm text-rose-600 dark:text-rose-400" role="alert">
              {emailError}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={state === 'sending'}
          className={`flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none ${
            state === 'sending' ? 'opacity-60 cursor-progress' : ''
          }`}
        >
          {state === 'sending' && <Loader2 className="w-[18px] h-[18px] animate-spin" />}
          <span className={state === 'sending' ? 'invisible' : ''}>Send Verification Code</span>
        </button>

        <button
          type="button"
          onClick={() => router.push('/')}
          className="self-center bg-transparent border-none cursor-pointer font-[inherit] text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline p-1 px-2 rounded-lg transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </button>
      </form>
    </AuthShell>
  );
}