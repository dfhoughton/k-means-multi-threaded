/**
 * Data manipulation functions and types
 */

import { ZOOM } from "./constants"

export type Point = {
  label?: string
  x: number
  y: number
}

// a point which can be a centroid
export type Centroid = Required<Point>

// give each point the same label as the closest centroid
export const categorize = (points: Point[], centroids: Point[]) => {
  const [c, ...rest] = centroids
  for (const p of points) {
    let d = squaredDistance(p, c)
    let label = c.label
    for (const c2 of rest) {
      const d2 = squaredDistance(p, c2)
      if (d2 < d) {
        d = d2
        label = c2.label
      }
    }
    p.label = label
  }
}

// general sorting algorithm for points
export const pointSorter = (
  { x: x1, y: y1, label: l1 = "" }: Point,
  { x: x2, y: y2, label: l2 = "" }: Point
): number => {
  // put ungrouped group before group other groups and put groups together
  if (l1 < l2) return -1
  if (l2 < l1) return 1
  // within a group, sort by position
  if (x1 < x2) return -1
  if (x2 < x1) return 1
  if (y1 < y2) return -1
  if (y2 < y1) return 1
  return 0
}

// find the centroid of a set of points
export const centroid = (points: Point[], label: string): Centroid => {
  let x = 0
  let y = 0
  for (const p of points) {
    x += p.x
    y += p.y
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

// make a unique *spatial* identifier for a point
export const pointId = ({ x, y }: Point): string => `${x},${y}`

// produce a unique id for a set of points
// useful for recognizing when the clustering algorithm has converged
export const setId = (points: Point[]): string => {
  points = [...points]
  points.sort(pointSorter)
  return points.map((p) => pointId(p)).join(";")
}

// the euclidean distance between two points
const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(squaredDistance(p1, p2))
}

// the euclidean distance between two points
const squaredDistance = (p1: Point, p2: Point): number => {
  const { x: x1, y: y1 } = p1
  const { x: x2, y: y2 } = p2
  return Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)
}


// given a start point and and end point inside a rectangle, generates
// a random splat around the start point with the distance from the start to the end
// as the radius, filtering the points to those inside the rectangle
export const splat = ({
  start,
  end,
  width,
  height,
  zoom,
  min,
  max,
}: {
  start: Point
  end: Point
  width: number
  height: number
  zoom: number
  min: number
  max: number
}): Point[] => {
  const { x, y } = start
  const radius = distance(start, end)
  const count = Math.max(Math.min(Math.round((radius / 10) ** 2), max), min)
  return randomSplat({ x, y, radius, count, zoom }).filter(
    ({ x, y }) => x >= 0 && x <= width && y >= 0 && y <= height
  )
}

// make a random splat of points centered at (x, y)
const randomSplat = ({
  x,
  y,
  radius,
  count,
  zoom,
}: {
  x: number
  y: number
  radius: number
  count: number
  zoom: number
}): Point[] => {
  const splat: Point[] = []
  while (splat.length < count) {
    const [dx, dy] = swivel(shiver(jump(0, radius, zoom)))
    splat.push({
      x: x + dx,
      y: y + dy,
    })
  }
  return splat
}

function swivel(n: number): [number, number] {
  const theta = 2 * Math.PI * Math.random()
  return [n * Math.cos(theta), n * Math.sin(theta)]
}

// add a tiny random jitter to a number
const shiver = (n: number): number =>
  n + ZOOM * (Math.random() < 0.5 ? -Math.random() : Math.random())

// shift n a random, binomially distributed amount with a maximum amount of radius
const jump = (n: number, radius: number, step: number = 2): number => {
  let steps = 0,
    offset = 0
  while (steps < radius) {
    let num = ~~((2 ** 16 - 1) * Math.random())
    while (steps < radius) {
      if (num === 1) break
      steps += 1
      offset += (num & 1) === 1 ? step : -step
      num = num >> 1
    }
  }
  return n + offset
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

// zip together two arrays of the same length
export const zip = <T, K>(ar1: T[], ar2: K[]): [T, K][] => {
  if (ar1.length !== ar2.length)
    throw new Error("you can only zip arrays of the same length")
  const ar = []
  for (let i = 0; i < ar1.length; i++) {
    ar.push([ar1[i]!, ar2[i]!] as [T, K])
  }
  return ar
}

// exhaustiveness checker
export function assertNever(x: never): never {
  console.error(x)
  throw new Error("Unexpected object: " + x)
}
