const puppeteer = require('puppeteer');
const config = require('../config/config');

let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
  }
  return browser;
}

async function generatePDF(analysisId) {
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    const url = `http://localhost:${config.port}/internal/report/${analysisId}`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction('window.__reportReady === true', { timeout: 10000 });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      scale : 1.334,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });

    return pdfBuffer;
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (browser) { await browser.close(); browser = null; }
}

module.exports = { generatePDF, closeBrowser };