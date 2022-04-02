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
// special React 18 thing
import * as ReactDOMClient from "react-dom/client"
import { ClusteringManager } from "./util/clustering"
import {
  COLORS,
  HEIGHT,
  PAUSE,
  SPLAT_MAX,
  SPLAT_MIN,
  WIDTH,
  ZOOM,
} from "./util/constants"
import {
  assertNever,
  Centroid,
  pick,
  Point,
  pointSorter,
  setId,
  splat,
} from "./util/data"
import { ClusterChart } from "./util/graph"
import { LabeledSlider } from "./util/slider"

const mdTheme = createTheme()

type ChartState = {
  data: Point[]
  centroids: Centroid[]
  // whether we are clustering constantly
  running: boolean
  // whether all clustering is concluded for the current data
  done: boolean
  // whether the centroids are ready for clustering
  initialized: boolean
  iterations: number
  time: number
  timeDelta: string
  nextAction: null | "cluster" | "centroids"
}

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
  const [splatStart, setSplatStart] = useState<null | Point>(null)
  const [state, setState] = useState<ChartState>({
    data: [],
    centroids: [],
    running: false,
    done: false,
    initialized: false,
    iterations: 0,
    time: 0,
    timeDelta: "",
    nextAction: null,
  })
  const {
    data,
    centroids,
    running,
    done,
    initialized,
    iterations,
    time,
    timeDelta,
    nextAction,
  } = state

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
        setSplatStart(null)
        setState({ ...state, done: false, data: data.concat(pile) })
      }
    }
  }
  // what to do when the mouse leaves the canvas
  const leave = () => {
    setSplatStart(null)
  }
  const mist = () => {
    const newData = [...data]
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * WIDTH
      const y = Math.random() * HEIGHT
      newData.push({ x, y })
    }
    setState({ ...state, data: newData })
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
    // sorting puts centroids last, so they're less likely to be covered
    data.sort(pointSorter)
    setState({
      ...clearBuffers(state),
      data: [...data],
      initialized: true,
      centroids: newCentroids as any as Centroid[],
    })
  }
  const clearBuffers = (state: ChartState): ChartState => ({
    ...state,
    done: false,
    time: 0,
    timeDelta: "",
    iterations: 0,
    initialized: false,
  })
  const clearData = (also: Partial<ChartState> = {}) => {
    setState({ ...clearBuffers(state), ...also, data: [] })
  }
  const clearAll = () => {
    clearData({ centroids: [] })
  }
  const cluster = () => {
    const t1 = new Date().getTime()
    clusterer.cluster(centroids, data).then((points) => {
      const delta = new Date().getTime() - t1
      setState({
        ...state,
        time: time + delta,
        data: points,
        nextAction: "centroids",
      })
    })
  }
  const calculateCentroids = () => {
    const t1 = new Date().getTime()
    const oldId = setId(centroids)
    clusterer.centroids(data).then((newCentroids) => {
      const newId = setId(newCentroids)
      const delta = new Date().getTime() - t1
      const t = time + delta
      const i = iterations + 1
      const td = Math.round(t / i).toString()
      let newState = { ...state, time: t, iterations: i, timeDelta: td }
      if (oldId === newId) {
        newState = { ...newState, done: true, running: false, nextAction: null }
      } else {
        newState = {
          ...newState,
          centroids: newCentroids,
          nextAction: running ? "cluster" : null,
        }
      }
      setState(newState)
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
  const interval = setTimeout(doNext, running ? PAUSE : 0)

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
                  const newState = { ...state, done: false }
                  if (n < clusterCount) {
                    for (const p of data) {
                      delete p.label
                    }
                    for (let i = 0; i < n; i++) {
                      const c = centroids[i]
                      if (c) c.label = COLORS[i]
                    }
                    newState.centroids = centroids.slice(0, n)
                  } else {
                    newState.initialized = false
                  }
                  setClusterCount(n)
                  setState(newState)
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
              <hr style={{ width: "100%", color: "aliceblue" }} />
              <LabeledSlider
                label="radius"
                min={2}
                max={10}
                value={radius}
                disabled={false}
                onChange={(n) => setRadius(n)}
              />
              <hr style={{ width: "100%", color: "aliceblue" }} />
              <Tooltip
                title="and some random data points distributed evenly across the field"
                arrow
                placement="right"
              >
                <span>
                  <Button variant="outlined" disabled={running} onClick={mist}>
                    Mist
                  </Button>
                </span>
              </Tooltip>
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
                    onClick={() =>
                      setState({
                        ...state,
                        running: true,
                        nextAction: "cluster",
                      })
                    }
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
                    onClick={() =>
                      setState({ ...state, nextAction: "cluster" })
                    }
                  >
                    Step
                  </Button>
                </span>
              </Tooltip>
              <Tooltip title="stop clustering" arrow placement="right">
                <span>
                  <Button
                    variant="outlined"
                    color="error"
                    disabled={!running}
                    onClick={() => {
                      clearInterval(interval)
                      setState({ ...state, running: false })
                    }}
                  >
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
                {...{ data, centroids, radius, done, running }}
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
  const rootEl = document.getElementById("app")!
  // special React 18 stuff
  const root = ReactDOMClient.createRoot(rootEl)
  root.render(<App />)
})
