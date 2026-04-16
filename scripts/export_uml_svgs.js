const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const projectRoot = process.cwd();
const sourceHtml = path.join(projectRoot, 'UML_Diagram_Final.html');
const outputDir = path.join(projectRoot, 'svg');
const tempDir = path.join(projectRoot, 'tmp', 'uml-svg-export');
const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function sanitizeFileName(title) {
    return title
        .replace(/^\d+\.\d+\.\s*/u, '')
        .replace(/[<>:"/\\|?*]+/g, '')
        .replace(/\s+/g, '_')
        .replace(/[()]/g, '')
        .replace(/_+/g, '_')
        .trim()
        .slice(0, 80);
}

function getChromePath() {
    for (const candidate of chromeCandidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    throw new Error('Chrome or Edge executable was not found.');
}

function extractDiagrams(html) {
    const regex = /<h2>(.*?)<\/h2>[\s\S]*?<div class="mermaid">\s*([\s\S]*?)\s*<\/div>/g;
    const diagrams = [];
    let match;

    while ((match = regex.exec(html)) !== null) {
        diagrams.push({
            title: match[1].trim(),
            code: match[2].trim()
        });
    }

    return diagrams;
}

function buildRenderHtml(title, mermaidCode) {
    return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: "Segoe UI", Tahoma, sans-serif;
    }
    #container {
      display: inline-block;
      padding: 24px;
      background: #ffffff;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
</head>
<body>
  <div id="container">
    <div class="mermaid">
${mermaidCode}
    </div>
  </div>
  <script>
    window.addEventListener('load', async () => {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: { htmlLabels: true, curve: 'basis' }
      });

      try {
        await mermaid.run();
        document.body.setAttribute('data-rendered', 'true');
      } catch (error) {
        document.body.setAttribute('data-rendered', 'error');
        document.body.setAttribute('data-message', error && error.message ? error.message : String(error));
      }
    });
  </script>
</body>
</html>`;
}

function dumpDom(chromePath, htmlPath) {
    return execFileSync(
        chromePath,
        [
            '--headless=new',
            '--disable-gpu',
            '--allow-file-access-from-files',
            '--virtual-time-budget=8000',
            '--dump-dom',
            `file:///${htmlPath.replace(/\\/g, '/')}`
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
}

function extractSvgFromDom(dom) {
    const rendered = dom.match(/data-rendered="([^"]+)"/);
    if (!rendered || rendered[1] !== 'true') {
        const message = (dom.match(/data-message="([^"]*)"/) || [])[1];
        throw new Error(message || 'Mermaid rendering did not complete.');
    }

    const svgMatch = dom.match(/<svg[\s\S]*?<\/svg>/);
    if (!svgMatch) {
        throw new Error('Rendered SVG was not found in dumped DOM.');
    }

    return svgMatch[0];
}

function main() {
    if (!fs.existsSync(sourceHtml)) {
        throw new Error('UML_Diagram_Final.html was not found.');
    }

    const chromePath = getChromePath();
    const html = fs.readFileSync(sourceHtml, 'utf8');
    const diagrams = extractDiagrams(html);

    if (!diagrams.length) {
        throw new Error('No Mermaid diagrams were found in UML_Diagram_Final.html.');
    }

    ensureDir(outputDir);
    ensureDir(tempDir);

    const writtenFiles = [];

    diagrams.forEach((diagram, index) => {
        const baseName = `${String(index + 1).padStart(2, '0')}_${sanitizeFileName(diagram.title)}`;
        const tempHtmlPath = path.join(tempDir, `${baseName}.html`);
        const svgPath = path.join(outputDir, `${baseName}.svg`);

        fs.writeFileSync(tempHtmlPath, buildRenderHtml(diagram.title, diagram.code), 'utf8');
        const dom = dumpDom(chromePath, tempHtmlPath);
        const svg = extractSvgFromDom(dom);
        fs.writeFileSync(svgPath, svg, 'utf8');
        writtenFiles.push(svgPath);
    });

    console.log(`Generated ${writtenFiles.length} SVG file(s):`);
    for (const file of writtenFiles) {
        console.log(file);
    }
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
