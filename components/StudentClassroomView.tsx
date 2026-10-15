/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeneratedImage, BeliefState, StudentAccount, ClassroomQuestion } from '../types';
import { Language, translations } from '../translations';
import { getDefaultClassroomQuestions } from '../services/classroomQuestions';

interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  role: 'teacher' | 'student' | 'system';
  text: string;
  time: string;
}

interface StudentClassroomViewProps {
  student: StudentAccount;
  images: GeneratedImage[];
  selectedImage?: GeneratedImage;
  initialImageIndex?: number;
  prompt: string;
  beliefGraph?: BeliefState | null;
  selectedModel?: string;
  isTeacherProjecting?: boolean;
  onSwitchToTeacher: () => void;
  studentsList?: StudentAccount[];
  onSelectStudent?: (student: StudentAccount) => void;
  questions?: ClassroomQuestion[];
  language?: Language;
  onLogout?: () => void;
  isAdmin?: boolean;
  onAnswerQuestion?: (studentId: string, pointsEarned: number, questionText: string, isCorrect: boolean) => void;
  onRaiseHand?: (studentId: string) => void;
  onToggleMic?: (studentId: string, isMicOn: boolean) => void;
  onToggleCamera?: (studentId: string, isCameraOn: boolean) => void;
}

export const StudentClassroomView: React.FC<StudentClassroomViewProps> = ({
  student,
  images,
  selectedImage,
  initialImageIndex = 0,
  prompt,
  beliefGraph,
  selectedModel = 'gemini-3.1-flash-lite-image',
  isTeacherProjecting = true,
  onSwitchToTeacher,
  studentsList = [],
  onSelectStudent,
  questions: propQuestions,
  language = 'vi',
  onLogout,
  isAdmin = false,
  onAnswerQuestion,
  onRaiseHand,
  onToggleMic,
  onToggleCamera,
}) => {
  const t = translations[language] || translations.vi;
  const validImages = images.filter((img): img is GeneratedImage & { url: string } => !!img.url);
  // On the student page, only the single image selected by the teacher is displayed
  const currentImage: (GeneratedImage & { url: string }) | null = 
    (selectedImage && selectedImage.url ? (selectedImage as GeneratedImage & { url: string }) : null) || 
    validImages[0] || 
    null;
  const [showSwitchStudentModal, setShowSwitchStudentModal] = useState(false);

  // Student Score & Answers
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [gradedQuestions, setGradedQuestions] = useState<Record<number, boolean>>({});
  const [studentScore, setStudentScore] = useState(student.score || 0);
  const [showScoreSummary, setShowScoreSummary] = useState(false);

  // Student Interaction: Raise Hand & Floating reactions
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; left: number }[]>([]);

  // Discussion chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio Context & Microphone
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isMicOn, setIsMicOn] = useState<boolean>(false);
  const [micAudioVolume, setMicAudioVolume] = useState<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnimRef = useRef<number | null>(null);
  const [studentToast, setStudentToast] = useState<{ icon: string; text: string } | null>(null);

  // Video Call & Student Camera State
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const studentVideoRef = useRef<HTMLVideoElement | null>(null);
  const [showFullVideoCallModal, setShowFullVideoCallModal] = useState<boolean>(false);
  const [isVideoBarCollapsed, setIsVideoBarCollapsed] = useState<boolean>(false);

  // Mobile layout state: Tab toggle between Projector and Quiz on phones
  const [mobileStudentTab, setMobileStudentTab] = useState<'projector' | 'quiz'>('projector');
  const [showMobileStudentMenu, setShowMobileStudentMenu] = useState<boolean>(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Questions authored/edited by Teacher (Giáo viên biên tập)
  const [questions, setQuestions] = useState<ClassroomQuestion[]>(() =>
    propQuestions && propQuestions.length > 0
      ? propQuestions
      : getDefaultClassroomQuestions(prompt, beliefGraph, selectedModel, language)
  );

  useEffect(() => {
    if (propQuestions && propQuestions.length > 0) {
      setQuestions(propQuestions);
    }
  }, [propQuestions]);

  useEffect(() => {
    const generatedQuestions = propQuestions && propQuestions.length > 0
      ? propQuestions
      : getDefaultClassroomQuestions(prompt, beliefGraph, selectedModel, language);

    setQuestions(generatedQuestions);


    setChatMessages([
      {
        id: '1',
        sender: 'Giáo viên',
        avatar: '👨‍🏫',
        role: 'teacher',
        text: language === 'vi' ? 'Thầy/Cô đã phát sóng bức tranh AI lên màn hình chiếu. Các bạn nhỏ hãy quan sát và làm bài tập nhé!' : 'The teacher broadcast is live! Observe the screen and complete the quiz.',
        time: '10:00'
      },
      {
        id: '2',
        sender: student.name,
        avatar: student.avatar,
        role: 'student',
        text: language === 'vi' ? 'Em đã vào phòng học và sẵn sàng rồi ạ! 🌟' : 'I am in class and ready! 🌟',
        time: '10:01'
      }
    ]);
  }, [prompt, beliefGraph, selectedModel, language, student.name, student.avatar]);

  // Audio chimes
  const playScoreChime = useCallback((isCorrect: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const now = ctx.currentTime;

      if (isCorrect) {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.18, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.55);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.35);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      console.warn("Chime error", e);
    }
  }, []);

  // Microphone audio feedback
  const playMicFeedback = useCallback((turnOn: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      if (turnOn) {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } else {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch (e) {
      console.warn("Student mic feedback error", e);
    }
  }, []);

  const toggleMicrophone = useCallback(async () => {
    if (isMicOn) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      if (micAnimRef.current) {
        cancelAnimationFrame(micAnimRef.current);
        micAnimRef.current = null;
      }
      setMicAudioVolume(0);
      setIsMicOn(false);
      playMicFeedback(false);
      setStudentToast({
        icon: '🔇',
        text: language === 'vi' ? 'Đã tắt micro' : 'Microphone muted'
      });
      setTimeout(() => setStudentToast(null), 3000);
      if (onToggleMic) {
        onToggleMic(student.id, false);
      }
    } else {
      playMicFeedback(true);
      setIsMicOn(true);
      setStudentToast({
        icon: '🎙️',
        text: language === 'vi' ? 'Đã bật micro! Bé hãy tự tin phát biểu cho cô và các bạn nghe nhé!' : 'Microphone active! Speak to your class!'
      });
      setTimeout(() => setStudentToast(null), 3500);
      if (onToggleMic) {
        onToggleMic(student.id, true);
      }
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = stream;
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            const buffer = new Uint8Array(analyser.frequencyBinCount);
            const checkVolume = () => {
              analyser.getByteFrequencyData(buffer);
              let sum = 0;
              for (let i = 0; i < buffer.length; i++) sum += buffer[i];
              const avg = sum / buffer.length;
              setMicAudioVolume(Math.min(100, Math.round((avg / 128) * 100)));
              micAnimRef.current = requestAnimationFrame(checkVolume);
            };
            checkVolume();
          }
        }
      } catch (e) {
        console.warn("Student mic capture fallback", e);
      }
    }
  }, [isMicOn, language, onToggleMic, playMicFeedback, student.id]);

  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      if (micAnimRef.current) {
        cancelAnimationFrame(micAnimRef.current);
      }
    };
  }, []);

  // Toggle Student Camera (Bật / Tắt Camera Học Sinh)
  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getVideoTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      if (studentVideoRef.current) {
        studentVideoRef.current.srcObject = null;
      }
      setIsCameraOn(false);
      playMicFeedback(false);
      setStudentToast({
        icon: '📷',
        text: language === 'vi' ? 'Đã tắt camera của bé' : 'Camera turned off'
      });
      setTimeout(() => setStudentToast(null), 3000);
      if (onToggleCamera) {
        onToggleCamera(student.id, false);
      }
    } else {
      playMicFeedback(true);
      setStudentToast({
        icon: '📹',
        text: language === 'vi' ? 'Đang mở camera cho bé...' : 'Starting camera...'
      });
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
          });
          cameraStreamRef.current = stream;
          if (studentVideoRef.current) {
            studentVideoRef.current.srcObject = stream;
          }
          setIsCameraOn(true);
          setStudentToast({
            icon: '📹',
            text: language === 'vi' ? 'Camera đã bật! Cô và cả lớp đang nhìn thấy bé!' : 'Camera active!'
          });
          if (onToggleCamera) {
            onToggleCamera(student.id, true);
          }
        } else {
          setIsCameraOn(true);
          setStudentToast({
            icon: '📹',
            text: language === 'vi' ? 'Đã bật camera mô phỏng của bé' : 'Camera active'
          });
          if (onToggleCamera) {
            onToggleCamera(student.id, true);
          }
        }
      } catch (e) {
        console.warn("Student camera access fallback", e);
        setIsCameraOn(true);
        setStudentToast({
          icon: '📹',
          text: language === 'vi' ? 'Đã bật camera của bé (Hình đại diện trực tiếp)' : 'Camera active'
        });
        if (onToggleCamera) {
          onToggleCamera(student.id, true);
        }
      }
      setTimeout(() => setStudentToast(null), 3500);
    }
  }, [isCameraOn, language, onToggleCamera, playMicFeedback, student.id]);

  // Keep student video stream attached to video element
  useEffect(() => {
    if (isCameraOn && cameraStreamRef.current && studentVideoRef.current) {
      if (studentVideoRef.current.srcObject !== cameraStreamRef.current) {
        studentVideoRef.current.srcObject = cameraStreamRef.current;
      }
    }
  }, [isCameraOn]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getVideoTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
    };
  }, []);

  const triggerReaction = (emoji: string) => {
    const id = Math.random().toString();
    const left = 20 + Math.random() * 60;
    setFloatingReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2200);
  };

  const handleSelectAnswer = (optionIdx: number) => {
    if (gradedQuestions[activeQuestionIndex]) return;
    setUserAnswers(prev => ({ ...prev, [activeQuestionIndex]: optionIdx }));
  };

  const handleGradeCurrentQuestion = () => {
    const selected = userAnswers[activeQuestionIndex];
    if (selected === undefined) return;

    const currentQ = questions[activeQuestionIndex];
    if (!currentQ) return;

    const isCorrect = selected === currentQ.correctIndex;
    const earned = isCorrect ? currentQ.points : 0;

    setGradedQuestions(prev => ({ ...prev, [activeQuestionIndex]: true }));
    setStudentScore(prev => prev + earned);

    if (onAnswerQuestion) {
      onAnswerQuestion(student.id, earned, currentQ.question, isCorrect);
    }

    playScoreChime(isCorrect);
    if (isCorrect) {
      triggerReaction('🎉');
      triggerReaction('⭐');
    } else {
      triggerReaction('🤔');
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: student.name,
      avatar: student.avatar,
      role: 'student',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  const activeQ = questions[activeQuestionIndex];
  const totalPossiblePoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="flex-1 flex flex-col font-sans overflow-hidden bg-gradient-to-br from-amber-50/95 via-sky-50/90 to-pink-50/95 text-slate-800 min-h-screen relative">
      
      {/* Toast Notification for Microphone & Actions */}
      {studentToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[3000] px-4 py-2.5 rounded-2xl bg-slate-900/90 text-white border-2 border-amber-300 shadow-2xl flex items-center gap-2 text-xs font-black animate-bounce backdrop-blur-md">
          <span className="text-base">{studentToast.icon}</span>
          <span>{studentToast.text}</span>
        </div>
      )}

      {/* ================= STUDENT TOP BAR ================= */}
      <header className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0 z-50 bg-gradient-to-r from-sky-400 via-indigo-400 to-pink-400 text-white shadow-md border-b-2 border-white/40">
        
        {/* Left: Student Identity & Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white/25 backdrop-blur-md border border-white/50 flex items-center justify-center text-2xl shadow-md shrink-0">
            {student.avatar}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black tracking-tight truncate drop-shadow-sm flex items-center gap-1.5">
                <span>{student.name}</span>
                <span className="text-[11px] bg-white/30 text-white px-2 py-0.5 rounded-full font-mono font-bold">
                  {student.code}
                </span>
                {isAdmin && studentsList.length > 1 && onSelectStudent && (
                  <button
                    onClick={() => setShowSwitchStudentModal(true)}
                    className="text-[10px] bg-white/20 hover:bg-white/40 text-white font-bold px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 border border-white/30"
                    title="Đổi tài khoản học sinh khác (Quyền Quản trị viên)"
                  >
                    <span>🔁 Đổi bé</span>
                  </button>
                )}
              </h2>

              {/* Live Projector Beam Badge for Student */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm ${
                isTeacherProjecting 
                  ? 'bg-emerald-500 text-white ring-2 ring-white/60 animate-pulse' 
                  : 'bg-black/30 text-white/80'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isTeacherProjecting ? 'bg-white animate-ping' : 'bg-slate-300'}`} />
                <span>{isTeacherProjecting ? '🔴 Đang Chiếu Trực Tiếp' : '⏸️ Tạm Dừng Chiếu'}</span>
              </span>
            </div>

            <p className="text-xs text-white/90 font-medium flex items-center gap-2 truncate">
              <span>🎒 Lớp: {student.classCode}</span>
              <span>•</span>
              <span className="bg-white/20 px-1.5 py-0.2 rounded font-bold">Tài khoản học sinh 👧</span>
              {isMicOn && (
                <>
                  <span>•</span>
                  <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black text-[10px] flex items-center gap-1 shadow-sm animate-pulse">
                    <span>🎙️</span>
                    <span>Đang mở mic</span>
                  </span>
                </>
              )}
              {isCameraOn && (
                <>
                  <span>•</span>
                  <span className="bg-sky-500 text-white px-2 py-0.5 rounded-full font-black text-[10px] flex items-center gap-1 shadow-sm animate-pulse">
                    <span>📹</span>
                    <span>Camera đang mở</span>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Tools: Score, Mic, Cam, Video Call, Raise Hand, Reaction, Switch back to Teacher */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Student Score Badge */}
          <div className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl bg-amber-300 text-amber-950 font-black text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 shadow-md border-2 border-white">
            <span className="text-sm sm:text-base">⭐</span>
            <span>{studentScore}/{totalPossiblePoints} <span className="hidden sm:inline">điểm</span></span>
          </div>

          {/* Student Microphone Toggle Button */}
          <button
            onClick={toggleMicrophone}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl text-[11px] sm:text-xs font-black flex items-center gap-1 sm:gap-1.5 transition-all shadow-md active:scale-95 border min-h-[36px] sm:min-h-[40px] ${
              isMicOn
                ? 'bg-emerald-500 text-white ring-2 ring-white border-emerald-300 animate-pulse'
                : 'bg-white/25 hover:bg-white/40 text-white border-white/40'
            }`}
            title={isMicOn ? "Nhấn để tắt micro 🔇" : "Nhấn để bật micro phát biểu 🎙️"}
          >
            <span className="text-sm">{isMicOn ? '🎙️' : '🔇'}</span>
            <span className="hidden xs:inline">
              {isMicOn 
                ? (language === 'vi' ? 'Mic Mở' : 'Mic On') 
                : (language === 'vi' ? 'Bật Mic' : 'Unmute')}
            </span>
            {isMicOn && (
              <span className="flex items-center gap-0.5 h-3 ml-0.5">
                <span className="w-1 bg-white rounded-full animate-bounce h-2" style={{ animationDelay: '0ms' }} />
                <span className="w-1 bg-white rounded-full animate-bounce h-3" style={{ animationDelay: '150ms' }} />
                <span className="w-1 bg-white rounded-full animate-bounce h-1.5" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </button>

          {/* Student Camera Toggle Button */}
          <button
            onClick={toggleCamera}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl text-[11px] sm:text-xs font-black flex items-center gap-1 sm:gap-1.5 transition-all shadow-md active:scale-95 border min-h-[36px] sm:min-h-[40px] ${
              isCameraOn
                ? 'bg-sky-500 text-white ring-2 ring-white border-sky-300 animate-pulse'
                : 'bg-white/25 hover:bg-white/40 text-white border-white/40'
            }`}
            title={isCameraOn ? "Nhấn để tắt camera 📷" : "Nhấn để bật camera gọi video 📹"}
          >
            <span className="text-sm">{isCameraOn ? '📹' : '📷'}</span>
            <span className="hidden xs:inline">
              {isCameraOn 
                ? (language === 'vi' ? 'Cam Bật' : 'Cam On') 
                : (language === 'vi' ? 'Bật Cam' : 'Cam Off')}
            </span>
            {isCameraOn && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping inline-block" />
            )}
          </button>

          {/* Fullscreen Video Call Room Trigger Button (Desktop) */}
          <button
            onClick={() => setShowFullVideoCallModal(true)}
            className="hidden md:flex px-3 py-1.5 rounded-2xl text-xs font-black bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white shadow-md active:scale-95 border border-white/50 items-center gap-1.5 transition-all"
            title="Mở phòng Video Call lớp học toàn màn hình"
          >
            <span>📹</span>
            <span>Phòng Video Call</span>
          </button>

          {/* Raise Hand Button */}
          <button
            onClick={() => {
              const next = !isHandRaised;
              setIsHandRaised(next);
              triggerReaction('🙋‍♂️');
              if (next && onRaiseHand) {
                onRaiseHand(student.id);
              }
            }}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl text-[11px] sm:text-xs font-black flex items-center gap-1 transition-all shadow-md active:scale-95 min-h-[36px] sm:min-h-[40px] ${
              isHandRaised
                ? 'bg-amber-400 text-amber-950 ring-2 ring-white'
                : 'bg-white/25 hover:bg-white/40 text-white border border-white/40'
            }`}
          >
            <span>🙋‍♂️</span>
            <span className="hidden sm:inline">{isHandRaised ? 'Hạ tay' : 'Giơ tay'}</span>
          </button>

          {/* Quick reactions (Desktop) */}
          <div className="hidden lg:flex items-center gap-1 bg-white/20 p-1 rounded-2xl border border-white/30 backdrop-blur-sm">
            {['❤️', '👏', '💡', '🎉', '🎈', '⭐'].map(emoji => (
              <button
                key={emoji}
                onClick={() => triggerReaction(emoji)}
                className="w-7 h-7 rounded-lg hover:bg-white/30 text-sm active:scale-125 transition-transform flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Role Switching Option (Desktop): Admin testing */}
          {isAdmin && onSwitchToTeacher && (
            <button
              onClick={onSwitchToTeacher}
              className="hidden sm:flex px-3 py-1.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black transition-all shadow-md active:scale-95 items-center gap-1.5 border-2 border-white/60"
              title="Quay lại giao diện Quản Trị Viên (Admin)"
            >
              <span>👑</span>
              <span className="hidden md:inline">Về vai Quản trị</span>
            </button>
          )}

          {/* Logout Button (Desktop) */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="hidden sm:flex px-3 py-1.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black transition-all shadow-md active:scale-95 items-center gap-1 border-2 border-white/60"
              title="Đăng xuất khỏi tài khoản học sinh"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          )}

          {/* Mobile More Options Menu Button (Phones) */}
          <div className="sm:hidden relative" ref={mobileMenuRef}>
            <button
              onClick={() => setShowMobileStudentMenu(!showMobileStudentMenu)}
              className="w-9 h-9 rounded-xl bg-white/25 hover:bg-white/40 text-white flex items-center justify-center font-black text-base border border-white/40 active:scale-95 transition-all shadow-sm"
              aria-label="Tùy chọn học sinh"
            >
              ⋮
            </button>

            {showMobileStudentMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border-2 border-amber-300 py-3 px-3 z-[250] animate-fade-in text-left text-slate-800 divide-y divide-amber-100">
                
                {/* Floating Reactions on Mobile */}
                <div className="pb-2">
                  <div className="text-[10px] font-black uppercase text-amber-900 mb-1.5 flex items-center justify-between">
                    <span>Thả cảm xúc nhanh</span>
                    <span>✨</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {['❤️', '👏', '💡', '🎉', '🎈', '⭐'].map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          triggerReaction(emoji);
                          setShowMobileStudentMenu(false);
                        }}
                        className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-base active:scale-125 transition-transform flex items-center justify-center border border-amber-200"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Actions */}
                <div className="py-2 space-y-1.5 text-xs font-bold">
                  <button
                    onClick={() => {
                      setShowMobileStudentMenu(false);
                      setShowFullVideoCallModal(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 flex items-center gap-2"
                  >
                    <span>📹</span>
                    <span>Phòng Video Call Toàn Màn Hình</span>
                  </button>

                  {isAdmin && studentsList.length > 1 && onSelectStudent && (
                    <button
                      onClick={() => {
                        setShowMobileStudentMenu(false);
                        setShowSwitchStudentModal(true);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-amber-50 text-amber-900 hover:bg-amber-100 flex items-center gap-2"
                    >
                      <span>🔁</span>
                      <span>Đổi tài khoản học sinh khác</span>
                    </button>
                  )}

                  {isAdmin && onSwitchToTeacher && (
                    <button
                      onClick={() => {
                        setShowMobileStudentMenu(false);
                        onSwitchToTeacher();
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-amber-100 text-amber-950 hover:bg-amber-200 flex items-center gap-2 font-black"
                    >
                      <span>👑</span>
                      <span>Về giao diện Quản Trị (Admin)</span>
                    </button>
                  )}
                </div>

                {/* Logout on Mobile */}
                {onLogout && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setShowMobileStudentMenu(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-black text-xs flex items-center justify-center gap-1.5 border border-rose-200"
                    >
                      <span>🚪</span>
                      <span>Đăng xuất tài khoản học sinh</span>
                    </button>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= MOBILE SWITCHER FOR PHONES: PROJECTOR vs QUIZ ================= */}
      <div className="lg:hidden px-3 pt-2 pb-0 shrink-0">
        <div className="flex items-center bg-white/95 rounded-2xl border-2 border-amber-300 shadow-sm p-1 gap-1">
          <button
            onClick={() => setMobileStudentTab('projector')}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
              mobileStudentTab === 'projector'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-amber-50'
            }`}
          >
            <span>📽️</span>
            <span>Màn Chiếu Bài Giảng</span>
            {isTeacherProjecting && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            )}
          </button>

          <button
            onClick={() => setMobileStudentTab('quiz')}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
              mobileStudentTab === 'quiz'
                ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-indigo-50'
            }`}
          >
            <span>📝</span>
            <span>Bảng Câu Hỏi</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              mobileStudentTab === 'quiz' ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
            }`}>
              {questions.length}
            </span>
          </button>
        </div>
      </div>

      {/* ================= MAIN STUDENT STAGE: LIVE DISPLAY & QUESTION INTERFACE ================= */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative overflow-hidden p-2 sm:p-4 gap-3">
        
        {/* ================= 1. THE LIVE DISPLAY (MÀN HÌNH TRÌNH CHIẾU TRỰC TIẾP) ================= */}
        <div className={`flex-1 lg:w-[58%] xl:w-[60%] flex flex-col min-h-0 relative ${
          mobileStudentTab === 'projector' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Projector Top Status */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-amber-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <span className="text-base">📽️</span>
                <span>Màn Hình Máy Chiếu Lớp Học Trực Tiếp</span>
              </span>
              {isTeacherProjecting ? (
                <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border-2 border-emerald-400 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Bé đang theo dõi trực tiếp</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border-2 border-amber-400 px-2.5 py-0.5 rounded-full">
                  Thầy/Cô đang tạm dừng
                </span>
              )}
            </div>

            {/* Single Selected Image Indicator (Chỉ hiển thị duy nhất tranh do Thầy/Cô chọn) */}
            <div className="flex items-center gap-1.5 bg-white border-2 border-amber-300 px-3 py-1 rounded-2xl shadow-xs">
              <span className="text-amber-500 text-sm">⭐</span>
              <span className="text-[11px] font-black text-amber-950">
                {language === 'vi' ? 'Tranh duy nhất do Thầy/Cô chọn' : 'Teacher-selected artwork'}
              </span>
            </div>
          </div>

          {/* Primary School Live Smartboard Screen */}
          <div className="flex-1 relative border-4 border-amber-400 ring-4 ring-amber-300/40 bg-white rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden min-h-0 select-none">
            
            {/* Playful Stickers on corners */}
            <div className="absolute top-3 left-3 text-2xl z-30 pointer-events-none drop-shadow">⭐</div>
            <div className="absolute top-3 right-3 text-2xl z-30 pointer-events-none drop-shadow">🎨</div>
            <div className="absolute bottom-3 left-3 text-2xl z-30 pointer-events-none drop-shadow">🚀</div>
            <div className="absolute bottom-3 right-3 text-2xl z-30 pointer-events-none drop-shadow">🌸</div>

            {/* Projector Glow Beam */}
            {isTeacherProjecting && (
              <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-amber-400/20 via-transparent to-transparent pointer-events-none" />
            )}

            {isTeacherProjecting && currentImage && currentImage.url ? (
              <div className="relative w-full h-full flex items-center justify-center p-3">
                <img
                  src={currentImage.url}
                  alt={currentImage.prompt || "Bức tranh do Thầy/Cô chọn"}
                  className="max-w-full max-h-full object-contain rounded-2xl shadow-xl transition-transform duration-200"
                />

                {/* Live Broadcast Badge */}
                <div className="absolute top-5 left-12 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3.5 py-1 rounded-full border-2 border-amber-300 text-[11px] text-amber-950 font-black shadow-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>TRANH THẦY/CÔ ĐANG CHIẾU CHO LỚP • HD SẮC NÉT</span>
                </div>

                {/* Prompt Caption of the single selected image */}
                {currentImage.prompt && (
                  <div className="absolute bottom-4 inset-x-6 z-20 pointer-events-none flex justify-center">
                    <div className="bg-slate-900/85 backdrop-blur-md border border-white/30 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg max-w-xl truncate text-center">
                      🎨 Chủ đề tranh: &ldquo;{currentImage.prompt}&rdquo;
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8 max-w-sm">
                <div className="w-20 h-20 rounded-3xl bg-amber-100 border-4 border-amber-300 mx-auto flex items-center justify-center text-4xl mb-3 shadow-md animate-bounce">
                  🎒
                </div>
                <h4 className="text-base font-black text-amber-950 mb-1">
                  Thầy/Cô đang chuẩn bị bài giảng
                </h4>
                <p className="text-xs text-slate-600 font-bold leading-relaxed">
                  Các bé hãy chú ý lắng nghe thầy cô hướng dẫn và chuẩn bị trả lời các câu hỏi bên cạnh nhé!
                </p>
              </div>
            )}

            {/* Floating Live Reactions */}
            {floatingReactions.map((r) => (
              <div
                key={r.id}
                className="absolute bottom-8 text-4xl pointer-events-none z-50 animate-bounce transition-all drop-shadow-md"
                style={{ left: `${r.left}%` }}
              >
                {r.emoji}
              </div>
            ))}
          </div>

          {/* Student & Class Video Call Strip */}
          <div className="mt-2.5 bg-white/95 rounded-2xl border-2 border-amber-300 p-2 sm:p-2.5 shadow-md shrink-0">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-amber-200">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">📹</span>
                <span className="text-xs font-black text-amber-950">Video Call Lớp Học Trực Tuyến</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full font-bold border border-emerald-300">
                  🔴 Đang kết nối
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowFullVideoCallModal(true)}
                  className="text-[11px] bg-sky-500 hover:bg-sky-600 text-white font-bold px-2.5 py-0.5 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                >
                  <span>Phóng to</span>
                  <span>🔍</span>
                </button>
                <button
                  onClick={() => setIsVideoBarCollapsed(c => !c)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-bold px-1"
                >
                  {isVideoBarCollapsed ? '▼ Mở' : '▲ Gọn'}
                </button>
              </div>
            </div>

            {!isVideoBarCollapsed && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
                {/* Teacher Card */}
                <div className="w-36 h-24 rounded-xl overflow-hidden bg-slate-900 border-2 border-sky-400 relative shrink-0 shadow-sm flex flex-col justify-between p-1.5 text-white">
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[9px] bg-sky-500 px-1 rounded font-black">GIÁO VIÊN</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <div className="text-center my-auto">
                    <span className="text-2xl">👨‍🏫</span>
                  </div>
                  <div className="bg-black/60 rounded px-1 text-[9px] font-bold truncate flex items-center justify-between z-10">
                    <span className="truncate">Cô Hoàng Mai</span>
                    <span className="text-[8px] text-emerald-300 font-bold">🎙️ Giảng</span>
                  </div>
                </div>

                {/* Student Self-View Card */}
                <div className={`w-36 h-24 rounded-xl overflow-hidden border-2 relative shrink-0 shadow-sm flex flex-col justify-between p-1.5 text-white ${
                  isCameraOn ? 'bg-slate-900 border-emerald-400 ring-2 ring-emerald-300/40' : 'bg-slate-800 border-slate-300'
                }`}>
                  {isCameraOn ? (
                    cameraStreamRef.current ? (
                      <video
                        ref={el => {
                          studentVideoRef.current = el;
                          if (el && cameraStreamRef.current && el.srcObject !== cameraStreamRef.current) {
                            el.srcObject = cameraStreamRef.current;
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                        <span className="text-2xl animate-bounce">{student.avatar}</span>
                      </div>
                    )
                  ) : (
                    <div className="absolute inset-0 bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                      <span className="text-xl mb-0.5">{student.avatar}</span>
                      <span className="text-[9px] font-bold">Cam Tắt</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between z-10">
                    <span className="text-[9px] bg-black/60 px-1 rounded font-black">BẠN (BÉ)</span>
                    <button
                      onClick={toggleCamera}
                      className="text-[9px] bg-black/60 hover:bg-black/90 px-1 py-0.2 rounded font-bold"
                      title={isCameraOn ? "Tắt cam" : "Bật cam"}
                    >
                      {isCameraOn ? '📹' : '📷'}
                    </button>
                  </div>

                  <div className="bg-black/70 rounded px-1 text-[9px] font-bold truncate flex items-center justify-between z-10 mt-auto">
                    <span className="truncate">{student.name}</span>
                    <button
                      onClick={toggleMicrophone}
                      className="text-[8px] hover:scale-110 transition-transform ml-1"
                      title={isMicOn ? "Tắt mic" : "Bật mic"}
                    >
                      {isMicOn ? '🎙️' : '🔇'}
                    </button>
                  </div>
                </div>

                {/* Classmates Cards */}
                {[
                  { id: 'c1', name: 'Bé Bảo Châu', avatar: '👧', isCam: true, bg: 'from-pink-400 to-rose-400' },
                  { id: 'c2', name: 'Bé Minh Anh', avatar: '👦', isCam: true, bg: 'from-sky-400 to-blue-500' },
                  { id: 'c3', name: 'Bé Mai Phương', avatar: '👧', isCam: true, bg: 'from-purple-400 to-indigo-500' },
                  { id: 'c4', name: 'Bé Hải Đăng', avatar: '🧒', isCam: false, bg: 'from-amber-400 to-orange-500' },
                ].filter(c => c.name !== student.name).map(c => (
                  <div
                    key={c.id}
                    className="w-32 h-24 rounded-xl overflow-hidden border-2 border-amber-200 relative shrink-0 shadow-sm flex flex-col justify-between p-1.5 text-white"
                  >
                    {c.isCam ? (
                      <div className={`absolute inset-0 bg-gradient-to-br ${c.bg} flex items-center justify-center`}>
                        <span className="text-2xl animate-pulse">{c.avatar}</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                        <span className="text-xl mb-0.5">{c.avatar}</span>
                        <span className="text-[8px] font-bold">Cam Tắt</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between z-10">
                      <span className="text-[8px] bg-black/60 px-1 rounded font-bold">HỌC SINH</span>
                      <span className="text-[8px]">{c.isCam ? '📹' : '📷'}</span>
                    </div>
                    <div className="bg-black/70 rounded px-1 text-[9px] font-bold truncate z-10 mt-auto">
                      {c.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= 2. THE QUESTION-RESPONSE INTERFACE (BẢNG CÂU HỎI & CHẤM ĐIỂM) ================= */}
        <div className={`flex-1 lg:w-[42%] xl:w-[40%] flex flex-col min-h-0 bg-white/95 rounded-3xl border-3 border-amber-300 shadow-xl p-3 sm:p-5 overflow-hidden ${
          mobileStudentTab === 'quiz' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-amber-200 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-lg font-black shadow-md">
                📝
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-amber-950 tracking-tight flex items-center gap-2">
                  <span>Bảng Câu Hỏi & Trả Lời</span>
                  <span className="text-[11px] bg-rose-500 text-white px-2.5 py-0.5 rounded-full font-black uppercase">
                    {questions.length} CÂU
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold leading-none">
                  Bé hãy chọn đáp án đúng để nhận ngôi sao điểm 10 ⭐
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 px-3 py-1.5 rounded-2xl shadow-md border-2 border-white">
              <span className="font-extrabold text-xs">Điểm bé:</span>
              <span className="font-black text-base">{studentScore}</span>
              <span className="text-amber-900 text-xs font-bold">/ {totalPossiblePoints}</span>
            </div>
          </div>

          {/* Question Selector Tabs */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-none pb-1 shrink-0">
            {questions.map((q, idx) => {
              const isAnswered = userAnswers[idx] !== undefined;
              const isGraded = gradedQuestions[idx];
              const isCorrect = isGraded && userAnswers[idx] === q.correctIndex;

              let badgeColor = 'bg-amber-50 text-amber-900 border-amber-200';
              if (isGraded) {
                badgeColor = isCorrect 
                  ? 'bg-emerald-500 text-white border-emerald-400 font-black shadow-md' 
                  : 'bg-rose-500 text-white border-rose-400 font-black shadow-md';
              } else if (isAnswered) {
                badgeColor = 'bg-sky-500 text-white border-sky-400 font-black shadow-md';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all border-2 shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                    activeQuestionIndex === idx
                      ? 'ring-4 ring-amber-400/80 scale-105 shadow-md ' + badgeColor
                      : badgeColor
                  }`}
                >
                  <span>Câu {idx + 1}</span>
                  {isGraded && (isCorrect ? ' ⭐✓' : ' ✗')}
                </button>
              );
            })}
          </div>

          {/* Active Question Box */}
          {activeQ ? (
            <div className="flex-1 flex flex-col min-h-0 bg-amber-50/50 border-2 border-amber-200/80 rounded-2xl p-3 sm:p-4 shadow-sm overflow-y-auto scrollbar-thin">
              
              {/* Question Title & Points */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                  {activeQ.question}
                </h4>
                <span className="text-[11px] font-black bg-amber-400 text-amber-950 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 shadow-sm border border-white">
                  +{activeQ.points} ĐIỂM ⭐
                </span>
              </div>

              {/* Hint Bar for Kids */}
              <div className="mb-3 p-2.5 bg-sky-100 border-2 border-sky-300 rounded-2xl flex items-center gap-2 text-xs text-sky-950 font-bold">
                <span className="text-lg">💡</span>
                <span className="flex-1 leading-snug">{activeQ.hint}</span>
              </div>

              {/* 4 Cheerful Option Buttons */}
              <div className="space-y-2.5 mb-3.5">
                {activeQ.options.map((opt, optIdx) => {
                  const isSelected = userAnswers[activeQuestionIndex] === optIdx;
                  const isGraded = gradedQuestions[activeQuestionIndex];
                  const isCorrect = activeQ.correctIndex === optIdx;

                  const optionColors = [
                    { border: 'border-pink-300', bg: 'bg-pink-50 hover:bg-pink-100', badge: 'bg-rose-500 text-white' },
                    { border: 'border-amber-300', bg: 'bg-amber-50 hover:bg-amber-100', badge: 'bg-amber-500 text-white' },
                    { border: 'border-emerald-300', bg: 'bg-emerald-50 hover:bg-emerald-100', badge: 'bg-emerald-500 text-white' },
                    { border: 'border-sky-300', bg: 'bg-sky-50 hover:bg-sky-100', badge: 'bg-sky-500 text-white' }
                  ][optIdx % 4];

                  let optionClass = `${optionColors.bg} ${optionColors.border} text-slate-800`;
                  if (isGraded) {
                    if (isCorrect) {
                      optionClass = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-black ring-2 ring-emerald-400 shadow-md';
                    } else if (isSelected) {
                      optionClass = 'bg-rose-100 border-rose-400 text-rose-900 line-through';
                    }
                  } else if (isSelected) {
                    optionClass = 'bg-sky-100 border-sky-500 text-sky-950 font-black ring-4 ring-sky-300 shadow-md scale-[1.01]';
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isGraded}
                      onClick={() => handleSelectAnswer(optIdx)}
                      className={`w-full text-left p-3.5 rounded-2xl border-2 text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-2.5 shadow-sm active:scale-98 ${optionClass}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-sm ${
                          isSelected ? 'bg-sky-600 text-white ring-2 ring-white' : optionColors.badge
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="leading-snug">{opt}</span>
                      </div>

                      {/* Status Icon */}
                      {isGraded && isCorrect && (
                        <span className="text-emerald-700 font-black text-xs shrink-0 bg-emerald-200 px-2.5 py-1 rounded-full">
                          ✓ Đúng xuất sắc
                        </span>
                      )}
                      {isGraded && isSelected && !isCorrect && (
                        <span className="text-rose-700 font-black text-xs shrink-0 bg-rose-200 px-2.5 py-1 rounded-full">
                          ✗ Chưa chính xác
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Submit & Scoring Button */}
              <div className="mt-auto pt-2 border-t border-amber-200 flex items-center gap-2">
                {!gradedQuestions[activeQuestionIndex] ? (
                  <button
                    disabled={userAnswers[activeQuestionIndex] === undefined}
                    onClick={handleGradeCurrentQuestion}
                    className="flex-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 disabled:opacity-40 text-white font-black py-3 px-5 rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-400/40 flex items-center justify-center gap-2 active:scale-95 transform hover:-translate-y-0.5"
                  >
                    <span className="text-base">🎯</span>
                    <span>Nộp Bài & Chấm Điểm Cho Bé Ngay!</span>
                  </button>
                ) : (
                  <div className="flex-1 space-y-2">
                    <div className={`p-3 rounded-2xl text-xs border-2 shadow-sm ${
                      userAnswers[activeQuestionIndex] === activeQ.correctIndex 
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-950' 
                        : 'bg-rose-100 border-rose-400 text-rose-950'
                    }`}>
                      <div className="font-black text-sm mb-1 flex items-center gap-1.5">
                        <span>{userAnswers[activeQuestionIndex] === activeQ.correctIndex ? '🎉 BÉ GIỎI LẮM! TRẢ LỜI ĐÚNG (+10 ĐIỂM) ⭐⭐⭐' : '🎈 BÉ CỐ GẮNG LÊN NHÉ! (0 ĐIỂM)'}</span>
                      </div>
                      <p className="leading-relaxed text-[11px] font-semibold">{activeQ.explanation}</p>
                    </div>

                    {/* Next Question Navigation */}
                    <div className="flex items-center gap-2">
                      {activeQuestionIndex < questions.length - 1 ? (
                        <button
                          onClick={() => setActiveQuestionIndex(i => i + 1)}
                          className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black py-2.5 px-4 rounded-2xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <span>Bé sang câu tiếp theo</span>
                          <span>👉</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowScoreSummary(true)}
                          className="flex-1 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black py-2.5 px-4 rounded-2xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 active:scale-95 border-2 border-white"
                        >
                          <span>🏆</span>
                          <span>Xem Bảng Điểm Khen Thưởng</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Student Chat Toggle */}
          <div className="mt-2.5 shrink-0">
            <button
              onClick={() => setShowChatDrawer(p => !p)}
              className="w-full p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between border-2 bg-amber-50/80 border-amber-200 text-amber-950 hover:bg-amber-100 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <span>💬</span>
                <span>Góc trò chuyện vui vẻ của lớp</span>
                <span className="text-[10px] bg-sky-500 px-2 py-0.2 rounded-full text-white font-bold">{chatMessages.length}</span>
              </span>
              <span>{showChatDrawer ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
            </button>

            {showChatDrawer && (
              <div className="mt-1.5 rounded-2xl p-2.5 h-32 flex flex-col min-h-0 animate-fade-in border-2 bg-white border-amber-200">
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin text-left">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className="text-[11px] leading-snug">
                      <span className="font-extrabold text-slate-800 mr-1.5">{msg.avatar} {msg.sender}:</span>
                      <span className={msg.role === 'teacher' ? 'text-sky-700 font-bold' : 'text-slate-700'}>
                        {msg.text}
                      </span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendChat} className="mt-1.5 flex items-center gap-1.5 pt-1 border-t border-amber-200">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Gửi lời chào hoặc thắc mắc cho lớp..."
                    className="flex-1 bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-1 text-[11px] text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    type="submit"
                    className="bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-black px-3.5 py-1 rounded-xl transition-colors shadow-sm"
                  >
                    Gửi
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL: SCORE SUMMARY FOR STUDENT ================= */}
      {showScoreSummary && (
        <div 
          className="fixed inset-0 z-[2800] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowScoreSummary(false)}
        >
          <div 
            className="bg-gradient-to-br from-amber-50 via-white to-pink-50 border-4 border-amber-300 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-center text-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <span className="w-20 h-20 rounded-3xl bg-amber-300 text-amber-950 border-4 border-white inline-flex items-center justify-center text-5xl mb-2 shadow-lg animate-bounce">
              🏆
            </span>
            <h3 className="text-xl font-black text-amber-950">
              BẢNG TỔNG KẾT ĐIỂM CỦA BÉ
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 font-bold">
              Chúc mừng {student.name} đã hoàn thành bài quan sát tranh!
            </p>

            <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 border-2 border-white p-4 rounded-2xl my-4 text-center text-white shadow-lg">
              <span className="text-xs uppercase font-black tracking-wider block mb-1">
                KẾT QUẢ ĐẠT ĐƯỢC
              </span>
              <div className="text-4xl font-black font-mono drop-shadow">
                {studentScore} / {totalPossiblePoints} ĐIỂM ⭐
              </div>
              <p className="text-xs mt-1.5 font-bold">
                {studentScore >= 30 
                  ? '🌟 XẾP LOẠI: XUẤT SẮC - BÉ LÀ HỌA SĨ NHÍ THÔNG THÁI!' 
                  : studentScore >= 20 
                    ? '👍 XẾP LOẠI: KHÁ GIỎI - BÉ QUAN SÁT TRANH RẤT TỐT!' 
                    : '📖 XẾP LOẠI: BÉ CỐ GẮNG - LẦN SAU NHÌN KỸ HƠN NHÉ!'}
              </p>
            </div>

            <button
              onClick={() => setShowScoreSummary(false)}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-amber-950 font-black py-3 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-md active:scale-95 border-2 border-white"
            >
              Tiếp tục học tập & Quan sát tranh ✨
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL: SWITCH STUDENT ACCOUNT ================= */}
      {showSwitchStudentModal && (
        <div 
          className="fixed inset-0 z-[2850] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowSwitchStudentModal(false)}
        >
          <div 
            className="bg-white border-4 border-amber-300 rounded-3xl max-w-md w-full p-5 shadow-2xl relative text-left"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b-2 border-amber-200">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎒</span>
                <h3 className="text-base font-black text-slate-800">
                  {language === 'vi' ? 'Chọn Tài Khoản Học Sinh' : 'Select Student Account'}
                </h3>
              </div>
              <button 
                onClick={() => setShowSwitchStudentModal(false)}
                className="p-1.5 rounded-xl bg-amber-100 text-slate-600 hover:text-slate-900 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
              {studentsList.map(st => (
                <button
                  key={st.id}
                  onClick={() => {
                    if (onSelectStudent) onSelectStudent(st);
                    setShowSwitchStudentModal(false);
                  }}
                  className={`w-full p-3 rounded-2xl border-2 flex items-center justify-between text-left transition-all ${
                    st.id === student.id 
                      ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-300' 
                      : 'border-slate-200 hover:border-amber-300 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-1 bg-white rounded-xl border border-amber-200 shadow-sm">{st.avatar}</span>
                    <div>
                      <div className="font-extrabold text-sm text-slate-800">{st.name}</div>
                      <div className="text-xs text-slate-500 font-medium">Mã: {st.code} • Lớp: {st.classCode} • {st.score} ⭐</div>
                    </div>
                  </div>
                  {st.id === student.id && (
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full">
                      Đang chọn ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FULLSCREEN VIDEO CALL ROOM FOR STUDENT ================= */}
      {showFullVideoCallModal && (
        <div 
          className="fixed inset-0 z-[2900] bg-slate-950/90 backdrop-blur-md flex flex-col p-3 sm:p-6 animate-fade-in text-white"
          onClick={() => setShowFullVideoCallModal(false)}
        >
          <div 
            className="flex-1 flex flex-col max-w-6xl w-full mx-auto bg-slate-900 border-4 border-sky-400 rounded-3xl overflow-hidden shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-sky-600 via-indigo-600 to-pink-600 flex items-center justify-between border-b-2 border-white/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-xs">
                  📹
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black flex items-center gap-2 text-white">
                    <span>Phòng Video Call Trực Tuyến Của Bé</span>
                    <span className="text-[11px] bg-emerald-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                      <span>HD Live</span>
                    </span>
                  </h3>
                  <p className="text-xs text-white/90 font-medium">
                    Bé đang học cùng Cô Hoàng Mai và các bạn trong lớp {student.classCode}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFullVideoCallModal(false)}
                  className="px-4 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <span>📝</span>
                  <span>Quay lại Bảng Câu Hỏi</span>
                </button>
                <button
                  onClick={() => setShowFullVideoCallModal(false)}
                  className="p-1.5 rounded-xl bg-white/20 hover:bg-white/40 text-white font-bold"
                  title="Đóng"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Video Call Conference Stage */}
            <div className="flex-1 p-3 sm:p-5 overflow-y-auto scrollbar-thin grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* Teacher Card */}
              <div className="relative rounded-3xl overflow-hidden border-4 border-sky-400 shadow-xl bg-slate-950 aspect-video flex flex-col md:col-span-2">
                <div className="w-full h-full bg-gradient-to-br from-indigo-800 via-sky-800 to-slate-950 flex flex-col items-center justify-center p-4 text-white text-center">
                  <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/60 flex items-center justify-center text-4xl mb-2 animate-bounce shadow-lg">
                    👨‍🏫
                  </div>
                  <h4 className="text-base font-black">Cô Hoàng Mai (Giáo viên giảng dạy)</h4>
                  <p className="text-xs text-sky-200 mt-1">Cô đang giảng bài trực tiếp cho cả lớp</p>
                </div>

                <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
                  <span className="px-3 py-1 rounded-full bg-sky-500 text-white text-xs font-black shadow-md border border-white/40">
                    👑 GIÁO VIÊN
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>Đang nói</span>
                  </span>
                </div>

                <div className="absolute bottom-2 inset-x-3 p-2 bg-black/60 rounded-2xl backdrop-blur-xs flex items-center justify-between text-xs z-20">
                  <span className="font-extrabold text-white">Phòng học AI Tiểu Học 🏫</span>
                  <span className="text-emerald-300 font-bold">🎙️ Micro Cô: Mở</span>
                </div>
              </div>

              {/* Student Self-View Card */}
              <div className={`relative rounded-3xl overflow-hidden border-4 shadow-xl aspect-video flex flex-col transition-all ${
                isCameraOn ? 'border-emerald-400 ring-4 ring-emerald-300/40 bg-slate-950' : 'border-slate-700 bg-slate-800'
              }`}>
                {isCameraOn ? (
                  cameraStreamRef.current ? (
                    <video
                      ref={el => {
                        studentVideoRef.current = el;
                        if (el && cameraStreamRef.current && el.srcObject !== cameraStreamRef.current) {
                          el.srcObject = cameraStreamRef.current;
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 flex flex-col items-center justify-center text-white p-4">
                      <div className="w-16 h-16 rounded-full bg-white/20 border-3 border-white flex items-center justify-center text-3xl mb-1 animate-pulse">
                        {student.avatar}
                      </div>
                      <span className="text-sm font-black">{student.name}</span>
                      <span className="text-xs text-white/90">Camera bé đang phát trực tiếp</span>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-slate-300 p-4">
                    <div className="w-16 h-16 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center text-3xl mb-2 text-slate-400">
                      {student.avatar}
                    </div>
                    <span className="text-sm font-bold">{student.name}</span>
                    <span className="text-xs text-slate-400 mt-0.5">Camera của bé đang tắt</span>
                    <button
                      onClick={toggleCamera}
                      className="mt-2 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                    >
                      Bật camera bé 📹
                    </button>
                  </div>
                )}

                <div className="absolute top-3 left-3 z-20">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-black border border-white/30 backdrop-blur-xs">
                    👧 BÉ ({student.name})
                  </span>
                </div>

                <div className="absolute bottom-2 inset-x-2 p-1.5 bg-black/70 rounded-xl backdrop-blur-xs flex items-center justify-between text-xs z-20">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleMicrophone}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        isMicOn ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}
                    >
                      {isMicOn ? '🎙️ Mic Bật' : '🔇 Mic Tắt'}
                    </button>
                    <button
                      onClick={toggleCamera}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        isCameraOn ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isCameraOn ? '📹 Cam Bật' : '📷 Cam Tắt'}
                    </button>
                  </div>
                  <span className="text-amber-300 font-bold text-[11px]">{studentScore} ⭐</span>
                </div>
              </div>

              {/* Classmates Cards */}
              {[
                { id: 'c1', name: 'Bé Bảo Châu', avatar: '👧', isCam: true, bg: 'from-pink-500 to-rose-500', score: 30 },
                { id: 'c2', name: 'Bé Minh Anh', avatar: '👦', isCam: true, bg: 'from-sky-500 to-blue-600', score: 30 },
                { id: 'c3', name: 'Bé Mai Phương', avatar: '👧', isCam: true, bg: 'from-purple-500 to-indigo-600', score: 30 },
                { id: 'c4', name: 'Bé Hải Đăng', avatar: '🧒', isCam: false, bg: 'from-amber-500 to-orange-600', score: 20 },
              ].filter(c => c.name !== student.name).map(c => (
                <div
                  key={c.id}
                  className="relative rounded-3xl overflow-hidden border-3 border-amber-300 shadow-md aspect-video flex flex-col"
                >
                  {c.isCam ? (
                    <div className={`w-full h-full bg-gradient-to-br ${c.bg} flex flex-col items-center justify-center p-3 text-white`}>
                      <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-3xl mb-1 animate-pulse">
                        {c.avatar}
                      </div>
                      <span className="text-xs font-black">{c.name}</span>
                      <span className="text-[10px] text-white/80">Camera học sinh • Trực tiếp</span>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center p-3 text-slate-300">
                      <div className="w-12 h-12 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-2xl mb-1 text-slate-400">
                        {c.avatar}
                      </div>
                      <span className="text-xs font-bold">{c.name}</span>
                      <span className="text-[10px] text-slate-500">📷 Camera đã tắt</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20">
                    <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">
                      ⭐ {c.score}đ
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[10px]">
                      {c.isCam ? '📹' : '📷'}
                    </span>
                  </div>

                  <div className="absolute bottom-1 inset-x-2 p-1 bg-black/60 rounded-xl text-center text-[10px] font-bold truncate z-20">
                    {c.name}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Controls Bar for Full Video Call Modal */}
            <div className="px-4 py-3 bg-slate-950 border-t-2 border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMicrophone}
                  className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                    isMicOn ? 'bg-emerald-500 text-white shadow-emerald-400/40 ring-2 ring-white/60 animate-pulse' : 'bg-rose-500 text-white'
                  }`}
                >
                  <span>{isMicOn ? '🎙️ Tắt Micro' : '🎙️ Bật Micro'}</span>
                </button>

                <button
                  onClick={toggleCamera}
                  className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                    isCameraOn ? 'bg-sky-500 text-white shadow-sky-400/40 ring-2 ring-white/60 animate-pulse' : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <span>{isCameraOn ? '📹 Tắt Camera' : '📹 Bật Camera'}</span>
                </button>

                <button
                  onClick={() => {
                    const next = !isHandRaised;
                    setIsHandRaised(next);
                    triggerReaction('🙋‍♂️');
                    if (next && onRaiseHand) onRaiseHand(student.id);
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                    isHandRaised ? 'bg-amber-400 text-amber-950 ring-2 ring-white' : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                >
                  <span>🙋‍♂️</span>
                  <span>{isHandRaised ? 'Hạ tay xuống' : 'Giơ tay phát biểu'}</span>
                </button>
              </div>

              {/* Quick Emojis */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-2xl border border-white/20">
                {['❤️', '👏', '💡', '🎉', '🎈', '⭐'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => triggerReaction(emoji)}
                    className="w-8 h-8 rounded-xl hover:bg-white/20 text-base active:scale-125 transition-transform flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div>
                <button
                  onClick={() => setShowFullVideoCallModal(false)}
                  className="px-4 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black transition-all shadow-md active:scale-95 border-2 border-white"
                >
                  Tiếp tục Học bài & Quan sát tranh 🎨
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentClassroomView;
