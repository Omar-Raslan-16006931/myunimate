# Input Validation & Sanitization Guidelines

## Overview
This document provides specific code examples for fixing input validation vulnerabilities found in the security audit.

---

## Critical Input Validation Issues

### 1. Email Validation (Auth.tsx)

**CURRENT (VULNERABLE):**
```typescript
if (!identifier.includes('@')) throw new Error("Please enter a valid email address.");
```

**FIXED:**
```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email: string): boolean => {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email.toLowerCase().trim());
};

// Use in Auth.tsx line 129
if (!isValidEmail(identifier)) {
  throw new Error("Please enter a valid email address.");
}
```

---

### 2. Password Validation

**CURRENT (WEAK):**
```typescript
if (password.length < 6) throw new Error("Password must be at least 6 characters long.");
```

**FIXED:**
```typescript
const isValidPassword = (password: string): { valid: boolean; reason?: string } => {
  if (!password) return { valid: false, reason: "Password is required" };
  if (password.length < 12) return { valid: false, reason: "Password must be at least 12 characters" };
  if (!/[A-Z]/.test(password)) return { valid: false, reason: "Password must contain uppercase letter" };
  if (!/[a-z]/.test(password)) return { valid: false, reason: "Password must contain lowercase letter" };
  if (!/[0-9]/.test(password)) return { valid: false, reason: "Password must contain number" };
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, reason: "Password must contain special character" };
  }
  return { valid: true };
};

// Use in Auth.tsx
const passwordCheck = isValidPassword(password);
if (!passwordCheck.valid) {
  throw new Error(passwordCheck.reason);
}
```

---

### 3. Username Validation

**CURRENT (NO SANITIZATION):**
```typescript
if (username.trim().length < 4) throw new Error("Username must be at least 4 characters long.");
```

**FIXED:**
```typescript
const isValidUsername = (username: string): { valid: boolean; reason?: string } => {
  const trimmed = username.trim();

  // Length checks
  if (trimmed.length < 4) return { valid: false, reason: "Username must be at least 4 characters" };
  if (trimmed.length > 30) return { valid: false, reason: "Username must be at most 30 characters" };

  // Character validation - allow alphanumeric, underscore, hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(trimmed)) {
    return { valid: false, reason: "Username can only contain letters, numbers, underscores, and hyphens" };
  }

  // No consecutive underscores or hyphens
  if (/__{2,}/.test(trimmed) || /-{2,}/.test(trimmed)) {
    return { valid: false, reason: "Username cannot contain consecutive underscores or hyphens" };
  }

  return { valid: true };
};

// Use in Auth.tsx
const usernameCheck = isValidUsername(username);
if (!usernameCheck.valid) {
  throw new Error(usernameCheck.reason);
}
```

---

### 4. Referral Code Validation

**CURRENT (NO FORMAT VALIDATION):**
```typescript
if (referralCode.trim()) {
  const { data } = await supabase
    .from('referral_codes')
    .select('id')
    .eq('code', referralCode.trim())
    .eq('is_active', true)
    .maybeSingle();
}
```

**FIXED:**
```typescript
const isValidReferralCodeFormat = (code: string): boolean => {
  // Referral codes should be alphanumeric, 5-20 chars
  const referralRegex = /^[A-Z0-9]{5,20}$/;
  return referralRegex.test(code.trim().toUpperCase());
};

// Use in Auth.tsx
if (referralCode.trim()) {
  if (!isValidReferralCodeFormat(referralCode)) {
    throw new Error("Invalid referral code format.");
  }

  const { data } = await supabase
    .from('referral_codes')
    .select('id')
    .eq('code', referralCode.trim().toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (!data) {
    throw new Error("Invalid or inactive referral code.");
  }
}
```

---

### 5. File Upload Validation

**CURRENT (CLIENT-ONLY):**
```typescript
<input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
```

**FIXED (Frontend + Backend):**

**Frontend Validation:**
```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const isValidImageFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size must be less than 5MB. Got ${(file.size / 1024 / 1024).toFixed(2)}MB` };
  }

  // Check MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Only JPEG, PNG, and WebP images are allowed" };
  }

  // Check filename for malicious patterns
  const filename = file.name.toLowerCase();
  if (!/\.(jpg|jpeg|png|webp)$/.test(filename)) {
    return { valid: false, error: "Invalid file extension" };
  }

  return { valid: true };
};

// In ImageImportModal.tsx
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const validation = isValidImageFile(file);
  if (!validation.valid) {
    setError(validation.error);
    return;
  }

  // Continue with file processing
  processImage(file);
};
```

**Backend Validation (Supabase Function):**
```typescript
async function validateImageUpload(req: any) {
  const { base64, filename } = req.body;

  // Decode and check
  const buffer = Buffer.from(base64, 'base64');

  // Check size
  const MAX_BYTES = 5 * 1024 * 1024;
  if (buffer.length > MAX_BYTES) {
    throw new Error('File too large');
  }

  // Verify it's actually an image (check magic numbers)
  const magicNumbers = buffer.slice(0, 4);
  const isJPEG = magicNumbers[0] === 0xFF && magicNumbers[1] === 0xD8;
  const isPNG = magicNumbers.equals(Buffer.from([0x89, 0x50, 0x4E, 0x47]));
  const isWebP = buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
                 buffer.slice(8, 12).toString('ascii') === 'WEBP';

  if (!isJPEG && !isPNG && !isWebP) {
    throw new Error('Invalid image file');
  }

  return true;
}
```

---

### 6. JSON Input Validation

**CURRENT (UNSAFE):**
```typescript
const data = JSON.parse(cachedData);
if (data.events) setEvents(data.events);
```

**FIXED:**
```typescript
interface CachedData {
  events?: any[];
  profiles?: any[];
  courses?: any[];
}

const validateCacheStructure = (data: any): CachedData | null => {
  try {
    // Ensure it's an object
    if (typeof data !== 'object' || data === null) {
      return null;
    }

    // Validate events array
    if (data.events !== undefined && !Array.isArray(data.events)) {
      return null;
    }

    // Validate each event
    if (Array.isArray(data.events)) {
      for (const event of data.events) {
        if (typeof event !== 'object' || !event.id || !event.title) {
          return null;
        }
      }
    }

    return {
      events: data.events || [],
      profiles: data.profiles || [],
      courses: data.courses || [],
    };
  } catch {
    return null;
  }
};

// Use in App.tsx
try {
  const cachedData = localStorage.getItem('unimate_v1_cache');
  if (cachedData) {
    const parsed = JSON.parse(cachedData);
    const validated = validateCacheStructure(parsed);

    if (validated) {
      setEvents(validated.events || []);
      setProfiles(validated.profiles || []);
      setCourses(validated.courses || []);
    } else {
      console.warn("Invalid cache format, starting fresh");
      localStorage.removeItem('unimate_v1_cache');
    }
  }
} catch (error) {
  console.warn("Failed to parse cache:", error);
  localStorage.removeItem('unimate_v1_cache');
}
```

---

### 7. Major/College/Year Validation

**ADD DROPDOWN VALIDATION:**
```typescript
const VALID_MAJORS = [
  'Computer Science',
  'Engineering',
  'Business',
  'Medicine',
  // ... add all valid options
];

const VALID_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

const VALID_COLLEGES = [
  'College of Engineering',
  'College of Medicine',
  'College of Business',
  // ... add all valid options
];

const isValidMajor = (major: string): boolean => VALID_MAJORS.includes(major);
const isValidYear = (year: string): boolean => VALID_YEARS.includes(year);
const isValidCollege = (college: string): boolean => VALID_COLLEGES.includes(college);

// Use in signup
if (!isValidMajor(major)) throw new Error("Invalid major selected");
if (!isValidYear(year)) throw new Error("Invalid year selected");
if (!isValidCollege(college)) throw new Error("Invalid college selected");
```

---

### 8. Date/Time Validation

**FOR EVENT CREATION:**
```typescript
const isValidDate = (dateStr: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

const isValidTime = (timeStr: string): boolean => {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeStr);
};

const isValidEventData = (event: any) => {
  if (!event.title || event.title.length > 200) return false;
  if (!isValidDate(event.date)) return false;
  if (!isValidTime(event.startTime)) return false;
  if (!Number.isInteger(event.durationMinutes) || event.durationMinutes < 5 || event.durationMinutes > 480) {
    return false;
  }
  return true;
};
```

---

## Universal Validation Utils

**Create: `utils/validation.ts`**

```typescript
export const sanitizeInput = (input: string, maxLength: number = 255): string => {
  return input
    .substring(0, maxLength)
    .trim()
    .replace(/[<>]/g, ''); // Remove potential XSS characters
};

export const validateRequired = (value: any, fieldName: string) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    throw new Error(`${fieldName} is required`);
  }
};

export const validateLength = (value: string, min: number, max: number, fieldName: string) => {
  if (value.length < min) {
    throw new Error(`${fieldName} must be at least ${min} characters`);
  }
  if (value.length > max) {
    throw new Error(`${fieldName} must be at most ${max} characters`);
  }
};

export const validatePattern = (value: string, pattern: RegExp, errorMsg: string) => {
  if (!pattern.test(value)) {
    throw new Error(errorMsg);
  }
};
```

---

## Testing Validation

**Create: `utils/validation.test.ts`**

```typescript
import { isValidEmail, isValidPassword, isValidUsername } from './validation';

describe('Input Validation', () => {
  test('isValidEmail - valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.email@domain.co.uk')).toBe(true);
  });

  test('isValidEmail - invalid emails', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
  });

  test('isValidPassword - strong passwords', () => {
    expect(isValidPassword('SecurePass123!').valid).toBe(true);
  });

  test('isValidPassword - weak passwords', () => {
    expect(isValidPassword('weak').valid).toBe(false);
    expect(isValidPassword('12345678').valid).toBe(false);
    expect(isValidPassword('NoSpecialChar1').valid).toBe(false);
  });

  test('isValidUsername - valid usernames', () => {
    expect(isValidUsername('user_name').valid).toBe(true);
    expect(isValidUsername('user-123').valid).toBe(true);
  });

  test('isValidUsername - invalid usernames', () => {
    expect(isValidUsername('abc').valid).toBe(false);
    expect(isValidUsername('user__name').valid).toBe(false);
    expect(isValidUsername('user@name').valid).toBe(false);
  });
});
```

---

## Best Practices Summary

1. ✅ **Always validate on both client AND server**
2. ✅ **Use whitelist validation, not blacklist**
3. ✅ **Set reasonable length limits**
4. ✅ **Validate data types, not just format**
5. ✅ **Reject oversized payloads early**
6. ✅ **Log validation failures securely**
7. ✅ **Never trust client-side data**
8. ✅ **Use prepared statements (Supabase does this)**
9. ✅ **Sanitize before display**
10. ✅ **Test edge cases and malformed input**

---

## Deployment Checklist

- [ ] All input validation rules implemented
- [ ] Backend validates all inputs
- [ ] Error messages don't expose system info
- [ ] File uploads have size/type checks
- [ ] JSON parsing has error handling
- [ ] Tests cover validation edge cases
- [ ] Rate limiting on auth endpoints
- [ ] CSRF tokens on forms
- [ ] CSP headers configured
- [ ] Tested with OWASP ZAP scanner

---

**Last Updated:** 2026-05-27
