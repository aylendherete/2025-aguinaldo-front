import type { MedicalHistory } from './MedicalHistory';
import dayjs from '#/utils/dayjs.config';

export interface SubcategoryCount {
  subcategory: string;
  count: number;
}

export interface Patient {
  id: string;
  name: string;
  surname: string;
  email: string;
  dni: number;
  phone?: string;
  birthdate?: string;
  gender?: string;
  status: string;
  healthInsurance?: string | null;
  healthPlan?: string | null;
  score?: number | null;
  medicalHistory?: string; // For backward compatibility - latest medical history content
  medicalHistories?: MedicalHistory[]; // New field for multiple medical history entries
  ratingSubcategories?: SubcategoryCount[];
}

export interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export const calculateAge = (birthdate: string | undefined): number | null => {
  if (!birthdate) return null;
  
  const today = dayjs().tz('America/Argentina/Buenos_Aires');
  const birth = dayjs(birthdate).tz('America/Argentina/Buenos_Aires');
  let age = today.year() - birth.year();
  const monthDiff = today.month() - birth.month();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.date() < birth.date())) {
    age--;
  }
  
  return age;
};