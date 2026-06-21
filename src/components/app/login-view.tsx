'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Eye, EyeOff, Loader2, Shield, UserCog, HardHat, Wrench, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store';
import { toast } from 'sonner';

interface DemoAccount {
  label: string;
  email: string;
  password: string;
  icon: React.ReactNode;
  color: string;
}

const demoAccounts: DemoAccount[] = [
  { label: 'Admin', email: 'admin@facilitypro.com', password: 'password123', icon: <Shield className="h-3.5 w-3.5" />, color: 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900' },
  { label: 'Manager', email: 'manager@facilitypro.com', password: 'password123', icon: <UserCog className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900' },
  { label: 'Supervisor', email: 'supervisor@facilitypro.com', password: 'password123', icon: <HardHat className="h-3.5 w-3.5" />, color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900' },
  { label: 'Technician', email: 'technician@facilitypro.com', password: 'password123', icon: <Wrench className="h-3.5 w-3.5" />, color: 'bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:hover:bg-teal-900' },
  { label: 'Finance', email: 'finance@facilitypro.com', password: 'password123', icon: <DollarSign className="h-3.5 w-3.5" />, color: 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900' },
];

export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleDemoLogin = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  const handleQuickLogin = async (account: DemoAccount) => {
    try {
      await login(account.email, account.password);
      toast.success(`Logged in as ${account.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Brand Area */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 via-transparent to-teal-600/5" />
        <div className="relative z-10 max-w-md text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-emerald-600 text-white mb-8 shadow-xl shadow-emerald-600/20"
          >
            <Building2 className="h-12 w-12" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-4xl font-bold tracking-tight text-foreground mb-4"
          >
            FacilityPro
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-lg text-muted-foreground mb-8"
          >
            Smart Facility Maintenance Management
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-col gap-3 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Equipment &amp; Asset Tracking</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Work Order Management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Preventive Maintenance Scheduling</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Real-time Analytics &amp; Reporting</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Login Form Area */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex-1 flex items-center justify-center p-6 lg:p-12"
      >
        <div className="w-full max-w-md">
          {/* Mobile Brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white mb-4 shadow-lg shadow-emerald-600/20">
              <Building2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">FacilityPro</h1>
            <p className="text-sm text-muted-foreground">Smart Facility Maintenance Management</p>
          </div>

          <Card className="border-0 shadow-xl shadow-black/5 dark:shadow-black/20">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold">Sign in</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  <button type="button" className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium">
                    Forgot password?
                  </button>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <button className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium">
                    Register
                  </button>
                </p>
              </div>

              {/* Demo Accounts */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-xs font-medium text-muted-foreground text-center mb-3">
                  Quick Demo Access
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.label}
                      type="button"
                      onClick={() => {
                        handleDemoLogin(account);
                      }}
                      onBlur={(e) => {
                        if (e.relatedTarget === null) return;
                      }}
                      onDoubleClick={() => handleQuickLogin(account)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${account.color}`}
                      title={`Double-click to login as ${account.label}`}
                    >
                      {account.icon}
                      {account.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  Click to pre-fill &bull; Double-click to sign in
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}