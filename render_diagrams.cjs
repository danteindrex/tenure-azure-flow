const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputFile = '/Users/dspr/.gemini/antigravity/brain/afe8941a-adbb-439a-b8f3-9f8e07958552/kyc_service_architecture.md';
const outputFile = '/Users/dspr/.gemini/antigravity/brain/afe8941a-adbb-439a-b8f3-9f8e07958552/kyc_service_architecture_images.md';
const outputDir = path.dirname(inputFile);

// Read the markdown file
let content = fs.readFileSync(inputFile, 'utf8');

// Regex to find mermaid blocks
const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;

let match;
let count = 1;
let replacements = [];

console.log('🔍 Scanning for Mermaid diagrams...');

while ((match = mermaidRegex.exec(content)) !== null) {
    const mermaidCode = match[1];
    const imageFilename = `mermaid_diagram_${count}.png`;
    const imagePath = path.join(outputDir, imageFilename);
    const tempMmdPath = path.join(outputDir, `temp_diagram_${count}.mmd`);

    console.log(`⚙️  Processing Diagram ${count}...`);

    // Write mermaid code to temp file
    fs.writeFileSync(tempMmdPath, mermaidCode);

    // Run mmdc to convert to PNG
    try {
        // Use npx to run mmdc to avoid global path issues if possible, or assume global install
        // Using -b transparent to match document background
        const cmd = `npx -y @mermaid-js/mermaid-cli -i "${tempMmdPath}" -o "${imagePath}" -b transparent -s 2`;
        console.log(`   Executing: ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });

        console.log(`   ✅ Rendered to ${imageFilename}`);

        // Clean up temp file
        fs.unlinkSync(tempMmdPath);

        // Record replacement
        replacements.push({
            original: match[0],
            replacement: `![Diagram ${count}](${imageFilename})`
        });

    } catch (error) {
        console.error(`   ❌ Failed to render diagram ${count}:`, error.message);
    }

    count++;
}

// Apply replacements to content
let newContent = content;
for (const rep of replacements) {
    newContent = newContent.replace(rep.original, rep.replacement);
}

// Write new markdown file
fs.writeFileSync(outputFile, newContent);
console.log(`\n🎉 Created updated markdown file: ${outputFile}`);
