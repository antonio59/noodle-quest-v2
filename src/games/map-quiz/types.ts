export interface QuizAnswer {
  id: string;
  label: string;
  aliases: string[];
  x: number; // 0-100 percentage across map
  y: number; // 0-100 percentage down map
}

export interface QuizDataset {
  id: string;
  title: string;
  emoji: string;
  description: string;
  mapComponent: React.FC<MapProps>;
  timeLimit: number; // seconds, 0 = untimed practice
  answers: QuizAnswer[];
}

export interface MapProps {
  solvedIds: Set<string>;
  showLabels: boolean;
  showLocations: boolean;
  answers: QuizAnswer[];
}

export interface QuizResult {
  solvedCount: number;
  totalCount: number;
  score: number;
  timeRemaining: number;
  timeExpired: boolean;
  missed: QuizAnswer[];
}
