'use client';

import { useState } from 'react';
import { Menu, Search, Bell, Sun, Moon } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { useTheme } from 'next-themes';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications] = useState(3);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden md:block">
          <h2 className="text-lg font-semibold">نظام إدارة المحطة</h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث..."
              className="w-64 pr-10"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {notifications > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -left-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {notifications}
            </Badge>
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}