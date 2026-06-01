import type { AccountInfo, AuthenticationResult } from '@azure/msal-browser'
import type { AuthResponse } from '../../domain/entities'
import { getPostLogoutRedirectUri, getRedirectUri, loginRequest } from './msalConfig'
import { ensureMsalInitialized, getMsalInstance } from './msalInstance'

export async function acquireApiAccessToken(account?: AccountInfo | null): Promise<string> {
  await ensureMsalInitialized()

  const msal = getMsalInstance()
  const activeAccount = account ?? msal.getActiveAccount() ?? msal.getAllAccounts()[0]
  if (!activeAccount) {
    throw new Error('No signed-in Microsoft account.')
  }

  msal.setActiveAccount(activeAccount)

  const silentRequest = {
    ...loginRequest,
    account: activeAccount,
  }

  let result: AuthenticationResult
  try {
    result = await msal.acquireTokenSilent(silentRequest)
  } catch {
    await msal.acquireTokenRedirect({ ...silentRequest, redirectUri: getRedirectUri() })
    throw new Error('Redirecting to Microsoft sign-in to refresh your session.')
  }

  if (!result.accessToken) {
    throw new Error('Could not acquire an API access token from Microsoft.')
  }

  return result.accessToken
}

export async function fetchPortalAuth(accessToken: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message =
      typeof body === 'object' && body && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Portal sign-in failed (${res.status}).`
    throw new Error(message)
  }

  const profile = (await res.json()) as Omit<AuthResponse, 'token'>
  return {
    ...profile,
    token: accessToken,
  }
}

export async function completeAzureSignIn(
  account?: AccountInfo | null,
  redirectResult?: AuthenticationResult | null,
): Promise<AuthResponse> {
  const msal = getMsalInstance()
  const activeAccount =
    account ?? redirectResult?.account ?? msal.getActiveAccount() ?? msal.getAllAccounts()[0]

  if (!activeAccount) {
    throw new Error('No signed-in Microsoft account.')
  }

  msal.setActiveAccount(activeAccount)

  const accessToken =
    redirectResult?.accessToken && redirectResult.accessToken.length > 0
      ? redirectResult.accessToken
      : await acquireApiAccessToken(activeAccount)

  return fetchPortalAuth(accessToken)
}

export function signInWithMicrosoft() {
  void ensureMsalInitialized().then(() =>
    getMsalInstance().loginRedirect({
      ...loginRequest,
      redirectUri: getRedirectUri(),
    }),
  )
}

export async function signOutFromMicrosoft() {
  await ensureMsalInitialized()
  const account = getMsalInstance().getActiveAccount()
  await getMsalInstance().logoutRedirect({
    account: account ?? undefined,
    postLogoutRedirectUri: getPostLogoutRedirectUri(),
  })
}
