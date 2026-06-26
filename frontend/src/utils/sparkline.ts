export interface SparklineData {
  points: string
  lastX: number
  lastY: number
}

export function buildSparkline(
  prices: number[],
  width: number,
  height: number,
): SparklineData | null {
  if (prices.length < 2) return null

  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 0.01
  const pad = 3

  const pts = prices.map((p, i) => ({
    x: parseFloat(((i / (prices.length - 1)) * (width - pad * 2) + pad).toFixed(1)),
    y: parseFloat((height - pad - ((p - min) / range) * (height - pad * 2)).toFixed(1)),
  }))

  return {
    points: pts.map(p => `${p.x},${p.y}`).join(' '),
    lastX: pts[pts.length - 1].x,
    lastY: pts[pts.length - 1].y,
  }
}

export function getPriceTrend(
  lastPrice?: number | null,
  avgPrice?: number | null,
): 'up' | 'down' | 'stable' | null {
  if (!lastPrice || !avgPrice) return null
  const ratio = lastPrice / avgPrice
  if (ratio > 1.05) return 'up'
  if (ratio < 0.95) return 'down'
  return 'stable'
}