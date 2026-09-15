import { recognizeColumn } from '../base44/shared/core/contextualRecognition.ts';

const testCases = [
  "employe_id",
  "roas",
  "produit",
  "stock",
  "campagne",
  "cout_acquisition",
  "ca",
  "panier_moyen"
];

for (const tc of testCases) {
  const res = recognizeColumn({
    columnName: tc,
    sheetName: "test",
    sampleValues: ["a", "b", "c"],
    siblingColumns: []
  });
  console.log(`${tc} -> ${res.canonicalKey} (confidence: ${res.confidence})`);
}

