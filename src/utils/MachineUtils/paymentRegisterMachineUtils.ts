
export interface LoadPaymentRegisterParams {
  accessToken: string;
  turnId: string;
}

export interface UpdatePaymentRegisterParams {
  accessToken: string;
  turnId: string;
  payload: {
    paymentStatus?: string | null;
    method?: string | null;
    payedAt?: string | null;
    paymentAmount?: number | null;
    copaymentAmount?: number | null;
  };
}

