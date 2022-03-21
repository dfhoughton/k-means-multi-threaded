import * as React from "react"
import * as d3 from "d3"
import { Point } from "./data"
import { useCallback, useEffect, useRef } from "react"
import { Typography } from "@mui/material"

export type ClusterChartProps = {
  data: Point[]
  width: number
  height: number
  radius: number
  startCallback: (p: Point) => void
  endCallback: (p: Point) => void
  leaveCallback: () => void
}

export const ClusterChart: React.FC<ClusterChartProps> = ({
  data,
  width,
  height,
  radius,
  startCallback,
  endCallback,
  leaveCallback,
}) => {
  const ref = useRef<null | HTMLDivElement>(null)
  useEffect(() => {
    console.log(data)
    let svg = d3.select(ref.current)
    svg.selectAll("*").remove() // clear existing graph

    svg.append("svg").attr("width", width).attr("height", height)

    svg = svg.select('svg')
    for (const {x, y, label} of data) {
        svg
        .append("circle")
        .style("stroke", "gray")
        .style("fill",  label ?? 'white')
        .attr("r", radius)
        .attr("cy", y)
        .attr("cx", x)
        }
    // .enter()
    // .data(data)
    // .append("circle")
    // .style("stroke", "gray")
    // .style("fill", ({label}) => label ?? 'white')
    // .attr("r", radius)
    // .attr("cy", ({ y }) => y)
    // .attr("cx", ({ x }) => x)
  }, [data, width, height, radius])
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const r = e.currentTarget.getBoundingClientRect()
      startCallback({ x: e.clientX - r.left, y: e.clientY - r.top })
    },
    [endCallback]
  )
  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const r = e.currentTarget.getBoundingClientRect()
      endCallback({ x: e.clientX - r.left, y: e.clientY - r.top })
    },
    [endCallback]
  )
  return (
    <Typography
      {...{ ref, onMouseDown, onMouseUp }}
      onMouseLeave={leaveCallback}
      sx={{ display: "table", border: "5px solid gray" }}
    />
  )
}
