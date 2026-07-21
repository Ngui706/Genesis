import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const BRAND = {
  midnight: '#0B0F1A',
  midnight2: '#121826',
  amber: '#F2A93B',
  cream: '#F7F4EC',
  slate: '#8890A0',
  teal: '#1E7F72',
};

/**
 * Builds a one-page PDF e-ticket and resolves with a Buffer.
 * QR sits in the top-right corner of the header band, as requested —
 * it encodes the same signed payload used for the in-app QR/verification
 * flow, so a printed ticket scans exactly the same as the digital one.
 */
export async function generateTicketPdfBuffer({ booking, qrPayload }) {
  const qrPngBuffer = await QRCode.toBuffer(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#0B0F1A', light: '#FFFFFF' },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    // ---- Header band ----
    const headerHeight = 150;
    doc.rect(0, 0, pageWidth, headerHeight).fill(BRAND.midnight);

    doc
      .fillColor(BRAND.amber)
      .font('Helvetica-Bold')
      .fontSize(26)
      .text('GENESIS COACHES', margin, 40);
    doc
      .fillColor(BRAND.cream)
      .font('Helvetica')
      .fontSize(11)
      .text('Beyond your Imagination', margin, 72);

    doc
      .fillColor(BRAND.slate)
      .fontSize(9)
      .text('E-TICKET', margin, 100)
      .fillColor(BRAND.cream)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text(booking.booking_reference, margin, 113);

    // QR code — top-right corner of the header band
    const qrSize = 96;
    const qrX = pageWidth - margin - qrSize;
    const qrY = (headerHeight - qrSize) / 2;
    doc.roundedRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 6).fill(BRAND.cream);
    doc.image(qrPngBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    let y = headerHeight + 30;

    // ---- Trip details ----
    doc.fillColor(BRAND.midnight).font('Helvetica-Bold').fontSize(16)
      .text(`${booking.schedule.route.origin}  to  ${booking.schedule.route.destination}`, margin, y);
    y += 26;

    const detailRow = (label, value) => {
      doc.fillColor(BRAND.slate).font('Helvetica').fontSize(10).text(label, margin, y, { width: 150 });
      doc.fillColor(BRAND.midnight).font('Helvetica-Bold').fontSize(11).text(value, margin + 150, y, { width: contentWidth - 150 });
      y += 20;
    };

    detailRow('Departure', new Date(booking.schedule.departure_time).toLocaleString());
    if (booking.schedule.arrival_time) detailRow('Estimated arrival', new Date(booking.schedule.arrival_time).toLocaleString());
    detailRow('Bus', `${booking.schedule.bus.name || booking.schedule.bus.bus_class} · ${booking.schedule.bus.plate_number}`);
    detailRow('Status', booking.status.toUpperCase());
    detailRow('Total paid', `KES ${Number(booking.total_amount).toLocaleString()}`);

    y += 10;
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).dash(3, { space: 3 }).strokeColor(BRAND.slate).stroke();
    doc.undash();
    y += 20;

    // ---- Passenger / seat table ----
    doc.fillColor(BRAND.midnight).font('Helvetica-Bold').fontSize(12).text('Passengers & seats', margin, y);
    y += 22;

    doc.fillColor(BRAND.slate).font('Helvetica').fontSize(9);
    doc.text('PASSENGER', margin, y);
    doc.text('SEAT', margin + 300, y);
    doc.text('FARE', margin + 380, y);
    y += 16;
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor('#E5E5E5').stroke();
    y += 8;

    for (const p of booking.passengers) {
      doc.fillColor(BRAND.midnight).font('Helvetica').fontSize(11);
      doc.text(p.passenger_name, margin, y, { width: 280 });
      doc.text(p.seat?.seat_number || '—', margin + 300, y);
      doc.text(`KES ${Number(p.fare).toLocaleString()}`, margin + 380, y);
      y += 20;
    }

    // ---- Footer ----
    const footerY = doc.page.height - 90;
    doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).dash(3, { space: 3 }).strokeColor(BRAND.slate).stroke();
    doc.undash();
    doc
      .fillColor(BRAND.slate)
      .font('Helvetica')
      .fontSize(9)
      .text(
        'Present this ticket (printed or on your phone) for boarding. The QR code is scanned by our conductors to verify your booking in real time.',
        margin,
        footerY + 14,
        { width: contentWidth }
      );
    doc.fillColor(BRAND.teal).font('Helvetica-Bold').fontSize(10).text('GENESIS COACHES — Beyond your Imagination', margin, footerY + 45);

    doc.end();
  });
}
