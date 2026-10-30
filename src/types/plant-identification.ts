export type LocalPlantMatch =
  | { status: 'matched'; plant: { id: string; nameZh: string } }
  | { status: 'unmatched' | 'not_ready' | 'ambiguous'; plant: null };

export type PlantCandidate = {
  scientificName: string;
  scientificNameWithoutAuthor?: string | null;
  commonNames: string[];
  score: number;
  localMatch?: LocalPlantMatch;
};

export type PlantIdentification = {
  bestMatch: string | null;
  candidates: PlantCandidate[];
};
