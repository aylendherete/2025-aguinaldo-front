import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentRegisterService } from './payment-register.service';

vi.mock('../../config/api', () => ({
  API_CONFIG: {
    ENDPOINTS: {
      GET_PAYMENT_REGISTER: '/api/payments/turn',
      UPDATE_PAYMENT_REGISTER: '/api/payments/turn',
      CANCEL_PAYMENT_REGISTER: '/api/payments/turn',
    },
  },
  buildApiUrl: vi.fn((endpoint: string) => `http://localhost:8080${endpoint}`),
  getAuthenticatedFetchOptions: vi.fn((token: string) => ({
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PaymentRegisterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('updatePaymentRegister', () => {
    it('should map non-bonus amount validation message to Spanish', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Payment amount must be greater than zero' }),
      });

      await expect(
        PaymentRegisterService.updatePaymentRegister({
          accessToken: 'token',
          turnId: 'turn-1',
          payload: {
            paymentStatus: 'PAID',
            method: 'CASH',
            paymentAmount: 0,
            copaymentAmount: null,
            paidAt: '2026-02-14T10:00:00.000Z',
          },
        })
      ).rejects.toThrow('El monto del pago debe ser mayor que cero.');
    });

    it('should map bonus amount validation message to Spanish', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Payment amount must be zero when payment status is BONUS' }),
      });

      await expect(
        PaymentRegisterService.updatePaymentRegister({
          accessToken: 'token',
          turnId: 'turn-1',
          payload: {
            paymentStatus: 'BONUS',
            method: 'BONUS',
            paymentAmount: 10,
            copaymentAmount: null,
            paidAt: '2026-02-14T10:00:00.000Z',
          },
        })
      ).rejects.toThrow('El monto del pago debe ser cero cuando el estado de pago es Bonificado.');
    });

    it('should map health insurance copayment required message to Spanish', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Copayment amount must be provided and greater or equal than zero when payment status is HEALTH INSURANCE' }),
      });

      await expect(
        PaymentRegisterService.updatePaymentRegister({
          accessToken: 'token',
          turnId: 'turn-1',
          payload: {
            paymentStatus: 'HEALTH INSURANCE',
            method: 'HEALTH INSURANCE',
            paymentAmount: 120,
            copaymentAmount: null,
            paidAt: '2026-02-14T10:00:00.000Z',
          },
        })
      ).rejects.toThrow('El copago es obligatorio y debe ser mayor o igual que cero cuando el estado de pago es Obra Social.');
    });

    it('should throw backend message when copayment is greater than amount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Copayment amount must be less than or equal to payment amount' }),
      });

      await expect(
        PaymentRegisterService.updatePaymentRegister({
          accessToken: 'token',
          turnId: 'turn-1',
          payload: {
            paymentStatus: 'HEALTH INSURANCE',
            method: 'HEALTH INSURANCE',
            paymentAmount: 100,
            copaymentAmount: 120,
            paidAt: '2026-02-14T10:00:00.000Z',
          },
        })
      ).rejects.toThrow('Copayment amount must be less than or equal to payment amount');
    });

    it('should throw backend message when copayment is set without amount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Payment amount is required when copayment amount is set' }),
      });

      await expect(
        PaymentRegisterService.updatePaymentRegister({
          accessToken: 'token',
          turnId: 'turn-1',
          payload: {
            paymentStatus: 'HEALTH INSURANCE',
            method: 'HEALTH INSURANCE',
            paymentAmount: null,
            copaymentAmount: 40,
            paidAt: '2026-02-14T10:00:00.000Z',
          },
        })
      ).rejects.toThrow('Payment amount is required when copayment amount is set');
    });
  });

  describe('cancelPaymentRegister', () => {
    it('should cancel payment register successfully', async () => {
      const mockResponse = {
        paymentStatus: 'CANCELED',
        method: 'CASH',
        paymentAmount: 100,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await PaymentRegisterService.cancelPaymentRegister({
        accessToken: 'token',
        turnId: 'turn-1',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/payments/turn/turn-1/cancel',
        expect.objectContaining({ method: 'PATCH' })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw backend message when cancel fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Payment with status PENDING cannot be canceled' }),
      });

      await expect(
        PaymentRegisterService.cancelPaymentRegister({ accessToken: 'token', turnId: 'turn-1' })
      ).rejects.toThrow('Payment with status PENDING cannot be canceled');
    });
  });
});
