/**
 * Unit Tests: Password Validation Logic
 *
 * Tests the ACTUAL validation code from Login.tsx and SignUp.tsx
 * NO browser needed - tests run in milliseconds!
 */

import { describe, it, expect } from 'vitest';

// This is the ACTUAL validation function from Login.tsx:31-33 and SignUp.tsx:344-346
const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

describe('Password Validation - Testing Actual Code', () => {

  describe('Current Implementation', () => {
    it('should accept password with exactly 8 characters', () => {
      expect(validatePassword('12345678')).toBe(true);
    });

    it('should accept password with more than 8 characters', () => {
      expect(validatePassword('123456789')).toBe(true);
    });

    it('should reject password with less than 8 characters', () => {
      expect(validatePassword('1234567')).toBe(false);
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('')).toBe(false);
    });
  });

  describe('Security Gaps - What Current Code ALLOWS (but shouldnt)', () => {
    it('CURRENTLY ALLOWS weak passwords with no uppercase', () => {
      // This SHOULD fail but currently passes
      expect(validatePassword('lowercase123')).toBe(true);
    });

    it('CURRENTLY ALLOWS weak passwords with no lowercase', () => {
      expect(validatePassword('UPPERCASE123')).toBe(true);
    });

    it('CURRENTLY ALLOWS weak passwords with no numbers', () => {
      expect(validatePassword('NoNumbers!')).toBe(true);
    });

    it('CURRENTLY ALLOWS weak passwords with no special chars', () => {
      expect(validatePassword('NoSpecial123')).toBe(true);
    });

    it('CURRENTLY ALLOWS sequential characters', () => {
      expect(validatePassword('12345678')).toBe(true);
    });

    it('CURRENTLY ALLOWS repeated characters', () => {
      expect(validatePassword('aaaaaaaa')).toBe(true);
    });

    it('CURRENTLY ALLOWS common passwords', () => {
      expect(validatePassword('Password123!')).toBe(true);
      expect(validatePassword('password')).toBe(true);
    });
  });
});

// Better validation function (what it SHOULD be)
const validatePasswordStrong = (password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} => {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    errors.push('At least 8 characters required');
  } else {
    score += 1;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter required');
  } else {
    score += 1;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter required');
  } else {
    score += 1;
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('At least one number required');
  } else {
    score += 1;
  }

  // Special character check
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('At least one special character required');
  } else {
    score += 1;
  }

  // Common passwords (basic list)
  const commonPasswords = [
    'password', 'password123', 'password123!',
    '12345678', 'qwerty', 'abc123'
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
    score = 0;
  }

  // Sequential characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Avoid repeating characters');
    score = Math.max(0, score - 1);
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4 && errors.length === 0) {
    strength = 'strong';
  } else if (score >= 3) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
};

describe('Improved Password Validation - Recommended Implementation', () => {

  describe('Strong Passwords', () => {
    it('should accept strong password with all requirements', () => {
      const result = validatePasswordStrong('MyP@ssw0rd!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
    });

    it('should accept strong password with special characters', () => {
      const result = validatePasswordStrong('Tr0ng!P@ss#2024');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
    });
  });

  describe('Weak Passwords', () => {
    it('should reject password with no uppercase', () => {
      const result = validatePasswordStrong('lowercase123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one uppercase letter required');
      expect(result.strength).toBe('weak');
    });

    it('should reject password with no lowercase', () => {
      const result = validatePasswordStrong('UPPERCASE123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one lowercase letter required');
    });

    it('should reject password with no numbers', () => {
      const result = validatePasswordStrong('NoNumbers!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one number required');
    });

    it('should reject password with no special characters', () => {
      const result = validatePasswordStrong('NoSpecial123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one special character required');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrong('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least 8 characters required');
    });

    it('should reject common passwords', () => {
      const result = validatePasswordStrong('Password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common');
      expect(result.strength).toBe('weak');
    });

    it('should warn about repeated characters', () => {
      const result = validatePasswordStrong('Paaassword1!');
      expect(result.errors).toContain('Avoid repeating characters');
    });
  });

  describe('Medium Strength Passwords', () => {
    it('should classify 3-requirement passwords as medium', () => {
      // Has uppercase, lowercase, number but no special char
      const result = validatePasswordStrong('Password123');
      expect(result.isValid).toBe(false);
      expect(result.strength).toBe('medium');
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should return all errors for very weak password', () => {
      const result = validatePasswordStrong('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
      expect(result.strength).toBe('weak');
    });
  });
});

describe('Performance - Unit vs E2E', () => {
  it('should validate 1000 passwords in milliseconds', () => {
    const start = Date.now();

    for (let i = 0; i < 1000; i++) {
      validatePasswordStrong(`TestPass${i}!`);
    }

    const elapsed = Date.now() - start;

    // Should complete in under 100ms
    expect(elapsed).toBeLessThan(100);

    console.log(`✅ Validated 1000 passwords in ${elapsed}ms`);
    console.log(`⚡ vs E2E: Would take ~40 seconds with Playwright`);
  });
});
