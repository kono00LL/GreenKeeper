export type PlantCandidate = {
  scientificName: string;
  commonNames: string[];
  score: number;
};

export type PlantIdentification = {
  bestMatch: string | null;
  candidates: PlantCandidate[];
};
