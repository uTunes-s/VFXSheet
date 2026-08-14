// Browser print-window PDF export orchestration.
async function exportToPDF() {
  const button = document.getElementById('exportPdfBtn');
  const originalLabel = button.innerHTML;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return alert('Could not open the PDF export window. Allow pop-ups and try again.');
  button.disabled = true;
  button.innerText = 'Preparing PDF…';
  try {
    const records = await getRecordsForHistoryAction();
    if (!records?.length) {
      printWindow.close();
      return alert('No records to export.');
    }
    const pages = await Promise.all(records.map(renderPrintableTextPdfRecord));
    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>VFX Sheet Report</title><style>@page{size:A3 portrait;margin:10mm}*{box-sizing:border-box}body{color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",Meiryo,sans-serif;font-size:10px;line-height:1.4}.return-bar{position:sticky;top:0;z-index:1;display:flex;justify-content:flex-end;gap:8px;padding:8px;background:#0f172a}.return-bar button{border:0;border-radius:6px;padding:8px 12px;color:#0f172a;background:#fbbf24;font-weight:700}.return-bar .close{color:#e2e8f0;background:#334155}.page{break-after:page;page-break-after:always;break-inside:avoid-page;page-break-inside:avoid} .page:last-child{break-after:auto;page-break-after:auto}h1{font-size:20px;margin:0;color:#0f172a;text-align:center}h2{font-size:12px;color:#92400e;border-bottom:1px solid #cbd5e1;padding-bottom:3px;margin:12px 0 5px}table{border-collapse:collapse;width:100%;margin-bottom:6px;break-inside:avoid;page-break-inside:avoid}th,td{border:1px solid #cbd5e1;padding:4px;text-align:left;vertical-align:top;word-break:break-word}th{background:#e2e8f0;font-weight:700;white-space:nowrap}.images{display:flex;flex-wrap:wrap;gap:6px}.thumb{width:31%;max-height:120px;object-fit:contain;border:1px solid #cbd5e1}.sketch{display:block;width:100%;height:auto;max-height:520px;object-fit:contain;border:1px solid #cbd5e1}pre{margin:0;white-space:pre-wrap;font-family:inherit}@media print{.return-bar{display:none}}</style></head><body><div class="return-bar"><button type="button" id="printReport">Export PDF</button><button type="button" id="closeReport" class="close">Close</button></div>${pages.join('')}</body></html>`);
    printWindow.document.close();
    printWindow.document.getElementById('printReport').addEventListener('click', () => printWindow.print());
    printWindow.document.getElementById('closeReport').addEventListener('click', () => printWindow.close());
    printWindow.focus();
  } catch (error) {
    printWindow.close();
    console.error('PDF export error:', error);
    alert(`PDF Export Error: ${error.message || error}`);
  } finally {
    button.disabled = false;
    button.innerHTML = originalLabel;
  }
}
