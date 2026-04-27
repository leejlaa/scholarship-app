// Domain entities are plain TypeScript interfaces — zero framework dependencies.

export interface Scholarship {
  id: number
  title: string
  audience: string
  deadline: string
  eligibility: string
  amount: number
  status: string
  assignedReviewerId?: string | null
  assignedReviewerName?: string | null
  assignedReviewerEmail?: string | null
}

export interface ReviewerSummary {
  id: string
  fullName: string
  email: string
}

export interface StudentApplication {
  id: number
  scholarshipTitle: string
  studentName: string
  status: string
  score: number
  documentsComplete: boolean
  submittedDocuments: string
  nextStep: string
}

export interface Review {
  id: number
  applicationId: number
  scholarshipTitle: string
  applicantName: string
  recommendedScore: number
  reviewerName: string
  isMine: boolean
  comment: string
  stage: string
}

export interface ApplicationDocumentSummary {
  id: number
  fileName: string
  storagePath: string
  documentType: string
}

export interface Announcement {
  id: number
  title: string
  category: string
  publishDate: string
  message: string
}

export interface WorkflowStep {
  order: number
  title: string
  detail: string
}

export interface PortalOverview {
  totalStudents: number
  totalOpenScholarships: number
  pendingReviews: number
  publishedResults: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  role: string
  // Student fields
  studentNumber?: string
  faculty?: string
  department?: string
  program?: string
  currentYear?: number
  gpa?: number
  dateOfBirth?: string
  address?: string
  nationality?: string
  personalStatement?: string
  // Reviewer fields
  staffNumber?: string
  title?: string
  expertiseAreas?: string
  officeLocation?: string
  phoneNumber?: string
  bio?: string
  maxActiveReviews?: number
  isAvailable?: boolean
}

export interface AuthResponse {
  token: string
  email: string
  fullName: string
  role: string
  expiresAt: string
}

// ── Role-specific profile shapes (returned by GET /api/profile) ──────────

export interface StudentProfile {
  userId: string
  fullName: string
  email: string
  studentNumber: string | null
  faculty: string | null
  department: string | null
  program: string | null
  currentYear: number | null
  gpa: number | null
  phoneNumber: string | null
  address: string | null
  nationality: string | null
  personalStatement: string | null
}

export interface ReviewerProfile {
  userId: string
  fullName: string
  email: string
  staffNumber: string | null
  department: string | null
  title: string | null
  expertiseAreas: string | null
  officeLocation: string | null
  phoneNumber: string | null
  bio: string | null
  maxActiveReviews: number | null
  isAvailable: boolean
}

export interface AdminProfile {
  userId: string
  fullName: string
  email: string
  department: string | null
  title: string | null
  officeLocation: string | null
  phoneNumber: string | null
}
