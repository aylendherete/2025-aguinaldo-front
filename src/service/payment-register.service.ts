import { API_CONFIG, buildApiUrl, getAuthenticatedFetchOptions } from "../../config/api";
import type {PaymentRegisterResponse, PaymentRegisterRequest} from "#/models/Turn";


export interface LoadPaymentRegisterParams {
  accessToken: string;
  turnId: string;
}

const PAYMENT_REGISTER_ERROR_MAP: Record<string, string> = {
  "Update payload is required": "Se requieren los datos para actualizar el pago.",
  "Turn not found": "No se encontró el turno.",
  "Payment register not found for this turn": "No se encontró el registro de pagos para este turno.",
  "You are not allowed to update this payment register": "No tenés permisos para actualizar este registro de pagos.",
  "Payment register can only be updated for completed turns": "El registro de pagos solo se puede actualizar en turnos completados.",
  "Payment status cannot be updated to PENDING": "No se puede actualizar el estado de pago a Pendiente.",
  "Invalid payment status": "Estado de pago inválido.",
  "Invalid payment method": "Medio de pago inválido.",
  "Payment status cannot be null": "El estado de pago no puede ser nulo.",
  "Payment status cannot be empty": "El estado de pago no puede estar vacío.",
  "Payment method cannot be null": "El medio de pago no puede ser nulo.",
  "Payment method cannot be empty": "El medio de pago no puede estar vacío.",
  "Payment method must be BONUS when payment status is BONUS": "El medio de pago debe ser Bonificado cuando el estado de pago es Bonificado.",
  "Payment method must be HEALTH INSURANCE when payment status is HEALTH INSURANCE": "El medio de pago debe ser Obra Social cuando el estado de pago es Obra Social.",
  "Payment status must be BONUS when payment method is BONUS": "El estado de pago debe ser Bonificado cuando el medio de pago es Bonificado.",
  "Payment status must be HEALTH INSURANCE when payment method is HEALTH INSURANCE": "El estado de pago debe ser Obra Social cuando el medio de pago es Obra Social.",
  "Payment amount must be greater than zero": "El monto del pago debe ser mayor que cero.",
  "Payment amount must be greater than zero when payment status is BONUS": "El monto del pago debe ser mayor que cero cuando el estado de pago es Bonificado.",
  "Payment amount must be less than 10 million": "El monto del pago debe ser menor que 10 millones.",
  "Copayment amount must be less than 10 million": "El copago debe ser menor que 10 millones.",
  "Copayment amount can only be set when payment status is HEALTH INSURANCE": "El copago solo se puede informar cuando el estado de pago es Obra Social.",
  "Copayment amount must be provided and greater or equal than zero when payment status is HEALTH INSURANCE": "El copago es obligatorio y debe ser mayor o igual que cero cuando el estado de pago es Obra Social.",
  "Copayment amount must be provided and greater than zero when payment status is HEALTH INSURANCE": "El copago es obligatorio y debe ser mayor que cero cuando el estado de pago es Obra Social.",
  "Copayment amount must be less than or equal to payment amount": "El copago debe ser menor o igual al monto del pago.",
  "Payment amount is required when copayment amount is set": "El monto del pago es obligatorio cuando se informa un copago.",
  "When payment status is CANCELED, method/copayment/amount/paidAt cannot be sent": "Cuando el estado de pago es Cancelado, no se pueden enviar medio/copago/monto/fecha de pago.",
  "Payment with status PENDING cannot be canceled": "Un pago con estado Pendiente no puede ser cancelado.",
  "You are not allowed to cancel this payment register": "No tenés permisos para cancelar este registro de pagos.",
  "Payment register can only be canceled for completed turns": "El registro de pagos solo se puede cancelar en turnos completados.",
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