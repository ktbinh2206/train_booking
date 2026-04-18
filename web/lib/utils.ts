import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrencyVND(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatDateVn(value: string | number | Date, options?: Intl.DateTimeFormatOptions) {
  return new Date(value).toLocaleDateString('vi-VN', options)
}

export function formatDateTimeVn(value: string | number | Date, options?: Intl.DateTimeFormatOptions) {
  return new Date(value).toLocaleString('vi-VN', options)
}

export function toLocalYmd(value: Date = new Date()) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toVnYmd(value: string | number | Date) {
  const date = new Date(value)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  return formatter.format(date)
}
