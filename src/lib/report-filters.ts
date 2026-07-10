export interface ReportDateRange {
  dateFrom?: string
  dateTo?: string
}

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return !Number.isNaN(new Date(value).getTime())
}

export function validateReportDateRange({ dateFrom, dateTo }: ReportDateRange): string | null {
  if (dateFrom && !isValidDateInput(dateFrom)) {
    return 'Start date is invalid.'
  }

  if (dateTo && !isValidDateInput(dateTo)) {
    return 'End date is invalid.'
  }

  if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
    return 'Start date cannot be later than end date.'
  }

  return null
}
