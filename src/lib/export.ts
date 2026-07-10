import ExcelJS from 'exceljs'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
}

export interface ExcelSheetConfig {
  name: string
  columns: ExcelColumn[]
  data: any[]
}

/**
 * Utility to export data to stylized Excel (.xlsx) file using exceljs
 * @param filename - The file name of the downloaded spreadsheet (without extension)
 * @param sheets - Array of sheets configuration
 */
export async function exportToExcel(filename: string, sheets: ExcelSheetConfig[]) {
  try {
    const workbook = new ExcelJS.Workbook()

    sheets.forEach((sheetConfig) => {
      const worksheet = workbook.addWorksheet(sheetConfig.name)
      
      // Assign columns
      worksheet.columns = sheetConfig.columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 20
      }))

      // Style header row
      const headerRow = worksheet.getRow(1)
      headerRow.font = {
        name: 'Inter',
        family: 4,
        size: 11,
        bold: true,
        color: { argb: 'FFFFFF' }
      }
      
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0F172A' } // Dark premium slate/charcoal
      }
      
      headerRow.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      }
      
      headerRow.height = 28

      // Add data rows
      sheetConfig.data.forEach((rowData) => {
        const row = worksheet.addRow(rowData)
        row.height = 22
        row.font = {
          name: 'Inter',
          size: 10
        }
        row.alignment = {
          vertical: 'middle',
          horizontal: 'left'
        }
      })

      // Add borders and alignments
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } }
          }
          
          // If data cell looks like a number, align right
          if (rowNumber > 1 && typeof cell.value === 'number') {
            cell.alignment = { horizontal: 'right', vertical: 'middle' }
          }
        })
      })
    })

    // Write to buffer and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${filename}.xlsx`
    anchor.click()
    
    // Cleanup
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to export to Excel:', error)
    throw new Error('Could not export report to Excel. Please try again.')
  }
}
