import { API_CONFIG, buildApiUrl, getAuthenticatedFetchOptions } from "../../config/api";
import type {PaymentRegisterResponse, PaymentRegisterRequest} from "#/models/Turn";


export interface LoadPaymentRegisterParams {
  accessToken: string;
  turnId: string;
}

const PAYMENT_REGISTER_ERROR_MAP: Record<string, string> = {
  "Payment amount must be greater than zero": "El monto del pago debe ser mayor que cero.",
  "Payment amount must be zero when payment status is BONUS": "El monto del pago debe ser cero cuando el estado de pago es Bonificado.",
  "Copayment amount must be provided and greater or equal than zero when payment status is HEALTH INSURANCE": "El copago es obligatorio y debe ser mayor o igual que cero cuando el estado de pago es Obra Social.",
  "Copayment amount must be provided and greater than zero when payment status is HEALTH INSURANCE": "El copago es obligatorio y debe ser mayor que cero cuando el estado de pago es Obra Social.",
};

const mapPaymentRegisterErrorMessage = (message?: string): string => {
  if (!message) {
    return "No se pudo actualizar el registro de pagos";
  }

  return PAYMENT_REGISTER_ERROR_MAP[message] || message;
};


export class PaymentRegisterService {

  static async loadPaymentRegister({ accessToken, turnId }: LoadPaymentRegisterParams): Promise<PaymentRegisterResponse> {
    const url= `${buildApiUrl(API_CONFIG.ENDPOINTS.GET_PAYMENT_REGISTER)}/${turnId}`
  
    try{
        const response = await fetch(url, {
            ...getAuthenticatedFetchOptions(accessToken),
            method: "GET",
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.message || errorData?.error || "No se pudo cargar el registro de pagos");
        }
        return await response.json();
    }
    catch (error){
        console.error("Fallo la obtencion de pagos",error)
        throw error;
    }
  }

  static async updatePaymentRegister({ accessToken, turnId, payload }: PaymentRegisterRequest): Promise<PaymentRegisterResponse> {
   const url = `${buildApiUrl(API_CONFIG.ENDPOINTS.UPDATE_PAYMENT_REGISTER)}/${turnId}`;
    try {
        const response = await fetch(
        url,{
        ...getAuthenticatedFetchOptions(accessToken),
        method: "PUT",
        body: JSON.stringify(payload),
        }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const rawMessage = errorData?.message || errorData?.error;
    throw new Error(mapPaymentRegisterErrorMessage(rawMessage));
  }

  return await response.json();
    } catch (error) {
        console.error("Fallo la actualizacion de pagos", error);
        throw error;
    }
  }

  static async cancelPaymentRegister({ accessToken, turnId }: LoadPaymentRegisterParams): Promise<PaymentRegisterResponse> {
    const url = `${buildApiUrl(API_CONFIG.ENDPOINTS.CANCEL_PAYMENT_REGISTER)}/${turnId}/cancel`;

    try {
      const response = await fetch(url, {
        ...getAuthenticatedFetchOptions(accessToken),
        method: "PATCH",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || errorData?.error || "No se pudo eliminar el registro de pagos");
      }

      return await response.json();
    } catch (error) {
      console.error("Fallo la eliminación de pagos", error);
      throw error;
    }
  }
}