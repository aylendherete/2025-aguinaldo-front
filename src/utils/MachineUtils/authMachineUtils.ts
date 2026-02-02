import { AuthService } from "../../service/auth-service.service";
import type { AuthMachineContext } from "../../machines/authMachine";
import { buildApiUrl, getAuthenticatedFetchOptions } from "../../../config/api";

/**
 * Utility functions for authMachine service calls
 */

export interface AuthSubmitParams {
  context: AuthMachineContext;
}

export interface CheckAuthResult {
  authData: any;
  isAuthenticated: boolean;
}

export interface LogoutResult {
  success: boolean;
}

/**
 * Validate if the stored access token is still valid by making an authenticated API call
 */
export const validateAccessToken = async (accessToken: string): Promise<boolean> => {
  try {
    const url = buildApiUrl('/api/profile/me');
    const response = await fetch(url, {
      ...getAuthenticatedFetchOptions(accessToken),
      method: 'GET',
    });
    
    // If token is invalid (401 or 403), clear auth data
    if (response.status === 401 || response.status === 403) {
      console.warn('Token validation failed - clearing auth data');
      AuthService.clearAuthData();
      return false;
    }
    
    return response.ok;
  } catch (error) {
    console.warn('Token validation failed:', error);
    // Clear auth data on network errors too
    AuthService.clearAuthData();
    return false;
  }
};

/**
 * Check stored authentication data and validate token
 */
export const checkStoredAuth = async (): Promise<CheckAuthResult> => {
  const authData = AuthService.getStoredAuthData();
  
  if (!authData?.accessToken || !authData?.refreshToken) {
    return {
      authData,
      isAuthenticated: false
    };
  }

  // Validate the access token
  const isTokenValid = await validateAccessToken(authData.accessToken);
  
  return {
    authData,
    isAuthenticated: isTokenValid
  };
};

/**
 * Handle authentication submission (login or register)
 */
export const submitAuthentication = async ({ context }: AuthSubmitParams) => {
  if (context.mode === "login") {
    return await AuthService.signIn({
      email: context.formValues.email,
      password: context.formValues.password,
    });
  } else {
    // Register mode - RegisterRequestData interface requires all fields
    const normalizeCoverageValue = (value: string | null) => {
      if (!value) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed.length ? trimmed.toUpperCase() : null;
    };

    const registerData = {
      name: context.formValues.name,
      surname: context.formValues.surname,
      email: context.formValues.email,
      password: context.formValues.password,
      password_confirm: context.formValues.password_confirm,
      dni: context.formValues.dni,
      gender: context.formValues.gender,
      birthdate: context.formValues.birthdate,
      phone: context.formValues.phone,
      specialty: context.formValues.specialty,
      medicalLicense: context.formValues.medicalLicense,
      slotDurationMin: context.formValues.slotDurationMin,
      healthInsurance: normalizeCoverageValue(context.formValues.healthInsurance),
      healthPlan: normalizeCoverageValue(context.formValues.healthPlan),
    };

    if (context.isPatient) {
      return await AuthService.registerPatient(registerData);
    } else {
      return await AuthService.registerDoctor(registerData);
    }
  }
};

/**
 * Handle user logout
 */
export const logoutUser = async (): Promise<boolean> => {
  try {
    const authData = AuthService.getStoredAuthData();
    if (authData?.refreshToken) {
      await  AuthService.signOut(authData.refreshToken);
    }
    AuthService.clearAuthData();
    return true;
  } catch (error) {
    console.warn('Logout API call failed, but clearing local data:', error);
    AuthService.clearAuthData();
    return true;
  }
};