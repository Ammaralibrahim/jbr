import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  );
}