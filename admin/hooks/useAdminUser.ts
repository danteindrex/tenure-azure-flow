'use client'

import { useState, useEffect } from 'react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  isOnline: boolean;
}

export function useAdminUser() {
  const [adminUser, setAdminUser] = useState<AdminUser>({
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@tenure.com',
    role: 'Super Admin',
    isOnline: true,
  });

  // Get user data from JWT token
  useEffect(() => {
    const getUserFromToken = () => {
      try {
        // Get token from cookie
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('admin_token='));
        
        if (!tokenCookie) {
          return;
        }

        const token = tokenCookie.split('=')[1];
        
        // Decode JWT payload
        const parts = token.split('.');
        if (parts.length !== 3) {
          return;
        }

        const payload = JSON.parse(atob(parts[1]));
        
        // Update user data with real token data
        setAdminUser({
          id: payload.id || 'admin-1',
          name: payload.name || 'Admin User',
          email: payload.email || 'admin@tenure.com',
          role: payload.role || payload.identity || 'admin',
          isOnline: true,
        });
      } catch (error) {
        console.error('Failed to decode token:', error);
        // Fallback to default data
        setAdminUser({
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@tenure.com',
          role: 'Super Admin',
          isOnline: true,
        });
      }
    };

    getUserFromToken();
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // Clear client-side token
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if API fails
      window.location.href = '/login';
    }
  };

  return {
    adminUser,
    logout,
  };
}