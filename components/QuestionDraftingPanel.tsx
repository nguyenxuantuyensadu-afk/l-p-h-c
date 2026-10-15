/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ClassroomQuestion } from '../types';
import { Language } from '../translations';

interface QuestionDraftingPanelProps {
  questions: ClassroomQuestion[];
  onSaveQuestions: (updatedQuestions: ClassroomQuestion[]) => void;
  onResetToDefaults: () => void;
  onOpenModal?: () => void;
  language?: Language;
}

export const QuestionDraftingPanel: React.FC<QuestionDraftingPanelProps> = ({
  questions: initialQuestions,
  onSaveQuestions,
  onResetToDefaults,
  onOpenModal,
  language = 'vi'
}) => {
  const [questions, setQuestions] = useState<ClassroomQuestion[]>(initialQuestions);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    setQuestions(initialQuestions);
    if (activeIdx >= initialQuestions.length) {
      setActiveIdx(Math.max(0, initialQuestions.length - 1));
    }
  }, [initialQuestions]);

  const currentQ = questions[activeIdx] || questions[0];

  const handleUpdateCurrentQ = (field: keyof ClassroomQuestion, value: any) => {
    if (!currentQ) return;
    const next = [...questions];
    next[activeIdx] = {
      ...next[activeIdx],
      [field]: value
    };
    setQuestions(next);
    onSaveQuestions(next);
  };

  const handleUpdateOption = (optIdx: number, val: string) => {
    if (!currentQ) return;
    const newOptions = [...currentQ.options];
    newOptions[optIdx] = val;
    handleUpdateCurrentQ('options', newOptions);
  };

  const handleAddNewQuestion = () => {
    const newQNum = questions.length + 1;
    const newQuestion: ClassroomQuestion = {
      id: `q-custom-${Date.now()}`,
      question: language === 'vi'
        ? `Câu ${newQNum}: Bé hãy quan sát bức tranh vừa tạo và tìm chi tiết đặc sắc...`
        : `Question ${newQNum}: Observe the generated artwork and find...`,
      options: [
        language === 'vi' ? 'Phương án A (Đáp án chính xác)' : 'Option A (Correct answer)',
        language === 'vi' ? 'Phương án B' : 'Option B',
        language === 'vi' ? 'Phương án C' : 'Option C',
        language === 'vi' ? 'Phương án D' : 'Option D'
      ],
      correctIndex: 0,
      points: 10,
      explanation: language === 'vi'
        ? 'Chính xác! Bé quan sát bức tranh rất tinh tường và đúng trọng tâm ⭐!'
        : 'Correct! You observed the artwork very carefully ⭐!',
      hint: language === 'vi'
        ? 'Bé hãy nhìn kỹ vào nhân vật và màu sắc nổi bật nhất trên tranh nhé!'
        : 'Look at the most prominent character and colors in the picture!',
      stats: [80, 10, 5, 5]
    };

    const nextList = [...questions, newQuestion];
    setQuestions(nextList);
    onSaveQuestions(nextList);
    setActiveIdx(questions.length);
  };

  const handleDeleteQuestion = (idxToDelete: number) => {
    if (questions.length <= 1) {
      alert(language === 'vi' ? 'Phải giữ lại ít nhất 1 câu hỏi cho học sinh!' : 'Keep at least 1 question!');
      return;
    }
    const nextList = questions.filter((_, idx) => idx !== idxToDelete);
    setQuestions(nextList);
    onSaveQuestions(nextList);
    setActiveIdx(Math.max(0, idxToDelete - 1));
  };

  const handleSave = () => {
    onSaveQuestions(questions);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const optionColors = [
    { badge: 'bg-rose-500 text-white', label: 'Đáp án A' },
    { badge: 'bg-amber-500 text-white', label: 'Đáp án B' },
    { badge: 'bg-emerald-500 text-white', label: 'Đáp án C' },
    { badge: 'bg-sky-500 text-white', label: 'Đáp án D' }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-850 p-3 sm:p-4 text-slate-800 dark:text-slate-100 overflow-y-auto scrollbar-thin">
      
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 shrink-0 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center text-lg font-black shadow-sm shrink-0">
            📝
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-gray-100 truncate flex items-center gap-2">
              <span>{language === 'vi' ? 'Soạn & Biên Tập Câu Hỏi Bài Giảng' : 'Question Drafting & Authoring'}</span>
              <span className="text-[11px] bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.2 rounded-full font-bold shrink-0">
                👨‍🏫 Giáo viên
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {language === 'vi' 
                ? 'Soạn câu hỏi trực tiếp cho tranh vừa tạo — Học sinh sẽ nhận đúng bộ câu hỏi này' 
                : 'Draft quiz questions for the artwork — Students will answer these questions live'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onResetToDefaults}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-xs font-semibold transition-colors flex items-center gap-1"
            title="Khôi phục câu hỏi gợi ý từ tranh"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Khôi phục mẫu</span>
          </button>

          {onOpenModal && (
            <button
              onClick={onOpenModal}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-bold transition-colors flex items-center gap-1 border border-amber-300 shadow-sm"
              title="Mở bảng soạn câu hỏi toàn màn hình"
            >
              <span>🔍</span>
              <span className="hidden sm:inline">Mở rộng</span>
            </button>
          )}
        </div>
      </div>

      {/* Question Selector Tabs */}
      <div className="flex items-center justify-between gap-2 py-2.5 border-b border-gray-100 dark:border-gray-800 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-0">
          {questions.map((q, idx) => (
            <button
              key={q.id || idx}
              onClick={() => setActiveIdx(idx)}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 shrink-0 ${
                activeIdx === idx
                  ? 'bg-amber-400 text-amber-950 shadow-sm ring-2 ring-amber-500 scale-105'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>Câu {idx + 1}</span>
              <span className="text-[10px] bg-white/70 dark:bg-black/30 px-1 rounded font-bold">
                {String.fromCharCode(65 + q.correctIndex)}✓
              </span>
            </button>
          ))}

          <button
            onClick={handleAddNewQuestion}
            className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-colors flex items-center gap-1 shrink-0 shadow-sm"
          >
            <span>+</span>
            <span>Thêm câu</span>
          </button>
        </div>

        {questions.length > 1 && (
          <button
            onClick={() => handleDeleteQuestion(activeIdx)}
            className="text-rose-600 hover:text-rose-800 text-xs font-bold px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 flex items-center gap-1"
            title="Xóa câu hỏi này"
          >
            <span>🗑️</span>
            <span className="hidden sm:inline">Xóa câu {activeIdx + 1}</span>
          </button>
        )}
      </div>

      {/* Editor Body */}
      {currentQ ? (
        <div className="flex-1 py-3 space-y-3">
          
          {/* Question Title & Points */}
          <div className="bg-amber-50/70 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-amber-950 dark:text-amber-200">
                1. Nội dung câu hỏi bé quan sát:
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Điểm:</span>
                {[5, 10, 20].map(pt => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => handleUpdateCurrentQ('points', pt)}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all ${
                      currentQ.points === pt 
                        ? 'bg-amber-400 text-amber-950 font-black shadow-xs' 
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    +{pt} ⭐
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={currentQ.question}
              onChange={e => handleUpdateCurrentQ('question', e.target.value)}
              rows={2}
              className="w-full bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-xl p-2.5 text-xs text-gray-800 dark:text-gray-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Nhập nội dung câu hỏi quan sát theo bức tranh vừa tạo..."
            />
          </div>

          {/* 4 Choices */}
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-gray-900 dark:text-gray-100">
                2. Bốn phương án trả lời (A, B, C, D):
              </label>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                Bấm "Đáp án đúng" để chọn đáp án chuẩn
              </span>
            </div>

            <div className="space-y-2">
              {currentQ.options.map((opt, optIdx) => {
                const isCorrect = currentQ.correctIndex === optIdx;
                const color = optionColors[optIdx % 4];

                return (
                  <div
                    key={optIdx}
                    className={`p-2 rounded-xl border transition-all flex items-center gap-2 ${
                      isCorrect 
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-1 ring-emerald-400' 
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${color.badge}`}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>

                    <input
                      type="text"
                      value={opt}
                      onChange={e => handleUpdateOption(optIdx, e.target.value)}
                      placeholder={`Nhập phương án ${String.fromCharCode(65 + optIdx)}...`}
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-800 dark:text-gray-100 font-medium focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />

                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentQ('correctIndex', optIdx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {isCorrect ? '✓ Đúng' : 'Chọn đúng'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hint & Explanation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-sky-50/60 dark:bg-sky-950/20 p-2.5 rounded-2xl border border-sky-200 dark:border-sky-800">
              <label className="block text-xs font-extrabold text-sky-950 dark:text-sky-200 mb-1">
                💡 Gợi ý cho bé:
              </label>
              <textarea
                value={currentQ.hint}
                onChange={e => handleUpdateCurrentQ('hint', e.target.value)}
                rows={2}
                className="w-full bg-white dark:bg-gray-800 border border-sky-200 dark:border-sky-700 rounded-xl p-2 text-xs text-gray-800 dark:text-gray-100 font-medium focus:outline-none focus:ring-1 focus:ring-sky-400"
                placeholder="Gợi ý quan sát chi tiết tranh..."
              />
            </div>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
              <label className="block text-xs font-extrabold text-emerald-950 dark:text-emerald-200 mb-1">
                🎉 Lời khen & giải thích:
              </label>
              <textarea
                value={currentQ.explanation}
                onChange={e => handleUpdateCurrentQ('explanation', e.target.value)}
                rows={2}
                className="w-full bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-700 rounded-xl p-2 text-xs text-gray-800 dark:text-gray-100 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="Lời khen thưởng khi bé trả lời đúng..."
              />
            </div>
          </div>

        </div>
      ) : null}

      {/* Footer bar */}
      <div className="pt-2.5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0 gap-2">
        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold">
          {questions.length} câu hỏi • Tổng: {questions.reduce((sum, q) => sum + q.points, 0)} ⭐
        </span>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
        >
          <span>💾</span>
          <span>{saveToast ? 'Đã lưu thành công!' : 'Lưu câu hỏi cho học sinh'}</span>
        </button>
      </div>

    </div>
  );
};

export default QuestionDraftingPanel;
