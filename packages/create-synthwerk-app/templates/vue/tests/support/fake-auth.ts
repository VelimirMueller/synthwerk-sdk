// An in-memory Auth for the app tests: no identity provider, no redirect.
import type { Auth } from '../../src/auth.ts'
import { fakeToken } from './mock-edge.ts'

export function fakeAuth(signedIn = false): Auth & { signedIn: boolean } {
  const state = {
    signedIn,
    async getToken() {
      return state.signedIn ? fakeToken() : null
    },
    async signIn() {
      state.signedIn = true
    },
    async signOut() {
      state.signedIn = false
    },
    async handleRedirect() {}
  }
  return state
}
