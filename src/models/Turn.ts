export interface Doctor {
  id: string;
  name: string;
  surname: string;
  email: string;
  medicalLicense: string;
  specialty: string;
  slotDurationMin: number;
  score: number;
}

export interface TurnAvailable {
  id: string;
  doctorId: string;
  scheduledAt: string; 
}

export interface TurnAssigned {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  patientId: string;
  patientName: string;
  scheduledAt: string; 
  status: 'AVAILABLE' | 'RESERVED' | 'COMPLETED' | 'CANCELLED';
}

export interface TurnCreateRequest {
  doctorId: string;
  patientId: string;
  scheduledAt: string; 
  // optional motive for the appointment (sent as `motive` to backend)
  motive?: string;
}

export interface TurnResponse {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  patientId: string;
  patientName: string;
  patientScore?: number | null;
  scheduledAt: string;
  status: string;
  motive?: string | null;
  reason?: string | null;
  needsPatientRating?: boolean;
  needsDoctorRating?: boolean;
  fileUrl?: string | null;
  fileName?: string | null;
  uploadedAt?: string | null;
  paymentRegister?: PaymentRegisterResponse | null;
}

export interface PaymentRegisterResponse {
  id?: string | null;
  turnId?: string | null;
  paidAt?: string | null;
  paymentStatus?: string | null;
  paymentAmount?: number | null;
  method?: string | null;
  copaymentAmount?: number | null;
}

export interface PaymentRegisterRequest {
  accessToken: string;
  turnId: string;
  payload: {
    paymentStatus?: string | null;
    method?: string | null;
    paidAt?: string | null;
    paymentAmount?: number | null;
    copaymentAmount?: number | null;
  };
}

export interface ApiErrorResponse {
  message?: string;
  error?: string;
  details?: string;
}