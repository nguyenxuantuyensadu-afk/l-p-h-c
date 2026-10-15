
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import PromptInput from './components/PromptInput';
import ClarificationCard from './components/ClarificationCard';
import BeliefGraph from './components/BeliefGraph';
import OutputDisplay from './components/OutputGallery';
import {
  parsePromptToBeliefGraph,
  updateBeliefGraph,
  generateClarifications,
  generateImagesFromPrompt,
  generateStoryFromPrompt,
  refinePromptWithAllUpdates,
} from './services/geminiService';
import { BeliefState, Clarification, GraphUpdate, Attribute, ImagePart, StoryType, GeneratedImage, AspectRatio, Proactiveness, Mode, UserRole, StudentAccount, ClassroomQuestion, TeacherAccount, WebsiteSettings, AuditLogEntry, AdminAccount } from './types';
import ReviewPromptModal from './components/ReviewPromptModal';
import OnlineClassroomModal from './components/OnlineClassroomModal';
import StudentAccountsModal from './components/StudentAccountsModal';
import StudentClassroomView from './components/StudentClassroomView';
import QuestionEditorModal from './components/QuestionEditorModal';
import QuestionDraftingPanel from './components/QuestionDraftingPanel';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { LoginModal } from './components/LoginModal';
import { ExternalAuthPortal } from './components/ExternalAuthPortal';
import { getDefaultClassroomQuestions } from './services/classroomQuestions';
import { Language, translations } from './translations';

const DEFAULT_ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: 'admin-1',
    name: 'Quản Trị Viên Trưởng (Super Admin)',
    username: 'admin',
    email: 'admin@school.edu.vn',
    pin: '123456',
    role: 'super_admin',
    createdAt: '2025-01-10',
    status: 'active',
    avatar: '👑',
    phone: '0901 234 567',
    notes: 'Tài khoản quản trị cao nhất hệ thống'
  },
  {
    id: 'admin-2',
    name: 'Quản Trị Kỹ Thuật (System Admin)',
    username: 'quantri',
    email: 'quantri@school.edu.vn',
    pin: '123456',
    role: 'admin',
    createdAt: '2025-02-15',
    status: 'active',
    avatar: '🛡️',
    phone: '0912 345 678',
    notes: 'Quản lý kỹ thuật và phân quyền giáo viên'
  },
  {
    id: 'admin-3',
    name: 'Quản Trị Học Vụ (Academic Admin)',
    username: 'admin.hocvu',
    email: 'hocvu.admin@school.edu.vn',
    pin: '123456',
    role: 'admin',
    createdAt: '2025-03-01',
    status: 'active',
    avatar: '🌟',
    phone: '0923 456 789',
    notes: 'Phụ trách môn học và tài khoản lớp học'
  }
];

const DEFAULT_TEACHERS: TeacherAccount[] = [
  {
    id: 'tc1',
    name: 'Cô Hoàng Mai',
    email: 'gv.hoangmai@school.edu.vn',
    teacherCode: 'GV-101',
    pin: '123456',
    subject: 'Mỹ thuật & Sáng tạo số',
    classCode: 'LOP-AI-101',
    status: 'active',
    createdAt: '2026-10-01',
    maxStudents: 35
  },
  {
    id: 'tc2',
    name: 'Thầy Nguyễn Hùng',
    email: 'gv.nguyenhung@school.edu.vn',
    teacherCode: 'GV-102',
    pin: '123456',
    subject: 'Tiếng Việt & Kể chuyện AI',
    classCode: 'LOP-AI-102',
    status: 'active',
    createdAt: '2026-10-02',
    maxStudents: 35
  },
  {
    id: 'tc3',
    name: 'Cô Lê Thanh Hằng',
    email: 'gv.thanhhang@school.edu.vn',
    teacherCode: 'GV-103',
    pin: '123456',
    subject: 'Khoa học & Khám phá thế giới',
    classCode: 'LOP-AI-103',
    status: 'active',
    createdAt: '2026-10-03',
    maxStudents: 40
  }
];

const DEFAULT_SETTINGS: WebsiteSettings = {
  enableImageGen: true,
  enableStoryGen: true,
  enableBeliefGraph: true,
  enableClassroom: true,
  enableQuestionQuiz: true,
  enableStudentAccounts: true,
  enableDownloadImages: true,
  enableReferenceUpload: true,
  enableAdminAccountDeletion: true, // Chức năng xóa tài khoản của admin đã mở
  maintenanceMode: false,
  schoolName: 'Trường Tiểu Học Sáng Tạo AI',
  portalTitle: 'Không Gian Sáng Tạo & Học Tập Trực Tuyến',
  systemAnnouncement: 'Chào mừng quý thầy cô và các em học sinh đến với Cổng Sáng tạo AI!',
  showAnnouncement: true,
  defaultPromptTheme: 'Tranh minh họa truyện cổ tích & bài học thiếu nhi',
  maxDailyImagesPerClass: 50
};

const DEFAULT_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '2026-10-09 08:30',
    actor: 'Quản trị viên (Admin)',
    action: 'Khởi tạo hệ thống',
    details: 'Cấu hình các phân hệ web và thiết lập bảo mật ban đầu',
    category: 'system'
  },
  {
    id: 'log-2',
    timestamp: '2026-10-09 09:15',
    actor: 'Quản trị viên (Admin)',
    action: 'Cấp tài khoản giáo viên',
    details: 'Cấp tài khoản cho Cô Hoàng Mai (GV-101) - Lớp LOP-AI-101',
    category: 'account'
  },
  {
    id: 'log-3',
    timestamp: '2026-10-09 10:00',
    actor: 'Quản trị viên (Admin)',
    action: 'Cấp tài khoản giáo viên',
    details: 'Cấp tài khoản cho Thầy Nguyễn Hùng (GV-102) - Lớp LOP-AI-102',
    category: 'account'
  }
];

interface ProposedPromptState {
  text: string;
  qaPairs: any[];
  graphUpdates: GraphUpdate[];
  newAnsweredQuestions: string[];
  action: 'apply' | 'analyze' | 'generate';
}

type ToolTab = 'clarify' | 'graph' | 'attributes' | 'questions';
type MobileView = 'editor' | 'preview';

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('gemini_language') as Language) || 'vi';
  });
  const t = translations[language] || translations.vi;

  const [prompt, setPrompt] = useState<string>(() => {
    return localStorage.getItem('gemini_saved_prompt') || 'một chú mèo đang tổ chức bữa tiệc cho các bạn thỏ';
  });

  useEffect(() => {
    localStorage.setItem('gemini_saved_prompt', prompt);
  }, [prompt]);

  useEffect(() => {
    localStorage.setItem('gemini_language', language);
  }, [language]);

  const [uploadedImages, setUploadedImages] = useState<ImagePart[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  // Default resolution for Image mode
  const [resolution, setResolution] = useState<string>('1K');
  // Default to Image mode model
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite-image');
  const [selectedClarificationModel, setSelectedClarificationModel] = useState<string>('gemini-3-flash-preview');
  const [storyType, setStoryType] = useState<StoryType>('generic');
  const [proactiveness, setProactiveness] = useState<Proactiveness>('medium');
  
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [isAttributesLoading, setIsAttributesLoading] = useState(false);
  const [isClarificationsLoading, setIsClarificationsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpdatingPrompt, setIsUpdatingPrompt] = useState(false);
  
  const [proposedPromptState, setProposedPromptState] = useState<ProposedPromptState | null>(null);
  
  const [isOutdated, setIsOutdated] = useState(false); 
  const [showModeChangePopup, setShowModeChangePopup] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showClassroom, setShowClassroom] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gemini_saved_image_index');
      if (saved) return parseInt(saved, 10) || 0;
    } catch {}
    return 0;
  });

  useEffect(() => {
    localStorage.setItem('gemini_saved_image_index', selectedImageIndex.toString());
  }, [selectedImageIndex]);

  const [accurateImageIndices, setAccurateImageIndices] = useState<number[]>([0]);
  // Default to Image mode
  const [mode, setMode] = useState<Mode>('image');
  
  const modeRef = useRef<Mode>(mode);
  const analysisRequestIdRef = useRef(0);
  const generationRequestIdRef = useRef(0);

  const DEMO_INITIAL_IMAGES: GeneratedImage[] = [
    {
      url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=1200&q=80',
      prompt: 'một chú mèo đang tổ chức bữa tiệc cho các bạn thỏ, bánh kem và trà ấm cúng'
    },
    {
      url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80',
      prompt: 'bữa tiệc sinh nhật ngoài trời ấm cúng của mèo và thỏ'
    }
  ];

  const [images, setImages] = useState<GeneratedImage[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_saved_images');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEMO_INITIAL_IMAGES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('gemini_saved_images', JSON.stringify(images));
    } catch (e) {
      console.warn("Storage quota exceeded for images:", e);
    }
  }, [images]);

  const [story, setStory] = useState<string | null>(null);
  const [galleryErrors, setGalleryErrors] = useState<Record<Mode, string | null>>({ image: null, story: null });
  const [requiresApiKey, setRequiresApiKey] = useState(false);
  
  const [beliefGraph, setBeliefGraph] = useState<BeliefState | null>(() => {
    try {
      const saved = localStorage.getItem('gemini_saved_belief_graph');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  useEffect(() => {
    if (beliefGraph) {
      try {
        localStorage.setItem('gemini_saved_belief_graph', JSON.stringify(beliefGraph));
      } catch (e) {
        console.warn("Storage quota exceeded for belief graph:", e);
      }
    }
  }, [beliefGraph]);

  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);
  const [skippedQuestions, setSkippedQuestions] = useState<string[]>([]); 
  const [hasGenerated, setHasGenerated] = useState(false);

  const [lastAnalyzedPrompt, setLastAnalyzedPrompt] = useState<string | null>(null);
  const [lastAnalyzedMode, setLastAnalyzedMode] = useState<Mode | null>(null);
  // Store a simplified signature of images to detect changes (e.g. count + length of first image)
  const [lastAnalyzedImagesSignature, setLastAnalyzedImagesSignature] = useState<string>("");

  const [pendingAttributeUpdates, setPendingAttributeUpdates] = useState<Record<string, string>>({});
  const [pendingRelationshipUpdates, setPendingRelationshipUpdates] = useState<Record<string, string>>({});
  const [pendingClarificationAnswers, setPendingClarificationAnswers] = useState<{[key: string]: string}>({});
  
  const [activeToolTab, setActiveToolTab] = useState<ToolTab>('clarify');
  const [mobileView, setMobileView] = useState<MobileView>('editor');

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // User Role (Admin vs Teacher vs Student)
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('gemini_user_role') as UserRole) || 'teacher';
  });

  // User Authenticated Role (Xác thực thực tế: 'admin' | 'teacher' | 'student')
  // Chỉ tài khoản Quản Trị Viên (Admin) mới có quyền chuyển đổi vai trò
  const [authenticatedRole, setAuthenticatedRole] = useState<UserRole>(() => {
    return (localStorage.getItem('gemini_auth_role') as UserRole) || (localStorage.getItem('gemini_user_role') as UserRole) || 'teacher';
  });

  const isAdmin = authenticatedRole === 'admin';
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);

  // Admin Accounts (Tài khoản Quản trị viên hệ thống & Chức năng xóa tài khoản admin)
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_admin_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Storage error for admin accounts:", e);
    }
    return DEFAULT_ADMIN_ACCOUNTS;
  });

  const [activeAdmin, setActiveAdmin] = useState<AdminAccount>(() => {
    try {
      const savedId = localStorage.getItem('gemini_active_admin_id');
      const savedAdmins = localStorage.getItem('gemini_admin_accounts');
      const list = savedAdmins ? JSON.parse(savedAdmins) : DEFAULT_ADMIN_ACCOUNTS;
      const found = list.find((a: AdminAccount) => a.id === savedId);
      if (found) return found;
      return list[0] || DEFAULT_ADMIN_ACCOUNTS[0];
    } catch {
      return DEFAULT_ADMIN_ACCOUNTS[0];
    }
  });

  useEffect(() => {
    localStorage.setItem('gemini_admin_accounts', JSON.stringify(adminAccounts));
  }, [adminAccounts]);

  useEffect(() => {
    if (activeAdmin) {
      localStorage.setItem('gemini_active_admin_id', activeAdmin.id);
    }
  }, [activeAdmin]);

  // Teachers managed by Admin
  const [teachers, setTeachers] = useState<TeacherAccount[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_teachers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Storage error for teachers:", e);
    }
    return DEFAULT_TEACHERS;
  });

  const [activeTeacher, setActiveTeacher] = useState<TeacherAccount>(() => {
    try {
      const savedId = localStorage.getItem('gemini_active_teacher_id');
      const savedTeachers = localStorage.getItem('gemini_teachers');
      const list = savedTeachers ? JSON.parse(savedTeachers) : DEFAULT_TEACHERS;
      const found = list.find((t: TeacherAccount) => t.id === savedId);
      if (found) return found;
      return list[0] || DEFAULT_TEACHERS[0];
    } catch {
      return DEFAULT_TEACHERS[0];
    }
  });

  useEffect(() => {
    if (activeTeacher) {
      localStorage.setItem('gemini_active_teacher_id', activeTeacher.id);
    }
  }, [activeTeacher]);

  const classCode = activeTeacher?.classCode || 'LOP-AI-101';

  // Website Settings (Quản lý các hạng mục của web)
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>(() => {
    try {
      const saved = localStorage.getItem('gemini_web_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Storage error for settings:", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Audit Logs (Nhật ký hoạt động của hệ thống)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_audit_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Storage error for audit logs:", e);
    }
    return DEFAULT_AUDIT_LOGS;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('gemini_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('gemini_web_settings', JSON.stringify(websiteSettings));
  }, [websiteSettings]);

  useEffect(() => {
    localStorage.setItem('gemini_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('gemini_user_role', userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem('gemini_auth_role', authenticatedRole);
  }, [authenticatedRole]);

  // Student Accounts issued by teacher (Bắt buộc có tài khoản được cấp)
  const DEFAULT_STUDENT_ACCOUNTS: StudentAccount[] = [
    { id: 'st1', name: 'Bé Bảo Châu', code: 'HS-01', avatar: '👧', score: 30, classCode: 'LOP-AI-101', pin: '123456', status: 'active' },
    { id: 'st2', name: 'Bé Minh Anh', code: 'HS-02', avatar: '👦', score: 30, classCode: 'LOP-AI-101', pin: '123456', status: 'active' },
    { id: 'st3', name: 'Bé Hải Đăng', code: 'HS-03', avatar: '🧒', score: 20, classCode: 'LOP-AI-101', pin: '123456', status: 'active' },
    { id: 'st4', name: 'Bé Mai Phương', code: 'HS-04', avatar: '👧', score: 30, classCode: 'LOP-AI-101', pin: '123456', status: 'active' },
    { id: 'st5', name: 'Bé Tuấn Kiệt', code: 'HS-05', avatar: '👦', score: 20, classCode: 'LOP-AI-101', pin: '123456', status: 'active' },
    { id: 'st6', name: 'Bé Thảo Vy', code: 'HS-06', avatar: '🌸', score: 20, classCode: 'LOP-AI-101', pin: '123456', status: 'active' },
  ];

  const [studentAccounts, setStudentAccounts] = useState<StudentAccount[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_student_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Storage error for student accounts:", e);
    }
    return DEFAULT_STUDENT_ACCOUNTS;
  });

  useEffect(() => {
    localStorage.setItem('gemini_student_accounts', JSON.stringify(studentAccounts));
  }, [studentAccounts]);

  const [activeStudent, setActiveStudent] = useState<StudentAccount>(() => {
    try {
      const savedId = localStorage.getItem('gemini_active_student_id');
      const savedList = localStorage.getItem('gemini_student_accounts');
      const list = savedList ? JSON.parse(savedList) : DEFAULT_STUDENT_ACCOUNTS;
      const found = list.find((s: StudentAccount) => s.id === savedId);
      if (found) return found;
      return list[0] || DEFAULT_STUDENT_ACCOUNTS[0];
    } catch {
      return DEFAULT_STUDENT_ACCOUNTS[0];
    }
  });

  useEffect(() => {
    if (activeStudent) {
      localStorage.setItem('gemini_active_student_id', activeStudent.id);
    }
  }, [activeStudent]);

  // User Authentication & Session State (Quản lý đăng nhập & đăng xuất)
  // User Authentication & Session State (Quản lý đăng nhập & đăng xuất)
  // Quy định: Truy cập ứng dụng bắt buộc phải vào trang đăng nhập trước
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('gemini_is_logged_in') === 'true';
    } catch {
      return false;
    }
  });
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setShowLoginModal(false);
    setShowAdminModal(false);
    setShowClassroom(false);
    setShowStudentAccountsModal(false);
    setShowQuestionEditorModal(false);
    setAuthenticatedRole('teacher');
    setUserRole('teacher');
    try {
      sessionStorage.removeItem('gemini_is_logged_in');
      localStorage.setItem('gemini_is_logged_in', 'false');
      localStorage.removeItem('gemini_auth_role');
      localStorage.setItem('gemini_user_role', 'teacher');
    } catch (e) {
      console.warn("Storage write error on logout:", e);
    }

    const actorName = userRole === 'admin' 
      ? 'Quản trị viên (Admin)' 
      : userRole === 'teacher' 
        ? `Giáo viên: ${activeTeacher?.name || 'Cô Hoàng Mai'}` 
        : `Học sinh: ${activeStudent?.name || 'Bé Bảo Châu'}`;

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: actorName,
      action: 'Đăng xuất khỏi hệ thống',
      details: 'Người dùng đã đăng xuất an toàn khỏi tài khoản.',
      category: 'security'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification("Đã đăng xuất thành công khỏi hệ thống!");
    setTimeout(() => setStatusNotification(null), 3500);
  }, [userRole, activeTeacher, activeStudent]);

  const handleLoginAsAdmin = useCallback((adminUser?: AdminAccount) => {
    if (adminUser) {
      setActiveAdmin(adminUser);
      try {
        localStorage.setItem('gemini_active_admin_id', adminUser.id);
      } catch (e) {
        console.warn("Error storing active admin id:", e);
      }
    }
    setAuthenticatedRole('admin');
    setUserRole('admin');
    setIsLoggedIn(true);
    setShowLoginModal(false);
    setShowAdminModal(true);
    try {
      sessionStorage.setItem('gemini_is_logged_in', 'true');
      localStorage.setItem('gemini_is_logged_in', 'true');
      localStorage.setItem('gemini_auth_role', 'admin');
      localStorage.setItem('gemini_user_role', 'admin');
    } catch (e) {
      console.warn("Storage error on admin login:", e);
    }

    const actorName = adminUser ? `Quản trị viên: ${adminUser.name} (@${adminUser.username})` : 'Quản trị viên (Admin)';

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: actorName,
      action: 'Đăng nhập hệ thống (Admin)',
      details: 'Quản trị viên đăng nhập vào trung tâm điều khiển web & giáo viên.',
      category: 'security'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đăng nhập Quản trị viên (${adminUser?.name || 'Admin'}) thành công!`);
    setTimeout(() => setStatusNotification(null), 3500);
  }, []);

  const handleLoginAsTeacher = useCallback((teacher: TeacherAccount) => {
    setAuthenticatedRole('teacher');
    setActiveTeacher(teacher);
    setUserRole('teacher');
    setIsLoggedIn(true);
    setShowLoginModal(false);
    try {
      sessionStorage.setItem('gemini_is_logged_in', 'true');
      localStorage.setItem('gemini_is_logged_in', 'true');
      localStorage.setItem('gemini_auth_role', 'teacher');
      localStorage.setItem('gemini_user_role', 'teacher');
    } catch (e) {
      console.warn("Storage error on teacher login:", e);
    }

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: `Giáo viên: ${teacher.name}`,
      action: 'Đăng nhập hệ thống (Giáo viên)',
      details: `Giáo viên ${teacher.name} (${teacher.teacherCode}) đăng nhập phòng học ${teacher.classCode}.`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Xin chào Giáo viên ${teacher.name}! Đăng nhập thành công.`);
    setTimeout(() => setStatusNotification(null), 3500);
  }, []);

  const handleLoginAsStudent = useCallback((student: StudentAccount) => {
    setAuthenticatedRole('student');
    setActiveStudent(student);
    setUserRole('student');
    setIsLoggedIn(true);
    setShowLoginModal(false);
    try {
      sessionStorage.setItem('gemini_is_logged_in', 'true');
      localStorage.setItem('gemini_is_logged_in', 'true');
      localStorage.setItem('gemini_auth_role', 'student');
      localStorage.setItem('gemini_user_role', 'student');
    } catch (e) {
      console.warn("Storage error on student login:", e);
    }

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: `Học sinh: ${student.name}`,
      action: 'Vào lớp học (Học sinh)',
      details: `Học sinh ${student.name} (${student.code}) đã tham gia lớp học.`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Chào mừng bạn ${student.name} đã vào lớp học!`);
    setTimeout(() => setStatusNotification(null), 3500);
  }, []);

  // Admin Account & Provisioning Handlers (Chức năng quản lý & Xóa tài khoản của Admin)
  const handleAddAdminAccount = (newAdminData: Omit<AdminAccount, 'id' | 'createdAt'>) => {
    const newAdmin: AdminAccount = {
      ...newAdminData,
      id: `admin-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setAdminAccounts(prev => [...prev, newAdmin]);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: 'Cấp tài khoản Admin mới',
      details: `Đã cấp tài khoản Quản trị viên cho ${newAdmin.name} (@${newAdmin.username} / ${newAdmin.email})`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã cấp tài khoản Quản trị viên mới cho ${newAdmin.name}!`);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const handleUpdateAdminStatus = (id: string, status: 'active' | 'locked') => {
    setAdminAccounts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    const targetAdmin = adminAccounts.find(a => a.id === id);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: status === 'active' ? 'Mở khóa tài khoản Admin' : 'Khóa tài khoản Admin',
      details: `Đã ${status === 'active' ? 'mở khóa' : 'tạm khóa'} tài khoản quản trị viên ${targetAdmin?.name || id}`,
      category: 'security'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã ${status === 'active' ? 'mở khóa' : 'khóa'} tài khoản Admin!`);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const handleResetAdminPin = (id: string, newPin: string) => {
    setAdminAccounts(prev => prev.map(a => a.id === id ? { ...a, pin: newPin } : a));
    const targetAdmin = adminAccounts.find(a => a.id === id);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: 'Đặt lại mã PIN/Mật khẩu Admin',
      details: `Đã cập nhật mã PIN mới cho Quản trị viên ${targetAdmin?.name || id}`,
      category: 'security'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã cập nhật mã PIN mới cho Quản trị viên!`);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const handleDeleteAdminAccount = (id: string) => {
    const targetAdmin = adminAccounts.find(a => a.id === id);
    if (!targetAdmin) return;

    if (adminAccounts.length <= 1) {
      setStatusNotification("Không thể xóa tài khoản Quản trị viên duy nhất trong hệ thống! Cần duy trì ít nhất 1 tài khoản Admin.");
      setTimeout(() => setStatusNotification(null), 4000);
      return;
    }

    setAdminAccounts(prev => prev.filter(a => a.id !== id));

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: 'Xóa tài khoản Admin',
      details: `Đã xóa vĩnh viễn tài khoản Quản trị viên ${targetAdmin.name} (@${targetAdmin.username} - ${targetAdmin.email}) khỏi hệ thống.`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã xóa tài khoản Quản trị viên "${targetAdmin.name}" thành công!`);
    setTimeout(() => setStatusNotification(null), 3500);

    // If current active admin was deleted, switch to another admin or logout
    if (activeAdmin?.id === id) {
      const remaining = adminAccounts.filter(a => a.id !== id);
      if (remaining.length > 0) {
        setActiveAdmin(remaining[0]);
      } else {
        handleLogout();
      }
    }
  };

  const handleAddTeacher = (newTeacherData: Omit<TeacherAccount, 'id' | 'createdAt'>) => {
    const newTeacher: TeacherAccount = {
      ...newTeacherData,
      id: `tc-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setTeachers(prev => [newTeacher, ...prev]);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: 'Cấp tài khoản giáo viên mới',
      details: `Đã cấp tài khoản cho ${newTeacher.name} (${newTeacher.teacherCode}) phụ trách ${newTeacher.subject} - Lớp ${newTeacher.classCode}`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã cấp tài khoản giáo viên cho ${newTeacher.name} (Mã: ${newTeacher.teacherCode})!`);
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const handleUpdateTeacherStatus = (id: string, status: 'active' | 'locked') => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    const teacher = teachers.find(t => t.id === id);
    const actionText = status === 'active' ? 'Mở khóa tài khoản' : 'Tạm khóa tài khoản';

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: actionText,
      details: `${actionText} cho giáo viên ${teacher?.name || id}`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã ${status === 'active' ? 'mở khóa' : 'khóa'} tài khoản giáo viên!`);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const handleResetTeacherPin = (id: string, newPin: string) => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, pin: newPin } : t));
    const teacher = teachers.find(t => t.id === id);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: 'Đặt lại mã PIN giáo viên',
      details: `Đặt lại mã PIN cho giáo viên ${teacher?.name || id}`,
      category: 'security'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã cập nhật mã PIN mới cho giáo viên!`);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const handleDeleteTeacher = (id: string) => {
    const teacher = teachers.find(t => t.id === id);
    setTeachers(prev => prev.filter(t => t.id !== id));

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: 'Xóa tài khoản giáo viên',
      details: `Đã xóa tài khoản giáo viên ${teacher?.name || id}`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã xóa tài khoản giáo viên!`);
    setTimeout(() => setStatusNotification(null), 3000);
  };

  const handleSelectTeacherToImpersonate = (teacher: TeacherAccount) => {
    setActiveTeacher(teacher);
    setUserRole('teacher');

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: 'Chuyển sang kiểm tra giáo viên',
      details: `Quản trị viên chuyển sang kiểm tra tài khoản giáo viên: ${teacher.name} (${teacher.teacherCode})`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã chuyển sang tài khoản giáo viên: ${teacher.name} (${teacher.teacherCode})`);
    setTimeout(() => setStatusNotification(null), 4000);
  };

  const handleUpdateWebsiteSettings = (newSettings: Partial<WebsiteSettings>) => {
    setWebsiteSettings(prev => ({ ...prev, ...newSettings }));

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: 'Cập nhật cấu hình hạng mục web',
      details: `Thay đổi cài đặt các hạng mục và phân hệ trên website`,
      category: 'settings'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã lưu và áp dụng cấu hình các hạng mục website!`);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const handleResetSettingsToDefault = () => {
    setWebsiteSettings(DEFAULT_SETTINGS);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: 'Khôi phục cấu hình mặc định',
      details: `Khôi phục toàn bộ cấu hình hạng mục website về trạng thái ban đầu.`,
      category: 'settings'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã khôi phục cấu hình các hạng mục về mặc định!`);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const [showStudentAccountsModal, setShowStudentAccountsModal] = useState<boolean>(false);

  const handleAddStudentAccount = (name: string, avatar: string) => {
    const nextNum = studentAccounts.length + 1;
    const code = `HS-${nextNum < 10 ? '0' + nextNum : nextNum}`;
    const newAccount: StudentAccount = {
      id: `st-${Date.now()}`,
      name,
      code,
      avatar,
      score: 0,
      classCode,
      pin: '123456',
      status: 'active'
    };
    setStudentAccounts(prev => [...prev, newAccount]);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: userRole === 'admin' ? 'Quản trị viên (Admin)' : `Giáo viên: ${activeTeacher?.name || 'Giáo viên'}`,
      action: 'Cấp tài khoản học sinh',
      details: `Đã cấp tài khoản cho ${name} (${code}) vào lớp ${classCode}. Mã PIN: 123456`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đã cấp tài khoản cho ${name} (Mã: ${code})!`);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const handleDeleteStudentAccount = (id: string) => {
    const targetStudent = studentAccounts.find(s => s.id === id);
    setStudentAccounts(prev => prev.filter(s => s.id !== id));

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: userRole === 'admin' ? 'Quản trị viên (Admin)' : `Giáo viên: ${activeTeacher?.name || 'Giáo viên'}`,
      action: 'Xóa tài khoản học sinh',
      details: `Đã xóa tài khoản học sinh ${targetStudent?.name || id} (${targetStudent?.code || ''}) khỏi hệ thống.`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification("Đã xóa tài khoản học sinh!");
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const handleSwitchToStudentAccount = (st: StudentAccount) => {
    setActiveStudent(st);
    setUserRole('student');

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: 'Quản trị viên (Admin)',
      action: 'Kiểm tra giao diện học sinh',
      details: `Quản trị viên chuyển sang kiểm tra giao diện học sinh: ${st.name} (${st.code})`,
      category: 'security'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification(`Đang xem bằng tài khoản học sinh: ${st.name} (${st.code})`);
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const handleStudentAnswerQuestion = (studentId: string, pointsEarned: number, questionText: string, isCorrect: boolean) => {
    setStudentAccounts(prev => prev.map(s => s.id === studentId ? { ...s, score: (s.score || 0) + pointsEarned } : s));
    setActiveStudent(prev => prev.id === studentId ? { ...prev, score: (prev.score || 0) + pointsEarned } : prev);

    const st = studentAccounts.find(s => s.id === studentId) || activeStudent;
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: `Học sinh: ${st?.name || 'Học sinh'}`,
      action: 'Làm bài tập trắc nghiệm',
      details: `Học sinh ${st?.name} (${st?.code}) đã trả lời: "${questionText.slice(0, 36)}..." -> ${isCorrect ? `Đúng (+${pointsEarned}⭐)` : 'Chưa đúng (0⭐)'}`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleStudentRaiseHand = (studentId: string) => {
    const st = studentAccounts.find(s => s.id === studentId) || activeStudent;
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: `Học sinh: ${st?.name || 'Học sinh'}`,
      action: 'Giơ tay phát biểu ý kiến',
      details: `Học sinh ${st?.name} (${st?.code}) giơ tay xin phát biểu ý kiến trong phòng học.`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleStudentToggleMic = (studentId: string, isMicOn: boolean) => {
    const st = studentAccounts.find(s => s.id === studentId) || activeStudent;
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: `Học sinh: ${st?.name || 'Học sinh'}`,
      action: isMicOn ? 'Bật micro lớp học' : 'Tắt micro lớp học',
      details: `Học sinh ${st?.name} (${st?.code}) đã ${isMicOn ? 'mở micro để phát biểu' : 'tắt micro'} trong phòng học trực tuyến.`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleStudentToggleCamera = (studentId: string, isCameraOn: boolean) => {
    const st = studentAccounts.find(s => s.id === studentId) || activeStudent;
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: `Học sinh: ${st?.name || 'Học sinh'}`,
      action: isCameraOn ? 'Bật camera video call' : 'Tắt camera video call',
      details: `Học sinh ${st?.name} (${st?.code}) đã ${isCameraOn ? 'mở camera tham gia video call' : 'tắt camera'} trong phòng học trực tuyến.`,
      category: 'account'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Shared Classroom Questions (Giáo viên biên tập & Học sinh trả lời - Lưu persistent)
  const [classroomQuestions, setClassroomQuestions] = useState<ClassroomQuestion[]>(() => {
    try {
      const saved = localStorage.getItem('gemini_classroom_questions');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Storage error for classroom questions:", e);
    }
    return getDefaultClassroomQuestions(prompt, beliefGraph, selectedModel, language);
  });

  useEffect(() => {
    localStorage.setItem('gemini_classroom_questions', JSON.stringify(classroomQuestions));
  }, [classroomQuestions]);

  const [showQuestionEditorModal, setShowQuestionEditorModal] = useState<boolean>(false);

  const handleUpdateClassroomQuestions = (updated: ClassroomQuestion[]) => {
    setClassroomQuestions(updated);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: userRole === 'admin' ? 'Quản trị viên (Admin)' : `Giáo viên: ${activeTeacher?.name || 'Giáo viên'}`,
      action: 'Biên tập bộ câu hỏi bài tập',
      details: `Đã lưu danh sách ${updated.length} câu hỏi tương tác cho buổi học.`,
      category: 'settings'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification("Đã cập nhật bộ câu hỏi cho học sinh!");
    setTimeout(() => setStatusNotification(null), 3500);
  };

  const handleResetClassroomQuestions = () => {
    const defaults = getDefaultClassroomQuestions(prompt, beliefGraph, selectedModel, language);
    setClassroomQuestions(defaults);

    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actor: userRole === 'admin' ? 'Quản trị viên (Admin)' : `Giáo viên: ${activeTeacher?.name || 'Giáo viên'}`,
      action: 'Khôi phục câu hỏi mẫu',
      details: `Đã thiết lập lại bộ câu hỏi mẫu tương tác AI theo nội dung tranh.`,
      category: 'settings'
    };
    setAuditLogs(prev => [newLog, ...prev]);

    setStatusNotification("Đã khôi phục câu hỏi mẫu gợi ý theo tranh!");
    setTimeout(() => setStatusNotification(null), 3500);
  };
  
  const introModalRef = useRef<HTMLDivElement>(null);
  const infoModalRef = useRef<HTMLDivElement>(null);
  const lastActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isGenerating) {
        setMobileView('preview');
    }
  }, [isGenerating]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
      if (isDarkMode) {
          document.documentElement.classList.add('dark');
          document.body.style.backgroundColor = '#111827';
      } else {
          document.documentElement.classList.remove('dark');
          document.body.style.backgroundColor = '#f3f4f6';
      }
  }, [isDarkMode]);

  // Update this version whenever you want the welcome screen to show up again for all users
  const APP_VERSION = '2.0';

  // Check if intro has been shown before
  useEffect(() => {
      // Intentionally not checking localStorage so the welcome screen shows every time
  }, []);

  // Trap focus for Intro Modal
  useEffect(() => {
      if (showIntroModal && introModalRef.current) {
          lastActiveElement.current = document.activeElement as HTMLElement;
          const modal = introModalRef.current;
          const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (firstElement) firstElement.focus();

          const handleTab = (e: KeyboardEvent) => {
              if (e.key === 'Tab') {
                  // If focus somehow escaped the modal, bring it back
                  if (!modal.contains(document.activeElement)) {
                      e.preventDefault();
                      firstElement.focus();
                      return;
                  }

                  if (e.shiftKey) { // Shift + Tab
                      if (document.activeElement === firstElement) {
                          e.preventDefault();
                          lastElement.focus();
                      }
                  } else { // Tab
                      if (document.activeElement === lastElement) {
                          e.preventDefault();
                          firstElement.focus();
                      }
                  }
              }
              if (e.key === 'Escape') {
                  closeIntroModal();
              }
          };

          // Use document listener to catch focus events even if focus is currently outside
          document.addEventListener('keydown', handleTab);
          return () => {
              document.removeEventListener('keydown', handleTab);
              if (lastActiveElement.current) lastActiveElement.current.focus();
          };
      }
  }, [showIntroModal]);

  // Trap focus for Info Modal
  useEffect(() => {
      if (showInfoModal && infoModalRef.current) {
          lastActiveElement.current = document.activeElement as HTMLElement;
          const modal = infoModalRef.current;
          const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (firstElement) firstElement.focus();

          const handleTab = (e: KeyboardEvent) => {
              if (e.key === 'Tab') {
                  if (!modal.contains(document.activeElement)) {
                      e.preventDefault();
                      firstElement.focus();
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
                  setShowInfoModal(false);
              }
          };

          document.addEventListener('keydown', handleTab);
          return () => {
              document.removeEventListener('keydown', handleTab);
              if (lastActiveElement.current) lastActiveElement.current.focus();
          };
      }
  }, [showInfoModal]);
  
  // Auto-dismiss mode change popup
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (showModeChangePopup) {
        timer = setTimeout(() => {
            setShowModeChangePopup(false);
        }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showModeChangePopup]);

  const closeIntroModal = () => {
      setShowIntroModal(false);
      localStorage.setItem(`hasSeenProactiveIntro_${APP_VERSION}`, 'true');
  };

  const clearPendingUpdates = () => {
    setPendingAttributeUpdates({});
    setPendingRelationshipUpdates({});
    setPendingClarificationAnswers({});
  };

  const handleStatusUpdate = useCallback((msg: string) => {
    setStatusNotification(msg);
  }, []);

  const handleModeChange = (newMode: Mode) => {
    if (newMode === mode) return;
    analysisRequestIdRef.current += 1;
    generationRequestIdRef.current += 1;
    
    // Check if we have existing analysis data that will become outdated
    const hasAnalysisData = beliefGraph !== null || clarifications.length > 0;

    setMode(newMode);
    setIsGraphLoading(false);
    setIsAttributesLoading(false);
    setIsClarificationsLoading(false);
    setIsGenerating(false);
    setIsUpdatingPrompt(false);
    setStatusNotification(null);
    
    if (hasAnalysisData) setShowModeChangePopup(true);
    
    setRequiresApiKey(false); 
    
    // Set defaults for new mode
    if (newMode === 'image') {
      setAspectRatio('16:9');
      setResolution('1K');
      setSelectedModel('gemini-3.1-flash-lite-image');
    } else {
      setSelectedModel('gemini-flash-latest');
    }
  };

  const getImagesSignature = (imgs: ImagePart[]) => {
      if (imgs.length === 0) return "";
      return `${imgs.length}-${imgs[0].inlineData.data.substring(0, 20)}`;
  };

  const refreshAnalysis = useCallback(async (currentPrompt: string, currentAnsweredQuestions: string[], currentMode: Mode, currentImages: ImagePart[] = [], currentStoryType: StoryType = 'generic', currentClarificationModel: string = 'gemini-3-flash-preview', currentProactiveness: Proactiveness = 'medium', isAugment: boolean = false, graphToAugment?: BeliefState | null) => {
    const requestId = ++analysisRequestIdRef.current;
    const isCurrent = () => modeRef.current === currentMode && analysisRequestIdRef.current === requestId;
    const safeStatusUpdate = (msg: string) => { if (isCurrent()) handleStatusUpdate(msg); };

    setIsGraphLoading(true);
    setIsAttributesLoading(true);
    setIsClarificationsLoading(true);

    let graphPromise;
    const baseGraph = graphToAugment || beliefGraph;
    if (isAugment && baseGraph) {
        graphPromise = updateBeliefGraph(baseGraph, currentPrompt, currentMode, safeStatusUpdate, currentImages, currentStoryType, currentProactiveness, currentClarificationModel);
    } else {
        graphPromise = parsePromptToBeliefGraph(currentPrompt, currentMode, safeStatusUpdate, currentImages, currentStoryType, currentProactiveness, currentClarificationModel);
    }

    graphPromise
        .then(graphStructure => {
            if (isCurrent() && graphStructure) setBeliefGraph(graphStructure);
        })
        .finally(() => {
            if (isCurrent()) {
                setIsGraphLoading(false);
                setIsAttributesLoading(false);
            }
        });

    const clarificationPromise = generateClarifications(currentPrompt, currentAnsweredQuestions, currentMode, safeStatusUpdate, currentImages, currentStoryType, currentClarificationModel, currentProactiveness)
        .then(generatedClarifications => {
            if (isCurrent()) setClarifications(generatedClarifications);
        })
        .finally(() => {
             if (isCurrent()) setIsClarificationsLoading(false);
        });

    if (isCurrent()) {
         setLastAnalyzedPrompt(currentPrompt);
         setLastAnalyzedMode(currentMode);
         setLastAnalyzedImagesSignature(getImagesSignature(currentImages));
    }
    return Promise.all([graphPromise, clarificationPromise]);
  }, [handleStatusUpdate, beliefGraph]);

  const handleRefreshClarifications = useCallback(() => {
    const requestId = ++analysisRequestIdRef.current;
    const requestMode = mode;
    const isCurrent = () => modeRef.current === requestMode && analysisRequestIdRef.current === requestId;
    const safeStatusUpdate = (msg: string) => { if (isCurrent()) handleStatusUpdate(msg); };

    setIsClarificationsLoading(true);
    setPendingClarificationAnswers({});
    setStatusNotification(null);
    
    const currentQuestions = clarifications.map(c => c.question);
    setSkippedQuestions(prev => [...prev, ...currentQuestions]);

    generateClarifications(prompt, [...answeredQuestions, ...skippedQuestions, ...currentQuestions], requestMode, safeStatusUpdate, uploadedImages, storyType, selectedClarificationModel, proactiveness)
        .then(newClarifications => {
            if (isCurrent()) setClarifications(newClarifications);
        })
        .finally(() => {
             if (isCurrent()) setIsClarificationsLoading(false);
        });
  }, [prompt, answeredQuestions, mode, clarifications, skippedQuestions, handleStatusUpdate, uploadedImages, storyType, selectedClarificationModel, proactiveness]);

  const processRequest = useCallback(async (
    currentPrompt: string, 
    currentAnsweredQuestions: string[], 
    currentMode: Mode,
    skipAnalysis: boolean = false,
    skipGeneration: boolean = false,
    currentImages: ImagePart[] = [],
    currentRatio: AspectRatio = '16:9',
    currentResolution: string = '1K',
    currentModel: string = 'gemini-3.1-flash-lite-image',
    currentStoryType: StoryType = 'generic',
    currentClarificationModel: string = 'gemini-3-flash-preview',
    currentProactiveness: Proactiveness = 'medium',
    graphToAugment?: BeliefState | null
  ) => {
    const genRequestId = ++generationRequestIdRef.current;
    const requestMode = currentMode;
    const isGenCurrent = () => modeRef.current === requestMode && generationRequestIdRef.current === genRequestId;
    const safeGenStatusUpdate = (msg: string) => { if (isGenCurrent()) handleStatusUpdate(msg); };

    setGalleryErrors(prev => ({ ...prev, [requestMode]: null }));
    setRequiresApiKey(false);

    if (!skipGeneration) {
        if (requestMode === 'image') setImages([]);
        else if (requestMode === 'story') setStory(null);
        setIsOutdated(false);
    }
    
    setStatusNotification(null);
    setShowModeChangePopup(false);
    
    const isAugment = (graphToAugment !== undefined ? graphToAugment !== null : beliefGraph !== null) && 
                      lastAnalyzedMode === currentMode && 
                      lastAnalyzedImagesSignature === getImagesSignature(currentImages);

    if (!skipAnalysis) {
        if (!isAugment) {
            setBeliefGraph(null); 
        }
        setClarifications([]);
        clearPendingUpdates();
        setSkippedQuestions([]); 
    }
    
    const analysisPromise = !skipAnalysis 
        ? refreshAnalysis(currentPrompt, currentAnsweredQuestions, currentMode, currentImages, currentStoryType, currentClarificationModel, currentProactiveness, isAugment, graphToAugment)
        : Promise.resolve();

    let generationPromise = Promise.resolve();
    if (!skipGeneration) {
        setIsGenerating(true);
        setGalleryErrors(prev => ({ ...prev, [requestMode]: null }));
        setRequiresApiKey(false);
        generationPromise = (async () => {
            try {
                if (requestMode === 'image') {
                    const generatedImages = await generateImagesFromPrompt(currentPrompt, safeGenStatusUpdate, currentImages, currentRatio, currentModel, currentResolution);
                    if (isGenCurrent()) {
                        setImages(generatedImages);
                        setRequiresApiKey(false);
                        setGalleryErrors(prev => ({ ...prev, [requestMode]: null }));
                    }
                } else if (requestMode === 'story') {
                    const generatedStory = await generateStoryFromPrompt(currentPrompt, safeGenStatusUpdate, currentImages, currentModel, currentStoryType);
                    if (isGenCurrent()) {
                        setStory(generatedStory);
                        setRequiresApiKey(false);
                        setGalleryErrors(prev => ({ ...prev, [requestMode]: null }));
                    }
                }
            } catch (error: any) {
                if (isGenCurrent()) {
                    const rawMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
                    let userFriendlyError = rawMsg;
                    const currentT = translations[language] || translations.vi;
                    
                    // Handle API key & Quota issues
                    if (rawMsg.includes("Requested entity was not found") || 
                        rawMsg.includes("API_KEY_INVALID") ||
                        rawMsg.includes("invalid api key")) {
                        setRequiresApiKey(true);
                        userFriendlyError = language === 'vi'
                            ? "Vui lòng chọn khóa API hợp lệ để tiếp tục."
                            : "Please select a valid API key to continue.";
                    } else if (rawMsg.includes("429") || 
                               rawMsg.includes("RESOURCE_EXHAUSTED") || 
                               rawMsg.includes("QUOTA_EXCEEDED") || 
                               rawMsg.includes("quota") || 
                               rawMsg.includes("Quota") ||
                               rawMsg.includes("limit: 0") ||
                               rawMsg.includes("FreeTier")) {
                        setRequiresApiKey(true);
                        userFriendlyError = currentT.quotaExceededDesc;
                    } else if (language === 'vi') {
                        userFriendlyError = `Tạo ${requestMode === 'image' ? 'hình ảnh' : 'truyện'} thất bại: ${rawMsg}`;
                    }
                    
                    setGalleryErrors(prev => ({ ...prev, [requestMode]: userFriendlyError }));
                }
            } finally {
                if (isGenCurrent()) {
                    setIsGenerating(false);
                }
            }
        })();
    }
    
    await Promise.all([analysisPromise, generationPromise]).finally(() => {
        if (isGenCurrent()) {
            setStatusNotification(null);
        }
    });
  }, [refreshAnalysis, handleStatusUpdate, beliefGraph, lastAnalyzedMode, lastAnalyzedImagesSignature]);

  const handlePromptSubmit = useCallback(async () => {
    setHasGenerated(true);
    const qaPairs = Object.entries(pendingClarificationAnswers).map(([q, a]) => ({question: q, answer: a as string}));
    const graphUpdates: GraphUpdate[] = [];
    Object.entries(pendingAttributeUpdates).forEach(([key, value]) => {
        const [entity, attribute] = key.split(':');
        graphUpdates.push({ type: 'attribute', entity, attribute, value: value as string });
    });
    Object.entries(pendingRelationshipUpdates).forEach(([key, value]) => {
        const [source, target] = key.split(':');
        const originalRel = beliefGraph?.relationships.find(r => r.source === source && r.target === target);
        if (originalRel) graphUpdates.push({ type: 'relationship', source, target, oldLabel: originalRel.label, newLabel: value as string });
    });

    let targetPrompt = prompt;
    let targetAnsweredQuestions = [...answeredQuestions];
    let shouldSkipAnalysis = false;

    if (qaPairs.length > 0 || graphUpdates.length > 0) {
        setIsUpdatingPrompt(true);
        try {
            const refinedPrompt = await refinePromptWithAllUpdates(prompt, qaPairs, graphUpdates, handleStatusUpdate, proactiveness);
            setProposedPromptState({
                text: refinedPrompt,
                qaPairs,
                graphUpdates,
                newAnsweredQuestions: [...answeredQuestions, ...qaPairs.map(a => a.question)],
                action: 'generate'
            });
        } finally {
            setIsUpdatingPrompt(false);
        }
    } else {
        const currentImagesSignature = getImagesSignature(uploadedImages);
        shouldSkipAnalysis = prompt === lastAnalyzedPrompt && mode === lastAnalyzedMode && currentImagesSignature === lastAnalyzedImagesSignature;
        processRequest(targetPrompt, targetAnsweredQuestions, mode, shouldSkipAnalysis, false, uploadedImages, aspectRatio, resolution, selectedModel, storyType, selectedClarificationModel, proactiveness);
    }
  }, [prompt, mode, lastAnalyzedPrompt, lastAnalyzedMode, lastAnalyzedImagesSignature, answeredQuestions, pendingClarificationAnswers, pendingAttributeUpdates, pendingRelationshipUpdates, beliefGraph, processRequest, handleStatusUpdate, uploadedImages, aspectRatio, resolution, selectedModel, storyType, selectedClarificationModel, proactiveness]);

  const handleAnalyzeOnly = useCallback(async () => {
     setHasGenerated(true);
     const hasPendingUpdates = Object.keys(pendingClarificationAnswers).length > 0 || 
                               Object.keys(pendingAttributeUpdates).length > 0 || 
                               Object.keys(pendingRelationshipUpdates).length > 0;
     
     if (hasPendingUpdates) {
         if (isUpdatingPrompt) return;
         setIsUpdatingPrompt(true);
         const qaPairs = Object.entries(pendingClarificationAnswers).map(([q, a]) => ({question: q, answer: a as string}));
         const graphUpdates: GraphUpdate[] = [];
         Object.entries(pendingAttributeUpdates).forEach(([key, value]) => {
             const [entity, attribute] = key.split(':');
             graphUpdates.push({ type: 'attribute', entity, attribute, value: value as string });
         });
         Object.entries(pendingRelationshipUpdates).forEach(([key, value]) => {
             const [source, target] = key.split(':');
             const originalRel = beliefGraph?.relationships.find(r => r.source === source && r.target === target);
             if (originalRel) graphUpdates.push({ type: 'relationship', source, target, oldLabel: originalRel.label, newLabel: value as string });
         });

         const newAnsweredQuestions = [...answeredQuestions, ...qaPairs.map(a => a.question)];

         try {
             const newRefinedPrompt = await refinePromptWithAllUpdates(prompt, qaPairs, graphUpdates, handleStatusUpdate, proactiveness);
             setProposedPromptState({
                 text: newRefinedPrompt,
                 qaPairs,
                 graphUpdates,
                 newAnsweredQuestions,
                 action: 'analyze'
             });
         } finally {
             setIsUpdatingPrompt(false);
         }
     } else {
         setAnsweredQuestions([]);
         setClarifications([]);
         processRequest(prompt, [], mode, false, true, uploadedImages, aspectRatio, resolution, selectedModel, storyType, selectedClarificationModel, proactiveness);
     }
  }, [prompt, mode, processRequest, uploadedImages, aspectRatio, resolution, selectedModel, storyType, selectedClarificationModel, pendingClarificationAnswers, pendingAttributeUpdates, pendingRelationshipUpdates, isUpdatingPrompt, answeredQuestions, beliefGraph, handleStatusUpdate, clearPendingUpdates, proactiveness]);

  const handleSelectApiKey = async () => {
      setRequiresApiKey(false);
      setGalleryErrors(prev => ({ ...prev, [mode]: null }));
      setStatusNotification(
          language === 'vi'
              ? "Đã sẵn sàng. Bạn có thể nhấn 'Tạo Ảnh' để thử lại với khóa API mới!"
              : "Ready. You can click 'Generate Image' to try with your new API key!"
      );
      setTimeout(() => setStatusNotification(null), 5000);
  };

  const handleApplyAllUpdates = async () => {
    if (isUpdatingPrompt) return;
    setIsUpdatingPrompt(true);
    const qaPairs = Object.entries(pendingClarificationAnswers).map(([q, a]) => ({question: q, answer: a as string}));
    const graphUpdates: GraphUpdate[] = [];
    Object.entries(pendingAttributeUpdates).forEach(([key, value]) => {
        const [entity, attribute] = key.split(':');
        graphUpdates.push({ type: 'attribute', entity, attribute, value: value as string });
    });
    Object.entries(pendingRelationshipUpdates).forEach(([key, value]) => {
        const [source, target] = key.split(':');
        const originalRel = beliefGraph?.relationships.find(r => r.source === source && r.target === target);
        if (originalRel) graphUpdates.push({ type: 'relationship', source, target, oldLabel: originalRel.label, newLabel: value as string });
    });

    const newAnsweredQuestions = [...answeredQuestions, ...qaPairs.map(a => a.question)];

    try {
        const newRefinedPrompt = await refinePromptWithAllUpdates(prompt, qaPairs, graphUpdates, handleStatusUpdate, proactiveness);
        setProposedPromptState({
            text: newRefinedPrompt,
            qaPairs,
            graphUpdates,
            newAnsweredQuestions,
            action: 'apply'
        });
    } finally {
        setIsUpdatingPrompt(false);
    }
  };

  const handleAcceptProposedPrompt = (editedPrompt: string) => {
      if (!proposedPromptState) return;
      const { newAnsweredQuestions, action, graphUpdates } = proposedPromptState;
      setPrompt(editedPrompt);
      setAnsweredQuestions(newAnsweredQuestions);
      setIsOutdated(true);
      
      let updatedGraph = beliefGraph ? JSON.parse(JSON.stringify(beliefGraph)) : null;
      if (updatedGraph && graphUpdates && graphUpdates.length > 0) {
          graphUpdates.forEach(update => {
              if (update.type === 'attribute') {
                  const entity = updatedGraph.entities.find((e: any) => e.name === update.entity);
                  if (entity) {
                      const attr = entity.attributes.find((a: any) => a.name === update.attribute);
                      if (attr) {
                          attr.value = [{ name: update.value }];
                          attr.presence_in_prompt = true;
                      }
                      entity.presence_in_prompt = true;
                  }
              } else if (update.type === 'relationship') {
                  const rel = updatedGraph.relationships.find((r: any) => r.source === update.source && r.target === update.target);
                  if (rel) {
                      rel.label = update.newLabel;
                      rel.presence_in_prompt = true;
                  }
              }
          });
          setBeliefGraph(updatedGraph);
      }

      clearPendingUpdates();
      setProposedPromptState(null);
      
      if (action === 'analyze') {
          processRequest(editedPrompt, newAnsweredQuestions, mode, false, true, uploadedImages, aspectRatio, resolution, selectedModel, storyType, selectedClarificationModel, proactiveness, updatedGraph);
      } else if (action === 'apply') {
          refreshAnalysis(editedPrompt, newAnsweredQuestions, mode, uploadedImages, storyType, selectedClarificationModel, proactiveness, true, updatedGraph);
      } else if (action === 'generate') {
          processRequest(editedPrompt, newAnsweredQuestions, mode, false, false, uploadedImages, aspectRatio, resolution, selectedModel, storyType, selectedClarificationModel, proactiveness, updatedGraph);
      }
  };

  const handleRejectProposedPrompt = () => {
      setProposedPromptState(null);
  };

  const handleUseAsReference = useCallback((imageDataUrl: string) => {
    try {
      // Data URLs are like: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
      const [header, data] = imageDataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
      
      const newImage: ImagePart = {
        inlineData: {
          data,
          mimeType
        }
      };
      
      setUploadedImages(prev => [...prev, newImage]);
      setMobileView('editor'); // Switch to editor so the user sees the new reference
      handleStatusUpdate(t.imageAddedAsReference);
      setTimeout(() => setStatusNotification(prev => prev === t.imageAddedAsReference ? null : prev), 3000);
    } catch (e) {
      console.error("Failed to parse image data URL", e);
    }
  }, [handleStatusUpdate, t]);

  const handleApplyStoryToPrompt = useCallback(() => {
    if (story) {
        setPrompt(story);
        setMobileView('editor');
        handleStatusUpdate(t.storyAppliedToPrompt);
        setTimeout(() => setStatusNotification(prev => prev === t.storyAppliedToPrompt ? null : prev), 3000);
    }
  }, [story, handleStatusUpdate, t]);
  
  const ToolTabButton = ({ label, tab, current }: { label: string, tab: ToolTab, current: ToolTab }) => (
      <button 
        onClick={() => setActiveToolTab(tab)}
        className={`flex-1 py-2 text-[12px] font-normal text-center transition-colors relative z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-400 focus-visible:ring-inset rounded-t-sm ${current === tab ? 'text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 border-b-2 border-blue-600 dark:border-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700'}`}
      >
        {label}
      </button>
  );

  const totalUpdateCount = Object.keys(pendingClarificationAnswers).length + Object.keys(pendingAttributeUpdates).length + Object.keys(pendingRelationshipUpdates).length;

  const isBannerVisible = isUpdatingPrompt || statusNotification;

  // When logged out: completely exit to external login portal (Chỉ tài khoản được cấp mới được truy cập)
  if (!isLoggedIn) {
    return (
      <ExternalAuthPortal
        schoolName={websiteSettings.schoolName}
        portalTitle={websiteSettings.portalTitle}
        teachers={teachers}
        students={studentAccounts}
        adminAccounts={adminAccounts}
        onLoginAsAdmin={handleLoginAsAdmin}
        onLoginAsTeacher={handleLoginAsTeacher}
        onLoginAsStudent={handleLoginAsStudent}
        language={language}
        onToggleLanguage={() => setLanguage(l => l === 'vi' ? 'en' : 'vi')}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''} font-sans fixed inset-0 flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-200 overflow-hidden`}>
      {userRole === 'student' ? (
        <StudentClassroomView
          student={activeStudent}
          selectedImage={(() => {
            const allImgs = images.length > 0 ? images : DEMO_INITIAL_IMAGES;
            const validImgs = allImgs.filter(img => !!img.url);
            return validImgs[selectedImageIndex] || validImgs[0] || allImgs[0];
          })()}
          images={[(() => {
            const allImgs = images.length > 0 ? images : DEMO_INITIAL_IMAGES;
            const validImgs = allImgs.filter(img => !!img.url);
            return validImgs[selectedImageIndex] || validImgs[0] || allImgs[0];
          })()]}
          initialImageIndex={0}
          prompt={(() => {
            const allImgs = images.length > 0 ? images : DEMO_INITIAL_IMAGES;
            const validImgs = allImgs.filter(img => !!img.url);
            const chosen = validImgs[selectedImageIndex] || validImgs[0] || allImgs[0];
            return chosen?.prompt || prompt;
          })()}
          beliefGraph={beliefGraph}
          selectedModel={selectedModel}
          isTeacherProjecting={true}
          onSwitchToTeacher={() => {
            if (isAdmin) {
              setUserRole('admin');
            }
          }}
          studentsList={studentAccounts}
          onSelectStudent={(st) => setActiveStudent(st)}
          questions={classroomQuestions}
          language={language}
          onLogout={handleLogout}
          isAdmin={isAdmin}
          onAnswerQuestion={handleStudentAnswerQuestion}
          onRaiseHand={handleStudentRaiseHand}
          onToggleMic={handleStudentToggleMic}
          onToggleCamera={handleStudentToggleCamera}
        />
      ) : (
        <>
          <Header 
              isDarkMode={isDarkMode} 
              toggleDarkMode={() => setIsDarkMode(!isDarkMode)} 
              onShowInfo={() => setShowInfoModal(true)}
              isLoading={isGenerating || isUpdatingPrompt || isGraphLoading || isClarificationsLoading}
              mode={mode}
              language={language}
              onToggleLanguage={() => setLanguage(l => l === 'vi' ? 'en' : 'vi')}
              onOpenClassroom={() => {
                if (!websiteSettings.enableClassroom) {
                  setStatusNotification("Hạng mục Lớp học trực tuyến đang bị tạm khóa bởi Admin.");
                  setTimeout(() => setStatusNotification(null), 3000);
                  return;
                }
                setShowClassroom(true);
              }}
              userRole={userRole}
              isAdminAccount={isAdmin}
              teacherName={activeTeacher?.name || 'Cô Hoàng Mai'}
              studentName={activeStudent.name}
              schoolName={websiteSettings.schoolName}
              onOpenStudentAccounts={() => setShowStudentAccountsModal(true)}
              onOpenAdminDashboard={() => setShowAdminModal(true)}
              onSelectRole={isAdmin ? (r) => {
                setUserRole(r);
                if (r === 'admin') {
                  setShowAdminModal(true);
                }
                const newLog: AuditLogEntry = {
                  id: `log-${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                  actor: 'Quản trị viên (Admin)',
                  action: 'Chuyển đổi giao diện kiểm tra',
                  details: `Quản trị viên chuyển giao diện sang: ${r === 'admin' ? 'Quản Trị Viên' : r === 'teacher' ? 'Giáo Viên' : 'Học Sinh'}`,
                  category: 'security'
                };
                setAuditLogs(prev => [newLog, ...prev]);
              } : undefined}
              onLogout={handleLogout}
          />

          {/* Admin Role Preview Bar (Retained solely for Admin) */}
          {isAdmin && userRole !== 'admin' && (
            <div className="bg-amber-400 text-amber-950 px-3 sm:px-4 py-1.5 text-xs font-black flex items-center justify-between border-b border-amber-500 shadow-xs z-[99]">
              <div className="flex items-center gap-2">
                <span className="text-sm">👑</span>
                <span>Đang xem giao diện: <strong className="uppercase">{userRole === 'teacher' ? 'Giáo Viên' : 'Học Sinh'}</strong> (Chế độ Quản Trị Viên kiểm tra)</span>
              </div>
              <button
                onClick={() => setUserRole('admin')}
                className="px-3 py-1 rounded-lg bg-amber-900 hover:bg-black text-amber-100 font-black text-xs transition-colors shadow-xs flex items-center gap-1 active:scale-95"
              >
                <span>👑</span>
                <span>Quay lại Admin</span>
              </button>
            </div>
          )}

          {/* System Broadcast Announcement Banner (Quản lý bởi Admin) */}
          {websiteSettings.showAnnouncement && websiteSettings.systemAnnouncement && (
            <div className="bg-gradient-to-r from-amber-600 via-indigo-600 to-blue-700 text-white px-3 sm:px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-sm z-[95] shrink-0">
              <div className="flex items-center gap-2 truncate">
                <span className="text-sm shrink-0">📢</span>
                <span className="truncate">{websiteSettings.systemAnnouncement}</span>
              </div>
              <button
                onClick={() => setWebsiteSettings(prev => ({ ...prev, showAnnouncement: false }))}
                className="text-white/80 hover:text-white px-1.5 py-0.5 rounded font-bold text-xs shrink-0 hover:bg-white/20 transition-colors"
                title="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          )}

          {/* Maintenance Alert Banner */}
          {websiteSettings.maintenanceMode && userRole !== 'admin' && (
            <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 shadow-sm z-[95]">
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0">🔒</span>
                <span>Website đang trong chế độ bảo trì bởi Quản trị viên. Các tính năng tạo nội dung đang tạm khóa.</span>
              </div>
              {isAdmin && (
                <button
                  onClick={() => {
                    setUserRole('admin');
                    setShowAdminModal(true);
                  }}
                  className="px-2.5 py-1 rounded bg-white text-rose-800 font-black text-xs hover:bg-rose-50 transition-colors shrink-0"
                >
                  Về trang Admin
                </button>
              )}
            </div>
          )}

          {/* Admin Control Ribbon */}
          {userRole === 'admin' && (
            <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 dark:from-amber-950/80 dark:via-amber-900/60 dark:to-amber-950/80 border-b border-amber-300 dark:border-amber-800 px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs text-amber-950 dark:text-amber-200 shrink-0 shadow-xs z-[90]">
              <div className="flex items-center gap-2 font-bold truncate">
                <span className="text-base shrink-0">👑</span>
                <span className="truncate">
                  Chế độ: <strong className="font-black text-amber-900 dark:text-amber-100">Quản Trị Viên (Admin)</strong> • Toàn quyền cấp tài khoản giáo viên & quản lý các hạng mục web
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-sm transition-all flex items-center gap-1.5 transform active:scale-95"
                >
                  <span>⚙️</span>
                  <span>Bảng Quản Trị Admin</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 transform active:scale-95"
                  title="Đăng xuất khỏi tài khoản Quản trị viên"
                >
                  <span>🚪</span>
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          )}

        {isBannerVisible && (
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[2000] animate-fade-in-down px-4 w-full max-w-md" role="status" aria-live="polite">
                <div className="bg-amber-100 dark:bg-amber-900/90 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 backdrop-blur-sm">
                    {isUpdatingPrompt ? (
                        <svg className="animate-spin h-5 w-5 text-amber-600 dark:text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1-1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    )}
                    <span className="text-sm font-medium flex-1">{isUpdatingPrompt ? t.refiningPrompt : statusNotification}</span>
                    {!isUpdatingPrompt && <button onClick={() => setStatusNotification(null)} className="ml-auto text-amber-600 dark:text-amber-300 p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-500" aria-label="Close notification"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
                </div>
            </div>
        )}

        {showModeChangePopup && !statusNotification && !isUpdatingPrompt && (
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[2000] animate-fade-in-down px-4 w-full max-w-md" role="alert">
                <div className="bg-blue-100 dark:bg-blue-900/90 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 backdrop-blur-sm relative">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1 pr-6">
                        <p className="text-sm font-bold">{t.switchedToMode(mode === 'image' ? t.modeImage : t.modeStory)}</p>
                        <p className="text-xs mt-1">
                            {t.modeSwitchedNotice(mode === 'image' ? t.modesRefinedForImages : t.modesRefinedForStories)}
                        </p>
                    </div>
                    <button onClick={() => setShowModeChangePopup(false)} className="absolute top-3 right-3 text-blue-600 dark:text-blue-300 p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
        )}

        <main className="flex-1 flex flex-col w-full max-w-screen-2xl mx-auto sm:px-4 sm:py-2 overflow-hidden min-h-0 pb-[calc(3.5rem_+_env(safe-area-inset-bottom))] sm:pb-0">
            <div className="flex-1 flex flex-col sm:grid sm:grid-cols-2 sm:gap-4 min-h-0">
            {/* Left Panel: Prompt + Tools. Scrollable vertically. */}
            <div className={`flex flex-col gap-0 bg-white dark:bg-gray-800 sm:rounded-lg sm:border border-gray-200 dark:border-gray-700 shadow-sm ${mobileView === 'editor' ? 'flex flex-1' : 'hidden sm:flex'} h-full overflow-y-auto relative`}>
                
                <div className="relative flex-shrink-0 bg-white dark:bg-gray-800 z-50">
                    <PromptInput
                        prompt={prompt}
                        setPrompt={setPrompt}
                        onSubmit={handlePromptSubmit}
                        onAnalyze={handleAnalyzeOnly}
                        isLoading={isGenerating || isUpdatingPrompt}
                        isGenerating={isGenerating}
                        isAnalyzing={isGraphLoading || isClarificationsLoading}
                        isFirstRun={!hasGenerated}
                        mode={mode}
                        setMode={handleModeChange}
                        uploadedImages={uploadedImages}
                        setUploadedImages={setUploadedImages}
                        pendingAttributeUpdates={pendingAttributeUpdates}
                        pendingRelationshipUpdates={pendingRelationshipUpdates}
                        aspectRatio={aspectRatio}
                        setAspectRatio={setAspectRatio}
                        resolution={resolution}
                        setResolution={setResolution}
                        selectedModel={selectedModel}
                        setSelectedModel={setSelectedModel}
                        selectedClarificationModel={selectedClarificationModel}
                        setSelectedClarificationModel={setSelectedClarificationModel}
                        storyType={storyType}
                        setStoryType={setStoryType}
                        proactiveness={proactiveness}
                        setProactiveness={setProactiveness}
                        language={language}
                        onOpenClassroom={() => {
                          if (!websiteSettings.enableClassroom) {
                            setStatusNotification("Hạng mục Lớp học trực tuyến đang bị tạm khóa bởi Admin.");
                            setTimeout(() => setStatusNotification(null), 3000);
                            return;
                          }
                          setShowClassroom(true);
                        }}
                        websiteSettings={websiteSettings}
                    />
                </div>

                <div className="z-30 flex flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 justify-between items-center pr-2 shadow-sm sticky top-0 overflow-x-auto">
                    <div className="flex flex-1 min-w-0">
                        <ToolTabButton label={t.tabClarifications} tab="clarify" current={activeToolTab} />
                        {websiteSettings.enableBeliefGraph && (
                          <ToolTabButton label={t.tabBeliefGraph} tab="graph" current={activeToolTab} />
                        )}
                        {websiteSettings.enableBeliefGraph && (
                          <ToolTabButton label={mode === 'image' ? t.tabImageAttributes : t.tabStoryAttributes} tab="attributes" current={activeToolTab} />
                        )}
                        {websiteSettings.enableQuestionQuiz && (
                          <ToolTabButton 
                              label={`📝 ${t.tabQuestions} (${classroomQuestions.length})`} 
                              tab="questions" 
                              current={activeToolTab} 
                          />
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative bg-gray-50/30 dark:bg-gray-900/30 flex flex-col w-full flex-1 min-h-0">
                    {totalUpdateCount > 0 && (
                        <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 p-2 flex justify-between items-center animate-fade-in z-20 gap-2">
                            <div className="text-xs md:text-sm text-blue-800 dark:text-blue-200 font-bold flex items-center gap-1.5 flex-1 min-w-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="truncate">{t.pendingChangesCount(totalUpdateCount)}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button 
                                    onClick={clearPendingUpdates} 
                                    disabled={isUpdatingPrompt}
                                    className={`text-xs md:text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${isUpdatingPrompt ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {t.cancelChanges}
                                </button>
                                <button 
                                    onClick={handleApplyAllUpdates} 
                                    disabled={isUpdatingPrompt || isGenerating} 
                                    title={isGenerating ? "Cannot update prompt while generation is in progress" : undefined}
                                    className={`bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-normal py-1 px-3 rounded-md shadow-sm flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${(isUpdatingPrompt || isGenerating) ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-md'}`}
                                >
                                    {isUpdatingPrompt ? t.updatingBtn : (
                                        <>
                                            <span className="sm:hidden">{t.updateShort}</span>
                                            <span className="hidden sm:inline">{t.updatePromptBtn}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                    <div className={`w-full ${activeToolTab === 'clarify' ? 'flex flex-col flex-1 min-h-[250px] md:min-h-[450px]' : 'hidden'}`}>
                        <ClarificationCard 
                            clarifications={clarifications} 
                            onRefresh={handleRefreshClarifications} 
                            isLoading={isClarificationsLoading} 
                            pendingAnswers={pendingClarificationAnswers} 
                            setPendingAnswers={setPendingClarificationAnswers} 
                            prompt={prompt} 
                            language={language}
                        />
                    </div>
                    <div className={`w-full ${(activeToolTab === 'graph' || activeToolTab === 'attributes') ? 'flex flex-col flex-1 min-h-0' : 'hidden'}`}>
                        {/* 
                            For Graph and Attributes, we use flex-1 to fill the remaining space.
                            Reduced min-h to 250px to better accommodate small landscape devices.
                        */}
                        <div className={`w-full flex flex-col relative flex-1 min-h-[250px] md:min-h-[450px]`}>
                            <BeliefGraph 
                                data={beliefGraph} 
                                isLoading={isGraphLoading} 
                                mode={mode} 
                                view={activeToolTab === 'attributes' ? 'attributes' : 'graph'} 
                                isVisible={activeToolTab === 'graph' || activeToolTab === 'attributes'} 
                                pendingAttributeUpdates={pendingAttributeUpdates} 
                                setPendingAttributeUpdates={setPendingAttributeUpdates} 
                                pendingRelationshipUpdates={pendingRelationshipUpdates} 
                                setPendingRelationshipUpdates={setPendingRelationshipUpdates} 
                                pendingClarificationCount={Object.keys(pendingClarificationAnswers).length} 
                                currentPrompt={prompt} 
                                language={language}
                            />
                        </div>
                    </div>
                    {/* Question Drafting Panel integrated on image creation page */}
                    <div className={`w-full ${activeToolTab === 'questions' ? 'flex flex-col flex-1 min-h-[300px] md:min-h-[450px]' : 'hidden'}`}>
                        <QuestionDraftingPanel
                            questions={classroomQuestions}
                            onSaveQuestions={handleUpdateClassroomQuestions}
                            onResetToDefaults={handleResetClassroomQuestions}
                            onOpenModal={() => setShowQuestionEditorModal(true)}
                            language={language}
                        />
                    </div>
                </div>
            </div>
            <div className={`flex flex-col sm:flex ${mobileView === 'preview' ? 'flex' : 'hidden sm:flex'} flex-1 h-full min-h-0 sm:pb-0`}>
                <OutputDisplay 
                    images={images} 
                    story={story} 
                    mode={mode} 
                    isLoading={isGenerating} 
                    error={galleryErrors[mode]} 
                    isOutdated={isOutdated} 
                    requiresApiKey={requiresApiKey} 
                    onSelectKey={handleSelectApiKey} 
                    aspectRatio={aspectRatio} 
                    selectedModel={selectedModel}
                    prompt={prompt}
                    beliefGraph={beliefGraph}
                    accurateImageIndices={accurateImageIndices}
                    onAccurateChange={setAccurateImageIndices}
                    selectedImageIndex={selectedImageIndex}
                    onSelectImageIndex={(idx) => {
                        setSelectedImageIndex(idx);
                        setStatusNotification(`Đã chọn bức tranh số ${idx + 1} để chiếu duy nhất cho học sinh!`);
                        setTimeout(() => setStatusNotification(null), 3500);
                    }}
                    onOpenClassroom={(idx) => {
                        if (idx !== undefined) setSelectedImageIndex(idx);
                        setShowClassroom(true);
                    }}
                    onOpenQuestionEditor={() => setShowQuestionEditorModal(true)}
                    questionsCount={classroomQuestions.length}
                    onUseAsReference={handleUseAsReference} 
                    onApplyToPrompt={handleApplyStoryToPrompt} 
                    language={language} 
                />
            </div>
            </div>
        </main>

        <div className="sm:hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 flex justify-center shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-[200] fixed bottom-0 left-0 right-0 h-auto min-h-[3.75rem]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.25rem)' }}>
            <div className="flex w-full h-14 items-center justify-around px-1">
                <button 
                    onClick={() => setMobileView('editor')} 
                    className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-xl focus:outline-none min-h-[44px] ${
                        mobileView === 'editor' 
                        ? 'text-blue-600 dark:text-blue-400 font-black' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    <div className={`p-1 rounded-lg ${mobileView === 'editor' ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold tracking-tight mt-0.5">{language === 'vi' ? 'Soạn bài' : t.mobileEditor}</span>
                </button>

                <button 
                    onClick={() => setMobileView('preview')} 
                    className={`flex-1 flex flex-col items-center justify-center py-1 transition-all rounded-xl focus:outline-none min-h-[44px] ${
                        mobileView === 'preview' 
                        ? 'text-blue-600 dark:text-blue-400 font-black' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                    <div className={`p-1 rounded-lg ${mobileView === 'preview' ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold tracking-tight mt-0.5">{language === 'vi' ? 'Xem tranh' : t.mobilePreview}</span>
                </button>

                {websiteSettings.enableClassroom && (
                  <button 
                      onClick={() => setShowClassroom(true)} 
                      className="flex-1 flex flex-col items-center justify-center py-1 text-indigo-700 dark:text-indigo-300 transition-all rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 focus:outline-none min-h-[44px]"
                  >
                      <span className="text-base leading-none mb-0.5">🎓</span>
                      <span className="text-[10px] font-bold tracking-tight">{language === 'vi' ? 'Lớp học' : 'Class'}</span>
                  </button>
                )}

                {userRole === 'admin' ? (
                  <button 
                      onClick={() => setShowAdminModal(true)} 
                      className="flex-1 flex flex-col items-center justify-center py-1 text-amber-700 dark:text-amber-400 transition-all rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 focus:outline-none min-h-[44px]"
                  >
                      <span className="text-base leading-none mb-0.5">👑</span>
                      <span className="text-[10px] font-bold tracking-tight">Quản trị</span>
                  </button>
                ) : userRole === 'teacher' ? (
                  <button 
                      onClick={() => setShowStudentAccountsModal(true)} 
                      className="flex-1 flex flex-col items-center justify-center py-1 text-emerald-700 dark:text-emerald-400 transition-all rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 focus:outline-none min-h-[44px]"
                  >
                      <span className="text-base leading-none mb-0.5">👥</span>
                      <span className="text-[10px] font-bold tracking-tight">Học sinh</span>
                  </button>
                ) : null}

                <button 
                    onClick={handleLogout} 
                    className="flex-1 flex flex-col items-center justify-center py-1 text-rose-600 dark:text-rose-400 transition-all rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 focus:outline-none min-h-[44px]"
                    title="Đăng xuất khỏi hệ thống"
                >
                    <span className="text-base leading-none mb-0.5">🚪</span>
                    <span className="text-[10px] font-bold tracking-tight">Đăng xuất</span>
                </button>
            </div>
        </div>
        
        {showIntroModal && (
            <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="intro-modal-title">
                <div 
                    ref={introModalRef}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh] outline-none"
                    tabIndex={-1}
                >
                    {/* ... Intro Content ... */}
                    <div className="text-center mb-6">
                        <h2 id="intro-modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">{t.introTitle}</h2>
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{t.introSubtitle}</p>
                    </div>

                    <div className="space-y-5 mb-8">
                        <div className="flex gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">{t.introStep1Title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                    {t.introStep1Desc}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">{t.introStep2Title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                    {t.introStep2Desc}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">{t.introStep3Title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                    {t.introStep3Desc}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={closeIntroModal}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-normal py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                        >
                            {t.startCreating}
                        </button>
                        <a 
                            href="https://zi-wang.com/human-ai/" 
                            target="_blank" 
                            rel="noreferrer" 
                            className="w-full text-center text-sm font-normal text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 py-2 transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                        >
                            {t.learnOurResearch}
                        </a>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed text-left">
                            {t.researchDisclaimer}
                        </p>
                    </div>
                </div>
            </div>
        )}

        {showInfoModal && (
            <div className="fixed inset-0 z-[3000] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowInfoModal(false)} role="dialog" aria-modal="true" aria-labelledby="info-modal-title">
                <div 
                    ref={infoModalRef}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 relative border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh] outline-none" 
                    onClick={e => e.stopPropagation()}
                    tabIndex={-1}
                >
                    {/* ... Info Content ... */}
                    <button onClick={() => setShowInfoModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded" aria-label={t.cancel}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    
                    <div className="text-center mb-6">
                        <h2 id="info-modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t.infoModalMainTitle}</h2>
                        <p className="text-gray-600 dark:text-gray-400">{t.infoModalMainSubtitle}</p>
                    </div>

                    <div className="mb-6 text-left space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-2">{t.howItWorksHeader}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            {t.howItWorksBody}
                        </p>
                        <ul className="space-y-2 text-xs text-gray-500 dark:text-gray-400 list-disc pl-4 marker:text-blue-500">
                            <li>{t.howItWorksPoint1}</li>
                            <li>{t.howItWorksPoint2}</li>
                            <li>{t.howItWorksPoint3}</li>
                            <li>{t.howItWorksPoint4}</li>
                        </ul>
                    </div>

                    <div className="flex gap-3 mb-8">
                        <a href="https://zi-wang.com/human-ai/" target="_blank" rel="noreferrer" className="flex-1 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center transition-colors group focus:outline-none focus:ring-2 focus:ring-purple-500">
                            <div className="flex items-center justify-center gap-2 mb-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                <span className="font-bold text-sm">{t.ourResearchBtn}</span>
                            </div>
                            <div className="text-[10px] opacity-80 group-hover:underline">{t.humanAiAlignment}</div>
                        </a>
                        <a href="https://zi-wang.com/co-creator-feedback/" target="_blank" rel="noreferrer" className="flex-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center transition-colors group focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <div className="flex items-center justify-center gap-2 mb-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                <span className="font-bold text-sm">{t.giveFeedbackBtn}</span>
                            </div>
                            <div className="text-[10px] opacity-80 group-hover:underline">{t.helpUsImprove}</div>
                        </a>
                    </div>

                    <div className="mb-6 text-left">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-2 mb-4">{t.proWorkflowHeader}</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold mt-0.5">1</div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t.proWorkflow1Title}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.proWorkflow1Desc}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold mt-0.5">2</div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t.proWorkflow2Title}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.proWorkflow2Desc}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold mt-0.5">3</div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t.proWorkflow3Title}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.proWorkflow3Desc}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                        <button 
                            onClick={() => {
                                setShowInfoModal(false);
                                setShowIntroModal(true);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                            {t.viewWelcomeScreenBtn}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t.questionsContact} <a href="https://zi-wang.com" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Zi Wang</a>.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {proposedPromptState && (
            <ReviewPromptModal
                originalPrompt={prompt}
                proposedPrompt={proposedPromptState.text}
                onAccept={handleAcceptProposedPrompt}
                onReject={handleRejectProposedPrompt}
                language={language}
            />
        )}

        {/* Online Virtual Classroom Modal (Lớp Học Thuyết Trình) */}
        <OnlineClassroomModal
            isOpen={showClassroom}
            onClose={() => setShowClassroom(false)}
            images={images.length > 0 ? images : [
                { url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=1200&q=80' },
                { url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80' }
            ]}
            initialImageIndex={selectedImageIndex}
            onSelectImageIndex={(idx) => setSelectedImageIndex(idx)}
            prompt={prompt}
            beliefGraph={beliefGraph}
            aspectRatio={aspectRatio}
            selectedModel={selectedModel}
            language={language}
            onSwitchToStudentView={(idx) => {
              if (idx !== undefined) setSelectedImageIndex(idx);
              setShowClassroom(false);
              setUserRole('student');
            }}
            onOpenStudentAccounts={() => {
              setShowClassroom(false);
              setShowStudentAccountsModal(true);
            }}
            questions={classroomQuestions}
            onUpdateQuestions={handleUpdateClassroomQuestions}
            isAdmin={isAdmin}
            onToggleMic={(isMicOn) => {
              const newLog: AuditLogEntry = {
                id: `log-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                actor: `Giáo viên: ${activeTeacher?.name || 'Giáo viên'}`,
                action: isMicOn ? 'Bật micro giảng bài' : 'Tắt micro giảng bài',
                details: `Giáo viên đã ${isMicOn ? 'bật micro giảng bài' : 'tắt micro'} trong phòng học trực tuyến.`,
                category: 'account'
              };
              setAuditLogs(prev => [newLog, ...prev]);
            }}
            onToggleCamera={(isCamOn) => {
              const newLog: AuditLogEntry = {
                id: `log-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                actor: `Giáo viên: ${activeTeacher?.name || 'Giáo viên'}`,
                action: isCamOn ? 'Bật camera video call' : 'Tắt camera video call',
                details: `Giáo viên đã ${isCamOn ? 'bật camera trực tiếp' : 'tắt camera'} trong phòng học trực tuyến.`,
                category: 'account'
              };
              setAuditLogs(prev => [newLog, ...prev]);
            }}
        />

        {/* Student Accounts Management Modal (Cấp và quản lý tài khoản học sinh) */}
        <StudentAccountsModal
            isOpen={showStudentAccountsModal}
            onClose={() => setShowStudentAccountsModal(false)}
            students={studentAccounts}
            classCode={classCode}
            onAddStudent={handleAddStudentAccount}
            onDeleteStudent={handleDeleteStudentAccount}
            onSwitchToStudent={(st) => {
              handleSwitchToStudentAccount(st);
              setShowStudentAccountsModal(false);
            }}
            language={language}
            isAdmin={isAdmin}
        />

        {/* Teacher Question Editor Modal (Biên tập và soạn câu hỏi cho học sinh) */}
        <QuestionEditorModal
            isOpen={showQuestionEditorModal}
            onClose={() => setShowQuestionEditorModal(false)}
            questions={classroomQuestions}
            onSaveQuestions={handleUpdateClassroomQuestions}
            onResetToDefaults={handleResetClassroomQuestions}
            language={language}
        />

        {/* Admin Dashboard Modal (Quản trị viên, Cấp & Xóa tài khoản Admin/GV/HS & Quản lý các hạng mục web) */}
        <AdminDashboardModal
            isOpen={showAdminModal}
            onClose={() => setShowAdminModal(false)}
            teachers={teachers}
            adminAccounts={adminAccounts}
            studentAccounts={studentAccounts}
            settings={websiteSettings}
            auditLogs={auditLogs}
            onAddTeacher={handleAddTeacher}
            onUpdateTeacherStatus={handleUpdateTeacherStatus}
            onResetTeacherPin={handleResetTeacherPin}
            onDeleteTeacher={handleDeleteTeacher}
            onAddAdmin={handleAddAdminAccount}
            onUpdateAdminStatus={handleUpdateAdminStatus}
            onResetAdminPin={handleResetAdminPin}
            onDeleteAdmin={handleDeleteAdminAccount}
            onDeleteStudent={handleDeleteStudentAccount}
            onSelectTeacherToImpersonate={handleSelectTeacherToImpersonate}
            onUpdateSettings={handleUpdateWebsiteSettings}
            onResetSettingsToDefault={handleResetSettingsToDefault}
            onLogout={handleLogout}
            language={language}
        />
        </>
      )}

      {/* Optional In-app Account Switch Modal */}
      <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginAsAdmin={handleLoginAsAdmin}
          onLoginAsTeacher={handleLoginAsTeacher}
          onLoginAsStudent={handleLoginAsStudent}
          teachers={teachers}
          students={studentAccounts}
          adminAccounts={adminAccounts}
          schoolName={websiteSettings.schoolName}
          portalTitle={websiteSettings.portalTitle}
          language={language}
      />
    </div>
  );
}

export default App;
