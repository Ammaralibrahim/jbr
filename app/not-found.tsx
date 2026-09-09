import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-6 p-8">
        <div className="mx-auto w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <FileQuestion className="h-12 w-12 text-gray-400 dark:text-gray-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">404</h1>
          <h2 className="text-2xl font-semibold">الصفحة غير موجودة</h2>
          <p className="text-muted-foreground">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          </p>
        </div>
        <Link href="/dashboard">
          <Button>
            <Home className="h-4 w-4 ml-2" />
            العودة للرئيسية
          </Button>
        </Link>
      </div>
    </div>
  );
}