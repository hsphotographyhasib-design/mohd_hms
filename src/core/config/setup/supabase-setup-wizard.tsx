'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, Database, Copy, Check, ExternalLink, UserPlus, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/shared/ui/card';
import { Label } from '@/shared/ui/label';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TableStatus {
  existing: number;
  missing: number;
  total: number;
}

interface SetupSqlResponse {
  sql: string;
  tables: TableStatus;
  instruction: string;
}

interface CreateAdminResponse {
  token: string;
  user: Record<string, unknown>;
}

export interface SupabaseSetupWizardProps {
  onSetupComplete: () => void;
}

type WizardStep = 1 | 2 | 3;
type FetchStatus = 'loading' | 'ready' | 'error';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SQL_API = '/api/setup/supabase-sql';
const ADMIN_API = '/api/setup/create-super-admin';
const SUPABASE_SQL_EDITOR_URL =
  'https://sbcqgsbdaerdoladmbcc.supabase.co/project/default/sql/new';

const STEP_META: { num: WizardStep; label: string }[] = [
  { num: 1, label: 'Check Database' },
  { num: 2, label: 'Create Tables' },
  { num: 3, label: 'Create Admin' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SupabaseSetupWizard({
  onSetupComplete,
}: SupabaseSetupWizardProps) {
  // --- Wizard state --------------------------------------------------------
  const [step, setStep] = useState<WizardStep>(1);
  const [status, setStatus] = useState<FetchStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Step 1 & 2 state ----------------------------------------------------
  const [tableStatus, setTableStatus] = useState<SetupSqlResponse | null>(null);
  const [sql, setSql] = useState<string>('');
  const [instruction, setInstruction] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Step 3 state --------------------------------------------------------
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // --- Cleanup timer on unmount --------------------------------------------
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  // --- Fetch SQL / table status ---------------------------------------------
  const fetchTableStatus = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const res = await fetch(SQL_API);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ||
            `Request failed with status ${res.status}`
        );
      }

      const data: SetupSqlResponse = await res.json();
      setSql(data.sql);
      setInstruction(data.instruction);
      setTableStatus(data);
      setStatus('ready');

      // If all tables already exist, jump to step 3
      if (data.tables.missing === 0) {
        setStep(3);
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to connect to the database. Please check your Supabase configuration.'
      );
    }
  }, []);

  // --- Initial mount fetch --------------------------------------------------
  useEffect(() => {
    fetchTableStatus();
     
  }, []);

  // --- Verify tables (POST) ------------------------------------------------
  const handleVerifyTables = async () => {
    setVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch(SQL_API, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ||
            `Verification failed with status ${res.status}`
        );
      }

      const data: SetupSqlResponse = await res.json();
      setTableStatus(data);
      setSql(data.sql);
      setInstruction(data.instruction);

      if (data.tables.missing === 0) {
        setStep(3);
      } else {
        setErrorMessage(
          `${data.tables.missing} table(s) are still missing. Please ensure all SQL has been executed in the Supabase SQL Editor.`
        );
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Verification failed. Please try again.'
      );
    } finally {
      setVerifying(false);
    }
  };

  // --- Copy SQL to clipboard -----------------------------------------------
  const handleCopySql = async () => {
    if (!sql) return;

    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);

      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = sql;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);

      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- Open Supabase SQL Editor ---------------------------------------------
  const handleOpenSqlEditor = () => {
    window.open(SUPABASE_SQL_EDITOR_URL, '_blank', 'noopener,noreferrer');
  };

  // --- Create super admin --------------------------------------------------
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setAdminError('All fields are required.');
      return;
    }

    if (adminPassword.length < 6) {
      setAdminError('Password must be at least 6 characters long.');
      return;
    }

    setCreatingAdmin(true);

    try {
      const res = await fetch(ADMIN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminName.trim(),
          email: adminEmail.trim(),
          password: adminPassword,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ||
            `Failed to create admin (status ${res.status})`
        );
      }

      const data: CreateAdminResponse = await res.json();

      localStorage.setItem('cmms_token', data.token);
      localStorage.setItem('cmms_user', JSON.stringify(data.user));

      onSetupComplete();
    } catch (err) {
      setAdminError(
        err instanceof Error
          ? err.message
          : 'Failed to create admin account. Please try again.'
      );
    } finally {
      setCreatingAdmin(false);
    }
  };

  // =========================================================================
  // Render helpers
  // =========================================================================

  /** Step indicator bar rendered at the top of every step. */
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-6">
      {STEP_META.map((s, idx) => {
        const isActive = step === s.num;
        const isCompleted = step > s.num;

        return (
          <div key={s.num} className="flex items-center">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors
                  ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isActive
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-200'
                        : 'bg-gray-100 text-gray-400'
                  }
                `}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? 'text-emerald-700'
                    : isCompleted
                      ? 'text-emerald-600'
                      : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>

            {/* Connector line between steps */}
            {idx < STEP_META.length - 1 && (
              <div
                className={`mx-3 h-0.5 w-10 sm:w-16 rounded-full transition-colors ${
                  step > s.num ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
                style={{ marginBottom: '1.375rem' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // =========================================================================
  // Step 1: Check Database
  // =========================================================================

  const renderStep1 = () => {
    if (status === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500">Checking database status…</p>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <Database className="h-7 w-7 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Connection Failed
          </h3>
          <p className="text-sm text-red-600 text-center max-w-sm">
            {errorMessage}
          </p>
          <Button
            variant="outline"
            className="mt-2"
            onClick={fetchTableStatus}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      );
    }

    // status === 'ready'
    const allExist = tableStatus?.tables.missing === 0;

    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full ${
            allExist ? 'bg-emerald-50' : 'bg-amber-50'
          }`}
        >
          <Database
            className={`h-7 w-7 ${allExist ? 'text-emerald-600' : 'text-amber-500'}`}
          />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          {allExist ? 'All Tables Found' : 'Tables Missing'}
        </h3>

        {tableStatus && (
          <div className="w-full bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <p>
              <span className="text-gray-500">Total tables expected:</span>{' '}
              <span className="font-medium text-gray-900">
                {tableStatus.tables.total}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Tables found:</span>{' '}
              <span
                className={`font-medium ${tableStatus.tables.existing > 0 ? 'text-emerald-600' : 'text-gray-900'}`}
              >
                {tableStatus.tables.existing}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Tables missing:</span>{' '}
              <span
                className={`font-medium ${tableStatus.tables.missing > 0 ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {tableStatus.tables.missing}
              </span>
            </p>
          </div>
        )}

        {allExist ? (
          <Button className="mt-2" onClick={() => setStep(3)}>
            Continue to Admin Setup
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button className="mt-2" onClick={() => setStep(2)}>
            Create Missing Tables
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    );
  };

  // =========================================================================
  // Step 2: Create Tables
  // =========================================================================

  const renderStep2 = () => {
    if (status === 'error' && !tableStatus) {
      return (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <p className="text-sm text-red-600 text-center">{errorMessage}</p>
          <Button variant="outline" onClick={fetchTableStatus}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {/* Missing tables summary */}
        {tableStatus && tableStatus.tables.missing > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              <Database className="inline h-4 w-4 mr-1 -mt-0.5" />
              {tableStatus.tables.missing} of {tableStatus.tables.total} tables
              need to be created
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Instructions:
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
            <li>
              Click <span className="font-medium text-gray-900">&quot;Copy SQL&quot;</span>
            </li>
            <li>
              Click <span className="font-medium text-gray-900">&quot;Open SQL Editor&quot;</span>
            </li>
            <li>
              Paste the SQL and click <span className="font-medium text-gray-900">&quot;Run&quot;</span> in the editor
            </li>
            <li>
              Come back and click{' '}
              <span className="font-medium text-gray-900">&quot;Verify Tables&quot;</span>
            </li>
          </ol>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            variant={copied ? 'outline' : 'default'}
            style={
              copied
                ? { color: '#059669', borderColor: '#059669' }
                : undefined
            }
            onClick={handleCopySql}
            disabled={!sql}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? 'Copied!' : 'Copy SQL'}
          </Button>
          {copied && (
            <p className="text-xs text-emerald-600 text-center font-medium">
              Copied to clipboard!
            </p>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={handleOpenSqlEditor}
          >
            <ExternalLink className="h-4 w-4" />
            Open SQL Editor
          </Button>

          <div className="relative">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleVerifyTables}
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Verify Tables
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <p className="text-sm text-red-600 text-center">{errorMessage}</p>
        )}

        {/* Back button */}
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setStep(1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // Step 3: Create Admin Account
  // =========================================================================

  const renderStep3 = () => (
    <form onSubmit={handleCreateAdmin} className="space-y-5">
      <div className="flex flex-col items-center gap-2 mb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <UserPlus className="h-6 w-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          Create Super Admin Account
        </h3>
        <p className="text-sm text-gray-500 text-center">
          This will be the primary administrator for your CMMS system.
        </p>
      </div>

      {/* Name field */}
      <div className="space-y-2">
        <Label htmlFor="admin-name">Full Name</Label>
        <Input
          id="admin-name"
          type="text"
          placeholder="e.g. John Doe"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          disabled={creatingAdmin}
          autoComplete="name"
        />
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="admin-email">Email Address</Label>
        <Input
          id="admin-email"
          type="email"
          placeholder="e.g. admin@company.com"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          disabled={creatingAdmin}
          autoComplete="email"
        />
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          type="password"
          placeholder="Minimum 6 characters"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          disabled={creatingAdmin}
          autoComplete="new-password"
        />
      </div>

      {/* Error message */}
      {adminError && (
        <p className="text-sm text-red-600 text-center">{adminError}</p>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={creatingAdmin}
      >
        {creatingAdmin ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating Admin…
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Create Super Admin
          </>
        )}
      </Button>

      {/* Back button */}
      <div className="pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700"
          onClick={() => setStep(2)}
          disabled={creatingAdmin}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
    </form>
  );

  // =========================================================================
  // Main render
  // =========================================================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Branding */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Building2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold tracking-wide text-gray-700 uppercase">
            MOHD.HMS ENTERPRISE
          </span>
        </div>

        {/* Card */}
        <Card className="bg-white shadow-lg border-gray-200/80">
          <CardHeader className="text-center pb-0">
            <h2 className="text-xl font-bold text-gray-900">
              Database Setup Wizard
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 1 && 'Let\'s check your Supabase database.'}
              {step === 2 && 'Create the required database tables.'}
              {step === 3 && 'Set up your administrator account.'}
            </p>
          </CardHeader>

          <CardContent className="pt-2">
            {renderStepIndicator()}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </CardContent>

          <CardFooter className="justify-center pt-0">
            <p className="text-xs text-gray-400">
              Secure setup &middot; All data stays in your Supabase project
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}