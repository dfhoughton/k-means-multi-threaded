// the stuff to do on a worker thread

import { ToWorker, FromWorker, LogLevel, LOG_LEVELS } from "./util/clustering"
import { assertNever, categorize, centroid, Centroid } from "./util/data"

let id: number = 0
let logLevel: LogLevel = "error"

// do not use this directly!
// instead, use one of info, debug, warn, or error
function log(level: LogLevel, args: any[]): void {
  if (LOG_LEVELS[logLevel] <= LOG_LEVELS[level]) {
    let f
    switch (level) {
      case "info":
        f = console.log
        break
      case "debug":
        f = console.debug
        break
      case "warn":
        f = console.warn
        break
      case "error":
        f = console.error
        break
      default:
        assertNever(level)
    }
    f(`[worker ${id}]`, ...args)
  }
}
function info(...args: any[]) {
  log("info", args)
}
function debug(...args: any[]) {
  log("debug", args)
}
function warn(...args: any[]) {
  log("warn", args)
}
function error(...args: any[]) {
  log("error", args)
}

self.onmessage = function (e) {
  const msg = e.data as ToWorker
  info("got", msg)
  switch (msg.action) {
    case "start":
      {
        id = msg.id
        const wasntVerbose = LOG_LEVELS[logLevel] < LOG_LEVELS[msg.logLevel]
        logLevel = msg.logLevel
        if (wasntVerbose && LOG_LEVELS[logLevel] <= LOG_LEVELS["info"])
          info("got", msg)
        reply({ action: "started", id })
      }
      break
    case "stop":
      reply({ action: "stopped", id })
      break
    case "resume":
      reply({ action: "started", id })
      break
    case "centroids":
      {
        const { labelsAndPoints, id: resolverId } = msg
        debug({ labelsAndPoints, id })
        const centroids: Centroid[] = []
        for (const [label, points] of labelsAndPoints) {
          centroids.push(centroid(points, label))
        }
        debug("I should be delivering the following centroids", centroids)
        reply({ action: "centroids", id, resolverId, centroids })
      }
      break
    case "cluster":
      {
        const { centroids, points, id: resolverId } = msg
        categorize(points, centroids)
        reply({ action: "clustered", id, resolverId, points })
      }
      break
    default:
      assertNever(msg)
  }
}

function reply(msg: FromWorker) {
  info("replied", msg)
  self.postMessage(msg)
}
