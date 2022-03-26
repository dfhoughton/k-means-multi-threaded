// Entry point for the build script in your package.json
import {
  Box,
  Button,
  createTheme,
  CssBaseline,
  debounce,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
} from "@mui/material"
import * as React from "react"
import { useCallback, useEffect, useState } from "react"
import * as ReactDOM from "react-dom"
import { ClusteringManager } from "./util/clustering"
import {
  Centroid,
  pick,
  Point,
  splat,
} from "./util/data"
import { ClusterChart } from "./util/graph"
import { LabeledSlider } from "./util/slider"

const mdTheme = createTheme()

const colors =
  "#196040 #2e443e #acaf3f #24af63 #24b724 #a4e8b2 #366353 #64d6b9 #798740 #55665e".split(
    " "
  )

const App: React.FC = () => {
  const [threads, setThreads] = useState(1)
  const [clusterer] = useState(
    new ClusteringManager(
      threads,
      (document.getElementById("worker") as any).src
    )
  )
  const [clusterCount, setClusterCount] = useState(1)
  const [width, setWidth] = useState(600)
  const [unbouncedWidth, setUnbouncedWidth] = useState<number | "">(width)
  const [height, setHeight] = useState(600)
  const [unbouncedHeight, setUnbouncedHeight] = useState<number | "">(height)
  const [radius, setRadius] = useState(3)
  const [data, setData] = useState<Point[]>([])
  const [running, setRunning] = useState(false)
  const [centroids, setCentroids] = useState<Centroid[]>([])
  const [splatStart, setSplatStart] = useState<null | Point>(null)
  const [iterations, setIterations] = useState<undefined | number>(undefined)
  const [totalTime, setTotalTime] = useState(0)

  useEffect(() => clusterer.stop(), [])

  // callbacks used for adding splats to the data
  const startSplat = (p: Point) => {
    setSplatStart(p)
  }
  const endSplat = (p: Point) => {
    if (splatStart) {
      const pile = splat({
        start: splatStart,
        end: p,
        width,
        height,
        zoom: 2.5,
      })
      if (pile.length) {
        setData(data.concat(pile))
        setSplatStart(null)
      }
    }
  }
  const leave = () => {
    setSplatStart(null)
  }

  const pickCentroids = () => {
    const newCentroids = pick(clusterCount, data)
    for (const p of data) {
      delete p.label
    }
    for (let i = 0; i < newCentroids.length; i++) {
      newCentroids[i].label = colors[i]
    }
    setCentroids(newCentroids as any as Centroid[])
    setData([...data])
  }
  const clearData = () => setData([])
  const clearAll = () => {
    setCentroids([])
    clearData()
  }
  const changeWidth = useCallback(
    debounce((n) => setWidth(n), 500),
    []
  )
  const changeHeight = useCallback(
    debounce((n) => setHeight(n), 500),
    []
  )

  return (
    <ThemeProvider theme={mdTheme}>
      <Box component="main" sx={{ p: 5 }}>
        <CssBaseline />
        <Stack direction="column" alignItems="center" spacing={5}>
          <Typography variant="h4" component="h1">
            Multi-threaded K-Means Clustering with Web Workers
          </Typography>
          <Stack direction="row" alignItems="center" spacing={5}>
            <Stack direction="column" alignItems="center" spacing={2}>
              <LabeledSlider
                label="clusters"
                min={1}
                max={colors.length}
                value={clusterCount}
                onChange={(n) => setClusterCount(n)}
              />
              <LabeledSlider
                label="threads"
                min={1}
                max={8}
                value={threads}
                onChange={(n) => setThreads(n)}
              />
              <LabeledSlider
                label="radius"
                min={2}
                max={10}
                value={radius}
                onChange={(n) => setRadius(n)}
              />
              <TextField
                variant="outlined"
                type="number"
                label="width"
                value={unbouncedWidth}
                inputProps={{ min: 100, max: 1000, step: 1 }}
                onChange={(e) => {
                  const v = e.target.value
                  if (!v) {
                    setUnbouncedWidth("")
                  } else {
                    const n = Number.parseInt(v)
                    setUnbouncedWidth(n)
                    changeWidth(n)
                  }
                }}
              />
              <TextField
                variant="outlined"
                type="number"
                label="height"
                value={unbouncedHeight}
                inputProps={{ min: 100, max: 1000, step: 1 }}
                onChange={(e) => {
                  const v = e.target.value
                  if (!v) {
                    setUnbouncedHeight("")
                  } else {
                    const n = Number.parseInt(v)
                    setUnbouncedHeight(n)
                    changeHeight(n)
                  }
                }}
              />
              <Button
                variant="outlined"
                disabled={clusterCount > data.length}
                onClick={pickCentroids}
              >
                Pick
              </Button>
              <Button variant="outlined" color="success">
                Go
              </Button>
              <Button variant="outlined" color="warning">
                Step
              </Button>
              <Button variant="outlined" color="error">
                Stop
              </Button>
              <Button variant="outlined" onClick={clearAll}>
                Clear
              </Button>
            </Stack>
            <Stack direction="column" alignItems="center" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="h6" component="h2">
                  Points
                </Typography>
                <Box>{data.length}</Box>
                <Typography variant="h6" component="h2">
                  Iterations
                </Typography>
                <Box>{iterations}</Box>
                <Typography variant="h6" component="h2">
                  Time/Iteration
                </Typography>
                <Box>{iterations && totalTime / iterations}</Box>
              </Stack>
              <ClusterChart
                {...{ data, width, height, radius }}
                border={4}
                startCallback={startSplat}
                endCallback={endSplat}
                leaveCallback={leave}
              />
            </Stack>
          </Stack>
        </Stack>
      </Box>
    </ThemeProvider>
  )
}

document.addEventListener("DOMContentLoaded", () => {
  const rootEl = document.getElementById("app")
  ReactDOM.render(<App />, rootEl)
})
