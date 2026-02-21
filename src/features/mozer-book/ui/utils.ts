export const getNagSymbol = (nag: number) => {
  const map: Record<number, string> = {
    1: '!',
    2: '?',
    3: '!!',
    4: '??',
    5: '!?',
    6: '?!',
    7: '□',
    255: '!!!',
  }
  return map[nag] || ''
}

export const getNagColor = (nag: number) => {
  switch (nag) {
    case 1:
      return '#4caf50' // Green
    case 3:
      return '#00e676' // Bright Green
    case 2:
      return '#f44336' // Red
    case 4:
      return '#b71c1c' // Dark Red
    case 5:
      return '#2196f3' // Blue/Green
    case 6:
      return '#ff9800' // Orange
    case 7:
      return '#3f51b5' // Blue
    case 255:
      return 'var(--color-nag-255, #ff0496)'
    default:
      return 'inherit'
  }
}
