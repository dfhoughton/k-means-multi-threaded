# README

This is meant to be a minimal rails app doing something interesting with web workers.
It was initialized like so:

```
rails new --skip-action-mailer --skip-active-storage --skip-action-cable --skip-action-text --skip-jbuilder --skip-action-mailbox --skip-active-record --skip-active-job --skip-hotwire -j esbuild k-means-multi-threaded
```

As you can see, I'm skipping almost everything. There's no database, no mailers, no web sockets.
There is no initialization step.

What there will be:
- web workers
- esbuild
- D3
- React
- Material-UI

React and MUI are in there because we, [Green River](https://www.greenriver.com/), are sort of committed to them at this point,
so I figure go with the familiar. Besides, there will be a wee bit of state management: we want to create workers, which is a little heavy,
only when needed, and certainly not with every render.

D3 is in there because I need to draw the dots being clustered. Also, I figure it's a tool I should be more comfortable with.

Esbuild is in there because it's bloody fast and I'm impatient.

## Running the app

As is the new Rails 7 way, you run `bin/dev`. See `Procfile.dev`. This defines the processes that `bin/dev` will set going.
I've modified the default `bin/dev` to use overmind if that is installed, foreman otherwise.

## K-means clustering

This project was inspired by reading [Introduction to K-Means Clustering](https://www.pinecone.io/learn/k-means-clustering/) when
it popped up in Hacker News. K-means clustering is basically [Newton's method](https://en.wikipedia.org/wiki/Newton%27s_method) applied
to clustering. You have points that you want to cluster in some space with a particular distance metric. You pick a number `k` of
clusters and by some method -- random selection or educated guessing or whatever -- you pick `k` of these points to serve as
initial centroids -- center points -- of these clusters. You then measure the distance of all the other points to these centroids
and add each one to the cluster of the centroid it's closest too. Then you calculate the average of all the points in a given cluster.
That is the cluster's new centroid (it likely does not coincide with any of the points clustered). Then you repeat. When you
achieve some degree of stability, you call it done. (In this implementation, it's when you achieve complete stability: the centroids don't move from one iteration to the next.)

The theory of clustering underlying k-means is that each cluster can be characterized by a single point: its centroid. This works well
for compact clusters with linear boundaries between them. It works poorly for clusters based on local cohesion, so, for example, suppose your data is laid out like a crescent with a star inside its arc. You want the crescent to be one cluster and the star the other. K-means is going to try
in essence to find two centroids with a dividing line between them. This is necessarily going to intersect the crescent at least once, maybe twice.

The point of this app isn't to satisfy all your clustering needs, only to demonstrate one way to make a thread pool with web workers. Also,
its animation is pretty.

## Parallelism

Because the clustering algorithm consists of many calculations, which are all independent of
each other within a given clustering step, it is very easy to parallelize. If you have `n` worker threads, you divide your list
of points up into `n` segments of (near) equal length, give every worker the list of centroids and its segment, and let each one
cluster the points in its segment. You need very little communication among threads, just the input and the output. To calculate a
new centroid a given thread needs all the points belonging to that centroid, so the data has to be batched by centroids. The parallelism
isn't as neat in this case, but at least it's only half the process, and the lighter half at that -- a bunch of addition followed by one
division.

## The thread pool

The task to parallelize in this case has two stages that always occur in sequence in a repeating loop. Each stage is parallelized, but each
must complete before the other begins. The thread pool, therefore, is designed for tasks that split into parallel parts which then wait on a
cyclic barrier. Also, there is no priority among the subtasks. It is not a generic thread pool, in other words. It should work for any algorithm
with this sausage links in a circle structure.

## Using the app

The procedure:
- you create some data by laying down "splats" in the square on the right
- you specify a number of clusters and threads
- you "pick" as many seed centroids as you want clusters
- you set things going
  - "step" performs one iteration
  - "go" starts a loop going that iterates until equilibrium is reached or you click "stop"
    - while things are going, the data box's border turns orange
    - when equilibrium is reached, it turns green
    - while it is green, you can't add splats
  - the provisional centroid during iteration is represented by a larger colored circle with a red border; this does not necessarily correspond to a data point
- you add splats and start again or click "clear" to start fresh
- you can tinker with the diameter of the circles drawn using the radius slider

### splats

To add a splat, you click inside the data box and hold the button down. A red dot will appear where you clicked. You drag the mouse to another
point inside the box and release. A green dot will appear where you released the button. Data will appear as a random splat of dots centered
on the point where you clicked initially. After a moment, both dots, red and green, will disappear.

The down click sets the center of the splat. The release point sets the radius. The number of data points has a minimum and a maximum. Between
these two numbers it is determined by the radius: the number of points is proportional to the square of the radius.

If you want to draw a particular shape, use many small splats. This is a demo app which is only incidentally artistic. The controls are crude.

### picking

When you click "pick", you yourself do not get to pick except inasmuch as you can reject the selection and try again. The app picks random points
for you. See above regarding crudeness of control.

## Palette

The color palette is from http://alumni.media.mit.edu/~wad/color/numbers.html. The colors should be distinguishable if not beautiful.

## Time/Iteration

With every iteration the time to cluster and the time to recalculate centroids is recorded. This is the time per iteration displayed.
The value is a rounded number of milliseconds. The value displayed is the average over all the iterations.

Each iteration is actually longer than this, because it includes a fixed pause after each step of the iteration. This is to make it easier to
perceive the evolution of the clustering. See the [`PAUSE` constant](https://github.com/dfhoughton/k-means-multi-threaded/blob/main/app/javascript/application.tsx#L54).