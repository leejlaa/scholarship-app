import type { Configuration } from '@azure/msal-browser'

/** Fallback when config is evaluated outside the browser (e.g. tooling). */
const FALLBACK_ORIGIN = import.meta.env.VITE_APP_ORIGIN ?? 'http://localhost:5180'

/** Current app origin — works for Vite (5180) and Docker (3000). */
export function getAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }
  return FALLBACK_ORIGIN
}

export function getRedirectUri(): string {
  return `${getAppOrigin()}/auth`
}

export function getPostLogoutRedirectUri(): string {
  return `${getAppOrigin()}/login`
}

export const azureAd = {
  tenantId: '2f2dcb5d-f3e1-4f33-8584-dcacd25d604d',
  clientId: '562c6df4-0ce8-4165-8969-f300f4c1842a',
  authority: 'https://login.microsoftonline.com/2f2dcb5d-f3e1-4f33-8584-dcacd25d604d',
  apiScope: 'api://562c6df4-0ce8-4165-8969-f300f4c1842a/api_access',
} as const

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', azureAd.apiScope],
}

export function createMsalConfig(): Configuration {
  return {
    auth: {
      clientId: azureAd.clientId,
      authority: azureAd.authority,
      redirectUri: getRedirectUri(),
      postLogoutRedirectUri: getPostLogoutRedirectUri(),
    },
    cache: {
      cacheLocation: 'localStorage',
    },
  }
}
