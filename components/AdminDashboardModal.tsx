/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TeacherAccount, WebsiteSettings, AuditLogEntry, AdminAccount, StudentAccount } from '../types';
import { Language } from '../translations';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: TeacherAccount[];
  adminAccounts?: AdminAccount[];
  studentAccounts?: StudentAccount[];
  settings: WebsiteSettings;
  auditLogs: AuditLogEntry[];
  onAddTeacher: (teacher: Omit<TeacherAccount, 'id' | 'createdAt'>) => void;
  onUpdateTeacherStatus: (id: string, status: 'active' | 'locked') => void;
  onResetTeacherPin: (id: string, newPin: string) => void;
  onDeleteTeacher: (id: string) => void;
  onAddAdmin?: (admin: Omit<AdminAccount, 'id' | 'createdAt'>) => void;
  onUpdateAdminStatus?: (id: string, status: 'active' | 'locked') => void;
  onResetAdminPin?: (id: string, newPin: string) => void;
  onDeleteAdmin?: (id: string) => void;
  onDeleteStudent?: (id: string) => void;
  onSelectTeacherToImpersonate: (teacher: TeacherAccount) => void;
  onUpdateSettings: (newSettings: Partial<WebsiteSettings>) => void;
  onResetSettingsToDefault: () => void;
  onLogout?: () => void;
  language?: Language;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  teachers,
  adminAccounts = [],
  studentAccounts = [],
  settings,
  auditLogs,
  onAddTeacher,
  onUpdateTeacherStatus,
  onResetTeacherPin,
  onDeleteTeacher,
  onAddAdmin,
  onUpdateAdminStatus,
  onResetAdminPin,
  onDeleteAdmin,
  onDeleteStudent,
  onSelectTeacherToImpersonate,
  onUpdateSettings,
  onResetSettingsToDefault,
  onLogout,
  language = 'vi'
}) => {
  const [activeTab, setActiveTab] = useState<'teachers' | 'admins' | 'students' | 'modules' | 'branding' | 'logs'>('admins');
  const [searchTeacher, setSearchTeacher] = useState('');
  
  // New teacher form state
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherCode, setNewTeacherCode] = useState(() => {
    const nextNum = teachers.length + 101;
    return `GV-${nextNum}`;
  });
  const [newTeacherPin, setNewTeacherPin] = useState('123456');
  const [newTeacherSubject, setNewTeacherSubject] = useState('Mỹ thuật & Sáng tạo số');
  const [newTeacherClassCode, setNewTeacherClassCode] = useState(() => `LOP-AI-${teachers.length + 101}`);
  const [newTeacherMaxStudents, setNewTeacherMaxStudents] = useState(35);

  // Edit PIN modal state for teacher
  const [editingTeacherPinId, setEditingTeacherPinId] = useState<string | null>(null);
  const [tempNewPin, setTempNewPin] = useState('');

  // Admin management state
  const [searchAdmin, setSearchAdmin] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('123456');
  const [newAdminRole, setNewAdminRole] = useState<'super_admin' | 'admin'>('admin');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminNotes, setNewAdminNotes] = useState('');

  // Edit PIN modal state for admin
  const [editingAdminPinId, setEditingAdminPinId] = useState<string | null>(null);
  const [tempNewAdminPin, setTempNewAdminPin] = useState('');

  // Student management search
  const [searchStudent, setSearchStudent] = useState('');

  // Universal Delete Confirmation Modal
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'admin' | 'teacher' | 'student';
    id: string;
    name: string;
    codeOrEmail?: string;
  } | null>(null);

  // Settings local draft
  const [localSettings, setLocalSettings] = useState<WebsiteSettings>(settings);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredAdmins = adminAccounts.filter(a => 
    a.name.toLowerCase().includes(searchAdmin.toLowerCase()) ||
    a.username.toLowerCase().includes(searchAdmin.toLowerCase()) ||
    a.email.toLowerCase().includes(searchAdmin.toLowerCase()) ||
    (a.phone && a.phone.includes(searchAdmin))
  );

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTeacher.toLowerCase()) ||
    t.teacherCode.toLowerCase().includes(searchTeacher.toLowerCase()) ||
    t.email.toLowerCase().includes(searchTeacher.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchTeacher.toLowerCase())
  );

  const filteredStudents = studentAccounts.filter(s =>
    s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.code.toLowerCase().includes(searchStudent.toLowerCase()) ||
    s.classCode.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;

    onAddTeacher({
      name: newTeacherName.trim(),
      email: newTeacherEmail.trim() || `${newTeacherCode.toLowerCase()}@school.edu.vn`,
      teacherCode: newTeacherCode.trim() || `GV-${Date.now().toString().slice(-3)}`,
      pin: newTeacherPin.trim() || '123456',
      subject: newTeacherSubject.trim(),
      classCode: newTeacherClassCode.trim() || `LOP-${newTeacherCode}`,
      status: 'active',
      maxStudents: Number(newTeacherMaxStudents) || 35
    });

    // Reset form
    setNewTeacherName('');
    setNewTeacherEmail('');
    const nextNum = teachers.length + 102;
    setNewTeacherCode(`GV-${nextNum}`);
    setNewTeacherClassCode(`LOP-AI-${nextNum}`);
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminUsername.trim()) return;

    onAddAdmin?.({
      name: newAdminName.trim(),
      username: newAdminUsername.trim().toLowerCase().replace(/\s+/g, ''),
      email: newAdminEmail.trim() || `${newAdminUsername.trim().toLowerCase()}@school.edu.vn`,
      pin: newAdminPin.trim() || '123456',
      role: newAdminRole,
      status: 'active',
      avatar: newAdminRole === 'super_admin' ? '👑' : '🛡️',
      phone: newAdminPhone.trim() || undefined,
      notes: newAdminNotes.trim() || undefined
    });

    setNewAdminName('');
    setNewAdminUsername('');
    setNewAdminEmail('');
    setNewAdminPin('123456');
    setNewAdminPhone('');
    setNewAdminNotes('');
  };

  const handleExecuteDelete = () => {
    if (!deleteConfirmTarget) return;

    if (deleteConfirmTarget.type === 'admin') {
      onDeleteAdmin?.(deleteConfirmTarget.id);
    } else if (deleteConfirmTarget.type === 'teacher') {
      onDeleteTeacher(deleteConfirmTarget.id);
    } else if (deleteConfirmTarget.type === 'student') {
      onDeleteStudent?.(deleteConfirmTarget.id);
    }

    setDeleteConfirmTarget(null);
  };

  const handleSaveSettings = () => {
    onUpdateSettings(localSettings);
    setSaveSuccessMsg(language === 'vi' ? 'Đã lưu cấu hình các hạng mục thành công!' : 'Website settings saved successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleToggleModule = (key: keyof WebsiteSettings) => {
    const updated = { ...localSettings, [key]: !localSettings[key] };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  const handleExportBackup = () => {
    const data = {
      timestamp: new Date().toISOString(),
      adminAccounts,
      teachers,
      studentAccounts,
      settings: localSettings,
      auditLogs
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-admin-he-thong-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-[3000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Bảng Quản Trị Hệ Thống - Admin"
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-amber-300/40 dark:border-amber-500/30 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-800 dark:text-slate-100 transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-800 text-white px-5 sm:px-7 py-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-2xl shadow-inner">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight leading-none">
                  {language === 'vi' ? 'BẢNG QUẢN TRỊ VIÊN HỆ THỐNG (ADMIN)' : 'ADMINISTRATOR CONTROL CENTER'}
                </h2>
                <span className="bg-amber-400 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Toàn Quyền
                </span>
                <span className="bg-emerald-400 text-emerald-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-900 animate-pulse"></span>
                  Đã Mở Xóa Tài Khoản
                </span>
              </div>
              <p className="text-xs text-amber-100/90 font-medium mt-1">
                {language === 'vi' 
                  ? 'Quản trị & Xóa tài khoản Quản trị viên (Admin), Giáo viên, Học sinh • Quản lý các hạng mục website' 
                  : 'Manage & Delete Admin, Teacher, Student accounts • Website modules & categories'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/20"
              title="Sao lưu toàn bộ dữ liệu hệ thống"
            >
              <span>💾</span>
              <span>Sao lưu JSON</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-black/20 hover:bg-black/40 text-white flex items-center justify-center font-bold text-sm transition-colors border border-white/10"
              aria-label="Đóng cửa sổ"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 sm:px-6 gap-2 shrink-0 overflow-x-auto scrollbar-none">
          {/* TAB 1: ADMINS & DELETE ADMIN */}
          <button
            onClick={() => setActiveTab('admins')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'admins'
                ? 'border-red-500 text-red-700 dark:text-red-400 dark:border-red-400 bg-white dark:bg-slate-800/60 rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>👑</span>
            <span className="flex items-center gap-1.5">
              <span>Tài Khoản Admin & Xóa TK</span>
              <span className="px-1.5 py-0.2 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-[10px] font-black">
                {adminAccounts.length}
              </span>
            </span>
          </button>

          {/* TAB 2: TEACHERS */}
          <button
            onClick={() => setActiveTab('teachers')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'teachers'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 dark:border-amber-400 bg-white dark:bg-slate-800/60 rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>👨‍🏫</span>
            <span>Giáo Viên ({teachers.length})</span>
          </button>

          {/* TAB 3: STUDENTS */}
          <button
            onClick={() => setActiveTab('students')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'students'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 dark:border-indigo-400 bg-white dark:bg-slate-800/60 rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>👧</span>
            <span>Học Sinh ({studentAccounts.length})</span>
          </button>

          {/* TAB 4: MODULES */}
          <button
            onClick={() => setActiveTab('modules')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'modules'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 dark:border-amber-400 bg-white dark:bg-slate-800/60 rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>⚙️</span>
            <span>Quản Lý Hạng Mục Của Web</span>
          </button>

          {/* TAB 5: BRANDING */}
          <button
            onClick={() => setActiveTab('branding')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'branding'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 dark:border-amber-400 bg-white dark:bg-slate-800/60 rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>📢</span>
            <span>Thông Báo & Trường Học</span>
          </button>

          {/* TAB 6: LOGS */}
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 dark:border-amber-400 bg-white dark:bg-slate-800/60 rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>📊</span>
            <span>Nhật Ký & Thống Kê</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center gap-2 text-sm font-bold animate-fade-in">
              <span>✅</span>
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* ================= TAB 1: ADMIN ACCOUNTS & DELETE ADMIN (QUẢN TRỊ VIÊN & XÓA TÀI KHOẢN ADMIN) ================= */}
          {activeTab === 'admins' && (
            <div className="space-y-6">
              {/* Highlight Banner: Chức năng Xóa Tài Khoản Admin Đã Mở */}
              <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-indigo-500/10 border-2 border-red-400 dark:border-red-600/70 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-amber-600 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                    👑
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                        Quản Lý & Xóa Tài Khoản Quản Trị Viên (Admin)
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        CHỨC NĂNG XÓA TK ADMIN: ĐÃ MỞ
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Toàn quyền quản trị hệ thống: Admin có thể cấp tài khoản quản trị mới, thay đổi mã PIN, phân quyền quản trị tối cao (Super Admin) và <strong>xóa tài khoản Quản trị viên</strong> khỏi hệ thống khi cần thu hồi quyền truy cập.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    {adminAccounts.length} Tài khoản Admin
                  </span>
                </div>
              </div>

              {/* Quick Stat Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-2xl">
                  <div className="text-[11px] font-bold text-red-800 dark:text-red-300 uppercase">Tổng Tài Khoản Admin</div>
                  <div className="text-2xl font-black text-red-950 dark:text-red-100 mt-1">{adminAccounts.length}</div>
                </div>
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl">
                  <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">Super Admin Tối Cao</div>
                  <div className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">
                    {adminAccounts.filter(a => a.role === 'super_admin').length}
                  </div>
                </div>
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl">
                  <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Đang Hoạt Động</div>
                  <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                    {adminAccounts.filter(a => a.status === 'active').length}
                  </div>
                </div>
                <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl">
                  <div className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase">Quyền Xóa Tài Khoản</div>
                  <div className="text-sm font-black text-indigo-950 dark:text-indigo-100 mt-2 flex items-center gap-1">
                    <span>🔓 ĐÃ KÍCH HOẠT</span>
                  </div>
                </div>
              </div>

              {/* Form to issue a new Admin account */}
              <div className="bg-gradient-to-br from-red-50/50 via-white to-amber-50/40 dark:from-slate-800 dark:to-slate-800/60 border-2 border-red-200 dark:border-red-800/60 rounded-3xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">➕</span>
                  <h3 className="font-black text-base text-red-950 dark:text-red-200">
                    Cấp Tài Khoản Quản Trị Viên (Admin) Mới
                  </h3>
                </div>

                <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Họ và Tên Admin *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Thầy Trần Minh Quân"
                      value={newAdminName}
                      onChange={e => setNewAdminName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Tên Đăng Nhập (Username) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: admin.quan"
                      value={newAdminUsername}
                      onChange={e => setNewAdminUsername(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 font-mono bg-white dark:bg-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Email Quản Trị Viên
                    </label>
                    <input
                      type="email"
                      placeholder="admin.quan@school.edu.vn"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Mã PIN / Mật Khẩu Khởi Tạo
                    </label>
                    <input
                      type="text"
                      value={newAdminPin}
                      onChange={e => setNewAdminPin(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 font-mono bg-white dark:bg-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Cấp Bậc Phân Quyền
                    </label>
                    <select
                      value={newAdminRole}
                      onChange={e => setNewAdminRole(e.target.value as 'super_admin' | 'admin')}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none font-bold"
                    >
                      <option value="admin">🛡️ Quản Trị Viên Hệ Thống (Admin)</option>
                      <option value="super_admin">👑 Quản Trị Viên Trưởng (Super Admin)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Số Điện Thoại Liên Hệ (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      placeholder="09xx xxx xxx"
                      value={newAdminPhone}
                      onChange={e => setNewAdminPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                      <span>➕</span>
                      <span>Tạo & Cấp Tài Khoản Admin</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Table of Admins */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <span>👑</span>
                      <span>Danh Sách Tài Khoản Quản Trị Viên ({filteredAdmins.length})</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Bạn có thể xóa tài khoản Admin, đổi mã PIN hoặc tạm khóa quyền truy cập của bất kỳ Admin nào.
                    </p>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm theo tên, username, email..."
                      value={searchAdmin}
                      onChange={e => setSearchAdmin(e.target.value)}
                      className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-3">Quản Trị Viên</th>
                        <th className="py-3 px-3">Tài Khoản & Email</th>
                        <th className="py-3 px-3">Mã PIN / Mật Khẩu</th>
                        <th className="py-3 px-3">Vai Trò</th>
                        <th className="py-3 px-3">Trạng Thái</th>
                        <th className="py-3 px-3 text-right">Hành Động (Xóa & Đổi PIN)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {filteredAdmins.map((admin) => (
                        <tr key={admin.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">{admin.avatar || '👑'}</span>
                              <div>
                                <div className="font-black text-slate-900 dark:text-white text-sm">
                                  {admin.name}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  Cấp ngày: {admin.createdAt}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-bold text-red-600 dark:text-red-400 font-mono">
                              @{admin.username}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {admin.email}
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-xs font-bold text-slate-700 dark:text-slate-300">
                              {admin.pin}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            {admin.role === 'super_admin' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                👑 Super Admin
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
                                🛡️ Admin Hệ Thống
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {admin.status === 'active' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                🟢 Hoạt Động
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                🔴 Đã Khóa
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit PIN */}
                              <button
                                onClick={() => {
                                  setEditingAdminPinId(admin.id);
                                  setTempNewAdminPin(admin.pin);
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                                title="Đổi mã PIN của Admin"
                              >
                                🔑 Đổi PIN
                              </button>

                              {/* Lock / Unlock */}
                              {onUpdateAdminStatus && (
                                <button
                                  onClick={() => onUpdateAdminStatus(admin.id, admin.status === 'active' ? 'locked' : 'active')}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                                    admin.status === 'active'
                                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                                  }`}
                                  title={admin.status === 'active' ? "Khóa tài khoản admin" : "Mở khóa tài khoản admin"}
                                >
                                  {admin.status === 'active' ? '🔒 Khóa' : '🔓 Mở'}
                                </button>
                              )}

                              {/* DELETE ADMIN BUTTON (CHỨC NĂNG XÓA TÀI KHOẢN ADMIN) */}
                              <button
                                onClick={() => {
                                  setDeleteConfirmTarget({
                                    type: 'admin',
                                    id: admin.id,
                                    name: admin.name,
                                    codeOrEmail: `@${admin.username} (${admin.email})`
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950/50 dark:hover:bg-red-900 text-red-700 dark:text-red-300 text-xs font-bold transition-colors flex items-center gap-1 shadow-sm border border-red-300 dark:border-red-800"
                                title="Xóa tài khoản Quản trị viên này"
                              >
                                <span>🗑️</span>
                                <span>Xóa Admin</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredAdmins.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                            Không tìm thấy tài khoản quản trị viên nào phù hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Danger Zone: Xóa Tài Khoản Của Admin */}
                <div className="mt-4 p-4 rounded-2xl border-2 border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">⚠️</span>
                    <div>
                      <h4 className="font-black text-sm text-red-950 dark:text-red-200">
                        Khu Vực Nguy Hiểm: Xóa Tài Khoản Của Admin
                      </h4>
                      <p className="text-xs text-red-900/80 dark:text-red-300/80 mt-0.5">
                        Tính năng xóa tài khoản admin đã được mở hoàn toàn. Để bảo vệ toàn vẹn dữ liệu, hệ thống chỉ yêu cầu duy trì tối thiểu 1 tài khoản quản trị viên tối cao.
                      </p>
                    </div>
                  </div>

                  {adminAccounts.length > 1 && (
                    <button
                      onClick={() => {
                        const target = adminAccounts[adminAccounts.length - 1];
                        setDeleteConfirmTarget({
                          type: 'admin',
                          id: target.id,
                          name: target.name,
                          codeOrEmail: `@${target.username}`
                        });
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all shrink-0 flex items-center gap-1.5"
                    >
                      <span>🗑️</span>
                      <span>Xóa Tài Khoản Admin Phụ</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEACHER ACCOUNTS PROVISIONING */}
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              {/* Quick Stat Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl">
                  <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">Tổng Giáo Viên</div>
                  <div className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">{teachers.length}</div>
                </div>
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl">
                  <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Đang Hoạt Động</div>
                  <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                    {teachers.filter(t => t.status === 'active').length}
                  </div>
                </div>
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl">
                  <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase">Tài Khoản Đã Khóa</div>
                  <div className="text-2xl font-black text-rose-950 dark:text-rose-100 mt-1">
                    {teachers.filter(t => t.status === 'locked').length}
                  </div>
                </div>
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl">
                  <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase">Phòng Học AI Đã Cấp</div>
                  <div className="text-2xl font-black text-blue-950 dark:text-blue-100 mt-1">
                    {new Set(teachers.map(t => t.classCode)).size}
                  </div>
                </div>
              </div>

              {/* Form to issue a new teacher account */}
              <div className="bg-gradient-to-br from-amber-50/60 via-white to-sky-50/50 dark:from-slate-800 dark:to-slate-800/60 border-2 border-amber-200 dark:border-amber-800/70 rounded-3xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">➕</span>
                  <h3 className="font-black text-base text-amber-950 dark:text-amber-200">
                    Cấp Tài Khoản Giáo Viên Mới
                  </h3>
                </div>

                <form onSubmit={handleCreateTeacher} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Họ và Tên Giáo viên *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Cô Hoàng Mai"
                      value={newTeacherName}
                      onChange={e => setNewTeacherName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Mã Giáo Viên *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTeacherCode}
                      onChange={e => setNewTeacherCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold text-amber-700 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Mật khẩu PIN truy cập
                    </label>
                    <input
                      type="text"
                      value={newTeacherPin}
                      onChange={e => setNewTeacherPin(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Bộ Môn / Chuyên Trách
                    </label>
                    <input
                      type="text"
                      value={newTeacherSubject}
                      onChange={e => setNewTeacherSubject(e.target.value)}
                      placeholder="Mỹ thuật, Tiếng Việt, Khoa học..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Mã Lớp Học Phụ Trách (Class PIN)
                    </label>
                    <input
                      type="text"
                      value={newTeacherClassCode}
                      onChange={e => setNewTeacherClassCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold text-blue-700 dark:text-blue-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Email Liên Hệ (Tùy chọn)
                    </label>
                    <input
                      type="email"
                      value={newTeacherEmail}
                      onChange={e => setNewTeacherEmail(e.target.value)}
                      placeholder="gv.maianh@school.edu.vn"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3 flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 transform active:scale-95"
                    >
                      <span>✨</span>
                      <span>Hoàn Tất Cấp Tài Khoản Giáo Viên</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Teachers list table */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-black text-base text-slate-800 dark:text-slate-200">
                    Danh Sách Tài Khoản Giáo Viên ({filteredTeachers.length})
                  </h3>
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Tìm theo tên, mã, bộ môn..."
                      value={searchTeacher}
                      onChange={e => setSearchTeacher(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-3 px-3">Mã GV</th>
                          <th className="py-3 px-3">Họ và Tên</th>
                          <th className="py-3 px-3">Bộ Môn & Lớp</th>
                          <th className="py-3 px-3">Mã PIN</th>
                          <th className="py-3 px-3">Trạng Thái</th>
                          <th className="py-3 px-3 text-right">Thao Tác Quản Trị</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTeachers.map(teacher => (
                          <tr key={teacher.id} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                              {teacher.teacherCode}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>👨‍🏫</span>
                                <span>{teacher.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">{teacher.email}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-700 dark:text-slate-300">{teacher.subject}</div>
                              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-bold">
                                Lớp: {teacher.classCode} (Tối đa {teacher.maxStudents} HS)
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                              {teacher.pin}
                            </td>
                            <td className="py-3 px-3">
                              {teacher.status === 'active' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                  <span>🟢</span>
                                  <span>Hoạt Động</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                                  <span>🔴</span>
                                  <span>Đã Khóa</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Switch to this Teacher button */}
                                <button
                                  onClick={() => {
                                    onSelectTeacherToImpersonate(teacher);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/70 text-blue-900 dark:text-blue-200 text-xs font-bold transition-colors shadow-sm"
                                  title="Đăng nhập làm việc với tài khoản Giáo viên này"
                                >
                                  👨‍🏫 Đăng nhập vai GV
                                </button>

                                {/* Lock / Unlock toggle */}
                                <button
                                  onClick={() => onUpdateTeacherStatus(teacher.id, teacher.status === 'active' ? 'locked' : 'active')}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                                    teacher.status === 'active'
                                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                                  }`}
                                  title={teacher.status === 'active' ? "Khóa tài khoản giáo viên" : "Mở khóa tài khoản giáo viên"}
                                >
                                  {teacher.status === 'active' ? '🔒 Khóa' : '🔓 Mở'}
                                </button>

                                {/* Reset PIN */}
                                <button
                                  onClick={() => {
                                    setEditingTeacherPinId(teacher.id);
                                    setTempNewPin(teacher.pin);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                                  title="Đổi mã PIN"
                                >
                                  🔑 Đổi PIN
                                </button>

                                {/* Delete teacher */}
                                <button
                                  onClick={() => {
                                    setDeleteConfirmTarget({
                                      type: 'teacher',
                                      id: teacher.id,
                                      name: teacher.name,
                                      codeOrEmail: `${teacher.teacherCode} (${teacher.email})`
                                    });
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors"
                                  title="Xóa tài khoản giáo viên"
                                >
                                  🗑️ Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredTeachers.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                              Không tìm thấy giáo viên nào phù hợp với từ khóa.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: ALL STUDENT ACCOUNTS & DELETE STUDENT ================= */}
          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">👧</span>
                  <div>
                    <h4 className="font-black text-sm text-indigo-950 dark:text-indigo-200">
                      Quản Lý & Xóa Tài Khoản Học Sinh Toàn Hệ Thống
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Quyền Quản Trị Viên (Admin): Toàn quyền xem và xóa tài khoản học sinh thuộc tất cả các phòng học khi kết thúc năm học hoặc dọn dẹp lớp học.
                    </p>
                  </div>
                </div>
                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-indigo-200 shrink-0">
                  Tổng: {studentAccounts.length} học sinh
                </div>
              </div>

              {/* Table of Students */}
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>👧</span>
                    <span>Danh Sách Học Sinh ({filteredStudents.length})</span>
                  </h3>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm tên bé, mã số HS, mã lớp..."
                      value={searchStudent}
                      onChange={e => setSearchStudent(e.target.value)}
                      className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3 px-3">Học Sinh</th>
                        <th className="py-3 px-3">Mã Học Sinh</th>
                        <th className="py-3 px-3">Lớp Học</th>
                        <th className="py-3 px-3">Điểm Tích Lũy</th>
                        <th className="py-3 px-3 text-right">Xóa Tài Khoản</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {filteredStudents.map(st => (
                        <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{st.avatar || '👧'}</span>
                              <span className="font-bold text-slate-900 dark:text-white">{st.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{st.code}</td>
                          <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{st.classCode}</td>
                          <td className="py-3 px-3 font-bold text-amber-600">⭐ {st.score}</td>
                          <td className="py-3 px-3 text-right">
                            {onDeleteStudent && (
                              <button
                                onClick={() => setDeleteConfirmTarget({
                                  type: 'student',
                                  id: st.id,
                                  name: st.name,
                                  codeOrEmail: st.code
                                })}
                                className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors"
                                title="Xóa tài khoản học sinh này"
                              >
                                🗑️ Xóa
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">
                            Không tìm thấy học sinh nào.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WEBSITE MODULES & CATEGORIES MANAGEMENT */}
          {activeTab === 'modules' && (
            <div className="space-y-6">
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">🛠️</span>
                  <div>
                    <h4 className="font-black text-sm text-amber-950 dark:text-amber-200">
                      Quản Lý Phân Quyền & Hiển Thị Các Hạng Mục Trên Web
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Admin có thể bật hoặc tắt từng hạng mục theo chương trình học hoặc thời điểm kiểm tra, quản lý chặt chẽ trải nghiệm của giáo viên và học sinh.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all shrink-0"
                >
                  💾 Lưu Cấu Hình
                </button>
              </div>

              {/* Module Toggles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Image Generation Module */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-start justify-between gap-3 shadow-sm hover:border-amber-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xl shrink-0">
                      🎨
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Hạng Mục Tạo Ảnh AI</span>
                        {localSettings.enableImageGen ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Đang Bật</span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">Đã Khóa</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Cho phép giáo viên tạo hình ảnh trực quan hóa lời nhắc với Gemini & động cơ đồ họa.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.enableImageGen}
                    onChange={() => handleToggleModule('enableImageGen')}
                    className="w-6 h-6 rounded-md text-amber-600 focus:ring-amber-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 2. Story Generation Module */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-start justify-between gap-3 shadow-sm hover:border-amber-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xl shrink-0">
                      📖
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Hạng Mục Sáng Tác Truyện AI</span>
                        {localSettings.enableStoryGen ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Đang Bật</span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">Đã Khóa</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Mở chế độ viết truyện sáng tạo, xây dựng cốt truyện giáo dục cho học sinh.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.enableStoryGen}
                    onChange={() => handleToggleModule('enableStoryGen')}
                    className="w-6 h-6 rounded-md text-amber-600 focus:ring-amber-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 3. Belief Graph & Visual Analysis */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-start justify-between gap-3 shadow-sm hover:border-amber-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xl shrink-0">
                      🧠
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Hạng Mục Sơ Đồ Tri Thức Belief Graph</span>
                        {localSettings.enableBeliefGraph ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Đang Bật</span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">Đã Khóa</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Hiển thị đồ thị quan hệ thực thể, thuộc tính ngữ nghĩa và bảng câu hỏi làm rõ.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.enableBeliefGraph}
                    onChange={() => handleToggleModule('enableBeliefGraph')}
                    className="w-6 h-6 rounded-md text-amber-600 focus:ring-amber-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 4. Live Classroom Presentation */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-start justify-between gap-3 shadow-sm hover:border-amber-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xl shrink-0">
                      🎓
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Hạng Mục Lớp Học Trình Chiếu Trực Tiếp</span>
                        {localSettings.enableClassroom ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Đang Bật</span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">Đã Khóa</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Mở giao diện phòng học tương tác trực tuyến cho giáo viên chiếu bài giảng.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.enableClassroom}
                    onChange={() => handleToggleModule('enableClassroom')}
                    className="w-6 h-6 rounded-md text-amber-600 focus:ring-amber-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 5. Interactive Quiz & Questions */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-start justify-between gap-3 shadow-sm hover:border-amber-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 flex items-center justify-center text-xl shrink-0">
                      ✏️
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Hạng Mục Soạn Câu Hỏi & Trắc Nghiệm</span>
                        {localSettings.enableQuestionQuiz ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Đang Bật</span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">Đã Khóa</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Cho phép giáo viên biên tập câu hỏi tương tác theo tranh và học sinh trả lời lấy điểm.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.enableQuestionQuiz}
                    onChange={() => handleToggleModule('enableQuestionQuiz')}
                    className="w-6 h-6 rounded-md text-amber-600 focus:ring-amber-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 6. Teacher Issuing Student Accounts */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-start justify-between gap-3 shadow-sm hover:border-amber-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center text-xl shrink-0">
                      👥
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Quyền Cấp Tài Khoản Học Sinh Cho GV</span>
                        {localSettings.enableStudentAccounts ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Đang Bật</span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">Đã Khóa</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Cho phép các giáo viên tự cấp mã truy cập học sinh trong lớp học của mình.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.enableStudentAccounts}
                    onChange={() => handleToggleModule('enableStudentAccounts')}
                    className="w-6 h-6 rounded-md text-amber-600 focus:ring-amber-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 7. Image Download Permission */}
                <div className="p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex items-start justify-between gap-3 shadow-sm hover:border-amber-400 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xl shrink-0">
                      📥
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Hạng Mục Tải Xuống Tranh Thành Phẩm</span>
                        {localSettings.enableDownloadImages ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Đang Bật</span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">Đã Khóa</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Cho phép lưu và tải file tranh vẽ chất lượng cao về máy tính.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.enableDownloadImages}
                    onChange={() => handleToggleModule('enableDownloadImages')}
                    className="w-6 h-6 rounded-md text-amber-600 focus:ring-amber-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 8. Maintenance Mode */}
                <div className="p-4 rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 flex items-start justify-between gap-3 shadow-sm transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 flex items-center justify-center text-xl shrink-0">
                      🔒
                    </div>
                    <div>
                      <div className="font-black text-sm text-rose-950 dark:text-rose-200 flex items-center gap-2">
                        <span>Chế Độ Bảo Trì Toàn Trang</span>
                        {localSettings.maintenanceMode && (
                          <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">ĐANG BẬT</span>
                        )}
                      </div>
                      <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-1">
                        Khi bật, người dùng sẽ thấy thông báo bảo trì nâng cấp và tạm ngừng tạo nội dung.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.maintenanceMode}
                    onChange={() => handleToggleModule('maintenanceMode')}
                    className="w-6 h-6 rounded-md text-rose-600 focus:ring-rose-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 9. Admin Account Deletion Feature (Mở Chức Năng Xóa Tài Khoản Của Admin) */}
                <div className="p-4 rounded-2xl border-2 border-red-300 dark:border-red-800/80 bg-red-50/50 dark:bg-red-950/20 flex items-start justify-between gap-3 shadow-sm hover:border-red-500 transition-all md:col-span-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 flex items-center justify-center text-xl shrink-0">
                      🗑️
                    </div>
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Chức Năng Xóa Tài Khoản Của Admin</span>
                        {localSettings.enableAdminAccountDeletion !== false ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            ĐÃ MỞ / ĐANG BẬT
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2.5 py-0.5 rounded-full">
                            ĐÃ KHÓA
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                        Cho phép Quản trị viên (Admin) toàn quyền xóa các tài khoản Admin, Giáo viên và Học sinh trong toàn bộ hệ thống. Đảm bảo có xác nhận bảo mật và tự động ghi nhật ký hệ thống (Audit Log).
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.enableAdminAccountDeletion !== false}
                    onChange={() => handleToggleModule('enableAdminAccountDeletion')}
                    className="w-6 h-6 rounded-md text-red-600 focus:ring-red-500 cursor-pointer mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCHOOL BRANDING & BROADCAST ANNOUNCEMENT */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>🏫</span>
                  <span>Cấu Hình Thông Tin Đơn Vị & Băng Rôn Thông Báo</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Tên Trường Học / Trung Tâm Đào Tạo
                    </label>
                    <input
                      type="text"
                      value={localSettings.schoolName}
                      onChange={e => setLocalSettings({ ...localSettings, schoolName: e.target.value })}
                      placeholder="Ví dụ: Trường Tiểu Học Sáng Tạo AI"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Tiêu Đề Cổng Thông Tin
                    </label>
                    <input
                      type="text"
                      value={localSettings.portalTitle}
                      onChange={e => setLocalSettings({ ...localSettings, portalTitle: e.target.value })}
                      placeholder="Không Gian Sáng Tạo AI Dành Cho Giáo Viên & Học Sinh"
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                        Nội Dung Thông Báo Toàn Web (System Broadcast Announcement)
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localSettings.showAnnouncement}
                          onChange={e => setLocalSettings({ ...localSettings, showAnnouncement: e.target.checked })}
                          className="rounded text-amber-600"
                        />
                        <span>Hiển thị băng rôn này lên đầu trang</span>
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={localSettings.systemAnnouncement}
                      onChange={e => setLocalSettings({ ...localSettings, systemAnnouncement: e.target.value })}
                      placeholder="Nhập thông điệp gửi tới giáo viên và học sinh..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Hạn Mức Tạo Ảnh Tối Đa Mỗi Buổi Học
                    </label>
                    <input
                      type="number"
                      value={localSettings.maxDailyImagesPerClass}
                      onChange={e => setLocalSettings({ ...localSettings, maxDailyImagesPerClass: Number(e.target.value) || 50 })}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Chủ Đề Lời Nhắc Gợi Ý Mặc Định
                    </label>
                    <input
                      type="text"
                      value={localSettings.defaultPromptTheme}
                      onChange={e => setLocalSettings({ ...localSettings, defaultPromptTheme: e.target.value })}
                      placeholder="Thiên nhiên, Động vật, Lễ hội thiếu nhi..."
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={onResetSettingsToDefault}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                  >
                    🔄 Khôi Phục Mặc Định
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>💾</span>
                    <span>Lưu Cài Đặt Hệ Thống</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS & SYSTEM STATS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>📜</span>
                  <span>Nhật Ký Hoạt Động & Kiểm Toán Quản Trị</span>
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {auditLogs.length} sự kiện gần nhất
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base mt-0.5">
                        {log.category === 'account' ? '👤' : log.category === 'settings' ? '⚙️' : log.category === 'security' ? '🔒' : 'ℹ️'}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {log.action}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {log.details}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          Người thực hiện: <span className="font-semibold text-amber-600 dark:text-amber-400">{log.actor}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                      {log.timestamp}
                    </div>
                  </div>
                ))}

                {auditLogs.length === 0 && (
                  <div className="p-8 text-center text-slate-400 font-semibold">
                    Chưa có nhật ký hoạt động nào được ghi nhận.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Edit Teacher PIN Submodal */}
        {editingTeacherPinId && (
          <div className="fixed inset-0 z-[3500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-sm w-full border border-slate-300 dark:border-slate-700 shadow-2xl space-y-4">
              <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>🔑</span>
                <span>Đặt Lại Mã PIN Giáo Viên</span>
              </h4>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Mã PIN mới:</label>
                <input
                  type="text"
                  value={tempNewPin}
                  onChange={e => setTempNewPin(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 font-mono font-bold bg-white dark:bg-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingTeacherPinId(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (tempNewPin.trim()) {
                      onResetTeacherPin(editingTeacherPinId, tempNewPin.trim());
                      setEditingTeacherPinId(null);
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white"
                >
                  Lưu PIN Mới
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Universal Delete Confirmation Modal */}
        {deleteConfirmTarget && (
          <div className="fixed inset-0 z-[3600] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border-2 border-red-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl shrink-0">
                  ⚠️
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                    {deleteConfirmTarget.type === 'admin'
                      ? 'Xác Nhận Xóa Tài Khoản Quản Trị Viên (Admin)'
                      : deleteConfirmTarget.type === 'teacher'
                      ? 'Xác Nhận Xóa Tài Khoản Giáo Viên'
                      : 'Xác Nhận Xóa Tài Khoản Học Sinh'}
                  </h4>
                  <p className="text-xs text-red-600 dark:text-red-400 font-bold mt-0.5">
                    Hành động này không thể hoàn tác!
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-2xl text-xs space-y-1">
                <div className="font-bold text-slate-700 dark:text-slate-200">
                  Đối tượng xóa: <span className="font-black text-red-700 dark:text-red-300">{deleteConfirmTarget.name}</span>
                </div>
                {deleteConfirmTarget.codeOrEmail && (
                  <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    Thông tin: {deleteConfirmTarget.codeOrEmail}
                  </div>
                )}
                <div className="text-slate-600 dark:text-slate-400 pt-1 text-[11px]">
                  {deleteConfirmTarget.type === 'admin'
                    ? 'Tài khoản Quản trị viên này sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu hệ thống và mất toàn bộ quyền truy cập.'
                    : deleteConfirmTarget.type === 'teacher'
                    ? 'Tài khoản giáo viên và các thông tin liên quan sẽ bị xóa khỏi hệ thống quản lý.'
                    : 'Tài khoản học sinh sẽ bị xóa và không còn quyền truy cập vào phòng học.'}
                </div>
              </div>

              {deleteConfirmTarget.type === 'admin' && adminAccounts.length <= 1 && (
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-xl text-xs font-bold">
                  ⚠️ Lưu ý: Đây là tài khoản Admin duy nhất. Không thể xóa tài khoản Quản trị viên cuối cùng của hệ thống.
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmTarget.type === 'admin' && adminAccounts.length <= 1}
                  onClick={handleExecuteDelete}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>🗑️</span>
                  <span>Xác Nhận Xóa Vĩnh Viễn</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal edit Admin PIN */}
        {editingAdminPinId && (
          <div className="fixed inset-0 z-[3500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-sm w-full border border-slate-300 dark:border-slate-700 shadow-2xl space-y-4">
              <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>🔑</span>
                <span>Đặt Lại Mã PIN / Mật Khẩu Admin</span>
              </h4>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Mã PIN mới:</label>
                <input
                  type="text"
                  value={tempNewAdminPin}
                  onChange={e => setTempNewAdminPin(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 font-mono font-bold bg-white dark:bg-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingAdminPinId(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (tempNewAdminPin.trim()) {
                      onResetAdminPin?.(editingAdminPinId, tempNewAdminPin.trim());
                      setEditingAdminPinId(null);
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
                >
                  Lưu PIN Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0 gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span>🛡️ Cổng Quản Trị Hệ Thống Giáo Dục AI</span>
            <span>•</span>
            <span>{settings.schoolName}</span>
          </div>

          <div className="flex items-center gap-2">
            {onLogout && (
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-800 dark:text-rose-200 font-bold transition-colors flex items-center gap-1.5 border border-rose-300 dark:border-rose-800"
              >
                <span>🚪</span>
                <span>Đăng Xuất Admin</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-amber-600 dark:hover:bg-amber-700 text-white font-bold transition-colors"
            >
              Đóng Bảng Quản Trị
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
