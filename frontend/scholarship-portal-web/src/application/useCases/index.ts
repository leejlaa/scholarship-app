// Application use cases — pure async functions that orchestrate repositories.
// No React, no framework. Fully testable in isolation.

import type {
  IScholarshipRepository,
  IApplicationRepository,
  IReviewRepository,
  IAnnouncementRepository,
  IPortalOverviewRepository,
  IWorkflowRepository,
  IAuthRepository,
} from '../../domain/repositories'
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
} from '../../domain/entities'

export const getScholarships =
  (repo: IScholarshipRepository) => (): Promise<Scholarship[]> =>
    repo.getAll()

export const getApplications =
  (repo: IApplicationRepository) => (): Promise<StudentApplication[]> =>
    repo.getAll()

export const getReviewQueue =
  (repo: IReviewRepository) => (): Promise<Review[]> =>
    repo.getQueue()

export const getAnnouncements =
  (repo: IAnnouncementRepository) => (): Promise<Announcement[]> =>
    repo.getAll()

export const getPortalOverview =
  (repo: IPortalOverviewRepository) => (): Promise<PortalOverview> =>
    repo.get()

export const getWorkflow =
  (repo: IWorkflowRepository) => (): Promise<WorkflowStep[]> =>
    repo.get()

export const loginUser =
  (repo: IAuthRepository) => (request: LoginRequest): Promise<AuthResponse> =>
    repo.login(request)

export const registerUser =
  (repo: IAuthRepository) => (request: RegisterRequest): Promise<AuthResponse> =>
    repo.register(request)
