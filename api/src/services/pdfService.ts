import puppeteer from 'puppeteer';

export const downloadTicketPdf = async (bookingId: string, res: any) => {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  const url = `${FRONTEND_URL}/tickets/${bookingId}`;

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 👉 set viewport giống desktop
  await page.setViewport({
    width: 1280,
    height: 900,
    deviceScaleFactor: 2
  });

  // 👉 load trang vé
  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: 0
  });

  // 👉 đợi UI render xong (quan trọng)
  await page.waitForSelector('img'); // QR load xong
  await new Promise(resolve => setTimeout(resolve, 500)); // tránh thiếu CSS

  // 👉 export PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      bottom: '10mm',
      left: '10mm',
      right: '10mm'
    }
  });

  await browser.close();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="ticket-${bookingId}.pdf"`
  );

  res.send(pdfBuffer);
};