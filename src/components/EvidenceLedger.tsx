import { AlertTriangle, FilePlus2, Fingerprint, FlaskConical, ScanLine } from 'lucide-react';
import type { ComplianceReport } from '../lib/complianceEngine';
import { FACT_LABELS, type PlanFacts } from '../lib/complianceKnowledgeBase';
import { describeUploadedSheet, sheetsThatWouldHelp } from '../lib/sheetGuidance';

/**
 * Shows how the verdict was reached: which engine ran, what evidence was
 * available, and the digest that lets two assessors confirm they are looking at
 * the same evaluation. This is what makes a disagreement debuggable instead of
 * mysterious.
 */
export function EvidenceLedger({
  report,
  provider,
  notes,
  isSample,
  facts,
  sheetSet = [],
  onAddSheet,
}: {
  report: ComplianceReport;
  provider: string;
  notes: string[];
  isSample: boolean;
  facts: PlanFacts;
  sheetSet?: { name: string; provider: string; factCount: number }[];
  onAddSheet?: () => void;
}) {
  const { summary } = report;
  const wanted = sheetsThatWouldHelp(facts, report.factsMissing);

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#111416] p-3.5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#8c999c]">
          <ScanLine size={12} className="text-[#f26a3d]" />
          Evidence ledger
        </span>
        <span
          className="flex items-center gap-1 font-mono text-[10px] text-[#5f6c70]"
          title="Fingerprint of the evidence + knowledge base. Two devices showing the same digest are provably running the same evaluation."
        >
          <Fingerprint size={11} />
          {report.digest} · KB {report.kbVersion}
        </span>
      </div>

      {isSample && (
        <div className="flex items-start gap-2 rounded-lg border border-[#81b7c2]/40 bg-[#81b7c2]/10 px-2.5 py-2">
          <FlaskConical size={13} className="mt-0.5 shrink-0 text-[#81b7c2]" />
          <p className="font-mono text-[10px] leading-relaxed text-[#81b7c2]">
            Sample dataset — these measurements are illustrative, not a read of a real drawing. The verdicts
            below are still computed by the live rule engine.
          </p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 font-mono text-[10px]">
        {[
          ['Pass', summary.pass, 'text-[#27c93f]'],
          ['Fail', summary.fail, 'text-[#f26a3d]'],
          ['Unread', summary.missing, 'text-[#8c999c]'],
          ['Score', summary.score, 'text-[#f4f0e8]'],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="rounded-lg border border-white/5 bg-[#08090a] px-2 py-1.5">
            <div className="text-[#5f6c70] uppercase tracking-wide">{label}</div>
            <div className={`text-base font-extrabold ${tone}`}>{value}</div>
          </div>
        ))}
      </div>

      <p className="font-mono text-[10px] leading-relaxed text-[#8c999c]">
        Evidence read by <span className="text-[#81b7c2] font-bold">{provider}</span>. Verdicts computed
        locally by the deterministic rule engine — the same evidence always yields the same result.
      </p>

      {report.factsMissing.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#8c999c]">
            <AlertTriangle size={11} className="text-[#f26a3d]" />
            Not readable on this drawing ({report.factsMissing.length})
          </span>
          <div className="flex flex-wrap gap-1">
            {report.factsMissing.map((key) => (
              <span
                key={key}
                className="rounded border border-white/10 bg-[#08090a] px-1.5 py-0.5 font-mono text-[9px] text-[#5f6c70]"
              >
                {FACT_LABELS[key]}
              </span>
            ))}
          </div>
          <p className="font-mono text-[9px] leading-relaxed text-[#5f6c70]">
            These checks are reported as unread rather than guessed.
          </p>
        </div>
      )}

      {/* Which sheet would close the gap. A floor plan simply does not carry
          setbacks or areas, and saying so beats 21 unexplained chips. */}
      {wanted.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-[#81b7c2]/35 bg-[#08090a] p-2.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#81b7c2]">
            Add these sheets to decide the rest
          </span>

          <p className="font-mono text-[9px] leading-relaxed text-[#8c999c]">
            Read so far: <span className="font-bold text-[#f4f0e8]">{describeUploadedSheet(facts)}</span>. A
            drawing set spreads its data across sheets — the checks below have no evidence on what was
            uploaded.
          </p>

          <ul className="flex flex-col gap-1.5">
            {wanted.map((sheet) => (
              <li key={sheet.kind} className="font-mono text-[9px] leading-relaxed">
                <span className="font-bold text-[#f26a3d]">{sheet.label}</span>
                <span className="text-[#5f6c70]"> — {sheet.provides}</span>
                <span className="block text-[#5f6c70]">
                  unlocks {sheet.missing.length} check{sheet.missing.length === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>

          {onAddSheet && (
            <button
              type="button"
              onClick={onAddSheet}
              className="flex items-center justify-center gap-1.5 rounded-md border border-[#81b7c2] px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#81b7c2] transition hover:bg-[#81b7c2]/15"
            >
              <FilePlus2 size={11} />
              Add another sheet
            </button>
          )}
        </div>
      )}

      {sheetSet.length > 1 && (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#8c999c]">
            Sheets in this audit ({sheetSet.length})
          </span>
          {sheetSet.map((sheet) => (
            <p key={sheet.name} className="font-mono text-[9px] text-[#5f6c70]">
              › <span className="text-[#f4f0e8]">{sheet.name}</span> — {sheet.factCount} measurement
              {sheet.factCount === 1 ? '' : 's'} via {sheet.provider}
            </p>
          ))}
        </div>
      )}

      {notes.map((note, index) => (
        <p key={index} className="font-mono text-[9px] leading-relaxed text-[#5f6c70]">
          › {note}
        </p>
      ))}
    </div>
  );
}
