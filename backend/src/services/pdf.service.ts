import PDFDocument from 'pdfkit';
import { IOrder } from '../models/Order';

const COMPANY = {
  name: 'Machinichi Groups of Companies',
  address: '123, Grain Market, New Delhi - 110001',
  gstin: '07AAACM1234A1Z5',
  email: 'hello@machinichi.com',
  phone: '+91 98765 43210',
  pan: 'AAACM1234A',
};

function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const fn = (num: number): string => {
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? ' ' + a[num % 10] : '');
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + fn(num % 100) : '');
    if (num < 100000) return fn(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + fn(num % 1000) : '');
    if (num < 10000000) return fn(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + fn(num % 100000) : '');
    return fn(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + fn(num % 10000000) : '');
  };
  return fn(Math.floor(n)) + (n % 1 >= 0.5 ? ' and Fifty Paise' : '') + ' Only';
}

export function generateInvoice(order: IOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;
      const leftMargin = 40;
      let y = 40;

      // ─── Header ──────────────────────────────────────────────────
      doc.fontSize(20).font('Helvetica-Bold')
        .text('TAX INVOICE', leftMargin, y, { align: 'center', width: pageWidth });
      y += 30;

      // Seller info block
      doc.fontSize(14).font('Helvetica-Bold')
        .text(COMPANY.name, leftMargin, y);
      y += 18;
      doc.fontSize(9).font('Helvetica')
        .text(`GSTIN: ${COMPANY.gstin}  |  PAN: ${COMPANY.pan}`, leftMargin, y);
      y += 12;
      doc.text(COMPANY.address, leftMargin, y);
      y += 12;
      doc.text(`Email: ${COMPANY.email}  |  Phone: ${COMPANY.phone}`, leftMargin, y);
      y += 24;

      // Separator
      doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y).stroke('#cccccc');
      y += 16;

      // ─── Invoice Meta ─────────────────────────────────────────────
      const invoiceNumber = order.invoiceNumber || `INV-${order.orderId}`;
      const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      doc.fontSize(10).font('Helvetica-Bold')
        .text(`Invoice #: ${invoiceNumber}`, leftMargin, y);
      doc.font('Helvetica')
        .text(`Date: ${invoiceDate}`, leftMargin + 200, y);
      doc.font('Helvetica-Bold')
        .text(`Order #: ${order.orderId || order._id}`, leftMargin + 350, y, { width: pageWidth - 350, align: 'right' });
      y += 14;
      doc.font('Helvetica').text(`Order Date: ${orderDate}`, leftMargin + 200, y);
      y += 24;

      // ─── Addresses ────────────────────────────────────────────────
      doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y).stroke('#cccccc');
      y += 12;

      // Bill To
      const billing = order.billingAddress || order.shippingAddress;
      doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', leftMargin, y);
      y += 14;
      doc.font('Helvetica').fontSize(9)
        .text(billing.fullName, leftMargin, y);
      y += 12;
      doc.text(billing.streetAddress, leftMargin, y);
      y += 12;
      doc.text(`${billing.city}${billing.state ? ', ' + billing.state : ''} - ${billing.zipCode}`, leftMargin, y);
      y += 12;
      doc.text(billing.phoneNumber, leftMargin, y);
      y += 10;

      // Ship To (same x, move to right column)
      const shipX = leftMargin + Math.floor(pageWidth / 2) + 10;
      doc.font('Helvetica-Bold').fontSize(10).text('Ship To:', shipX, y - 66 - 14 - 12 - 12);
      doc.font('Helvetica').fontSize(9);
      doc.text(order.shippingAddress.fullName, shipX, y - 66 - 12 - 12 - 10);
      doc.text(order.shippingAddress.streetAddress, shipX, y - 66 - 12 - 10);
      doc.text(`${order.shippingAddress.city}${order.shippingAddress.state ? ', ' + order.shippingAddress.state : ''} - ${order.shippingAddress.zipCode}`, shipX, y - 66 - 10);
      doc.text(order.shippingAddress.phoneNumber, shipX, y - 66);

      y += 10;
      doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y).stroke('#cccccc');
      y += 16;

      // ─── Items Table ──────────────────────────────────────────────
      const tableTop = y;
      const col = {
        sn: leftMargin,
        hsn: leftMargin + 28,
        desc: leftMargin + 90,
        qty: leftMargin + 270,
        rate: leftMargin + 310,
        gst: leftMargin + 370,
        gstAmt: leftMargin + 410,
        total: leftMargin + 475,
      };

      // Table header
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333');
      doc.text('#', col.sn, y, { width: 25 });
      doc.text('HSN', col.hsn, y, { width: 55 });
      doc.text('Description', col.desc, y, { width: 175 });
      doc.text('Qty', col.qty, y, { width: 35, align: 'center' });
      doc.text('Rate', col.rate, y, { width: 55, align: 'right' });
      doc.text('GST%', col.gst, y, { width: 35, align: 'right' });
      doc.text('GST Amt', col.gstAmt, y, { width: 60, align: 'right' });
      doc.text('Total', col.total, y, { width: 65, align: 'right' });
      y += 18;
      doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y).stroke('#dddddd');
      doc.fillColor('#000000');

      // Table rows
      let sn = 1;
      for (const item of order.items) {
        y += 6;
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 40;
        }
        const lineTotal = item.sellingPrice * item.quantity;
        doc.fontSize(8).font('Helvetica');
        doc.text(String(sn), col.sn, y, { width: 25 });
        doc.text(item.hsnCode || item.sku?.slice(0, 8) || '—', col.hsn, y, { width: 55 });
        doc.text(item.name, col.desc, y, { width: 175 });
        doc.text(String(item.quantity), col.qty, y, { width: 35, align: 'center' });
        doc.text(`₹${item.sellingPrice.toLocaleString('en-IN')}`, col.rate, y, { width: 55, align: 'right' });
        doc.text(`${item.gstRate}%`, col.gst, y, { width: 35, align: 'right' });
        doc.text(`₹${item.gstAmount.toFixed(2)}`, col.gstAmt, y, { width: 60, align: 'right' });
        doc.text(`₹${lineTotal.toLocaleString('en-IN')}`, col.total, y, { width: 65, align: 'right' });
        y += 14;
        doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y).stroke('#eeeeee');
        sn++;
      }

      // ─── Summary ──────────────────────────────────────────────────
      y += 10;
      const summaryX = leftMargin + 300;
      doc.fontSize(9);
      const labelX = summaryX;
      const valueX = summaryX + 140;

      const addLine = (label: string, value: string, bold = false, size = 9) => {
        if (y > doc.page.height - 80) { doc.addPage(); y = 40; }
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
        doc.text(label, labelX, y, { width: 130 });
        doc.text(value, valueX, y, { width: 100, align: 'right' });
        y += bold ? 18 : 14;
      };

      addLine('Subtotal', `₹${order.subtotal.toLocaleString('en-IN')}`);
      if (order.totalDiscount) {
        addLine('Discount', `-₹${order.totalDiscount.toLocaleString('en-IN')}`);
      }
      if (order.cgst) addLine('CGST', `₹${order.cgst.toFixed(2)}`);
      if (order.sgst) addLine('SGST', `₹${order.sgst.toFixed(2)}`);
      if (order.igst) addLine('IGST', `₹${order.igst.toFixed(2)}`);
      if (order.shippingAmount) addLine('Shipping', `₹${order.shippingAmount.toLocaleString('en-IN')}`);

      doc.moveTo(summaryX, y).lineTo(summaryX + 240, y).stroke('#cccccc');
      y += 8;
      addLine('Grand Total', `₹${order.orderTotal.toLocaleString('en-IN')}`, true, 11);
      y += 4;

      // Amount in words
      doc.fontSize(8).font('Helvetica').fillColor('#555555')
        .text(`Amount in Words: ${numberToWords(order.orderTotal)}`, leftMargin, y, { width: pageWidth });
      y += 22;
      doc.fillColor('#000000');

      // ─── Footer ───────────────────────────────────────────────────
      doc.moveTo(leftMargin, y).lineTo(leftMargin + pageWidth, y).stroke('#cccccc');
      y += 10;
      doc.fontSize(7.5).fillColor('#666666');
      doc.text('Declaration: This is a computer-generated invoice and does not require a physical signature.', leftMargin, y, { width: pageWidth, align: 'center' });
      y += 12;
      doc.text(`Authorised Signatory — ${COMPANY.name}`, leftMargin, y, { width: pageWidth, align: 'right' });
      doc.fillColor('#000000');

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateShippingLabel(order: IOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: [280, 200], margin: 12 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const addr = order.shippingAddress;
      const pw = doc.page.width - 24;

      // From
      doc.fontSize(10).font('Helvetica-Bold').text('SHIP FROM:', 12, 12);
      doc.fontSize(8).font('Helvetica')
        .text(COMPANY.name, 12, 26)
        .text(COMPANY.address, 12, 36);

      // Separator
      doc.moveTo(12, 60).lineTo(doc.page.width - 12, 60).stroke('#cccccc');

      // To
      doc.fontSize(10).font('Helvetica-Bold').text('SHIP TO:', 12, 66);
      doc.fontSize(8).font('Helvetica')
        .text(addr.fullName, 12, 80)
        .text(addr.streetAddress, 12, 90)
        .text(`${addr.city}${addr.state ? ', ' + addr.state : ''} - ${addr.zipCode}`, 12, 100)
        .text(`Phone: ${addr.phoneNumber}`, 12, 110);

      // Order info box (right side)
      const boxX = 148;
      doc.fontSize(7).font('Helvetica-Bold');
      doc.text(`Order: ${order.orderId || order._id.toString().slice(-8).toUpperCase()}`, boxX, 66);
      doc.text(`Courier: ${order.courierName || 'N/A'}`, boxX, 76);
      doc.text(`Weight: ${order.packageWeight ? order.packageWeight + ' kg' : '—'}`, boxX, 86);
      doc.text(`Tracking: ${order.trackingNumber || '—'}`, boxX, 96);

      if (order.trackingNumber) {
        // Simple barcode-like visual (concentric rectangles as a placeholder)
        doc.rect(boxX, 112, pw - boxX - 12, 28).stroke('#aaaaaa');
        doc.fontSize(8).font('Helvetica').text(order.trackingNumber, boxX, 120, { width: pw - boxX - 12, align: 'center' });
        doc.fontSize(5).text(`(Tracking #: ${order.trackingNumber})`, boxX, 132, { width: pw - boxX - 12, align: 'center' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
