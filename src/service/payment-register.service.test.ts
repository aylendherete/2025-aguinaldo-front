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
