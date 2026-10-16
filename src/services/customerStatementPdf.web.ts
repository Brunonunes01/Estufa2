const renderStatementPdf = async (
  html: string,
  isClosed: () => boolean
): Promise<Blob | null> => {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([
    import('html-to-image'),
    import('jspdf'),
  ]);
  if (isClosed()) return null;

  // A separate document keeps the report's CSS isolated from the app.
  const frame = document.createElement('iframe');
  frame.title = 'Preparação do extrato';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText =
    'position:fixed;left:-15000px;top:0;width:1200px;height:900px;border:0;pointer-events:none;';
  try {
    await new Promise<void>((resolve, reject) => {
      frame.onload = () => resolve();
      frame.onerror = () =>
        reject(new Error('Não foi possível preparar o extrato.'));
      frame.srcdoc = html;
      document.body.appendChild(frame);
    });
    const reportDocument = frame.contentDocument;
    const page = reportDocument?.querySelector<HTMLElement>('.page');
    if (!reportDocument || !page) {
      throw new Error('Não foi possível carregar o conteúdo do extrato.');
    }
    await reportDocument.fonts.ready;
    if (isClosed()) return null;

    const width = 1200;
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    const margin = 10;
    const pdfWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = Math.floor(
      ((pdf.internal.pageSize.getHeight() - margin * 2) * width) / pdfWidth
    );
    page.style.minHeight = '0';
    const totalHeight = Math.ceil(page.getBoundingClientRect().height);
    const pageTop = page.getBoundingClientRect().top;
    // Keep rows, headings and the financial summary together across pages.
    const blocks = Array.from(
      page.querySelectorAll('.header, .cards, tr, .bottom-grid, .section-title')
    ).map((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top - pageTop, bottom: rect.bottom - pageTop };
    });
    const viewport = reportDocument.createElement('div');
    viewport.style.cssText = `width:${width}px;overflow:hidden;background:#fff;`;
    page.replaceWith(viewport);
    viewport.appendChild(page);

    let offset = 0;
    while (offset < totalHeight) {
      if (isClosed()) return null;
      let end = Math.min(offset + pageHeight, totalHeight);
      for (const block of blocks) {
        if (block.top > offset && block.top < end && block.bottom > end) {
          end = Math.floor(block.top);
        }
      }
      if (end <= offset) end = Math.min(offset + pageHeight, totalHeight);
      const height = end - offset;
      viewport.style.height = `${height}px`;
      page.style.transform = `translateY(-${offset}px)`;
      const canvas = await toCanvas(viewport, {
        width,
        height,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        // The report uses system fonts and inline SVG; no external font fetches.
        skipFonts: true,
      });
      if (offset > 0) pdf.addPage();
      pdf.addImage(
        canvas,
        'PNG',
        margin,
        margin,
        pdfWidth,
        (height * pdfWidth) / width,
        undefined,
        'FAST'
      );
      canvas.width = 0;
      canvas.height = 0;
      offset = end;
    }
    return pdf.output('blob');
  } finally {
    frame.remove();
  }
};

export const shareCustomerStatementOnWeb = async (
  html: string,
  fileName: string
): Promise<void> => {
  const previousFocus = document.activeElement as HTMLElement | null;
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-labelledby', 'customer-statement-pdf-title');
  dialog.style.cssText =
    'box-sizing:border-box;width:min(440px,calc(100% - 32px));padding:24px;border:1px solid #c8d8cc;border-radius:16px;background:#fff;color:#194128;font-family:Arial,sans-serif;box-shadow:0 16px 64px #0003;';
  // Only static markup is inserted here. The filename is assigned as text.
  dialog.innerHTML = `
    <h2 id="customer-statement-pdf-title" style="margin:0 0 12px;font-size:22px;color:#0f5a2e">Extrato do cliente</h2>
    <p data-file style="font-size:13px;overflow-wrap:anywhere;color:#52665a"></p>
    <p data-status role="status" aria-live="polite" style="line-height:1.5">Preparando seu PDF colorido…</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px">
      <button data-share disabled style="flex:1;padding:12px;border:0;border-radius:8px;background:#0f5a2e;color:#fff;font-size:15px;cursor:pointer">Compartilhar PDF</button>
      <button data-download disabled style="flex:1;padding:12px;border:1px solid #0f5a2e;border-radius:8px;background:#fff;color:#0f5a2e;font-size:15px;cursor:pointer">Baixar PDF</button>
    </div>
    <button data-close style="display:block;margin:18px auto 0;padding:8px 16px;border:0;background:transparent;color:#52665a;font-size:14px;cursor:pointer">Fechar</button>
  `;
  dialog.querySelector('[data-file]').textContent = fileName;
  const status = dialog.querySelector<HTMLElement>('[data-status]');
  const shareButton = dialog.querySelector<HTMLButtonElement>('[data-share]');
  const downloadButton =
    dialog.querySelector<HTMLButtonElement>('[data-download]');
  const closeButton = dialog.querySelector<HTMLButtonElement>('[data-close]');
  let closed = false;
  let downloadUrl: string | null = null;
  let resolveClosed: () => void;
  const whenClosed = new Promise<void>((resolve) => {
    resolveClosed = resolve;
  });
  const close = () => {
    closed = true;
    resolveClosed();
  };
  dialog.onclose = close;
  closeButton.onclick = () => dialog.close();
  document.body.appendChild(dialog);

  try {
    dialog.showModal();
    const blob = await renderStatementPdf(html, () => closed);
    if (closed || !blob) return;
    const file = new File([blob], fileName, { type: 'application/pdf' });
    downloadUrl = URL.createObjectURL(file);
    downloadButton.disabled = false;
    downloadButton.onclick = () => {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    };

    const canShare =
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] });
    shareButton.hidden = !canShare;
    shareButton.disabled = !canShare;
    status.textContent = canShare
      ? 'PDF pronto. Toque em Compartilhar PDF e escolha o WhatsApp.'
      : 'PDF pronto. Este navegador não permite compartilhar arquivos diretamente. Baixe o PDF e anexe na conversa do WhatsApp.';
    shareButton.onclick = async () => {
      shareButton.disabled = true;
      try {
        // Call directly from the click: Web Share requires a fresh user gesture.
        await navigator.share({ files: [file], title: 'Extrato do cliente' });
        if (!closed) dialog.close();
      } catch (error) {
        if (
          !closed &&
          !(error instanceof Error && error.name === 'AbortError')
        ) {
          status.textContent =
            'Não foi possível abrir o compartilhamento. Tente novamente ou baixe o PDF para enviar pelo WhatsApp.';
        }
      } finally {
        shareButton.disabled = false;
      }
    };
    await whenClosed;
  } finally {
    dialog.remove();
    previousFocus?.focus();
    if (downloadUrl) {
      const url = downloadUrl;
      // Give the browser time to consume a download before releasing the file.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  }
};
