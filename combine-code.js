import fs from 'fs';
import path from 'path';

function getAllFiles(dirPath, arrayOfFiles = []) {
  try {
    const files = fs.readdirSync(dirPath);
    console.log(`Scanning: ${dirPath}`);

    files.forEach(file => {
      const filePath = path.join(dirPath, file);

      if (fs.statSync(filePath).isDirectory()) {
        if (!file.match(/node_modules|\.git|dist|build/)) {
          arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
        }
      } else {
        if (file.match(/\.(js|ts|jsx|tsx)$/)) {
          console.log(`Found: ${filePath}`);
          arrayOfFiles.push(filePath);
        }
      }
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
  return arrayOfFiles;
}

console.log('Starting...\n');

const allFiles = getAllFiles('./');

console.log(`\nFound ${allFiles.length} files\n`);

if (allFiles.length === 0) {
  console.log('No JS files found!');
  process.exit(1);
}

let combinedCode = '';

allFiles.forEach(file => {
  combinedCode += `\n\n// ========== ${file} ==========\n\n`;
  combinedCode += fs.readFileSync(file, 'utf8');
});

fs.writeFileSync('combined-code.txt', combinedCode);

console.log('\nSuccess!');
console.log(`Created: combined-code.txt`);
console.log(`Total files: ${allFiles.length}`);
console.log(`Total size: ${combinedCode.length} characters`);
