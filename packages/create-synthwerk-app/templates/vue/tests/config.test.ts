import { describe, expect, it } from 'vitest'
import { scopes } from '../src/auth.ts'
import { readConfig } from '../src/config.ts'

describe('readConfig', () => {
  it('names every missing value', () => {
    expect(readConfig({ VITE_SYNTHWERK_API_URL: 'https://api.test' })).toEqual({
      ok: false,
      missing: ['VITE_SYNTHWERK_AUTH_URL', 'VITE_SYNTHWERK_CLIENT_ID']
    })
  })

  it('reads the values; the project id is optional', () => {
    expect(
      readConfig({
        VITE_SYNTHWERK_API_URL: ' https://api.test ',
        VITE_SYNTHWERK_AUTH_URL: 'https://auth.test',
        VITE_SYNTHWERK_CLIENT_ID: 'client-1'
      })
    ).toEqual({
      ok: true,
      config: {
        apiUrl: 'https://api.test',
        authUrl: 'https://auth.test',
        clientId: 'client-1',
        projectId: undefined
      }
    })
  })
})

describe('scopes', () => {
  it('adds the Zitadel API audience, roles and org with a project id', () => {
    expect(scopes()).toBe('openid profile offline_access')
    expect(scopes('42')).toBe(
      'openid profile offline_access urn:zitadel:iam:org:project:id:42:aud urn:zitadel:iam:org:projects:roles urn:zitadel:iam:user:resourceowner'
    )
  })
})
