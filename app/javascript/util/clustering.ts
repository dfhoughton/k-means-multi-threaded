/**
 * Manages communication with the worker threads. This is basically a thread pool with a custom purpose.
 */

import { assertNever, Centroid, group, Point, pointSorter, zip } from "./data"

export type ToWorker =
  | StartMsg
  | StopMsg
  | CalculateCentroidMsg
  | ClusterMsg
  | ResumeMsg

type StartMsg = {
  action: "start"
  id: number
  logLevel: LogLevel
}

type StopMsg = {
  action: "stop"
}

type ResumeMsg = {
  action: "resume"
}

type CalculateCentroidMsg = {
  action: "centroids"
  id: number // resolver id
  labelsAndPoints: [string, Point[]][]
}

type ClusterMsg = {
  action: "cluster"
  id: number // resolver id
  centroids: Centroid[]
  points: Point[]
}

export type FromWorker = StartedMsg | StoppedMsg | CentroidMsg | ClusteredMsg

type StartedMsg = {
  action: "started"
  id: number
}

type StoppedMsg = {
  action: "stopped"
  id: number
}

type CentroidMsg = {
  action: "centroids"
  id: number
  resolverId: number
  centroids: Centroid[]
}

type ClusteredMsg = {
  action: "clustered"
  id: number
  resolverId: number
  points: Point[]
}

export const LOG_LEVELS = {
  info: 0, debug: 1, warn: 2, error: 3
} as const

export type LogLevel = "info" | "debug" | "warn" | "error"

// the thread pool manager
export class ClusteringManager {
  private workerResolvers: Array<(workers: Worker[]) => void> = []
  private baseResolverId = 1
  private resolverMap: Map<number, (...args: any) => void> = new Map()
  private stopped = false
  private terminatedThreads: Set<number> = new Set()
  private availableThreads: Set<number> = new Set()
  private availableIndices: number[] = []
  private workerSource!: string
  private _threads = 0
  private workers: Array<Worker | null> = []
  private logLevel: LogLevel = "error"
  public get threads(): number {
    return this._threads
  }
  // setter is useful so we can manage the threads
  public set threads(value: number) {
    if (this.stopped) return
    if (value === 0) throw new Error("you must have at least one thread")
    while (this.threads < value) this.addThread()
    while (this.threads > value) this.removeThread()
  }

  constructor(threads: number, workerSource: string, logLevel: LogLevel = "warn") {
    this.workerSource = workerSource
    this.logLevel = logLevel
    for (let i = 0; i < threads; i++) {
      this.addThread()
    }
  }

  // recalculate the centroids of the clusters in the points
  public async centroids(points: Point[]): Promise<Centroid[]> {
    // partition the points up into their clusters
    const map: Map<string, Point[]> = new Map()
    for (const p of points) {
      const { label = "" } = p
      let ar = map.get(label) ?? []
      map.set(label, ar)
      ar.push(p)
    }
    const partitions: [string, Point[]][] = Array.from(map.entries())
    let workers = await this.getWorkers()
    // return unneeded workers
    for (let i = partitions.length; i < workers.length; i++) {
      this.send(workers[i], { action: "resume" })
    }
    // reduce down to the needed array
    workers = workers.slice(0, partitions.length)
    // send off all the centroid work to the workers
    const promises = zip(workers, group(workers.length, partitions)).map(
      ([w, labelsAndPoints]) => this.doSomeCentroids(w, labelsAndPoints)
    )
    return new Promise((resolve, _reject) => {
      Promise.all(promises).then((centroids) => {
        let newCentroids = centroids.shift()!
        for (const otherCentroids of centroids) {
          newCentroids = newCentroids.concat(otherCentroids)
        }
        newCentroids.sort(pointSorter)
        resolve(newCentroids)
      })
    })
  }

  // recalculate the clusters
  public async cluster(centroids: Centroid[], points: Point[]): Promise<Point[]> {
    const workers = await this.getWorkers()
    const promises = zip(workers, group(workers.length, points)).map(
      ([worker, points]) => this.doOneClustering(worker, centroids, points)
    )
    return new Promise((resolve, _reject) => {
      Promise.all(promises).then((parts) => {
        let newPoints = parts.shift()!
        for (const otherPart of parts) {
          newPoints = newPoints.concat(otherPart)
        }
        newPoints.sort(pointSorter)
        resolve(newPoints)
      })
    })
  }

  // don't use this directly! use one of info, debug, warn, or error
  private _log(level: LogLevel, args: any[]): void {
    if (LOG_LEVELS[this.logLevel] <= LOG_LEVELS[level]) {
      let f
      switch (level) {
        case "info":
          f = console.log
          break
        case "debug":
          args.unshift('[debug]')
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
      f('[main]', ...args)
    }
  }
  private info(...args: any[]) { this._log("info", args)}
  private debug(...args: any[]) { this._log("debug", args)}
  private warn(...args: any[]) { this._log("warn", args)}
  private error(...args: any[]) { this._log("error", args)}
  private removeThread() {
    if (this.stopped) return
    if (this._threads === 1)
      throw new Error("you must have at least one thread")
    for (let i = this.workers.length - 1; i--; i >= 0) {
      const w = this.workers[i]
      if (w && !this.terminatedThreads.has(i)) {
        this.availableThreads.delete(i)
        this.terminatedThreads.add(i)
        this.send(w, { action: "stop" })
        this._threads -= 1
        return
      }
    }
    throw new Error("could not find a thread to terminate")
  }
  private addThread() {
    if (this.stopped) return
    const me = this
    const w = new Worker(this.workerSource)
    const handler = function (e: MessageEvent) {
      me.handleMsg(e.data as FromWorker)
    }
    w.onmessage = handler.bind(w)
    const id = this.getNextWorkerIndex()
    this.send(w, { action: "start", id, logLevel: this.logLevel })
    this.workers[id] = w
    this._threads += 1
  }
  // type checking of sent messages
  private send(w: Worker, msg: ToWorker) {
    this.info('sending', msg)
    w.postMessage(msg)
  }
  private nextResolverId() {
    const id = this.baseResolverId
    this.baseResolverId += 1
    return id
  }
  private workersAvailable(): undefined | Worker[] {
    if (!this.stopped && this.availableThreads.size === this.threads) {
      const ar: Worker[] = []
      for (const i of this.availableThreads.keys()) {
        ar.push(this.workers[i]!)
      }
      this.availableThreads.clear()
      return ar
    }
  }
  private getNextWorkerIndex(): number {
    return this.availableIndices.pop() ?? this.workers.length
  }
  // turns workersAvailable into a promise
  private async getWorkers(): Promise<Worker[]> {
    return new Promise((resolve, _reject) => {
      const workers = this.workersAvailable()
      if (workers) {
        this.availableThreads.clear()
        resolve(workers)
      } else {
        this.workerResolvers.push(resolve)
      }
    })
  }
  private async doSomeCentroids(
    w: Worker,
    labelsAndPoints: [string, Point[]][]
  ): Promise<Centroid[]> {
    return new Promise((resolve, _reject) => {
      const id = this.nextResolverId()
      this.resolverMap.set(id, resolve)
      this.send(w, { action: "centroids", id, labelsAndPoints })
    })
  }
  private async doOneClustering(
    w: Worker,
    centroids: Centroid[],
    points: Point[]
  ): Promise<Point[]> {
    return new Promise((resolve, _reject) => {
      const id = this.nextResolverId()
      this.resolverMap.set(id, resolve)
      this.send(w, { action: "cluster", id, centroids, points })
    })
  }

  // a thread just became available; see if we can do some work again
  private checkForWork(id: number) {
    this.availableThreads.add(id)
    // do we already have some work queued up?
    if (this.workerResolvers.length) {
      const workers = this.workersAvailable()
      if (workers) {
        const r = this.workerResolvers.shift()!
        this.availableThreads.clear()
        r(workers)
      }
    }
  }
  // a thread finished some task; wrap things up
  private handleMsg(msg: FromWorker) {
    if (this.stopped) return
    this.info('handling', msg)
    switch (msg.action) {
      case "stopped":
        const w = this.workers[msg.id]
        this.terminatedThreads.delete(msg.id)
        w?.terminate()
        this.workers[msg.id] = null
        this.availableIndices.push(msg.id)
        break
      case "started":
        this.availableThreads.add(msg.id)
        this.checkForWork(msg.id)
        break
      case "centroids":
        {
          const { id, centroids, resolverId } = msg
          const r = this.resolverMap.get(resolverId)!
          this.resolverMap.delete(resolverId)
          r(centroids)
          this.checkForWork(id)
        }
        break
      case "clustered":
        {
          const { id, points, resolverId } = msg
          const r = this.resolverMap.get(resolverId)!
          this.resolverMap.delete(resolverId)
          r(points)
          this.checkForWork(id)
        }
        break
      default:
        assertNever(msg)
    }
  }

  // rudely stop all threads regardless of their current state
  stop() {
    this.info('stopping')
    this.stopped = true
    for (const w of this.workers) {
      w?.terminate()
    }
    this.workers.length = 0
  }
}
