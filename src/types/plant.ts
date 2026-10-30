export type PlantCategory = {
  id: string;
  slug: string;
  nameZh: string;
  nameEn: string;
  plantCount: number;
};

export type PlantCategoryRef = Pick<PlantCategory, 'slug' | 'nameZh' | 'nameEn'>;
export type PlantIdentityStatus = 'pending' | 'verified';

export type PlantSummary = {
  id: string;
  nameZh: string;
  nameEn: string | null;
  scientificName: string;
  identityStatus: PlantIdentityStatus;
  categories: PlantCategoryRef[];
};

export type PlantDetail = PlantSummary & {
  aliases: { name: string; language: string | null }[];
  summary: string | null;
  appearanceFeatures: string | null;
  temperatureMinC: number | null;
  temperatureMaxC: number | null;
  temperatureNotes: string | null;
  sunlightRequirement: string | null;
  wateringRequirement: string | null;
  repottingRequirement: string | null;
  pests: string | null;
};
