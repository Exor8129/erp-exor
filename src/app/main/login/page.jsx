'use client';

import { useState } from 'react';

export default function InternalLoginPage() {
  const [role, setRole] = useState('employee'); // 'employee' | 'admin'
  const [identifier, setIdentifier] = useState(''); // Employee ID or Email
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/internal-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication failed');

      // Redirect based on selected access portal
      window.location.href = role === 'admin' ? '/admin/dashboard' : '/portal/dashboard';
    } catch (err) {
      setError(err.message || 'Invalid credentials or account locked.');
    } finally {
      setLoading(false);
    }
  };

  const handleSSOLogin = (provider) => {
    // Redirect to company SAML / Okta / Azure AD endpoint
    window.location.href = `/api/auth/sso?provider=${provider}`;
  };

  return (
    <main className="flex min-h-screen bg-slate-900 text-slate-100">
      {/* Left Column: Portal Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-slate-800 bg-slate-950 p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-md shadow-indigo-500/20">
            HQ
          </div>
          <div>
            <span className="text-lg font-semibold tracking-tight">Acme Corp</span>
            <span className="ml-2 rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
              Internal Network
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Enterprise Management System
          </h1>
          <p className="text-sm leading-relaxed text-slate-400 max-w-md">
            Restricted access portal for authorized staff and system administrators. All activities are monitored and logged for security compliance.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Identity Service: Operational (SSO / LDAP Active)</span>
          </div>
        </div>

        <div className="text-xs text-slate-600">
          Security Policy v4.2 • Acme Corp IT Systems
        </div>
      </div>

      {/* Right Column: Auth Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Staff Sign In</h2>
            <p className="mt-1 text-sm text-slate-400">
              Authenticate using your corporate credentials.
            </p>
          </div>

          {/* Role / Portal Switcher */}
          <div className="grid grid-cols-2 rounded-lg bg-slate-800 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setRole('employee')}
              className={`rounded-md py-2 text-xs font-semibold transition ${
                role === 'employee'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Employee Portal
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`rounded-md py-2 text-xs font-semibold transition ${
                role === 'admin'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin Console
            </button>
          </div>

          {/* Single Sign-On (SSO) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleSSOLogin('azure')}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <svg className="h-4 w-4" viewBox="0 0 23 23" fill="none">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              Sign in with Microsoft 365 / Entra ID
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-slate-800" />
            <span className="absolute bg-slate-900 px-3 text-xs uppercase tracking-wider text-slate-500">
              Or standard credentials
            </span>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Direct Credentials Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                {role === 'admin' ? 'Admin Username / Email' : 'Employee ID or Work Email'}
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === 'admin' ? 'admin@company.com' : 'EMP-10492 or name@company.com'}
                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <a
                  href="mailto:it-support@company.com?subject=Password%20Reset%20Request"
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Forgot via IT Desk?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1.5 block w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-50 ${
                role === 'admin'
                  ? 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-500'
                  : 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500'
              }`}
            >
              {loading ? 'Verifying Identity...' : `Authenticate as ${role === 'admin' ? 'Admin' : 'Employee'}`}
            </button>
          </form>

          {/* Internal Support Footer */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-center text-xs text-slate-500">
            Need access or account unlock? Contact{' '}
            <span className="font-medium text-slate-300">IT Helpdesk (#4357)</span> or email{' '}
            <a href="mailto:support@company.com" className="text-indigo-400 underline">
              support@company.com
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}