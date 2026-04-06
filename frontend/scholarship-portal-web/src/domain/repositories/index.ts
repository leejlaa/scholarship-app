// Repository port interfaces.
// The application layer depends only on these contracts —
// the concrete implementations live in infrastructure/.

import type {
  Scholarship,
  StudentApplication,
  Review,
  Announcement,
  PortalOverview,
  WorkflowStep,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from '../entities'

// ── Write request shapes ──────────────────────────────────────────────────

export interface ScholarshipWriteRequest {
  title: string
  audience: string
  deadline: string   // ISO date string e.g. "2025-12-31"
  eligibility: string
  amount: number
}

export interface ApplicationCreateRequest {
  scholarshipId: number
  studentName?: string
  submit: boolean
}

export interface ApplicationUpdateRequest {
  studentName?: string
  status?: string
}

export interface ReviewCreateRequest {
  applicationId: number
  reviewerName?: string
  score: number
  comment: string
  stage: string
}

export interface ReviewUpdateRequest {
  reviewerName?: string
  score: number
  comment: string
  stage: string
}

// ── Repository interfaces ─────────────────────────────────────────────────

export interface IScholarshipRepository {
  getAll(): Promise<Scholarship[]>
  create(req: ScholarshipWriteRequest): Promise<Scholarship>
  update(id: number, req: ScholarshipWriteRequest): Promise<Scholarship>
  remove(id: number): Promise<void>
}

export interface IApplicationRepository {
  getAll(): Promise<StudentApplication[]>
  create(req: ApplicationCreateRequest): Promise<StudentApplication>
  update(id: number, req: ApplicationUpdateRequest): Promise<StudentApplication>
  remove(id: number): Promise<void>
}

export interface IReviewRepository {
  getQueue(): Promise<Review[]>
  create(req: ReviewCreateRequest): Promise<Review>
  update(id: number, req: ReviewUpdateRequest): Promise<Review>
  remove(id: number): Promise<void>
}

export interface IAnnouncementRepository {
  getAll(): Promise<Announcement[]>
}

export interface IPortalOverviewRepository {
  get(): Promise<PortalOverview>
}

export interface IWorkflowRepository {
  get(): Promise<WorkflowStep[]>
}

export interface IAuthRepository {
  login(request: LoginRequest): Promise<AuthResponse>
  register(request: RegisterRequest): Promise<AuthResponse>
}
