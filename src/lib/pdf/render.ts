// Renders a self-contained HTML string into an A4 PDF using headless Chromium.
//
// On Vercel (and any environment with VERCEL/AWS_LAMBDA_FUNCTION_NAME set) this uses
// @sparticuz/chromium, a Chromium build small enough to ship inside a serverless
// function bundle. Locally it launches whatever Chrome/Chromium executable is
// pointed to by PUPPETEER_EXECUTABLE_PATH (or CHROME_EXECUTABLE_PATH).
import puppeteer, { type Browser } from 'puppeteer-core';

function isServerless(): boolean {
  return !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

async function launchBrowser(): Promise<Browser> {
  if (isServerless()) {
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_EXECUTABLE_PATH;
  if (!executablePath) {
    throw new Error(
      'PDF generation needs a local Chrome/Chromium install for dev. ' +
      'Set PUPPETEER_EXECUTABLE_PATH to its executable path.'
    );
  }
  // Chromium's sandbox refuses to run as root, which is the default user in many
  // Docker-based dev containers — disable it only in that case.
  const isRoot = process.platform === 'linux' && process.getuid?.() === 0;
  return puppeteer.launch({ executablePath, headless: true, args: isRoot ? ['--no-sandbox'] : [] });
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
