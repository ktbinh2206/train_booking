'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { VN } from '@/lib/translations';
import { useAuth } from '@/components/auth/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchParams = useSearchParams();

  const redirect = searchParams.get('redirect');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Vui lòng điền tất cả các trường');
      return;
    }

    try {
      setLoading(true);
      await login({
        email: email.trim(),
        password
      });
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Không thể đăng nhập.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (redirect) {
        router.replace(decodeURIComponent(redirect));
      } else {
        router.replace('/');
      }
    }
  }, [user, redirect, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Chào mừng trở lại</h1>
          <p className="text-gray-600">Đăng nhập để quản lý các đặt vé của bạn</p>
        </div>

        {/* Login Card */}
        <Card className="border border-gray-200">
          <div className="p-8">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {VN.login.email}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 border-gray-300"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {VN.login.password}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                  {VN.login.rememberMe}
                </label>
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  {VN.login.forgotPassword}
                </a>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? 'Đang đăng nhập...' : VN.login.signIn}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-600">hoặc</span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center text-sm text-gray-600">
              {VN.login.noAccount}{' '}
              <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                {VN.login.createAccount}
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
