'use client';

//LoginPage

import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  // Login function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      // login() already redirects to /dashboard on success
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  // Render
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 bg-card border border-border rounded-2xl">
        <h2 className="text-2xl font-bold text-foreground">Sign In</h2>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-muted mb-1">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs font-medium text-muted mb-1">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
            required
          />
        </div>
        <button type="submit" className="w-full bg-primary text-black font-bold py-2 rounded-lg hover:bg-primary/90">
          Login
        </button>
        <p className="text-xs text-center text-muted">
          Don't have an account? <a href="/register" className="text-primary">Register</a>
        </p>
      </form>
    </div>
  );
}