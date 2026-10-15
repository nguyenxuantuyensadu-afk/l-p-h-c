/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StudentAccount } from '../types';
import { Language, translations } from '../translations';

interface StudentAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentAccount[];
  classCode: string;
  onAddStudent: (name: string, avatar: string) => void;
  onDeleteStudent?: (id: string) => void;
  onSwitchToStudent: (student: StudentAccount) => void;
  language?: Language;
  isAdmin?: boolean;
}

export const StudentAccountsModal: React.FC<StudentAccountsModalProps> = ({
  isOpen,
  onClose,
  students,
  classCode,
  onAddStudent,
  onDeleteStudent,
  onSwitchToStudent,
  language = 'vi',
  isAdmin = false
}) => {
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👧');
  const [copySuccess, setCopySuccess] = useState(false);

  const avatarOptions = ['👧', '👦', '🧒', '🌸', '🚀', '🐱', '🦄', '⭐'];

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    onAddStudent(newStudentName.trim(), selectedAvatar);
    setNewStudentName('');
  };

  const handleCopyClassCode = () => {
    navigator.clipboard.writeText(classCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-[2900] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quản lý và cấp tài khoản học sinh"
    >
      <div 
        className="bg-gradient-to-br from-amber-50 via-white to-sky-50 border-4 border-amber-300 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative text-left text-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b-2 border-amber-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-2xl shadow-md border-2 border-white">
              👥
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-amber-950 leading-tight">
                {language === 'vi' ? 'Quản Lý & Cấp Tài Khoản Học Sinh' : 'Student Account Management'}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                {language === 'vi' ? 'Giáo viên cấp tài khoản học sinh để các bé vào xem trình chiếu & trả lời câu hỏi' : 'Teacher issues student accounts for live presentation & quiz'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-amber-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Class Access Code Bar */}
        <div className="mt-4 p-3 bg-white border-2 border-amber-200 rounded-2xl flex items-center justify-between gap-3 shadow-sm shrink-0">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mã phòng học trực tuyến (Class PIN):
            </div>
            <div className="text-lg font-black text-amber-600 font-mono tracking-wider">
              {classCode}
            </div>
          </div>
          <button
            onClick={handleCopyClassCode}
            className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-black transition-colors flex items-center gap-1 shadow-sm"
          >
            <span>📋</span>
            <span>{copySuccess ? 'Đã sao chép!' : 'Sao chép mã'}</span>
          </button>
        </div>

        {/* Form: Issue new student account */}
        <form onSubmit={handleCreate} className="mt-3.5 p-3.5 bg-amber-100/60 border-2 border-amber-200 rounded-2xl shrink-0">
          <div className="text-xs font-black text-amber-900 mb-2 flex items-center gap-1.5">
            <span>✨</span>
            <span>Cấp tài khoản mới cho học sinh:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-amber-300">
              <span className="text-sm font-bold text-slate-400 mr-1">Avatar:</span>
              <div className="flex gap-1 overflow-x-auto">
                {avatarOptions.map(av => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-transform ${
                      selectedAvatar === av ? 'bg-amber-300 scale-110 shadow-sm border border-amber-500' : 'hover:bg-slate-100'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={newStudentName}
              onChange={e => setNewStudentName(e.target.value)}
              placeholder="Nhập tên học sinh (VD: Bé Lan Anh)..."
              className="flex-1 bg-white border-2 border-amber-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              disabled={!newStudentName.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-black px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 shrink-0"
            >
              + Cấp tài khoản
            </button>
          </div>
        </form>

        {/* Students List */}
        <div className="mt-3 flex-1 min-h-0 flex flex-col">
          <div className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between shrink-0">
            <span>Danh sách tài khoản học sinh đã cấp ({students.length}):</span>
            <span className="text-[11px] text-amber-700 font-bold">Chạm để đăng nhập thử</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {students.map((st) => (
              <div 
                key={st.id}
                className="p-3 rounded-2xl bg-white border-2 border-amber-200/80 hover:border-amber-400 text-xs shadow-sm flex items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0 p-1 bg-amber-50 rounded-xl border border-amber-200">{st.avatar}</span>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 text-sm truncate flex items-center gap-1.5">
                      <span>{st.name}</span>
                      <span className="text-[10px] bg-sky-100 text-sky-800 font-mono px-2 py-0.5 rounded-full font-bold">
                        Mã: {st.code}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                      <span>Lớp: {st.classCode}</span>
                      <span>•</span>
                      <span className="text-amber-600 font-bold">Điểm số: {st.score} ⭐</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Account role switching: Retained solely for Admin */}
                  {isAdmin && onSwitchToStudent && (
                    <button
                      onClick={() => {
                        onSwitchToStudent(st);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white font-extrabold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1"
                      title="Quyền Admin: Chuyển sang giao diện của học sinh này"
                    >
                      <span>👧</span>
                      <span>Vào giao diện bé</span>
                    </button>
                  )}
                  {onDeleteStudent && (
                    <button
                      onClick={() => onDeleteStudent(st.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa tài khoản này"
                      aria-label="Xóa tài khoản"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature note for student role */}
        <div className="mt-3 p-2.5 bg-sky-50 border border-sky-200 rounded-2xl flex items-center gap-2 text-sky-900 text-[11px] font-bold shrink-0">
          <span className="text-base shrink-0">💡</span>
          <span>
            {language === 'vi' 
              ? 'Tài khoản học sinh do giáo viên cấp chỉ bao gồm màn hình chiếu trực tiếp và bảng câu hỏi tương tác, hoàn toàn tinh gọn và phù hợp cho trẻ tiểu học.'
              : 'Student accounts issued by the teacher only feature the live presentation screen and the question-answering board.'}
          </span>
        </div>

        {/* Modal Footer */}
        <div className="mt-3 pt-3 border-t-2 border-amber-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-black text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentAccountsModal;
