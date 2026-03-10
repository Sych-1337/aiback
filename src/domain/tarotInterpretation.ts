import { EnergyScores } from './energyScores';

export class TarotCardExplanation {
  constructor(
    public readonly position: string,
    public readonly name: string,
    public readonly keywords: string[],
    public readonly meaning: string,
    public readonly shadow: string,
  ) {}
}

export class TarotCombinationExplanation {
  constructor(
    public readonly pair: string[],
    public readonly meaning: string,
  ) {}
}

export class TarotInterpretation {
  constructor(
    public readonly overallTitle: string,
    public readonly overallText: string,
    public readonly cards: TarotCardExplanation[],
    public readonly keyCards: string[],
    public readonly combinations: TarotCombinationExplanation[],
    public readonly energy: EnergyScores,
    public readonly adviceDo: string[],
    public readonly adviceAvoid: string[],
    public readonly affirmation: string,
    public readonly followups: string[],
    public readonly confidenceScore: number,
    public readonly confidenceReasons: string[],
    public readonly disclaimer: string,
  ) {}
}
