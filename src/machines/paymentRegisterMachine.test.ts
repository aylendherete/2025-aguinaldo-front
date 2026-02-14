import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createActor } from 'xstate'

vi.mock('../service/payment-register.service', () => ({
  PaymentRegisterService: {
    loadPaymentRegister: vi.fn(),
    updatePaymentRegister: vi.fn(),
  },
}))

import { PaymentRegisterService } from '../service/payment-register.service'
import { paymentRegisterMachine } from './paymentRegisterMachine'

describe('paymentRegisterMachine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with payment context fields', () => {
    const actor = createActor(paymentRegisterMachine)
    actor.start()

    const ctx = actor.getSnapshot().context
    expect(ctx.savingPaymentId).toBeNull()
    expect(ctx.errorByPaymentId).toEqual({})
    expect(ctx.formByPaymentId).toEqual({})
    expect(typeof ctx.periodMonth).toBe('number')
    expect(typeof ctx.periodYear).toBe('number')
  })

  it('updates period values', () => {
    const actor = createActor(paymentRegisterMachine)
    actor.start()

    actor.send({ type: 'UPDATE_PERIOD', month: 4 })
    expect(actor.getSnapshot().context.periodMonth).toBe(4)

    actor.send({ type: 'UPDATE_PERIOD', year: 2030 })
    expect(actor.getSnapshot().context.periodYear).toBe(2030)
  })

  it('updates local payment form and locks method for bonus/health insurance', () => {
    const actor = createActor(paymentRegisterMachine)
    actor.start()

    actor.send({ type: 'UPDATE_LOCAL_FORM', paymentId: 'p1', updates: { paymentStatus: 'HEALTH INSURANCE' } })
    let form = actor.getSnapshot().context.formByPaymentId.p1
    expect(form.paymentStatus).toBe('HEALTH INSURANCE')
    expect(form.method).toBe('HEALTH INSURANCE')

    actor.send({ type: 'UPDATE_LOCAL_FORM', paymentId: 'p1', updates: { copaymentAmount: '40' } })
    form = actor.getSnapshot().context.formByPaymentId.p1
    expect(form.copaymentAmount).toBe('40')

    actor.send({ type: 'UPDATE_LOCAL_FORM', paymentId: 'p1', updates: { paymentStatus: 'PAID' } })
    form = actor.getSnapshot().context.formByPaymentId.p1
    expect(form.copaymentAmount).toBe('')
  })

  it('sets and clears payment errors and saving payment id', () => {
    const actor = createActor(paymentRegisterMachine)
    actor.start()

    actor.send({ type: 'SET_SAVING_PAYMENT', paymentId: 'p1' })
    expect(actor.getSnapshot().context.savingPaymentId).toBe('p1')

    actor.send({ type: 'SET_PAYMENT_ERROR', paymentId: 'p1', message: 'error' })
    expect(actor.getSnapshot().context.errorByPaymentId.p1).toBe('error')

    actor.send({ type: 'CLEAR_PAYMENT_ERROR', paymentId: 'p1' })
    expect(actor.getSnapshot().context.errorByPaymentId.p1).toBe('')
  })

  it('loads payment register when auth and turnId are set', async () => {
    vi.mocked(PaymentRegisterService.loadPaymentRegister).mockResolvedValue({
      paymentStatus: 'PENDING',
      method: null,
      paidAt: null,
      paymentAmount: null,
      copaymentAmount: null,
    } as any)

    const actor = createActor(paymentRegisterMachine)
    actor.start()
    actor.send({ type: 'SET_AUTH', accessToken: 'token', turnId: 'turn-1' })
    actor.send({ type: 'LOAD_PAYMENT_REGISTER' })

    await vi.waitFor(() => {
      expect(PaymentRegisterService.loadPaymentRegister).toHaveBeenCalledWith({
        accessToken: 'token',
        turnId: 'turn-1',
      })
    })
  })

  it('updates payment register using formValues', async () => {
    vi.mocked(PaymentRegisterService.updatePaymentRegister).mockResolvedValue({
      paymentStatus: 'PAID',
      method: 'CASH',
      paidAt: '2026-02-14T10:00:00.000Z',
      paymentAmount: 100,
      copaymentAmount: null,
    } as any)

    const actor = createActor(paymentRegisterMachine)
    actor.start()
    actor.send({ type: 'SET_AUTH', accessToken: 'token', turnId: 'turn-9' })
    actor.send({ type: 'UPDATE_FORM', key: 'paymentStatus', value: 'PAID' })
    actor.send({ type: 'UPDATE_FORM', key: 'method', value: 'CASH' })
    actor.send({ type: 'UPDATE_FORM', key: 'paymentAmount', value: 100 })
    actor.send({ type: 'UPDATE_FORM', key: 'copaymentAmount', value: null })
    actor.send({ type: 'UPDATE_FORM', key: 'paidAt', value: '2026-02-14T10:00:00.000Z' })

    actor.send({ type: 'UPDATE_PAYMENT_REGISTER' })

    await vi.waitFor(() => {
      expect(PaymentRegisterService.updatePaymentRegister).toHaveBeenCalledWith({
        accessToken: 'token',
        turnId: 'turn-9',
        payload: {
          paymentStatus: 'PAID',
          method: 'CASH',
          paidAt: '2026-02-14T10:00:00.000Z',
          paymentAmount: 100,
          copaymentAmount: null,
        },
      })
    })
  })
})
