/**
 * Data manipulation functions and types
 */

export type Point = {
  label?: string
  x: number
  y: number
}

// give each point the same label as the closest centroid
export const categorize = (points: Point[], centroids: Point[]) => {
  const [c, ...rest] = centroids
  for (const p of points) {
    let d = distance(p, c)
    let label = c.label
    for (const c2 of rest) {
      const d2 = distance(p, c2)
      if (d2 < d) {
        d = d2
        label = c2.label
      }
    }
    p.label = label
  }
}

// find the centroid of a set of points
export const centroid = (points: Point[], label?: string): Point => {
  let x = 0
  let y = 0
  for (const p of points) {
    x += p.x
    y += p.y
    label ??= p.label
  }
  x /= points.length
  y /= points.length
  return { x, y, label }
}

// pick n items randomly
export const pick = <T>(n: number, items: T[]): T[] => {
  const copy = [...items]
  const selection: T[] = []
  while (copy.length && selection.length < n) {
    const idx = Math.floor(copy.length * Math.random())
    selection.push(copy.splice(idx, 1)[0])
  }
  return selection
}

// produce a unique id for a set of points
// useful for recognizing when the clustering algorithm has converged
export const setId = (points: Point[]): string => {
  points = [...points]
  points.sort(({ x: x1, y: y1 }, { x: x2, y: y2 }) => {
    if (x1 < x2) return -1
    if (x2 < x1) return 1
    if (y1 < y2) return -1
    if (y2 < y1) return 1
    return 0
  })
  return points.map(({ x, y }) => `${x},${y}`).join(";")
}

// the euclidean distance between two points
const distance = (p1: Point, p2: Point): number => {
  const { x: x1, y: y1 } = p1
  const { x: x2, y: y2 } = p2
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))
}

// given a start point and and end point inside a rectangle, generates
// a random splat around the start point with the distance from the start to the end
// as the radius, filtering the points to those inside the rectangle
export const splat = ({
  start,
  end,
  width,
  height,
}: {
  start: Point
  end: Point
  width: number
  height: number
}): Point[] => {
  const { x, y } = start
  const radius = distance(start, end)
  const count = Math.max(Math.min(Math.round((radius / 10) ** 2), 100), 5)
  console.log({ radius, count })
  return randomSplat({ x, y, radius, count }).filter(
    ({ x, y }) => x >= 0 && x <= width && y >= 0 && y <= height
  )
}

// make a random splat of points centered at (x, y)
const randomSplat = ({
  x,
  y,
  radius,
  count,
}: {
  x: number
  y: number
  radius: number
  count: number
}): Point[] => {
  const splat: Point[] = []
  while (splat.length < count) {
    splat.push({
      x: shiver(jump(x, radius)),
      y: shiver(jump(y, radius)),
    })
  }
  return splat
}

// add a tiny random jitter to a number
const shiver = (n: number, magnitude: number = 2): number =>
  n + magnitude * (Math.random() < 0.5 ? -Math.random() : Math.random())

// shift n a random, binomially distributed amount with a maximum amount of radius
const jump = (n: number, radius: number, step: number = 2): number => {
  let steps = 0
  while (steps < radius) {
    let num = Math.floor(2 ** 16 * Math.random())
    while (num && steps < radius) {
      steps += 1
      n += (num & 1) === 1 ? step : -step
      num = num >> 1
    }
  }
  return n
}

// split an array into n roughly equal-length groups
// the extra items are distributed among the first groups
export const group = <T>(n: number, ar: T[]): T[][] => {
  let remainder = ar.length % n
  const segment = (ar.length - remainder) / n
  const groups = []
  for (let i = 0, offset = 0; i < n; i++) {
    const l = remainder ? segment + 1 : segment
    groups.push(ar.slice(offset, offset + l))
    offset += l
    if (remainder) remainder--
  }
  return groups
}
