// the stuff to do on a worker thread

import { ToWorker, FromWorker } from "./util/clustering"
import { assertNever, categorize, centroid, Centroid } from "./util/data"

let id: number = 0

self.onmessage = function (e) {
  const msg = e.data as ToWorker
  switch (msg.action) {
    case "start":
      {
        id = msg.id
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
        const centroids: Centroid[] = []
        for (const [label, points] of labelsAndPoints) {
          centroids.push(centroid(points, label))
        }
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
  self.postMessage(msg)
}
