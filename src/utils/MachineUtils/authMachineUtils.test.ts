import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { checkStoredAuth, submitAuthentication, logoutUser } from './authMachineUtils'
import { AuthService } from '../../service/auth-service.service'

// Mock the AuthService
vi.mock('../../service/auth-service.service', () => ({
  AuthService: {
    getStoredAuthData: vi.fn(),
    signIn: vi.fn(),
    registerPatient: vi.fn(),
    registerDoctor: vi.fn(),
    signOut: vi.fn(),
    clearAuthData: vi.fn(),
    refreshToken: vi.fn()
  }
}))

describe('authMachineUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset global fetch mock
    global.fetch = vi.fn()
  })

  describe('checkStoredAuth', () => {
    it('should return authenticated when tokens exist and are valid', async () => {
      const mockAuthData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      }
      ;(AuthService.getStoredAuthData as Mock).mockReturnValue(mockAuthData)
      
      // Mock fetch for token validation
      ;(global.fetch as Mock).mockResolvedValue({
        ok: true
      })

      const result = await checkStoredAuth()

      expect(result.authData).toEqual(mockAuthData)
      expect(result.isAuthenticated).toBe(true)
      expect(AuthService.getStoredAuthData).toHaveBeenCalled()
    })

    it('should return not authenticated when access token is missing', async () => {
      const mockAuthData = {
        refreshToken: 'refresh-token'
      }
      ;(AuthService.getStoredAuthData as Mock).mockReturnValue(mockAuthData)

      const result = await checkStoredAuth()

      expect(result.authData).toEqual(mockAuthData)
      expect(result.isAuthenticated).toBe(false)
    })

    it('should return not authenticated when refresh token is missing', async () => {
      const mockAuthData = {
        accessToken: 'access-token'
      }
      ;(AuthService.getStoredAuthData as Mock).mockReturnValue(mockAuthData)

      const result = await checkStoredAuth()

      expect(result.authData).toEqual(mockAuthData)
      expect(result.isAuthenticated).toBe(false)
    })

    it('should return not authenticated when no auth data exists', async () => {
      ;(AuthService.getStoredAuthData as Mock).mockReturnValue(null)

      const result = await checkStoredAuth()

      expect(result.authData).toBeNull()
      expect(result.isAuthenticated).toBe(false)
    })

    it('should return not authenticated when token validation fails', async () => {
      const mockAuthData = {
        accessToken: 'invalid-token',
        refreshToken: 'refresh-token'
      }
      ;(AuthService.getStoredAuthData as Mock).mockReturnValue(mockAuthData)
      
      // Mock fetch for failed token validation
      ;(global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 401
      })

      const result = await checkStoredAuth()

      expect(result.authData).toEqual(mockAuthData)
      expect(result.isAuthenticated).toBe(false)
    })

    it('should return not authenticated when token validation throws an error', async () => {
      const mockAuthData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      }
      ;(AuthService.getStoredAuthData as Mock).mockReturnValue(mockAuthData)
      
      // Mock fetch to throw an error
      ;(global.fetch as Mock).mockRejectedValue(new Error('Network error'))

      const result = await checkStoredAuth()

      expect(result.authData).toEqual(mockAuthData)
      expect(result.isAuthenticated).toBe(false)
    })
  })

  describe('submitAuthentication', () => {
    it('should call signIn for login mode', async () => {
      const context = {
        mode: 'login' as const,
        isPatient: true,
        hasErrorsOrEmpty: false,
        isAuthenticated: false,
        loading: false,
        loggingOut: false,
        formValues: {
          email: 'test@example.com',
          password: 'password123',
          name: '',
          surname: '',
          dni: '',
          gender: '',
          birthdate: null,
          password_confirm: '',
          phone: '',
          specialty: null,
          medicalLicense: null,
          slotDurationMin: null,
          healthInsurance: null,
          healthPlan: null
        },
        send: vi.fn()
      }
      const mockResponse = { success: true }
      ;(AuthService.signIn as Mock).mockResolvedValue(mockResponse)

      const result = await submitAuthentication({ context })

      expect(AuthService.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
      expect(result).toEqual(mockResponse)
    })

    it('should call registerPatient for register mode with isPatient true', async () => {
      const context = {
        mode: 'register' as const,
        isPatient: true,
        hasErrorsOrEmpty: false,
        isAuthenticated: false,
        loading: false,
        loggingOut: false,
        formValues: {
          name: 'John',
          surname: 'Doe',
          email: 'test@example.com',
          password: 'password123',
          password_confirm: 'password123',
          dni: '12345678',
          gender: 'MALE',
          birthdate: '1990-01-01',
          phone: '123456789',
          specialty: 'CARDIOLOGY',
          medicalLicense: 'LIC123',
          slotDurationMin: 30,
          healthInsurance: 'OSDE',
          healthPlan: '210'
        },
        send: vi.fn()
      }
      const mockResponse = { success: true }
      ;(AuthService.registerPatient as Mock).mockResolvedValue(mockResponse)

      const result = await submitAuthentication({ context })

      expect(AuthService.registerPatient).toHaveBeenCalledWith({
        name: 'John',
        surname: 'Doe',
        email: 'test@example.com',
        password: 'password123',
        password_confirm: 'password123',
        dni: '12345678',
        gender: 'MALE',
        birthdate: '1990-01-01',
        phone: '123456789',
        specialty: 'CARDIOLOGY',
        medicalLicense: 'LIC123',
        slotDurationMin: 30,
        healthInsurance: 'OSDE',
        healthPlan: '210'
      })
      expect(result).toEqual(mockResponse)
    })

    it('should call registerDoctor for register mode with isPatient false', async () => {
      const context = {
        mode: 'register' as const,
        isPatient: false,
        hasErrorsOrEmpty: false,
        isAuthenticated: false,
        loading: false,
        loggingOut: false,
        formValues: {
          name: 'Dr. John',
          surname: 'Doe',
          email: 'doctor@example.com',
          password: 'password123',
          password_confirm: 'password123',
          dni: '12345678',
          gender: 'MALE',
          birthdate: '1980-01-01',
          phone: '123456789',
          specialty: 'CARDIOLOGY',
          medicalLicense: 'LIC123',
          slotDurationMin: 30,
          healthInsurance: 'OSDE',
          healthPlan: '210'
        },
        send: vi.fn()
      }
      const mockResponse = { success: true }
      ;(AuthService.registerDoctor as Mock).mockResolvedValue(mockResponse)

      const result = await submitAuthentication({ context })

      expect(AuthService.registerDoctor).toHaveBeenCalledWith({
        name: 'Dr. John',
        surname: 'Doe',
        email: 'doctor@example.com',
        password: 'password123',
        password_confirm: 'password123',
        dni: '12345678',
        gender: 'MALE',
        birthdate: '1980-01-01',
        phone: '123456789',
        specialty: 'CARDIOLOGY',
        medicalLicense: 'LIC123',
        slotDurationMin: 30,
        healthInsurance: 'OSDE',
        healthPlan: '210'
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('logoutUser', () => {
    it('should successfully logout when signOut succeeds', async () => {
      const mockAuthData = { refreshToken: 'refresh-token' }
      ;(AuthService.getStoredAuthData as Mock).mockReturnValue(mockAuthData)
      ;(AuthService.signOut as Mock).mockResolvedValue(undefined)

      const result = await logoutUser()

      expect(AuthService.signOut).toHaveBeenCalledWith('refresh-token')
      expect(AuthService.clearAuthData).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should successfully logout when signOut fails but clear local data', async () => {
      const mockAuthData = { refreshToken: 'refresh-token' }
      ;(AuthService.getStoredAuthData as Mock).mockReturnValue(mockAuthData)
      ;(AuthService.signOut as Mock).mockRejectedValue(new Error('API error'))

      const result = await logoutUser()

      expect(AuthService.signOut).toHaveBeenCalledWith('refresh-token')
      expect(AuthService.clearAuthData).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should successfully logout when no refresh token exists', async () => {
      ;(AuthService.getStoredAuthData as Mock).mockReturnValue(null)

      const result = await logoutUser()

      expect(AuthService.signOut).not.toHaveBeenCalled()
      expect(AuthService.clearAuthData).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should successfully logout when auth data has no refresh token', async () => {
      const mockAuthData = { accessToken: 'access-token' }
      ;(AuthService.getStoredAuthData as Mock).mockReturnValue(mockAuthData)

      const result = await logoutUser()

      expect(AuthService.signOut).not.toHaveBeenCalled()
      expect(AuthService.clearAuthData).toHaveBeenCalled()
      expect(result).toBe(true)
    })
  })
})