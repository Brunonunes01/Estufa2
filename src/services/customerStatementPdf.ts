// Metro selects customerStatementPdf.web.ts in the browser.
export const shareCustomerStatementOnWeb = async (
  _html: string,
  _fileName: string
): Promise<void> => {
  throw new Error('Este compartilhamento está disponível apenas no navegador.');
};
