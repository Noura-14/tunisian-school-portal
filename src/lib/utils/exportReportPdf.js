import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Render a printable report table to PDF using the existing browser PDF stack.
 * @param {{ title: string, period: string, columns: string[], rows: string[][], fileName: string, direction?: 'rtl' | 'ltr' }} report
 */
export async function exportReportPdf(report) {
	const wrapper = document.createElement('section');
	wrapper.dir = report.direction || 'rtl';
	wrapper.style.cssText = 'position:fixed;left:-10000px;top:0;width:1000px;padding:40px;background:#fff;color:#292526;font-family:Arial,"Segoe UI",sans-serif;';

	const school = document.createElement('h1');
	school.textContent = wrapper.dir === 'rtl' ? 'المدرسة التونسية بالدوحة' : 'Tunisian School in Doha';
	school.style.cssText = 'margin:0 0 6px;font-size:23px;';
	wrapper.append(school);

	const branch = document.createElement('p');
	branch.textContent = wrapper.dir === 'rtl' ? 'فرع اللقطة — إعدادي وثانوي' : 'Al-Luqta Branch — Preparatory & Secondary';
	branch.style.cssText = 'margin:0 0 22px;color:#756c6d;font-size:14px;';
	wrapper.append(branch);

	const heading = document.createElement('h2');
	heading.textContent = report.title;
	heading.style.cssText = 'margin:0 0 6px;font-size:19px;';
	wrapper.append(heading);

	const period = document.createElement('p');
	period.textContent = report.period;
	period.style.cssText = 'margin:0 0 18px;color:#756c6d;font-size:12px;';
	wrapper.append(period);

	const table = document.createElement('table');
	table.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;table-layout:auto;';
	const head = table.createTHead().insertRow();
	for (const label of report.columns) {
		const cell = document.createElement('th');
		cell.textContent = label;
		cell.style.cssText = 'padding:8px;border:1px solid #ded7d3;background:#f5f1ee;text-align:start;';
		head.append(cell);
	}
	const body = table.createTBody();
	for (const row of report.rows) {
		const tr = body.insertRow();
		for (const value of row) {
			const cell = tr.insertCell();
			cell.textContent = value;
			cell.style.cssText = 'padding:7px;border:1px solid #e5deda;text-align:start;vertical-align:top;';
		}
	}
	wrapper.append(table);
	document.body.append(wrapper);

	try {
		const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff' });
		const pdf = new jsPDF({ orientation: report.columns.length > 4 ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
		const pageWidth = pdf.internal.pageSize.getWidth();
		const pageHeight = pdf.internal.pageSize.getHeight();
		const margin = 10;
		const imageWidth = pageWidth - margin * 2;
		const imageHeight = (canvas.height * imageWidth) / canvas.width;
		const image = canvas.toDataURL('image/png');
		let offset = 0;
		let remaining = imageHeight;
		while (remaining > 0) {
			if (offset > 0) pdf.addPage();
			pdf.addImage(image, 'PNG', margin, margin - offset, imageWidth, imageHeight);
			offset += pageHeight - margin * 2;
			remaining -= pageHeight - margin * 2;
		}
		pdf.save(`${report.fileName.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'school_report'}.pdf`);
	} finally {
		wrapper.remove();
	}
}
