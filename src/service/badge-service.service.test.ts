import { describe, it, expect, vi } from 'vitest';
import { BadgeService } from './badge-service.service';
import type { BadgeProgress } from '../models/Badge';
import { BadgeType, BadgeCategory } from '../models/Badge';

// Mock fetch globally
global.fetch = vi.fn();

describe('BadgeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCombinedBadgeData', () => {
    it('should fetch and return combined badge data', async () => {
      const mockResponse: BadgeProgress[] = [
        {
          badgeType: BadgeType.EXCEPTIONAL_COMMUNICATOR,
          badgeName: 'Comunicador Excepcional',
          category: BadgeCategory.QUALITY_OF_CARE,
          rarity: 'RARE',
          description: '40+ evaluaciones destacadas en comunicación',
          icon: '💬',
          color: '#4CAF50',
          criteria: 'Recibe 25 menciones positivas de comunicación en total',
          earned: true,
          progressPercentage: 100,
          statusMessage: '¡Logro obtenido!',
          earnedAt: '2024-01-01T00:00:00Z',
          isActive: true,
          lastEvaluatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await BadgeService.getCombinedBadgeData('fake-token', 'doctor-1');

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/badges/doctor-1/progress', expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer fake-token'
        })
      }));
      expect(result.badges).toHaveLength(1);
      expect(result.progress).toEqual(mockResponse);
    });

    it('should map and keep only earned+active DOCTOR badges', async () => {
      const doctorProgress: BadgeProgress[] = [
        {
          badgeType: 'DOCTOR_EXCELLENT_COLLABORATOR',
          badgeName: 'Colaborador Excelente',
          category: BadgeCategory.QUALITY_OF_CARE,
          rarity: 'RARE',
          description: 'Descripción',
          icon: '💬',
          color: '#4CAF50',
          criteria: 'Criterio',
          earned: true,
          progressPercentage: 100,
          statusMessage: '¡Logro obtenido!',
          earnedAt: '2024-01-10T10:00:00Z',
          isActive: true,
          lastEvaluatedAt: '2024-01-10T10:00:00Z'
        },
        {
          badgeType: 'DOCTOR_MEDICAL_LEGEND',
          badgeName: 'Leyenda Médica',
          category: BadgeCategory.CONSISTENCY,
          rarity: 'LEGENDARY',
          description: 'Descripción',
          icon: '🏆',
          color: '#FFD700',
          criteria: 'Criterio',
          earned: true,
          progressPercentage: 100,
          statusMessage: '¡Logro obtenido!',
          earnedAt: '2024-01-10T10:00:00Z',
          isActive: false,
          lastEvaluatedAt: '2024-01-10T10:00:00Z'
        },
        {
          badgeType: 'DOCTOR_TOP_SPECIALIST',
          badgeName: 'Top Specialist',
          category: BadgeCategory.PROFESSIONALISM,
          rarity: 'EPIC',
          description: 'Descripción',
          icon: '⭐',
          color: '#9C27B0',
          criteria: 'Criterio',
          earned: false,
          progressPercentage: 70,
          statusMessage: 'En progreso',
          isActive: true,
          lastEvaluatedAt: '2024-01-10T10:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(doctorProgress)
      });

      const result = await BadgeService.getCombinedBadgeData('doctor-token', 'doctor-99');

      expect(result.progress).toEqual(doctorProgress);
      expect(result.badges).toEqual([
        {
          id: 'doctor-99-DOCTOR_EXCELLENT_COLLABORATOR',
          doctorId: 'doctor-99',
          badgeType: 'DOCTOR_EXCELLENT_COLLABORATOR',
          earnedAt: '2024-01-10T10:00:00Z',
          isActive: true,
          lastEvaluatedAt: '2024-01-10T10:00:00Z'
        }
      ]);
    });

    it('should map and keep only earned+active PATIENT badges', async () => {
      const patientProgress: BadgeProgress[] = [
        {
          badgeType: 'PATIENT_MEDIBOOK_WELCOME',
          badgeName: 'Bienvenida MediBook',
          category: 'WELCOME',
          rarity: 'COMMON',
          description: 'Descripción',
          icon: '👋',
          color: '#2196F3',
          criteria: 'Criterio',
          earned: true,
          progressPercentage: 100,
          statusMessage: '¡Logro obtenido!',
          earnedAt: '2024-01-15T10:00:00Z',
          isActive: true,
          lastEvaluatedAt: '2024-01-15T10:00:00Z'
        },
        {
          badgeType: 'PATIENT_EXCELLENCE_MODEL',
          badgeName: 'Modelo de Excelencia',
          category: 'CLINICAL_EXCELLENCE',
          rarity: 'LEGENDARY',
          description: 'Descripción',
          icon: '🏅',
          color: '#FFD700',
          criteria: 'Criterio',
          earned: true,
          progressPercentage: 100,
          statusMessage: '¡Logro obtenido!',
          earnedAt: '2024-01-15T10:00:00Z',
          isActive: false,
          lastEvaluatedAt: '2024-01-15T10:00:00Z'
        },
        {
          badgeType: 'PATIENT_CONTINUOUS_FOLLOWUP',
          badgeName: 'Seguimiento Continuo',
          category: 'PREVENTIVE_CARE',
          rarity: 'RARE',
          description: 'Descripción',
          icon: '📌',
          color: '#4CAF50',
          criteria: 'Criterio',
          earned: false,
          progressPercentage: 80,
          statusMessage: 'En progreso',
          isActive: true,
          lastEvaluatedAt: '2024-01-15T10:00:00Z'
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(patientProgress)
      });

      const result = await BadgeService.getCombinedBadgeData('patient-token', 'patient-88');

      expect(result.progress).toEqual(patientProgress);
      expect(result.badges).toEqual([
        {
          id: 'patient-88-PATIENT_MEDIBOOK_WELCOME',
          doctorId: 'patient-88',
          badgeType: 'PATIENT_MEDIBOOK_WELCOME',
          earnedAt: '2024-01-15T10:00:00Z',
          isActive: true,
          lastEvaluatedAt: '2024-01-15T10:00:00Z'
        }
      ]);
    });

    it('should throw error on fetch failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' })
      });

      await expect(BadgeService.getCombinedBadgeData('fake-token', 'doctor-1')).rejects.toThrow();
    });
  });

  describe('evaluateUserBadges', () => {
    it('should trigger badge evaluation successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true
      });

      await expect(BadgeService.evaluateUserBadges('fake-token', 'doctor-1')).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/badges/doctor-1/evaluate', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer fake-token'
        })
      }));
    });

    it('should throw error on evaluation failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Evaluation error' })
      });

      await expect(BadgeService.evaluateUserBadges('fake-token', 'doctor-1')).rejects.toThrow();
    });

    it('should evaluate badges for patient users too', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true
      });

      await expect(BadgeService.evaluateUserBadges('fake-token', 'patient-1')).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8080/api/badges/patient-1/evaluate', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer fake-token'
        })
      }));
    });
  });

  describe('formatEarnedDate', () => {
    it('should format today correctly', () => {
      const today = new Date().toISOString();
      const result = BadgeService.formatEarnedDate(today);

      expect(result).toBe('Hoy');
    });

    it('should format yesterday correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = BadgeService.formatEarnedDate(yesterday.toISOString());

      expect(result).toBe('Ayer');
    });

    it('should format days ago correctly', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const result = BadgeService.formatEarnedDate(fiveDaysAgo.toISOString());

      expect(result).toBe('Hace 5 días');
    });

    it('should format weeks ago correctly', () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const result = BadgeService.formatEarnedDate(twoWeeksAgo.toISOString());

      expect(result).toBe('Hace 2 semanas');
    });

    it('should format months ago correctly', () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const result = BadgeService.formatEarnedDate(threeMonthsAgo.toISOString());

      expect(result).toBe('Hace 3 meses');
    });

    it('should format years ago correctly', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const result = BadgeService.formatEarnedDate(twoYearsAgo.toISOString());

      expect(result).toBe('Hace 2 años');
    });
  });
});