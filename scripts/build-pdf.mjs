/**
 * Genera el PDF premium del recurso.
 *
 *   npm run pdf          → build + PDF
 *   npm run pdf:only     → solo PDF (requiere dist/ previo)
 *
 * Usa Playwright para renderizar cada página a tamaño A4 y concatenarlas
 * en un único PDF con metadatos.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DIST = path.join(ROOT, 'dist');

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

async function main() {
  console.log(`\n${c.bold('Ciudadano Global · generación de PDF')}\n`);

  const htmlPath = path.join(DIST, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    console.error(c.red('  Falta dist/index.html. Ejecuta npm run build primero.'));
    process.exit(1);
  }

  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Cargar el archivo construido para que las rutas relativas de imágenes
  // sigan resolviendo durante la impresión.
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });

  // Asegurar que las fuentes están cargadas
  await page.waitForTimeout(2000);
  await page.emulateMedia({ media: 'print' });

  // La web presenta parte del contenido mediante interacción. Para el PDF se
  // crean equivalentes editoriales estáticos antes de imprimir el documento.
  await page.evaluate(() => {
    const root = document.documentElement;
    const book = document.querySelector('.book');
    root.classList.remove('motion-ready');
    root.classList.add('pdf-export');

    document.querySelectorAll('.flip').forEach((card) => {
      const content = document.createElement('div');
      const title = document.createElement('strong');
      const definition = document.createElement('p');
      content.className = 'pdf-flip-content';
      title.textContent = card.querySelector('.flip__term')?.textContent.trim() || '';
      definition.textContent = card.querySelector('.flip__def')?.textContent.trim() || '';
      content.append(title, definition);
      card.append(content);
      card.classList.add('pdf-adapted');
    });

    document.querySelectorAll('.reveal').forEach((reveal) => {
      reveal.classList.add('is-open');
      reveal.querySelector('.reveal__trigger')?.setAttribute('aria-expanded', 'true');
    });

    document.querySelectorAll('.tabs').forEach((tabs) => {
      tabs.querySelectorAll('.tabs__panel').forEach((panel) => {
        panel.hidden = false;
        const label = tabs.querySelector(`[aria-controls="${panel.id}"]`);
        const heading = document.createElement('strong');
        heading.className = 'pdf-tab-heading';
        heading.textContent = label?.textContent.trim() || '';
        panel.prepend(heading);
      });
    });

    document.querySelectorAll('.gloss').forEach((term) => {
      const popup = term.querySelector('.gloss__pop');
      if (!popup) return;
      const definition = document.createElement('span');
      definition.className = 'pdf-gloss-definition';
      definition.textContent = ` (${popup.textContent.trim()})`;
      term.append(definition);
    });

    document.querySelectorAll('.references-card').forEach((details) => {
      details.open = true;
    });

    const createSupplementPage = (label, title, accent = 'var(--teal)') => {
      const section = document.createElement('section');
      const inner = document.createElement('div');
      const eyebrow = document.createElement('span');
      const heading = document.createElement('h2');

      section.className = 'book__page page paper-surface paper-grain paper-fibre pdf-supplement';
      section.style.setProperty('--pdf-accent', accent);
      inner.className = 'page__inner pdf-supplement__inner';
      eyebrow.className = 't-eyebrow pdf-supplement__eyebrow';
      eyebrow.textContent = label;
      heading.className = 't-display t-display--md t-inked pdf-supplement__title';
      heading.textContent = title;
      inner.append(eyebrow, heading);
      section.append(inner);
      book.append(section);
      return inner;
    };

    const scale = document.querySelector('.scale');
    if (scale) {
      const inner = createSupplementPage(
        'Contenido ampliado',
        'Escala de sensibilidad intercultural',
        'var(--teal)',
      );
      const intro = document.createElement('p');
      const grid = document.createElement('div');
      intro.className = 't-lead pdf-supplement__lead';
      intro.textContent = 'Modelo de Bennett: seis etapas para comprender cómo cambia nuestra relación con las diferencias culturales.';
      grid.className = 'pdf-scale-details';

      scale.querySelectorAll('.scale__step').forEach((step) => {
        step.click();
        const readout = scale.querySelector('.scale__readout');
        const item = document.createElement('article');
        const title = document.createElement('strong');
        const description = document.createElement('p');
        item.className = 'pdf-scale-detail';
        title.textContent = readout?.querySelector('strong')?.textContent.trim() || '';
        description.textContent = readout?.querySelector('span')?.textContent.trim() || '';
        item.append(title, description);
        grid.append(item);
      });
      inner.append(intro, grid);
    }

    document.querySelectorAll('.dialog').forEach((dialog) => {
      const panel = dialog.querySelector('.dialog__panel');
      const title = panel?.querySelector('.dialog__title')?.textContent.trim();
      if (!panel || !title) return;

      const accent = panel.style.getPropertyValue('--dialog-accent') || 'var(--coral)';
      const label = panel.querySelector('.dialog__eyebrow')?.textContent.trim() || 'Contenido ampliado';
      const inner = createSupplementPage(label, title, accent);
      const body = panel.querySelector('.dialog__body')?.cloneNode(true);
      if (!body) return;

      body.classList.add('pdf-dialog-content');
      body.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      body.querySelectorAll('.dialog-choice').forEach((choice) => {
        const item = document.createElement('article');
        const heading = document.createElement('strong');
        const feedback = document.createElement('p');
        item.className = 'pdf-dialog-choice';
        heading.textContent = choice.textContent.trim();
        feedback.textContent = choice.dataset.feedback || '';
        item.append(heading, feedback);
        choice.replaceWith(item);
      });
      body.querySelector('.dialog__response')?.remove();
      inner.append(body);
    });

    document.querySelectorAll('.pdf-supplement').forEach((section, index) => {
      const folio = document.createElement('span');
      folio.className = 'page__folio';
      folio.textContent = String(30 + index).padStart(2, '0');
      section.querySelector('.page__inner')?.append(folio);
    });
  });

  const pdfAudit = await page.evaluate(() => ({
    pages: document.querySelectorAll('.book__page').length,
    supplements: document.querySelectorAll('.pdf-supplement').length,
    flipDefinitions: document.querySelectorAll('.pdf-flip-content').length,
    expandedReveals: document.querySelectorAll('.reveal.is-open').length,
    tabPanels: document.querySelectorAll('.tabs__panel:not([hidden])').length,
    glossaryDefinitions: document.querySelectorAll('.pdf-gloss-definition').length,
    scaleDetails: document.querySelectorAll('.pdf-scale-detail').length,
    dialogPages: document.querySelectorAll('.pdf-dialog-content').length,
    dialogAnswers: document.querySelectorAll('.pdf-dialog-choice').length,
    emptyDialogAnswers: [...document.querySelectorAll('.pdf-dialog-choice p')]
      .filter((answer) => !answer.textContent.trim()).length,
  }));

  const expected = {
    supplements: 4,
    flipDefinitions: 3,
    expandedReveals: 3,
    tabPanels: 3,
    scaleDetails: 6,
    dialogPages: 3,
    dialogAnswers: 3,
    emptyDialogAnswers: 0,
  };
  const invalid = Object.entries(expected)
    .filter(([key, value]) => pdfAudit[key] !== value)
    .map(([key, value]) => `${key}: ${pdfAudit[key]} (esperado ${value})`);
  if (pdfAudit.glossaryDefinitions === 0) {
    invalid.push('glossaryDefinitions: no se encontraron definiciones');
  }
  if (invalid.length > 0) {
    throw new Error(`Adaptación PDF incompleta: ${invalid.join(', ')}`);
  }

  console.log(
    `  Contenido adaptado: ${pdfAudit.pages} páginas, ` +
      `${pdfAudit.scaleDetails} etapas, ${pdfAudit.dialogPages} ampliaciones`,
  );

  await page.evaluate(() => document.fonts.ready);

  const pdfPath = path.join(ROOT, 'ciudadano-global.pdf');

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
    scale: 1,
  });

  fs.copyFileSync(pdfPath, path.join(DIST, 'ciudadano-global.pdf'));

  await browser.close();

  const stat = fs.statSync(pdfPath);
  const mb = (stat.size / 1024 / 1024).toFixed(2);
  console.log(`  ${c.green('✓')} PDF generado: ${path.relative(ROOT, pdfPath)} (${mb} MB)\n`);
}

main().catch((err) => {
  console.error(c.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
