import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export interface ExcelExportData {
  fileName: string;
  sheetName: string;
  columns: { header: string; key: string; width?: number }[];
  data: any[];
}

/**
 * Generates and shares an Excel file from provided data using SheetJS (xlsx).
 * This version is compatible with React Native / Android Hermes.
 */
export const exportToExcel = async ({ fileName, sheetName, columns, data }: ExcelExportData) => {
  try {
    // 1. Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Map data to match headers
    const worksheetData = data.map(item => {
      const row: any = {};
      columns.forEach(col => {
        row[col.header] = item[col.key];
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // 2. Set column widths if provided
    if (columns.some(c => c.width)) {
      worksheet['!cols'] = columns.map(col => ({ wch: col.width || 20 }));
    }

    // 3. Append sheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 4. Generate base64 string
    const wbout = XLSX.write(workbook, {
      type: 'base64',
      bookType: 'xlsx'
    });

    // 5. Save file to cache
    const fileUri = `${FileSystem.cacheDirectory}${fileName.replace('.xlsx', '')}.xlsx`;
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 6. Share file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Exportar ${fileName}`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    } else {
      throw new Error('O compartilhamento de arquivos não está disponível neste dispositivo.');
    }
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    throw error;
  }
};
