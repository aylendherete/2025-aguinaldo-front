export const HEALTH_INSURANCE_PLANS: Record<string, string[]> = {
  OSDE: ["210", "310", "410", "450", "510"],
  "SWISS MEDICAL": ["SMG20", "SMG30", "SMG40", "SMG50", "SMG60"],
  GALENO: ["220", "330", "440"],
  MEDICUS: ["MEDICUS"],
  OMINT: ["GLOBAL", "PREMIUM"],
  "SANCOR SALUD": ["1000", "2000", "3000", "4000"],
  "MEDIFÉ": ["BRONCE", "PLATA", "ORO"],
  "PREVENCIÓN SALUD": ["A1", "A2", "A3"],
  OSECAC: ["OSECAC"],
  OSDEPYM: ["OSDEPYM"],
  OSPRERA: ["OSPRERA"],
  OSPACA: ["OSPACA"],
  OSPE: ["OSPE"],
  OSUTHGRA: ["OSUTHGRA"],
  OSUOM: ["OSUOM"],
  OSMATA: ["OSMATA"],
  IOMA: ["IOMA"],
  IOSFA: ["IOSFA"],
  PAMI: ["PAMI"],
};

export const HEALTH_INSURANCE_LIST = Object.keys(HEALTH_INSURANCE_PLANS);

export const getHealthPlansForInsurance = (insurance?: string | null): string[] => {
  if (!insurance) {
    return [];
  }

  const normalized = insurance.trim().toUpperCase();
  return HEALTH_INSURANCE_PLANS[normalized] ?? [];
};
