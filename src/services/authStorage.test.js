import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredToken,
  getStoredUser,
  setAuthStorage,
} from './authStorage';

describe('authStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getStoredToken', () => {
    it('returns null when no token stored', () => {
      expect(getStoredToken()).toBeNull();
    });

    it('returns stored token', () => {
      setAuthStorage('abc123', null);
      expect(getStoredToken()).toBe('abc123');
    });
  });

  describe('getStoredUser', () => {
    it('returns null when no user stored', () => {
      expect(getStoredUser()).toBeNull();
    });

    it('returns parsed user object', () => {
      const user = { id: 1, email: 'a@b.com', role: 'ROLE_ADMIN' };
      setAuthStorage('t', user);
      expect(getStoredUser()).toEqual(user);
    });

    it('returns null when stored value is invalid JSON', () => {
      localStorage.setItem('mbolea_user', 'not json');
      expect(getStoredUser()).toBeNull();
    });
  });

  describe('setAuthStorage', () => {
    it('sets token and user', () => {
      setAuthStorage('token1', { id: 1, email: 'x@y.com' });
      expect(getStoredToken()).toBe('token1');
      expect(getStoredUser()).toEqual({ id: 1, email: 'x@y.com' });
    });

    it('clears token when token is null/empty', () => {
      setAuthStorage('old', { id: 1 });
      setAuthStorage(null, { id: 1 });
      expect(getStoredToken()).toBeNull();
      expect(getStoredUser()).toEqual({ id: 1 });
    });

    it('clears user when user is null', () => {
      setAuthStorage('t', { id: 1 });
      setAuthStorage('t', null);
      expect(getStoredToken()).toBe('t');
      expect(getStoredUser()).toBeNull();
    });
  });
});
