'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, User, Mail, Lock, Phone, ArrowRight, CheckCircle } from 'lucide-react';
import { VN } from '@/lib/translations';
import { useAuth } from '@/components/auth/auth-provider';

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState<'form' | 'verification'>('form');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password) {
      setError('Vui lòng điền tất cả các trường');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu không khớp');
      return;
    }

    if (!agreedToTerms) {
      setError('Vui lòng đồng ý với các điều khoản và điều kiện');
      return;
    }

    try {
      setLoading(true);
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password
      });
      setLoading(false);
      setStep('verification');
    } catch (unknownError) {
      const message = unknownError instanceof Error ? unknownError.message : 'Không thể tạo tài khoản.';
      setError(message);
      setLoading(false);
    }
  };

  if (step === 'verification') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="border border-gray-200">
            <div className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tài khoản đã tạo!</h2>
              <p className="text-gray-600 mb-6">
                Chào mừng, {formData.firstName}! Tài khoản của bạn đã được tạo thành công.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-gray-700">
                <p className="font-medium mb-2">Bước tiếp theo:</p>
                <ul className="space-y-2 text-left list-disc list-inside">
                  <li>Xác nhận địa chỉ email của bạn</li>
                  <li>Hoàn thành thông tin hồ sơ của bạn</li>
                  <li>Bắt đầu đặt vé của bạn!</li>
                </ul>
              </div>

              <Button
                onClick={() => router.push('/')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
              >
                Về trang chủ
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{VN.signup.title}</h1>
          <p className="text-gray-600">Tham gia RailBooking để đặt vé của bạn</p>
        </div>

        {/* Signup Card */}
        <Card className="border border-gray-200">
          <div className="p-8">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    {VN.signup.firstName}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="pl-10 border-gray-200"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    {VN.signup.lastName}
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="border-gray-200"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {VN.signup.email}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 border-gray-200"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  {VN.signup.phone}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10 border-gray-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {VN.signup.password}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  {VN.signup.confirmPassword}
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="border-gray-200"
                />
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 border border-gray-300 rounded cursor-pointer mt-1"
                />
                <label htmlFor="terms" className="ml-2 text-sm text-gray-600 cursor-pointer">
                  {VN.signup.agreeTerms}{' '}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-700">
                    {VN.signup.terms}
                  </Link>{' '}
                  và{' '}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
                    {VN.signup.privacy}
                  </Link>
                </label>
              </div>

              {/* Signup Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 flex items-center justify-center gap-2 mt-6"
              >
                {loading ? 'Đang tạo tài khoản...' : VN.signup.createAccount}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-gray-50 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              {VN.signup.alreadyAccount}{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                {VN.signup.signIn}
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
