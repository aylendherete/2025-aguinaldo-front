import { describe, it, expect } from 'vitest'
import {
  getPaymentRegisterYears,
  getPaymentRegisterMonths,
  getPeriodTurns,
  getPaymentTurns,
  buildPaymentSummary,
  validatePaymentForm,
  buildPaymentUpdatePayload,
  buildPaymentTurnViewModel,
} from './paymentRegisterUtils'

describe('paymentRegisterUtils', () => {
  it('getPaymentRegisterYears returns sorted years and fallback current year', () => {
    const turns = [
      { scheduledAt: '2025-01-10T10:00:00.000Z', paymentRegister: { paidAt: null } },
      { scheduledAt: '2024-01-10T10:00:00.000Z', paymentRegister: { paidAt: '2026-02-12T10:00:00.000Z' } },
    ]

    expect(getPaymentRegisterYears(turns, 2023)).toEqual([2026, 2025, 2024])
    expect(getPaymentRegisterYears([], 2023)).toEqual([2023])
  })

  it('getPaymentRegisterMonths returns months for selected year and fallback month', () => {
    const turns = [
      { scheduledAt: '2026-02-10T10:00:00.000Z', paymentRegister: { paidAt: null } },
      { scheduledAt: '2026-03-10T10:00:00.000Z', paymentRegister: { paidAt: '2026-04-10T10:00:00.000Z' } },
      { scheduledAt: '2025-03-10T10:00:00.000Z', paymentRegister: { paidAt: null } },
    ]

    expect(getPaymentRegisterMonths(turns, 2026, 0)).toEqual([1, 2, 3])
    expect(getPaymentRegisterMonths([], 2027, 5)).toEqual([5])
  })

  it('getPeriodTurns prioritizes paidAt for non-pending and scheduledAt for pending', () => {
    const turns = [
      {
        id: 'a',
        status: 'COMPLETED',
        scheduledAt: '2026-01-10T10:00:00.000Z',
        paymentRegister: { paymentStatus: 'PENDING', paidAt: null },
      },
      {
        id: 'b',
        status: 'COMPLETED',
        scheduledAt: '2026-01-10T10:00:00.000Z',
        paymentRegister: { paymentStatus: 'PAID', paidAt: '2026-02-11T10:00:00.000Z' },
      },
      {
        id: 'c',
        status: 'COMPLETED',
        scheduledAt: '2026-02-03T10:00:00.000Z',
        paymentRegister: { paymentStatus: 'PENDING', paidAt: null },
      },
    ]

    const febTurns = getPeriodTurns(turns, 1, 2026)
    expect(febTurns.map((t: any) => t.id)).toEqual(['b', 'c'])
  })

  it('getPaymentTurns puts completed+pending first', () => {
    const turns = [
      { id: 'x', status: 'COMPLETED', paymentRegister: { paymentStatus: 'PAID' } },
      { id: 'y', status: 'COMPLETED', paymentRegister: { paymentStatus: 'PENDING' } },
      { id: 'z', status: 'SCHEDULED', paymentRegister: { paymentStatus: 'PENDING' } },
    ]

    const result = getPaymentTurns(turns)
    expect(result[0].id).toBe('y')
    expect(result).toHaveLength(3)
  })

  it('buildPaymentSummary calculates totals with bonus/receivable fields', () => {
    const turns = [
      {
        status: 'COMPLETED',
        paymentRegister: {
          paymentStatus: 'PAID',
          method: 'CASH',
          paymentAmount: 100,
          copaymentAmount: 0,
        },
      },
      {
        status: 'COMPLETED',
        paymentRegister: {
          paymentStatus: 'HEALTH INSURANCE',
          method: 'HEALTH_INSURANCE',
          paymentAmount: 200,
          copaymentAmount: 50,
        },
      },
      {
        status: 'COMPLETED',
        paymentRegister: {
          paymentStatus: 'BONUS',
          method: 'BONUS',
          paymentAmount: 80,
          copaymentAmount: 0,
        },
      },
      {
        status: 'COMPLETED',
        paymentRegister: {
          paymentStatus: 'PENDING',
          method: '',
          paymentAmount: 70,
          copaymentAmount: 0,
        },
      },
      {
        status: 'CANCELED',
        paymentRegister: {
          paymentStatus: 'CANCELED',
          method: 'CASH',
          paymentAmount: 30,
          copaymentAmount: 0,
        },
      },
    ]

    const summary = buildPaymentSummary(turns)

    expect(summary.totalBilled).toBe(450)
    expect(summary.totalCollected).toBe(100)
    expect(summary.totalCopayment).toBe(50)
    expect(summary.totalCovered).toBe(150)
    expect(summary.totalPayments).toBe(3)
    expect(summary.canceledPaymentCount).toBe(1)
    expect(summary.pendingCount).toBe(1)
    expect(summary.paidCount).toBe(1)
    expect(summary.healthInsuranceCount).toBe(1)
    expect(summary.bonusCount).toBe(1)
    expect(summary.totalBonus).toBe(80)
    expect(summary.totalAccountsReceivable).toBe(1)
    expect(summary.completedCount).toBe(4)
    expect(summary.canceledCount).toBe(1)
  })

  it('validatePaymentForm validates required fields', () => {
    expect(validatePaymentForm()).toBe('Completá los datos del pago.')
    expect(validatePaymentForm({ paymentStatus: 'PENDING', method: '', paymentAmount: '', copaymentAmount: '' })).toBe('Seleccioná un estado de pago válido.')
    expect(validatePaymentForm({ paymentStatus: 'PAID', method: '', paymentAmount: '', copaymentAmount: '' })).toBe('Seleccioná un medio de pago.')
    expect(validatePaymentForm({ paymentStatus: 'PAID', method: 'CASH', paymentAmount: '', copaymentAmount: '' })).toBe('Ingresá el monto abonado.')
    expect(validatePaymentForm({ paymentStatus: 'PAID', method: 'CASH', paymentAmount: '10', copaymentAmount: '' })).toBeNull()
    expect(validatePaymentForm({ paymentStatus: 'HEALTH INSURANCE', method: 'HEALTH INSURANCE', paymentAmount: '100', copaymentAmount: '100' })).toBeNull()
    expect(validatePaymentForm({ paymentStatus: 'HEALTH INSURANCE', method: 'HEALTH INSURANCE', paymentAmount: '100', copaymentAmount: '120' })).toBe('El copago debe ser menor o igual al monto abonado.')
    expect(validatePaymentForm({ paymentStatus: 'HEALTH INSURANCE', method: 'HEALTH INSURANCE', paymentAmount: '100', copaymentAmount: '20' })).toBeNull()
  })

  it('buildPaymentUpdatePayload maps numeric values and copayment rule', () => {
    const paidPayload = buildPaymentUpdatePayload(
      { paymentStatus: 'PAID', method: 'CASH', paymentAmount: '500', copaymentAmount: '20' },
      '2026-02-01T12:00:00.000Z'
    )
    expect(paidPayload).toEqual({
      paymentStatus: 'PAID',
      method: 'CASH',
      paymentAmount: 500,
      copaymentAmount: null,
      paidAt: '2026-02-01T12:00:00.000Z',
    })

    const insurancePayload = buildPaymentUpdatePayload(
      { paymentStatus: 'HEALTH INSURANCE', method: 'HEALTH_INSURANCE', paymentAmount: '500', copaymentAmount: '20' },
      '2026-02-01T12:00:00.000Z'
    )
    expect(insurancePayload.copaymentAmount).toBe(20)
  })

  it('buildPaymentTurnViewModel marks canceled as editable and preserves deleted visual state', () => {
    const turn = {
      status: 'COMPLETED',
      paymentRegister: {
        paymentStatus: 'CANCELED',
        method: 'CASH',
        paymentAmount: 250,
        copaymentAmount: 0,
      },
    }

    const vm = buildPaymentTurnViewModel(turn)
    expect(vm.isCanceledPayment).toBe(true)
    expect(vm.canEditPayment).toBe(true)
    expect(vm.canDeletePayment).toBe(false)
    expect(vm.formState.paymentStatus).toBe('PENDING')
    expect(vm.formState.method).toBe('')
    expect(vm.formState.paymentAmount).toBe('')
  })

  it('buildPaymentTurnViewModel allows deleting non-pending, non-canceled', () => {
    const turn = {
      status: 'COMPLETED',
      paymentRegister: {
        paymentStatus: 'PAID',
        method: 'CASH',
        paymentAmount: 120,
        copaymentAmount: 0,
      },
    }

    const vm = buildPaymentTurnViewModel(turn)
    expect(vm.canDeletePayment).toBe(true)
    expect(vm.canEditPayment).toBe(false)
  })
})
