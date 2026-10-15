/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GeneratedImage, BeliefState, ClassroomQuestion } from '../types';
import { Language, translations } from '../translations';
import { Tooltip } from './Tooltip';
import { QuestionEditorModal } from './QuestionEditorModal';
import { getDefaultClassroomQuestions } from '../services/classroomQuestions';

interface OnlineClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: GeneratedImage[];
  initialImageIndex?: number;
  prompt: string;
  beliefGraph?: BeliefState | null;
  aspectRatio?: string;
  selectedModel?: string;
  language?: Language;
  onSwitchToStudentView?: (imageIndex?: number) => void;
  onOpenStudentAccounts?: () => void;
  onSelectImageIndex?: (index: number) => void;
  questions?: ClassroomQuestion[];
  onUpdateQuestions?: (questions: ClassroomQuestion[]) => void;
  isAdmin?: boolean;
  onToggleCamera?: (isCameraOn: boolean) => void;
  onToggleMic?: (isMicOn: boolean) => void;
}

type ToolMode = 'pointer' | 'laser' | 'pen' | 'highlighter' | 'eraser';
type ViewLayout = 'split' | 'projector' | 'quiz' | 'videocall';

interface ChatMessage {
  id: string;
  sender: string;
  role: 'teacher' | 'student' | 'system';
  avatar: string;
  text: string;
  time: string;
}

interface StickyNoteItem {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

interface ClassStudent {
  id: string;
  name: string;
  avatar: string;
  score: number;
  status: 'watching' | 'submitted' | 'hand_raised';
  submittedAnswer?: number;
  isMicOn?: boolean;
  isCameraOn?: boolean;
  simulatedVideoBg?: string;
}

export const OnlineClassroomModal: React.FC<OnlineClassroomModalProps> = ({
  isOpen,
  onClose,
  images,
  initialImageIndex = 0,
  prompt,
  beliefGraph,
  aspectRatio = '16:9',
  selectedModel = 'gemini-3.1-flash-lite-image',
  language = 'vi',
  onSwitchToStudentView,
  onOpenStudentAccounts,
  onSelectImageIndex,
  questions: propQuestions,
  onUpdateQuestions,
  isAdmin = false,
  onToggleCamera,
  onToggleMic
}) => {
  const t = translations[language] || translations.vi;
  
  const validImages = images.filter((img): img is GeneratedImage & { url: string } => !!img.url);
  const [currentImageIndex, setCurrentImageIndex] = useState(initialImageIndex);

  // Bright Primary School Theme (Default true for bright, cheerful colors suitable for primary school students)
  const [isKidBrightTheme, setIsKidBrightTheme] = useState<boolean>(true);

  // 1. Projection State (Giáo viên ấn nút trình chiếu cho học sinh)
  const [isProjecting, setIsProjecting] = useState<boolean>(true);
  const [viewLayout, setViewLayout] = useState<ViewLayout>('split');

  // Microphone state & audio stream for classroom
  const [isTeacherMicOn, setIsTeacherMicOn] = useState<boolean>(true);
  const [teacherAudioVolume, setTeacherAudioVolume] = useState<number>(0);
  const teacherMediaStreamRef = useRef<MediaStream | null>(null);
  const teacherAudioAnimRef = useRef<number | null>(null);
  const [classroomToast, setClassroomToast] = useState<{ icon: string; text: string } | null>(null);

  // Video call & Camera state for teacher
  const [isTeacherCameraOn, setIsTeacherCameraOn] = useState<boolean>(false);
  const teacherCameraStreamRef = useRef<MediaStream | null>(null);
  const teacherVideoRef = useRef<HTMLVideoElement | null>(null);
  const [showVideoStripInBoard, setShowVideoStripInBoard] = useState<boolean>(true);

  // 2. Interactive Smartboard Tools (Laser pointer, Pens, Sticky notes)
  const [toolMode, setToolMode] = useState<ToolMode>('laser');
  const [penColor, setPenColor] = useState<string>('#ef4444');
  const [penSize, setPenSize] = useState<number>(4);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([
    {
      id: '1',
      text: language === 'vi' ? '⭐ Điểm nhấn: Nhân vật chính và sắc màu tươi vui!' : '⭐ Highlight: Main subject and cheerful colors!',
      color: 'bg-amber-100 border-2 border-amber-300 text-amber-950 shadow-md',
      x: 18,
      y: 18
    }
  ]);
  const [newStickyText, setNewStickyText] = useState('');
  const [showStickyInput, setShowStickyInput] = useState(false);

  // Canvas Drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Audio / Speech
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Reactions & Hands raised
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; left: number }[]>([]);
  const [isUserHandRaised, setIsUserHandRaised] = useState(false);
  const [raisedHandsCount, setRaisedHandsCount] = useState<number>(1);

  // Chat
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showChatPanel, setShowChatPanel] = useState<boolean>(true);

  // 3. Questions & Scoring System (Bảng câu hỏi do giáo viên biên tập)
  const [questions, setQuestions] = useState<ClassroomQuestion[]>(() =>
    propQuestions && propQuestions.length > 0
      ? propQuestions
      : getDefaultClassroomQuestions(prompt, beliefGraph, selectedModel, language)
  );
  const [showQuestionEditor, setShowQuestionEditor] = useState<boolean>(false);

  useEffect(() => {
    if (propQuestions && propQuestions.length > 0) {
      setQuestions(propQuestions);
    }
  }, [propQuestions]);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [gradedQuestions, setGradedQuestions] = useState<Record<number, boolean>>({});
  const [userTotalScore, setUserTotalScore] = useState<number>(0);
  const [showScoreModal, setShowScoreModal] = useState<boolean>(false);
  const [lastGradedResult, setLastGradedResult] = useState<{ isCorrect: boolean; points: number } | null>(null);

  // 4. Students in Class (Danh sách học sinh tiểu học online tham gia video call)
  const [students, setStudents] = useState<ClassStudent[]>([
    { id: 'st1', name: 'Bé Bảo Châu', avatar: '👧', score: 30, status: 'submitted', submittedAnswer: 0, isMicOn: false, isCameraOn: true, simulatedVideoBg: 'from-pink-400 to-rose-400' },
    { id: 'st2', name: 'Bé Minh Anh', avatar: '👦', score: 30, status: 'submitted', submittedAnswer: 0, isMicOn: true, isCameraOn: true, simulatedVideoBg: 'from-sky-400 to-blue-500' },
    { id: 'st3', name: 'Bé Hải Đăng', avatar: '🧒', score: 20, status: 'watching', submittedAnswer: 1, isMicOn: false, isCameraOn: false, simulatedVideoBg: 'from-amber-400 to-orange-500' },
    { id: 'st4', name: 'Bé Mai Phương', avatar: '👧', score: 30, status: 'submitted', submittedAnswer: 0, isMicOn: false, isCameraOn: true, simulatedVideoBg: 'from-purple-400 to-indigo-500' },
    { id: 'st5', name: 'Bé Tuấn Kiệt', avatar: '👦', score: 20, status: 'hand_raised', submittedAnswer: 2, isMicOn: false, isCameraOn: true, simulatedVideoBg: 'from-emerald-400 to-teal-500' },
    { id: 'st6', name: 'Bé Thảo Vy', avatar: '🌸', score: 20, status: 'watching', submittedAnswer: 0, isMicOn: false, isCameraOn: false, simulatedVideoBg: 'from-yellow-400 to-amber-500' },
  ]);

  // Sync initial image index
  useEffect(() => {
    if (initialImageIndex >= 0 && initialImageIndex < validImages.length) {
      setCurrentImageIndex(initialImageIndex);
    }
  }, [initialImageIndex, validImages.length]);

  // Initialize Classroom Questions & Simulation Chat when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (!questions || questions.length === 0) {
      const generatedQuestions = getDefaultClassroomQuestions(prompt, beliefGraph, selectedModel, language);
      setQuestions(generatedQuestions);
      if (onUpdateQuestions) onUpdateQuestions(generatedQuestions);
    }

    const initialMessages: ChatMessage[] = [
      {
        id: 'sys-1',
        sender: 'Lớp Học Nhí',
        role: 'system',
        avatar: '🏫',
        text: language === 'vi' 
          ? 'Chào mừng các bạn nhỏ đến với Lớp Học Trực Tuyến! Giáo viên đang trình chiếu bức tranh tuyệt đẹp lên bảng!'
          : 'Welcome students to our Live Classroom! Teacher is projecting the artwork onto the smartboard!',
        time: '10:00'
      },
      {
        id: 'stu-1',
        sender: 'Bé Bảo Châu',
        role: 'student',
        avatar: '👧',
        text: language === 'vi' 
          ? 'Thưa cô, bức tranh chiếu lên màn hình màu sắc rực rỡ và đẹp quá ạ! 🌈'
          : 'Teacher, the colors on the projector screen look so vibrant and pretty! 🌈',
        time: '10:01'
      },
      {
        id: 'stu-2',
        sender: 'Bé Minh Anh',
        role: 'student',
        avatar: '👦',
        text: language === 'vi' 
          ? 'Em đã sẵn sàng trả lời các câu hỏi trên Bảng câu hỏi để nhận sao điểm 10 rồi ạ! ⭐'
          : 'I am ready to answer questions on the board and earn stars! ⭐',
        time: '10:02'
      }
    ];
    setChatMessages(initialMessages);
  }, [isOpen, prompt, beliefGraph, selectedModel, language]);

  // Audio: Bell Sound
  const playSchoolBell = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const now = ctx.currentTime;
      [
        { freq: 659.25, time: 0, dur: 0.8 },
        { freq: 523.25, time: 0.25, dur: 1.2 },
        { freq: 587.33, time: 0.7, dur: 0.9 },
        { freq: 392.00, time: 1.0, dur: 1.6 }
      ].forEach(chime => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(chime.freq, now + chime.time);
        gain.gain.setValueAtTime(0.15, now + chime.time);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + chime.time + chime.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + chime.time);
        osc.stop(now + chime.time + chime.dur);
      });
    } catch (e) {
      console.warn("Bell sound error", e);
    }
  }, []);

  // Audio: Success Chime for Grading
  const playScoreChime = useCallback((isCorrect: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (isCorrect) {
        // High upbeat tri-tone
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
        // Low soft thud
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

  // Audio: Applause Sound
  const playApplause = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.8));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 1.0;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (e) {
      console.warn("Applause error", e);
    }
  }, []);

  // Speech Narration via Web Speech API
  const toggleSpeechLesson = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const currentQ = questions[activeQuestionIndex];
      const lectureText = language === 'vi'
        ? `Kính chào cả lớp. Thầy cô đang trình chiếu tác phẩm nghệ thuật: ${prompt}. Hãy quan sát chi tiết trên màn hình chiếu và cùng trả lời câu hỏi: ${currentQ ? currentQ.question : ''}`
        : `Welcome class. Broadcasting the artwork for: ${prompt}. Please look at the projector screen and answer: ${currentQ ? currentQ.question : ''}`;

      const utterance = new SpeechSynthesisUtterance(lectureText);
      utterance.lang = language === 'vi' ? 'vi-VN' : 'en-US';
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Floating Reactions
  const triggerReaction = (emoji: string) => {
    const id = Math.random().toString();
    const left = 20 + Math.random() * 60;
    setFloatingReactions(prev => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2200);

    if (emoji === '👏') playApplause();
  };

  // Toggle Hand Raise
  const toggleRaiseHand = () => {
    setIsUserHandRaised(prev => {
      const next = !prev;
      setRaisedHandsCount(c => next ? c + 1 : Math.max(0, c - 1));
      if (next) triggerReaction('✋');
      return next;
    });
  };

  // Audio feedback for microphone toggle (chime on / off)
  const playMicFeedbackSound = useCallback((isOn: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      if (isOn) {
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
      console.warn("Mic sound feedback error", e);
    }
  }, []);

  const showClassroomToast = useCallback((icon: string, text: string) => {
    setClassroomToast({ icon, text });
    setTimeout(() => {
      setClassroomToast(t => (t && t.text === text ? null : t));
    }, 3200);
  }, []);

  // Teacher Microphone Toggle Handler
  const toggleTeacherMic = useCallback(async () => {
    if (isTeacherMicOn) {
      if (teacherMediaStreamRef.current) {
        teacherMediaStreamRef.current.getTracks().forEach(t => t.stop());
        teacherMediaStreamRef.current = null;
      }
      if (teacherAudioAnimRef.current) {
        cancelAnimationFrame(teacherAudioAnimRef.current);
        teacherAudioAnimRef.current = null;
      }
      setTeacherAudioVolume(0);
      setIsTeacherMicOn(false);
      playMicFeedbackSound(false);
      showClassroomToast('🔇', language === 'vi' ? 'Đã tắt micro giáo viên' : 'Teacher microphone muted');
    } else {
      playMicFeedbackSound(true);
      setIsTeacherMicOn(true);
      showClassroomToast('🎙️', language === 'vi' ? 'Đã bật micro giáo viên - Cả lớp có thể nghe bạn nói!' : 'Teacher microphone active - Students can hear you!');
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          teacherMediaStreamRef.current = stream;
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            const buffer = new Uint8Array(analyser.frequencyBinCount);
            const trackVolume = () => {
              analyser.getByteFrequencyData(buffer);
              let sum = 0;
              for (let i = 0; i < buffer.length; i++) sum += buffer[i];
              const avg = sum / buffer.length;
              setTeacherAudioVolume(Math.min(100, Math.round((avg / 128) * 100)));
              teacherAudioAnimRef.current = requestAnimationFrame(trackVolume);
            };
            trackVolume();
          }
        }
      } catch (e) {
        console.warn("Teacher microphone capture fallback", e);
      }
    }
  }, [isTeacherMicOn, language, playMicFeedbackSound, showClassroomToast]);

  // Student Mic Management in Classroom
  const toggleStudentMic = useCallback((studentId: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const nextMic = !s.isMicOn;
        showClassroomToast(
          nextMic ? '🎙️' : '🔇',
          nextMic 
            ? `Đã bật micro cho ${s.name} phát biểu` 
            : `Đã tắt micro của ${s.name}`
        );
        playMicFeedbackSound(nextMic);
        return { ...s, isMicOn: nextMic };
      }
      return s;
    }));
  }, [playMicFeedbackSound, showClassroomToast]);

  const muteAllStudents = useCallback(() => {
    setStudents(prev => prev.map(s => ({ ...s, isMicOn: false })));
    playMicFeedbackSound(false);
    showClassroomToast('🔇', language === 'vi' ? 'Đã tắt micro tất cả học sinh trong lớp' : 'Muted all students');
  }, [language, playMicFeedbackSound, showClassroomToast]);

  // Toggle Teacher Camera (Bật / Tắt Camera của Giáo viên)
  const toggleTeacherCamera = useCallback(async () => {
    if (isTeacherCameraOn) {
      if (teacherCameraStreamRef.current) {
        teacherCameraStreamRef.current.getVideoTracks().forEach(t => t.stop());
        teacherCameraStreamRef.current = null;
      }
      if (teacherVideoRef.current) {
        teacherVideoRef.current.srcObject = null;
      }
      setIsTeacherCameraOn(false);
      playMicFeedbackSound(false);
      showClassroomToast('📷', language === 'vi' ? 'Đã tắt camera giáo viên' : 'Teacher camera turned off');
      onToggleCamera?.(false);
    } else {
      playMicFeedbackSound(true);
      showClassroomToast('📹', language === 'vi' ? 'Đang kết nối camera giáo viên...' : 'Starting camera...');
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
          });
          teacherCameraStreamRef.current = stream;
          if (teacherVideoRef.current) {
            teacherVideoRef.current.srcObject = stream;
          }
          setIsTeacherCameraOn(true);
          showClassroomToast('📹', language === 'vi' ? 'Camera giáo viên đang phát trực tiếp cho lớp!' : 'Teacher camera is live!');
          onToggleCamera?.(true);
        } else {
          setIsTeacherCameraOn(true);
          showClassroomToast('📹', language === 'vi' ? 'Đã bật camera giáo viên (chế độ mô phỏng)' : 'Teacher camera active');
          onToggleCamera?.(true);
        }
      } catch (err) {
        console.warn("Camera access error/fallback", err);
        setIsTeacherCameraOn(true);
        showClassroomToast('📹', language === 'vi' ? 'Đã bật hình đại diện video trực tiếp của giáo viên' : 'Teacher live video feed enabled');
        onToggleCamera?.(true);
      }
    }
  }, [isTeacherCameraOn, language, onToggleCamera, playMicFeedbackSound, showClassroomToast]);

  // Keep teacher video stream attached to video element if element mounts
  useEffect(() => {
    if (isTeacherCameraOn && teacherCameraStreamRef.current && teacherVideoRef.current) {
      if (teacherVideoRef.current.srcObject !== teacherCameraStreamRef.current) {
        teacherVideoRef.current.srcObject = teacherCameraStreamRef.current;
      }
    }
  }, [isTeacherCameraOn]);

  // Student Camera Management in Classroom
  const toggleStudentCamera = useCallback((studentId: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        const nextCam = !s.isCameraOn;
        showClassroomToast(
          nextCam ? '📹' : '📷',
          nextCam 
            ? `Đã yêu cầu bật camera cho ${s.name}` 
            : `Đã tắt camera của ${s.name}`
        );
        playMicFeedbackSound(nextCam);
        return { ...s, isCameraOn: nextCam };
      }
      return s;
    }));
  }, [playMicFeedbackSound, showClassroomToast]);

  const toggleAllStudentCameras = useCallback((turnOn: boolean) => {
    setStudents(prev => prev.map(s => ({ ...s, isCameraOn: turnOn })));
    playMicFeedbackSound(turnOn);
    showClassroomToast(
      turnOn ? '📹' : '📷',
      turnOn 
        ? (language === 'vi' ? 'Đã bật camera tất cả học sinh trong lớp' : 'Enabled all student cameras') 
        : (language === 'vi' ? 'Đã tắt camera tất cả học sinh trong lớp' : 'Disabled all student cameras')
    );
  }, [language, playMicFeedbackSound, showClassroomToast]);

  // Cleanup teacher media streams when modal closes or unmounts
  useEffect(() => {
    return () => {
      if (teacherCameraStreamRef.current) {
        teacherCameraStreamRef.current.getVideoTracks().forEach(t => t.stop());
        teacherCameraStreamRef.current = null;
      }
      if (teacherMediaStreamRef.current) {
        teacherMediaStreamRef.current.getTracks().forEach(t => t.stop());
        teacherMediaStreamRef.current = null;
      }
      if (teacherAudioAnimRef.current) {
        cancelAnimationFrame(teacherAudioAnimRef.current);
      }
    };
  }, []);

  // Smartboard Canvas Mouse & Drawing
  const handleBoardMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (toolMode === 'pen' || toolMode === 'highlighter' || toolMode === 'eraser') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      isDrawingRef.current = true;
      lastPointRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const handleBoardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (toolMode === 'laser') {
      setLaserPos({ x, y });
    }

    if (isDrawingRef.current && lastPointRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);

      if (toolMode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 24;
      } else if (toolMode === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
        ctx.lineCap = 'round';
      }

      ctx.stroke();
      lastPointRef.current = { x, y };
    }
  };

  const handleBoardMouseUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Sticky Notes
  const handleAddSticky = () => {
    if (!newStickyText.trim()) return;
    const colors = [
      'bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100',
      'bg-cyan-100 dark:bg-cyan-900/60 border-cyan-300 dark:border-cyan-700 text-cyan-950 dark:text-cyan-100',
      'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100'
    ];
    setStickyNotes(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        text: newStickyText.trim(),
        color: colors[prev.length % colors.length],
        x: 20 + (prev.length * 15) % 55,
        y: 20 + (prev.length * 12) % 55
      }
    ]);
    setNewStickyText('');
    setShowStickyInput(false);
  };

  // Chat Submission
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: language === 'vi' ? 'Bạn (Giáo viên)' : 'You (Instructor)',
      role: 'teacher',
      avatar: '👨‍🏫',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  // 5. Grading Handler (Học sinh trả lời & Chấm điểm)
  const handleSelectAnswer = (optionIndex: number) => {
    if (gradedQuestions[activeQuestionIndex]) return; // Already graded
    setUserAnswers(prev => ({ ...prev, [activeQuestionIndex]: optionIndex }));
  };

  const handleGradeCurrentQuestion = () => {
    const selected = userAnswers[activeQuestionIndex];
    if (selected === undefined) return;

    const currentQ = questions[activeQuestionIndex];
    if (!currentQ) return;

    const isCorrect = selected === currentQ.correctIndex;
    const earnedPoints = isCorrect ? currentQ.points : 0;

    setGradedQuestions(prev => ({ ...prev, [activeQuestionIndex]: true }));
    setUserTotalScore(prev => prev + earnedPoints);
    setLastGradedResult({ isCorrect, points: earnedPoints });

    playScoreChime(isCorrect);
    if (isCorrect) {
      triggerReaction('🎉');
      playApplause();
    } else {
      triggerReaction('🤔');
    }

    // Add automated student message in chat
    const feedbackMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: language === 'vi' ? 'Hệ thống chấm điểm' : 'Grading System',
      role: 'system',
      avatar: isCorrect ? '🌟' : '💡',
      text: isCorrect
        ? (language === 'vi' 
            ? `Chúc mừng bạn đã trả lời đúng Câu ${activeQuestionIndex + 1}! (+${currentQ.points} điểm)`
            : `Great job! You answered Question ${activeQuestionIndex + 1} correctly! (+${currentQ.points} pts)`)
        : (language === 'vi'
            ? `Câu ${activeQuestionIndex + 1} chưa đúng. Đáp án chuẩn xác là: ${String.fromCharCode(65 + currentQ.correctIndex)}.`
            : `Question ${activeQuestionIndex + 1} was incorrect. Correct answer was ${String.fromCharCode(65 + currentQ.correctIndex)}.`),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, feedbackMsg]);
  };

  const currentImage = validImages[currentImageIndex] || validImages[0];
  const activeQ = questions[activeQuestionIndex];
  const totalPossiblePoints = questions.reduce((acc, q) => acc + q.points, 0);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[2500] flex flex-col font-sans overflow-hidden animate-fade-in transition-colors ${
        isKidBrightTheme
          ? 'bg-gradient-to-br from-amber-50/95 via-sky-50/90 to-pink-50/95 text-slate-800'
          : 'bg-slate-950 text-slate-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Phòng Học Trực Tuyến & Trình Chiếu Cho Học Sinh Tiểu Học"
    >
      {/* Toast Notification for Microphone & Classroom Actions */}
      {classroomToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[3000] px-4 py-2.5 rounded-2xl bg-slate-900/90 text-white border-2 border-amber-300 shadow-2xl flex items-center gap-2 text-xs font-black animate-bounce backdrop-blur-md">
          <span className="text-base">{classroomToast.icon}</span>
          <span>{classroomToast.text}</span>
        </div>
      )}

      {/* ================= TOP HEADER: BRIGHT CHEERFUL PRIMARY SCHOOL BANNER ================= */}
      <header className={`px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0 z-50 border-b shadow-sm transition-colors ${
        isKidBrightTheme
          ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white border-amber-300 shadow-amber-200/50'
          : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        
        {/* Left: Cheerful Class Mascot & Teacher Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white/25 backdrop-blur-md border border-white/40 flex items-center justify-center text-2xl shadow-md shrink-0 transform hover:scale-105 transition-transform">
            🎒
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight truncate drop-shadow-sm flex items-center gap-1.5">
                <span>{language === 'vi' ? 'Lớp Học Trực Tuyến & Chiếu Tranh AI' : 'Live Kid Studio & AI Presentation'}</span>
                <span className="text-xs bg-white/30 text-white px-2 py-0.5 rounded-full font-bold">🏫 Tiểu học</span>
              </h2>

              {/* Live Projector Beam Badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm transition-all ${
                isProjecting 
                  ? 'bg-emerald-500 text-white ring-2 ring-white/70 animate-pulse' 
                  : 'bg-black/30 text-white/80'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isProjecting ? 'bg-white animate-ping' : 'bg-slate-300'}`} />
                <span>{isProjecting ? (language === 'vi' ? '📽️ Đang Chiếu Trực Tiếp' : 'Live Projecting') : (language === 'vi' ? '⏸️ Tạm Dừng Chiếu' : 'Paused')}</span>
              </span>
            </div>

            <p className="text-xs text-white/90 font-medium flex items-center gap-2 truncate">
              <span className="bg-white/20 px-2 py-0.2 rounded-md">👨‍🏫 {language === 'vi' ? 'Giáo viên (Bạn)' : 'Instructor (You)'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                28 {language === 'vi' ? 'bạn nhỏ đang online' : 'little students online'}
              </span>
            </p>
          </div>
        </div>

        {/* Center: Main Projecting Button (Giáo viên ấn nút trình chiếu cho học sinh) */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => {
              setIsProjecting(prev => !prev);
              if (!isProjecting) {
                playSchoolBell();
                triggerReaction('📢');
              }
            }}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all shadow-lg active:scale-95 transform hover:-translate-y-0.5 ${
              isProjecting
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/40 ring-2 ring-white/60'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/40 ring-4 ring-emerald-300/80 animate-bounce'
            }`}
            title="Giáo viên ấn nút để bắt đầu hoặc tạm dừng chiếu tranh cho học sinh"
          >
            <span className="text-lg">{isProjecting ? '⏸️' : '📽️'}</span>
            <span>{isProjecting ? (language === 'vi' ? 'Tạm Dừng Chiếu Cho Học Sinh' : 'Pause Broadcast') : (language === 'vi' ? '✨ Bật Trình Chiếu Cho Các Bạn Nhỏ' : 'Start Projecting to Students')}</span>
          </button>
        </div>

        {/* Right Tools: Mic, Camera, Bell, Speech, Theme Switcher, Layout, Score, Close */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Teacher Microphone Toggle Button */}
          <Tooltip content={isTeacherMicOn ? "Nhấn để tắt micro giáo viên 🔇" : "Nhấn để bật micro giảng bài 🎙️"} position="bottom-left">
            <button
              onClick={toggleTeacherMic}
              className={`p-2 sm:px-3 sm:py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 border ${
                isTeacherMicOn
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-white/60 ring-2 ring-emerald-300 animate-pulse'
                  : 'bg-rose-500/80 hover:bg-rose-600 text-white border-white/40'
              }`}
              aria-label="Toggle Teacher Microphone"
            >
              <span className="text-base">{isTeacherMicOn ? '🎙️' : '🔇'}</span>
              <span className="hidden xl:inline">
                {isTeacherMicOn 
                  ? (language === 'vi' ? 'Mic Đang Bật' : 'Mic On') 
                  : (language === 'vi' ? 'Bật Micro' : 'Unmute Mic')}
              </span>
              {isTeacherMicOn && (
                <span className="hidden xl:flex items-center gap-0.5 h-3 ml-0.5">
                  <span className="w-1 bg-white rounded-full animate-bounce h-2" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 bg-white rounded-full animate-bounce h-3.5" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 bg-white rounded-full animate-bounce h-2" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </button>
          </Tooltip>

          {/* Teacher Camera Toggle Button (Bật / Tắt Camera) */}
          <Tooltip content={isTeacherCameraOn ? "Nhấn để tắt camera giáo viên 📷" : "Nhấn để bật camera gọi video 📹"} position="bottom-left">
            <button
              onClick={toggleTeacherCamera}
              className={`p-2 sm:px-3 sm:py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 border ${
                isTeacherCameraOn
                  ? 'bg-sky-500 hover:bg-sky-600 text-white border-white/60 ring-2 ring-sky-300 animate-pulse'
                  : 'bg-white/20 hover:bg-white/35 text-white border-white/40'
              }`}
              aria-label="Toggle Teacher Camera"
            >
              <span className="text-base">{isTeacherCameraOn ? '📹' : '📷'}</span>
              <span className="hidden xl:inline">
                {isTeacherCameraOn 
                  ? (language === 'vi' ? 'Cam Đang Bật' : 'Camera On') 
                  : (language === 'vi' ? 'Bật Camera' : 'Turn On Cam')}
              </span>
              {isTeacherCameraOn && (
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping inline-block" />
              )}
            </button>
          </Tooltip>

          {/* Bell sound */}
          <Tooltip content="Rung chuông vào lớp / tan học 🔔" position="bottom-left">
            <button
              onClick={playSchoolBell}
              className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-white/25 hover:bg-white/40 text-white border border-white/40 transition-all shadow-sm active:scale-95 font-bold text-xs flex items-center gap-1"
              aria-label="Ring Bell"
            >
              <span className="text-base">🔔</span>
              <span className="hidden xl:inline">Chuông lớp</span>
            </button>
          </Tooltip>

          {/* Speech Narrator */}
          <Tooltip content={isSpeaking ? t.stopSpeech : "Cô giáo đọc câu hỏi cho bé nghe 🗣️"} position="bottom-left">
            <button
              onClick={toggleSpeechLesson}
              className={`p-2 sm:px-3 sm:py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-sm ${
                isSpeaking
                  ? 'bg-amber-300 text-amber-950 border-white ring-2 ring-white animate-pulse'
                  : 'bg-white/25 hover:bg-white/40 text-white border-white/40'
              }`}
              aria-label="Speech Lesson"
            >
              <span className="text-base">🗣️</span>
              <span className="hidden xl:inline">{isSpeaking ? 'Dừng đọc' : 'Đọc bài'}</span>
            </button>
          </Tooltip>

          {/* Theme Switcher Toggle (Bright Primary School vs Dark Classroom) */}
          <button
            onClick={() => setIsKidBrightTheme(prev => !prev)}
            className="p-2 rounded-2xl bg-white/25 hover:bg-white/40 text-white border border-white/40 text-xs font-bold transition-all"
            title={isKidBrightTheme ? "Chuyển sang chế độ tối" : "Chuyển sang sắc màu tươi vui tiểu học"}
          >
            {isKidBrightTheme ? '🌈' : '🌙'}
          </button>

          {/* View Layout Switcher (Split vs Full Projector vs Quiz vs Video Call) */}
          <div className="hidden sm:flex items-center bg-black/20 p-1 rounded-2xl border border-white/30 backdrop-blur-sm">
            <button
              onClick={() => setViewLayout('split')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                viewLayout === 'split' ? 'bg-white text-amber-900 shadow-md font-black' : 'text-white/80 hover:text-white'
              }`}
              title="Xem song song màn hình chiếu & bảng câu hỏi"
            >
              <span>🪟</span>
              <span>Song song</span>
            </button>
            <button
              onClick={() => setViewLayout('projector')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                viewLayout === 'projector' ? 'bg-white text-amber-900 shadow-md font-black' : 'text-white/80 hover:text-white'
              }`}
              title="Phóng to màn hình máy chiếu"
            >
              <span>📽️</span>
              <span>Máy chiếu</span>
            </button>
            <button
              onClick={() => setViewLayout('quiz')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                viewLayout === 'quiz' ? 'bg-white text-amber-900 shadow-md font-black' : 'text-white/80 hover:text-white'
              }`}
              title="Chuyên mục Bảng câu hỏi & chấm điểm"
            >
              <span>📝</span>
              <span>Câu hỏi</span>
            </button>
            <button
              onClick={() => setViewLayout('videocall')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                viewLayout === 'videocall' ? 'bg-amber-400 text-amber-950 shadow-md font-black ring-2 ring-white/80' : 'text-white/80 hover:text-white'
              }`}
              title="Chế độ Video Call lớp học: Lưới camera trực tuyến của thầy cô & học sinh"
            >
              <span>📹</span>
              <span>Video Call</span>
            </button>
          </div>

          {/* Scoreboard trigger */}
          <button
            onClick={() => setShowScoreModal(true)}
            className="px-3 py-2 rounded-2xl bg-amber-300 hover:bg-amber-200 text-amber-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 border-2 border-white"
          >
            <span className="text-base">🏆</span>
            <span>{userTotalScore}/{totalPossiblePoints} đ</span>
          </button>

          {/* Issue Student Accounts Button */}
          {onOpenStudentAccounts && (
            <Tooltip content="Quản lý & Cấp tài khoản học sinh" position="bottom-left">
              <button
                onClick={() => {
                  onClose();
                  onOpenStudentAccounts();
                }}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-emerald-500/80 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 border border-white/40 shadow-sm transition-all"
              >
                <span>👥</span>
                <span className="hidden xl:inline">Cấp TK Học Sinh</span>
              </button>
            </Tooltip>
          )}

          {/* Switch to Student View Button (Role Switching: Retained solely for Admin) */}
          {isAdmin && onSwitchToStudentView && (
            <Tooltip content="Chuyển sang Giao diện Học sinh (Quyền Quản trị viên)" position="bottom-left">
              <button
                onClick={() => {
                  onSelectImageIndex?.(currentImageIndex);
                  onSwitchToStudentView(currentImageIndex);
                  onClose();
                }}
                className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-2xl bg-amber-400/80 hover:bg-amber-400 text-amber-950 font-black text-xs flex items-center gap-1.5 border border-white/40 shadow-sm transition-all"
              >
                <span>👑</span>
                <span className="hidden xl:inline">Góc nhìn HS (Admin)</span>
              </button>
            </Tooltip>
          )}

          {/* Close Classroom */}
          <button
            onClick={() => {
              if (isSpeaking) window.speechSynthesis?.cancel();
              if (teacherMediaStreamRef.current) {
                teacherMediaStreamRef.current.getTracks().forEach(t => t.stop());
                teacherMediaStreamRef.current = null;
              }
              if (teacherCameraStreamRef.current) {
                teacherCameraStreamRef.current.getVideoTracks().forEach(t => t.stop());
                teacherCameraStreamRef.current = null;
              }
              onClose();
            }}
            className="p-2 rounded-2xl bg-white/20 hover:bg-rose-600 text-white transition-all border border-white/40"
            aria-label={t.cancel}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* ================= PARTICIPANT STRIP: PRIMARY SCHOOL WEBCAM ROW ================= */}
      <div className={`px-3 sm:px-6 py-2 flex items-center justify-between gap-3 shrink-0 overflow-x-auto scrollbar-none transition-colors border-b ${
        isKidBrightTheme
          ? 'bg-white/95 backdrop-blur-md border-amber-200/80 shadow-sm'
          : 'bg-slate-950/80 border-slate-800/80'
      }`}>
        <div className="flex items-center gap-2">
          {/* Teacher Badge with Interactive Microphone & Camera Toggle */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs shrink-0 shadow-sm border-2 ${
            isKidBrightTheme
              ? 'bg-sky-50 border-sky-300 text-sky-950'
              : 'bg-blue-950/50 border-blue-500/40 text-blue-200'
          }`}>
            <span className="text-xl">👨‍🏫</span>
            <div className="text-left">
              <div className="font-extrabold text-[12px] flex items-center gap-1">
                <span>{language === 'vi' ? 'Bạn (Giáo viên)' : 'You (Teacher)'}</span>
                <span className="text-[10px] bg-sky-500 text-white px-1.5 py-0.2 rounded-full font-bold">HOST</span>
              </div>
              <div className="text-[10px] text-sky-700 flex items-center gap-1.5 font-semibold mt-0.5">
                <button
                  onClick={toggleTeacherMic}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg font-bold transition-all ${
                    isTeacherMicOn
                      ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                      : 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                  }`}
                  title={isTeacherMicOn ? "Nhấn để tắt micro giáo viên 🔇" : "Nhấn để bật micro giáo viên 🎙️"}
                >
                  <span>{isTeacherMicOn ? '🎙️ Mic Bật' : '🔇 Mic Tắt'}</span>
                  {isTeacherMicOn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />}
                </button>
                <button
                  onClick={toggleTeacherCamera}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg font-bold transition-all ${
                    isTeacherCameraOn
                      ? 'bg-sky-100 hover:bg-sky-200 text-sky-800'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title={isTeacherCameraOn ? "Nhấn để tắt camera giáo viên 📷" : "Nhấn để bật camera giáo viên 📹"}
                >
                  <span>{isTeacherCameraOn ? '📹 Cam Bật' : '📷 Cam Tắt'}</span>
                  {isTeacherCameraOn && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping inline-block" />}
                </button>
                <span>•</span>
                <span className="text-emerald-600 font-bold">🔴 Trực Tiếp</span>
              </div>
            </div>
          </div>

          <div className="w-[2px] h-7 bg-amber-200 mx-1 shrink-0" />

          {/* Primary School Student Badges with Individual Mic & Camera Control */}
          <div className="flex items-center gap-2 shrink-0">
            {students.map((st) => (
              <div 
                key={st.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs shrink-0 transition-all border-2 shadow-sm ${
                  isKidBrightTheme
                    ? 'bg-amber-50/80 border-amber-200 hover:border-amber-300 text-slate-800'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <span className="text-lg">{st.avatar}</span>
                <div className="text-left leading-tight">
                  <div className="text-[11px] font-bold flex items-center gap-1">
                    <span>{st.name}</span>
                    {/* Toggle Mic */}
                    <button
                      onClick={() => toggleStudentMic(st.id)}
                      className={`text-[10px] px-1 py-0.2 rounded hover:bg-black/10 transition-colors ${
                        st.isMicOn ? 'text-emerald-600 font-extrabold' : 'text-slate-400'
                      }`}
                      title={st.isMicOn ? `Tắt mic của ${st.name}` : `Bật mic cho ${st.name} phát biểu`}
                    >
                      {st.isMicOn ? '🎙️' : '🔇'}
                    </button>
                    {/* Toggle Camera */}
                    <button
                      onClick={() => toggleStudentCamera(st.id)}
                      className={`text-[10px] px-1 py-0.2 rounded hover:bg-black/10 transition-colors ${
                        st.isCameraOn ? 'text-sky-600 font-extrabold' : 'text-slate-400'
                      }`}
                      title={st.isCameraOn ? `Tắt camera của ${st.name}` : `Bật camera cho ${st.name}`}
                    >
                      {st.isCameraOn ? '📹' : '📷'}
                    </button>
                  </div>
                  <div className="text-[10px] flex items-center gap-1">
                    {st.isMicOn && <span className="text-emerald-600 font-bold animate-pulse">● Đang nói</span>}
                    {st.isCameraOn && <span className="text-sky-600 font-bold">📹 Cam bật</span>}
                    {st.status === 'submitted' && <span className="text-emerald-600 font-bold">✓ Đã nộp bài</span>}
                    {st.status === 'watching' && !st.isMicOn && !st.isCameraOn && <span className="text-slate-500 font-medium">Đang nghe</span>}
                    {st.status === 'hand_raised' && <span className="text-amber-600 font-black animate-pulse">🙋‍♂️ Giơ tay!</span>}
                    <span className="font-bold text-amber-700">({st.score}đ ⭐)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Interaction: Camera/Mic Batch Actions, Raise hand & Emojis */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mute all students button for teacher */}
          <button
            onClick={muteAllStudents}
            className="px-2.5 py-1.5 rounded-2xl text-xs font-bold bg-white/80 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border-2 border-slate-200 transition-all shadow-sm active:scale-95 flex items-center gap-1"
            title="Tắt micro tất cả học sinh trong lớp"
          >
            <span>🔇</span>
            <span className="hidden sm:inline">Tắt mic cả lớp</span>
          </button>

          {/* Toggle all cameras batch button */}
          <button
            onClick={() => {
              const anyCamOn = students.some(s => s.isCameraOn);
              toggleAllStudentCameras(!anyCamOn);
            }}
            className="px-2.5 py-1.5 rounded-2xl text-xs font-bold bg-white/80 hover:bg-sky-50 hover:text-sky-700 text-slate-700 border-2 border-slate-200 transition-all shadow-sm active:scale-95 flex items-center gap-1"
            title="Bật hoặc tắt camera của tất cả học sinh trong lớp"
          >
            <span>📹</span>
            <span className="hidden sm:inline">
              {students.some(s => s.isCameraOn) ? 'Tắt cam cả lớp' : 'Bật cam cả lớp'}
            </span>
          </button>

          {/* Video call layout quick trigger */}
          <button
            onClick={() => setViewLayout(v => v === 'videocall' ? 'split' : 'videocall')}
            className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all shadow-sm active:scale-95 flex items-center gap-1 border-2 ${
              viewLayout === 'videocall'
                ? 'bg-amber-400 text-amber-950 border-amber-500 ring-2 ring-amber-300'
                : 'bg-white hover:bg-amber-50 text-amber-900 border-amber-300'
            }`}
            title="Xem toàn màn hình Hội nghị Video Call với tất cả học sinh"
          >
            <span>📹</span>
            <span className="hidden sm:inline">{viewLayout === 'videocall' ? 'Màn hình chiếu' : 'Lưới Video Call'}</span>
          </button>

          <button
            onClick={toggleRaiseHand}
            className={`px-3 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
              isUserHandRaised
                ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-500 shadow-md'
                : 'bg-white hover:bg-amber-50 text-amber-800 border-2 border-amber-300'
            }`}
          >
            <span className="text-base">🙋‍♂️</span>
            <span className="hidden sm:inline">{isUserHandRaised ? 'Hạ tay xuống' : 'Giơ tay phát biểu'}</span>
            <span className="text-[11px] bg-amber-200 text-amber-950 px-2 py-0.2 rounded-full font-mono">{raisedHandsCount}</span>
          </button>

          <div className={`flex items-center gap-1 p-1 rounded-2xl border-2 shadow-sm ${
            isKidBrightTheme ? 'bg-white border-amber-200' : 'bg-slate-900 border-slate-800'
          }`}>
            {['❤️', '👏', '💡', '🎉', '🎈', '⭐'].map(emoji => (
              <button
                key={emoji}
                onClick={() => triggerReaction(emoji)}
                className="w-8 h-8 rounded-xl hover:bg-amber-100 text-base active:scale-125 transition-transform flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= MAIN INTERACTIVE CLASSROOM STAGE ================= */}
      <div className={`flex-1 flex flex-col lg:flex-row min-h-0 relative overflow-hidden transition-colors ${
        isKidBrightTheme
          ? 'bg-gradient-to-br from-amber-50/70 via-sky-50/60 to-pink-50/70'
          : 'bg-slate-950'
      }`}>
        
        {/* ================= LEFT / MAIN: PROJECTOR SMARTBOARD SCREEN ================= */}
        {(viewLayout === 'split' || viewLayout === 'projector') && (
          <div className={`${viewLayout === 'split' ? 'lg:w-[58%] xl:w-[60%]' : 'w-full'} flex flex-col min-h-0 p-2 sm:p-4 relative border-r transition-colors ${
            isKidBrightTheme ? 'border-amber-200/80' : 'border-slate-800/80'
          }`}>
            
            {/* Top Projector Bar: Status & Image Slide Switcher */}
            <div className={`flex items-center justify-between gap-2 pb-2 mb-2 border-b shrink-0 ${
              isKidBrightTheme ? 'border-amber-200' : 'border-slate-800/60'
            }`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-amber-900">
                  <span className="text-base">📽️</span>
                  <span>{language === 'vi' ? 'Màn Hình Máy Chiếu Lớp Học' : 'Classroom Projector Screen'}</span>
                </span>
                {isProjecting ? (
                  <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border-2 border-emerald-400 px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>{language === 'vi' ? 'Học sinh đang chăm chú theo dõi màn hình này' : 'Students are viewing this screen'}</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border-2 border-amber-400 px-3 py-0.5 rounded-full">
                    {language === 'vi' ? 'Tạm dừng chiếu - Học sinh chưa thấy' : 'Broadcast paused'}
                  </span>
                )}
              </div>

              {/* Mobile Teacher Broadcast Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsProjecting(p => !p)}
                  className={`md:hidden px-3 py-1.5 rounded-xl text-xs font-black shadow-sm flex items-center gap-1 ${
                    isProjecting ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  <span>{isProjecting ? '⏸️ Dừng' : '📽️ Chiếu'}</span>
                </button>

                {/* If multiple images, switcher */}
                {validImages.length > 1 && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-2xl border-2 shadow-sm ${
                    isKidBrightTheme ? 'bg-white border-amber-200' : 'bg-slate-900 border-slate-800'
                  }`}>
                    <span className="text-[11px] text-amber-900 font-bold mr-0.5">{language === 'vi' ? 'Tranh:' : 'Slide:'}</span>
                    {validImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentImageIndex(idx);
                          onSelectImageIndex?.(idx);
                        }}
                        className={`w-7 h-7 rounded-xl text-xs font-black transition-all ${
                          currentImageIndex === idx
                            ? 'bg-amber-400 text-amber-950 shadow-md ring-2 ring-amber-500'
                            : 'text-slate-600 hover:text-slate-900 bg-amber-50'
                        }`}
                        title={currentImageIndex === idx ? 'Tranh đang chiếu duy nhất cho học sinh' : `Chọn tranh ${idx + 1} để chiếu cho học sinh`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Smartboard Canvas Projector Frame */}
            <div 
              ref={boardContainerRef}
              className={`flex-1 relative border-4 rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden min-h-0 group select-none transition-all ${
                isKidBrightTheme
                  ? isProjecting 
                    ? 'border-amber-400 bg-white ring-4 ring-amber-300/40 shadow-amber-200/50'
                    : 'border-slate-300 bg-slate-50 opacity-90'
                  : isProjecting 
                    ? 'border-blue-500/60 bg-slate-900 ring-1 ring-blue-500/40' 
                    : 'border-slate-800 bg-slate-900 opacity-90'
              }`}
              onMouseDown={handleBoardMouseDown}
              onMouseMove={handleBoardMouseMove}
              onMouseUp={handleBoardMouseUp}
              onMouseLeave={handleBoardMouseUp}
            >
              {/* Cute Corner Stickers for Primary School */}
              <div className="absolute top-3 left-3 text-2xl z-30 pointer-events-none drop-shadow">⭐</div>
              <div className="absolute top-3 right-3 text-2xl z-30 pointer-events-none drop-shadow">🎨</div>
              <div className="absolute bottom-3 left-3 text-2xl z-30 pointer-events-none drop-shadow">🚀</div>
              <div className="absolute bottom-3 right-3 text-2xl z-30 pointer-events-none drop-shadow">🌸</div>

              {/* Projector Light Beam Glow at Top */}
              {isProjecting && (
                <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-amber-400/15 via-transparent to-transparent pointer-events-none" />
              )}

              {/* Projected Image */}
              {currentImage && currentImage.url ? (
                <div className="relative w-full h-full flex items-center justify-center p-3">
                  <img
                    src={currentImage.url}
                    alt="Classroom projected artwork"
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-xl pointer-events-none transition-transform duration-200"
                  />

                  {/* Projector Watermark Indicator */}
                  <div className="absolute top-5 left-12 z-20 pointer-events-none flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border-2 border-amber-300 text-[11px] text-amber-950 font-bold shadow-md">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>TRANH NGHỆ THUẬT AI • HD SẮC NÉT</span>
                  </div>

                  {/* Red Laser Pointer Glow */}
                  {toolMode === 'laser' && laserPos && (
                    <div
                      className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 z-40"
                      style={{ left: `${laserPos.x}px`, top: `${laserPos.y}px` }}
                    >
                      <div className="w-5 h-5 rounded-full bg-rose-500 shadow-[0_0_18px_#f43f5e,0_0_30px_#f43f5e] ring-2 ring-white animate-ping opacity-85" />
                      <div className="w-3.5 h-3.5 rounded-full bg-rose-400 shadow-[0_0_10px_#f43f5e] absolute top-1 left-1" />
                    </div>
                  )}

                  {/* Sticky Notes on Projected Board */}
                  {stickyNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`absolute p-3 rounded-2xl border-2 shadow-xl max-w-[220px] text-xs font-bold cursor-move transition-all z-20 ${note.color}`}
                      style={{ left: `${note.x}%`, top: `${note.y}%` }}
                    >
                      <p className="leading-snug">{note.text}</p>
                      <button
                        onClick={() => setStickyNotes(prev => prev.filter(n => n.id !== note.id))}
                        className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black shadow"
                        title="Xóa ghi chú"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 p-8">
                  <span className="text-5xl block mb-2">🖼️</span>
                  <p className="font-bold">{language === 'vi' ? 'Không có hình ảnh để chiếu' : 'No image to display'}</p>
                </div>
              )}

              {/* Freehand Annotation Canvas Overlay */}
              <canvas
                ref={canvasRef}
                width={1200}
                height={800}
                className={`absolute inset-0 w-full h-full pointer-events-none z-30 ${
                  toolMode === 'pen' || toolMode === 'highlighter' || toolMode === 'eraser' ? 'pointer-events-auto cursor-crosshair' : ''
                }`}
              />

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

              {/* Picture-in-Picture Teacher Live Webcam Feed */}
              {isTeacherCameraOn && (
                <div className="absolute top-4 right-4 z-40 w-48 sm:w-56 aspect-video rounded-2xl overflow-hidden shadow-2xl border-3 border-white ring-2 ring-sky-400 bg-slate-900 flex flex-col group">
                  {teacherCameraStreamRef.current ? (
                    <video
                      ref={el => {
                        teacherVideoRef.current = el;
                        if (el && teacherCameraStreamRef.current && el.srcObject !== teacherCameraStreamRef.current) {
                          el.srcObject = teacherCameraStreamRef.current;
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-sky-600 to-teal-500 flex items-center justify-center flex-col text-white">
                      <span className="text-3xl animate-bounce">👨‍🏫</span>
                      <span className="text-[10px] font-bold mt-1">Webcam Giáo Viên Đang Phát</span>
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-black flex items-center gap-1 backdrop-blur-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>LIVE CAM</span>
                  </div>
                  <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between text-white text-[10px] bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-xl">
                    <span className="font-extrabold truncate">👨‍🏫 Bạn (Giáo viên)</span>
                    <button
                      onClick={toggleTeacherCamera}
                      className="text-[9px] bg-rose-500/80 hover:bg-rose-600 px-1.5 py-0.2 rounded font-bold"
                      title="Tắt camera"
                    >
                      Tắt cam
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Smartboard Teacher Tools Bar */}
            <div className={`mt-2.5 flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl shrink-0 border-2 shadow-sm transition-colors ${
              isKidBrightTheme
                ? 'bg-white border-amber-200'
                : 'bg-slate-900 border-slate-800'
            }`}>
              {/* Drawing & Laser Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tooltip content={t.laserPointer} position="top-left">
                  <button
                    onClick={() => setToolMode('laser')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                      toolMode === 'laser'
                        ? 'bg-rose-500 text-white shadow-rose-300 ring-2 ring-rose-400'
                        : isKidBrightTheme ? 'bg-amber-50 text-amber-950 hover:bg-amber-100' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>🔴</span>
                    <span>{t.laserPointer}</span>
                  </button>
                </Tooltip>

                <Tooltip content="Bút vẽ sáp màu ✏️" position="top">
                  <button
                    onClick={() => setToolMode('pen')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                      toolMode === 'pen'
                        ? 'bg-sky-500 text-white shadow-sky-300 ring-2 ring-sky-400'
                        : isKidBrightTheme ? 'bg-amber-50 text-amber-950 hover:bg-amber-100' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>✏️</span>
                    <span>Bút sáp vẽ</span>
                  </button>
                </Tooltip>

                <Tooltip content="Bút dạ quang màu vàng 🖍️" position="top">
                  <button
                    onClick={() => setToolMode('highlighter')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                      toolMode === 'highlighter'
                        ? 'bg-amber-400 text-amber-950 shadow-amber-300 ring-2 ring-amber-500'
                        : isKidBrightTheme ? 'bg-amber-50 text-amber-950 hover:bg-amber-100' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>🖍️</span>
                    <span>Dạ quang</span>
                  </button>
                </Tooltip>

                <Tooltip content="Xóa nét vẽ 🧹" position="top">
                  <button
                    onClick={clearCanvas}
                    className={`p-1.5 px-2.5 rounded-xl text-xs font-bold transition-colors ${
                      isKidBrightTheme ? 'bg-amber-50 hover:bg-rose-100 text-rose-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <span>🧹</span>
                    <span className="hidden sm:inline ml-1">Xóa bảng</span>
                  </button>
                </Tooltip>

                {/* Primary School Crayon Colors Palette */}
                {toolMode === 'pen' && (
                  <div className="flex items-center gap-1.5 pl-1.5 border-l-2 border-amber-200">
                    {[
                      { c: '#ef4444', label: 'Đỏ táo 🍎' },
                      { c: '#f97316', label: 'Cam cà rốt 🥕' },
                      { c: '#eab308', label: 'Vàng chuối 🍌' },
                      { c: '#10b981', label: 'Xanh cỏ 🍀' },
                      { c: '#06b6d4', label: 'Xanh biển 🌊' },
                      { c: '#8b5cf6', label: 'Tím nho 🍇' },
                      { c: '#ec4899', label: 'Hồng dâu 🍓' }
                    ].map(item => (
                      <button
                        key={item.c}
                        onClick={() => setPenColor(item.c)}
                        title={item.label}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${penColor === item.c ? 'ring-2 ring-amber-500 scale-125 border-white' : 'border-slate-300 hover:scale-110'}`}
                        style={{ backgroundColor: item.c }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Add Sticky note & Screen layout toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowStickyInput(prev => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border-2 border-amber-300 text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                >
                  <span>📝</span>
                  <span>Dán giấy nhớ</span>
                </button>

                <button
                  onClick={() => setViewLayout(l => l === 'split' ? 'projector' : 'split')}
                  className="px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-950 border-2 border-sky-300 text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                >
                  <span>{viewLayout === 'split' ? '🔍 Phóng to tranh' : '🪟 Hiện Bảng câu hỏi'}</span>
                </button>
              </div>
            </div>

            {/* Sticky input */}
            {showStickyInput && (
              <div className="mt-2 p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center gap-2 animate-fade-in shrink-0 shadow-md">
                <input
                  type="text"
                  value={newStickyText}
                  onChange={e => setNewStickyText(e.target.value)}
                  placeholder="Gõ lời nhắn dán lên tranh cho cả lớp cùng xem..."
                  className="flex-1 bg-white border-2 border-amber-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                  onKeyDown={e => e.key === 'Enter' && handleAddSticky()}
                />
                <button
                  onClick={handleAddSticky}
                  className="bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-black px-4 py-2 rounded-xl shadow-md transition-colors"
                >
                  Dán lên bảng ⭐
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= RIGHT: BẢNG CÂU HỎI & CHẤM ĐIỂM HỌC SINH ================= */}
        {(viewLayout === 'split' || viewLayout === 'quiz') && (
          <div className={`${viewLayout === 'split' ? 'lg:w-[42%] xl:w-[40%]' : 'w-full max-w-4xl mx-auto'} flex flex-col min-h-0 p-2 sm:p-4 overflow-hidden`}>
            
            {/* Question Board Card Container */}
            <div className={`flex-1 flex flex-col min-h-0 rounded-3xl border-3 shadow-xl p-3 sm:p-5 overflow-hidden transition-colors ${
              isKidBrightTheme
                ? 'bg-white/95 border-amber-300 shadow-amber-200/50'
                : 'bg-slate-900 border-slate-800'
            }`}>
              
              {/* Question Board Header */}
              <div className={`flex items-center justify-between pb-3 mb-3 border-b shrink-0 ${
                isKidBrightTheme ? 'border-amber-200' : 'border-slate-800'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center text-lg font-black shadow-md">
                    📝
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-2">
                      <span className={isKidBrightTheme ? 'text-amber-950' : 'text-white'}>{t.questionBoard}</span>
                      <span className="text-[11px] bg-rose-500 text-white px-2.5 py-0.5 rounded-full font-black uppercase">
                        {questions.length} CÂU HỎI
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold leading-none">
                      {language === 'vi' ? 'Học sinh trả lời trực tiếp & Hệ thống tự động chấm điểm' : 'Interactive student quiz with instant scoring'}
                    </p>
                  </div>
                </div>

                {/* Score Indicator & Teacher Edit Questions Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowQuestionEditor(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-amber-950 text-xs font-black shadow-md transition-all active:scale-95 border-2 border-white"
                    title="Giáo viên biên tập câu hỏi cho học sinh"
                  >
                    <span>✏️</span>
                    <span>Biên tập câu hỏi</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 px-3 py-1.5 rounded-2xl shadow-md border-2 border-white">
                    <span className="font-extrabold text-xs">Điểm số:</span>
                    <span className="font-black text-base">{userTotalScore}</span>
                    <span className="text-amber-900 text-xs font-bold">/ {totalPossiblePoints}</span>
                  </div>
                </div>
              </div>

              {/* Question Selector Tabs */}
              <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-none pb-1 shrink-0">
                {questions.map((q, idx) => {
                  const isAnswered = userAnswers[idx] !== undefined;
                  const isGraded = gradedQuestions[idx];
                  const isCorrect = isGraded && userAnswers[idx] === q.correctIndex;

                  let badgeColor = isKidBrightTheme ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-slate-800 text-slate-400 border-slate-700';
                  if (isGraded) {
                    badgeColor = isCorrect 
                      ? 'bg-emerald-500 text-white border-emerald-400 font-black shadow-md' 
                      : 'bg-rose-500 text-white border-rose-400 font-black shadow-md';
                  } else if (isAnswered) {
                    badgeColor = 'bg-sky-500 text-white border-sky-400 font-black shadow-md';
                  }

                  return (
                    <button
                      key={q.id || idx}
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

                {/* Quick Add Question Button for Teacher */}
                <button
                  onClick={() => setShowQuestionEditor(true)}
                  className="px-3 py-2 rounded-2xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border-2 border-dashed border-amber-300 transition-colors shrink-0 flex items-center gap-1"
                  title="Thêm hoặc sửa câu hỏi"
                >
                  <span>+</span>
                  <span className="text-[11px]">Soạn câu hỏi</span>
                </button>
              </div>

              {/* Active Question Box */}
              {activeQ ? (
                <div className={`flex-1 flex flex-col min-h-0 rounded-2xl p-3 sm:p-4 shadow-sm overflow-y-auto scrollbar-thin ${
                  isKidBrightTheme
                    ? 'bg-amber-50/50 border-2 border-amber-200/80 text-slate-800'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-100'
                }`}>
                  
                  {/* Question Title & Points */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-extrabold leading-snug">
                        {activeQ.question}
                      </h4>
                      <button
                        onClick={() => setShowQuestionEditor(true)}
                        className="mt-1 text-[11px] text-amber-700 hover:text-amber-900 font-bold underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>Giáo viên chỉnh sửa câu này</span>
                      </button>
                    </div>
                    <span className="text-[11px] font-black bg-amber-400 text-amber-950 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 shadow-sm border border-white">
                      +{activeQ.points} ĐIỂM BÉ NGOAN ⭐
                    </span>
                  </div>

                  {/* Hint Bar for Kids */}
                  <div className="mb-3 p-2.5 bg-sky-100 border-2 border-sky-300 rounded-2xl flex items-center gap-2 text-xs text-sky-950 font-bold">
                    <span className="text-lg">💡</span>
                    <span className="flex-1 leading-snug">{activeQ.hint}</span>
                  </div>

                  {/* Cheerful Colorful Options List (A, B, C, D) */}
                  <div className="space-y-2.5 mb-3.5">
                    {activeQ.options.map((opt, optIdx) => {
                      const isSelected = userAnswers[activeQuestionIndex] === optIdx;
                      const isGraded = gradedQuestions[activeQuestionIndex];
                      const isCorrect = activeQ.correctIndex === optIdx;

                      // Cheerful option color themes for primary school students
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

                  {/* Stats Breakdown of Class Students */}
                  {gradedQuestions[activeQuestionIndex] && (
                    <div className="mb-3 p-3 bg-white border-2 border-amber-200 rounded-2xl space-y-2 text-xs shadow-sm">
                      <div className="flex items-center justify-between text-slate-700 font-extrabold text-[11px]">
                        <span>📊 Thống kê lựa chọn của 28 bạn nhỏ trong lớp:</span>
                        <span className="text-emerald-600 font-black">Đáp án chuẩn: {String.fromCharCode(65 + activeQ.correctIndex)} ⭐</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                        {activeQ.stats.map((percent, idx) => (
                          <div key={idx} className={`p-1.5 rounded-xl border-2 ${idx === activeQ.correctIndex ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-black' : 'bg-slate-50 border-slate-200 text-slate-600 font-bold'}`}>
                            <div className="font-extrabold">{String.fromCharCode(65 + idx)}</div>
                            <div className="font-mono">{percent}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit & Scoring Action Bar */}
                  <div className="mt-auto pt-2 border-t border-amber-200 flex items-center gap-2">
                    {!gradedQuestions[activeQuestionIndex] ? (
                      <button
                        disabled={userAnswers[activeQuestionIndex] === undefined}
                        onClick={handleGradeCurrentQuestion}
                        className="flex-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 disabled:opacity-40 text-white font-black py-3 px-5 rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-400/40 flex items-center justify-center gap-2 active:scale-95 transform hover:-translate-y-0.5"
                      >
                        <span className="text-base">🎯</span>
                        <span>{language === 'vi' ? 'Nộp Bài & Chấm Điểm Cho Bé Ngay' : 'Submit & Grade Now'}</span>
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
                              onClick={() => setShowScoreModal(true)}
                              className="flex-1 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black py-2.5 px-4 rounded-2xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 active:scale-95 border-2 border-white"
                            >
                              <span>🏆</span>
                              <span>Xem Bảng Điểm & Tổng Kết Lớp Học</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Bottom Chat / Discussion Toggle */}
              <div className="mt-2.5 shrink-0">
                <button
                  onClick={() => setShowChatPanel(p => !p)}
                  className={`w-full p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between border-2 transition-colors ${
                    isKidBrightTheme
                      ? 'bg-amber-50/80 border-amber-200 text-amber-950 hover:bg-amber-100'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>💬</span>
                    <span>{language === 'vi' ? 'Góc trò chuyện vui vẻ của lớp' : 'Classroom Discussion'}</span>
                    <span className="text-[10px] bg-sky-500 px-2 py-0.2 rounded-full text-white font-bold">{chatMessages.length}</span>
                  </span>
                  <span>{showChatPanel ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
                </button>

                {/* Chat Drawer */}
                {showChatPanel && (
                  <div className={`mt-1.5 rounded-2xl p-2.5 h-36 flex flex-col min-h-0 animate-fade-in border-2 ${
                    isKidBrightTheme ? 'bg-white border-amber-200' : 'bg-slate-950 border-slate-800'
                  }`}>
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin text-left">
                      {chatMessages.map(msg => (
                        <div key={msg.id} className="text-[11px] leading-snug">
                          <span className="font-extrabold text-slate-800 mr-1.5">{msg.avatar} {msg.sender}:</span>
                          <span className={msg.role === 'teacher' ? 'text-sky-700 font-bold' : msg.role === 'system' ? 'text-amber-700 font-black' : 'text-slate-700'}>
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
                        placeholder="Nhập lời khen hoặc câu hỏi gửi cho các bạn..."
                        className="flex-1 bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-1.5 text-[11px] text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                      <button
                        type="submit"
                        className="bg-sky-500 hover:bg-sky-600 text-white text-[11px] font-black px-3.5 py-1.5 rounded-xl transition-colors shadow-sm"
                      >
                        Gửi
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= FULL CLASSROOM VIDEO CALL CONFERENCE STAGE ================= */}
        {viewLayout === 'videocall' && (
          <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-5 overflow-y-auto scrollbar-thin">
            {/* Top Video Call Bar */}
            <div className={`p-3 rounded-2xl mb-3 flex flex-wrap items-center justify-between gap-3 border-2 shadow-sm ${
              isKidBrightTheme ? 'bg-white/90 border-amber-200' : 'bg-slate-900 border-slate-800 text-white'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white flex items-center justify-center text-lg font-black shadow-md">
                  📹
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                    <span>Hội Nghị Video Call Lớp Học Trực Tuyến</span>
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>{students.filter(s => s.isCameraOn).length + (isTeacherCameraOn ? 1 : 0)} / {students.length + 1} camera đang mở</span>
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Thầy/Cô có thể tương tác trực tiếp, theo dõi biểu cảm và quan sát học sinh trong suốt tiết học
                  </p>
                </div>
              </div>

              {/* Action Buttons in Video Call Header */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={toggleTeacherCamera}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm ${
                    isTeacherCameraOn ? 'bg-sky-500 text-white shadow-sky-400/40' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <span>{isTeacherCameraOn ? '📹 Tắt Camera Thầy/Cô' : '📹 Bật Camera Thầy/Cô'}</span>
                </button>
                <button
                  onClick={toggleTeacherMic}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm ${
                    isTeacherMicOn ? 'bg-emerald-500 text-white shadow-emerald-400/40' : 'bg-rose-500 text-white'
                  }`}
                >
                  <span>{isTeacherMicOn ? '🎙️ Mic Đang Mở' : '🔇 Mic Đang Tắt'}</span>
                </button>
                <button
                  onClick={() => {
                    const anyCamOn = students.some(s => s.isCameraOn);
                    toggleAllStudentCameras(!anyCamOn);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border-2 border-slate-300 text-slate-800 hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <span>{students.some(s => s.isCameraOn) ? '📷 Tắt Cam Cả Lớp' : '📹 Bật Cam Cả Lớp'}</span>
                </button>
                <button
                  onClick={() => setViewLayout('split')}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-400 text-amber-950 border-2 border-white hover:bg-amber-300 transition-all shadow-sm"
                >
                  <span>🪟 Quay lại Màn Hình Chiếu Tranh</span>
                </button>
              </div>
            </div>

            {/* Video Call Conference Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 flex-1">
              {/* 1. TEACHER MASTER VIDEO CARD */}
              <div className="relative rounded-3xl overflow-hidden border-4 border-sky-400 shadow-xl bg-slate-900 aspect-video flex flex-col ring-4 ring-sky-300/40 md:col-span-2 lg:col-span-2">
                {isTeacherCameraOn ? (
                  teacherCameraStreamRef.current ? (
                    <video
                      ref={el => {
                        teacherVideoRef.current = el;
                        if (el && teacherCameraStreamRef.current && el.srcObject !== teacherCameraStreamRef.current) {
                          el.srcObject = teacherCameraStreamRef.current;
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-700 via-sky-800 to-slate-900 flex flex-col items-center justify-center p-4 text-white text-center">
                      <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/60 flex items-center justify-center text-4xl mb-2 animate-pulse shadow-lg">
                        👨‍🏫
                      </div>
                      <h4 className="text-base font-black">Camera Giáo Viên Đang Phát Trực Tiếp</h4>
                      <p className="text-xs text-sky-200 mt-1">Cả lớp đang nhìn thấy và lắng nghe bài giảng của bạn</p>
                    </div>
                  )
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center p-4 text-white text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-700 border-4 border-slate-600 flex items-center justify-center text-4xl mb-2 text-slate-300">
                      👨‍🏫
                    </div>
                    <h4 className="text-sm font-black text-slate-200">Camera Giáo Viên Đang Tắt</h4>
                    <button
                      onClick={toggleTeacherCamera}
                      className="mt-2 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1"
                    >
                      <span>📹</span>
                      <span>Nhấn để bật camera giáo viên</span>
                    </button>
                  </div>
                )}

                {/* Overlay Top Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
                  <span className="px-3 py-1 rounded-full bg-sky-500/90 text-white text-xs font-black shadow-md backdrop-blur-sm flex items-center gap-1.5 border border-white/40">
                    <span>👑</span>
                    <span>GIÁO VIÊN (HOST)</span>
                  </span>
                  {isTeacherCameraOn && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-600/90 text-white text-[11px] font-black flex items-center gap-1 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>HD 1080p</span>
                    </span>
                  )}
                </div>

                {/* Overlay Bottom Bar */}
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between z-20 text-white">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black drop-shadow">Cô Hoàng Mai (Bạn)</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      isTeacherMicOn ? 'bg-emerald-500/80 text-white' : 'bg-rose-500/80 text-white'
                    }`}>
                      {isTeacherMicOn ? '🎙️ Mic Bật' : '🔇 Mic Tắt'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleTeacherMic}
                      className={`p-2 rounded-xl text-xs font-bold transition-all ${
                        isTeacherMicOn ? 'bg-white/20 hover:bg-white/40 text-white' : 'bg-rose-600 text-white'
                      }`}
                      title={isTeacherMicOn ? "Tắt micro" : "Bật micro"}
                    >
                      {isTeacherMicOn ? '🎙️' : '🔇'}
                    </button>
                    <button
                      onClick={toggleTeacherCamera}
                      className={`p-2 rounded-xl text-xs font-bold transition-all ${
                        isTeacherCameraOn ? 'bg-white/20 hover:bg-white/40 text-white' : 'bg-sky-500 text-white'
                      }`}
                      title={isTeacherCameraOn ? "Tắt camera" : "Bật camera"}
                    >
                      {isTeacherCameraOn ? '📹' : '📷'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. STUDENT VIDEO CARDS */}
              {students.map((st) => (
                <div
                  key={st.id}
                  className={`relative rounded-3xl overflow-hidden border-3 shadow-md aspect-video flex flex-col transition-all ${
                    st.status === 'hand_raised'
                      ? 'border-amber-400 ring-4 ring-amber-300/50'
                      : st.isCameraOn
                        ? 'border-emerald-300'
                        : 'border-slate-300 bg-slate-900'
                  }`}
                >
                  {st.isCameraOn ? (
                    <div className={`w-full h-full bg-gradient-to-br ${st.simulatedVideoBg || 'from-sky-400 to-indigo-500'} flex flex-col items-center justify-center relative p-3 text-white overflow-hidden`}>
                      {/* Subtle webcam lighting sweep */}
                      <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/20 rounded-full blur-xl pointer-events-none" />
                      
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-white/25 border-3 border-white/60 flex items-center justify-center text-3xl shadow-lg animate-bounce">
                          {st.avatar}
                        </div>
                        {st.isMicOn && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] animate-pulse">
                            🎙️
                          </div>
                        )}
                      </div>

                      <div className="mt-1 text-center">
                        <span className="text-xs font-black drop-shadow tracking-wide">{st.name}</span>
                        <div className="text-[10px] text-white/90 font-medium">Camera học sinh • Trực tiếp</div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center p-3 text-slate-300">
                      <div className="w-14 h-14 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center text-3xl mb-1 text-slate-400">
                        {st.avatar}
                      </div>
                      <span className="text-xs font-bold text-slate-300">{st.name}</span>
                      <span className="text-[10px] text-slate-500 font-medium">📷 Camera đã tắt</span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-black backdrop-blur-xs flex items-center gap-1">
                      <span>⭐</span>
                      <span>{st.score}đ</span>
                    </span>

                    {st.status === 'hand_raised' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black shadow-md animate-bounce">
                        🙋‍♂️ Giơ tay!
                      </span>
                    ) : st.status === 'submitted' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black shadow-sm">
                        ✓ Đã nộp
                      </span>
                    ) : null}
                  </div>

                  {/* Bottom Control Bar */}
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 via-black/50 to-transparent flex items-center justify-between z-20 text-white">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-black truncate">{st.name}</span>
                      <span className={`w-2 h-2 rounded-full ${st.isMicOn ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Teacher quick toggle of student mic */}
                      <button
                        onClick={() => toggleStudentMic(st.id)}
                        className={`p-1 rounded-lg text-xs font-bold transition-colors ${
                          st.isMicOn ? 'bg-emerald-500 text-white' : 'bg-white/20 hover:bg-white/40 text-white'
                        }`}
                        title={st.isMicOn ? `Tắt mic của ${st.name}` : `Bật mic cho ${st.name}`}
                      >
                        {st.isMicOn ? '🎙️' : '🔇'}
                      </button>

                      {/* Teacher quick toggle of student camera */}
                      <button
                        onClick={() => toggleStudentCamera(st.id)}
                        className={`p-1 rounded-lg text-xs font-bold transition-colors ${
                          st.isCameraOn ? 'bg-sky-500 text-white' : 'bg-white/20 hover:bg-white/40 text-white'
                        }`}
                        title={st.isCameraOn ? `Tắt camera của ${st.name}` : `Bật camera của ${st.name}`}
                      >
                        {st.isCameraOn ? '📹' : '📷'}
                      </button>

                      {/* Teacher reward button: +10 stars */}
                      <button
                        onClick={() => {
                          setStudents(prev => prev.map(s => s.id === st.id ? { ...s, score: s.score + 10 } : s));
                          playApplause();
                          triggerReaction('⭐');
                          showClassroomToast('⭐', `Đã thưởng +10 ngôi sao cho ${st.name}!`);
                        }}
                        className="px-1.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 text-[10px] font-black shadow-xs active:scale-95"
                        title={`Thưởng 10 sao cho ${st.name}`}
                      >
                        +⭐
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: BẢNG ĐIỂM & VINH DANH HỌC SINH TIỂU HỌC ================= */}
      {showScoreModal && (
        <div 
          className="fixed inset-0 z-[2800] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowScoreModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-amber-50 via-white to-pink-50 border-4 border-amber-300 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-left text-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <span className="w-18 h-18 rounded-3xl bg-amber-300 text-amber-950 border-4 border-white inline-flex items-center justify-center text-4xl mb-2 shadow-lg animate-bounce">
                🏆
              </span>
              <h3 className="text-xl font-black text-amber-950">
                {language === 'vi' ? 'BẢNG VINH DANH & CHẤM ĐIỂM LỚP HỌC' : 'CLASSROOM SCOREBOARD & GRADING'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-bold">
                {language === 'vi' ? 'Tổng kết điểm số & khen thưởng các bạn nhỏ' : 'Performance summary on the AI co-created artwork'}
              </p>
            </div>

            {/* User Grade Card */}
            <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 border-2 border-white p-4 rounded-2xl mb-4 text-center text-white shadow-lg">
              <span className="text-xs uppercase font-black tracking-wider block mb-1">
                KẾT QUẢ CỦA BÉ (HỌC VIÊN CHÍNH)
              </span>
              <div className="text-4xl font-black font-mono drop-shadow">
                {userTotalScore} / {totalPossiblePoints} ĐIỂM ⭐
              </div>
              <p className="text-xs mt-1.5 font-bold">
                {userTotalScore >= 30 
                  ? '🌟 XẾP LOẠI: XUẤT SẮC - BÉ LÀ HỌA SĨ NHÍ THÔNG THÁI!' 
                  : userTotalScore >= 20 
                    ? '👍 XẾP LOẠI: KHÁ GIỎI - BÉ QUAN SÁT TRANH RẤT TỐT!' 
                    : '📖 XẾP LOẠI: BÉ CỐ GẮNG - LẦN SAU NHÌN KỸ HƠN NHÉ!'}
              </p>
            </div>

            {/* Top Student Podium List */}
            <div className="space-y-2 mb-5">
              <div className="text-xs font-black text-amber-900 uppercase tracking-wider mb-2">
                Bảng vinh danh các bạn nhỏ trong lớp:
              </div>
              {students
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((st, rank) => (
                  <div key={st.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-white border-2 border-amber-200 text-xs shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        rank === 0 ? 'bg-amber-400 text-amber-950' : rank === 1 ? 'bg-slate-300 text-slate-900' : rank === 2 ? 'bg-orange-300 text-orange-950' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {rank + 1}
                      </span>
                      <span className="text-lg">{st.avatar}</span>
                      <span className="font-extrabold text-slate-800">{st.name}</span>
                    </div>
                    <span className="font-black text-amber-700 font-mono text-sm">{st.score} điểm ⭐</span>
                  </div>
                ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  playApplause();
                  triggerReaction('🎉');
                  setShowScoreModal(false);
                }}
                className="flex-1 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-amber-950 font-black py-3 px-4 rounded-2xl text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 border-2 border-white"
              >
                <span>👏</span>
                <span>Tuyên dương & Vỗ tay khen ngợi bé</span>
              </button>
              <button
                onClick={() => setShowScoreModal(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-2xl text-xs transition-colors border-2 border-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Question Editor Modal */}
      <QuestionEditorModal
        isOpen={showQuestionEditor}
        onClose={() => setShowQuestionEditor(false)}
        questions={questions}
        onSaveQuestions={(updated) => {
          setQuestions(updated);
          if (onUpdateQuestions) onUpdateQuestions(updated);
        }}
        onResetToDefaults={() => {
          const defaults = getDefaultClassroomQuestions(prompt, beliefGraph, selectedModel, language);
          setQuestions(defaults);
          if (onUpdateQuestions) onUpdateQuestions(defaults);
        }}
        language={language}
      />
    </div>
  );
};

export default OnlineClassroomModal;
