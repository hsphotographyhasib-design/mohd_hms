'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Play,
  Calendar,
  ClipboardList,
  Package,
  Warehouse,
  MessageSquare,
  BarChart3,
  Factory,
  HeartPulse,
  Hotel,
  Building,
  GraduationCap,
  Landmark,
  Check,
  Menu,
  ArrowRight,
  ShieldCheck,
  Clock,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface LandingPageProps {
  onSignIn: () => void;
  onGetStarted: () => void;
}

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  }),
};

const stagger = {
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */
const features = [
  {
    icon: Calendar,
    title: 'Preventive Maintenance',
    description:
      'Automate PM schedules and never miss a maintenance window again',
  },
  {
    icon: ClipboardList,
    title: 'Work Order Management',
    description:
      'Track work orders from creation to completion with full visibility',
  },
  {
    icon: Package,
    title: 'Asset Tracking',
    description:
      'Monitor equipment lifecycle, warranties, and maintenance history',
  },
  {
    icon: Warehouse,
    title: 'Inventory Control',
    description:
      'Manage spare parts inventory with automatic low-stock alerts',
  },
  {
    icon: MessageSquare,
    title: 'Complaint Management',
    description:
      'Handle customer complaints efficiently with priority-based routing',
  },
  {
    icon: BarChart3,
    title: 'Real-time Dashboard',
    description:
      'Get actionable insights with real-time KPI dashboards and reports',
  },
];

const industries = [
  { label: 'Manufacturing', icon: Factory },
  { label: 'Healthcare', icon: HeartPulse },
  { label: 'Hospitality', icon: Hotel },
  { label: 'Property Management', icon: Building },
  { label: 'Education', icon: GraduationCap },
  { label: 'Government', icon: Landmark },
];

const stats = [
  { icon: Building2, value: '500+', label: 'Facilities' },
  { icon: ClipboardList, value: '50K+', label: 'Work Orders' },
  { icon: ShieldCheck, value: '99.9%', label: 'Uptime' },
  { icon: TrendingDown, value: '40%', label: 'Cost Reduction' },
];

const plans = [
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    description: 'For small facilities',
    features: [
      'Up to 50 assets',
      '5 users',
      'Basic reporting',
      'Email support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$99',
    period: '/mo',
    description: 'For growing teams',
    badge: 'Most Popular',
    features: [
      'Unlimited assets',
      '25 users',
      'Advanced analytics',
      'Priority support',
      'API access',
      'Custom workflows',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      'Unlimited users',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'On-premise option',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Industries', href: '#industries' },
  { label: 'Pricing', href: '#pricing' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ============================================================ */}
      {/*  Navigation                                                  */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <Building2 className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              FacilityPro
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-emerald-600"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={onSignIn}>
              Sign In
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onGetStarted}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-6 pt-8">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                      <Building2 className="h-4.5 w-4.5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      FacilityPro
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {navLinks.map((link) => (
                      <SheetClose asChild key={link.href}>
                        <a
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          {link.label}
                        </a>
                      </SheetClose>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
                    <SheetClose asChild>
                      <Button variant="outline" onClick={onSignIn} className="w-full">
                        Sign In
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={onGetStarted}
                      >
                        Get Started
                      </Button>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      {/* ============================================================ */}
      {/*  Main Content                                                */}
      {/* ============================================================ */}
      <main className="flex-1">
        {/* ---------------------------------------------------------- */}
        {/*  Hero Section                                               */}
        {/* ---------------------------------------------------------- */}
        <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60">
          {/* Decorative shapes */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-100/40 blur-3xl" />
            <div className="absolute top-1/2 -left-32 h-80 w-80 rounded-full bg-teal-100/30 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
            <motion.div
              className="mx-auto max-w-3xl text-center"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.h1
                className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
                variants={fadeUp}
                custom={0}
              >
                Smart Facility Management,{' '}
                <span className="text-emerald-600">Simplified</span>
              </motion.h1>

              <motion.p
                className="mt-6 text-lg leading-8 text-gray-600 sm:text-xl"
                variants={fadeUp}
                custom={1}
              >
                Streamline maintenance operations, reduce downtime, and
                maximize asset performance with FacilityPro&apos;s all-in-one
                CMMS platform.
              </motion.p>

              <motion.div
                className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
                variants={fadeUp}
                custom={2}
              >
                <Button
                  size="lg"
                  className="h-12 w-full rounded-full bg-emerald-600 px-8 text-base font-semibold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-200 sm:w-auto"
                  onClick={onGetStarted}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-full px-8 text-base font-semibold sm:w-auto"
                  onClick={onGetStarted}
                >
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/*  Stats Section                                              */}
        {/* ---------------------------------------------------------- */}
        <section className="border-y border-gray-100 bg-gray-50/50">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="text-center"
            >
              <motion.p
                className="text-sm font-semibold uppercase tracking-wider text-emerald-600"
                variants={fadeUp}
                custom={0}
              >
                Trusted by 500+ facilities worldwide
              </motion.p>

              <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                {stats.map((stat, i) => (
                  <motion.div key={stat.label} variants={fadeUp} custom={i + 1}>
                    <Card className="border-gray-200/60 bg-white shadow-sm">
                      <CardContent className="flex flex-col items-center gap-2 py-6">
                        <stat.icon className="h-5 w-5 text-emerald-600" />
                        <span className="text-2xl font-bold text-gray-900 sm:text-3xl">
                          {stat.value}
                        </span>
                        <span className="text-sm text-gray-500">
                          {stat.label}
                        </span>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/*  Features Section                                           */}
        {/* ---------------------------------------------------------- */}
        <section id="features" className="scroll-mt-16 bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="mx-auto max-w-2xl text-center"
            >
              <motion.h2
                className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
                variants={fadeUp}
                custom={0}
              >
                Everything You Need to Manage Facilities
              </motion.h2>
              <motion.p
                className="mt-4 text-lg text-gray-600"
                variants={fadeUp}
                custom={1}
              >
                A complete CMMS platform designed for modern facility teams.
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
            >
              {features.map((feature, i) => (
                <motion.div key={feature.title} variants={fadeUp} custom={i}>
                  <Card className="group h-full border-gray-200/60 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-100/40">
                    <CardHeader>
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg text-gray-900">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-500 leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/*  Industries Section                                         */}
        {/* ---------------------------------------------------------- */}
        <section
          id="industries"
          className="scroll-mt-16 bg-gray-50/50 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="mx-auto max-w-2xl text-center"
            >
              <motion.h2
                className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
                variants={fadeUp}
                custom={0}
              >
                Built for Every Industry
              </motion.h2>
              <motion.p
                className="mt-4 text-lg text-gray-600"
                variants={fadeUp}
                custom={1}
              >
                From hospitals to factories, FacilityPro adapts to your
                industry&apos;s unique needs.
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-12 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
            >
              {industries.map((industry, i) => (
                <motion.div key={industry.label} variants={fadeUp} custom={i}>
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-2 rounded-full border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 cursor-default"
                  >
                    <industry.icon className="h-4 w-4" />
                    {industry.label}
                  </Badge>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/*  Pricing Section                                            */}
        {/* ---------------------------------------------------------- */}
        <section id="pricing" className="scroll-mt-16 bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
              className="mx-auto max-w-2xl text-center"
            >
              <motion.h2
                className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
                variants={fadeUp}
                custom={0}
              >
                Simple, Transparent Pricing
              </motion.h2>
              <motion.p
                className="mt-4 text-lg text-gray-600"
                variants={fadeUp}
                custom={1}
              >
                No hidden fees. Cancel anytime. Start with a 14-day free trial.
              </motion.p>
            </motion.div>

            <motion.div
              className="mt-14 grid gap-6 lg:grid-cols-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
            >
              {plans.map((plan, i) => (
                <motion.div key={plan.name} variants={fadeUp} custom={i}>
                  <Card
                    className={`relative flex h-full flex-col border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                      plan.highlighted
                        ? 'border-emerald-500 shadow-md shadow-emerald-100/50'
                        : 'border-gray-200/60'
                    }`}
                  >
                    {plan.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-emerald-600 text-white px-3 py-1 shadow-sm">
                          {plan.badge}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-gray-900">
                        {plan.name}
                      </CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-gray-900">
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className="text-sm text-gray-500">
                            {plan.period}
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col">
                      <ul className="flex-1 space-y-3 pt-4">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={`mt-8 w-full rounded-lg ${
                          plan.highlighted
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200'
                            : ''
                        }`}
                        variant={plan.highlighted ? 'default' : 'outline'}
                        onClick={onGetStarted}
                      >
                        {plan.cta}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/*  CTA Section                                                */}
        {/* ---------------------------------------------------------- */}
        <section className="bg-gradient-to-br from-emerald-600 to-emerald-700">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
          >
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to Transform Your Facility Operations?
              </h2>
              <p className="mt-4 text-lg text-emerald-100">
                Join 500+ facilities already using FacilityPro to reduce costs
                and improve efficiency.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="h-12 w-full rounded-full bg-white text-emerald-700 font-semibold shadow-lg hover:bg-emerald-50 sm:w-auto"
                  onClick={onGetStarted}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-full border-white/30 bg-transparent text-white font-semibold hover:bg-white/10 sm:w-auto"
                  onClick={onGetStarted}
                >
                  Schedule a Demo
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ============================================================ */}
      {/*  Footer                                                      */}
      {/* ============================================================ */}
      <footer className="mt-auto border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                  <Building2 className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">
                  FacilityPro
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                The all-in-one CMMS platform for modern facility management.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Product</h3>
              <ul className="mt-3 space-y-2">
                {['Features', 'Pricing', 'Integrations', 'Changelog'].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#features"
                        className="text-sm text-gray-500 transition-colors hover:text-emerald-600"
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Company</h3>
              <ul className="mt-3 space-y-2">
                {['About', 'Careers', 'Blog', 'Contact'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-gray-500 transition-colors hover:text-emerald-600"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Resources</h3>
              <ul className="mt-3 space-y-2">
                {['Documentation', 'API Reference', 'Community', 'Status'].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-sm text-gray-500 transition-colors hover:text-emerald-600"
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Legal</h3>
              <ul className="mt-3 space-y-2">
                {['Privacy', 'Terms', 'Security', 'GDPR'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-gray-500 transition-colors hover:text-emerald-600"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-400">
              &copy; 2025 FacilityPro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
