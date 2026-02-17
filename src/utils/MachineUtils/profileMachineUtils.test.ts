import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import {
  loadProfile,
  updateProfile,
  deactivateAccount,
  getStatusMessage,
  getStatusColor
} from './profileMachineUtils'
import { AuthService } from '../../service/auth-service.service'

// Mock the AuthService
vi.mock('../../service/auth-service.service', () => ({
  AuthService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    deactivateAccount: vi.fn()
  }
}))

describe('profileMachineUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loadProfile', () => {
    it('should call AuthService.getProfile with correct parameters', async () => {
      const params = {
        accessToken: 'token123',
        userId: 'user456'
      }
      const mockProfile = {
        id: 'user456',
        name: 'John Doe',
        email: 'john@example.com'
      }
      ;(AuthService.getProfile as Mock).mockResolvedValue(mockProfile)

      const result = await loadProfile(params)

      expect(AuthService.getProfile).toHaveBeenCalledWith('token123', 'user456')
      expect(result).toEqual(mockProfile)
    })
  })

  describe('updateProfile', () => {
    it('should call AuthService.updateProfile with filtered form values', async () => {
      const params = {
        accessToken: 'token123',
        userId: 'user456',
        formValues: {
          name: 'John Updated',
          surname: 'Doe',
          email: 'john.updated@example.com',
          phone: '123456789',
          dni: '12345678',
          gender: 'MALE',
          birthdate: '1990-01-01',
          specialty: 'CARDIOLOGY',
          medicalLicense: 'LIC123',
          slotDurationMin: 30,
          healthInsurance: 'OSDE',
          healthPlan: '210'
        }
      }
      const mockResponse = { success: true }
      ;(AuthService.updateProfile as Mock).mockResolvedValue(mockResponse)

      const result = await updateProfile(params)

      expect(AuthService.updateProfile).toHaveBeenCalledWith('token123', 'user456', {
        name: 'John Updated',
        surname: 'Doe',
        email: 'john.updated@example.com',
        phone: '123456789',
        dni: '12345678',
        gender: 'MALE',
        birthdate: '1990-01-01',
        specialty: 'CARDIOLOGY',
        medicalLicense: 'LIC123',
        slotDurationMin: 30,
        healthInsurance: 'OSDE',
        healthPlan: '210'
      })
      expect(result).toEqual(mockResponse)
    })

    it('should filter out empty, null, and undefined values', async () => {
      const params = {
        accessToken: 'token123',
        userId: 'user456',
        formValues: {
          name: '',
          surname: 'Doe',
          email: null as any,
          phone: undefined as any,
          dni: '12345678',
          gender: 'MALE',
          birthdate: '1990-01-01',
          specialty: null,
          medicalLicense: null,
          slotDurationMin: 30,
          healthInsurance: null,
          healthPlan: ''
        }
      }
      const mockResponse = { success: true }
      ;(AuthService.updateProfile as Mock).mockResolvedValue(mockResponse)

      const result = await updateProfile(params)

      expect(AuthService.updateProfile).toHaveBeenCalledWith('token123', 'user456', {
        surname: 'Doe',
        dni: '12345678',
        gender: 'MALE',
        birthdate: '1990-01-01',
        slotDurationMin: 30
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('deactivateAccount', () => {
    it('should call AuthService.deactivateAccount with correct parameters', async () => {
      const params = { accessToken: 'token123' }

      ;(AuthService.deactivateAccount as Mock).mockResolvedValue(undefined)

      await expect(deactivateAccount(params)).resolves.not.toThrow()

      expect(AuthService.deactivateAccount).toHaveBeenCalledWith('token123')
    })
  })

  describe('getStatusMessage', () => {
    it('should return correct message for PENDING doctor', () => {
      const result = getStatusMessage('PENDING', 'DOCTOR')
      expect(result).toBe('Tu cuenta de doctor está pendiente de aprobación por el administrador.')
    })

    it('should return correct message for PENDING patient', () => {
      const result = getStatusMessage('PENDING', 'PATIENT')
      expect(result).toBe('Tu cuenta de paciente está pendiente de activación.')
    })

    it('should return correct message for PENDING unknown role', () => {
      const result = getStatusMessage('PENDING', 'UNKNOWN')
      expect(result).toBe('Tu cuenta está pendiente de activación.')
    })

    it('should return correct message for REJECTED', () => {
      const result = getStatusMessage('REJECTED', 'DOCTOR')
      expect(result).toBe('Tu cuenta ha sido rechazada. Por favor, contacta al administrador.')
    })

    it('should return correct message for SUSPENDED', () => {
      const result = getStatusMessage('SUSPENDED', 'PATIENT')
      expect(result).toBe('Tu cuenta ha sido suspendida. Por favor, contacta al administrador.')
    })

    it('should return default message for other statuses', () => {
      const result = getStatusMessage('ACTIVE', 'PATIENT')
      expect(result).toBe('Tu cuenta está siendo procesada.')
    })
  })

  describe('getStatusColor', () => {
    it('should return correct color for PENDING', () => {
      const result = getStatusColor('PENDING')
      expect(result).toBe('#22577a')
    })

    it('should return correct color for REJECTED', () => {
      const result = getStatusColor('REJECTED')
      expect(result).toBe('#f44336')
    })

    it('should return correct color for SUSPENDED', () => {
      const result = getStatusColor('SUSPENDED')
      expect(result).toBe('#f44336')
    })

    it('should return default color for other statuses', () => {
      const result = getStatusColor('ACTIVE')
      expect(result).toBe('#2d7d90')
    })
  })
})