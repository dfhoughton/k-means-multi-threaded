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
import { useEffect, useMemo, useState } from "react"
import * as ReactDOM from "react-dom"
import { ClusteringManager } from "./util/clustering"
import { assertNever, Centroid, pick, Point, setId, splat } from "./util/data"
import { ClusterChart } from "./util/graph"
import { LabeledSlider } from "./util/slider"

const mdTheme = createTheme()

const COLORS = [
  "rgb(173, 35, 35)", // red
  "rgb(129, 197, 122)", // lt green
  "rgb(42, 75, 215)", // blue
  "rgb(160, 160, 160)", // light gray
  "rgb(29, 105, 20)", // green
  "rgb(255, 238, 51)", // yellow
  "rgb(0, 0, 0)", // black
  "rgb(255, 146, 51)", // orange
  "rgb(129, 38, 192)", // purple
  "rgb(41, 208, 208)", // cyan
  "rgb(129, 74, 25)", // brown
  "rgb(255, 205, 243)", // pink
  "rgb(255, 255, 255)", // white
  "rgb(157, 175, 255)", // lt blue
  "rgb(233, 222, 187)", // tan
  "rgb(87, 87, 87)", // dark gray
] as const
const WIDTH = 800 as const
const HEIGHT = 800 as const
const ZOOM = 2.5 as const
const SPLAT_MIN = 5 as const
const SPLAT_MAX = 200 as const
const PAUSE = 2000 as const

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
  const [iterations, setIterations] = useState(0)
  const [timeBuffer, setTimeBuffer] = useState(0)
  const [nextAction, setNextAction] = useState<null | "cluster" | "centroids">(
    null
  )
  const [timeDelta, setTimeDelta] = useState("")

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
        zoom: ZOOM,
        min: SPLAT_MIN,
        max: SPLAT_MAX,
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
      newCentroids[i].label = COLORS[i]
    }
    setCentroids(newCentroids as any as Centroid[])
    clearBuffers()
    setInitialized(true)
    setData([...data])
  }
  const clearBuffers = () => {
    setDone(false)
    setTimeBuffer(0)
    setIterations(0)
    setTimeDelta("")
    setInitialized(false)
  }
  const clearData = () => {
    clearBuffers()
    setData([])
  }
  const clearAll = () => {
    setCentroids([])
    clearData()
  }
  const cluster = () => {
    const t1 = new Date().getTime()
    clusterer.cluster(centroids, data).then((points) => {
      const delta = new Date().getTime() - t1
      setTimeBuffer(timeBuffer + delta)
      setData(points)
      setNextAction("centroids")
    })
  }
  const calculateCentroids = () => {
    const t1 = new Date().getTime()
    const oldId = setId(centroids)
    clusterer.centroids(data).then((newCentroids) => {
      const newId = setId(newCentroids)
      const delta = new Date().getTime() - t1
      const t = timeBuffer + delta
      const i = iterations + 1
      const td = Math.round(t / i).toString()
      setTimeBuffer(t)
      setIterations(i)
      setTimeDelta(td)
      console.log({ i, td, oldId, newId })
      if (oldId === newId) {
        setDone(true)
        setRunning(false)
        setNextAction(null)
      } else {
        setCentroids(newCentroids)
        setNextAction(running ? "cluster" : null)
      }
    })
  }
  const doNext = () => {
    // act on current state
    switch (nextAction) {
      case "cluster":
        cluster()
        break
      case "centroids":
        calculateCentroids()
        break
      case null:
        break
      default:
        assertNever(nextAction)
    }
  }
  setTimeout(doNext, running ? PAUSE : 0)

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
                max={COLORS.length}
                value={clusterCount}
                disabled={running}
                onChange={(n) => {
                  setDone(false)
                  if (n < clusterCount) {
                    for (const p of data) {
                      delete p.label
                    }
                    for (let i = 0; i < n; i++) {
                      const c = centroids[i]
                      if (c) c.label = COLORS[i]
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
              <Tooltip title="start clustering loop" arrow placement="right">
                <span>
                  <Button
                    variant="outlined"
                    color="success"
                    disabled={done || running || !initialized}
                    onClick={() => {
                      setRunning(true)
                      setNextAction("cluster")
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
                    disabled={done || running || !initialized}
                    onClick={() => setNextAction("cluster")}
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
                <Box>{iterations ?? ""}</Box>
                <Typography variant="h6" component="h2">
                  Time/Iteration
                </Typography>
                <Box>{timeDelta}</Box>
              </Stack>
              <ClusterChart
                {...{ data, radius, done, running }}
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
