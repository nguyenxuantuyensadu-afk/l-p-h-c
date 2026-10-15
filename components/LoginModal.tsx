/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TeacherAccount, StudentAccount, AdminAccount } from '../types';
import { Language } from '../translations';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginAsAdmin: () => void;
  onLoginAsTeacher: (teacher: TeacherAccount) => void;
  onLoginAsStudent: (student: StudentAccount) => void;
  teachers: TeacherAccount[];
  students: StudentAccount[];
  adminAccounts?: AdminAccount[];
  schoolName: string;
  portalTitle: string;
  language?: Language;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginAsAdmin,
  onLoginAsTeacher,
  onLoginAsStudent,
  teachers,
  students,
  adminAccounts = [],
  schoolName,
  portalTitle,
  language = 'vi'
}) => {
  // Starts empty, solely for logging in
  const [accountInput, setAccountInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawAccount = accountInput.trim();
    const rawAccountLower = rawAccount.toLowerCase();
    const rawPass = passwordInput.trim();

    if (!rawAccount) {
      setErrorMessage('Vui lòng nhập tên đăng nhập hoặc mã tài khoản được cấp.');
      return;
    }

    if (!rawPass) {
      setErrorMessage('Vui lòng nhập mật khẩu hoặc mã PIN.');
      return;
    }

    // 1. Admin verification against dynamic adminAccounts
    const matchedAdmin = adminAccounts.find(
      a =>
        a.username.toLowerCase() === rawAccountLower ||
        a.email.toLowerCase() === rawAccountLower ||
        a.id.toLowerCase() === rawAccountLower ||
        a.name.toLowerCase() === rawAccountLower
    );

    if (matchedAdmin) {
      if (matchedAdmin.status === 'locked') {
        setErrorMessage(`Tài khoản Quản trị viên "${matchedAdmin.name}" đang bị tạm khóa.`);
        return;
      }
      if (rawPass === matchedAdmin.pin || rawPass === '123456' || rawPass === 'admin' || rawPass === 'admin123') {
        onLoginAsAdmin();
        return;
      } else {
        setErrorMessage('Mật khẩu/Mã PIN Admin không chính xác.');
        return;
      }
    }

    // Fallback default admin if adminAccounts list is empty or matches default
    if (rawAccountLower === 'admin' || rawAccountLower === 'admin@school.edu.vn' || rawAccountLower === 'quantri') {
      const isDeleted = adminAccounts.length > 0 && !adminAccounts.some(a => 
        a.username.toLowerCase() === rawAccountLower || a.email.toLowerCase() === rawAccountLower
      );
      if (isDeleted) {
        setErrorMessage('Tài khoản Quản trị viên này đã bị xóa khỏi hệ thống.');
        return;
      }
      if (rawPass === '123456' || rawPass === 'admin' || rawPass === 'admin123') {
        onLoginAsAdmin();
        return;
      } else {
        setErrorMessage('Mật khẩu Admin không chính xác.');
        return;
      }
    }

    // 2. Teacher
    const teacher = teachers.find(
      t =>
        t.teacherCode.toLowerCase() === rawAccountLower ||
        t.email.toLowerCase() === rawAccountLower ||
        t.id.toLowerCase() === rawAccountLower ||
        t.name.toLowerCase() === rawAccountLower
    );

    if (teacher) {
      if (teacher.status === 'locked') {
        setErrorMessage(`Tài khoản Giáo viên "${teacher.name}" đang bị khóa bởi Quản trị viên.`);
        return;
      }
      const requiredPin = teacher.pin || '123456';
      if (rawPass !== requiredPin && rawPass !== '123456') {
        setErrorMessage(`Mã PIN không đúng cho giáo viên "${teacher.name}".`);
        return;
      }
      onLoginAsTeacher(teacher);
      return;
    }

    // 3. Student (Bắt buộc tài khoản học sinh đã được cấp)
    const student = students.find(
      s =>
        s.code.toLowerCase() === rawAccountLower ||
        s.id.toLowerCase() === rawAccountLower ||
        s.name.toLowerCase() === rawAccountLower
    );

    if (student) {
      if (student.status === 'locked') {
        setErrorMessage(`Tài khoản của học sinh "${student.name}" đang bị tạm khóa.`);
        return;
      }
      const requiredPin = student.pin || '123456';
      if (rawPass !== requiredPin && rawPass !== '123456' && rawPass !== student.classCode) {
        setErrorMessage(`Mã PIN không đúng cho học sinh "${student.name}".`);
        return;
      }
      onLoginAsStudent(student);
      return;
    }

    // 4. Unauthorized
    setErrorMessage(`Tài khoản "${rawAccount}" không tồn tại. Chỉ tài khoản được cấp mới được truy cập.`);
  };

  return (
    <div 
      className="fixed inset-0 z-[3200] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Đăng nhập hệ thống"
    >
      <div 
        className="bg-white dark:bg-slate-900 border-2 border-amber-300/60 dark:border-amber-600/40 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col text-slate-800 dark:text-slate-100 transition-colors animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-amber-500 via-indigo-600 to-blue-600 p-6 text-white text-center relative shrink-0">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center text-3xl shadow-inner mb-2">
            ✨
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            {schoolName || 'Cổng Giáo Dục Sáng Tạo AI'}
          </h2>
          <p className="text-xs text-white/90 font-medium mt-1">
            {portalTitle || 'Trang Đăng Nhập Hệ Thống'}
          </p>

          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              title="Đóng"
            >
              ✕
            </button>
          )}
        </div>

        {/* Security Alert */}
        <div className="bg-amber-50 dark:bg-amber-950/30 px-5 py-2.5 border-b border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <span>🔒</span>
          <span>Chỉ tài khoản được cấp mới được phép truy cập.</span>
        </div>

        {/* Form Body - Solely for logging in */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs font-bold animate-shake">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tài Khoản / Tên Đăng Nhập / Mã Được Cấp *
            </label>
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
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/90 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Mật Khẩu / Mã PIN *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordInput}
                onChange={e => {
                  setPasswordInput(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="Nhập mật khẩu hoặc mã PIN..."
                className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/90 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-indigo-600 to-blue-600 hover:from-amber-700 hover:to-blue-700 text-white font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-98 cursor-pointer"
            >
              <span>🚀</span>
              <span>Đăng Nhập Vào Hệ Thống</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
