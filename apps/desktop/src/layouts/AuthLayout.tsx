import { Outlet, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <Shield className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold">BirchVault</span>
          </Link>
          <p className="text-sm text-muted-foreground mt-2">Desktop Edition</p>
        </div>

        {/* Content */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}








