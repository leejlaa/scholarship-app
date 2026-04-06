// Application hooks — React wrappers around use cases.
// Each hook injects the concrete infrastructure implementation.

import { useEffect, useState } from 'react'
import {
  scholarshipApi,
  applicationApi,
  reviewApi,
  announcementApi,
  portalOverviewApi,
  workflowApi,
} from '../../infrastructure/api'
import {
  getScholarships,
  getApplications,
  getReviewQueue,
  getAnnouncements,
  getPortalOverview,
  getWorkflow,
} from '../useCases'
import type {
  Scholarship,
  StudentApplication,
  Review,
  Announcement,
  PortalOverview,
  WorkflowStep,
} from '../../domain/entities'

type AsyncState<T> = { data: T | null; loading: boolean; error: string | null }

function useAsync<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = [],
  enabled = true,
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    if (!enabled) {
      setState({ data: null, loading: false, error: null })
      return () => {
        cancelled = true
      }
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    fetchFn()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}

// ── Exported hooks ─────────────────────────────────────────────────────────

export function useScholarships(refreshKey = 0) {
  return useAsync<Scholarship[]>(getScholarships(scholarshipApi), [refreshKey])
}

export function useApplications(refreshKey = 0) {
  return useAsync<StudentApplication[]>(getApplications(applicationApi), [refreshKey])
}

export function useReviewQueue(refreshKey = 0) {
  return useAsync<Review[]>(getReviewQueue(reviewApi), [refreshKey])
}

export function useAnnouncements() {
  return useAsync<Announcement[]>(getAnnouncements(announcementApi))
}

export function usePortalOverview(enabled = true) {
  return useAsync<PortalOverview>(getPortalOverview(portalOverviewApi), [enabled], enabled)
}

export function useWorkflow() {
  return useAsync<WorkflowStep[]>(getWorkflow(workflowApi))
}
