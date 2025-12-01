'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Check,
  X,
  Sparkles,
  Users,
  Building2,
  Crown,
  ArrowRight,
} from 'lucide-react';

type BillingCycle = 'monthly' | 'yearly';

interface PlanFeature {
  name: string;
  free: boolean | string;
  premium: boolean | string;
  families: boolean | string;
  teams: boolean | string;
  enterprise: boolean | string;
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic password management',
    icon: Shield,
    priceMonthly: 0,
    priceYearly: 0,
    users: '1 user',
    popular: false,
    cta: 'Get Started',
    ctaLink: '/register',
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For individuals who want more security',
    icon: Sparkles,
    priceMonthly: 3,
    priceYearly: 30,
    users: '1 user',
    popular: true,
    cta: 'Start Free Trial',
    ctaLink: '/register?plan=premium',
  },
  {
    id: 'families',
    name: 'Families',
    description: 'Secure password sharing for your family',
    icon: Users,
    priceMonthly: 15,
    priceYearly: 150,
    users: 'Up to 6 users',
    popular: false,
    cta: 'Start Free Trial',
    ctaLink: '/register?plan=families',
  },
  {
    id: 'teams',
    name: 'Teams',
    description: 'For small to medium businesses',
    icon: Building2,
    priceMonthly: 4,
    priceYearly: 40,
    users: 'Per user',
    popular: false,
    cta: 'Contact Sales',
    ctaLink: '/contact?plan=teams',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Advanced security for large organisations',
    icon: Crown,
    priceMonthly: 6,
    priceYearly: 60,
    users: 'Per user',
    popular: false,
    cta: 'Contact Sales',
    ctaLink: '/contact?plan=enterprise',
  },
];

const features: PlanFeature[] = [
  { name: 'Vault items', free: '5 items', premium: 'Unlimited', families: 'Unlimited', teams: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Devices', free: '1 device', premium: '1 per type', families: '1 per type', teams: 'Unlimited', enterprise: 'Unlimited' },
  { name: 'Password generator', free: true, premium: true, families: true, teams: true, enterprise: true },
  { name: 'Autofill', free: true, premium: true, families: true, teams: true, enterprise: true },
  { name: 'Two-factor authentication', free: false, premium: true, families: true, teams: true, enterprise: true },
  { name: 'Biometric unlock', free: false, premium: true, families: true, teams: true, enterprise: true },
  { name: 'File attachments', free: false, premium: true, families: true, teams: true, enterprise: true },
  { name: 'Secure sharing', free: false, premium: false, families: true, teams: true, enterprise: true },
  { name: 'Family/Team management', free: false, premium: false, families: true, teams: true, enterprise: true },
  { name: 'Parental controls', free: false, premium: false, families: true, teams: false, enterprise: false },
  { name: 'Audit logs', free: false, premium: false, families: false, teams: true, enterprise: true },
  { name: 'Single Sign-On (SSO)', free: false, premium: false, families: false, teams: false, enterprise: true },
  { name: 'Custom branding', free: false, premium: false, families: false, teams: false, enterprise: true },
  { name: 'Priority support', free: false, premium: false, families: false, teams: true, enterprise: true },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">BirchVault</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Choose the plan that's right for you. All plans include a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-muted/50 rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-primary">Save 17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly / 12;
              const isPerUser = plan.id === 'teams' || plan.id === 'enterprise';

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border ${
                    plan.popular
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-border bg-card'
                  } p-6 flex flex-col`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <div className={`w-10 h-10 rounded-lg ${plan.popular ? 'bg-primary/20' : 'bg-muted'} flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        £{price === 0 ? '0' : Number.isInteger(price) ? price : price.toFixed(2)}
                      </span>
                      {price > 0 && (
                        <span className="text-muted-foreground">
                          /{isPerUser ? 'user/' : ''}mo
                        </span>
                      )}
                    </div>
                    {billingCycle === 'yearly' && price > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Billed £{plan.priceYearly}{isPerUser ? '/user' : ''} yearly
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">{plan.users}</p>
                  </div>

                  <Link
                    href={plan.ctaLink}
                    className={`w-full py-2.5 rounded-lg font-medium text-center transition-colors ${
                      plan.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Compare Features</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-medium">Feature</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="text-center py-4 px-4 font-medium">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr key={index} className="border-b border-border/50">
                    <td className="py-4 px-4 text-sm">{feature.name}</td>
                    {(['free', 'premium', 'families', 'teams', 'enterprise'] as const).map((planId) => {
                      const value = feature[planId];
                      return (
                        <td key={planId} className="text-center py-4 px-4">
                          {typeof value === 'boolean' ? (
                            value ? (
                              <Check className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm">{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <FAQItem
              question="What happens when my free trial ends?"
              answer="After your 14-day free trial, you'll be charged for the plan you selected. You can cancel anytime before the trial ends and won't be charged."
            />
            <FAQItem
              question="Can I change plans later?"
              answer="Yes! You can upgrade or downgrade your plan at any time. If you upgrade, you'll be charged the prorated difference. If you downgrade, the new price takes effect at your next billing cycle."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe."
            />
            <FAQItem
              question="Is my data secure?"
              answer="Absolutely. We use zero-knowledge encryption, meaning your data is encrypted on your device before it reaches our servers. We never have access to your master password or vault contents."
            />
            <FAQItem
              question="Can I self-host BirchVault?"
              answer="Yes! BirchVault is open-source and can be self-hosted using Docker. Check our documentation for setup instructions."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to secure your passwords?</h2>
          <p className="text-muted-foreground mb-6">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} BirchVault. Open source under MIT license.</p>
        </div>
      </footer>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
      >
        <span className="font-medium">{question}</span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-muted-foreground">
          {answer}
        </div>
      )}
    </div>
  );
}


