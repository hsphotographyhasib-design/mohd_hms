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
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  countries,
  DEFAULT_COUNTRY,
  getCountryByCode,
  validatePhone,
  formatPhone,
} from '@/lib/countries';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Panel = 'choices' | 'email' | 'whatsapp';
type WaStep = 'phone' | 'otp' | 'register' | 'success';

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
  const { login, loginWithWhatsApp, isLoading } = useAuthStore();

  /* ---- Panel navigation ---- */
  const [panel, setPanel] = useState<Panel>('choices');
  const [waStep, setWaStep] = useState<WaStep>('phone');

  /* ---- Email form ---- */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formAlert, setFormAlert] = useState('');

  /* ---- WhatsApp: Phone step ---- */
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [rawPhone, setRawPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [waAlert, setWaAlert] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  /* ---- WhatsApp: OTP step ---- */
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);

  /* ---- WhatsApp: Register step ---- */
  const [regForm, setRegForm] = useState({
    fullName: '',
    companyName: '',
    email: '',
    address: '',
    city: '',
    district: '',
    country: 'Brunei Darussalam',
    preferredLanguage: 'English',
  });
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [isRegistering, setIsRegistering] = useState(false);

  /* ---- Refs for focus management ---- */
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailBackRef = useRef<HTMLButtonElement>(null);
  const whatsappBackRef = useRef<HTMLButtonElement>(null);

  /* ---- Countdown timer ---- */
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  /* ---- Helpers ---- */
  const selectedCountryData = getCountryByCode(selectedCountry) ?? countries[0];
  const displayPhone = `${selectedCountryData.dialCode} ${formatPhone(rawPhone, selectedCountryData)}`;
  const rawDigits = rawPhone.replace(/\D/g, '');
  const isPhoneValid = validatePhone(rawPhone, selectedCountryData);

  /* ---- Panel switching ---- */
  const showPanel = useCallback((name: Panel) => {
    setPanel(name);
    setFormAlert('');
    setEmailError('');
    setPasswordError('');
    setWaAlert('');
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

  const showWaStep = useCallback((step: WaStep) => {
    setWaStep(step);
    setWaAlert('');
    setPhoneError('');
    setOtpError('');
    requestAnimationFrame(() => {
      if (step === 'phone') phoneInputRef.current?.focus();
      if (step === 'otp') otpRefs.current[0]?.focus();
    });
  }, []);

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

  /* ---- WhatsApp: Send OTP ---- */
  const handleSendCode = async () => {
    setWaAlert('');
    setPhoneError('');
    if (!isPhoneValid) {
      setPhoneError(`Enter a valid ${selectedCountryData.name} phone number.`);
      phoneInputRef.current?.focus();
      return;
    }
    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: rawDigits,
          countryCode: selectedCountryData.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      showWaStep('otp');
      setResendCountdown(300); // 5 minutes
      setAttemptsRemaining(3);
    } catch (err) {
      setWaAlert(err instanceof Error ? err.message : 'Failed to send verification code. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  /* ---- WhatsApp: Verify OTP ---- */
  const handleVerifyOtp = async () => {
    setWaAlert('');
    setOtpError('');
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setOtpError('Enter the complete 6-digit code.');
      otpRefs.current.find((r) => r)?.focus();
      return;
    }
    setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: rawDigits,
          countryCode: selectedCountryData.code,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data.error || 'Verification failed';
        if (res.status === 429) {
          setAttemptsRemaining(0);
          setOtpError('Too many attempts. Please request a new code.');
        } else if (res.status === 410) {
          setOtpError('Code has expired. Please request a new one.');
        } else {
          setAttemptsRemaining((prev) => Math.max(0, prev - 1));
          setOtpError(err);
        }
        otpRefs.current[0]?.focus();
        return;
      }
      // Check if user needs registration
      if (data.needsRegistration && data.tempToken) {
        setTempToken(data.tempToken);
        showWaStep('register');
      } else if (data.user && data.accessToken) {
        loginWithWhatsApp(data.user, data.accessToken, data.refreshToken || '');
        showWaStep('success');
      }
    } catch {
      setOtpError('Network error. Please check your connection and try again.');
      otpRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  /* ---- WhatsApp: Auto-submit OTP when all 6 filled ---- */
  useEffect(() => {
    const code = otpDigits.join('');
    if (code.length === 6) {
      const timer = setTimeout(() => handleVerifyOtp(), 300);
      return () => clearTimeout(timer);
    }
  }, [otpDigits]);

  /* ---- WhatsApp: Resend OTP ---- */
  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setOtpError('');
    setOtpDigits(Array(6).fill(''));
    setAttemptsRemaining(3);
    try {
      const res = await fetch('/api/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: rawDigits,
          countryCode: selectedCountryData.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend code');
      setResendCountdown(300);
      otpRefs.current[0]?.focus();
    } catch {
      setOtpError('Failed to resend code. Please try again.');
    }
  };

  /* ---- WhatsApp: Register ---- */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!regForm.fullName.trim()) errors.fullName = 'Full name is required.';
    if (!regForm.address.trim()) errors.address = 'Address is required.';
    if (!regForm.city.trim()) errors.city = 'City is required.';
    if (!regForm.district.trim()) errors.district = 'District is required.';
    if (regForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regForm.email)) {
      errors.email = 'Enter a valid email address.';
    }
    setRegErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsRegistering(true);
    try {
      const res = await fetch('/api/auth/whatsapp/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken,
          fullName: regForm.fullName.trim(),
          companyName: regForm.companyName.trim() || undefined,
          email: regForm.email.trim() || undefined,
          address: regForm.address.trim(),
          city: regForm.city.trim(),
          district: regForm.district.trim(),
          country: regForm.country,
          preferredLanguage: regForm.preferredLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      if (data.user && data.accessToken) {
        loginWithWhatsApp(data.user, data.accessToken, data.refreshToken || '');
        showWaStep('success');
      }
    } catch (err) {
      setWaAlert(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  const updateReg = (field: string, value: string) => {
    setRegForm((prev) => ({ ...prev, [field]: value }));
    setRegErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  };

  /* ---- OTP digit input handler ---- */
  const handleOtpInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(0, 1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      requestAnimationFrame(() => otpRefs.current[index + 1]?.focus());
    }
    if (otpError) setOtpError('');
    if (waAlert) setWaAlert('');
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      requestAnimationFrame(() => otpRefs.current[index - 1]?.focus());
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 0) return;
    setOtpDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < 6; i++) next[i] = text[i] ?? '';
      return next;
    });
    requestAnimationFrame(() => otpRefs.current[Math.min(text.length, 5)]?.focus());
  };

  /* ---- Phone input handler (auto-format) ---- */
  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 15);
    setRawPhone(digits);
    if (phoneError) setPhoneError('');
    if (waAlert) setWaAlert('');
  };

  /* ---- Countdown display ---- */
  const countdownDisplay = (() => {
    const m = Math.floor(resendCountdown / 60);
    const s = resendCountdown % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  })();

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
              setWaStep('phone');
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
        {/*  PANEL: WhatsApp OTP (4-step flow)                            */}
        {/* ============================================================ */}
        <div
          className={`flex flex-col gap-4 ${panel === 'whatsapp' ? '' : 'hidden'}`}
          aria-labelledby="auth-title"
        >
          {/* Alert */}
          {waAlert && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2 p-3 text-sm rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
            >
              <span>{waAlert}</span>
            </div>
          )}

          {/* ========== STEP 1: Phone Number ========== */}
          <div className={`flex flex-col gap-4 ${waStep === 'phone' ? '' : 'hidden'}`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center m-0">
              Continue with WhatsApp
            </h2>

            {/* Country selector */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Country / Region
              </label>
              <Select value={selectedCountry} onValueChange={(val) => setSelectedCountry(val)}>
                <SelectTrigger className="w-full min-h-[48px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="mr-2">{c.flag}</span>
                      <span>{c.name}</span>
                      <span className="ml-2 text-gray-400 dark:text-gray-500">{c.dialCode}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone number */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="wa-phone"
                className="text-sm font-medium text-gray-900 dark:text-gray-100"
              >
                Phone number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400 pointer-events-none select-none">
                  {selectedCountryData.dialCode}
                </span>
                <input
                  ref={phoneInputRef}
                  id="wa-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder={selectedCountryData.format.replace(/X/g, '0')}
                  value={formatPhone(rawPhone, selectedCountryData)}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  aria-invalid={phoneError ? 'true' : undefined}
                  className={`w-full min-h-[48px] pl-[calc(var(--dial-w,52px))] pr-3 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none tabular-nums ${
                    phoneError
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                  }`}
                  style={{ '--dial-w': `${Math.max(selectedCountryData.dialCode.length * 9 + 12, 52)}px` } as React.CSSProperties}
                />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                We&apos;ll send a 6-digit verification code via WhatsApp.
              </span>
              {phoneError && (
                <span className="text-sm text-rose-600 dark:text-rose-400" role="alert">
                  {phoneError}
                </span>
              )}
            </div>

            {/* Send Code */}
            <button
              type="button"
              onClick={handleSendCode}
              disabled={!isPhoneValid || isSendingOtp}
              className={`flex items-center justify-center gap-2.5 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 border-none ${
                !isPhoneValid || isSendingOtp ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isSendingOtp && <Loader2 className="w-[18px] h-[18px] animate-spin" />}
              <WhatsAppIcon className="w-5 h-5 shrink-0" />
              <span>{isSendingOtp ? 'Sending...' : 'Send Code'}</span>
            </button>

            {/* Back link */}
            <button
              type="button"
              onClick={() => showPanel('choices')}
              className="self-center bg-transparent border-none cursor-pointer font-[inherit] text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline p-1 px-2 rounded-lg transition-colors"
            >
              <span className="inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Sign in with email
              </span>
            </button>
          </div>

          {/* ========== STEP 2: OTP Verification ========== */}
          <div className={`flex flex-col gap-4 ${waStep === 'otp' ? '' : 'hidden'}`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center m-0">
              Enter verification code
            </h2>

            {/* Phone display with Change link */}
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center m-0">
              Code sent to{' '}
              <strong className="text-gray-900 dark:text-gray-100 font-semibold">
                {displayPhone}
              </strong>
              {' '}
              <button
                type="button"
                onClick={() => {
                  if (countdownRef.current) clearInterval(countdownRef.current);
                  setResendCountdown(0);
                  showWaStep('phone');
                }}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline bg-transparent border-none cursor-pointer font-[inherit] text-sm font-medium p-0 ml-0.5 rounded"
              >
                Change
              </button>
            </p>

            {/* 6-digit OTP inputs */}
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  aria-label={`Digit ${i + 1} of 6`}
                  aria-invalid={otpError ? 'true' : undefined}
                  className={`w-12 h-14 sm:w-[52px] sm:h-[56px] text-center text-xl font-semibold rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none tabular-nums focus:outline-none ${
                    otpError
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                  } ${isVerifying ? 'opacity-60' : ''}`}
                />
              ))}
            </div>

            {/* OTP error */}
            {otpError && (
              <span className="text-sm text-rose-600 dark:text-rose-400 text-center" role="alert">
                {otpError}
              </span>
            )}

            {/* Attempts remaining */}
            {attemptsRemaining > 0 && attemptsRemaining < 3 && !otpError && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center m-0">
                {attemptsRemaining} attempt{attemptsRemaining > 1 ? 's' : ''} remaining
              </p>
            )}

            {/* Verify button */}
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={otpDigits.join('').length !== 6 || isVerifying}
              className={`flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 border-none ${
                otpDigits.join('').length !== 6 || isVerifying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isVerifying && <Loader2 className="w-[18px] h-[18px] animate-spin" />}
              <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
            </button>

            {/* Resend / countdown */}
            <div className="text-center">
              {resendCountdown > 0 ? (
                <span className="text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed">
                  Resend code in {countdownDisplay}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline bg-transparent border-none cursor-pointer font-[inherit] p-0 rounded"
                >
                  Resend code
                </button>
              )}
            </div>

            {/* Back */}
            <button
              type="button"
              onClick={() => {
                if (countdownRef.current) clearInterval(countdownRef.current);
                setResendCountdown(0);
                showWaStep('phone');
              }}
              className="self-center bg-transparent border-none cursor-pointer font-[inherit] text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline p-1 px-2 rounded-lg transition-colors"
            >
              <span className="inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Change number
              </span>
            </button>
          </div>

          {/* ========== STEP 3: Registration ========== */}
          <form
            className={`flex flex-col gap-4 ${waStep === 'register' ? '' : 'hidden'}`}
            onSubmit={handleRegister}
            noValidate
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center m-0">
              Complete your profile
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center m-0">
              It looks like you&apos;re new here. Please fill in your details to create an account.
            </p>

            {/* Full Name */}
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-name" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-name"
                type="text"
                autoComplete="name"
                placeholder="Your full name"
                value={regForm.fullName}
                onChange={(e) => updateReg('fullName', e.target.value)}
                aria-invalid={regErrors.fullName ? 'true' : undefined}
                className={`w-full min-h-[48px] px-3 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none ${
                  regErrors.fullName
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                }`}
              />
              {regErrors.fullName && <span className="text-sm text-rose-600 dark:text-rose-400" role="alert">{regErrors.fullName}</span>}
            </div>

            {/* Company Name */}
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-company" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Company Name
              </label>
              <input
                id="reg-company"
                type="text"
                autoComplete="organization"
                placeholder="Company name (optional)"
                value={regForm.companyName}
                onChange={(e) => updateReg('companyName', e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25 transition-colors duration-120 font-[inherit] outline-none"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-email" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com (optional)"
                value={regForm.email}
                onChange={(e) => updateReg('email', e.target.value)}
                aria-invalid={regErrors.email ? 'true' : undefined}
                className={`w-full min-h-[48px] px-3 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none ${
                  regErrors.email
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                }`}
              />
              {regErrors.email && <span className="text-sm text-rose-600 dark:text-rose-400" role="alert">{regErrors.email}</span>}
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1">
              <label htmlFor="reg-address" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Address <span className="text-rose-500">*</span>
              </label>
              <input
                id="reg-address"
                type="text"
                autoComplete="street-address"
                placeholder="Street address"
                value={regForm.address}
                onChange={(e) => updateReg('address', e.target.value)}
                aria-invalid={regErrors.address ? 'true' : undefined}
                className={`w-full min-h-[48px] px-3 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none ${
                  regErrors.address
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                }`}
              />
              {regErrors.address && <span className="text-sm text-rose-600 dark:text-rose-400" role="alert">{regErrors.address}</span>}
            </div>

            {/* City + District row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="reg-city" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  City <span className="text-rose-500">*</span>
                </label>
                <input
                  id="reg-city"
                  type="text"
                  autoComplete="address-level2"
                  placeholder="City"
                  value={regForm.city}
                  onChange={(e) => updateReg('city', e.target.value)}
                  aria-invalid={regErrors.city ? 'true' : undefined}
                  className={`w-full min-h-[48px] px-3 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none ${
                    regErrors.city
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                  }`}
                />
                {regErrors.city && <span className="text-sm text-rose-600 dark:text-rose-400" role="alert">{regErrors.city}</span>}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="reg-district" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  District <span className="text-rose-500">*</span>
                </label>
                <input
                  id="reg-district"
                  type="text"
                  autoComplete="address-level3"
                  placeholder="District"
                  value={regForm.district}
                  onChange={(e) => updateReg('district', e.target.value)}
                  aria-invalid={regErrors.district ? 'true' : undefined}
                  className={`w-full min-h-[48px] px-3 rounded-lg bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 border transition-colors duration-120 font-[inherit] outline-none ${
                    regErrors.district
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25'
                  }`}
                />
                {regErrors.district && <span className="text-sm text-rose-600 dark:text-rose-400" role="alert">{regErrors.district}</span>}
              </div>
            </div>

            {/* Country */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Country <span className="text-rose-500">*</span>
              </label>
              <Select value={regForm.country} onValueChange={(val) => updateReg('country', val)}>
                <SelectTrigger className="w-full min-h-[48px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.name}>
                      <span className="mr-2">{c.flag}</span>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preferred Language */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Preferred Language
              </label>
              <Select value={regForm.preferredLanguage} onValueChange={(val) => updateReg('preferredLanguage', val)}>
                <SelectTrigger className="w-full min-h-[48px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 focus:border-emerald-500 focus:ring-[0_0_0_3px] focus:ring-emerald-500/25">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Malay">Bahasa Melayu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Create Account */}
            <button
              type="submit"
              disabled={isRegistering}
              className={`flex items-center justify-center gap-2 w-full min-h-[48px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-base transition-colors duration-120 border-none ${
                isRegistering ? 'opacity-60 cursor-progress' : 'cursor-pointer'
              }`}
            >
              {isRegistering && <Loader2 className="w-[18px] h-[18px] animate-spin" />}
              <span className={isRegistering ? 'invisible' : ''}>Create Account</span>
            </button>

            {/* Back */}
            <button
              type="button"
              onClick={() => {
                if (countdownRef.current) clearInterval(countdownRef.current);
                setResendCountdown(0);
                showWaStep('phone');
              }}
              className="self-center bg-transparent border-none cursor-pointer font-[inherit] text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline p-1 px-2 rounded-lg transition-colors"
            >
              <span className="inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Change phone number
              </span>
            </button>
          </form>

          {/* ========== STEP 4: Success ========== */}
          <div className={`flex flex-col items-center justify-center gap-4 py-8 ${waStep === 'success' ? '' : 'hidden'}`}>
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 grid place-items-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center m-0">
              Welcome aboard!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center m-0">
              Redirecting you to the dashboard...
            </p>
          </div>
        </div>

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