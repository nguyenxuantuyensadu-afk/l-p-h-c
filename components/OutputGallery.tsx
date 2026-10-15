
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { Tooltip } from './Tooltip';
import { GeneratedImage, Mode, BeliefState } from '../types';
import { Language, translations } from '../translations';
import OnlineClassroomModal from './OnlineClassroomModal';

const ErrorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

interface OutputDisplayProps {
  images: GeneratedImage[];
  story: string | null;
  mode: Mode;
  isLoading: boolean;
  error: string | null;
  isOutdated: boolean;
  requiresApiKey?: boolean;
  onSelectKey?: () => void;
  aspectRatio?: string;
  selectedModel?: string;
  prompt?: string;
  beliefGraph?: BeliefState | null;
  onOpenClassroom?: (index?: number) => void;
  onOpenQuestionEditor?: () => void;
  questionsCount?: number;
  accurateImageIndices?: number[];
  onAccurateChange?: (indices: number[]) => void;
  onUseAsReference?: (imageDataUrl: string) => void;
  onApplyToPrompt?: () => void;
  selectedImageIndex?: number;
  onSelectImageIndex?: (index: number) => void;
  language?: Language;
}

const OutputDisplay: React.FC<OutputDisplayProps> = ({ 
    images, 
    story, 
    mode, 
    isLoading, 
    error, 
    isOutdated,
    requiresApiKey,
    onSelectKey,
    aspectRatio = '16:9',
    selectedModel,
    prompt = '',
    beliefGraph,
    onOpenClassroom,
    onOpenQuestionEditor,
    questionsCount,
    accurateImageIndices: controlledAccurateIndices,
    onAccurateChange,
    onUseAsReference,
    onApplyToPrompt,
    selectedImageIndex: propSelectedImageIndex,
    onSelectImageIndex,
    language = 'vi'
}) => {
  const t = translations[language] || translations.vi;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [internalSelectedImageIndex, setInternalSelectedImageIndex] = useState<number>(0);
  const selectedImageIndex = propSelectedImageIndex !== undefined ? propSelectedImageIndex : internalSelectedImageIndex;

  const handleSelectImageIndex = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInternalSelectedImageIndex(index);
    onSelectImageIndex?.(index);
  };
  const [internalAccurateIndices, setInternalAccurateIndices] = useState<number[]>([0]);
  const [justSelectedAccurate, setJustSelectedAccurate] = useState<number | null>(null);
  const [showClassroom, setShowClassroom] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showApplyConfirmation, setShowApplyConfirmation] = useState(false);
  const modalCloseButtonRef = useRef<HTMLButtonElement>(null);
  const confirmationCloseButtonRef = useRef<HTMLButtonElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const lastActiveElement = useRef<HTMLElement | null>(null);

  const placeholderCount = 2;
  const accurateImageIndices = controlledAccurateIndices ?? internalAccurateIndices;

  // Set default accurate image index to first valid image when images change
  useEffect(() => {
    const firstValidIdx = images.findIndex(img => !!img.url);
    if (firstValidIdx !== -1) {
      const initial = [firstValidIdx];
      setInternalAccurateIndices(initial);
      onAccurateChange?.(initial);
    }
  }, [images]);

  const toggleAccurateImage = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updated: number[];
    if (accurateImageIndices.includes(index)) {
      updated = accurateImageIndices.filter(i => i !== index);
      if (updated.length === 0) updated = [index];
    } else {
      updated = [...accurateImageIndices, index];
      setJustSelectedAccurate(index);
      handleSelectImageIndex(index);
      setTimeout(() => setJustSelectedAccurate(null), 6000);
    }
    setInternalAccurateIndices(updated);
    onAccurateChange?.(updated);
  };

  const handleOpenClassroom = (index: number = 0, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleSelectImageIndex(index);
    if (onOpenClassroom) {
      onOpenClassroom(index);
    } else {
      setShowClassroom(true);
    }
  };
  
  // Trap focus for Lightbox
  useEffect(() => {
    if (selectedImage && lightboxRef.current) {
        lastActiveElement.current = document.activeElement as HTMLElement;
        const modal = lightboxRef.current;
        // Focus first button (Close)
        if (modalCloseButtonRef.current) modalCloseButtonRef.current.focus();

        const handleTab = (e: KeyboardEvent) => {
            const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (e.key === 'Tab') {
                if (!modal.contains(document.activeElement)) {
                    e.preventDefault();
                    if (firstElement) firstElement.focus();
                    return;
                }

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
            if (e.key === 'Escape') {
                setSelectedImage(null);
            }
        };

        document.addEventListener('keydown', handleTab);
        return () => {
            document.removeEventListener('keydown', handleTab);
            if (lastActiveElement.current) lastActiveElement.current.focus();
        };
    }
  }, [selectedImage]);

  // Trap focus for Confirmation
  useEffect(() => {
    if (showApplyConfirmation && confirmationRef.current) {
        lastActiveElement.current = document.activeElement as HTMLElement;
        const modal = confirmationRef.current;
        // Focus cancel button
        if (confirmationCloseButtonRef.current) confirmationCloseButtonRef.current.focus();

        const handleTab = (e: KeyboardEvent) => {
            const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (e.key === 'Tab') {
                if (!modal.contains(document.activeElement)) {
                    e.preventDefault();
                    if (firstElement) firstElement.focus();
                    return;
                }

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
            if (e.key === 'Escape') {
                setShowApplyConfirmation(false);
            }
        };

        document.addEventListener('keydown', handleTab);
        return () => {
            document.removeEventListener('keydown', handleTab);
            if (lastActiveElement.current) lastActiveElement.current.focus();
        };
    }
  }, [showApplyConfirmation]);

  const downloadStory = () => {
    if (!story) return;
    const fileName = "generated_story.txt";
    const element = document.createElement("a");
    const file = new Blob([story], {type: 'text/plain'});
    const url = URL.createObjectURL(file);
    element.href = url;
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const copyStory = () => {
      if (!story) return;
      navigator.clipboard.writeText(story);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  const handleConfirmApply = () => {
      if (onApplyToPrompt) {
          onApplyToPrompt();
      }
      setShowApplyConfirmation(false);
  };

  const renderImageContent = () => {
      if (isLoading) {
          return Array(placeholderCount).fill(null).map((_, index) => (
              <div key={index} className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="flex flex-col items-center text-gray-500 dark:text-gray-400">
                      <svg className="animate-spin h-8 w-8 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="mt-2 text-base text-center px-4">{t.generatingImagesMsg}</span>
                  </div>
              </div>
          ));
      }

      if (images.length > 0) {
          const content = images.map((image, index) => {
              if (image.url) {
                  const isAccurate = accurateImageIndices.includes(index);
                  const isProjectedToStudents = selectedImageIndex === index;
                  return (
                      <div 
                        key={index} 
                        className={`aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden relative shadow-sm border transition-all duration-200 group ${
                          isProjectedToStudents
                            ? 'border-emerald-500 ring-4 ring-emerald-400/80 shadow-emerald-500/20 shadow-xl'
                            : isAccurate 
                              ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-amber-500/10 shadow-lg' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                          {/* Image preview with click to view lightbox */}
                          <img 
                            src={image.url} 
                            alt="" 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                            onClick={() => setSelectedImage(image.url)}
                          />

                          {/* Top Badges & Quick Controls */}
                          <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-auto">
                              <div className="flex items-center gap-1">
                                {/* Accurate Image Toggle Button */}
                                <button
                                  onClick={(e) => toggleAccurateImage(index, e)}
                                  className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 backdrop-blur-md transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                                    isAccurate
                                      ? 'bg-amber-500 text-black border border-amber-300 scale-105'
                                      : 'bg-black/60 hover:bg-black/80 text-white/90 border border-white/20'
                                  }`}
                                  title={isAccurate ? t.markedAsAccurate : t.markAsAccurate}
                                  aria-label={isAccurate ? t.markedAsAccurate : t.markAsAccurate}
                                >
                                  <span>⭐</span>
                                  <span className="text-[10px] hidden sm:inline">{isAccurate ? t.accurateBadge : t.markAsAccurate}</span>
                                </button>

                                {/* Select as the SINGLE image projected to students */}
                                <button
                                  onClick={(e) => handleSelectImageIndex(index, e)}
                                  className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-md transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                                    isProjectedToStudents
                                      ? 'bg-emerald-600 text-white border border-emerald-300 ring-2 ring-emerald-300/80 scale-105'
                                      : 'bg-black/60 hover:bg-emerald-600 text-white/90 border border-white/20'
                                  }`}
                                  title={isProjectedToStudents ? 'Đang chọn tranh này chiếu duy nhất cho học sinh' : 'Chọn tranh này làm bức tranh duy nhất chiếu cho học sinh'}
                                  aria-label={isProjectedToStudents ? 'Đang chiếu lớp' : 'Chọn chiếu học sinh'}
                                >
                                  <span>📽️</span>
                                  <span className="text-[10px] font-black">
                                    {isProjectedToStudents ? 'Đang chiếu lớp' : 'Chiếu học sinh'}
                                  </span>
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                  {/* Direct Question Editor Button for this image */}
                                  {onOpenQuestionEditor && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenQuestionEditor();
                                      }}
                                      className="w-7 h-7 rounded-full bg-black/60 hover:bg-emerald-600 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all shadow-md hover:scale-110"
                                      title="Soạn câu hỏi cho tranh này"
                                      aria-label="Soạn câu hỏi"
                                    >
                                      <span className="text-xs">✏️</span>
                                    </button>
                                  )}

                                  {/* Direct Classroom Button */}
                                  <button
                                    onClick={(e) => handleOpenClassroom(index, e)}
                                    className="w-7 h-7 rounded-full bg-black/60 hover:bg-blue-600 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all shadow-md hover:scale-110"
                                    title={t.openClassroomTooltip}
                                    aria-label={t.openClassroomTooltip}
                                  >
                                    <span className="text-xs">🎓</span>
                                  </button>

                              </div>
                          </div>

                          {/* Bottom Hover Action Overlay */}
                          <div 
                            onClick={() => setSelectedImage(image.url)}
                            className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                              <span className="text-white text-xs font-medium flex items-center gap-1.5">
                                <span>🔍</span>
                                <span>{language === 'vi' ? 'Xem chi tiết & Thuyết trình' : 'View & Present'}</span>
                              </span>
                              <span className="text-white/80 text-[10px] bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                HD
                              </span>
                          </div>
                      </div>
                  );
              } else {
                  return (
                     <div key={index} className="aspect-square bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 text-center p-2">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                         </svg>
                         <span className="text-sm font-semibold">{t.generationFailed}</span>
                         {image.error && <span className="text-xs mt-1 text-red-400 line-clamp-3">{image.error}</span>}
                     </div>
                  );
              }
          });
          
          return content;
      }

      // When no images yet: Render interactive preview cards for Classroom and Question Drafting!
      return (
          <>
              {/* Card 1: Presentation Classroom Preview Launcher (Lớp học thuyết trình) */}
              <div 
                  onClick={() => handleOpenClassroom(0)}
                  className="aspect-square bg-gradient-to-br from-indigo-900/40 via-slate-900/50 to-black/70 rounded-xl border border-indigo-500/30 p-4 flex flex-col justify-between cursor-pointer hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/15 transition-all group relative overflow-hidden"
              >
                  <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center text-sm shadow">
                          🎓
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/90 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                          {language === 'vi' ? 'Trực tuyến' : 'Live'}
                      </span>
                  </div>
                  <div>
                      <h4 className="text-sm font-bold text-gray-100 group-hover:text-indigo-300 transition-colors mb-1">
                          {t.classroomTitle}
                      </h4>
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                          {t.classroomSubtitle}
                      </p>
                  </div>
                  <button className="w-full bg-indigo-600/30 group-hover:bg-indigo-600 group-hover:text-white text-indigo-200 text-xs font-semibold py-1.5 px-3 rounded-lg border border-indigo-500/40 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                      <span>🎓</span>
                      <span>{t.openClassroom}</span>
                  </button>
              </div>

              {/* Card 2: Question Drafting Launcher (Soạn câu hỏi bài giảng) */}
              <div 
                  onClick={() => onOpenQuestionEditor ? onOpenQuestionEditor() : handleOpenClassroom(0)}
                  className="aspect-square bg-gradient-to-br from-emerald-900/40 via-slate-900/50 to-black/70 rounded-xl border border-emerald-500/30 p-4 flex flex-col justify-between cursor-pointer hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/15 transition-all group relative overflow-hidden"
              >
                  <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center text-sm shadow">
                          ✏️
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {questionsCount ? `${questionsCount} câu` : (language === 'vi' ? 'Sẵn sàng' : 'Ready')}
                      </span>
                  </div>
                  <div>
                      <h4 className="text-sm font-bold text-gray-100 group-hover:text-emerald-300 transition-colors mb-1">
                          {language === 'vi' ? 'Soạn Câu Hỏi Tương Tác' : 'Draft Interactive Questions'}
                      </h4>
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                          {language === 'vi' ? 'Biên tập câu hỏi trắc nghiệm, đáp án đúng, gợi ý và lời khen dành cho học sinh' : 'Edit multiple choice questions, correct answers, hints and praise for students'}
                      </p>
                  </div>
                  <button className="w-full bg-emerald-600/30 group-hover:bg-emerald-600 group-hover:text-white text-emerald-200 text-xs font-semibold py-1.5 px-3 rounded-lg border border-emerald-500/40 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                      <span>✏️</span>
                      <span>{language === 'vi' ? 'Soạn & Biên tập câu hỏi' : 'Draft Questions'}</span>
                  </button>
              </div>
          </>
      );
  };

  const renderStoryContent = () => {
      if (isLoading) {
          return (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                   <svg className="animate-spin h-8 w-8 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="mt-2 text-base">{t.writingStoryMsg}</span>
              </div>
          );
      }
      if(story) {
          return (
              <div className="prose prose-base dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
                  {story.split('\n').map((paragraph, index) => <p key={index} className="text-gray-800 dark:text-gray-200">{paragraph}</p>)}
              </div>
          )
      }
      return (
        <div className="h-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 p-8 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium">{t.storyPlaceholderMsg}</p>
        </div>
      );
  };
  
  const renderError = (errorMessage: string) => {
      const isQuotaOrKey = errorMessage.includes("429") || 
                           errorMessage.includes("RESOURCE_EXHAUSTED") || 
                           errorMessage.includes("Quota") || 
                           errorMessage.includes("Hạn mức") ||
                           errorMessage.includes("hạn mức") ||
                           errorMessage.includes("API key") ||
                           errorMessage.includes("Khóa API");

      return (
          <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-1">
                  <div className="bg-red-100 dark:bg-red-900/40 p-1.5 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                  </div>
                  <span className="text-base font-bold text-red-700 dark:text-red-300">
                      {isQuotaOrKey ? (t.quotaExceededTitle || t.generationFailed) : t.generationFailed}
                  </span>
              </div>
              <div className="prose prose-base dark:prose-invert max-w-none p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
                  {errorMessage.split('\n').map((paragraph, index) => (
                      <p key={index} className="text-red-700 dark:text-red-300 mb-2 last:mb-0 leading-relaxed">{paragraph}</p>
                  ))}

                  {isQuotaOrKey && onSelectKey && (
                      <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-800/60 flex flex-wrap items-center gap-3 not-prose">
                          <button
                              onClick={onSelectKey}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.543 17.543A2 2 0 0110.129 18H9a2 2 0 01-2-2v-1a2 2 0 01.586-1.414l5.223-5.223A2 2 0 0014 9a2 2 0 012-2z" />
                              </svg>
                              <span>{t.selectApiKey}</span>
                          </button>
                          
                          <a
                              href="https://ai.google.dev/gemini-api/docs/rate-limits"
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                              {t.learnMoreBilling}
                          </a>
                      </div>
                  )}
              </div>
          </div>
      );
  };
  
  if (requiresApiKey) {
      const title = t.galleryImageTitle;
      const modelName = 'Nano Banana 2 / Nano Banana Pro';
      return (
         <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-full border border-gray-200 dark:border-gray-700 flex flex-col relative overflow-hidden transition-colors duration-200">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2 flex-shrink-0">
                 <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h2>
            </div>
            <div className="h-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg flex flex-col items-center justify-center p-8 text-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.543 17.543A2 2 0 0110.129 18H9a2 2 0 01-2-2v-1a2 2 0 01.586-1.414l5.223-5.223A2 2 0 0014 9a2 2 0 012-2z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{t.billingRequiredTitle}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm max-w-sm mb-6">
                    {t.billingRequiredDesc(modelName)}
                    <br/>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline mt-2 inline-block">{t.learnMoreBilling}</a>
                </p>
                <button 
                    onClick={onSelectKey}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-normal py-2 px-6 rounded-lg transition-colors shadow-md flex items-center gap-2"
                >
                    <span>{t.selectApiKey}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>
            </div>
         </div>
      );
  }

  const firstImageError = mode === 'image' ? images.find(img => img.error)?.error : null;
  const displayError = error || firstImageError;

  return (
    <>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-full border border-gray-200 dark:border-gray-700 flex flex-col relative overflow-hidden transition-colors duration-200">
            <div className="flex justify-between items-center mb-3 border-b border-gray-100 dark:border-gray-700 pb-2 flex-shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 truncate">
                        {mode === 'image' ? t.galleryImageTitle : t.galleryStoryTitle}
                    </h2>
                    {mode === 'image' && images.some(img => !!img.url) && !isLoading && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                            ⭐ {accurateImageIndices.length} {t.markedAsAccurate}
                        </span>
                    )}
                </div>

                {/* Header Action Buttons for Presentation Classroom and Question Drafting */}
                {mode === 'image' && !isLoading && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Question Drafting Button right on the Image Gallery */}
                        {onOpenQuestionEditor && (
                            <button
                                onClick={onOpenQuestionEditor}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                title="Soạn và biên tập câu hỏi trực tiếp cho tranh vừa tạo"
                            >
                                <span className="text-sm">✏️</span>
                                <span>Soạn câu hỏi {questionsCount ? `(${questionsCount})` : ''}</span>
                            </button>
                        )}

                        {/* Classroom Button (Lớp học thuyết trình) */}
                        <button
                            onClick={() => handleOpenClassroom(accurateImageIndices[0] ?? 0)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            title={t.openClassroomTooltip}
                        >
                            <span className="text-sm">🎓</span>
                            <span>{t.openClassroom}</span>
                        </button>
                    </div>
                )}

                {mode === 'story' && story && !isLoading && (
                    <div className="flex gap-2">
                         {onApplyToPrompt && (
                            <Tooltip content={t.useAsPromptTooltip}>
                                <button 
                                    onClick={() => setShowApplyConfirmation(true)} 
                                    className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" 
                                    aria-label={t.useAsPromptTooltip}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip content={isCopied ? t.copied : t.copyStory}>
                            <button 
                                onClick={copyStory} 
                                className={`p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${isCopied ? 'text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300' : 'text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'}`} 
                                aria-label={isCopied ? t.copied : t.copyStory}
                            >
                                {isCopied ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </button>
                        </Tooltip>
                        <Tooltip content={t.downloadText} position="bottom-right">
                            <button 
                                onClick={downloadStory} 
                                className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded" 
                                aria-label={t.downloadText}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                        </Tooltip>
                    </div>
                )}
            </div>

            {/* Just Selected Accurate Image Notification Toast */}
            {justSelectedAccurate !== null && (
                <div className="mb-2.5 p-2 px-3 rounded-xl bg-amber-500 text-black flex items-center justify-between text-xs font-semibold shadow-md animate-bounce">
                    <span className="flex items-center gap-1.5">
                        <span>⭐</span>
                        <span>{language === 'vi' ? `Đã chọn Ảnh ${justSelectedAccurate + 1} làm ảnh chính xác!` : `Image #${justSelectedAccurate + 1} marked as accurate!`}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handleOpenClassroom(justSelectedAccurate)}
                            className="bg-indigo-950 text-white hover:bg-black px-3 py-1 rounded-lg text-[11px] font-bold shadow-sm transition-colors"
                        >
                            🎓 {language === 'vi' ? 'Đưa vào lớp học thuyết trình' : 'Present in class'}
                        </button>
                    </div>
                </div>
            )}

            {/* Prominent Classroom Banner (Lớp học thuyết trình) */}
            {mode === 'image' && images.some(img => !!img.url) && !isLoading && (
                <div className="mb-3 p-2.5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-blue-500/15 to-purple-500/15 border border-indigo-500/30 dark:border-indigo-400/30 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl">🎓</span>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 truncate">
                                <span>{t.classroomTitle}</span>
                                <span className="text-[10px] bg-indigo-500 text-white font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                                    ⭐ {language === 'vi' ? `Ảnh ${accurateImageIndices[0] !== undefined ? accurateImageIndices[0] + 1 : 1} sẵn sàng` : `Image #${accurateImageIndices[0] !== undefined ? accurateImageIndices[0] + 1 : 1} ready`}
                                </span>
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                {language === 'vi' ? 'Chiếu lên bài giảng, bảng thông minh tương tác & chấm điểm học sinh' : 'Present onto large screen with interactive student questions'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {onOpenQuestionEditor && (
                            <button
                                onClick={onOpenQuestionEditor}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                            >
                                <span>✏️</span>
                                <span>{language === 'vi' ? 'Soạn câu hỏi' : 'Draft Questions'}</span>
                            </button>
                        )}
                        <button
                            onClick={() => handleOpenClassroom(accurateImageIndices[0] ?? 0)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                        >
                            <span>🎓</span>
                            <span>{t.openClassroom}</span>
                        </button>
                    </div>
                </div>
            )}
            
            <div className="flex-grow min-h-0 relative">
                {displayError ? (
                    <div className="h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-red-300 dark:scrollbar-thumb-red-600">
                        {renderError(displayError)}
                    </div>
                ) : (
                    mode === 'image' 
                    ? (
                        <div className="h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                                {renderImageContent()}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                            {renderStoryContent()}
                        </div>
                    )
                )}
                
                {isOutdated && !isLoading && !requiresApiKey && (images.length > 0 || story) && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-lg transition-all duration-300 pointer-events-none">
                        <div className="bg-white dark:bg-gray-800 px-6 py-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 text-center transform scale-100 pointer-events-auto">
                            <div className="text-amber-500 mb-2 flex justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-xl">{t.resultsOutdatedTitle}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-base mt-1">{t.resultsOutdatedDesc}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {selectedImage && (
            <div ref={lightboxRef} className="fixed inset-0 z-[2000] bg-black/95 flex flex-col backdrop-blur-sm overflow-y-auto" onClick={() => setSelectedImage(null)} role="dialog" aria-modal="true" aria-label="Image Preview" tabIndex={-1}>
                <button 
                    ref={modalCloseButtonRef}
                    onClick={() => setSelectedImage(null)}
                    className="fixed top-4 right-4 z-[2010] text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-all backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white"
                    aria-label="Close Preview"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                
                <div className="m-auto w-full max-w-7xl flex flex-col p-4 md:p-8 pointer-events-none">
                    <img 
                        src={selectedImage} 
                        alt="Full view" 
                        className="w-auto h-auto max-w-full object-contain rounded-lg shadow-2xl pointer-events-auto mx-auto"
                        onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div className="mt-6 flex flex-wrap justify-center gap-4 pointer-events-auto flex-shrink-0 bg-black/20 p-3 rounded-2xl backdrop-blur-md border border-white/10 mx-auto" onClick={(e) => e.stopPropagation()}>
                        {onOpenQuestionEditor && (
                            <button
                                onClick={() => {
                                    setSelectedImage(null);
                                    onOpenQuestionEditor();
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-full transition-all flex items-center gap-2 shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            >
                                <span className="text-base">✏️</span>
                                <span>Soạn câu hỏi {questionsCount ? `(${questionsCount})` : ''}</span>
                            </button>
                        )}
                        {/* Presentation Classroom Button (Lớp học thuyết trình) */}
                        <button
                            onClick={() => {
                                const currentIdx = images.findIndex(img => img.url === selectedImage);
                                setSelectedImage(null);
                                handleOpenClassroom(currentIdx !== -1 ? currentIdx : 0);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-full transition-all flex items-center gap-2 shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            <span className="text-base">🎓</span>
                            <span>{t.openClassroom}</span>
                        </button>
                        {/* Select to Project to Students Button */}
                        <button
                            onClick={() => {
                                const currentIdx = images.findIndex(img => img.url === selectedImage);
                                if (currentIdx !== -1) {
                                    handleSelectImageIndex(currentIdx);
                                }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-full transition-all flex items-center gap-2 shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            title="Chọn tranh này làm bức tranh duy nhất chiếu cho học sinh"
                        >
                            <span className="text-base">📽️</span>
                            <span>Chiếu tranh này cho học sinh</span>
                        </button>
                        {onUseAsReference && (
                          <button 
                              onClick={() => {
                                onUseAsReference(selectedImage);
                                setSelectedImage(null);
                              }}
                              className="bg-blue-600 text-white px-5 py-2 rounded-full font-normal hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {t.useAsReference}
                          </button>
                        )}
                        <a 
                            href={selectedImage} 
                            download="generated-image.jpg"
                            className="bg-white text-gray-900 px-5 py-2 rounded-full font-normal hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-white"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {t.downloadImage}
                        </a>
                    </div>
                </div>
            </div>
        )}

        {/* Online Virtual Classroom Modal (Lớp Học Thuyết Trình) */}
        <OnlineClassroomModal
            isOpen={showClassroom}
            onClose={() => setShowClassroom(false)}
            images={images}
            initialImageIndex={selectedImageIndex}
            prompt={prompt}
            beliefGraph={beliefGraph}
            aspectRatio={aspectRatio}
            selectedModel={selectedModel}
            language={language}
        />

        {showApplyConfirmation && (
            <div ref={confirmationRef} className="fixed inset-0 z-[3000] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowApplyConfirmation(false)} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" tabIndex={-1}>
                <div 
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 relative border border-gray-200 dark:border-gray-700 transform transition-all scale-100" 
                    onClick={e => e.stopPropagation()}
                >
                    <h3 id="confirm-modal-title" className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{t.replacePromptTitle}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                        {t.replacePromptDesc}
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button 
                            ref={confirmationCloseButtonRef}
                            onClick={() => setShowApplyConfirmation(false)}
                            className="px-4 py-2 rounded-lg text-sm font-normal text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            {t.cancel}
                        </button>
                        <button 
                            onClick={handleConfirmApply}
                            className="px-4 py-2 rounded-lg text-sm font-normal text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {t.yesReplace}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default OutputDisplay;
