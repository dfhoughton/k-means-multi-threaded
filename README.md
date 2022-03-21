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
initial centroids -- center points -- of these clusters. You then measure the distince of all the other points to these centroids
and add each one to the cluster of the centroid it's closest too. Then you calculate the average of all the points in a given cluster.
That is the cluster's new centroid (it likely does not coincide with any of the points clustered). Then you repeat. When you
achieve some degree of stability, you call it done.

## Parallelism

Because the clustering algorithm consists of many calculations, probably involving square roots, which are all independent of
each other within a given clustering step, it is very easy to parallelize. If you have `n` worker threads, you divide your list
of points up into `n` segments of (near) equal length, give every worker the list of centroids and its segment, and let each one
cluster the points in its segment. You need very little communication among threads, just the input and the output. But because
there's a little heavy computational lifting in the clustering -- the square roots -- it might actually be worthwhile to make
this multi-threaded.