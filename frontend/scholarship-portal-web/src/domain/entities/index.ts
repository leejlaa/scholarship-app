// Domain entities are plain TypeScript interfaces — zero framework dependencies.

export interface Scholarship {
  id: number
  title: string
  audience: string
  deadline: string
  eligibility: string
  amount: number
  status: string
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
}

export interface AuthResponse {
  token: string
  email: string
  fullName: string
  role: string
  expiresAt: string
}
