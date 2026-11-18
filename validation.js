const REQUIRED = [
  "respondent_id",
  "segment",
  "real_preference_score",
  "predicted_preference_score",
  "real_purchase_intent",
  "predicted_purchase_intent"
];

function parseCSV(text) {
  // Supports quoted fields and escaped quotes; sufficient for this prototype.
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const numerator = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const dx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const dy = ys.reduce((s, y) => s + (y - my) ** 2, 0);
  if (dx === 0 || dy === 0) return null;
  return Number((numerator / Math.sqrt(dx * dy)).toFixed(4));
}

export function calculateValidationMetrics(csv) {
  const rows = parseCSV(csv);
  if (rows.length < 2) throw new Error("CSV must contain a header and at least one data row.");
  const headers = rows[0].map((h) => h.trim());
  const missing = REQUIRED.filter((name) => !headers.includes(name));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);

  const idx = Object.fromEntries(REQUIRED.map((name) => [name, headers.indexOf(name)]));
  const records = rows.slice(1).map((row, i) => {
    const get = (key) => String(row[idx[key]] ?? "").trim();
    const record = {
      respondent_id: get("respondent_id"),
      segment: get("segment"),
      real_preference_score: Number(get("real_preference_score")),
      predicted_preference_score: Number(get("predicted_preference_score")),
      real_purchase_intent: Number(get("real_purchase_intent")),
      predicted_purchase_intent: Number(get("predicted_purchase_intent"))
    };
    if (!record.respondent_id || !record.segment) throw new Error(`Row ${i + 2}: respondent_id and segment are required.`);
    for (const key of ["real_preference_score", "predicted_preference_score"]) {
      if (!Number.isFinite(record[key]) || record[key] < 1 || record[key] > 5) {
        throw new Error(`Row ${i + 2}: ${key} must be a number from 1 to 5.`);
      }
    }
    for (const key of ["real_purchase_intent", "predicted_purchase_intent"]) {
      if (![0, 1].includes(record[key])) throw new Error(`Row ${i + 2}: ${key} must be 0 or 1.`);
    }
    return record;
  });

  const errors = records.map((r) => r.predicted_preference_score - r.real_preference_score);
  const mae = errors.reduce((s, e) => s + Math.abs(e), 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length);
  const intentCorrect = records.filter((r) => r.predicted_purchase_intent === r.real_purchase_intent).length;
  const segments = [...new Set(records.map((r) => r.segment))].map((segment) => {
    const subset = records.filter((r) => r.segment === segment);
    const meanError = subset.reduce((sum, r) => sum + r.predicted_preference_score - r.real_preference_score, 0) / subset.length;
    return { segment, n: subset.length, meanPredictionError: Number(meanError.toFixed(4)) };
  });

  return {
    label: "PAIRED DATA VALIDATION SUMMARY — NOT A CERTIFICATION",
    n: records.length,
    metrics: {
      mae: Number(mae.toFixed(4)),
      rmse: Number(rmse.toFixed(4)),
      pearsonCorrelation: pearson(records.map((r) => r.real_preference_score), records.map((r) => r.predicted_preference_score)),
      purchaseIntentAccuracy: Number((intentCorrect / records.length).toFixed(4))
    },
    segmentDiagnostics: segments,
    interpretation: [
      "MAE/RMSE closer to 0 indicate smaller score errors on this dataset.",
      "Correlation measures association, not agreement; inspect errors as well.",
      "Segment mean prediction error can reveal systematic over- or under-prediction, but small groups are unstable.",
      "These metrics do not establish generalization. Report sampling, missing data, uncertainty intervals, and external test performance."
    ],
    limitations: [
      "Metrics are meaningful only if predictions and real observations are paired and use matching products, units, scales and time frames.",
      "No confidence intervals, significance tests, demographic-fidelity tests or causal claims are calculated here.",
      "Do not upload direct identifiers or sensitive personal data."
    ]
  };
}
