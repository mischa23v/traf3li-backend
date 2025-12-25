/**
 * MFA Setup Component
 * Set up TOTP-based two-factor authentication with QR code and backup codes
 */

import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { ComponentStyles, BackupCodes } from '../types';
import { OTPInput } from './OTPInput';
import { getButtonStyles, getErrorStyles, mergeStyles } from '../utils/styles';

export interface MFASetupProps {
  /** Callback on setup complete */
  onComplete?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Show backup codes */
  showBackupCodes?: boolean;
  /** API base URL */
  apiUrl?: string;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: ComponentStyles;
}

interface MFASetupData {
  secret: string;
  qrCode: string;
  manualEntryCode: string;
}

export const MFASetup: React.FC<MFASetupProps> = ({
  onComplete,
  onError,
  showBackupCodes = true,
  apiUrl = '/api/auth',
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();

  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr');
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<BackupCodes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  useEffect(() => {
    initializeMFA();
  }, []);

  const initializeMFA = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/mfa/totp/setup`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.messageEn || 'Failed to initialize MFA');
      }

      setSetupData({
        secret: data.secret,
        qrCode: data.qrCode,
        manualEntryCode: data.manualEntryCode || data.secret,
      });
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/mfa/totp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          totpCode: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.messageEn || 'Invalid verification code');
      }

      // Generate backup codes if needed
      if (showBackupCodes) {
        await generateBackupCodes();
        setStep('backup');
      } else {
        onComplete?.();
      }
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = async () => {
    try {
      const response = await fetch(`${apiUrl}/mfa/backup-codes/generate`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate backup codes');
      }

      setBackupCodes({
        codes: data.codes,
        remainingCodes: data.remainingCodes,
      });
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    }
  };

  const copyToClipboard = async (text: string, type: 'code' | 'backup') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedBackup(true);
        setTimeout(() => setCopiedBackup(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const containerStyle: React.CSSProperties = mergeStyles(
    {
      width: '100%',
      maxWidth: '500px',
      fontFamily: theme.fonts.family,
    },
    styles.container
  );

  const cardStyle: React.CSSProperties = {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border}`,
  };

  const qrContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  };

  const codeBoxStyle: React.CSSProperties = {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.border}`,
    fontFamily: theme.fonts.familyMono,
    fontSize: '14px',
    textAlign: 'center',
    wordBreak: 'break-all',
    position: 'relative',
  };

  const copyButtonStyle: React.CSSProperties = {
    ...getButtonStyles(theme, 'ghost', 'sm'),
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
  };

  const backupCodesGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  };

  const backupCodeItemStyle: React.CSSProperties = {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    border: `1px solid ${theme.colors.border}`,
    fontFamily: theme.fonts.familyMono,
    fontSize: '13px',
    textAlign: 'center',
  };

  const warningBoxStyle: React.CSSProperties = {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warningLight,
    border: `1px solid ${theme.colors.warning}`,
    borderRadius: theme.borderRadius.md,
    color: '#92400e',
    fontSize: '14px',
    lineHeight: '1.5',
    marginTop: theme.spacing.md,
  };

  if (loading && !setupData) {
    return (
      <div className={className} style={containerStyle}>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl }}>
          Loading...
        </div>
      </div>
    );
  }

  if (step === 'backup' && backupCodes) {
    return (
      <div className={className} style={containerStyle}>
        <h2 style={{ margin: 0, marginBottom: theme.spacing.sm, textAlign: 'center' }}>
          Save Your Backup Codes
        </h2>
        <p style={{ textAlign: 'center', color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }}>
          Store these codes in a safe place. Each code can only be used once.
        </p>

        <div style={cardStyle}>
          <div style={backupCodesGridStyle}>
            {backupCodes.codes.map((code, index) => (
              <div key={index} style={backupCodeItemStyle}>
                {code}
              </div>
            ))}
          </div>

          <button
            onClick={() => copyToClipboard(backupCodes.codes.join('\n'), 'backup')}
            style={mergeStyles(
              getButtonStyles(theme, 'outline', 'md', false, true),
              { marginTop: theme.spacing.lg }
            )}
          >
            {copiedBackup ? 'Copied!' : 'Copy All Codes'}
          </button>

          <div style={warningBoxStyle}>
            <strong>Important:</strong> These codes will only be shown once. Save them now.
          </div>

          <button
            onClick={onComplete}
            style={mergeStyles(
              getButtonStyles(theme, 'primary', 'md', false, true),
              { marginTop: theme.spacing.lg }
            )}
          >
            I've Saved My Codes
          </button>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className={className} style={containerStyle}>
        <h2 style={{ margin: 0, marginBottom: theme.spacing.sm, textAlign: 'center' }}>
          Verify Setup
        </h2>
        <p style={{ textAlign: 'center', color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }}>
          Enter the 6-digit code from your authenticator app
        </p>

        <OTPInput
          length={6}
          onComplete={handleVerify}
          autoSubmit={true}
          error={!!error}
          errorMessage={error}
          disabled={loading}
        />

        <button
          onClick={() => setStep('qr')}
          style={mergeStyles(
            getButtonStyles(theme, 'ghost', 'md', loading, true),
            { marginTop: theme.spacing.lg }
          )}
        >
          Back to QR Code
        </button>
      </div>
    );
  }

  // QR Code step
  return (
    <div className={className} style={containerStyle}>
      <h2 style={{ margin: 0, marginBottom: theme.spacing.sm, textAlign: 'center' }}>
        Set Up Two-Factor Authentication
      </h2>
      <p style={{ textAlign: 'center', color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }}>
        Scan the QR code with your authenticator app
      </p>

      <div style={cardStyle}>
        {setupData && (
          <div style={qrContainerStyle}>
            {/* QR Code */}
            <div
              style={{
                padding: theme.spacing.md,
                backgroundColor: '#ffffff',
                borderRadius: theme.borderRadius.md,
              }}
            >
              <img
                src={setupData.qrCode}
                alt="MFA QR Code"
                style={{ display: 'block', width: '200px', height: '200px' }}
              />
            </div>

            {/* Manual Entry */}
            <div style={{ width: '100%' }}>
              <p style={{ fontSize: '14px', marginBottom: theme.spacing.xs, fontWeight: '500' }}>
                Or enter this code manually:
              </p>
              <div style={codeBoxStyle}>
                {setupData.manualEntryCode}
                <button
                  onClick={() => copyToClipboard(setupData.manualEntryCode, 'code')}
                  style={copyButtonStyle}
                >
                  {copiedCode ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div style={{ fontSize: '14px', color: theme.colors.textSecondary, lineHeight: '1.6' }}>
              <p style={{ margin: 0, marginBottom: theme.spacing.sm }}>
                <strong>Step 1:</strong> Download an authenticator app like Google Authenticator or Authy
              </p>
              <p style={{ margin: 0, marginBottom: theme.spacing.sm }}>
                <strong>Step 2:</strong> Scan the QR code or enter the code manually
              </p>
              <p style={{ margin: 0 }}>
                <strong>Step 3:</strong> Enter the 6-digit code to verify
              </p>
            </div>
          </div>
        )}

        {error && <div style={getErrorStyles(theme)}>{error}</div>}

        <button
          onClick={() => setStep('verify')}
          disabled={loading}
          style={mergeStyles(
            getButtonStyles(theme, 'primary', 'md', loading, true),
            { marginTop: theme.spacing.lg }
          )}
        >
          Continue to Verification
        </button>
      </div>
    </div>
  );
};
