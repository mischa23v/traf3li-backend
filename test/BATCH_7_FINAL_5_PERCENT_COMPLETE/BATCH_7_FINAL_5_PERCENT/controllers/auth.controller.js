const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const {
  generateTokens,
  setTokenCookies,
  clearTokenCookies,
  verifyRefreshToken,
  extractRefreshToken,
} = require('../utils/generateToken');

// Register user
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, role, phone, nationalId, licenseNumber } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال جميع الحقول المطلوبة',
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'البريد الإلكتروني مسجل بالفعل',
      });
    }

    // Validate role
    if (role && !['client', 'lawyer', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'نوع الحساب غير صحيح',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      role: role || 'client',
      phone,
      nationalId,
      licenseNumber: role === 'lawyer' ? licenseNumber : undefined,
    });

    await user.save();

    // Generate tokens
    const tokens = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Set cookies
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل إنشاء الحساب',
      error: error.message,
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور',
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'تم تعليق حسابك. يرجى التواصل مع الدعم.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      });
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Set cookies
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل تسجيل الدخول',
      error: error.message,
    });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    // Clear cookies
    clearTokenCookies(res);

    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل تسجيل الخروج',
      error: error.message,
    });
  }
};

// Refresh access token
exports.refreshToken = async (req, res) => {
  try {
    // Extract refresh token
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found. Please login again.',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      clearTokenCookies(res);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please login again.',
      });
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || user.isBanned) {
      clearTokenCookies(res);
      return res.status(401).json({
        success: false,
        message: 'User not found or banned. Please login again.',
      });
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Set new cookies
    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    clearTokenCookies(res);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message,
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'الرجاء إدخال كلمة المرور الحالية والجديدة',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      });
    }

    const user = await User.findById(req.user._id);

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة',
      });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل تغيير كلمة المرور',
      error: error.message,
    });
  }
};

// Forgot password (send reset email)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط إعادة تعيين كلمة المرور',
      });
    }

    // Generate reset token (implement email sending with SendGrid)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    // await sendEmail(user.email, 'إعادة تعيين كلمة المرور', resetUrl);

    res.json({
      success: true,
      message: 'تم إرسال رابط إعادة تعيين كلمة المرور',
      // In development, return token
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل إرسال رابط إعادة التعيين',
      error: error.message,
    });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'الرابط غير صالح أو منتهي الصلاحية',
      });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'تم إعادة تعيين كلمة المرور بنجاح',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل إعادة تعيين كلمة المرور',
      error: error.message,
    });
  }
};

module.exports = exports;
