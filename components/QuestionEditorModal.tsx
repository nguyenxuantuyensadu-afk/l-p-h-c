/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ClassroomQuestion } from '../types';
import { Language } from '../translations';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: ClassroomQuestion[];
  onSaveQuestions: (updatedQuestions: ClassroomQuestion[]) => void;
  onResetToDefaults: () => void;
  language?: Language;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  questions: initialQuestions,
  onSaveQuestions,
  onResetToDefaults,
  language = 'vi'
}) => {
  const [editedQuestions, setEditedQuestions] = useState<ClassroomQuestion[]>(initialQuestions);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEditedQuestions(JSON.parse(JSON.stringify(initialQuestions)));
      setActiveIdx(0);
      setSaveToast(false);
    }
  }, [isOpen, initialQuestions]);

  if (!isOpen) return null;

  const currentQ = editedQuestions[activeIdx] || editedQuestions[0];

  const handleUpdateCurrentQ = (field: keyof ClassroomQuestion, value: any) => {
    if (!currentQ) return;
    setEditedQuestions(prev => {
      const next = [...prev];
      next[activeIdx] = {
        ...next[activeIdx],
        [field]: value
      };
      return next;
    });
  };

  const handleUpdateOption = (optIdx: number, val: string) => {
    if (!currentQ) return;
    const newOptions = [...currentQ.options];
    newOptions[optIdx] = val;
    handleUpdateCurrentQ('options', newOptions);
  };

  const handleAddNewQuestion = () => {
    const newQNum = editedQuestions.length + 1;
    const newQuestion: ClassroomQuestion = {
      id: `q-custom-${Date.now()}`,
      question: language === 'vi'
        ? `Câu ${newQNum}: Bé hãy quan sát bức tranh và tìm chi tiết thú vị...`
        : `Question ${newQNum}: Observe the projected artwork and find...`,
      options: [
        language === 'vi' ? 'Phương án A (Đáp án mẫu)' : 'Option A (Sample)',
        language === 'vi' ? 'Phương án B' : 'Option B',
        language === 'vi' ? 'Phương án C' : 'Option C',
        language === 'vi' ? 'Phương án D' : 'Option D'
      ],
      correctIndex: 0,
      points: 10,
      explanation: language === 'vi'
        ? 'Chính xác! Bé có đôi mắt quan sát rất tinh tường ⭐!'
        : 'Correct! You have very keen observation skills ⭐!',
      hint: language === 'vi'
        ? 'Bé hãy nhìn kỹ vào các chi tiết màu sắc trên màn hình chiếu nhé!'
        : 'Look closely at the projected colors on the smartboard!',
      stats: [75, 10, 10, 5]
    };

    setEditedQuestions(prev => [...prev, newQuestion]);
    setActiveIdx(editedQuestions.length);
  };

  const handleDeleteQuestion = (idxToDelete: number) => {
    if (editedQuestions.length <= 1) {
      alert(language === 'vi' ? 'Phải giữ ít nhất 1 câu hỏi cho học sinh!' : 'Keep at least 1 question for students!');
      return;
    }
    const nextList = editedQuestions.filter((_, idx) => idx !== idxToDelete);
    setEditedQuestions(nextList);
    setActiveIdx(Math.max(0, idxToDelete - 1));
  };

  const handleSave = () => {
    onSaveQuestions(editedQuestions);
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 800);
  };

  const optionColors = [
    { badge: 'bg-rose-500 text-white', label: 'Đáp án A' },
    { badge: 'bg-amber-500 text-white', label: 'Đáp án B' },
    { badge: 'bg-emerald-500 text-white', label: 'Đáp án C' },
    { badge: 'bg-sky-500 text-white', label: 'Đáp án D' }
  ];

  return (
    <div 
      className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Biên tập câu hỏi lớp học"
    >
      <div 
        className="bg-white rounded-3xl border-4 border-amber-300 max-w-4xl w-full p-4 sm:p-6 shadow-2xl relative text-slate-800 flex flex-col max-h-[92vh] overflow-hidden text-left"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-amber-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-2xl shadow-md border-2 border-white">
              ✏️
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight flex items-center gap-2">
                <span>{language === 'vi' ? 'Biên Tập Câu Hỏi Cho Học Sinh' : 'Teacher Question Editor'}</span>
                <span className="text-[11px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold">
                  👨‍🏫 Dành cho Giáo viên
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                {language === 'vi' 
                  ? 'Giáo viên chỉnh sửa câu hỏi, đáp án đúng và gợi ý — Học sinh sẽ nhận đúng bộ câu hỏi này' 
                  : 'Teacher edits questions, answers, and hints — Students will receive this exact quiz'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (window.confirm(language === 'vi' ? 'Khôi phục lại danh sách câu hỏi gợi ý từ ý tưởng tranh?' : 'Reset to AI suggested questions?')) {
                  onResetToDefaults();
                  onClose();
                }
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold transition-colors"
              title="Khôi phục câu hỏi mẫu gợi ý"
            >
              <span>🔄</span>
              <span>Khôi phục mẫu</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Question Selector Strip */}
        <div className="flex items-center justify-between gap-2 py-3 border-b border-amber-100 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-0">
            {editedQuestions.map((q, idx) => (
              <button
                key={q.id || idx}
                onClick={() => setActiveIdx(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                  activeIdx === idx
                    ? 'bg-amber-400 text-amber-950 shadow-md ring-2 ring-amber-500 scale-105'
                    : 'bg-amber-50 hover:bg-amber-100 text-slate-700 border border-amber-200'
                }`}
              >
                <span>Câu {idx + 1}</span>
                <span className="text-[10px] bg-white/70 px-1.5 py-0.2 rounded-md font-bold text-slate-700">
                  {String.fromCharCode(65 + q.correctIndex)}✓
                </span>
              </button>
            ))}

            <button
              onClick={handleAddNewQuestion}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-colors flex items-center gap-1 shrink-0 shadow-sm"
            >
              <span>+</span>
              <span>Thêm câu hỏi</span>
            </button>
          </div>

          {editedQuestions.length > 1 && (
            <button
              onClick={() => handleDeleteQuestion(activeIdx)}
              className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0 flex items-center gap-1"
              title="Xóa câu hỏi này"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">Xóa câu {activeIdx + 1}</span>
            </button>
          )}
        </div>

        {/* Main Editor Form */}
        {currentQ ? (
          <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 scrollbar-thin">
            
            {/* Question Title & Points */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-amber-50/60 p-3.5 rounded-2xl border-2 border-amber-200">
              <div className="sm:col-span-3">
                <label className="block text-xs font-black text-amber-950 mb-1">
                  1. Nội dung câu hỏi (Hiển thị cho học sinh):
                </label>
                <textarea
                  value={currentQ.question}
                  onChange={e => handleUpdateCurrentQ('question', e.target.value)}
                  rows={2}
                  className="w-full bg-white border-2 border-amber-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Nhập nội dung câu hỏi..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-amber-950 mb-1">
                  Điểm thưởng (⭐):
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={currentQ.points}
                  onChange={e => handleUpdateCurrentQ('points', parseInt(e.target.value) || 10)}
                  className="w-full bg-white border-2 border-amber-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <div className="flex gap-1 mt-1.5">
                  {[5, 10, 20].map(pt => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => handleUpdateCurrentQ('points', pt)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        currentQ.points === pt ? 'bg-amber-400 text-amber-950 font-black' : 'bg-white text-slate-600 border'
                      }`}
                    >
                      {pt}đ
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4 Options Grid */}
            <div className="bg-white p-3.5 rounded-2xl border-2 border-amber-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>2. Bốn phương án lựa chọn (A, B, C, D):</span>
                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                    Bấm chọn nút "Đáp án đúng" bên cạnh phương án chuẩn
                  </span>
                </label>
              </div>

              <div className="space-y-2.5">
                {currentQ.options.map((opt, optIdx) => {
                  const isCorrect = currentQ.correctIndex === optIdx;
                  const color = optionColors[optIdx % 4];

                  return (
                    <div 
                      key={optIdx}
                      className={`p-2.5 rounded-xl border-2 transition-all flex items-center gap-2.5 ${
                        isCorrect 
                          ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-300' 
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      {/* Letter badge */}
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${color.badge}`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>

                      {/* Input */}
                      <input
                        type="text"
                        value={opt}
                        onChange={e => handleUpdateOption(optIdx, e.target.value)}
                        placeholder={`Nhập nội dung cho ${color.label}...`}
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />

                      {/* Correct Answer Selector */}
                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentQ('correctIndex', optIdx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white hover:bg-emerald-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        <span>{isCorrect ? '✓ Đáp án đúng' : 'Chọn làm đáp án đúng'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hint & Explanation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-sky-50/50 p-3.5 rounded-2xl border-2 border-sky-200">
              <div>
                <label className="block text-xs font-black text-sky-950 mb-1 flex items-center gap-1">
                  <span>💡 Gợi ý cho bé (Hint):</span>
                </label>
                <textarea
                  value={currentQ.hint}
                  onChange={e => handleUpdateCurrentQ('hint', e.target.value)}
                  rows={2}
                  className="w-full bg-white border-2 border-sky-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="Gợi ý quan sát để bé trả lời đúng..."
                />
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-950 mb-1 flex items-center gap-1">
                  <span>🎉 Lời khen & Giải thích sau khi chấm (Explanation):</span>
                </label>
                <textarea
                  value={currentQ.explanation}
                  onChange={e => handleUpdateCurrentQ('explanation', e.target.value)}
                  rows={2}
                  className="w-full bg-white border-2 border-emerald-200 rounded-xl p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Lời chúc mừng hoặc giải thích cho bé..."
                />
              </div>
            </div>

          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="pt-3 border-t-2 border-amber-200 flex items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-500 font-bold">
            Tổng cộng: <span className="font-extrabold text-amber-950">{editedQuestions.length} câu hỏi</span> • 
            Điểm tối đa: <span className="font-extrabold text-amber-950">{editedQuestions.reduce((sum, q) => sum + q.points, 0)} ⭐</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>{saveToast ? 'Đã lưu!' : 'Lưu & Áp Dụng Cho Học Sinh'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionEditorModal;
