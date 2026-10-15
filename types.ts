
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Candidate {
  name: string; 
}

export interface Attribute {
  name:string;
  presence_in_prompt: boolean;
  value: Candidate[];
}

export interface Entity {
  name: string;
  presence_in_prompt: boolean;
  description: string;
  alternatives: Candidate[] | null;
  attributes: Attribute[];
}

export interface Relationship {
  source: string;
  target: string;
  label: string;
  alternatives?: Candidate[];
  presence_in_prompt?: boolean;
}

export interface BeliefState {
  entities: Entity[];
  relationships: Relationship[];
  prompt?: string;
}

export interface Clarification {
  question: string;
  options: string[];
}

export interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export interface GeneratedImage {
    url: string | null;
    error?: string;
    prompt?: string;
}

export type ImageSize = '512px' | '1K' | '2K' | '4K';
export type Mode = 'image' | 'story';
export type StoryType = 'generic';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '1:4' | '1:8' | '4:1' | '8:1';
export type Proactiveness = 'low' | 'medium' | 'high';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface TeacherAccount {
  id: string;
  name: string;
  email: string;
  teacherCode: string;
  pin: string;
  subject: string;
  classCode: string;
  status: 'active' | 'locked';
  createdAt: string;
  maxStudents: number;
}

export interface AdminAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  pin: string;
  role: 'super_admin' | 'admin';
  createdAt: string;
  status: 'active' | 'locked';
  avatar?: string;
  phone?: string;
  notes?: string;
}

export interface WebsiteSettings {
  // Modules / Hạng mục tính năng
  enableImageGen: boolean;
  enableStoryGen: boolean;
  enableBeliefGraph: boolean;
  enableClassroom: boolean;
  enableQuestionQuiz: boolean;
  enableStudentAccounts: boolean;
  enableDownloadImages: boolean;
  enableReferenceUpload: boolean;
  enableAdminAccountDeletion: boolean; // Chức năng xóa tài khoản của admin
  maintenanceMode: boolean;
  
  // Thông tin & Cấu hình toàn trang
  schoolName: string;
  portalTitle: string;
  systemAnnouncement: string;
  showAnnouncement: boolean;
  defaultPromptTheme: string;
  maxDailyImagesPerClass: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  category: 'account' | 'settings' | 'security' | 'system';
}

export interface StudentAccount {
  id: string;
  name: string;
  code: string;
  avatar: string;
  score: number;
  classCode: string;
  pin?: string;
  status?: 'active' | 'locked';
}

export interface ClassroomQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  points: number;
  explanation: string;
  hint: string;
  stats?: [number, number, number, number];
}

export type GraphUpdate = 
  | { type: 'attribute'; entity: string; attribute: string; value: string }
  | { type: 'relationship'; source: string; target: string; oldLabel: string; newLabel: string };
