'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import type { PasswordRule } from '@/lib/password-reset';

const RULES: PasswordRule[] = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function strengthOf(p: string): { score: number; label: string; barColor: string; barBg: string } {
  if (!p) return { score: 0, label: '', barColor: '', barBg: 'bg-gray-200 dark:bg-gray-800' };
  const passed = RULES.filter((r) => r.test(p)).length;
  if (passed <= 1) return { score: 1, label: 'Weak', barColor: 'bg-rose-500', barBg: 'bg-rose-500' };
  if (passed <= 2) return { score: 2, label: 'Fair', barColor: 'bg-amber-500', barBg: 'bg-amber-500' };
  if (passed <= 3) return { score: 3, label: 'Medium', barColor: 'bg-yellow-500', barBg: 'bg-yellow-500' };
  if (passed <= 4) return { score: 4, label: 'Strong', barColor: 'bg-emerald-500', barBg: 'bg-emerald-500' };
  return { score: 5, label: 'Very Strong', barColor: 'bg-emerald-600', barBg: 'bg-emerald-600' };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [expired, setExpired] = useState(false);

  // Load reset token from session storage
  useEffect(() => {
    const token = sessionStorage.getItem('password_reset_token');
    if (token) {
      setResetToken(token);
    } else {
      router.replace('/forgot-password');
    }
    setInitialized(true);
  }, [router]);

  const ruleStates = useMemo(() => RULES.map((r) => ({ label: r.label, ok: r.test(password) })), [password]);
  const allRulesOk = ruleStates.every((r) => r.ok);
  const passwordsMatch = password.length > 0 && password === confirm;
  const strength = strengthOf(password);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!allRulesOk) {
      setFormError('Password does not meet all requirements.');
      return;
    }
    if (!passwordsMatch) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          password,
          confirmPassword: confirm,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.ok) {
        // Clear session data
        sessionStorage.removeItem('password_reset_email');
        sessionStorage.removeItem('password_reset_token');
        setSuccess(true);
        return;
      }

      if (data?.code === 'expired') {
        setExpired(true);
        return;
      }

      setFormError(data?.message || "We couldn't reset your password. Please try again.");
    } catch {
      setFormError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [allRulesOk, passwordsMatch, resetToken, password, confirm]);

  // ——— Loading ———
  if (!initialized || !resetToken) {
    return (
      <AuthShell title="Loading..." subtitle="">
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
        </div>
      </AuthShell>
    );
  }

  // ——— Expired ———
  if (expired) {
    return (
      <AuthShell title="Session expired" subtitle="Your verification session has expired.">
        <div className="flex flex-col items-center text-center gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 m-0 max-w-[34ch]">
            For your security, the password reset session has expired. Please request a new verification code.
          </p>
          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="inline-flex items-center justify-center w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none"
          >
            Request New Code
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

  // ——— Success ———
  if (success) {
    return (
      <AuthShell title="Password Updated Successfully" subtitle="Your password has been changed.">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 grid place-items-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 m-0 max-w-[34ch]">
            Your password has been changed successfully. All other sessions have been signed out for your security.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 m-0">
            Please log in using your new password.
          </p>
          <button
            type="button"
            onClick={() => router.replace('/')}
            className="inline-flex items-center justify-center w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none"
          >
            Return to Login
          </button>
        </div>
      </AuthShell>
    );
  }

  // ——— Form ———
  return (
    <AuthShell title="Create new password" subtitle="Choose a strong password you don't use elsewhere.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 p-3 text-sm rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
          >
            <span>{formError}</span>
          </div>
        )}

        {/* New password */}
        <div className="flex flex-col gap-1">
          <label htmlFor="new-password" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            New Password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Enter a new password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (formError) setFormError(''); }}
              className="w-full min-h-[48px] px-3 pr-10 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25 transition-colors duration-120 font-[inherit] outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-transparent border-none cursor-pointer p-0"
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Strength bar */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                    i <= strength.score ? strength.barColor : 'bg-gray-200 dark:bg-gray-800'
                  }`}
                />
              ))}
            </div>
            {strength.label && (
              <span
                className={`text-xs font-medium min-w-[80px] text-right ${
                  strength.score <= 1
                    ? 'text-rose-600 dark:text-rose-400'
                    : strength.score <= 2
                    ? 'text-amber-600 dark:text-amber-400'
                    : strength.score <= 3
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {strength.label}
              </span>
            )}
          </div>

          {/* Requirements */}
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
            {ruleStates.map((r) => (
              <li key={r.label} className="flex items-center gap-1.5 text-xs">
                {r.ok ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
                )}
                <span className={r.ok ? 'text-gray-600 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}>
                  {r.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Confirm password */}
        <div className="flex flex-col gap-1">
          <label htmlFor="confirm-password" className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter the new password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); if (formError) setFormError(''); }}
              aria-invalid={confirm.length > 0 && !passwordsMatch ? 'true' : undefined}
              className={`w-full min-h-[48px] px-3 pr-10 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none ${
                confirm.length > 0 && !passwordsMatch
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                  : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-transparent border-none cursor-pointer p-0"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirm.length > 0 && !passwordsMatch && (
            <span className="text-sm text-rose-600 dark:text-rose-400" role="alert">
              Passwords do not match.
            </span>
          )}
          {confirm.length > 0 && passwordsMatch && (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              Passwords match.
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || !allRulesOk || !passwordsMatch}
          className={`flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none ${
            submitting || !allRulesOk || !passwordsMatch ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {submitting && <Loader2 className="w-[18px] h-[18px] animate-spin" />}
          <span className={submitting ? 'invisible' : ''}>Reset Password</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem('password_reset_email');
            sessionStorage.removeItem('password_reset_token');
            router.push('/');
          }}
          className="self-center bg-transparent border-none cursor-pointer font-[inherit] text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline p-1 px-2 rounded-lg transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancel
        </button>
      </form>
    </AuthShell>
  );
}