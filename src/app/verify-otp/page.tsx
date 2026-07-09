'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, ShieldCheck, Clock, XCircle } from 'lucide-react';
import { AuthShell } from '@/core/auth/components/auth-shell';

type Phase = 'entering' | 'verifying' | 'verified' | 'expired' | 'locked' | 'error';

const RESEND_COOLDOWN = 60;
const MAX_RESENDS = 5;

export default function VerifyOtpPage() {
  const router = useRouter();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const redirectRef = useRef(false);

  // Initialize email from session storage (client-only)
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('password_reset_email') || '';
  });
  const [maskedEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    const stored = sessionStorage.getItem('password_reset_email') || '';
    return stored.replace(/(^.)(.*)(@.*$)/, (_, a, b, c) => a + '\u2022'.repeat(Math.max(b.length, 1)) + c);
  });
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [phase, setPhase] = useState<Phase>(
    () => (typeof window !== 'undefined' && sessionStorage.getItem('password_reset_email') ? 'entering' : 'error')
  );
  const [alert, setAlert] = useState('');
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [resendCount, setResendCount] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Redirect if no email
  useEffect(() => {
    if (!email && !redirectRef.current) {
      redirectRef.current = true;
      router.replace('/forgot-password');
    }
  }, [email, router]);

  // Auto-focus first input
  const autoFocusRef = useRef(false);
  useEffect(() => {
    if (phase === 'entering' && !autoFocusRef.current) {
      autoFocusRef.current = true;
      // Slight delay to ensure DOM is ready
      const id = setTimeout(() => inputRefs.current[0]?.focus(), 50);
      return () => clearTimeout(id);
    }
  }, [phase]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Start countdown on mount
  // (handled by initial state value RESEND_COOLDOWN)

  const allFilled = useMemo(() => otp.every((d) => d.length === 1), [otp]);

  // Handle input change
  const handleChange = useCallback((index: number, value: string) => {
    // Only accept digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setAlert('');

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  // Handle keydown (backspace, arrow keys)
  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move focus to previous input
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...Array(6).fill('')];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const nextIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextIdx]?.focus();
  }, []);

  // Verify OTP
  const handleVerify = useCallback(async () => {
    if (!allFilled) return;

    const code = otp.join('');
    setPhase('verifying');
    setAlert('');

    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429 && data?.code === 'locked') {
        setPhase('locked');
        return;
      }

      if (data?.ok && data?.resetToken) {
        // Store the reset token and go to password page
        sessionStorage.setItem('password_reset_token', data.resetToken);
        setPhase('verified');
        return;
      }

      if (data?.code === 'expired') {
        setPhase('expired');
        return;
      }

      // Invalid OTP
      setPhase('entering');
      if (data?.remainingAttempts !== undefined) {
        setRemainingAttempts(data.remainingAttempts);
      }
      setAlert(data?.message || 'Incorrect verification code. Please try again.');
      // Clear OTP inputs
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch {
      setPhase('entering');
      setAlert('Network error. Please check your connection and try again.');
    }
  }, [allFilled, otp, email]);

  // Resend OTP
  const handleResend = useCallback(async () => {
    if (countdown > 0) return;

    setAlert('');
    try {
      const res = await fetch('/api/auth/resend-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429 && data?.code === 'max_resends') {
        setPhase('locked');
        return;
      }

      if (res.status === 429 && data?.code === 'cooldown') {
        setCountdown(data.retryAfter || RESEND_COOLDOWN);
        setAlert(data.message || 'Please wait before requesting a new code.');
        return;
      }

      if (data?.ok) {
        setCountdown(RESEND_COOLDOWN);
        setResendCount(data.resendCount || resendCount + 1);
        setOtp(Array(6).fill(''));
        setAlert('');
        setRemainingAttempts(null);
        setPhase('entering');
        inputRefs.current[0]?.focus();
      } else {
        setAlert(data?.message || 'Failed to send a new code. Please try again.');
      }
    } catch {
      setAlert('Network error. Please check your connection and try again.');
    }
  }, [countdown, email, resendCount]);

  // Navigate to reset password after verified
  useEffect(() => {
    if (phase === 'verified') {
      const timer = setTimeout(() => {
        router.replace('/reset-password');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, router]);

  // ——— Verified ———
  if (phase === 'verified') {
    return (
      <AuthShell title="Verified" subtitle="Verification successful.">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 grid place-items-center">
            <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 m-0">Redirecting you to set a new password...</p>
          <Loader2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-spin" />
        </div>
      </AuthShell>
    );
  }

  // ——— Expired ———
  if (phase === 'expired') {
    return (
      <AuthShell title="Code expired" subtitle="Your verification code has expired.">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 grid place-items-center">
            <Clock className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 m-0 max-w-[34ch]">
            For your security, verification codes expire after 10 minutes. Please request a new one.
          </p>
          <button
            type="button"
            onClick={handleResend}
            className="flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none"
          >
            <RefreshCw className="w-[18px] h-[18px]" />
            Request New Code
          </button>
          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="self-center text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-1 bg-transparent border-none cursor-pointer font-[inherit] p-1 px-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Start Over
          </button>
        </div>
      </AuthShell>
    );
  }

  // ——— Locked ———
  if (phase === 'locked') {
    return (
      <AuthShell title="Verification locked" subtitle="Too many failed attempts or requests.">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/40 grid place-items-center">
            <XCircle className="w-7 h-7 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 m-0 max-w-[36ch]">
            For security reasons, the verification process has been temporarily locked.
            Please contact support or try again later.
          </p>
          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="inline-flex items-center justify-center w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none"
          >
            Back to Forgot Password
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="self-center text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-1 bg-transparent border-none cursor-pointer font-[inherit] p-1 px-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </button>
        </div>
      </AuthShell>
    );
  }

  // ——— Main OTP Entry ———
  return (
    <AuthShell title="Enter verification code" subtitle={maskedEmail ? `Code sent to ${maskedEmail}` : 'Check your email for the 6-digit code.'}>
      <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); if (allFilled && phase === 'entering') handleVerify(); }}>
        {alert && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 p-3 text-sm rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
          >
            <span>{alert}</span>
          </div>
        )}

        {/* OTP Inputs */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                autoComplete="one-time-code"
                aria-label={`Digit ${i + 1}`}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={(e) => {
                  if (i === 0) handlePaste(e);
                }}
                className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-semibold rounded-lg border-2 transition-colors duration-120 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${
                  digit
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                    : alert
                      ? 'border-rose-300 dark:border-rose-700 focus:border-rose-500 focus:ring-[0_0_0_3px] focus:ring-rose-500/25'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                }`}
              />
            ))}
          </div>

          {/* Remaining attempts info */}
          {remainingAttempts !== null && remainingAttempts > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 m-0">
              {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
            </p>
          )}

          {/* Timer */}
          {countdown > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Resend in {countdown}s</span>
            </div>
          )}
        </div>

        {/* Verify Button */}
        <button
          type="submit"
          disabled={!allFilled || phase === 'verifying'}
          className={`flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none ${
            !allFilled || phase === 'verifying' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {phase === 'verifying' ? (
            <Loader2 className="w-[18px] h-[18px] animate-spin" />
          ) : (
            <ShieldCheck className="w-[18px] h-[18px]" />
          )}
          <span className={phase === 'verifying' ? 'invisible' : ''}>Verify Code</span>
        </button>

        {/* Resend */}
        <div className="flex flex-col items-center gap-2">
          {countdown <= 0 && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCount >= MAX_RESENDS}
              className={`flex items-center gap-1.5 text-sm font-medium cursor-pointer border-none bg-transparent transition-colors p-1 rounded-lg font-[inherit] ${
                resendCount >= MAX_RESENDS
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {resendCount >= MAX_RESENDS
                ? 'Maximum resends reached'
                : 'Resend verification code'}
            </button>
          )}
          {resendCount > 0 && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {resendCount}/{MAX_RESENDS} resend{resendCount !== 1 ? 's' : ''} used
            </span>
          )}
        </div>

        {/* Back links */}
        <div className="flex flex-col items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('password_reset_email');
              router.push('/forgot-password');
            }}
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-1 bg-transparent border-none cursor-pointer font-[inherit] p-1 px-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Use a different email
          </button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('password_reset_email');
              router.push('/');
            }}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline inline-flex items-center gap-1 bg-transparent border-none cursor-pointer font-[inherit] p-1 px-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </button>
        </div>
      </form>
    </AuthShell>
  );
}