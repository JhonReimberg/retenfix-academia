const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'sources.json'), 'utf8'));
const destination = path.join(root, 'resources', 'catalogos');

async function download(source, force) {
  const target = path.join(destination, source.file);
  if (!force && fs.existsSync(target) && fs.statSync(target).size > 1024) {
    console.log(`já existe: ${source.file}`);
    return;
  }
  const response = await fetch(source.url, {
    headers: { 'user-agent': 'Retenfix-Academia-catalog-fetch/1.0' },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1024) throw new Error('arquivo recebido é pequeno demais');
  const temporary = `${target}.part`;
  fs.writeFileSync(temporary, buffer);
  fs.renameSync(temporary, target);
  console.log(`baixado: ${source.file} (${Math.round(buffer.length / 1024)} KB)`);
}

async function main() {
  fs.mkdirSync(destination, { recursive: true });
  const force = process.argv.includes('--force');
  for (const source of sources) {
    try {
      await download(source, force);
    } catch (error) {
      const target = path.join(destination, `${source.file}.part`);
      if (fs.existsSync(target)) fs.rmSync(target);
      console.error(`falha em ${source.file}: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
