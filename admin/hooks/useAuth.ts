'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthUser {
  email: string;
  name: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Get token from cookie
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('admin_token='))
          ?.split('=')[1];

        if (token) {
          // Decode JWT payload (basic decode, not verification)
          const payload = JSON.parse(atob(token.split('.')[1]));
          
          // Check if token is expired
          if (payload.exp * 1000 > Date.now()) {
            setUser({
              email: payload.email,
              name: payload.name,
              role: payload.role
            });
          } else {
            // Token expired, redirect to login
            router.push('/login');
          }
        } else {
          // No token, redirect to login
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      // Clear cookie and redirect
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.push('/login');
    }
  };

  return {
    user,
    isLoading,
    logout,
    isAuthenticated: !!user
  };
}