/**
 * Determinism + correctness harness for the compliance engine.
 *
 * Run with:  node scripts/verify-determinism.mjs
 *
 * This exists because the product previously returned different Pass/Fail
 * counts for the same drawing on different machines. These checks fail loudly
 * if that class of bug is ever reintroduced.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outDir = mkdtempSync(join(tmpdir(), 'prudence-verify-'));

// The engine is TypeScript; compile the three source files to plain ESM first.
execFileSync(
  process.execPath,
  [
    join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    join(root, 'src', 'lib', 'complianceEngine.ts'),
    join(root, 'src', 'lib', 'complianceKnowledgeBase.ts'),
    join(root, 'src', 'lib', 'factExtraction.ts'),
    join(root, 'src', 'lib', 'planModel.ts'),
    '--outDir', outDir,
    '--module', 'esnext',
    '--target', 'es2022',
    '--moduleResolution', 'bundler',
    '--skipLibCheck',
  ],
  { stdio: 'inherit' }
);

// Emitted files use extensionless relative imports; Node needs explicit ones.
const { readdirSync, readFileSync } = await import('node:fs');
for (const name of readdirSync(outDir)) {
  if (!name.endsWith('.js')) continue;
  const file = join(outDir, name);
  writeFileSync(file, readFileSync(file, 'utf8').replace(/from '(\.\/[^']+)'/g, "from '$1.js'"));
}

const engine = await import(pathToFileURL(join(outDir, 'complianceEngine.js')).href);
const facts = await import(pathToFileURL(join(outDir, 'factExtraction.js')).href);
const kb = await import(pathToFileURL(join(outDir, 'complianceKnowledgeBase.js')).href);

let failures = 0;
const check = (name, condition, detail = '') => {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const ALL_PACKS = ['dcr', 'nbc', 'rera'];

/* ---------------------------------------------------------------- */
console.log('\n1. Same facts produce identical reports');

const sampleSheet = `
  AREA STATEMENT
  PLOT AREA 1200.00 SQ.M
  TOTAL BUILT UP AREA 3360.00 SQ.M
  GROUND COVERAGE AREA 560.00 SQ.M
  BUILDING HEIGHT 18.60 M
  FRONT SETBACK 6.00 M
  REAR SETBACK 2.40 M
  LEFT SIDE SETBACK 3.00 M
  RIGHT SIDE SETBACK 3.00 M
  EXISTING ROAD WIDTH 12.00 M
  STAIR WIDTH 0.90 M
  CORRIDOR WIDTH 1.20 M
  BASEMENT RAMP SLOPE 1:6
  PLINTH HEIGHT 600 MM
  RERA REGISTRATION NO. PRM/KA/RERA/1251/446
`;

const extracted = facts.factsFromText(sampleSheet);
const optionsA = { jurisdiction: 'bbmp', packs: ['dcr', 'nbc', 'rera'] };
// Same packs, different order — must not change anything.
const optionsB = { jurisdiction: 'bbmp', packs: ['rera', 'nbc', 'dcr'] };

const reportA = engine.evaluateCompliance(extracted, optionsA);
const reportB = engine.evaluateCompliance(extracted, optionsB);

check('two runs give the same digest', reportA.digest === reportB.digest, `${reportA.digest} vs ${reportB.digest}`);
check(
  'two runs give byte-identical results',
  JSON.stringify(reportA) === JSON.stringify(reportB),
  'serialised reports differ'
);
check(
  'pack ordering does not change counts',
  reportA.summary.pass === reportB.summary.pass && reportA.summary.fail === reportB.summary.fail
);

// 200 repeats, to catch anything order- or hash-dependent.
let stable = true;
for (let i = 0; i < 200; i += 1) {
  if (engine.evaluateCompliance(extracted, optionsA).digest !== reportA.digest) stable = false;
}
check('200 repeat evaluations are stable', stable);

/* ---------------------------------------------------------------- */
console.log('\n2. Text extraction is deterministic and unit-aware');

const repeat = facts.factsFromText(sampleSheet);
check(
  'same text yields same facts',
  JSON.stringify(extracted) === JSON.stringify(repeat)
);
check(
  'plinth 600 MM converts to 0.6 m',
  extracted.plinthHeight?.value === 0.6,
  `got ${extracted.plinthHeight?.value}`
);
check(
  'ramp 1:6 parses to run 6',
  extracted.rampSlopeRun?.value === 6,
  `got ${extracted.rampSlopeRun?.value}`
);
check(
  '"LEFT SIDE SETBACK" is not misread as the generic side setback',
  extracted.sideSetbackLeft?.value === 3 && extracted.sideSetbackRight?.value === 3
);
check(
  'unlabelled numbers are not adopted',
  facts.factsFromText('3.00  6.00  12.00').frontSetback === undefined
);

/* ---------------------------------------------------------------- */
console.log('\n3. Verdicts are arithmetically correct');

const byId = Object.fromEntries(reportA.ruleResults.map((rule) => [rule.id, rule]));

// FSI = 3360 / 1200 = 2.80 > 2.50 permitted under BBMP -> Fail
check('FSI 2.80 vs 2.50 limit fails', byId['DCR-FSI'].status === 'Fail', byId['DCR-FSI'].calculation);
// Coverage = 560 / 1200 = 46.67% <= 60% under BBMP -> Pass
check('coverage 46.67% under 60% passes', byId['DCR-COVERAGE'].status === 'Pass', byId['DCR-COVERAGE'].calculation);
// Rear required = max(3, 3 + 0.3*(18.6-10)) = 5.58; provided 2.40 -> Fail
check('rear setback 2.40 vs required 5.58 fails', byId['DCR-SETBACK-REAR'].status === 'Fail');
check(
  'rear setback formula shows 5.58 m',
  byId['DCR-SETBACK-REAR'].calculation.includes('5.58'),
  byId['DCR-SETBACK-REAR'].calculation
);
// Front 6.00 >= 6.00 -> Pass (boundary condition)
check('front setback exactly at the limit passes', byId['DCR-SETBACK-FRONT'].status === 'Pass');
// Stair 0.90 < 1.20 -> Fail
check('stair width 0.90 fails 1.20 minimum', byId['NBC-STAIR-WIDTH'].status === 'Fail');
// Height 18.60 <= 24.00 -> Pass
check('height 18.60 under 24.00 passes', byId['NBC-HEIGHT-MAX'].status === 'Pass');
// Road: height 18.6 is not > 32, so base 6.0 applies; 12.0 >= 6.0 -> Pass
check('road width 12.00 passes for an 18.60 m building', byId['DCR-ROAD-WIDTH'].status === 'Pass');

/* ---------------------------------------------------------------- */
console.log('\n4. Absent evidence yields Missing, never a guess');

const empty = engine.evaluateCompliance({}, optionsA);
check('no facts means zero passes', empty.summary.pass === 0, `got ${empty.summary.pass}`);
check('no facts means zero failures', empty.summary.fail === 0, `got ${empty.summary.fail}`);
check('no facts means everything is Missing', empty.summary.missing === empty.summary.checked);
check('no facts means 0% coverage', empty.summary.coverage === 0);
check(
  'unreadable drawing is reported as incomplete, not as non-compliant',
  empty.summary.status === 'Incomplete — Evidence Missing',
  empty.summary.status
);
check(
  'unreadable drawing does not score 0 as if it had failed',
  empty.summary.score === 0 && empty.summary.risk !== 'High',
  `score ${empty.summary.score}, risk ${empty.summary.risk}`
);

/* ---------------------------------------------------------------- */
console.log('\n5. Jurisdiction changes the verdict, as it should');

const mumbai = engine.evaluateCompliance(extracted, { jurisdiction: 'mcgm', packs: ALL_PACKS });
const mumbaiById = Object.fromEntries(mumbai.ruleResults.map((rule) => [rule.id, rule]));
// FSI 2.80 <= 3.00 under DCPR 2034 -> Pass (fails under BBMP's 2.50)
check('FSI 2.80 passes under DCPR 2034 but fails under BBMP', mumbaiById['DCR-FSI'].status === 'Pass');
// Coverage 46.67% > 45% under DCPR 2034 -> Fail (passes under BBMP's 60%)
check('coverage 46.67% fails under DCPR 2034 but passes under BBMP', mumbaiById['DCR-COVERAGE'].status === 'Fail');
check('different jurisdiction gives a different digest', mumbai.digest !== reportA.digest);

/* ---------------------------------------------------------------- */
console.log('\n6. Score reflects severity and ignores unreadable rules');

const allPass = {
  frontSetback: { value: 6, unit: 'm', source: 'text', confidence: 1, evidence: 'x' },
};
const onePassReport = engine.evaluateCompliance(allPass, { jurisdiction: 'bbmp', packs: ['dcr'] });
check(
  'a single readable passing rule scores 100',
  onePassReport.summary.score === 100,
  `got ${onePassReport.summary.score}`
);
check(
  'unreadable rules are still reported',
  onePassReport.summary.missing > 0
);

/* ---------------------------------------------------------------- */
console.log('\n7. Fact merging prefers the stronger source regardless of order');

const textFact = { frontSetback: { value: 3, unit: 'm', source: 'text', confidence: 0.9, evidence: 't' } };
const visionFact = { frontSetback: { value: 6, unit: 'm', source: 'vision', confidence: 0.5, evidence: 'v' } };
check(
  'vision beats text even with lower confidence',
  engine.mergeFacts(textFact, visionFact).frontSetback.value === 6
);
check(
  'merge order does not matter',
  engine.mergeFacts(visionFact, textFact).frontSetback.value === 6
);

/* ---------------------------------------------------------------- */
console.log('\n8. Vision output is validated, not trusted');

check(
  'out-of-range measurements are rejected',
  facts.factsFromVision({ frontSetback: { value: 9999, evidence: 'x' } }).frontSetback === undefined
);
check(
  'measurements without evidence are rejected',
  facts.factsFromVision({ frontSetback: { value: 5 } }).frontSetback === undefined
);
check(
  'unknown keys are ignored',
  Object.keys(facts.factsFromVision({ notARealFact: { value: 1, evidence: 'x' } })).length === 0
);
check(
  'a valid measurement with evidence is accepted',
  facts.factsFromVision({ frontSetback: { value: 5, evidence: 'FRONT SETBACK 5.00 M' } }).frontSetback?.value === 5
);

/* ---------------------------------------------------------------- */
rmSync(outDir, { recursive: true, force: true });

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
console.log(`KB version ${kb.KB_VERSION} · ${kb.RULES.length} rules · digest ${reportA.digest}`);
console.log(
  `Sample sheet verdict: ${reportA.summary.pass} pass / ${reportA.summary.fail} fail / ${reportA.summary.missing} missing · score ${reportA.summary.score} · risk ${reportA.summary.risk}`
);
process.exit(failures === 0 ? 0 : 1);
