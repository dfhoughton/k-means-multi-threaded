import * as React from "react"
import * as d3 from "d3"
import { Point } from "./data"
import { useEffect, useRef, useState } from "react"
import { Box, Typography } from "@mui/material"

export type ClusterChartProps = {
  data: Point[]
  width: number
  height: number
  radius: number
  border: number
  startCallback: (p: Point) => void
  endCallback: (p: Point) => void
  leaveCallback: () => void
}

export const ClusterChart: React.FC<ClusterChartProps> = ({
  data,
  width,
  height,
  radius,
  border,
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
    for (const p of [up, down, ...data]) {
      if (!p) continue
      const { x, y, label, big } = p
      svg
        .append("circle")
        .style("stroke", "gray")
        .style("fill", label ?? "white")
        .attr("r", big ? radius * 1.5 : radius)
        .attr("cy", y)
        .attr("cx", x)
    }
  }, [data, width, height, radius, up, down])
  const onMouseDown = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    const newDown: Point = {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      big: true,
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
      big: true,
      label: "green",
    }
    setUp(newUp)
    setTimeout(() => {
      setUp(null)
      setDown(null)
    }, 800)
    endCallback(newUp)
  }
  return (
    <Box sx={{ display: "table", border: `${border}px solid gray` }}>
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
