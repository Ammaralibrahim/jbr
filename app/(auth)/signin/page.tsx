'use client';

import { Suspense, useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Lock, Mail, Power } from 'lucide-react';
import { toast } from 'sonner';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Callback URL'yi güvenli hale getir (sadece /dashboard ve alt yolları)
  const getSafeCallbackUrl = (): string => {
    const cb = searchParams.get('callbackUrl') || '/dashboard';
    // Sadece kendi origin'imize ait path'lere izin ver
    if (!cb.startsWith('/')) return '/dashboard';
    if (cb.startsWith('//')) return '/dashboard';
    if (cb.startsWith('/api')) return '/dashboard';
    return cb;
  };

  // Zaten giriş yapılmışsa yönlendir
  useEffect(() => {
    if (status === 'authenticated' && session) {
      window.location.href = getSafeCallbackUrl();
    }
  }, [status, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('بيانات الدخول غير صحيحة');
        toast.error('فشل تسجيل الدخول');
        setIsLoading(false);
      } else if (result?.ok) {
        toast.success('تم تسجيل الدخول بنجاح');
        window.location.href = getSafeCallbackUrl();
      }
    } catch (error) {
      setError('حدث خطأ غير متوقع');
      toast.error('فشل تسجيل الدخول');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-100 dark:border-gray-700">
        <div className="text-center space-y-4 mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <Power className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">محطة تشرين الكهربائية</h1>
            <p className="text-muted-foreground mt-2 text-sm">نظام إدارة وتشغيل المحطة</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 text-sm"
                required
                dir="ltr"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 text-sm"
                required
                dir="ltr"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-l from-blue-600 to-indigo-600 text-white py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري تسجيل الدخول...
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-10 w-10 animate-spin text-blue-500" /></div>}>
      <SignInForm />
    </Suspense>
  );
}