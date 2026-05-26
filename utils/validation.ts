/**
 * Comprehensive Input Validation Utilities
 * Secure input validation for all user-facing data
 */

/**
 * Validate email address (RFC 5322 compliant pattern)
 */
export const validateEmail = (
  email: string
): { valid: boolean; error?: string } => {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim().toLowerCase();

  // Check length
  if (trimmed.length > 254) {
    return { valid: false, error: "Email is too long (max 254 characters)" };
  }

  // RFC 5322 simplified pattern
  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true };
};

/**
 * Validate password strength
 * Requirements: 12+ chars, uppercase, lowercase, number, special character
 */
export const validatePassword = (
  password: string
): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters" };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one special character",
    };
  }

  return { valid: true };
};

/**
 * Validate username
 * 4-30 chars, alphanumeric + underscore + hyphen, no consecutive special chars
 */
export const validateUsername = (
  username: string
): { valid: boolean; error?: string } => {
  if (!username) {
    return { valid: false, error: "Username is required" };
  }

  const trimmed = username.trim();

  if (trimmed.length < 4) {
    return { valid: false, error: "Username must be at least 4 characters" };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: "Username must be at most 30 characters" };
  }

  // Allow alphanumeric, underscore, hyphen only
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(trimmed)) {
    return {
      valid: false,
      error:
        "Username can only contain letters, numbers, underscores, and hyphens",
    };
  }

  // No consecutive special chars
  if (/__{2,}/.test(trimmed) || /-{2,}/.test(trimmed)) {
    return {
      valid: false,
      error: "Username cannot contain consecutive underscores or hyphens",
    };
  }

  // Can't start or end with special chars
  if (/^[_-]/.test(trimmed) || /[_-]$/.test(trimmed)) {
    return {
      valid: false,
      error: "Username cannot start or end with special characters",
    };
  }

  return { valid: true };
};

/**
 * Validate referral code
 * 5-20 alphanumeric uppercase characters
 */
export const validateReferralCode = (
  code: string
): { valid: boolean; error?: string } => {
  if (!code || typeof code !== "string") {
    return { valid: false, error: "Referral code is required" };
  }

  const trimmed = code.trim().toUpperCase();

  if (trimmed.length < 5) {
    return { valid: false, error: "Referral code must be at least 5 characters" };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: "Referral code must be at most 20 characters" };
  }

  // Only alphanumeric
  const codeRegex = /^[A-Z0-9]{5,20}$/;
  if (!codeRegex.test(trimmed)) {
    return {
      valid: false,
      error: "Referral code must be alphanumeric (uppercase only)",
    };
  }

  return { valid: true };
};

/**
 * Validate image file
 * Max 5MB, allowed types: JPEG/PNG/WebP
 */
export const validateImageFile = (
  file: File
): { valid: boolean; error?: string } => {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
  ];

  if (!file) {
    return { valid: false, error: "File is required" };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `File size must be less than 5MB. Got ${sizeMB}MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Only JPEG, PNG, and WebP images are allowed",
    };
  }

  // Check filename extension
  const filename = file.name.toLowerCase();
  if (!/\.(jpg|jpeg|png|webp)$/.test(filename)) {
    return { valid: false, error: "Invalid file extension" };
  }

  return { valid: true };
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const validateDate = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== "string") return false;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Validate time format (HH:MM in 24-hour)
 */
export const validateTime = (timeStr: string): boolean => {
  if (!timeStr || typeof timeStr !== "string") return false;

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeStr);
};

/**
 * Sanitize text input - remove XSS vectors and limit length
 */
export const sanitizeInput = (
  input: string,
  maxLength: number = 255
): string => {
  if (!input || typeof input !== "string") return "";

  return input
    .substring(0, maxLength)
    .trim()
    .replace(/[<>]/g, ""); // Remove potential XSS characters
};

/**
 * Validate JSON string and parse
 */
export const validateJSON = (
  jsonStr: string
): { valid: boolean; data?: any; error?: string } => {
  try {
    if (typeof jsonStr !== "string") {
      return { valid: false, error: "Input must be a string" };
    }

    const data = JSON.parse(jsonStr);
    return { valid: true, data };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

/**
 * Validate required field
 */
export const validateRequired = (
  value: any,
  fieldName: string
): { valid: boolean; error?: string } => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && !value.trim())
  ) {
    return { valid: false, error: `${fieldName} is required` };
  }

  return { valid: true };
};

/**
 * Validate string length
 */
export const validateLength = (
  value: string,
  min: number,
  max: number,
  fieldName: string
): { valid: boolean; error?: string } => {
  if (!value || typeof value !== "string") {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  const length = value.trim().length;

  if (length < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${min} characters`,
    };
  }

  if (length > max) {
    return {
      valid: false,
      error: `${fieldName} must be at most ${max} characters`,
    };
  }

  return { valid: true };
};

/**
 * Validate number range
 */
export const validateNumberRange = (
  value: number,
  min: number,
  max: number,
  fieldName: string
): { valid: boolean; error?: string } => {
  if (!Number.isInteger(value)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  if (value < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${min}`,
    };
  }

  if (value > max) {
    return {
      valid: false,
      error: `${fieldName} must be at most ${max}`,
    };
  }

  return { valid: true };
};

/**
 * Validate event duration
 */
export const validateEventDuration = (
  durationMinutes: number
): { valid: boolean; error?: string } => {
  if (!Number.isInteger(durationMinutes)) {
    return { valid: false, error: "Duration must be a number" };
  }

  if (durationMinutes < 5) {
    return { valid: false, error: "Event must be at least 5 minutes" };
  }

  if (durationMinutes > 480) {
    return { valid: false, error: "Event cannot be longer than 8 hours" };
  }

  return { valid: true };
};

/**
 * Validate all authentication data at once
 */
export const validateAuthData = (data: {
  email: string;
  password: string;
  confirmPassword?: string;
  username?: string;
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  const emailCheck = validateEmail(data.email);
  if (!emailCheck.valid) errors.push(emailCheck.error!);

  const passwordCheck = validatePassword(data.password);
  if (!passwordCheck.valid) errors.push(passwordCheck.error!);

  if (
    data.confirmPassword &&
    data.password !== data.confirmPassword
  ) {
    errors.push("Passwords do not match");
  }

  if (data.username) {
    const usernameCheck = validateUsername(data.username);
    if (!usernameCheck.valid) errors.push(usernameCheck.error!);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
