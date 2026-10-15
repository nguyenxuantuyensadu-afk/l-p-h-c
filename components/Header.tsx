
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { Tooltip } from './Tooltip';
import { Language, translations } from '../translations';
import { Mode } from '../types';

interface HeaderProps {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    onShowInfo: () => void;
    isLoading: boolean;
    mode: Mode;
    language: Language;
    onToggleLanguage: () => void;
    onOpenClassroom?: () => void;
    userRole?: 'admin' | 'teacher' | 'student';
    isAdminAccount?: boolean;
    teacherName?: string;
    studentName?: string;
    schoolName?: string;
    onOpenStudentAccounts?: () => void;
    onOpenAdminDashboard?: () => void;
    onToggleRole?: () => void;
    onSelectRole?: (role: 'admin' | 'teacher' | 'student') => void;
    onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    isDarkMode, 
    toggleDarkMode, 
    onShowInfo,
    isLoading,
    mode,
    language,
    onToggleLanguage,
    onOpenClassroom,
    userRole = 'teacher',
    isAdminAccount = false,
    teacherName = 'Cô Hoàng Mai',
    studentName = 'Bé Bảo Châu',
    schoolName = 'Trường Tiểu Học Sáng Tạo AI',
    onOpenStudentAccounts,
    onOpenAdminDashboard,
    onToggleRole,
    onSelectRole,
    onLogout
}) => {
  const t = translations[language] || translations.vi;
  const [showRoleMenu, setShowRoleMenu] = React.useState(false);
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const roleMenuRef = React.useRef<HTMLDivElement>(null);
  const mobileMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    if (showRoleMenu || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRoleMenu, showMobileMenu]);

  return (
    <header className="bg-white dark:bg-gray-850 py-2 px-2.5 sm:px-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200 relative z-[100] gap-1.5 sm:gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-tr from-amber-500 via-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-sm font-bold text-sm">
          ✨
        </div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-base md:text-lg font-bold text-gray-800 dark:text-gray-100 tracking-tight truncate flex items-center gap-2">
            <span className="truncate">{t.appTitle}</span>
            {schoolName && (
              <span className="hidden xl:inline text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                🏫 {schoolName}
              </span>
            )}
          </h1>
        </div>

        {/* Current Active Account Role Badge (Desktop) */}
        <div className="hidden lg:flex items-center gap-1 ml-1 shrink-0">
          {userRole === 'admin' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-100 to-amber-200 text-amber-950 border border-amber-400 dark:from-amber-950/80 dark:to-amber-900/60 dark:text-amber-200 shadow-sm">
              <span>👑</span>
              <span>Quản trị viên (Admin)</span>
            </span>
          ) : userRole === 'teacher' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-200">
              <span>👨‍🏫</span>
              <span>GV: {teacherName}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-pink-100 text-pink-900 border border-pink-300 dark:bg-pink-900/40 dark:text-pink-200">
              <span>👧</span>
              <span>HS: {studentName}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        
        {/* Admin Dashboard Trigger (Admin only) */}
        {userRole === 'admin' && onOpenAdminDashboard && (
          <Tooltip content="Mở Bảng Quản Trị: Cấp & Xóa tài khoản Admin, Giáo viên, Học sinh • Quản lý web" position="bottom-right">
            <button
              onClick={onOpenAdminDashboard}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-amber-950 dark:text-amber-100 bg-gradient-to-r from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500 dark:from-amber-700 dark:to-amber-800 text-xs sm:text-sm font-black transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 border border-amber-500 shadow-md hover:scale-105 active:scale-95"
              aria-label="Quản lý Web & Tài Khoản"
            >
              <span className="text-base">👑</span>
              <span className="tracking-tight">Bảng Quản Trị Admin</span>
            </button>
          </Tooltip>
        )}

        {/* Manage & Issue Student Accounts Button (Teacher only) */}
        {userRole === 'teacher' && onOpenStudentAccounts && (
          <Tooltip content="Cấp tài khoản & mã vào lớp cho học sinh" position="bottom-right">
            <button
              onClick={onOpenStudentAccounts}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-emerald-900 dark:text-emerald-100 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-900/80 text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-emerald-300 dark:border-emerald-600 shadow-sm hover:scale-105 active:scale-95"
              aria-label="Cấp tài khoản học sinh"
            >
              <span className="text-base">👥</span>
              <span className="font-bold tracking-tight hidden sm:inline">Cấp tài khoản học sinh</span>
            </button>
          </Tooltip>
        )}

        {/* Role Switcher Menu (Retained SOLELY for Admin) */}
        {isAdminAccount ? (
          <div className="relative" ref={roleMenuRef}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-amber-950 dark:text-amber-100 bg-gradient-to-r from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 dark:from-amber-950/80 dark:to-amber-900/60 text-xs sm:text-sm font-black transition-all border border-amber-400 dark:border-amber-700 shadow-sm"
              aria-label="Chuyển đổi vai trò tài khoản (Quyền Admin)"
              title="Quyền Admin: Chuyển đổi giữa các giao diện tài khoản"
            >
              <span className="text-base">
                {userRole === 'admin' ? '👑' : userRole === 'teacher' ? '👨‍🏫' : '👧'}
              </span>
              <span className="font-black capitalize">
                {userRole === 'admin' ? 'Admin' : userRole === 'teacher' ? 'Giáo viên' : 'Học sinh'}
              </span>
              <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">▼</span>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-[200] animate-fade-in text-left">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700 mb-1 flex items-center justify-between">
                  <span>Chuyển Đổi Quyền (Admin)</span>
                  <span className="text-amber-600 font-black">👑</span>
                </div>

                {/* Option 1: Admin */}
                <button
                  onClick={() => {
                    onSelectRole?.('admin');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-3 py-2 flex items-center gap-2.5 text-xs font-bold transition-colors ${
                    userRole === 'admin' 
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span className="text-lg">👑</span>
                  <div className="flex-1">
                    <div className="font-black text-amber-800 dark:text-amber-300">Quản Trị Viên (Admin)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Cấp & Xóa tài khoản Admin, GV & Web</div>
                  </div>
                  {userRole === 'admin' && <span className="text-amber-600">✓</span>}
                </button>

                {/* Option 2: Teacher */}
                <button
                  onClick={() => {
                    onSelectRole?.('teacher');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-3 py-2 flex items-center gap-2.5 text-xs font-bold transition-colors ${
                    userRole === 'teacher' 
                      ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span className="text-lg">👨‍🏫</span>
                  <div className="flex-1">
                    <div className="font-black text-blue-800 dark:text-blue-300">Giáo Viên (Teacher)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Tạo ảnh, soạn bài & chiếu lớp</div>
                  </div>
                  {userRole === 'teacher' && <span className="text-blue-600">✓</span>}
                </button>

                {/* Option 3: Student */}
                <button
                  onClick={() => {
                    onSelectRole?.('student');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-3 py-2 flex items-center gap-2.5 text-xs font-bold transition-colors ${
                    userRole === 'student' 
                      ? 'bg-pink-100 dark:bg-pink-950/60 text-pink-900 dark:text-pink-200' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <span className="text-lg">👧</span>
                  <div className="flex-1">
                    <div className="font-black text-pink-800 dark:text-pink-300">Học Sinh (Student)</div>
                    <div className="text-[10px] text-slate-400 font-normal">Xem màn chiếu & trả lời câu hỏi</div>
                  </div>
                  {userRole === 'student' && <span className="text-pink-600">✓</span>}
                </button>

                {/* Logout Option in Role Menu */}
                {onLogout && (
                  <div className="border-t border-slate-100 dark:border-slate-700 my-1 pt-1">
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    >
                      <span className="text-base">🚪</span>
                      <div className="flex-1">
                        <div className="font-bold">Đăng Xuất Khỏi Hệ Thống</div>
                        <div className="text-[10px] text-slate-400 font-normal">Thoát phiên làm việc hiện tại</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* For Teacher: Display clear teacher account badge without any role switching menu */
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-blue-900 dark:text-blue-100 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs sm:text-sm font-bold shadow-xs">
            <span className="text-base">👨‍🏫</span>
            <span className="font-extrabold tracking-tight truncate max-w-[120px] sm:max-w-none">
              GV: {teacherName}
            </span>
          </div>
        )}

        {/* Quick Header Logout Button (Desktop) */}
        {onLogout && (
          <Tooltip content="Đăng xuất khỏi hệ thống" position="bottom-right" className="hidden sm:inline-block">
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm font-bold transition-all shadow-xs hover:scale-105 active:scale-95 min-h-[38px]"
              aria-label="Đăng xuất"
            >
              <span className="text-base">🚪</span>
              <span className="font-bold tracking-tight hidden md:inline">Đăng xuất</span>
            </button>
          </Tooltip>
        )}

        {/* Online Classroom Button in Header (Lớp học thuyết trình) */}
        {onOpenClassroom && userRole !== 'student' && (
          <Tooltip content={t.openClassroomTooltip} position="bottom-right" className="hidden md:inline-block">
            <button
              onClick={onOpenClassroom}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-indigo-900 dark:text-indigo-100 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-900/80 text-xs sm:text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-indigo-300 dark:border-indigo-600 shadow-sm hover:scale-105 active:scale-95 min-h-[38px]"
              aria-label={t.openClassroom}
            >
              <span className="text-base">🎓</span>
              <span className="font-bold tracking-tight hidden lg:inline">{t.openClassroom}</span>
            </button>
          </Tooltip>
        )}

        {/* Language Switcher (Desktop) */}
        <Tooltip content={t.languageTooltip} position="bottom-right" className="hidden sm:inline-block">
            <button
              onClick={onToggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 text-[13px] font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border border-blue-200 dark:border-blue-800 min-h-[38px]"
              aria-label={t.languageTooltip}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span className="hidden md:inline">{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
              <span className="md:hidden uppercase">{language === 'vi' ? 'VI' : 'EN'}</span>
            </button>
        </Tooltip>

        {/* Info Button (Desktop) */}
        <Tooltip content={t.infoTooltip} position="bottom-right" className="hidden sm:inline-block">
            <button
              onClick={onShowInfo}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-gray-500 dark:text-gray-400 text-[13px] font-normal hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[38px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden lg:inline">{t.info}</span>
            </button>
        </Tooltip>

        {/* Dark Mode Button (Desktop) */}
        <Tooltip content={isDarkMode ? t.switchToLight : t.switchToDark} position="bottom-right" className="hidden sm:inline-block">
            <button
              onClick={toggleDarkMode}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-gray-500 dark:text-gray-400 text-[13px] font-normal hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[38px]"
            >
              {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
              ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
              )}
              <span className="hidden lg:inline">{isDarkMode ? t.lightMode : t.darkMode}</span>
            </button>
        </Tooltip>

        {/* ================= MOBILE MENU TRIGGER (Phone Only) ================= */}
        <div className="sm:hidden relative" ref={mobileMenuRef}>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-lg border border-slate-200 dark:border-slate-700 active:scale-95 transition-all shadow-xs"
            aria-label="Menu chức năng điện thoại"
          >
            {showMobileMenu ? '✕' : '☰'}
          </button>

          {/* Mobile Dropdown Sheet */}
          {showMobileMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 py-3 px-3 z-[250] animate-fade-in text-left divide-y divide-slate-100 dark:divide-slate-800">
              
              {/* Mobile Account Summary */}
              <div className="pb-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">
                  Tài khoản đang đăng nhập
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 flex items-center justify-center text-base">
                    {userRole === 'admin' ? '👑' : userRole === 'teacher' ? '👨‍🏫' : '👧'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {userRole === 'admin' ? 'Quản Trị Viên (Admin)' : userRole === 'teacher' ? teacherName : studentName}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {userRole === 'admin' ? 'Toàn quyền hệ thống & xóa TK' : userRole === 'teacher' ? 'Giáo viên phụ trách lớp' : 'Học sinh'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Role Quick Actions */}
              <div className="py-2 space-y-1.5">
                {userRole === 'admin' && onOpenAdminDashboard && (
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onOpenAdminDashboard();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-2 shadow-xs"
                  >
                    <span className="text-base">👑</span>
                    <span>Bảng Quản Trị Admin</span>
                  </button>
                )}

                {userRole === 'teacher' && onOpenStudentAccounts && (
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onOpenStudentAccounts();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-xs"
                  >
                    <span className="text-base">👥</span>
                    <span>Cấp Tài Khoản Học Sinh</span>
                  </button>
                )}

                {onOpenClassroom && userRole !== 'student' && (
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onOpenClassroom();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-xs"
                  >
                    <span className="text-base">🎓</span>
                    <span>Lớp Học Trình Chiếu AI</span>
                  </button>
                )}
              </div>

              {/* System Settings (Language, Dark Mode, Info) */}
              <div className="py-2 space-y-1 text-xs">
                <button
                  onClick={() => {
                    onToggleLanguage();
                    setShowMobileMenu(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  <span className="flex items-center gap-2">
                    <span>🌐</span>
                    <span>Ngôn ngữ: {language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md">Đổi</span>
                </button>

                <button
                  onClick={() => {
                    toggleDarkMode();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  <span className="flex items-center gap-2">
                    <span>{isDarkMode ? '☀️' : '🌙'}</span>
                    <span>Chế độ: {isDarkMode ? 'Giao diện Tối' : 'Giao diện Sáng'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">Chuyển</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    onShowInfo();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                >
                  <span>ℹ️</span>
                  <span>Hướng dẫn & Thông tin</span>
                </button>
              </div>

              {/* Logout Option */}
              {onLogout && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-black text-xs flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-800 transition-all"
                  >
                    <span>🚪</span>
                    <span>Đăng Xuất Khỏi Hệ Thống</span>
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
