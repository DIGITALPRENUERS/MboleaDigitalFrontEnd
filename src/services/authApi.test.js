import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as authApi from './authApi';
import * as authStorage from './authStorage';
import api from './api';

vi.mock('./api');
vi.mock('./authStorage', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual };
});

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toRole', () => {
    it('returns role as-is when already ROLE_*', () => {
      expect(authApi.toRole('ROLE_ADMIN')).toBe('ROLE_ADMIN');
    });

    it('prefixes role with ROLE_ when missing', () => {
      expect(authApi.toRole('ADMIN')).toBe('ROLE_ADMIN');
    });

    it('handles lowercase', () => {
      expect(authApi.toRole('admin')).toBe('ROLE_ADMIN');
    });

    it('returns undefined/null as-is', () => {
      expect(authApi.toRole(null)).toBeNull();
      expect(authApi.toRole(undefined)).toBeUndefined();
    });
  });

  describe('login', () => {
    it('normalizes email, calls api, stores token and user', async () => {
      api.post.mockResolvedValue({
        data: {
          accessToken: 'jwt-here',
          user: { id: 1, email: 'admin@test.com', name: 'Admin User', role: 'ADMIN', companyName: 'Mbolea' },
        },
      });
      vi.spyOn(authStorage, 'setAuthStorage');

      const result = await authApi.login('  Admin@Test.COM  ', 'secret');

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@test.com',
        password: 'secret',
      });
      expect(authStorage.setAuthStorage).toHaveBeenCalledWith(
        'jwt-here',
        expect.objectContaining({
          id: 1,
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'ROLE_ADMIN',
          companyName: 'Mbolea',
        })
      );
      expect(result).toEqual({ token: 'jwt-here', user: expect.objectContaining({ role: 'ROLE_ADMIN' }) });
    });

    it('throws when api fails', async () => {
      api.post.mockRejectedValue(new Error('Network error'));
      await expect(authApi.login('a@b.com', 'p')).rejects.toThrow('Network error');
    });
  });

  describe('register', () => {
    it('posts payload to /auth/register with name, role, companyName, companyCode', async () => {
      api.post.mockResolvedValue({ data: { message: 'OK', email: 's@org.com' } });
      await authApi.register({
        email: '  s@org.com  ',
        password: 'pass',
        name: 'Jane',
        role: 'SALES_POINT',
        companyName: 'Org',
        companyCode: 'OC',
      });
      expect(api.post).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({
          name: 'Jane',
          email: 's@org.com',
          password: 'pass',
          role: 'SALES_POINT',
          companyName: 'Org',
          companyCode: 'OC',
        })
      );
    });
  });
});
