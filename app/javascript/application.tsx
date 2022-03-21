// Entry point for the build script in your package.json
import {
  Box,
  Button,
  Container,
  createTheme,
  CssBaseline,
  Grid,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
} from "@mui/material"
import * as React from "react"
import { useCallback, useState } from "react"
import * as ReactDOM from "react-dom"
import { pick, Point, splat } from "./util/data"
import { ClusterChart } from "./util/graph"

const mdTheme = createTheme()

const colors =
  "#196040 #2e443e #acaf3f #24af63 #24b724 #a4e8b2 #366353 #64d6b9 #798740 #55665e".split(
    " "
  )

const App: React.FC = () => {
  const [threads, setThreads] = useState(1)
  const [clusterCount, setClusterCount] = useState(1)
  const [width, setWidth] = useState(500)
  const [height, setHeight] = useState(500)
  const [radius, setRadius] = useState(2)
  const [data, setData] = useState<Point[]>([])
  const [centroids, setCentroids] = useState<Point[]>([])
  const [splatStart, setSplatStart] = useState<null | Point>(null)

  // callbacks used for adding splats to the data
  const startSplat = useCallback((p: Point) => {
    setSplatStart(p)
  }, [])
  const endSplat = useCallback(
    (p: Point) => {
      if (splatStart) {
        const pile = splat({ start: splatStart, end: p, width, height })
        console.log("adding splat", pile)
        if (pile.length) {
          setData(data.concat(pile))
          setSplatStart(null)
        }
      }
    },
    [splatStart]
  )
  const leave = useCallback(() => {
    setSplatStart(null)
  }, [])

  // clustering callbacks
  const beginClustering = useCallback(() => {}, [])
  const clearData = useCallback(() => setData([]), [])
  const clearAll = useCallback(() => {
    setCentroids([])
    clearData()
  }, [])
  const clearClassifications = useCallback(() => {
    for (const d of data) {
      delete d.label
    }
    setData([...data])
  }, [data])
  const clearClusters = useCallback(() => {
    clearClassifications()
    setCentroids([])
  }, [clearClassifications])
  const startClustering = useCallback(() => {
    // TODO stop ongoing clustering -- this should probably be synchronous
    clearClusters()
    let newCentroids = pick(clusterCount, data)
    for (let i = 0; i < clusterCount; i++) {
      newCentroids[i].label = colors[i]
    }
    setCentroids(newCentroids)
    // TODO actually start things going
  }, [clearClusters, clusterCount])

  // aesthetic callbacks
  const changeWidth = useCallback((n: number) => {
    clearAll()
    setWidth(n)
  }, [])
  const changeHeight = useCallback((n: number) => {
    clearAll()
    setHeight(n)
  }, [])

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
            <TextField
                variant="outlined"
                type="number"
                label="clusters"
                value={clusterCount}
                inputProps={{ min: 1, max: colors.length, step: 1 }}
                onChange={(e) =>
                  setClusterCount(Number.parseInt(e.target.value))
                }
              />
              <TextField
                variant="outlined"
                type="number"
                label="threads"
                value={threads}
                inputProps={{ min: 1, max: 8, step: 1 }}
                onChange={(e) => setThreads(Number.parseInt(e.target.value))}
              />
              <TextField
                variant="outlined"
                type="number"
                label="width"
                value={width}
                inputProps={{ min: 100, max: 1000, step: 1 }}
                onChange={(e) => changeWidth(Number.parseInt(e.target.value))}
              />
              <TextField
                variant="outlined"
                type="number"
                label="height"
                value={height}
                inputProps={{ min: 100, max: 1000, step: 1 }}
                onChange={(e) => changeHeight(Number.parseInt(e.target.value))}
              />
              <TextField
                variant="outlined"
                type="number"
                label="radius"
                value={radius}
                inputProps={{ min: 2, max: 10, step: 1 }}
                onChange={(e) => setRadius(Number.parseInt(e.target.value))}
              />
              <Button variant="outlined" onClick={clearAll}>
                Clear Data
              </Button>
            </Stack>
            <ClusterChart
              {...{ data, width, height, radius }}
              startCallback={startSplat}
              endCallback={endSplat}
              leaveCallback={leave}
            />
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
