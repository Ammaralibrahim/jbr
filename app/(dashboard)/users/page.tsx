'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      toast.error('فشل في تحميل المستخدمين');
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'الاسم',
      render: (user: any) => user.name,
    },
    {
      key: 'email',
      header: 'البريد الإلكتروني',
      render: (user: any) => user.email,
    },
    {
      key: 'employeeId',
      header: 'الرقم الوظيفي',
      render: (user: any) => user.employeeId,
    },
    {
      key: 'role',
      header: 'الدور',
      render: (user: any) => (
        <Badge
          variant={
            user.role === 'Admin'
              ? 'destructive'
              : user.role === 'PlantManager'
              ? 'default'
              : 'secondary'
          }
        >
          {user.role === 'Admin'
            ? 'مدير النظام'
            : user.role === 'PlantManager'
            ? 'مدير المحطة'
            : 'مشغل'}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'الحالة',
      render: (user: any) => (
        <Badge variant={user.isActive ? 'default' : 'secondary'}>
          {user.isActive ? 'نشط' : 'غير نشط'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">المستخدمون</h1>
          <p className="text-muted-foreground mt-1">
            إدارة مستخدمي النظام
          </p>
        </div>
        {session?.user?.role === 'Admin' && (
          <Button>
            <UserPlus className="h-4 w-4 ml-2" />
            إضافة مستخدم
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <DataTable columns={columns} data={users} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}