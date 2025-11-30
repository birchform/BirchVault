import Link from 'next/link';
import { Shield, Lock, Cloud, Smartphone, Monitor, Chrome, Check, Sparkles, Users, Building2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-birch-950/20">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">BirchVault</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-birch-400 bg-clip-text text-transparent">
            Your Passwords,
            <br />
            Your Control
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            BirchVault is a secure, open-source password manager with zero-knowledge
            encryption. Your data is encrypted on your device before it ever leaves.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/register"
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg text-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Create Free Account
            </Link>
            <Link
              href="#features"
              className="border border-border px-8 py-3 rounded-lg text-lg font-medium hover:bg-accent transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <section id="features" className="mt-32 grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Lock className="w-8 h-8" />}
            title="Zero-Knowledge Encryption"
            description="Your master password never leaves your device. We can't see your data, even if we wanted to."
          />
          <FeatureCard
            icon={<Cloud className="w-8 h-8" />}
            title="Sync Everywhere"
            description="Access your vault from any device. Your encrypted data syncs seamlessly across all platforms."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Open Source"
            description="Fully auditable code. Trust comes from transparency, not promises."
          />
        </section>

        {/* Platform Section */}
        <section className="mt-32 text-center">
          <h2 className="text-3xl font-bold mb-4">Available Everywhere</h2>
          <p className="text-muted-foreground mb-12">
            Use BirchVault on all your devices with native apps
          </p>
          <div className="flex justify-center gap-12 flex-wrap">
            <PlatformIcon icon={<Monitor className="w-10 h-10" />} label="Desktop" />
            <PlatformIcon icon={<Smartphone className="w-10 h-10" />} label="Mobile" />
            <PlatformIcon icon={<Chrome className="w-10 h-10" />} label="Browser" />
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="mt-32">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <PricingCard
              name="Free"
              price="£0"
              period=""
              description="For getting started"
              features={['5 vault items', '1 device', 'Password generator', 'Autofill']}
              ctaText="Get Started"
              ctaLink="/register"
            />

            {/* Premium */}
            <PricingCard
              name="Premium"
              price="£3"
              period="/month"
              description="For individuals"
              features={['Unlimited items', 'Multi-device sync', 'Two-factor auth', 'File attachments']}
              ctaText="Start Free Trial"
              ctaLink="/register?plan=premium"
              popular
            />

            {/* Families */}
            <PricingCard
              name="Families"
              price="£15"
              period="/month"
              description="For up to 6 users"
              features={['Everything in Premium', 'Secure sharing', 'Parental controls', 'Family management']}
              ctaText="Start Free Trial"
              ctaLink="/register?plan=families"
            />

            {/* Teams */}
            <PricingCard
              name="Teams"
              price="£4"
              period="/user/mo"
              description="For businesses"
              features={['Everything in Families', 'User management', 'Audit logs', 'Priority support']}
              ctaText="Contact Sales"
              ctaLink="/contact?plan=teams"
            />
          </div>

          <div className="text-center mt-8">
            <Link
              href="/pricing"
              className="text-primary hover:underline font-medium"
            >
              View full comparison →
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-32 py-12">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} BirchVault. Open source under MIT license.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function PlatformIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  ctaText,
  ctaLink,
  popular,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
  popular?: boolean;
}) {
  return (
    <div
      className={`relative p-6 rounded-2xl border ${
        popular
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
          : 'border-border/50 bg-card/50'
      } backdrop-blur-sm`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <h3 className="text-lg font-semibold mb-1">{name}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      <div className="mb-4">
        <span className="text-3xl font-bold">{price}</span>
        <span className="text-muted-foreground">{period}</span>
      </div>

      <ul className="space-y-2 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-primary" />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={ctaLink}
        className={`block w-full text-center py-2 rounded-lg font-medium transition-colors ${
          popular
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-muted hover:bg-muted/80'
        }`}
      >
        {ctaText}
      </Link>
    </div>
  );
}






