'use client';

import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, ArrowRight, Loader2, Building2, ChevronRight } from 'lucide-react';
import type { PageId } from '../public-website';
import { useAuthStore } from '@/app-shell/store';
import {
  ThemeSection,
  MonoLabel,
  DisplayHeading,
  Divider,
} from '../theme';

interface PageProps {
  navigate: (id: PageId) => void;
}

type Tab = 'login' | 'signup';

export function PageLogin({ navigate }: PageProps) {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const switchTab = useCallback((t: Tab) => {
    setTab(t);
    setError('');
    setFieldErrors({});
    setEmail('');
    setPassword('');
    setName('');
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          const retrySec = Math.ceil((data.retryAfter || 60) / 1000);
          setError(`Too many attempts. Please try again in ${retrySec} seconds.`);
        } else {
          setError(data.error || 'Incorrect email or password');
        }
        return;
      }

      // Success — set auth state
      localStorage.setItem('cmms_token', data.token);
      localStorage.setItem('cmms_user', JSON.stringify(data.user));
      useAuthStore.setState({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
      });
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError('Too many registration attempts. Please try again later.');
        } else {
          setError(data.error || 'Registration failed. Please try again.');
        }
        return;
      }

      // Auto-login after registration
      localStorage.setItem('cmms_token', data.token);
      localStorage.setItem('cmms_user', JSON.stringify(data.user));
      useAuthStore.setState({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
      });
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [name, email, password]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    fontFamily: 'var(--hm-body)',
    fontSize: '0.95rem',
    color: 'var(--hm-ink)',
    background: 'var(--hm-paper)',
    border: '1px solid var(--hm-line)',
    borderRadius: 'var(--hm-r-sm)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  };

  return (
    <div>
      {/* Hero banner */}
      <ThemeSection variant="forest">
        <nav aria-label="Breadcrumb" className="mb-6" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="cursor-pointer"
            style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'rgba(247,248,243,0.55)' }}
            onClick={() => navigate('home')}
          >
            Home
          </span>
          <ChevronRight size={14} style={{ color: 'rgba(247,248,243,0.35)' }} />
          <span style={{ fontFamily: 'var(--hm-mono)', fontSize: '0.78rem', color: 'var(--hm-paper)' }}>
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </span>
        </nav>
        <h1
          style={{
            fontFamily: 'var(--hm-disp)',
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            fontSize: 'clamp(2.4rem, 5.2vw, 4rem)',
            color: 'var(--hm-paper)',
            maxWidth: '20ch',
          }}
        >
          {tab === 'login' ? 'Welcome back.' : 'Get started.'}
        </h1>
        <p
          className="mt-4"
          style={{
            fontFamily: 'var(--hm-body)',
            fontSize: '1.1rem',
            color: 'rgba(247,248,243,0.68)',
            maxWidth: '48ch',
          }}
        >
          {tab === 'login'
            ? 'Sign in to access the MOHD.HMS maintenance management system.'
            : 'Create your account to manage facilities and track maintenance.'}
        </p>
      </ThemeSection>

      {/* Login / Signup Form */}
      <ThemeSection>
        <div style={{ maxWidth: 440, margin: '0 auto' }}>
          {/* Tab Switcher */}
          <div
            className="flex mb-8"
            style={{
              border: '1px solid var(--hm-line)',
              borderRadius: 'var(--hm-r-sm)',
              overflow: 'hidden',
            }}
          >
            {(['login', 'signup'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className="flex-1 cursor-pointer"
                style={{
                  fontFamily: 'var(--hm-mono)',
                  fontSize: '0.78rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  padding: '12px 0',
                  border: 'none',
                  background: tab === t ? 'var(--hm-forest)' : 'transparent',
                  color: tab === t ? 'var(--hm-paper)' : 'var(--hm-muted)',
                  transition: 'all 0.2s ease',
                }}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Error Banner */}
          {error && (
            <div
              className="mb-6 p-4"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--hm-r-sm)',
                color: '#991b1b',
                fontFamily: 'var(--hm-body)',
                fontSize: '0.88rem',
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {/* Security Notice */}
          <div
            className="mb-8 p-4"
            style={{
              background: 'var(--hm-stone)',
              borderRadius: 'var(--hm-r-sm)',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <div
              className="shrink-0 grid place-items-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--hm-green)',
                color: '#fff',
              }}
            >
              <Building2 size={15} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--hm-body)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  color: 'var(--hm-ink)',
                  marginBottom: 2,
                }}
              >
                Secure connection
              </div>
              <div
                style={{
                  fontFamily: 'var(--hm-body)',
                  fontSize: '0.8rem',
                  color: 'var(--hm-muted)',
                  lineHeight: 1.5,
                }}
              >
                All inputs are validated server-side. Passwords are hashed with bcrypt (12 salt rounds).
                Rate limiting and account lockout protect against brute-force attacks.
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
            {/* Name (signup only) */}
            {tab === 'signup' && (
              <div className="mb-5">
                <label
                  htmlFor="name"
                  style={{
                    display: 'block',
                    fontFamily: 'var(--hm-mono)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--hm-muted)',
                    marginBottom: 8,
                  }}
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  style={{
                    ...inputStyle,
                    borderColor: fieldErrors.name ? '#ef4444' : 'var(--hm-line)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--hm-green)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = fieldErrors.name ? '#ef4444' : 'var(--hm-line)';
                  }}
                />
                {fieldErrors.name && (
                  <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 4, display: 'block' }}>
                    {fieldErrors.name}
                  </span>
                )}
              </div>
            )}

            {/* Email */}
            <div className="mb-5">
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontFamily: 'var(--hm-mono)',
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--hm-muted)',
                  marginBottom: 8,
                }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={{
                  ...inputStyle,
                  borderColor: fieldErrors.email ? '#ef4444' : 'var(--hm-line)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--hm-green)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = fieldErrors.email ? '#ef4444' : 'var(--hm-line)';
                }}
              />
              {fieldErrors.email && (
                <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 4, display: 'block' }}>
                  {fieldErrors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontFamily: 'var(--hm-mono)',
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--hm-muted)',
                  marginBottom: 8,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={tab === 'signup' ? 'Min 8 chars, uppercase + lowercase + number' : 'Your password'}
                  style={{
                    ...inputStyle,
                    paddingRight: 48,
                    borderColor: fieldErrors.password ? '#ef4444' : 'var(--hm-line)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--hm-green)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = fieldErrors.password ? '#ef4444' : 'var(--hm-line)';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="cursor-pointer bg-transparent border-0 p-0"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--hm-faint)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {tab === 'signup' && (
                <div
                  className="mt-2"
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--hm-faint)',
                    lineHeight: 1.5,
                  }}
                >
                  Must be 8+ characters with at least one uppercase letter, one lowercase letter, and one number.
                </div>
              )}
              {fieldErrors.password && (
                <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 4, display: 'block' }}>
                  {fieldErrors.password}
                </span>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer flex items-center justify-center gap-2"
              style={{
                fontFamily: 'var(--hm-body)',
                fontWeight: 600,
                fontSize: '0.94rem',
                padding: '14px 24px',
                borderRadius: 'var(--hm-r-sm)',
                border: 'none',
                background: loading ? 'var(--hm-muted)' : 'var(--hm-forest)',
                color: '#fff',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {tab === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <Divider />
            <span
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.68rem',
                letterSpacing: '0.08em',
                color: 'var(--hm-faint)',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              or
            </span>
            <Divider />
          </div>

          {/* Switch tab link */}
          <p className="text-center" style={{ fontFamily: 'var(--hm-body)', fontSize: '0.92rem', color: 'var(--hm-muted)' }}>
            {tab === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <span
                  className="cursor-pointer"
                  style={{ color: 'var(--hm-green)', fontWeight: 600 }}
                  onClick={() => switchTab('signup')}
                >
                  Create one
                </span>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <span
                  className="cursor-pointer"
                  style={{ color: 'var(--hm-green)', fontWeight: 600 }}
                  onClick={() => switchTab('login')}
                >
                  Sign in
                </span>
              </>
            )}
          </p>

          {/* Back to home */}
          <div className="text-center mt-8">
            <span
              className="cursor-pointer inline-flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--hm-mono)',
                fontSize: '0.78rem',
                color: 'var(--hm-faint)',
                letterSpacing: '0.04em',
              }}
              onClick={() => navigate('home')}
            >
              <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
              Back to home
            </span>
          </div>
        </div>
      </ThemeSection>
    </div>
  );
}