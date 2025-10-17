export type AuthResult = { success: boolean; message?: string };

const AUTH_TOKEN_KEY = "auth_token";
const USER_EMAIL_KEY = "user_email";

// Basic cookie helpers (client-side only)
const setCookie = (name: string, value: string, maxAgeSeconds: number) => {
  try {
    if (typeof document === "undefined") return;
    const sameSite = "Lax"; // safe default for auth redirects
    const path = "/";
    document.cookie = `${name}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAgeSeconds}; samesite=${sameSite}`;
  } catch {
    // ignore cookie write errors
  }
};

const getCookie = (name: string): string | null => {
  try {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
};

const deleteCookie = (name: string) => {
  try {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; path=/; max-age=0; samesite=Lax`;
  } catch {
    // ignore
  }
};

export const isAuthenticated = (): boolean => {
  try {
    // Prefer cookie for SSR compatibility; fallback to localStorage
    const cookieToken = getCookie(AUTH_TOKEN_KEY);
    if (cookieToken) return true;
    return typeof localStorage !== "undefined" && !!localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return false;
  }
};

const validateCredentials = (email: string, password: string): boolean => {
  const emailOk = /\S+@\S+\.\S+/.test(email);
  const pwdOk = password.trim().length >= 6;
  return emailOk && pwdOk;
};

export const login = async (email: string, password: string): Promise<AuthResult> => {
  // Normally you'd call your API here and verify credentials.
  // For now, confirm with a simple validator to simulate proper auth.
  if (!validateCredentials(email, password)) {
    return { success: false, message: "Invalid email or password" };
  }

  // Simulated auth token
  const fakeToken = btoa(`${email}:${Date.now()}`);

  try {
    // Persist to localStorage for client-side checks
    localStorage.setItem(AUTH_TOKEN_KEY, fakeToken);
    localStorage.setItem(USER_EMAIL_KEY, email);
    // Persist cookie for SSR redirects and route protection
    // 7 days expiry
    setCookie(AUTH_TOKEN_KEY, fakeToken, 7 * 24 * 60 * 60);
  } catch (err) {
    return { success: false, message: "Unable to persist session" };
  }

  return { success: true };
};

export const logout = (): void => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
  } catch {
    // ignore
  }
  deleteCookie(AUTH_TOKEN_KEY);
};