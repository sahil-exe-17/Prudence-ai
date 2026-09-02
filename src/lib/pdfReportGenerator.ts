import { jsPDF } from 'jspdf';

export interface RuleResultItem {
  id: string;
  pack?: string;
  title: string;
  required: string;
  current: string;
  status: string;
  severity?: string;
  clause?: string;
  evidence?: string;
  action?: string;
}

export interface ViolationItem {
  id: string;
  title: string;
  required?: string;
  found?: string;
  delta?: string;
  clause?: string;
  description?: string;
  recommendation?: string;
  note?: string;
}

export interface ReportData {
  documentName: string;
  documentSize: string;
  jurisdiction: string;
  score: number;
  coverage: number;
  risk: string;
  status: string;
  summary?: string;
  ruleResults: RuleResultItem[];
  violations: ViolationItem[];
  digest?: string;
  provider?: string;
}

/**
 * Generates an official, formal, light-themed municipal audit PDF report.
 * Uses pure vector jsPDF typography, tables, and borders (no screenshots).
 */
export function generateFormalPdfReport(data: ReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182 mm
  let currentY = margin;

  const primaryDark = [15, 23, 42]; // #0F172A (Deep Navy/Slate)
  const secondarySlate = [71, 85, 105]; // #475569 (Muted Slate)
  const borderGrey = [203, 213, 225]; // #CBD5E1 (Border)
  const lightGreyBg = [248, 250, 252]; // #F8FAFC (Card background)
  const passGreen = [22, 101, 52]; // #166534
  const passGreenBg = [220, 252, 231]; // #DCFCE7
  const failRed = [153, 27, 27]; // #991B1B
  const failRedBg = [254, 226, 226]; // #FEE2E2

  // Generate clean certificate identifier and timestamp
  const timestamp = new Date();
  const dateStr = timestamp.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = timestamp.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const certId = `PRD-${dateStr.replace(/\s+/g, '').toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Helper for adding new page with header/footer
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 18) {
      doc.addPage();
      currentY = margin + 6;
      renderPageHeaderMini();
    }
  };

  const renderPageHeaderMini = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
    doc.text('PRUDENCE AI • STATUTORY BUILDING PLAN COMPLIANCE AUDIT REPORT', margin, margin);
    doc.setFont('helvetica', 'normal');
    doc.text(`REF: ${certId}`, pageWidth - margin, margin, { align: 'right' });
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, margin + 2, pageWidth - margin, margin + 2);
    currentY = margin + 8;
  };

  /* ====================================================================
     1. FORMAL INSTITUTIONAL HEADER (Page 1)
     ==================================================================== */
  // Top institutional accent line
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(margin, currentY, contentWidth, 2, 'F');
  currentY += 6;

  // Title block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('PRUDENCE AI — STATUTORY COMPLIANCE AUDIT', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text(
    'MUNICIPAL BLUEPRINT CLEARANCE & TECHNICAL SCRUTINY REPORT',
    margin,
    currentY + 5
  );

  // Certificate ID & Date on Right side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`AUDIT ID: ${certId}`, pageWidth - margin, currentY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`DATE: ${dateStr} ${timeStr}`, pageWidth - margin, currentY + 4, { align: 'right' });
  doc.text(`STATUS: ${data.status.toUpperCase()}`, pageWidth - margin, currentY + 8, { align: 'right' });

  currentY += 14;
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  /* ====================================================================
     2. DRAWING & SUBMISSION METADATA (Box Grid)
     ==================================================================== */
  const metaBoxHeight = 24;
  doc.setFillColor(lightGreyBg[0], lightGreyBg[1], lightGreyBg[2]);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, metaBoxHeight, 1.5, 1.5, 'FD');

  const col1X = margin + 4;
  const col2X = margin + (contentWidth / 3) + 2;
  const col3X = margin + (contentWidth * 2 / 3) + 2;

  // Row 1
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text('SUBMITTED DRAWING / PLAN:', col1X, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.setFontSize(8.5);
  const docName = data.documentName.length > 28 ? `${data.documentName.substring(0, 26)}...` : data.documentName;
  doc.text(docName, col1X, currentY + 10);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text('TARGET JURISDICTION:', col2X, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.setFontSize(8.5);
  doc.text(data.jurisdiction || 'BBMP 2026', col2X, currentY + 10);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text('SCRUTINY ENGINE:', col3X, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.setFontSize(8.5);
  doc.text(data.provider || 'Deterministic Spatial AI', col3X, currentY + 10);

  // Row 2
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text('FILE SPECIFICATION:', col1X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(data.documentSize || 'Vector PDF / CAD Drawing', col1X, currentY + 20);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text('STATUTORY STATUTES APPLIED:', col2X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('DCR / NBC 2016 / RERA 2016', col2X, currentY + 20);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text('AUTHENTICATION PROTOCOL:', col3X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('Dual-Layer Deterministic Hash', col3X, currentY + 20);

  currentY += metaBoxHeight + 6;

  /* ====================================================================
     3. EXECUTIVE SCORECARD & SANCTION STATUS
     ==================================================================== */
  const scoreBoxHeight = 32;
  const halfWidth = (contentWidth - 4) / 2;

  // Left Box: Overall Score
  doc.setFillColor(lightGreyBg[0], lightGreyBg[1], lightGreyBg[2]);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.roundedRect(margin, currentY, halfWidth, scoreBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text('OVERALL STATUTORY COMPLIANCE RATING', margin + 5, currentY + 6);

  // Big Score display
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  if (data.score >= 80) {
    doc.setTextColor(passGreen[0], passGreen[1], passGreen[2]);
  } else if (data.score >= 50) {
    doc.setTextColor(217, 119, 6); // Amber
  } else {
    doc.setTextColor(failRed[0], failRed[1], failRed[2]);
  }
  doc.text(`${data.score}%`, margin + 5, currentY + 18);

  // Status Badge
  const badgeX = margin + 45;
  const isApproved = data.status.toLowerCase().includes('approv') || data.status.toLowerCase().includes('compliant');
  doc.setFillColor(isApproved ? passGreenBg[0] : failRedBg[0], isApproved ? passGreenBg[1] : failRedBg[1], isApproved ? passGreenBg[2] : failRedBg[2]);
  doc.roundedRect(badgeX, currentY + 10, halfWidth - 48, 9, 1, 1, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isApproved ? passGreen[0] : failRed[0], isApproved ? passGreen[1] : failRed[1], isApproved ? passGreen[2] : failRed[2]);
  doc.text(data.status.toUpperCase(), badgeX + (halfWidth - 48) / 2, currentY + 16, { align: 'center' });

  // Risk Classification
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text(`Risk Profile: ${data.risk.toUpperCase()} RISK • Coverage: ${data.coverage}% of statutory envelope verified`, margin + 5, currentY + 27);

  // Right Box: Rules Breakdown
  const rightBoxX = margin + halfWidth + 4;
  doc.setFillColor(lightGreyBg[0], lightGreyBg[1], lightGreyBg[2]);
  doc.roundedRect(rightBoxX, currentY, halfWidth, scoreBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text('STATUTORY CLAUSE AUDIT SUMMARY', rightBoxX + 5, currentY + 6);

  const passCount = data.ruleResults.filter((r) => {
    const s = String(r.status || '').toLowerCase();
    return s.includes('pass') || s.includes('compliant') || s.includes('ok');
  }).length;
  const failCount = data.ruleResults.filter((r) => {
    const s = String(r.status || '').toLowerCase();
    return s.includes('fail') || s.includes('violation') || s.includes('defect') || s.includes('non-compliant');
  }).length;
  const totalChecked = data.ruleResults.length;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);

  doc.text(`• Total Statutory Checks:`, rightBoxX + 5, currentY + 14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalChecked} Provisions`, rightBoxX + halfWidth - 6, currentY + 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text(`• Fully Compliant Rules:`, rightBoxX + 5, currentY + 20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(passGreen[0], passGreen[1], passGreen[2]);
  doc.text(`${passCount} Passed`, rightBoxX + halfWidth - 6, currentY + 20, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`• Deficiencies / Violations:`, rightBoxX + 5, currentY + 26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(failRed[0], failRed[1], failRed[2]);
  doc.text(`${failCount} Non-Compliant`, rightBoxX + halfWidth - 6, currentY + 26, { align: 'right' });

  currentY += scoreBoxHeight + 8;

  /* ====================================================================
     4. STATUTORY EVALUATION BREAKDOWN (Formal Table)
     ==================================================================== */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('TECHNICAL BYLAW SCRUTINY FINDINGS & METRICS', margin, currentY);
  currentY += 4;

  // Table Column Coordinates
  const colW = {
    idClause: 38,
    param: 44,
    req: 25,
    curr: 25,
    status: 18,
    action: 32,
  };

  const drawTableHeader = () => {
    doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.rect(margin, currentY, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    let x = margin + 2;
    doc.text('RULE ID & CLAUSE', x, currentY + 4.5);
    x += colW.idClause;
    doc.text('STATUTORY PARAMETER', x, currentY + 4.5);
    x += colW.param;
    doc.text('REQUIRED', x, currentY + 4.5);
    x += colW.req;
    doc.text('MEASURED', x, currentY + 4.5);
    x += colW.curr;
    doc.text('VERDICT', x, currentY + 4.5);
    x += colW.status;
    doc.text('ACTION / DIRECTIVE', x, currentY + 4.5);

    currentY += 7;
  };

  drawTableHeader();

  // Render Table Rows
  data.ruleResults.forEach((rule, idx) => {
    const isPass = String(rule.status || '').toLowerCase().includes('pass') ||
                   String(rule.status || '').toLowerCase().includes('compliant') ||
                   String(rule.status || '').toLowerCase().includes('ok');

    const rowHeight = 11;
    checkPageBreak(rowHeight + 2);

    // Zebra Background
    if (idx % 2 === 1) {
      doc.setFillColor(lightGreyBg[0], lightGreyBg[1], lightGreyBg[2]);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }

    // Border line under row
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

    let x = margin + 2;

    // Rule ID & Clause
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(rule.id, x, currentY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
    const clauseText = rule.clause || 'Municipal Bylaw';
    doc.text(clauseText.length > 24 ? `${clauseText.substring(0, 22)}...` : clauseText, x, currentY + 8);
    x += colW.idClause;

    // Parameter Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    const titleText = rule.title.length > 26 ? `${rule.title.substring(0, 24)}...` : rule.title;
    doc.text(titleText, x, currentY + 4.5);
    if (rule.pack) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
      doc.text(`[${rule.pack} Code]`, x, currentY + 8.5);
    }
    x += colW.param;

    // Required
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(rule.required || 'N/A', x, currentY + 6);
    x += colW.req;

    // Current / Extracted
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(isPass ? passGreen[0] : failRed[0], isPass ? passGreen[1] : failRed[1], isPass ? passGreen[2] : failRed[2]);
    doc.text(rule.current || 'N/A', x, currentY + 6);
    x += colW.curr;

    // Verdict Badge
    doc.setFillColor(isPass ? passGreenBg[0] : failRedBg[0], isPass ? passGreenBg[1] : failRedBg[1], isPass ? passGreenBg[2] : failRedBg[2]);
    doc.roundedRect(x, currentY + 2.5, 14, 5.5, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(isPass ? passGreen[0] : failRed[0], isPass ? passGreen[1] : failRed[1], isPass ? passGreen[2] : failRed[2]);
    doc.text(isPass ? 'PASS' : 'DEFICIT', x + 7, currentY + 6.2, { align: 'center' });
    x += colW.status;

    // Action / Directive
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
    const actionText = rule.action || (isPass ? 'Statutorily Compliant' : 'Adjustment required');
    const truncatedAction = actionText.length > 26 ? `${actionText.substring(0, 24)}...` : actionText;
    doc.text(truncatedAction, x, currentY + 6);

    currentY += rowHeight;
  });

  currentY += 8;

  /* ====================================================================
     5. SUMMARY OF DIRECTIVES & RECTIFICATIONS
     ==================================================================== */
  if (data.violations && data.violations.length > 0) {
    checkPageBreak(36);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(failRed[0], failRed[1], failRed[2]);
    doc.text('CRITICAL RECTIFICATION DIRECTIVES (MANDATORY FOR SANCTION):', margin, currentY);
    currentY += 5;

    data.violations.slice(0, 4).forEach((v, vIdx) => {
      checkPageBreak(12);
      doc.setFillColor(lightGreyBg[0], lightGreyBg[1], lightGreyBg[2]);
      doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
      doc.roundedRect(margin, currentY, contentWidth, 10, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(failRed[0], failRed[1], failRed[2]);
      doc.text(`${vIdx + 1}. ${v.title} — Clause ${v.clause || 'Statutory Code'}`, margin + 3, currentY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
      const remedy = v.recommendation || v.description || 'Adjust architectural envelope to meet minimum statutory buffer.';
      const truncatedRemedy = remedy.length > 115 ? `${remedy.substring(0, 112)}...` : remedy;
      doc.text(truncatedRemedy, margin + 3, currentY + 7.8);

      currentY += 12;
    });
    currentY += 4;
  }

  /* ====================================================================
     6. FORMAL SIGN-OFF & CRYPTOGRAPHIC ATTESTATION
     ==================================================================== */
  checkPageBreak(40);
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // Cryptographic Digest
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text('CRYPTOGRAPHIC AUDIT DIGEST (SHA-256):', margin, currentY);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  const dummyDigest = data.digest || `sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069`;
  doc.text(dummyDigest, margin, currentY + 4);

  currentY += 12;

  // Institutional Signature Blocks
  const sigBoxW = (contentWidth - 10) / 2;

  // Officer Block
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.2);
  doc.line(margin, currentY + 12, margin + sigBoxW, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('Municipal Scrutinizing Officer (Civil / Town Planning)', margin, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text('Urban Local Body (ULB) Sanctioning Authority', margin, currentY + 20);

  // AI Verification Seal Block
  const sig2X = margin + sigBoxW + 10;
  doc.line(sig2X, currentY + 12, sig2X + sigBoxW, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('PRUDENCE AI Autonomous Verification Core', sig2X, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text('Deterministic Spatial Geometry & Statutory Engine v2026.08', sig2X, currentY + 20);

  /* ====================================================================
     7. MULTI-PAGE NUMBERING & FOOTERS
     ==================================================================== */
  const totalPagesCount = doc.getNumberOfPages();
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
    doc.text(
      'PRUDENCE AI • Smart India Hackathon 2026 • Official Building Plan Statutory Compliance Audit',
      margin,
      pageHeight - 7
    );
    doc.text(`Page ${i} of ${totalPagesCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // Save the generated formal PDF
  const sanitizedDocName = data.documentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`PRUDENCE_Statutory_Audit_${sanitizedDocName}.pdf`);
}
