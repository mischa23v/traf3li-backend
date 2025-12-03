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
  Mail: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  MailBig: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  LockBig: () => (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
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
  ChevronLeft: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
export default function ForgotPassword() {
  // Steps: 'email' | 'otp' | 'newPassword' | 'success'
  const [step, setStep] = useState('email');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  // Email step
  const [email, setEmail] = useState('');

  // OTP step
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // New password step
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (step === 'otp' && resendTimer > 0 && !canResend) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
  }, [resendTimer, canResend, step]);

  // Validation
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Handle Email Submit
  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'الحقل مطلوب';
    } else if (!validateEmail(email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate: any valid email format works
      setStep('otp');
      setResendTimer(60);
      setCanResend(false);
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
        setStep('newPassword');
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

  // Handle New Password Submit
  const handleNewPasswordSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!newPassword) {
      newErrors.newPassword = 'الحقل مطلوب';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'يجب أن تكون مكونة من 8 خانات على الأقل';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'الحقل مطلوب';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'كلمة المرور غير متطابقة';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep('success');
    } catch (error) {
      setApiError('حدث خطأ، يرجى المحاولة مرة أخرى');
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

              <h1 className="text-2xl font-bold text-[#0f172a] mb-3">تم تغيير كلمة المرور بنجاح</h1>
              <p className="text-slate-500 mb-8">
                يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة
              </p>

              <button
                onClick={() => window.location.href = '/sign-in'}
                className="w-full py-4 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 text-white font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 duration-200"
              >
                تسجيل الدخول
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
  // NEW PASSWORD STEP
  // ============================================
  if (step === 'newPassword') {
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
              <h1 className="text-3xl font-bold text-[#0f172a] mb-2">كلمة المرور الجديدة</h1>
              <p className="text-slate-500 text-lg">أدخل كلمة المرور الجديدة لحسابك</p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/20">
                    <Icons.LockBig />
                  </div>
                </div>
              </div>

              <form onSubmit={handleNewPasswordSubmit} className="px-6 pb-6 space-y-5">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-[#0f172a] mb-2">
                    كلمة المرور الجديدة <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icons.Lock />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errors.newPassword) setErrors({ ...errors, newPassword: null });
                      }}
                      className={`w-full h-12 pr-12 pl-12 rounded-xl border bg-slate-50 text-[#0f172a] outline-none transition-all ${
                        errors.newPassword
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-slate-200 focus:border-[#0f172a] focus:ring-2 focus:ring-slate-200'
                      }`}
                      placeholder="أدخل كلمة المرور الجديدة"
                      dir="ltr"
                      style={{ textAlign: 'left' }}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showNewPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-[#0f172a] mb-2">
                    تأكيد كلمة المرور <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icons.Lock />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                      }}
                      className={`w-full h-12 pr-12 pl-12 rounded-xl border bg-slate-50 text-[#0f172a] outline-none transition-all ${
                        errors.confirmPassword
                          ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-slate-200 focus:border-[#0f172a] focus:ring-2 focus:ring-slate-200'
                      }`}
                      placeholder="أعد إدخال كلمة المرور"
                      dir="ltr"
                      style={{ textAlign: 'left' }}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
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
                      جارٍ الحفظ...
                    </>
                  ) : (
                    'حفظ كلمة المرور'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
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
              <h1 className="text-3xl font-bold text-[#0f172a] mb-2">التحقق من البريد الإلكتروني</h1>
              <p className="text-slate-500 text-lg">أدخل رمز التحقق للمتابعة</p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-6 pb-4">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/20">
                    <Icons.MailBig />
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="text-slate-600 mb-1">
                    تم إرسال رمز التحقق إلى
                  </p>
                  <p className="font-bold text-[#0f172a]" dir="ltr">
                    {email}
                  </p>
                </div>
              </div>

              <form onSubmit={handleOtpSubmit} className="px-6 pb-6 space-y-5">
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

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setOtpError(''); }}
                  className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-[#0f172a] font-medium text-sm transition-colors"
                >
                  <Icons.ChevronRight />
                  تغيير البريد الإلكتروني
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
  // EMAIL STEP
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
            <h1 className="text-3xl font-bold text-[#0f172a] mb-2">نسيت كلمة المرور؟</h1>
            <p className="text-slate-500 text-lg">أدخل بريدك الإلكتروني لاستعادة حسابك</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <form onSubmit={handleEmailSubmit} className="p-6 space-y-5">

              {apiError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-shake">
                  <Icons.XCircle />
                  {apiError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#0f172a] mb-2">
                  البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icons.Mail />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: null });
                      if (apiError) setApiError('');
                    }}
                    className={`w-full h-12 pr-12 pl-4 rounded-xl border bg-slate-50 text-[#0f172a] outline-none transition-all ${
                      errors.email
                        ? 'border-red-400 focus:ring-2 focus:ring-red-200'
                        : 'border-slate-200 focus:border-[#0f172a] focus:ring-2 focus:ring-slate-200'
                    }`}
                    placeholder="أدخل البريد الإلكتروني"
                    dir="ltr"
                    style={{ textAlign: 'left' }}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-l from-emerald-500 to-emerald-600 text-white font-bold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 duration-200"
              >
                {isLoading ? (
                  <>
                    <Icons.Spinner />
                    جارٍ الإرسال...
                  </>
                ) : (
                  <>
                    إرسال رمز التحقق
                    <Icons.ChevronLeft />
                  </>
                )}
              </button>
            </form>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
              <p className="text-center text-sm text-slate-500">
                تذكرت كلمة المرور؟{' '}
                <a href="/sign-in" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  تسجيل الدخول
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
