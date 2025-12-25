/**
 * OTP Input Component
 * 6-digit input with auto-focus, paste support, and auto-submit
 */

import React, { useRef, useState, useEffect, ChangeEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { useTheme } from '../theme/ThemeProvider';

export interface OTPInputProps {
  /** Number of digits (default: 6) */
  length?: number;
  /** Callback when OTP is complete */
  onComplete: (otp: string) => void;
  /** Callback on each change */
  onChange?: (otp: string) => void;
  /** Auto-submit when complete */
  autoSubmit?: boolean;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: {
    container?: React.CSSProperties;
    input?: React.CSSProperties;
    error?: React.CSSProperties;
  };
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  onChange,
  autoSubmit = true,
  error = false,
  errorMessage,
  disabled = false,
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  const handleChange = (index: number, value: string) => {
    if (disabled) return;

    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');

    if (digit.length > 1) {
      // Handle paste
      handlePaste(digit, index);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Call onChange callback
    const otpString = newOtp.join('');
    onChange?.(otpString);

    // Move to next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newOtp.every(d => d !== '') && newOtp.length === length) {
      if (autoSubmit) {
        onComplete(otpString);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];

      if (otp[index]) {
        // Clear current
        newOtp[index] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
      } else if (index > 0) {
        // Move to previous and clear
        newOtp[index - 1] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }

    // Handle Enter
    if (e.key === 'Enter' && otp.every(d => d !== '')) {
      onComplete(otp.join(''));
    }
  };

  const handlePaste = (pastedData: string, startIndex: number = 0) => {
    if (disabled) return;

    const digits = pastedData.replace(/[^0-9]/g, '').split('');
    const newOtp = [...otp];

    digits.forEach((digit, i) => {
      const index = startIndex + i;
      if (index < length) {
        newOtp[index] = digit;
      }
    });

    setOtp(newOtp);
    onChange?.(newOtp.join(''));

    // Focus next empty input or last input
    const nextEmptyIndex = newOtp.findIndex(d => d === '');
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();

    // Check if complete
    if (newOtp.every(d => d !== '') && autoSubmit) {
      onComplete(newOtp.join(''));
    }
  };

  const handlePasteEvent = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    handlePaste(pastedData, index);
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    direction: theme.rtl ? 'rtl' : 'ltr',
    ...styles.container,
  };

  const inputStyle: React.CSSProperties = {
    width: '48px',
    height: '56px',
    fontSize: '24px',
    fontWeight: '600',
    textAlign: 'center',
    border: `2px solid ${error ? theme.colors.error : theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    outline: 'none',
    transition: theme.transitions.default,
    fontFamily: theme.fonts.familyMono,
    ...styles.input,
  };

  const inputFocusStyle: React.CSSProperties = {
    borderColor: error ? theme.colors.error : theme.colors.borderFocus,
    boxShadow: `0 0 0 3px ${error ? theme.colors.errorLight : theme.colors.infoLight}`,
  };

  const errorStyle: React.CSSProperties = {
    color: theme.colors.error,
    fontSize: '13px',
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    fontFamily: theme.fonts.family,
    ...styles.error,
  };

  return (
    <div className={className}>
      <div style={containerStyle}>
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otp[index]}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePasteEvent(e, index)}
            onFocus={(e) => {
              e.target.style.borderColor = error ? theme.colors.error : theme.colors.borderFocus;
              e.target.style.boxShadow = `0 0 0 3px ${error ? theme.colors.errorLight : theme.colors.infoLight}`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error ? theme.colors.error : theme.colors.border;
              e.target.style.boxShadow = 'none';
            }}
            disabled={disabled}
            style={inputStyle}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
      {error && errorMessage && (
        <div style={errorStyle} role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
