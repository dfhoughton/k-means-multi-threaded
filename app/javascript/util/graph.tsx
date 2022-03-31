import * as React from "react"
import * as d3 from "d3"
import { Centroid, Point } from "./data"
import { useEffect, useRef, useState } from "react"
import { Box, Typography } from "@mui/material"

export type ClusterChartProps = {
  data: Point[]
  centroids: Centroid[]
  width: number
  height: number
  radius: number
  border: number
  done: boolean
  running: boolean
  startCallback: (p: Point) => void
  endCallback: (p: Point) => void
  leaveCallback: () => void
}

export const ClusterChart: React.FC<ClusterChartProps> = ({
  data,
  centroids,
  width,
  height,
  radius,
  border,
  done,
  running,
  startCallback,
  endCallback,
  leaveCallback,
}) => {
  let [down, setDown] = useState<Point | null>(null)
  let [up, setUp] = useState<Point | null>(null)
  const ref = useRef<null | HTMLDivElement>(null)
  useEffect(() => {
    let svg = d3.select(ref.current)
    svg.selectAll("*").remove() // clear existing graph

    svg.append("svg").attr("width", width).attr("height", height)

    svg = svg.select("svg")
    for (const { x, y, label } of data) {
      svg
        .append("circle")
        .style("stroke", "gray")
        .style("fill", label ?? "white")
        .attr("r", radius)
        .attr("cy", y)
        .attr("cx", x)
    }
    for (const { x, y, label } of centroids) {
      svg
        .append("circle")
        .style("stroke", "red")
        .style("fill", label)
        .attr("r", radius * 2)
        .attr("cy", y)
        .attr("cx", x)
    }
    for (const p of [up, down]) {
      if (!p) continue
      const { x, y, label } = p
      svg
        .append("circle")
        .style("stroke", "gray")
        .style("fill", label ?? "white")
        .attr("r", radius * 1.5)
        .attr("cy", y)
        .attr("cx", x)
    }
  }, [data, width, height, radius, up, down])
  const onMouseDown = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    const newDown: Point = {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      label: "red",
    }
    setDown(newDown)
    setUp(null)
    startCallback(newDown)
  }
  const onMouseUp = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    const newUp = {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      label: "green",
    }
    setUp(newUp)
    setTimeout(() => {
      setUp(null)
      setDown(null)
    }, 800)
    endCallback(newUp)
  }
  const color = done ? "green" : running ? "orange" : "gray"
  return (
    <Box
      sx={{
        display: "table",
        border: `${border}px solid ${color}`,
      }}
    >
      <Typography
        {...{ ref, onMouseDown, onMouseUp }}
        onMouseLeave={() => {
          setDown(null)
          setUp(null)
          leaveCallback()
        }}
      />
    </Box>
  )
}
