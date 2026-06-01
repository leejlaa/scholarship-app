import { EventType, PublicClientApplication, type AuthenticationResult } from '@azure/msal-browser'
import { createMsalConfig } from './msalConfig'

let msalInstance: PublicClientApplication | null = null
let initialized = false
let redirectPromise: Promise<AuthenticationResult | null> | undefined

export function getMsalInstance(): PublicClientApplication {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(createMsalConfig())
  }
  return msalInstance
}

export async function ensureMsalInitialized() {
  const instance = getMsalInstance()
  if (initialized) return
  await instance.initialize()
  initialized = true

  const accounts = instance.getAllAccounts()
  if (accounts.length > 0) {
    instance.setActiveAccount(accounts[0])
  }

  instance.addEventCallback((event) => {
    if (
      event.eventType === EventType.LOGIN_SUCCESS &&
      event.payload &&
      'account' in event.payload &&
      event.payload.account
    ) {
      instance.setActiveAccount(event.payload.account)
    }
  })
}

/** MSAL allows only one handleRedirectPromise() call per redirect; share the result. */
export function handleMsalRedirectOnce(): Promise<AuthenticationResult | null> {
  if (!redirectPromise) {
    redirectPromise = getMsalInstance().handleRedirectPromise()
  }
  return redirectPromise
}
