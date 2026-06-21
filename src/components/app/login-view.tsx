'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Shield,
  UserCog,
  HardHat,
  Wrench,
  DollarSign,
  Mail,
  MessageCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Panel = 'choices' | 'email' | 'whatsapp';
type OtpStep = 'phone' | 'code';

interface DemoAccount {
  label: string;
  email: string;
  password: string;
  icon: React.ReactNode;
}

const demoAccounts: DemoAccount[] = [
  { label: 'Admin', email: 'admin@facilitypro.com', password: 'password123', icon: <Shield className="h-3.5 w-3.5" /> },
  { label: 'Manager', email: 'manager@facilitypro.com', password: 'password123', icon: <UserCog className="h-3.5 w-3.5" /> },
  { label: 'Supervisor', email: 'supervisor@facilitypro.com', password: 'password123', icon: <HardHat className="h-3.5 w-3.5" /> },
  { label: 'Technician', email: 'tech1@facilitypro.com', password: 'password123', icon: <Wrench className="h-3.5 w-3.5" /> },
  { label: 'Finance', email: 'finance@facilitypro.com', password: 'password123', icon: <DollarSign className="h-3.5 w-3.5" /> },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Brand gauge monogram matching the uploaded design */
function BrandLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 12 15 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <path
        d="M12 3.5v1.6M12 18.9v1.6M3.5 12h1.6M18.9 12h1.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Google "G" icon (multi-color) */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.19 3.32v2.76h3.54c2.08-1.92 3.29-4.74 3.29-7.84Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.76c-.98.66-2.24 1.05-3.73 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.94l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

/** WhatsApp icon */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.8c2.16 0 4.18.84 5.71 2.37a8.04 8.04 0 0 1 2.37 5.72c0 4.46-3.63 8.1-8.1 8.1a8.1 8.1 0 0 1-4.12-1.13l-.3-.18-3.06.8.82-2.98-.2-.31a8.04 8.04 0 0 1-1.26-4.31c.01-4.47 3.64-8.1 8.11-8.1Z"
      />
      <path
        fill="currentColor"
        d="M9.3 7.13c-.18-.4-.36-.41-.53-.42l-.45-.01c-.16 0-.41.06-.63.3-.22.24-.83.81-.83 1.98s.85 2.3.97 2.46c.12.16 1.65 2.64 4.07 3.6 2.01.79 2.42.63 2.86.59.43-.04 1.4-.57 1.6-1.13.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.53.12-.16.24-.61.77-.74.93-.14.16-.27.18-.51.06-.24-.12-1-.37-1.91-1.18-.71-.63-1.18-1.41-1.32-1.65-.14-.24-.01-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.3-.74-1.78Z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Login View                                                    */
/* ------------------------------------------------------------------ */

export function LoginView() {
  const { login, isLoading } = useAuthStore();

  /* ---- Panel navigation ---- */
  const [panel, setPanel] = useState<Panel>('choices');
  const [otpStep, setOtpStep] = useState<OtpStep>('phone');

  /* ---- Email form ---- */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formAlert, setFormAlert] = useState('');

  /* ---- WhatsApp form ---- */
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [whatsappAlert, setWhatsappAlert] = useState('');
  const [otpSentTo, setOtpSentTo] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Refs for focus management ---- */
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const emailBackRef = useRef<HTMLButtonElement>(null);
  const whatsappBackRef = useRef<HTMLButtonElement>(null);

  /* ---- Countdown timer ---- */
  const hasCountdown = resendCountdown > 0;
  useEffect(() => {
    if (!hasCountdown) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [hasCountdown]);

  /* ---- Panel switching ---- */
  const showPanel = useCallback((name: Panel) => {
    setPanel(name);
    setFormAlert('');
    setEmailError('');
    setPasswordError('');
    setWhatsappAlert('');
    setPhoneError('');
    setOtpError('');
    // Focus management after panel switch
    requestAnimationFrame(() => {
      if (name === 'email') emailInputRef.current?.focus();
      if (name === 'whatsapp') phoneInputRef.current?.focus();
      if (name === 'choices') {
        if (panel === 'email') emailBackRef.current?.focus();
        if (panel === 'whatsapp') whatsappBackRef.current?.focus();
      }
    });
  }, [panel]);

  /* ---- Email login ---- */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormAlert('');
    setEmailError('');
    setPasswordError('');

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const hasPass = password.length > 0;

    if (!validEmail) {
      setEmailError('Enter a valid email address.');
      emailInputRef.current?.focus();
      return;
    }
    if (!hasPass) {
      setPasswordError('Password is required.');
      passwordInputRef.current?.focus();
      return;
    }

    try {
      await login(email.trim(), password);
      toast.success('Welcome back!');
    } catch (err) {
      setFormAlert(err instanceof Error ? err.message : "We couldn't sign you in. Check your details and try again.");
    }
  };

  /* ---- WhatsApp OTP ---- */
  const validPhone = (v: string) => /^\+?[0-9][0-9 ]{7,16}$/.test(v.trim());

  const handleSendCode = () => {
    setWhatsappAlert('');
    setPhoneError('');
    if (!validPhone(phone)) {
      setPhoneError('Enter a valid phone number with country code.');
      phoneInputRef.current?.focus();
      return;
    }
    // Simulate sending OTP
    setOtpSentTo(phone.trim());
    setOtpStep('code');
    setResendCountdown(30);
    requestAnimationFrame(() => otpInputRef.current?.focus());
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setWhatsappAlert('');
    setOtpError('');
    if (otpCode.length !== 6) {
      setOtpError('Enter the 6-digit code.');
      otpInputRef.current?.focus();
      return;
    }
    // TODO: Real WhatsApp OTP verification
    setWhatsappAlert("That code didn't match. Check it and try again, or resend.");
    otpInputRef.current?.focus();
  };

  const handleResend = () => {
    if (resendCountdown > 0) return;
    // TODO: Re-trigger backend OTP send
    setResendCountdown(30);
  };

  /* ---- Demo login ---- */
  const handleDemoLogin = async (account: DemoAccount) => {
    try {
      await login(account.email, account.password);
      toast.success(`Logged in as ${account.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    }
  };

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-6">
      <main
        className="w-full max-w-[420px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[20px] shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_rgba(16,24,40,0.08)] p-8 pb-6"
        role="main"
        aria-labelledby="auth-title"
      >
        {/* ---- Brand ---- */}
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <span
            className="w-14 h-14 rounded-xl bg-emerald-600 text-white grid place-items-center"
            aria-hidden="true"
          >
            <BrandLogo className="w-[30px] h-[30px]" />
          </span>
          <h1
            id="auth-title"
            className="text-[26px] leading-tight font-semibold text-gray-900 dark:text-gray-100 tracking-[-0.01em] m-0"
          >
            Welcome back
          </h1>
          <p className="text-base text-gray-500 dark:text-gray-400 m-0 max-w-[30ch]">
            Sign in to Smart Facility Maintenance Management
          </p>
        </div>

        {/* ============================================================ */}
        {/*  PANEL: Choices (Google / Email / WhatsApp)                   */}
        {/* ============================================================ */}
        <div
          className={`flex flex-col gap-3 ${panel === 'choices' ? '' : 'hidden'}`}
          data-open={panel === 'choices'}
        >
          {/* Google */}
          <button
            type="button"
            onClick={() => {
              /* TODO: window.location = '/auth/google' */
              toast.info('Google sign-in coming soon');
            }}
            className="flex items-center justify-center gap-2.5 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none"
          >
            <GoogleIcon className="w-5 h-5 shrink-0" />
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
            <span className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span>or</span>
            <span className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Email */}
          <button
            type="button"
            ref={emailBackRef}
            onClick={() => showPanel('email')}
            className="flex items-center justify-center gap-2.5 w-full min-h-[48px] px-4 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium text-base transition-colors duration-120 cursor-pointer border border-gray-200 dark:border-gray-700"
          >
            <Mail className="w-5 h-5 shrink-0" />
            <span>Continue with Email</span>
          </button>

          {/* WhatsApp */}
          <button
            type="button"
            ref={whatsappBackRef}
            onClick={() => {
              setOtpStep('phone');
              showPanel('whatsapp');
            }}
            className="flex items-center justify-center gap-2.5 w-full min-h-[48px] px-4 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-medium text-base transition-colors duration-120 cursor-pointer border border-gray-200 dark:border-gray-700"
          >
            <WhatsAppIcon className="w-5 h-5 shrink-0 text-green-600" />
            <span>Continue with WhatsApp</span>
          </button>

          {/* Skip */}
          <button
            type="button"
            onClick={() => {
              /* TODO: redirect to public dashboard */
              toast.info('Guest access coming soon');
            }}
            className="flex items-center justify-center gap-2.5 w-full min-h-[48px] px-4 rounded-lg bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium text-base transition-colors duration-120 cursor-pointer border border-gray-200 dark:border-gray-700"
          >
            <span>Skip for now</span>
          </button>

          {/* ---- Demo Accounts ---- */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 text-center mb-2.5">
              Quick Demo Access
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {demoAccounts.map((account) => (
                <button
                  key={account.label}
                  type="button"
                  onClick={() => handleDemoLogin(account)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent"
                  title={`Login as ${account.label}`}
                >
                  {account.icon}
                  {account.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  PANEL: Email Form                                             */}
        {/* ============================================================ */}
        <form
          className={`flex flex-col gap-4 ${panel === 'email' ? '' : 'hidden'}`}
          onSubmit={handleEmailSubmit}
          noValidate
          aria-labelledby="auth-title"
        >
          {/* Alert */}
          {formAlert && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 p-3 text-sm rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
            >
              <span>{formAlert}</span>
            </div>
          )}

          {/* Email field */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="login-email"
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              Email
            </label>
            <input
              ref={emailInputRef}
              id="login-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
                if (formAlert) setFormAlert('');
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

          {/* Password field */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              Password
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                  if (formAlert) setFormAlert('');
                }}
                aria-invalid={passwordError ? 'true' : undefined}
                className={`w-full min-h-[48px] px-3 pr-10 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none ${
                  passwordError
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-transparent border-none cursor-pointer p-0"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <span className="text-sm text-rose-600 dark:text-rose-400" role="alert">
                {passwordError}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={`flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none relative ${
              isLoading ? 'opacity-60 cursor-progress' : ''
            }`}
          >
            {isLoading && (
              <Loader2 className="w-[18px] h-[18px] animate-spin" />
            )}
            <span className={isLoading ? 'invisible' : ''}>Sign in</span>
          </button>

          {/* Back */}
          <button
            type="button"
            onClick={() => showPanel('choices')}
            className="self-center bg-transparent border-none cursor-pointer font-[inherit] text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline p-1 px-2 rounded-lg transition-colors"
          >
            <span className="inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Other sign-in options
            </span>
          </button>
        </form>

        {/* ============================================================ */}
        {/*  PANEL: WhatsApp OTP                                           */}
        {/* ============================================================ */}
        <form
          className={`flex flex-col gap-4 ${panel === 'whatsapp' ? '' : 'hidden'}`}
          onSubmit={handleVerifyOtp}
          noValidate
          aria-labelledby="auth-title"
        >
          {/* Alert */}
          {whatsappAlert && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 p-3 text-sm rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
            >
              <span>{whatsappAlert}</span>
            </div>
          )}

          {/* ---- Step 1: Phone ---- */}
          <div className={`flex flex-col gap-4 ${otpStep === 'phone' ? '' : 'hidden'}`}>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="wa-phone"
                className="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                WhatsApp phone number
              </label>
              <input
                ref={phoneInputRef}
                id="wa-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+673 712 3456"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError('');
                  if (whatsappAlert) setWhatsappAlert('');
                }}
                aria-invalid={phoneError ? 'true' : undefined}
                className={`w-full min-h-[48px] px-3 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none ${
                  phoneError
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                }`}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Include your country code. We&apos;ll send a 6-digit code on WhatsApp.
              </span>
              {phoneError && (
                <span className="text-sm text-rose-600 dark:text-rose-400" role="alert">
                  {phoneError}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSendCode}
              className="flex items-center justify-center gap-2.5 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none"
            >
              <WhatsAppIcon className="w-5 h-5 shrink-0" />
              <span>Send code via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => showPanel('choices')}
              className="self-center bg-transparent border-none cursor-pointer font-[inherit] text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline p-1 px-2 rounded-lg transition-colors"
            >
              <span className="inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Other sign-in options
              </span>
            </button>
          </div>

          {/* ---- Step 2: OTP Code ---- */}
          <div className={`flex flex-col gap-4 ${otpStep === 'code' ? '' : 'hidden'}`}>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Enter the 6-digit code we sent to{' '}
              <strong className="text-gray-900 dark:text-gray-100 font-semibold">
                {otpSentTo}
              </strong>
              .
            </p>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="wa-otp"
                className="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                Verification code
              </label>
              <input
                ref={otpInputRef}
                id="wa-otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="------"
                value={otpCode}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (otpError) setOtpError('');
                  if (whatsappAlert) setWhatsappAlert('');
                }}
                aria-invalid={otpError ? 'true' : undefined}
                className={`w-full min-h-[48px] px-3 rounded-lg bg-white dark:bg-gray-900 text-lg text-center tracking-[0.5em] font-variant-numeric tabular-nums text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none pr-[calc(12px-0.5em)] ${
                  otpError
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                }`}
              />
              {otpError && (
                <span className="text-sm text-rose-600 dark:text-rose-400" role="alert">
                  {otpError}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 cursor-pointer border-none"
            >
              <span>Verify and sign in</span>
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCountdown > 0}
              className={`self-center bg-transparent border-none cursor-pointer font-[inherit] text-sm p-1 px-2 rounded-lg transition-colors ${
                resendCountdown > 0
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline'
              }`}
            >
              {resendCountdown > 0
                ? `Resend code in ${resendCountdown}s`
                : 'Resend code'}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpStep('phone');
                requestAnimationFrame(() => phoneInputRef.current?.focus());
                if (countdownRef.current) clearInterval(countdownRef.current);
                setResendCountdown(0);
              }}
              className="self-center bg-transparent border-none cursor-pointer font-[inherit] text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline p-1 px-2 rounded-lg transition-colors"
            >
              <span className="inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Change number
              </span>
            </button>
          </div>
        </form>

        {/* ---- Footer ---- */}
        <footer className="mt-6 text-center text-sm text-gray-400 dark:text-gray-500 leading-relaxed">
          <p>
            By continuing, you agree to our{' '}
            <a
              href="/terms"
              className="text-gray-600 dark:text-gray-400 underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-100 rounded"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              className="text-gray-600 dark:text-gray-400 underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-100 rounded"
            >
              Privacy Policy
            </a>
            .
          </p>
          <p className="mt-2 text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} Smart Facility Maintenance Management
          </p>
        </footer>

        {/* Screen-reader live region */}
        <p className="sr-only" role="status" aria-live="polite" />
      </main>
    </div>
  );
}