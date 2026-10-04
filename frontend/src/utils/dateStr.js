// Helpers for 'YYYY-MM-DD' strings in local time.

const pad = (n) => String(n).padStart(2, '0')

export const toDateStr = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const todayStr = () => toDateStr(new Date())

export const dateFromStr = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Whole days from a to b (Math.round absorbs DST shifts)
export const daysBetween = (a, b) =>
  Math.round((dateFromStr(b) - dateFromStr(a)) / 86400000)