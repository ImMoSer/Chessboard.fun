const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function walkDir(dir, ext = ['.ts', '.vue', '.js']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath, ext));
    } else {
      if (ext.some(e => file.endsWith(e))) results.push(filePath);
    }
  });
  return results;
}

function getImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const importRegex = /(?:import|export)\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  const imports = [];
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

const frontendSrcPath = path.resolve('c:/CHESS_APP/chess_frontend/src');

function analyzeLayer(layerName) {
  const layerPath = path.join(frontendSrcPath, layerName);
  if (!fs.existsSync(layerPath)) return;

  const files = walkDir(layerPath);
  const violations = [];

  files.forEach(file => {
    // Get the slice name of the file
    const relFile = path.relative(layerPath, file);
    const sliceName = relFile.split(path.sep)[0];

    // Skip if it's not a proper slice (like index.ts at root)
    if (sliceName === relFile) return;

    const imports = getImports(file);
    imports.forEach(imp => {
      // Check for aliases like @/features/other-feature
      const match = imp.match(new RegExp(`^@/${layerName}/([\\w-]+)`));
      if (match) {
        const importedSlice = match[1];
        if (importedSlice !== sliceName) {
           violations.push(`${relFile} imports ${imp}`);
        }
      }

      // Check for relative imports that escape the current slice
      // e.g., ../../other-feature
      if (imp.startsWith('.')) {
         const fileDir = path.dirname(file);
         const resolvedImport = path.resolve(fileDir, imp);
         const importRelToLayer = path.relative(layerPath, resolvedImport);

         if (!importRelToLayer.startsWith('..')) {
           const importedSlice = importRelToLayer.split(path.sep)[0];
           // ensure it is within another slice
           if (importedSlice !== sliceName && !importRelToLayer.includes('..')) {
               violations.push(`${relFile} relatively imports ${importRelToLayer} (${imp})`);
           }
         }
      }
    });
  });

  console.log(`\n=== Layer: ${layerName} Cross-Slice Violations ===`);
  if (violations.length === 0) {
    console.log('No violations found.');
  } else {
    violations.forEach(v => console.log(v));
  }
}

analyzeLayer('entities');
analyzeLayer('features');
analyzeLayer('widgets');
