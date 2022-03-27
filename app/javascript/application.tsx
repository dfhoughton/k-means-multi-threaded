// Entry point for the build script in your package.json
import {
  Box,
  Button,
  createTheme,
  CssBaseline,
  Stack,
  ThemeProvider,
  Tooltip,
  Typography,
} from "@mui/material"
import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import * as ReactDOM from "react-dom"
import { ClusteringManager } from "./util/clustering"
import { Centroid, pick, Point, setId, splat } from "./util/data"
import { ClusterChart } from "./util/graph"
import { LabeledSlider } from "./util/slider"

const mdTheme = createTheme()

const colors =
  "#196040 #2e443e #acaf3f #24af63 #24b724 #a4e8b2 #366353 #64d6b9 #798740 #55665e".split(
    " "
  )

const WIDTH = 600 as const
const HEIGHT = 600 as const

const App: React.FC = () => {
  const [threads, setThreads] = useState(1)
  const clusterer = useMemo(
    () =>
      new ClusteringManager(
        threads,
        (document.getElementById("worker") as any).src,
        "debug" // configure the log verbosity here
      ),
    []
  )
  const [clusterCount, setClusterCount] = useState(1)
  const [radius, setRadius] = useState(3)
  const [data, setData] = useState<Point[]>([])
  // whether we are clustering constantly
  const [running, setRunning] = useState(false)
  // whether all clustering is concluded for the current data
  const [done, setDone] = useState(false)
  // whether the centroids are ready for clustering
  const [initialized, setInitialized] = useState(false)
  const [centroids, setCentroids] = useState<Centroid[]>([])
  const [splatStart, setSplatStart] = useState<null | Point>(null)
  const [iterations, setIterations] = useState<undefined | number>(undefined)
  const [totalTime, setTotalTime] = useState(0)

  useEffect(() => () => clusterer.stop(), [])

  // callbacks used for adding splats to the data
  const startSplat = (p: Point) => {
    setSplatStart(p)
  }
  const endSplat = (p: Point) => {
    if (splatStart) {
      const pile = splat({
        start: splatStart,
        end: p,
        width: WIDTH,
        height: HEIGHT,
        zoom: 2.5,
      })
      if (pile.length) {
        setDone(false)
        setData(data.concat(pile))
        setSplatStart(null)
      }
    }
  }
  // what to do when the mouse leaves the canvas
  const leave = () => {
    setSplatStart(null)
  }

  // clustering callbacks
  const pickCentroids = () => {
    const newCentroids = pick(clusterCount, data)
    for (const p of data) {
      delete p.label
    }
    for (let i = 0; i < newCentroids.length; i++) {
      newCentroids[i].label = colors[i]
    }
    setCentroids(newCentroids as any as Centroid[])
    setInitialized(true)
    setDone(false)
    setData([...data])
  }
  const clearData = () => setData([])
  const clearAll = () => {
    setDone(false)
    setCentroids([])
    clearData()
  }
  const cluster = () => {
    const t1 = new Date()
    clusterer.cluster(centroids, data).then((points) => {
      const t2 = new Date()
      setData(points)
      setTotalTime(Number(totalTime) + t2.getTime() - t1.getTime())
      setIterations((iterations ?? 0) + 1)
      calculateCentroids()
    })
  }
  const calculateCentroids = () => {
    clusterer.centroids(data).then((newCentroids) => {
      if (setId(centroids) === setId(newCentroids)) {
        setDone(true)
        setRunning(false)
      } else {
        setCentroids(newCentroids)
        if (running) cluster()
      }
    })
  }

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
                disabled={running}
                onChange={(n) => {
                  setDone(false)
                  if (n < clusterCount) {
                    for (const p of data) {
                      delete p.label
                    }
                    for (let i = 0; i < n; i++) {
                      centroids[i].label = colors[i]
                    }
                    setCentroids(centroids.slice(0, n))
                  } else {
                    setInitialized(false)
                  }
                  setClusterCount(n)
                }}
              />
              <LabeledSlider
                label="threads"
                min={1}
                max={8}
                value={threads}
                disabled={running}
                onChange={(n) => {
                  setThreads(n)
                  clusterer.threads = n
                }}
              />
              <LabeledSlider
                label="radius"
                min={2}
                max={10}
                value={radius}
                disabled={false}
                onChange={(n) => setRadius(n)}
              />
              <Tooltip
                title="pick a random set of nodes to be initial cluster centroids"
                arrow
                placement="right"
              >
                <span>
                  <Button
                    variant="outlined"
                    disabled={running || clusterCount > data.length}
                    onClick={pickCentroids}
                  >
                    Pick
                  </Button>
                </span>
              </Tooltip>
              <Tooltip
                title="start clustering without pause"
                arrow
                placement="right"
              >
                <span>
                  <Button
                    variant="outlined"
                    color="success"
                    disabled={running || !initialized}
                    onClick={() => {
                      setRunning(true)
                      cluster()
                    }}
                  >
                    Go
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="cluster once" arrow placement="right">
                <span>
                  <Button
                    variant="outlined"
                    color="warning"
                    disabled={running || !initialized}
                    onClick={cluster}
                  >
                    Step
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="stop clustering" arrow placement="right">
                <span>
                  <Button variant="outlined" color="error" disabled={!running}>
                    Stop
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="remove all data" arrow placement="right">
                <span>
                  <Button
                    variant="outlined"
                    onClick={clearAll}
                    disabled={running || data.length === 0}
                  >
                    Clear
                  </Button>
                </span>
              </Tooltip>
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
                <Box>{iterations ?? ''}</Box>
                <Typography variant="h6" component="h2">
                  Time/Iteration
                </Typography>
                <Box>{iterations ? totalTime / iterations : ''}</Box>
              </Stack>
              <ClusterChart
                {...{ data, radius }}
                width={WIDTH}
                height={HEIGHT}
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
