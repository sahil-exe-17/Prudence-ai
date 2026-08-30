/**
 * PRUDENCE AI — deterministic compliance evaluator.
 *
 * This is the ONLY place in the product where a Pass/Fail verdict is decided.
 * Given the same facts and the same knowledge-base version, it returns byte-for-byte
 * identical results on every device, online or offline, with or without an API key.
 *
 * The AI's job is upstream of this file: it extracts measurements from the
 * drawing. It never authors a verdict. That separation is what makes two
 * machines agree.
 *
 * Determinism rules for anything added here:
 *   - no Math.random, no Date.now, no locale-sensitive formatting
 *   - no iteration over unordered structures without an explicit sort
 *   - no network or environment lookups
 */

import {
  FACT_LABELS,
  FACT_SOURCE_RANK,
  JURISDICTIONS,
  KB_VERSION,
  PACK_LABELS,
  RULES,
  type Fact,
  type FactKey,
  type JurisdictionId,
  type PackId,
  type PlanFacts,
  type RuleContext,
  type Severity,
} from './complianceKnowledgeBase';

export type RuleStatus = 'Pass' | 'Fail' | 'Missing';

export type EvaluatedRule = {
  id: string;
  pack: string;
  packId: PackId;
  title: string;
  clause: string;
  severity: Severity;
  required: string;
  current: string;
  status: RuleStatus;
  calculation: string;
  evidence: string;
  action: string;
  /** Facts this verdict rests on, so a reviewer can audit it. */
  basis: { key: FactKey; label: string; value: string; source: string; evidence: string }[];
};

export type ComplianceSummary = {
  checked: number;
  pass: number;
  fail: number;
  missing: number;
  /** Percentage of *decidable* rules that passed. */
  coverage: number;
  score: number;
  risk: 'Low' | 'Medium' | 'High';
  status: string;
};

export type ComplianceReport = {
  kbVersion: string;
  jurisdiction: string;
  jurisdictionId: JurisdictionId;
  packs: PackId[];
  ruleResults: EvaluatedRule[];
  summary: ComplianceSummary;
  /** Stable fingerprint of (facts + KB + jurisdiction + packs). Two devices showing
   *  the same digest are provably looking at the same evaluation. */
  digest: string;
  factsUsed: number;
  factsMissing: FactKey[];
};

/* ------------------------------------------------------------------ *
 * Fact access
 * ------------------------------------------------------------------ */

function factNumber(facts: PlanFacts, key: FactKey): number | undefined {
  const fact = facts[key];
  if (!fact) return undefined;
  if (typeof fact.value !== 'number') return undefined;
  if (!Number.isFinite(fact.value)) return undefined;
  return fact.value;
}

function factBoolean(facts: PlanFacts, key: FactKey): boolean | undefined {
  const fact = facts[key];
  if (!fact) return undefined;
  if (typeof fact.value === 'boolean') return fact.value;
  if (typeof fact.value === 'number') return fact.value > 0;
  return undefined;
}

function describeFact(fact: Fact): string {
  if (typeof fact.value === 'boolean') return fact.value ? 'disclosed' : 'not disclosed';
  const unit = fact.unit === 'm' ? ' m' : fact.unit === 'm2' ? ' m²' : '';
  return `${fact.value}${unit}`;
}

/**
 * Merges two fact sets, preferring the stronger source. Ties break toward the
 * incoming value, then by higher confidence — never by arrival order, so the
 * result does not depend on which request finished first.
 */
export function mergeFacts(base: PlanFacts, incoming: PlanFacts): PlanFacts {
  const merged: PlanFacts = { ...base };
  const keys = Object.keys(incoming).sort() as FactKey[];
  for (const key of keys) {
    const next = incoming[key];
    if (!next) continue;
    const current = merged[key];
    if (!current) {
      merged[key] = next;
      continue;
    }
    const currentRank = FACT_SOURCE_RANK[current.source];
    const nextRank = FACT_SOURCE_RANK[next.source];
    if (nextRank > currentRank) merged[key] = next;
    else if (nextRank === currentRank && next.confidence > current.confidence) merged[key] = next;
  }
  return merged;
}

/* ------------------------------------------------------------------ *
 * Stable digest (FNV-1a over a canonical serialisation)
 * ------------------------------------------------------------------ */

function canonicalFacts(facts: PlanFacts): string {
  const keys = (Object.keys(facts) as FactKey[]).filter((key) => facts[key]).sort();
  return keys
    .map((key) => {
      const fact = facts[key]!;
      return `${key}=${String(fact.value)}:${fact.unit || ''}:${fact.source}`;
    })
    .join('|');
}

function fnv1a(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICAL: 5,
  MAJOR: 3,
  MINOR: 1,
};

/**
 * Weighted compliance score.
 *
 * Only *decidable* rules move the score. A rule we could not read is reported
 * as Missing and reduces confidence, not the score — otherwise an unreadable
 * scan would look like a non-compliant building, which is the opposite of true.
 */
function computeScore(results: EvaluatedRule[]): number {
  let earned = 0;
  let available = 0;
  for (const rule of results) {
    if (rule.status === 'Missing') continue;
    const weight = SEVERITY_WEIGHT[rule.severity];
    available += weight;
    if (rule.status === 'Pass') earned += weight;
  }
  if (available === 0) return 0;
  return Math.round((earned / available) * 100);
}

function computeRisk(results: EvaluatedRule[]): 'Low' | 'Medium' | 'High' {
  const criticalFails = results.filter((rule) => rule.status === 'Fail' && rule.severity === 'CRITICAL').length;
  const fails = results.filter((rule) => rule.status === 'Fail').length;
  const criticalMissing = results.filter((rule) => rule.status === 'Missing' && rule.severity === 'CRITICAL').length;

  if (criticalFails > 0 || fails >= 4) return 'High';
  if (fails > 0 || criticalMissing > 0) return 'Medium';
  return 'Low';
}

/* ------------------------------------------------------------------ *
 * Evaluation
 * ------------------------------------------------------------------ */

export type EvaluateOptions = {
  jurisdiction: JurisdictionId;
  /** Which packs the user has enabled. Evaluated in a fixed order. */
  packs: PackId[];
};

const PACK_ORDER: PackId[] = ['dcr', 'nbc', 'rera'];

/**
 * Runs the full knowledge base against a set of extracted facts.
 *
 * Pure and total: no I/O, no randomness, no throwing. Two calls with equal
 * arguments produce deeply equal output, which is the property that makes
 * device-to-device agreement verifiable via `report.digest`.
 */
export function evaluateCompliance(facts: PlanFacts, options: EvaluateOptions): ComplianceReport {
  const profile = JURISDICTIONS[options.jurisdiction] || JURISDICTIONS.bbmp;
  // Fixed pack order regardless of how the caller ordered the toggles.
  const packs = PACK_ORDER.filter((pack) => options.packs.includes(pack));

  const context: RuleContext = {
    profile,
    facts,
    num: (key) => factNumber(facts, key),
    bool: (key) => factBoolean(facts, key),
  };

  const applicable = RULES.filter((rule) => packs.includes(rule.pack));
  const results: EvaluatedRule[] = applicable.map((rule) => {
    const outcome = rule.evaluate(context);

    const basis = rule.needs
      .map((key) => {
        const fact = facts[key];
        if (!fact) return null;
        return {
          key,
          label: FACT_LABELS[key],
          value: describeFact(fact),
          source: fact.source,
          evidence: fact.evidence,
        };
      })
      .filter(Boolean) as EvaluatedRule['basis'];

    const evidence = basis.length
      ? basis.map((item) => `${item.label}: ${item.value} — read from ${item.source} ("${item.evidence}")`).join('; ')
      : `No readable value for ${rule.needs.map((key) => FACT_LABELS[key]).join(', ')} in the submitted set.`;

    return {
      id: rule.id,
      pack: PACK_LABELS[rule.pack],
      packId: rule.pack,
      title: rule.title,
      clause: rule.clause,
      severity: rule.severity,
      required: rule.requirement(context),
      current: outcome.current,
      status: outcome.status,
      calculation: outcome.calculation,
      evidence,
      action: outcome.action,
      basis,
    };
  });

  const pass = results.filter((rule) => rule.status === 'Pass').length;
  const fail = results.filter((rule) => rule.status === 'Fail').length;
  const missingCount = results.filter((rule) => rule.status === 'Missing').length;
  const decidable = pass + fail;

  const score = computeScore(results);
  const risk = computeRisk(results);

  const summary: ComplianceSummary = {
    checked: results.length,
    pass,
    fail,
    missing: missingCount,
    coverage: results.length ? Math.round((decidable / results.length) * 100) : 0,
    score,
    risk,
    status:
      fail > 0
        ? 'Non-Compliant — Corrections Required'
        : missingCount > 0
        ? 'Incomplete — Evidence Missing'
        : decidable > 0
        ? 'Compliant on Selected Rules'
        : 'Awaiting Readable Drawing',
  };

  const factsMissing = Array.from(
    new Set(applicable.flatMap((rule) => rule.needs.filter((key) => !facts[key])))
  ).sort();

  const digest = fnv1a(
    [KB_VERSION, profile.id, packs.join(','), canonicalFacts(facts)].join('#')
  );

  return {
    kbVersion: KB_VERSION,
    jurisdiction: profile.label,
    jurisdictionId: profile.id,
    packs,
    ruleResults: results,
    summary,
    digest,
    factsUsed: Object.keys(facts).length,
    factsMissing,
  };
}

/**
 * Derives the violation list the report UI renders, ordered most severe first.
 * Missing evidence is surfaced as its own class rather than folded into
 * failures — "we could not read it" is a different finding from "it breaks the code".
 */
export function violationsFromReport(report: ComplianceReport) {
  const severityRank: Record<Severity, number> = { CRITICAL: 0, MAJOR: 1, MINOR: 2 };
  return report.ruleResults
    .filter((rule) => rule.status === 'Fail' || rule.status === 'Missing')
    .sort((a, b) => {
      // Failures always outrank unread items of the same severity.
      if (a.status !== b.status) return a.status === 'Fail' ? -1 : 1;
      const bySeverity = severityRank[a.severity] - severityRank[b.severity];
      if (bySeverity !== 0) return bySeverity;
      return a.id.localeCompare(b.id);
    })
    .map((rule) => ({
      id: rule.id,
      severity: rule.severity,
      title: rule.status === 'Missing' ? `${rule.title} — not readable` : rule.title,
      required: rule.required,
      found: rule.current,
      delta: rule.calculation,
      clause: rule.clause,
      description: rule.evidence,
      recommendation: rule.action,
      note: rule.calculation,
    }));
}
