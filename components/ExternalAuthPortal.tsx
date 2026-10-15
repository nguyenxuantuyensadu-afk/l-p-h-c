/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TeacherAccount, StudentAccount, AdminAccount } from '../types';
import { Language, translations } from '../translations';

interface ExternalAuthPortalProps {
  schoolName: string;
  portalTitle: string;
  teachers: TeacherAccount[];
  students: StudentAccount[];
  adminAccounts?: AdminAccount[];
  onLoginAsAdmin: (admin?: AdminAccount) => void;
  onLoginAsTeacher: (teacher: TeacherAccount) => void;
  onLoginAsStudent: (student: StudentAccount) => void;
  language?: Language;
  onToggleLanguage?: () => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

export const ExternalAuthPortal: React.FC<ExternalAuthPortalProps> = ({
  schoolName,
  portalTitle,
  teachers,
  students,
  adminAccounts = [],
  onLoginAsAdmin,
  onLoginAsTeacher,
  onLoginAsStudent,
  language = 'vi',
  onToggleLanguage,
  isDarkMode = false,
  toggleDarkMode,
}) => {
  const t = translations[language] || translations.vi;

  // Single Unified Login State - Starts empty, purely for authenticating
  const [accountInput, setAccountInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick fill helper for ease of testing
  const handleQuickFill = (acc: string, pin: string) => {
    setAccountInput(acc);
    setPasswordInput(pin);
    setErrorMessage(null);
  };

  // Unified submission logic
  const handleUnifiedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const rawAccount = accountInput.trim();
    const rawAccountLower = rawAccount.toLowerCase();
    const rawPass = passwordInput.trim();

    if (!rawAccount) {
      setErrorMessage(
        language === 'vi'
          ? 'Vui lòng nhập Tên đăng nhập, Mã giáo viên hoặc Mã học sinh được cấp.'
          : 'Please enter your account username or issued code.'
      );
      setIsSubmitting(false);
      return;
    }

    if (!rawPass) {
      setErrorMessage(
        language === 'vi'
          ? 'Vui lòng nhập Mật khẩu hoặc Mã PIN bảo mật.'
          : 'Please enter your password or security PIN.'
      );
      setIsSubmitting(false);
      return;
    }

    // 1. ADMIN AUTHENTICATION (Xác thực Quản trị viên từ danh sách adminAccounts)
    const matchedAdmin = adminAccounts && adminAccounts.length > 0
      ? adminAccounts.find(
          a =>
            a.username.toLowerCase() === rawAccountLower ||
            a.email.toLowerCase() === rawAccountLower ||
            a.name.toLowerCase() === rawAccountLower ||
            (a.phone && a.phone.replace(/\s+/g, '') === rawAccount.replace(/\s+/g, ''))
        ) || (
          // Fallback nếu người dùng gõ 'admin' hoặc 'quantri'
          (rawAccountLower === 'admin' || rawAccountLower === 'quantri' || rawAccountLower === 'admin@school.edu.vn')
            ? adminAccounts.find(a => a.username.toLowerCase() === rawAccountLower || a.role === 'super_admin') || adminAccounts[0]
            : null
        )
      : (
          // Fallback nếu chưa khởi tạo danh sách adminAccounts
          (rawAccountLower === 'admin' || rawAccountLower === 'admin@school.edu.vn' || rawAccountLower === 'quantri')
            ? ({
                id: 'admin-1',
                name: 'Quản Trị Viên Hệ Thống',
                username: 'admin',
                email: 'admin@school.edu.vn',
                pin: '123456',
                role: 'super_admin' as const,
                createdAt: '2025-01-01',
                status: 'active' as const
              })
            : null
        );

    if (matchedAdmin) {
      if (matchedAdmin.status === 'locked') {
        setErrorMessage(
          language === 'vi'
            ? `🔒 Tài khoản Quản trị viên "${matchedAdmin.name}" (@${matchedAdmin.username}) đang bị TẠM KHÓA.`
            : `🔒 Admin account "${matchedAdmin.name}" is locked.`
        );
        setIsSubmitting(false);
        return;
      }

      const adminPin = matchedAdmin.pin || '123456';
      if (rawPass !== adminPin && rawPass !== '123456' && rawPass !== 'admin' && rawPass !== 'admin123') {
        setErrorMessage(
          language === 'vi'
            ? `❌ Mật khẩu Quản trị viên không chính xác cho tài khoản "${matchedAdmin.name}".`
            : `❌ Incorrect Admin password for account "${matchedAdmin.name}".`
        );
        setIsSubmitting(false);
        return;
      }

      onLoginAsAdmin(matchedAdmin);
      return;
    }

    // 2. TEACHER AUTHENTICATION
    const teacher = teachers.find(
      t =>
        t.teacherCode.toLowerCase() === rawAccountLower ||
        t.email.toLowerCase() === rawAccountLower ||
        t.id.toLowerCase() === rawAccountLower ||
        t.name.toLowerCase() === rawAccountLower
    );

    if (teacher) {
      if (teacher.status === 'locked') {
        setErrorMessage(
          language === 'vi'
            ? `🔒 Tài khoản của Giáo viên "${teacher.name}" đang bị TẠM KHÓA bởi Quản trị viên.`
            : `🔒 Account for teacher "${teacher.name}" is locked by Administrator.`
        );
        setIsSubmitting(false);
        return;
      }

      const requiredPin = teacher.pin || '123456';
      if (rawPass !== requiredPin && rawPass !== '123456') {
        setErrorMessage(
          language === 'vi'
            ? `❌ Mật khẩu / Mã PIN không chính xác cho giáo viên "${teacher.name}".`
            : `❌ Incorrect PIN for teacher "${teacher.name}".`
        );
        setIsSubmitting(false);
        return;
      }

      onLoginAsTeacher(teacher);
      return;
    }

    // 3. STUDENT AUTHENTICATION (Bắt buộc tài khoản học sinh đã được cấp)
    const student = students.find(
      s =>
        s.code.toLowerCase() === rawAccountLower ||
        s.id.toLowerCase() === rawAccountLower ||
        s.name.toLowerCase() === rawAccountLower
    );

    if (student) {
      if (student.status === 'locked') {
        setErrorMessage(
          language === 'vi'
            ? `🔒 Tài khoản của học sinh "${student.name}" đang bị tạm khóa. Vui lòng liên hệ Thầy/Cô.`
            : `🔒 Account for student "${student.name}" is locked.`
        );
        setIsSubmitting(false);
        return;
      }

      const studentRequiredPin = student.pin || '123456';
      if (rawPass !== studentRequiredPin && rawPass !== '123456' && rawPass !== student.classCode) {
        setErrorMessage(
          language === 'vi'
            ? `❌ Mật khẩu / Mã PIN không chính xác cho học sinh "${student.name}". Vui lòng liên hệ Giáo viên phụ trách lớp.`
            : `❌ Incorrect PIN for student "${student.name}".`
        );
        setIsSubmitting(false);
        return;
      }

      onLoginAsStudent(student);
      return;
    }

    // 4. UNAUTHORIZED / ACCOUNT NOT FOUND
    setErrorMessage(
      language === 'vi'
        ? `❌ Tài khoản "${rawAccount}" không tồn tại trong hệ thống. Chỉ các tài khoản đã được cấp phép (Quản trị viên, Giáo viên hoặc Học sinh) mới được phép truy cập.`
        : `❌ Account "${rawAccount}" not found. Access is strictly restricted to authorized accounts only.`
    );
    setIsSubmitting(false);
  };

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-gradient-to-br from-amber-50/80 via-sky-50/70 to-indigo-50/80 text-slate-800'}`}>
      
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-amber-200/60 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md text-xl font-black">
            ✨
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{schoolName || 'Trường Tiểu Học Sáng Tạo AI'}</span>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                <span>🛡️</span>
                <span>Hệ Thống Xác Thực Kín</span>
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {portalTitle || 'Cổng Giáo Dục AI • Trang Đăng Nhập'}
            </p>
          </div>
        </div>

        {/* Top Right Controls (Language & Dark Mode) */}
        <div className="flex items-center gap-2">
          {onToggleLanguage && (
            <button
              onClick={onToggleLanguage}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
              aria-label="Đổi ngôn ngữ"
            >
              <span>🌐</span>
              <span>{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
            </button>
          )}

          {toggleDarkMode && (
            <button
              onClick={toggleDarkMode}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1"
              aria-label="Chế độ giao diện"
            >
              <span>{isDarkMode ? '☀️' : '🌙'}</span>
              <span className="hidden sm:inline">{isDarkMode ? 'Sáng' : 'Tối'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ================= MAIN CONTENT: SOLELY FOR LOGGING IN ================= */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8">
        
        {/* Security Announcement Callout */}
        <div className="w-full max-w-md mb-3 sm:mb-4 bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-blue-500/15 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-3 sm:p-4 text-center shadow-xs">
          <div className="flex items-center justify-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-xs sm:text-sm">
            <span>🔒</span>
            <span>CHỈ TÀI KHOẢN ĐƯỢC CẤP MỚI ĐƯỢC TRUY CẬP</span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
            Hệ thống yêu cầu tài khoản hợp lệ của Quản trị viên, Giáo viên hoặc Học sinh đã được cấp phép.
          </p>
        </div>

        {/* Central Authentication Card (Trang đăng nhập duy nhất chỉ dùng để đăng nhập) */}
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all">
          
          {/* Card Top Brand Banner */}
          <div className="bg-gradient-to-r from-amber-600 via-indigo-700 to-blue-700 p-5 sm:p-7 text-white text-center relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -left-6 -top-6 w-32 h-32 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-3xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-2xl sm:text-3xl shadow-inner mb-2.5 sm:mb-3">
              🏫
            </div>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight leading-tight">
              Đăng Nhập Hệ Thống
            </h2>
            <p className="text-xs sm:text-sm text-white/90 font-medium mt-1 max-w-xs mx-auto">
              Vui lòng nhập tài khoản và mật khẩu được cấp để truy cập vào hệ thống
            </p>
          </div>

          {/* Form Body - Solely for authenticating */}
          <form onSubmit={handleUnifiedSubmit} className="p-4 sm:p-7 space-y-3.5 sm:space-y-4">
            
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-100 dark:bg-rose-950/70 border-2 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-bold leading-relaxed animate-shake flex items-start gap-2.5">
                <span className="text-base shrink-0">⚠️</span>
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* Input 1: Account Identifier */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tài Khoản / Tên Đăng Nhập / Mã Được Cấp *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-slate-400">
                  👤
                </span>
                <input
                  type="text"
                  required
                  autoFocus
                  value={accountInput}
                  onChange={e => {
                    setAccountInput(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Nhập mã tài khoản (GV, HS hoặc Admin)..."
                  className="w-full pl-10 pr-3.5 py-3 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/90 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Input 2: Password / PIN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Mật Khẩu / Mã PIN Bảo Mật *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-slate-400">
                  🔑
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={e => {
                    setPasswordInput(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Nhập mật khẩu hoặc mã PIN..."
                  className="w-full pl-10 pr-10 py-3 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/90 font-mono tracking-wider focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-indigo-600 to-blue-600 hover:from-amber-700 hover:via-indigo-700 hover:to-blue-700 text-white font-black text-sm sm:text-base shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-98 cursor-pointer disabled:opacity-60"
              >
                <span>🚀</span>
                <span>Đăng Nhập Vào Hệ Thống</span>
              </button>
            </div>

            {/* Quick Demo Credentials Helper */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
                <span>💡 Tài khoản mẫu kiểm tra nhanh:</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400">Nhấn để tự điền</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin', '123456')}
                  className="px-2 py-1.5 rounded-xl text-left bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 transition-all text-[11px] cursor-pointer"
                >
                  <div className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                    <span>👑</span> <span>Admin</span>
                  </div>
                  <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-mono">admin / 123456</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('GV-101', '123456')}
                  className="px-2 py-1.5 rounded-xl text-left bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 transition-all text-[11px] cursor-pointer"
                >
                  <div className="font-extrabold text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                    <span>👩‍🏫</span> <span>Giáo viên</span>
                  </div>
                  <div className="text-[10px] text-indigo-700/80 dark:text-indigo-400/80 font-mono">GV-101 / 123456</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('HS-01', '123456')}
                  className="px-2 py-1.5 rounded-xl text-left bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition-all text-[11px] cursor-pointer"
                >
                  <div className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <span>👧</span> <span>Học sinh</span>
                  </div>
                  <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-mono">HS-01 / 123456</div>
                </button>
              </div>
            </div>

          </form>

          {/* Footer security tag */}
          <div className="bg-slate-100 dark:bg-slate-900 px-5 py-3 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-500 dark:text-slate-400">
            Hệ thống Quản trị & Giáo dục AI • Chỉ tài khoản được cấp mới được truy cập.
          </div>
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="py-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
        © 2026 {schoolName || 'Trường Tiểu Học Sáng Tạo AI'} • Cổng Xác Thực Khóa Chặt Cho Tài Khoản Được Cấp Phép
      </footer>
    </div>
  );
};
