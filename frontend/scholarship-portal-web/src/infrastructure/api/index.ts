// Infrastructure: concrete API client implementations.
// These are the only files allowed to call fetch().

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
  ApplicationDocumentSummary,
} from '../../domain/entities'
import type {
  IScholarshipRepository,
  IApplicationRepository,
  IReviewRepository,
  IAnnouncementRepository,
  IPortalOverviewRepository,
  IWorkflowRepository,
  IAuthRepository,
  ScholarshipWriteRequest,
  ApplicationCreateRequest,
  ApplicationUpdateRequest,
  ReviewCreateRequest,
  ReviewUpdateRequest,
} from '../../domain/repositories'

const AUTH_STORAGE_KEY = 'scholarship_portal_auth'

export function getStoredAuth(): AuthResponse | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  return raw ? (JSON.parse(raw) as AuthResponse) : null
}

export function setStoredAuth(auth: AuthResponse) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

function authHeaders(): HeadersInit {
  const auth = getStoredAuth()
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}
}

// ── helpers ───────────────────────────────────────────────────────────────
async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: {
      ...authHeaders(),
    },
  })

  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`)
  return res.json() as Promise<T>
}

async function apiPost<TResponse, TRequest>(path: string, body: TRequest): Promise<TResponse> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API ${path} returned ${res.status}`)
  }

  return res.json() as Promise<TResponse>
}

async function apiPut<TResponse, TRequest>(path: string, body: TRequest): Promise<TResponse> {
  const res = await fetch(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API ${path} returned ${res.status}`)
  }

  return res.json() as Promise<TResponse>
}

async function apiDelete(path: string): Promise<void> {
  const res = await fetch(path, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API ${path} returned ${res.status}`)
  }
}

async function apiPostForm<TResponse>(path: string, formData: FormData): Promise<TResponse> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      ...authHeaders(),
    },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `API ${path} returned ${res.status}`)
  }

  return res.json() as Promise<TResponse>
}

export interface UploadDocumentResponse extends ApplicationDocumentSummary {
  sizeBytes: number
}

export function listApplicationDocuments(applicationId: number) {
  return apiGet<ApplicationDocumentSummary[]>(`/api/applications/${applicationId}/documents`)
}

export function uploadApplicationDocument(applicationId: number, file: File, documentType: string) {
  const formData = new FormData()
  formData.append('file', file)

  const query = new URLSearchParams({ documentType })
  return apiPostForm<UploadDocumentResponse>(`/api/applications/${applicationId}/documents?${query.toString()}`, formData)
}

export function getDocumentDownloadUrl(storagePath: string) {
  return `/api/documents/${storagePath.split('/').map(encodeURIComponent).join('/')}`
}

// ── Implementations ───────────────────────────────────────────────────────
export const scholarshipApi: IScholarshipRepository = {
  getAll: () => apiGet<Scholarship[]>('/api/scholarships'),
  create: (req: ScholarshipWriteRequest) => apiPost<Scholarship, ScholarshipWriteRequest>('/api/scholarships', req),
  update: (id: number, req: ScholarshipWriteRequest) => apiPut<Scholarship, ScholarshipWriteRequest>(`/api/scholarships/${id}`, req),
  remove: (id: number) => apiDelete(`/api/scholarships/${id}`),
}

export const applicationApi: IApplicationRepository = {
  getAll: () => apiGet<StudentApplication[]>('/api/applications'),
  create: (req: ApplicationCreateRequest) => apiPost<StudentApplication, ApplicationCreateRequest>('/api/applications', req),
  update: (id: number, req: ApplicationUpdateRequest) => apiPut<StudentApplication, ApplicationUpdateRequest>(`/api/applications/${id}`, req),
  remove: (id: number) => apiDelete(`/api/applications/${id}`),
}

export const reviewApi: IReviewRepository = {
  getQueue: () => apiGet<Review[]>('/api/reviewer/queue'),
  create: (req: ReviewCreateRequest) => apiPost<Review, ReviewCreateRequest>('/api/reviews', req),
  update: (id: number, req: ReviewUpdateRequest) => apiPut<Review, ReviewUpdateRequest>(`/api/reviews/${id}`, req),
  remove: (id: number) => apiDelete(`/api/reviews/${id}`),
}

export const announcementApi: IAnnouncementRepository = {
  getAll: () => apiGet<Announcement[]>('/api/announcements'),
}

export const portalOverviewApi: IPortalOverviewRepository = {
  get: () => apiGet<PortalOverview>('/api/overview'),
}

export const workflowApi: IWorkflowRepository = {
  get: () => apiGet<WorkflowStep[]>('/api/workflow'),
}

export const authApi: IAuthRepository = {
  login: (request: LoginRequest) => apiPost<AuthResponse, LoginRequest>('/api/auth/login', request),
  register: (request: RegisterRequest) => apiPost<AuthResponse, RegisterRequest>('/api/auth/register', request),
}
