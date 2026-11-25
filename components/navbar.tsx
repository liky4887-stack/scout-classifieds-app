'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radar, Home, Bookmark, Server, Settings, Sun, Moon, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useApp } from './app-provider';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/', label: 'الإعلانات', labelEn: 'Feed', icon: Home },
  { href: '/searches', label: 'البحوث المحفوظة', labelEn: 'Saved Searches', icon: Bookmark },
  { href: '/sources', label: 'المصادر', labelEn: 'Sources', icon: Server },
  { href: '/settings', label: 'الإعدادات', labelEn: 'Settings', icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { triggerWorker, sources } = useApp();
  const [mounted, setMounted] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeSources = sources.filter((s) => s.enabled).length;

  const handleRefresh = async () => {
    setPolling(true);
    await triggerWorker();
    setTimeout(() => setPolling(false), 1500);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 h-full flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Radar className="w-5 h-5" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              {activeSources > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              )}
              <span className={cn(
                'relative inline-flex rounded-full h-2.5 w-2.5',
                activeSources > 0 ? 'bg-success' : 'bg-muted-foreground'
              )} />
            </span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight">Scout</span>
            <span className="text-[10px] text-muted-foreground">مراقب الإعلانات</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={polling}
            className="relative"
            title="تحديث الإعلانات"
          >
            <RefreshCw className={cn('w-4 h-4', polling && 'animate-spin')} />
          </Button>
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="تبديل المظهر"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg h-16 flex items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
