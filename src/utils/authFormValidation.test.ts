import { describe, it, expect, vi } from 'vitest'
import { validateField, checkFormValidation } from './authFormValidation'

// Mock dayjs
vi.mock('dayjs', () => {
  const mockDayjs = vi.fn((date?: string | Date) => {
    // Check if date is valid
    const isValidDate = () => {
      if (!date) return true
      if (date === 'valid-date') return true
      if (date === 'invalid-date') return false
      
      // Try to parse as Date
      const parsedDate = new Date(date)
      return !isNaN(parsedDate.getTime())
    }
    
    const parsedDate = date ? new Date(date) : new Date()
    
    const mockInstance = {
      isValid: isValidDate,
      subtract: vi.fn((amount: number, unit: string) => {
        const resultDate = new Date(parsedDate)
        if (unit === 'years') {
          resultDate.setFullYear(resultDate.getFullYear() - amount)
        }
        return mockDayjs(resultDate)
      }),
      isAfter: vi.fn((other: any) => {
        if (!isValidDate()) return false
        const otherDate = other && typeof other.toDate === 'function' ? other.toDate() : new Date(other)
        return parsedDate > otherDate
      }),
      isBefore: vi.fn((other: any) => {
        if (!isValidDate()) return false
        const otherDate = other && typeof other.toDate === 'function' ? other.toDate() : new Date(other)
        return parsedDate < otherDate
      }),
      toDate: () => parsedDate,
      format: vi.fn(() => parsedDate.toISOString()),
      tz: vi.fn().mockImplementation(function(this: any) {
        // Return the same instance to allow method chaining
        return this
      })
    }
    
    return mockInstance
  })
  
  return {
    default: Object.assign(mockDayjs, {
      extend: vi.fn()
    })
  }
})

// Mock dayjs plugins
vi.mock('dayjs/plugin/customParseFormat', () => ({
  default: vi.fn()
}))

vi.mock('dayjs/plugin/isSameOrAfter', () => ({
  default: vi.fn()
}))

vi.mock('dayjs/plugin/isSameOrBefore', () => ({
  default: vi.fn()
}))

describe('authFormValidation', () => {
  const createMockContext = (overrides: any = {}) => ({
    mode: 'register' as const,
    isPatient: true,
    hasErrorsOrEmpty: false,
    isAuthenticated: false,
    loading: false,
    formValues: {
      password: 'TestPass123',
      ...overrides.formValues
    },
    send: vi.fn(),
    ...overrides
  })

  describe('validateField', () => {
    it('should return empty string for non-login fields in login mode', () => {
      const loginContext = createMockContext({ mode: 'login' })
      expect(validateField('name', 'John', loginContext)).toBe('')
    })

    it('should return "Campo requerido" for null, undefined, or empty values', () => {
      const context = createMockContext()
      expect(validateField('name', null, context)).toBe('Campo requerido')
      expect(validateField('name', undefined, context)).toBe('Campo requerido')
      expect(validateField('name', '', context)).toBe('Campo requerido')
    })

    it('should validate email format', () => {
      const context = createMockContext()
      expect(validateField('email', 'invalid-email', context)).toBe('Email inválido')
      expect(validateField('email', 'test@example.com', context)).toBe('')
    })

    it('should validate DNI format', () => {
      const context = createMockContext()
      expect(validateField('dni', '123456', context)).toBe('DNI inválido (7 u 8 dígitos)')
      expect(validateField('dni', '1234567', context)).toBe('')
      expect(validateField('dni', '12345678', context)).toBe('')
      expect(validateField('dni', '123456789', context)).toBe('DNI inválido (7 u 8 dígitos)')
    })

    it('should validate medical license format', () => {
      const context = createMockContext()
      expect(validateField('medicalLicense', '123', context)).toBe('Matrícula inválida')
      expect(validateField('medicalLicense', '1234', context)).toBe('')
      expect(validateField('medicalLicense', '1234567890', context)).toBe('')
      expect(validateField('medicalLicense', '12345678901', context)).toBe('Matrícula inválida')
    })

    it('should validate phone format', () => {
      const context = createMockContext()
      expect(validateField('phone', '1234567', context)).toBe('Solo números, de 8-15 dígitos, opcional +')
      expect(validateField('phone', '12345678', context)).toBe('')
      expect(validateField('phone', '+123456789012345', context)).toBe('')
      expect(validateField('phone', '1234567890123456', context)).toBe('Solo números, de 8-15 dígitos, opcional +')
      expect(validateField('phone', 'abc12345678', context)).toBe('Solo números, de 8-15 dígitos, opcional +')
    })

    it('should validate password format in register mode', () => {
      const context = createMockContext()
      expect(validateField('password', 'weak', context)).toBe('Mínimo 8 caracteres, mayúscula, minúscula y número')
      expect(validateField('password', 'StrongPass123', context)).toBe('')
    })

    it('should skip password validation in login mode', () => {
      const loginContext = createMockContext({ mode: 'login' })
      expect(validateField('password', 'weak', loginContext)).toBe('')
    })

    it('should validate password confirmation', () => {
      const context = createMockContext()
      expect(validateField('password_confirm', 'different', context)).toBe('Las contraseñas no coinciden')
      expect(validateField('password_confirm', 'TestPass123', context)).toBe('')
    })

    it('should validate birthdate', () => {
      const context = createMockContext()
      expect(validateField('birthdate', 'invalid-date', context)).toBe('Fecha inválida')
      expect(validateField('birthdate', 'valid-date', context)).toBe('')
    })

    it('should validate name and surname format', () => {
      const context = createMockContext()
      expect(validateField('name', 'A', context)).toBe('Mínimo 2 caracteres')
      expect(validateField('name', 'a'.repeat(51), context)).toBe('Máximo 50 caracteres')
      expect(validateField('name', 'John123', context)).toBe('Solo se permite letras y espacios')
      expect(validateField('name', 'John Doe', context)).toBe('')
      expect(validateField('surname', 'D', context)).toBe('Mínimo 2 caracteres')
      expect(validateField('surname', 'Doe', context)).toBe('')
    })

    it('should validate specialty format', () => {
      const context = createMockContext()
      expect(validateField('specialty', 'A', context)).toBe('Mínimo 2 caracteres')
      expect(validateField('specialty', 'a'.repeat(51), context)).toBe('Máximo 50 caracteres')
      expect(validateField('specialty', 'Cardiology123', context)).toBe('Solo se permite letras y espacios')
      expect(validateField('specialty', 'Cardiology', context)).toBe('')
    })

    it('should validate gender format', () => {
      const context = createMockContext()
      expect(validateField('gender', 'OTHER', context)).toBe('Género debe ser Masculino o Femenino')
      expect(validateField('gender', 'MALE', context)).toBe('')
      expect(validateField('gender', 'FEMALE', context)).toBe('')
    })

    it('should validate slot duration format', () => {
      const context = createMockContext()
      expect(validateField('slotDurationMin', 'abc', context)).toBe('Debe ser un número')
      expect(validateField('slotDurationMin', '4', context)).toBe('Mínimo 15 minutos')
      expect(validateField('slotDurationMin', '181', context)).toBe('Máximo 180 minutos')
      expect(validateField('slotDurationMin', '16', context)).toBe('Debe ser múltiplo de 15 minutos')
      expect(validateField('slotDurationMin', '30', context)).toBe('')
    })

    it('should validate email length', () => {
      const context = createMockContext()
      const longEmail = 'a'.repeat(250) + '@example.com'
      expect(validateField('email', longEmail, context)).toBe('Email demasiado largo (máximo 254 caracteres)')
      expect(validateField('email', 'test@example.com', context)).toBe('')
    })

    it('should validate password length', () => {
      const context = createMockContext()
      const longPassword = 'A1' + 'a'.repeat(127)
      expect(validateField('password', longPassword, context)).toBe('Máximo 128 caracteres')
      expect(validateField('password', 'StrongPass123', context)).toBe('')
    })

    it('should validate password complexity requirements', () => {
      const context = createMockContext()
      expect(validateField('password', 'password', context)).toBe('Mínimo 8 caracteres, mayúscula, minúscula y número')
      expect(validateField('password', 'PASSWORD', context)).toBe('Mínimo 8 caracteres, mayúscula, minúscula y número')
      expect(validateField('password', 'Password', context)).toBe('Mínimo 8 caracteres, mayúscula, minúscula y número')
      expect(validateField('password', 'Pass123', context)).toBe('Mínimo 8 caracteres, mayúscula, minúscula y número')
      expect(validateField('password', 'Password123', context)).toBe('')
    })

    it('should validate birthdate age limits', () => {
      const context = createMockContext()
      
      // Test someone too old (over 120 years)
      const tooOldBirthdate = new Date()
      tooOldBirthdate.setFullYear(tooOldBirthdate.getFullYear() - 125)
      const tooOldDateStr = tooOldBirthdate.toISOString()
      expect(validateField('birthdate', tooOldDateStr, context)).toBe('Fecha de nacimiento inválida')
    })

    it('should validate gender values strictly', () => {
      const context = createMockContext()
      expect(validateField('gender', 'male', context)).toBe('Género debe ser Masculino o Femenino')
      expect(validateField('gender', 'female', context)).toBe('Género debe ser Masculino o Femenino')
      expect(validateField('gender', 'MALE', context)).toBe('')
      expect(validateField('gender', 'FEMALE', context)).toBe('')
    })

    it('should validate slot duration boundaries', () => {
      const context = createMockContext()
      expect(validateField('slotDurationMin', '0', context)).toBe('Mínimo 15 minutos')
      expect(validateField('slotDurationMin', '200', context)).toBe('Máximo 180 minutos')
      expect(validateField('slotDurationMin', '15', context)).toBe('')
      expect(validateField('slotDurationMin', '59', context)).toBe('Debe ser múltiplo de 15 minutos')
      expect(validateField('slotDurationMin', '180', context)).toBe('')
    })
  })

  describe('checkFormValidation', () => {
    it('should return true when there are form errors', () => {
      const context = createMockContext({
        formErrors: { email: 'Email inválido' },
        formValues: { email: 'test@example.com', password: 'password123' },
        mode: 'login'
      })
      expect(checkFormValidation(context)).toBe(true)
    })

    it('should return true when required fields are empty in login mode', () => {
      const context = createMockContext({
        formErrors: {},
        formValues: { email: '', password: 'password123' },
        mode: 'login'
      })
      expect(checkFormValidation(context)).toBe(true)
    })

    it('should return true when required fields are empty in register mode for patient', () => {
      const context = createMockContext({
        formErrors: {},
        formValues: {
          name: 'John',
          surname: '',
          dni: '12345678',
          gender: 'MALE',
          birthdate: '1990-01-01',
          phone: '123456789',
          email: 'test@example.com',
          password: 'TestPass123',
          password_confirm: 'TestPass123'
        },
        mode: 'register'
      })
      expect(checkFormValidation(context)).toBe(true)
    })

    it('should return true when required fields are empty in register mode for doctor', () => {
      const context = createMockContext({
        formErrors: {},
        formValues: {
          name: 'Dr. John',
          surname: 'Doe',
          dni: '12345678',
          gender: 'MALE',
          birthdate: '1990-01-01',
          phone: '123456789',
          email: 'test@example.com',
          password: 'TestPass123',
          password_confirm: 'TestPass123',
          specialty: '',
          medicalLicense: '12345'
        },
        isPatient: false,
        mode: 'register'
      })
      expect(checkFormValidation(context)).toBe(true)
    })

    it('should return false when all required fields are filled and no errors', () => {
      const context = createMockContext({
        formErrors: {},
        formValues: {
          name: 'John',
          surname: 'Doe',
          dni: '12345678',
          gender: 'MALE',
          birthdate: '1990-01-01',
          phone: '123456789',
          email: 'test@example.com',
          password: 'TestPass123',
          password_confirm: 'TestPass123'
        },
        mode: 'register'
      })
      expect(checkFormValidation(context)).toBe(false)
    })

    it('should return false when all required fields are filled for doctor registration', () => {
      const context = createMockContext({
        formErrors: {},
        formValues: {
          name: 'Dr. John',
          surname: 'Doe',
          dni: '12345678',
          gender: 'MALE',
          birthdate: '1990-01-01',
          phone: '123456789',
          email: 'test@example.com',
          password: 'TestPass123',
          password_confirm: 'TestPass123',
          specialty: 'Cardiology',
          medicalLicense: '12345',
          slotDurationMin: '30'
        },
        isPatient: false,
        mode: 'register'
      })
      expect(checkFormValidation(context)).toBe(false)
    })

    it('should return true when doctor required fields are empty', () => {
      const context = createMockContext({
        formErrors: {},
        formValues: {
          name: 'Dr. John',
          surname: 'Doe',
          dni: '12345678',
          gender: 'MALE',
          birthdate: '1990-01-01',
          phone: '123456789',
          email: 'test@example.com',
          password: 'TestPass123',
          password_confirm: 'TestPass123',
          specialty: '',
          medicalLicense: '12345',
          slotDurationMin: '30'
        },
        isPatient: false,
        mode: 'register'
      })
      expect(checkFormValidation(context)).toBe(true)
    })

    it('should handle birthdate validation with null/undefined/empty values', () => {
      const context = createMockContext()
      expect(validateField('birthdate', null, context)).toBe('Campo requerido')
      expect(validateField('birthdate', undefined, context)).toBe('Campo requerido')
      expect(validateField('birthdate', '', context)).toBe('Campo requerido')
    })
  })
})