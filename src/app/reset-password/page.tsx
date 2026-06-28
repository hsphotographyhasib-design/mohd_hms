'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';

interface Rule {
  label: string;
  test: (p: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function strengthOf(p: string): { score: number; label: string; barClass: string } {
  if (!p) return { score: 0, label: '', barClass: 'bg-gray-200 dark:bg-gray-800' };
  const passed = RULES.filter((r) => r.test(p)).length;
  if (passed <= 2) return { score: 1, label: 'Weak', barClass: 'bg-rose-500' };
  if (passed <= 4) return { score: 2, label: 'Medium', barClass: 'bg-amber-500' };
  return { score: 3, label: 'Strong', barClass: 'bg-emerald-500' };
}

type Phase = 'verifying' | 'invalid' | 'expired' | 'ready' | 'submitting' | 'success';

function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [phase, setPhase] = useState<Phase>('verifying');
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!token) {
        setPhase('invalid');
        return;
      }
      try {
        const res = await fetch(`/api/auth/reset-password/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data?.ok) {
          setMaskedEmail(data.email ?? null);
          setPhase('ready');
        } else if (data?.reason === 'expired') {
          setPhase('expired');
        } else {
          setPhase('invalid');
        }
      } catch {
        if (!cancelled) setPhase('invalid');
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const ruleStates = useMemo(() => RULES.map((r) => ({ label: r.label, ok: r.test(password) })), [password]);
  const allRulesOk = ruleStates.every((r) => r.ok);
  const passwordsMatch = password.length > 0 && password === confirm;
  const strength = strengthOf(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!allRulesOk) {
      setFormError('Password does not meet requirements.');
      return;
    }
    if (!passwordsMatch) {
      setFormError('Passwords do not match.');
      return;
    }
    setPhase('submitting');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword: confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setPhase('success');
        return;
      }
      if (data?.code === 'expired') {
        setPhase('expired');
        return;
      }
      if (data?.code === 'invalid_link') {
        setPhase('invalid');
        return;
      }
      setFormError(data?.message || 'We couldn\'t reset your password. Please try again.');
      setPhase('ready');
    } catch {
      setFormError('Network error. Please check your connection and try again.');
      setPhase('ready');
    }
  }

  if (phase === 'verifying') {
    return (
      <AuthShell title="Verifying link" subtitle="Just a moment...">
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
        </div>
      </AuthShell>
    );
  }

  if (phase === 'invalid') {
    return (
      <AuthShell title="Invalid reset link" subtitle="This link is not valid or has already been used.">
        <div className="flex flex-col items-center text-center gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 m-0 max-w-[34ch]">
            For your security, password reset links can only be used once.
            Please request a new link.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120"
          >
            Request a new link
          </Link>
          <Link
            href="/"
            className="self-center text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (phase === 'expired') {
    return (
      <AuthShell title="Link expired" subtitle="This password reset link has expired.">
        <div className="flex flex-col items-center text-center gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 m-0 max-w-[34ch]">
            For your security, reset links expire after 15 minutes. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120"
          >
            Request a new link
          </Link>
          <Link
            href="/"
            className="self-center text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (phase === 'success') {
    return (
      <AuthShell title="Password Updated Successfully" subtitle="Your password has been changed.">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 grid place-items-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 m-0 max-w-[34ch]">
            Please log in using your new password.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120"
          >
            Return to Login
          </Link>
        </div>
      </AuthShell>
    );
  }

  // Ready / submitting
  return (
    <AuthShell
      title="Create new password"
      subtitle={maskedEmail ? `For ${maskedEmail}` : 'Choose a strong password you don’t use elsewhere.'}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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
              onChange={(e) => setPassword(e.target.value)}
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
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
              <div
                className={`h-full ${strength.barClass} transition-all duration-200`}
                style={{ width: `${(strength.score / 3) * 100}%` }}
              />
            </div>
            {strength.label && (
              <span
                className={`text-xs font-medium ${
                  strength.score === 1
                    ? 'text-rose-600 dark:text-rose-400'
                    : strength.score === 2
                    ? 'text-amber-600 dark:text-amber-400'
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

        {/* Confirm */}
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
              onChange={(e) => setConfirm(e.target.value)}
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
        </div>

        <button
          type="submit"
          disabled={phase === 'submitting' || !allRulesOk || !passwordsMatch}
          className={`flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none ${
            phase === 'submitting' || !allRulesOk || !passwordsMatch ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {phase === 'submitting' && <Loader2 className="w-[18px] h-[18px] animate-spin" />}
          <span className={phase === 'submitting' ? 'invisible' : ''}>Update Password</span>
        </button>

        <Link
          href="/"
          className="self-center bg-transparent border-none cursor-pointer font-[inherit] text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline p-1 px-2 rounded-lg transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancel
        </Link>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Loading..." subtitle="">
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
          </div>
        </AuthShell>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
