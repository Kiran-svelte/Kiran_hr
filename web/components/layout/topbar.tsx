"use client";

import React from 'react';
import { Bell, Search, Settings, LogOut, User } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';

interface TopbarProps {
  companyName?: string;
  unreadNotifications?: number;
}

export default function Topbar({ companyName = 'TetraDeck', unreadNotifications = 0 }: TopbarProps) {
  const { user } = useUser();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <div className="h-16 bg-[#0E0E14]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Left: Company Name */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-white">{companyName}</h2>
        <div className="w-px h-6 bg-white/10" />
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          System Online
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <button className="p-2 text-slate-400 hover:text-white transition-colors">
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <Link 
          href="/notifications" 
          className="relative p-2 text-slate-400 hover:text-white transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </Link>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
              {user?.imageUrl ? (
                <img 
                  src={user.imageUrl} 
                  alt={user.fullName || 'User'} 
                  className="w-full h-full rounded-full"
                />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">
                {user?.fullName || user?.username || 'User'}
              </p>
              <p className="text-xs text-slate-400">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-56 glass-panel p-2 z-50">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm">Profile</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Settings</span>
                </Link>
                <div className="h-px bg-white/10 my-2" />
                <SignOutButton>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </button>
                </SignOutButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
