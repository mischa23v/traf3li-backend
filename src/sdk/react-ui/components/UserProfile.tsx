/**
 * User Profile Component
 * Display and edit user profile information
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { User, ComponentStyles } from '../types';
import { getButtonStyles, getInputStyles, getLabelStyles, getErrorStyles, mergeStyles } from '../utils/styles';

export interface UserProfileProps {
  /** Editable fields */
  editableFields?: ('firstName' | 'lastName' | 'phone' | 'avatar' | 'username')[];
  /** Show password change link */
  showPasswordChange?: boolean;
  /** Show MFA settings link */
  showMFASettings?: boolean;
  /** Show sessions link */
  showSessionsLink?: boolean;
  /** Callback on profile update */
  onUpdate?: (user: User) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** API base URL */
  apiUrl?: string;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  styles?: ComponentStyles;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  editableFields = ['firstName', 'lastName', 'phone', 'avatar'],
  showPasswordChange = true,
  showMFASettings = true,
  showSessionsLink = true,
  onUpdate,
  onError,
  apiUrl = '/api/auth',
  className = '',
  styles = {},
}) => {
  const { theme } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    avatar: '',
    username: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/me`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch user profile');
      }

      setUser(data.data);
      setFormData({
        firstName: data.data.firstName || '',
        lastName: data.data.lastName || '',
        phone: data.data.phone || '',
        avatar: data.data.avatar || '',
        username: data.data.username || '',
      });
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Build update payload with only editable fields
      const updatePayload: any = {};
      editableFields.forEach((field) => {
        if (formData[field] !== undefined) {
          updatePayload[field] = formData[field];
        }
      });

      const response = await fetch(`${apiUrl}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.messageEn || 'Failed to update profile');
      }

      setUser(data.data);
      setSuccess(true);
      setEditing(false);
      onUpdate?.(data.data);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const containerStyle: React.CSSProperties = mergeStyles(
    {
      width: '100%',
      maxWidth: '600px',
      fontFamily: theme.fonts.family,
    },
    styles.container
  );

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border}`,
    padding: theme.spacing.xl,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  };

  const avatarStyle: React.CSSProperties = {
    width: '80px',
    height: '80px',
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: theme.spacing.lg,
  };

  const inputGroupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.md,
  };

  const readOnlyStyle: React.CSSProperties = {
    fontSize: '15px',
    color: theme.colors.text,
  };

  const linkButtonStyle: React.CSSProperties = {
    ...getButtonStyles(theme, 'ghost', 'md'),
    justifyContent: 'flex-start',
    marginTop: theme.spacing.sm,
  };

  const successMessageStyle: React.CSSProperties = {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.successLight,
    color: theme.colors.success,
    fontSize: '14px',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  };

  const dividerStyle: React.CSSProperties = {
    height: '1px',
    backgroundColor: theme.colors.border,
    margin: `${theme.spacing.lg} 0`,
  };

  if (loading && !user) {
    return (
      <div className={className} style={containerStyle}>
        <div style={{ textAlign: 'center', padding: theme.spacing.xl }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className={className} style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0 }}>Profile Settings</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={getButtonStyles(theme, 'outline', 'sm')}
            >
              Edit Profile
            </button>
          )}
        </div>

        {success && (
          <div style={successMessageStyle}>
            Profile updated successfully!
          </div>
        )}

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={avatarStyle}>
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
            ) : (
              getInitials()
            )}
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit}>
            <div style={gridStyle}>
              {editableFields.includes('firstName') && (
                <div style={inputGroupStyle}>
                  <label style={getLabelStyles(theme)}>First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    disabled={loading}
                    style={mergeStyles(getInputStyles(theme), styles.input)}
                  />
                </div>
              )}

              {editableFields.includes('lastName') && (
                <div style={inputGroupStyle}>
                  <label style={getLabelStyles(theme)}>Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    disabled={loading}
                    style={mergeStyles(getInputStyles(theme), styles.input)}
                  />
                </div>
              )}
            </div>

            {editableFields.includes('username') && (
              <div style={inputGroupStyle}>
                <label style={getLabelStyles(theme)}>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  disabled={loading}
                  style={mergeStyles(getInputStyles(theme), styles.input)}
                />
              </div>
            )}

            <div style={inputGroupStyle}>
              <label style={getLabelStyles(theme)}>Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                style={mergeStyles(getInputStyles(theme, false, true), styles.input)}
              />
              <small style={{ color: theme.colors.textSecondary, fontSize: '13px' }}>
                Email cannot be changed
              </small>
            </div>

            {editableFields.includes('phone') && (
              <div style={inputGroupStyle}>
                <label style={getLabelStyles(theme)}>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={loading}
                  style={mergeStyles(getInputStyles(theme), styles.input)}
                />
              </div>
            )}

            {editableFields.includes('avatar') && (
              <div style={inputGroupStyle}>
                <label style={getLabelStyles(theme)}>Avatar URL</label>
                <input
                  type="url"
                  value={formData.avatar}
                  onChange={(e) => handleChange('avatar', e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  disabled={loading}
                  style={mergeStyles(getInputStyles(theme), styles.input)}
                />
              </div>
            )}

            {error && <div style={getErrorStyles(theme)}>{error}</div>}

            <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
              <button
                type="submit"
                disabled={loading}
                style={mergeStyles(getButtonStyles(theme, 'primary', 'md', loading), { flex: 1 })}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError('');
                  // Reset form data
                  setFormData({
                    firstName: user.firstName || '',
                    lastName: user.lastName || '',
                    phone: user.phone || '',
                    avatar: user.avatar || '',
                    username: user.username || '',
                  });
                }}
                disabled={loading}
                style={mergeStyles(getButtonStyles(theme, 'outline', 'md', loading), { flex: 1 })}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div style={inputGroupStyle}>
              <label style={getLabelStyles(theme)}>Name</label>
              <div style={readOnlyStyle}>
                {user.firstName} {user.lastName}
              </div>
            </div>

            {user.username && (
              <div style={inputGroupStyle}>
                <label style={getLabelStyles(theme)}>Username</label>
                <div style={readOnlyStyle}>{user.username}</div>
              </div>
            )}

            <div style={inputGroupStyle}>
              <label style={getLabelStyles(theme)}>Email</label>
              <div style={readOnlyStyle}>{user.email}</div>
            </div>

            {user.phone && (
              <div style={inputGroupStyle}>
                <label style={getLabelStyles(theme)}>Phone</label>
                <div style={readOnlyStyle}>{user.phone}</div>
              </div>
            )}

            <div style={dividerStyle} />

            {/* Security Settings */}
            <h3 style={{ marginTop: 0, marginBottom: theme.spacing.md }}>Security</h3>

            {showPasswordChange && (
              <button
                onClick={() => window.location.href = '/change-password'}
                style={linkButtonStyle}
              >
                Change Password
              </button>
            )}

            {showMFASettings && (
              <button
                onClick={() => window.location.href = '/mfa-settings'}
                style={linkButtonStyle}
              >
                Two-Factor Authentication {user.isMfaEnabled && '(Enabled)'}
              </button>
            )}

            {showSessionsLink && (
              <button
                onClick={() => window.location.href = '/sessions'}
                style={linkButtonStyle}
              >
                Manage Sessions
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
