export type PortfolioConfidence = 'high' | 'medium' | 'low' | 'insufficient';

export type PortfolioFlagSeverity = 'critical' | 'warning' | 'info' | 'pass';

export type PortfolioFlag = {
  id: string;
  severity: PortfolioFlagSeverity;
  title: string;
  detail: string;
  fix: string;
};

export type PortfolioReadiness = 'strong' | 'good' | 'fair' | 'poor';

export type PortfolioAuditResult = {
  confidence: PortfolioConfidence;
  /** False when we refuse to show a headline score */
  canScore: boolean;
  score: number | null;
  readiness: PortfolioReadiness | null;
  summary: string;
  flags: PortfolioFlag[];
  caseStudies: string[];
  stats: {
    wordCount: number;
    caseStudyCount: number;
    processSignals: number;
    metricMentions: number;
    roleClaritySignals: number;
    pageTitle: string | null;
  };
  llmNote: string | null;
};

export type PortfolioJdFit = {
  canAssess: boolean;
  matchScore: number | null;
  aligned: string[];
  gaps: string[];
  summary: string;
};

export type PortfolioExtractResult = {
  ok: boolean;
  url: string;
  pageTitle: string | null;
  text: string;
  wordCount: number;
  confidence: PortfolioConfidence;
  blockedReason: string | null;
};
