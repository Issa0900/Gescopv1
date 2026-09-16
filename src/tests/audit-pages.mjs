/**
 * Audit rapide de toutes les pages JSX
 * Détecte les problèmes courants qui causent des pages blanches
 */
import fs from 'fs';
import path from 'path';

const pagesDir = path.resolve('src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

let allGood = true;

for (const file of files) {
  const content = fs.readFileSync(path.join(pagesDir, file), 'utf8');
  const issues = [];
  
  // Vérifie export default
  if (!content.includes('export default')) issues.push('❌ Pas d\'export default');
  
  // Vérifie les imports qui utilisent .jsx explicitement (cause erreur)
  const badImports = content.match(/from ['"][^'"]+\.jsx['"]/g);
  if (badImports) issues.push(`⚠️ Import .jsx explicite: ${badImports[0]}`);
  
  // Vérifie les crash patterns connus
  if (content.includes('allExpenses')) issues.push('❌ Variable allExpenses non définie');
  if (content.includes('.filter(t => t.type === "income")')) issues.push('⚠️ Filtre type brut (contourner avec isIncome)');
  if (content.includes('.filter(t => t.type === "expense")')) issues.push('⚠️ Filtre type brut (contourner avec isExpense)');
  if (content.includes('.filter((t) => t.type === "income")')) issues.push('⚠️ Filtre type brut (contourner avec isIncome)');
  if (content.includes('.filter((t) => t.type === "expense")')) issues.push('⚠️ Filtre type brut (contourner avec isExpense)');
  
  // Vérifie imports manquants courants
  const usesUseQuery = content.includes('useQuery');
  const importsUseQuery = content.includes('from "@tanstack/react-query"') || content.includes("from '@tanstack/react-query'");
  if (usesUseQuery && !importsUseQuery) issues.push('❌ useQuery utilisé sans import');
  
  const usesLink = content.includes('<Link ') || content.includes('<Link>');
  const importsLink = content.includes("from 'react-router-dom'") || content.includes('from "react-router-dom"');
  if (usesLink && !importsLink) issues.push('❌ <Link> utilisé sans import react-router-dom');
  
  // Résultat
  if (issues.length > 0) {
    console.log(`\n📄 ${file}:`);
    issues.forEach(i => console.log(`   ${i}`));
    allGood = false;
  } else {
    console.log(`  ✅ ${file}`);
  }
}

console.log('\n' + '─'.repeat(50));
if (allGood) {
  console.log('🎉 Tous les modules sont OK!');
} else {
  console.log('⚠️  Des problèmes ont été détectés (voir ci-dessus)');
  process.exit(1);
}

