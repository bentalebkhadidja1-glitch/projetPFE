import PDFDocument from 'pdfkit';

export class PDFService {
  /**
   * Generate a citizen request PDF.
   * @param {object} requestRow  — a row from the `requests` table (flat columns)
   */
  static generateCitizenPDF(requestRow) {
    return new Promise((resolve, reject) => {
      try {
        const doc    = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end',  ()    => resolve(Buffer.concat(chunks)));

        // ── Header ──────────────────────────────────────────────────────────
        doc.rect(0, 0, 612, 100).fill('#1e40af');
        doc.fillColor('#ffffff');
        doc.fontSize(28).font('Helvetica-Bold').text('BALADIYA DIGITAL', 50, 30);
        doc.fontSize(14).font('Helvetica').text('Fiche de Traitement de Demande', 50, 65);
        doc.fontSize(10)
           .text(`Ref: ${requestRow.id ?? 'N/A'}`, 450, 40)
           .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 450, 55);

        // ── Citizen Information (flat columns from `requests`) ────────────
        doc.fillColor('#1f2937')
           .fontSize(16).font('Helvetica-Bold')
           .text('INFORMATIONS DU CITOYEN', 50, 130);
        doc.moveTo(50, 150).lineTo(562, 150).stroke('#e5e7eb');

        const citizenInfo = [
          ['Nom complet:', `${requestRow.citizen_first_name ?? ''} ${requestRow.citizen_last_name ?? ''}`.trim()],
          ['Email:',       requestRow.citizen_email   ?? 'Non spécifié'],
          ['Téléphone:',   requestRow.citizen_phone   ?? 'Non spécifié'],
          ['NIN:',         requestRow.citizen_nin     ?? 'Non spécifié'],
          ['Adresse:',     requestRow.citizen_address ?? 'Non spécifiée']
        ];

        let y = 170;
        doc.fontSize(11).font('Helvetica-Bold');
        for (const [label, value] of citizenInfo) {
          doc.fillColor('#4b5563').text(label, 50, y);
          doc.fillColor('#1f2937').font('Helvetica').text(value, 200, y);
          doc.font('Helvetica-Bold');
          y += 25;
        }

        // ── Request Details ──────────────────────────────────────────────
        y += 20;
        doc.fillColor('#1e40af').fontSize(16).font('Helvetica-Bold')
           .text('DÉTAILS DE LA DEMANDE', 50, y);
        doc.moveTo(50, y + 20).lineTo(562, y + 20).stroke('#e5e7eb');

        const requestInfo = [
          ['Sujet:',       requestRow.subject      ?? 'Non spécifié'],
          ['Description:', requestRow.description  ?? 'Aucune description'],
          ['Assigné à:',   requestRow.assigned_employee_name ?? 'Non spécifié'],
          ['Date:',        requestRow.created_at
                            ? new Date(requestRow.created_at).toLocaleDateString('fr-FR')
                            : 'Non spécifiée'],
          ['Statut:',      requestRow.status       ?? 'En attente']
        ];

        y += 40;
        doc.fontSize(11).font('Helvetica-Bold');
        for (const [label, value] of requestInfo) {
          doc.fillColor('#4b5563').text(label, 50, y);
          doc.fillColor('#1f2937').font('Helvetica');
          if (label === 'Description:') {
            doc.text(value, 200, y, { width: 362 });
            y += 40;
          } else {
            doc.text(value, 200, y);
            y += 25;
          }
          doc.font('Helvetica-Bold');
        }

        // ── Comment (if any) ─────────────────────────────────────────────
        if (requestRow.comment) {
          y += 20;
          doc.fillColor('#1e40af').fontSize(16).font('Helvetica-Bold')
             .text('COMMENTAIRE', 50, y);
          doc.moveTo(50, y + 20).lineTo(562, y + 20).stroke('#e5e7eb');
          y += 35;
          doc.fillColor('#1f2937').fontSize(11).font('Helvetica')
             .text(requestRow.comment, 50, y, { width: 512 });
          y += 40;
        }

        // ── Validation stamp ─────────────────────────────────────────────
        y += 20;
        doc.fillColor('#059669').fontSize(16).font('Helvetica-Bold')
           .text('VALIDATION', 50, y);
        doc.moveTo(50, y + 20).lineTo(562, y + 20).stroke('#e5e7eb');
        y += 35;
        doc.fillColor('#1f2937').fontSize(11).font('Helvetica')
           .text('Cette demande a été traitée et validée.', 50, y)
           .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 50, y + 20)
           .text(`Heure: ${new Date().toLocaleTimeString('fr-FR')}`, 50, y + 40);

        if (requestRow.id) {
          doc.fontSize(8).fillColor('#9ca3af')
             .text(`ID de la demande: ${requestRow.id}`, 50, y + 65);
        }

        // ── Footer ───────────────────────────────────────────────────────
        doc.rect(0, 750, 612, 42).fill('#f3f4f6');
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
           .text('Document généré par Baladiya Digital', 50, 765)
           .text('© 2026 Administration Municipale', 50, 780);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate a notification summary PDF.
   * @param {string} employeeInfo  — employee name or position
   * @param {object} notificationData — row from `notifications` table
   */
  static generateNotificationPDF(employeeInfo, notificationData) {
    return new Promise((resolve, reject) => {
      try {
        const doc    = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end',  ()    => resolve(Buffer.concat(chunks)));

        // ── Header ──────────────────────────────────────────────────────────
        doc.rect(0, 0, 612, 100).fill('#1e40af');
        doc.fillColor('#ffffff');
        doc.fontSize(28).font('Helvetica-Bold').text('BALADIYA DIGITAL', 50, 30);
        doc.fontSize(14).font('Helvetica').text('Notification', 50, 65);
        doc.fontSize(10)
           .text(`Employé: ${employeeInfo}`, 430, 40)
           .text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 430, 55);

        // ── Notification Details ─────────────────────────────────────────
        doc.fillColor('#1f2937').fontSize(16).font('Helvetica-Bold')
           .text('DÉTAILS DE LA NOTIFICATION', 50, 130);
        doc.moveTo(50, 150).lineTo(562, 150).stroke('#e5e7eb');

        const fields = [
          ['Titre:',    notificationData.title   ?? 'Non spécifié'],
          ['Message:',  notificationData.message ?? 'Aucun message'],
          ['Type:',     notificationData.type    ?? 'Non spécifié'],
          ['Service:',  notificationData.service ?? 'Général'],
          ['Lu:',       notificationData.is_read ? 'Oui' : 'Non']
        ];

        let y = 170;
        doc.fontSize(11).font('Helvetica-Bold');
        for (const [label, value] of fields) {
          doc.fillColor('#4b5563').text(label, 50, y);
          doc.fillColor('#1f2937').font('Helvetica');
          if (label === 'Message:') {
            doc.text(value, 200, y, { width: 362 });
            y += 40;
          } else {
            doc.text(value, 200, y);
            y += 25;
          }
          doc.font('Helvetica-Bold');
        }

        // ── Footer ───────────────────────────────────────────────────────
        doc.rect(0, 750, 612, 42).fill('#f3f4f6');
        doc.fillColor('#6b7280').fontSize(9).font('Helvetica')
           .text('Document généré par Baladiya Digital', 50, 765)
           .text('© 2026 Administration Municipale', 50, 780);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default PDFService;