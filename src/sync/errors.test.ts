import { describe, it, expect } from 'vitest'
import { isNetworkError, isSessionError } from './errors'

describe('isNetworkError', () => {
  it('returns true for TypeError "Failed to fetch"', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('returns true for TypeError with "fetch" in message', () => {
    expect(isNetworkError(new TypeError('fetch failed: timeout'))).toBe(true)
  })

  it('returns true for Error with "network" in message', () => {
    expect(isNetworkError(new Error('NetworkError: connection lost'))).toBe(true)
  })

  it('returns true for Error with "timeout" in lowercase message', () => {
    expect(isNetworkError(new Error('Request Timeout'))).toBe(true)
  })

  it('returns true for Error with "aborted" in message', () => {
    expect(isNetworkError(new Error('The operation was aborted'))).toBe(true)
  })

  it('returns false for a generic Error', () => {
    expect(isNetworkError(new Error('Something went wrong'))).toBe(false)
  })

  it('returns false for a string', () => {
    expect(isNetworkError('network error')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isNetworkError(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isNetworkError(undefined)).toBe(false)
  })

  it('returns false for a plain object', () => {
    expect(isNetworkError({ message: 'network error' })).toBe(false)
  })

  it('returns false for TypeError with unrelated message', () => {
    expect(isNetworkError(new TypeError('Cannot read property of null'))).toBe(false)
  })
})

describe('isSessionError', () => {
  it('returns true for error with "Sessão expirada"', () => {
    expect(isSessionError(new Error('Sessão expirada. Faça login novamente.'))).toBe(true)
  })

  it('returns true for error with "JWT" in message', () => {
    expect(isSessionError(new Error('JWT expired'))).toBe(true)
  })

  it('returns true for error with "invalid_jwt" in message', () => {
    expect(isSessionError(new Error('invalid_jwt: signature mismatch'))).toBe(true)
  })

  it('returns true for error with "not authenticated" in message', () => {
    expect(isSessionError(new Error('not authenticated'))).toBe(true)
  })

  it('returns true for error with "PGRST301" in message', () => {
    expect(isSessionError(new Error('PGRST301: permission denied'))).toBe(true)
  })

  it('is case-sensitive for "not authenticated"', () => {
    expect(isSessionError(new Error('Not Authenticated'))).toBe(false)
  })

  it('returns false for a generic Error', () => {
    expect(isSessionError(new Error('Some other error'))).toBe(false)
  })

  it('returns false for null', () => {
    expect(isSessionError(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isSessionError(undefined)).toBe(false)
  })

  it('returns false for a string', () => {
    expect(isSessionError('Sessão expirada')).toBe(false)
  })

  it('returns false for an error without message', () => {
    const err = new Error()
    err.message = ''
    expect(isSessionError(err)).toBe(false)
  })
})
