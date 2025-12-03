import { useState, useRef, useEffect } from 'react';

// ============================================
// SVG ICONS
// ============================================
const Icons = {
  Scale: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  EyeOff: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ),
  Phone: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  Google: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  Spinner: () => (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  CheckCircle: () => (
    <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  XCircle: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
};

// ============================================
// OTP INPUT COMPONENT
// ============================================
function OTPInput({ value, onChange, error, disabled }) {
  const inputRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, e) => {
    const val = e.target.value;
    if (val && !/^\d$/.test(val)) return;

    const newValue = value.split('');
    newValue[index] = val;
    const newOtp = newValue.join('').slice(0, 6);
    onChange(newOtp);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newValue = value.split('');
        newValue[index - 1] = '';
        onChange(newValue.join(''));
      } else {
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pastedData);
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleFocus = (index) => {
    setFocusedIndex(index);
    inputRefs.current[index]?.select();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" dir="ltr">
      {[0, 1, 2].map((index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          onBlur={() => setFocusedIndex(-1)}
          disabled={disabled}
          className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 bg-slate-50 outline-none transition-all ${
            error
              ? 'border-red-400 bg-red-50 text-red-600'
              : focusedIndex === index
                ? 'border-[#0f172a] bg-white shadow-lg shadow-slate-200/50'
                : value[index]
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-300'}`}
        />
      ))}

      <div className="w-3 h-1 bg-slate-300 rounded-full mx-1"></div>

      {[3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          onBlur={() => setFocusedIndex(-1)}
          disabled={disabled}
          className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl border-2 bg-slate-50 outline-none transition-all ${
            error
              ? 'border-red-400 bg-red-50 text-red-600'
              : focusedIndex === index
                ? 'border-[#0f172a] bg-white shadow-lg shadow-slate-200/50'
                : value[index]
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-300'}`}
        />
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function SignIn() {
  // Steps: 'login' | 'otp' | 'success'
  const [step, setStep] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  // Login form data
  const [formData, setFormData] = useState({
    usernameOrEmail: '',
    password: '',
  });

  // OTP data
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // User data after login (for display)
  const [userData, setUserData] = useState(null);

  // Countdown timer for resend
  useEffect(() => {
    if (step === 'otp' && resendTimer > 0 && !canResend) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
  }, [resendTimer, canResend, step]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    if (apiError) {
      setApiError('');
    }
  };

  // Validation
  const validateLoginForm = () => {
    const newErrors = {};

    if (!formData.usernameOrEmail.trim()) {
      newErrors.usernameOrEmail = 'الحقل مطلوب';
    }

    if (!formData.password) {
      newErrors.password = 'الحقل مطلوب';
    } else if (formData.password.length < 6) {
      newErrors.password = 'يجب أن تكون مكونة من 6 خانات على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    if (!validateLoginForm()) return;

    setIsLoading(true);
    setApiError('');

    try {
      // TODO: Replace with actual API call
      // const response = await fetch('YOUR_API_ENDPOINT/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // });
      // const data = await response.json();

      await new Promise(resolve => setTimeout(resolve, 1500));

      // TEST CREDENTIALS: test / test123 OR test@example.com / test123
      const validUsername = formData.usernameOrEmail === 'test' || formData.usernameOrEmail === 'test@example.com';
      const validPassword = formData.password === 'test123';

      if (validUsername && validPassword) {
        setUserData({
          name: 'محمد أحمد',
          phone: '05XXXXXXXX',
          email: 'test@example.com'
        });
        setStep('otp');
        setResendTimer(60);
        setCanResend(false);
      } else {
        setApiError('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (error) {
      setApiError('حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Submit
  const handleOtpSubmit = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setOtpError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }

    setIsLoading(true);
    setOtpError('');

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // TEST: "123456" is the correct OTP
      if (otp === '123456') {
        setStep('success');
      } else {
        setOtpError('رمز التحقق غير صحيح');
        setTimeout(() => setOtp(''), 500);
      }
    } catch (err) {
      setOtpError('حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResend = async () => {
    if (!canResend) return;

    setCanResend(false);
    setResendTimer(60);
    setOtp('');
    setOtpError('');

    // TODO: API call to resend OTP
    console.log('Resending OTP...');
  };

  // Handle Google Login
  const handleGoogleLogin = () => {
    // TODO: Implement Google OAuth
    console.log('Google login clicked');
  };

  // Go back to login
  const handleBackToLogin = () => {
    setStep('login');
    setOtp('');
    setOtpError('');
  };

  // ============================================
  // SUCCESS STATE
  // ============================================
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl"
        style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10">
              <div className="inline-flex items-center justify-center text-emerald-500 mb-6 animate-scaleIn">
                <Icons.CheckCircle />
              </div>

              <h1 className="text-2xl font-bold text-[#0f172a] mb-3">تم تسجيل الدخول بنجاح</h1>
              <p className="text-slate-500 mb-8">
                مرحباً بك، {userData?.name}
              </p>

              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full py-4 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 text-white font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 duration-200"
              >
                الدخول إلى لوحة التحكم
              </button>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.5); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-scaleIn { animation: scaleIn 0.5s ease-out forwards; }
        `}</style>
      </div>
    );
  }

  // ============================================
  // OTP STEP
  // ============================================
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl"
        style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0f172a] to-slate-800 text-emerald-400 mb-6 shadow-2xl">
                <Icons.Scale />
              </div>
              <h1 className="text-3xl font-bold text-[#0f172a] mb-2">التحقق من الهوية</h1>
              <p className="text-slate-500 text-lg">أدخل رمز التحقق للمتابعة</p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-6 pb-4">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/20">
                    <Icons.Phone />
                  </div>
                </div>

                {/* Info Text */}
                <div className="text-center mb-4">
                  <p className="text-slate-600 mb-1">
                    تم إرسال رمز التحقق إلى رقم الجوال
                  </p>
                  <p className="font-bold text-[#0f172a]" dir="ltr">
                    {userData?.phone}
                  </p>
                </div>
              </div>

              <form onSubmit={handleOtpSubmit} className="px-6 pb-6 space-y-5">
                {/* OTP Input */}
                <div>
                  <label className="block text-sm font-medium text-[#0f172a] mb-3 text-center">
                    رمز التحقق <span className="text-red-500">*</span>
                  </label>
                  <OTPInput
                    value={otp}
                    onChange={(val) => { setOtp(val); if (otpError) setOtpError(''); }}
                    error={!!otpError}
                    disabled={isLoading}
                  />
                  {otpError && (
                    <div className="flex items-center justify-center gap-2 mt-3 text-red-500 text-sm animate-shake">
                      <Icons.XCircle />
                      <span>{otpError}</span>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={otp.length !== 6 || isLoading}
                  className="w-full h-12 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 text-white font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 duration-200"
                >
                  {isLoading ? (
                    <>
                      <Icons.Spinner />
                      جارٍ التحقق...
                    </>
                  ) : (
                    'تأكيد'
                  )}
                </button>

                {/* Resend */}
                <div className="text-center">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
                    >
                      إعادة إرسال الرمز
                    </button>
                  ) : (
                    <p className="text-slate-500 text-sm">
                      إعادة الإرسال بعد{' '}
                      <span className="font-bold text-[#0f172a]">{resendTimer}</span>{' '}
                      ثانية
                    </p>
                  )}
                </div>
              </form>

              {/* Footer - Back Button */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-[#0f172a] font-medium text-sm transition-colors"
                >
                  <Icons.ChevronRight />
                  العودة لتسجيل الدخول
                </button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
          .animate-shake { animation: shake 0.5s ease-in-out; }
        `}</style>
      </div>
    );
  }

  // ============================================
  // LOGIN STEP
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50" dir="rtl"
      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0f172a] to-slate-800 text-emerald-400 mb-6 shadow-2xl">
              <Icons.Scale />
            </div>
            <h1 className="text-3xl font-bold text-[#0f172a] mb-2">تسجيل الدخول</h1>
            <p className="text-slate-500 text-lg">أدخل بياناتك للدخول إلى حسابك</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <form onSubmit={handleLoginSubmit} className="p-6 space-y-5">

              {/* API Error */}
              {apiError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-shake">
                  <Icons.XCircle />
                  {apiError}
                </div>
              )}

              {/* Username or Email Field */}
              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-2">
                  اسم المستخدم أو البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icons.User />
                  </div>
                  <input
                    type="text"
                    value={formData.usernameOrEmail}
                    onChange={(e) => updateField('usernameOrEmail', e.target.value)}
                    className={`w-full h-12 pr-12 pl-4 rounded-xl border bg-slate-50 text-[#0f172a] outline-none transition-all ${
                      errors.usernameOrEmail
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                        : 'border-slate-200 focus:border-[#0f172a] focus:ring-2 focus:ring-slate-200'
                    }`}
                    placeholder="أدخل اسم المستخدم أو البريد الإلكتروني"
                    dir="auto"
                    disabled={isLoading}
                  />
                </div>
                {errors.usernameOrEmail && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <Icons.XCircle />
                    {errors.usernameOrEmail}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[#0f172a]">
                    كلمة المرور <span className="text-red-500">*</span>
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                  >
                    نسيت كلمة المرور؟
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icons.Lock />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className={`w-full h-12 pr-12 pl-12 rounded-xl border bg-slate-50 text-[#0f172a] outline-none transition-all ${
                      errors.password
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                        : 'border-slate-200 focus:border-[#0f172a] focus:ring-2 focus:ring-slate-200'
                    }`}
                    placeholder="أدخل كلمة المرور"
                    dir="ltr"
                    style={{ textAlign: 'left' }}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <Icons.XCircle />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 text-white font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 duration-200"
              >
                {isLoading ? (
                  <>
                    <Icons.Spinner />
                    جارٍ تسجيل الدخول...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-4 text-slate-400 font-medium">أو</span>
                </div>
              </div>

              {/* Google Login */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full h-12 rounded-xl border-2 border-slate-200 bg-white text-[#0f172a] font-medium hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-md"
              >
                <Icons.Google />
                المتابعة باستخدام Google
              </button>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
              <p className="text-center text-sm text-slate-500">
                بتسجيل الدخول، أنت توافق على{' '}
                <a href="/terms" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  الشروط والأحكام
                </a>{' '}
                و{' '}
                <a href="/privacy" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  سياسة الخصوصية
                </a>
              </p>
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-slate-500 mt-6">
            ليس لديك حساب؟{' '}
            <a href="/sign-up" className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors">
              إنشاء حساب جديد
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
