#!/usr/bin/env node

/**
 * Test de compatibilité Vercel (testeur capricieux)
 * Vérifie que le projet Next.js est compatible avec Vercel
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 TEST DE COMPATIBILITÉ VERCEL (Version Stricte)\n');
console.log('='.repeat(60));

let errors = 0;
let warnings = 0;
let passed = 0;

// Test 1: Structure du projet
console.log('\n📁 Test 1: Structure du projet');
const requiredFiles = [
  'package.json',
  'next.config.js',
  'tsconfig.json',
  '.gitignore',
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✓ ${file} présent`);
    passed++;
  } else {
    console.error(`  ❌ ${file} MANQUANT`);
    errors++;
  }
});

// Test 2: package.json
console.log('\n📦 Test 2: package.json (critique)');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Vérifier Next.js
  if (pkg.dependencies?.next) {
    const nextVersion = pkg.dependencies.next.replace(/[\^~]/, '');
    console.log(`  ✓ Next.js ${nextVersion} installé`);
    passed++;
  } else {
    console.error('  ❌ Next.js NON INSTALLÉ');
    errors++;
  }
  
  // Vérifier les scripts
  const requiredScripts = ['dev', 'build', 'start'];
  requiredScripts.forEach(script => {
    if (pkg.scripts?.[script]) {
      console.log(`  ✓ Script "${script}" configuré`);
      passed++;
    } else {
      console.error(`  ❌ Script "${script}" MANQUANT`);
      errors++;
    }
  });
  
  // Vérifier les dépendances critiques
  const criticalDeps = ['react', 'react-dom'];
  criticalDeps.forEach(dep => {
    if (pkg.dependencies?.[dep]) {
      console.log(`  ✓ ${dep} installé`);
      passed++;
    } else {
      console.error(`  ❌ ${dep} MANQUANT`);
      errors++;
    }
  });
  
} catch (e) {
  console.error('  ❌ package.json INVALIDE ou ILLISIBLE');
  errors++;
}

// Test 3: API Routes (le plus capricieux)
console.log('\n🔌 Test 3: API Routes (vérification stricte)');
const apiDir = path.join(process.cwd(), 'app/api');
if (fs.existsSync(apiDir)) {
  const routeFiles = [];
  
  const walk = (dir) => {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    items.forEach(item => {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.name === 'route.ts' || item.name === 'route.js') {
        routeFiles.push(fullPath);
      }
    });
  };
  
  walk(apiDir);
  console.log(`  ℹ️  ${routeFiles.length} route(s) API trouvée(s)`);
  
  routeFiles.forEach(file => {
    const relativePath = path.relative(process.cwd(), file);
    const content = fs.readFileSync(file, 'utf8');
    
    // Vérification 1: Export runtime
    if (!content.includes('export const runtime')) {
      console.warn(`  ⚠️  ${relativePath}: Pas d'export "runtime"`);
      warnings++;
    } else if (content.includes('runtime = "nodejs"') || content.includes('runtime = \'nodejs\'')) {
      console.log(`  ✓ ${relativePath}: Runtime Node.js OK`);
      passed++;
    } else if (content.includes('runtime = "edge"') || content.includes('runtime = \'edge\'')) {
      console.error(`  ❌ ${relativePath}: EDGE RUNTIME (incompatible avec AWS SDK)`);
      errors++;
    }
    
    // Vérification 2: Exports HTTP methods
    const hasExports = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].some(method => 
      content.includes(`export async function ${method}`)
    );
    
    if (hasExports) {
      console.log(`  ✓ ${relativePath}: Exports HTTP valides`);
      passed++;
    } else {
      console.error(`  ❌ ${relativePath}: Aucun export HTTP trouvé`);
      errors++;
    }
    
    // Vérification 3: NextResponse
    if (content.includes('NextResponse')) {
      console.log(`  ✓ ${relativePath}: Utilise NextResponse`);
      passed++;
    } else {
      console.warn(`  ⚠️  ${relativePath}: N'utilise pas NextResponse`);
      warnings++;
    }
  });
} else {
  console.error('  ❌ Dossier app/api INTROUVABLE');
  errors++;
}

// Test 4: Variables d'environnement
console.log('\n🔐 Test 4: Variables d\'environnement');
const envExampleExists = fs.existsSync('.env.example');
const envExists = fs.existsSync('.env');

if (envExampleExists) {
  console.log('  ✓ .env.example présent');
  const envExample = fs.readFileSync('.env.example', 'utf8');
  
  const requiredVars = [
    'SERPAPI_API_KEY',
    'DYNAMODB_TABLE',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
  ];
  
  requiredVars.forEach(varName => {
    if (envExample.includes(varName)) {
      console.log(`  ✓ ${varName} documenté`);
      passed++;
    } else {
      console.error(`  ❌ ${varName} MANQUANT dans .env.example`);
      errors++;
    }
  });
} else {
  console.error('  ❌ .env.example MANQUANT');
  errors++;
}

if (envExists) {
  console.warn('  ⚠️  .env présent (ne sera pas déployé sur Vercel)');
  warnings++;
}

// Test 5: .gitignore
console.log('\n🚫 Test 5: .gitignore');
if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  const requiredIgnores = ['.env', 'node_modules', '.next'];
  
  let allPresent = true;
  requiredIgnores.forEach(pattern => {
    if (gitignore.includes(pattern)) {
      console.log(`  ✓ ${pattern} ignoré`);
      passed++;
    } else {
      console.error(`  ❌ ${pattern} NON IGNORÉ (DANGER!)
`);
      errors++;
      allPresent = false;
    }
  });
  
  if (allPresent) {
    console.log('  ✓ .gitignore correctement configuré');
  }
} else {
  console.error('  ❌ .gitignore MANQUANT (CRITIQUE!)');
  errors++;
}

// Test 6: TypeScript config
console.log('\n⚙️  Test 6: Configuration TypeScript');
if (fs.existsSync('tsconfig.json')) {
  try {
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    
    if (tsconfig.compilerOptions?.strict) {
      console.log('  ✓ Mode strict activé');
      passed++;
    } else {
      console.warn('  ⚠️  Mode strict désactivé');
      warnings++;
    }
    
    if (tsconfig.compilerOptions?.paths) {
      console.log('  ✓ Path aliases configurés');
      passed++;
    }
  } catch (e) {
    console.error('  ❌ tsconfig.json INVALIDE');
    errors++;
  }
} else {
  console.warn('  ⚠️  tsconfig.json manquant (JavaScript uniquement?)');
  warnings++;
}

// Test 7: Build simulation
console.log('\n🏗️  Test 7: Préparation au build');
if (fs.existsSync('node_modules')) {
  console.log('  ✓ node_modules présent');
  passed++;
} else {
  console.error('  ❌ node_modules MANQUANT (exécuter: npm install)');
  errors++;
}

// Résumé final
console.log('\n' + '='.repeat(60));
console.log('📊 RÉSULTAT DU TEST DE COMPATIBILITÉ VERCEL\n');

console.log(`✅ Tests réussis: ${passed}`);
console.log(`❌ Erreurs critiques: ${errors}`);
console.log(`⚠️  Avertissements: ${warnings}`);

console.log('\n' + '='.repeat(60));

if (errors === 0 && warnings === 0) {
  console.log('\n🎉 PARFAIT! Projet 100% compatible Vercel');
  console.log('✅ Vous pouvez déployer sans problème\n');
  process.exit(0);
} else if (errors === 0 && warnings <= 3) {
  console.log('\n✅ BON! Compatible Vercel avec avertissements mineurs');
  console.log('⚠️  Déploiement possible, mais quelques améliorations recommandées\n');
  process.exit(0);
} else if (errors > 0 && errors <= 2) {
  console.log('\n⚠️  ATTENTION! Quelques erreurs à corriger');
  console.log('❌ Recommandé de corriger avant déploiement\n');
  process.exit(1);
} else {
  console.log('\n❌ ÉCHEC! Trop d\'erreurs critiques');
  console.log('🔧 Corrigez les erreurs ci-dessus avant de déployer\n');
  process.exit(1);
}

