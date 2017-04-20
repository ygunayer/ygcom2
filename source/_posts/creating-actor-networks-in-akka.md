---
title: Creating Actor Networks in Akka
date: 2017-04-20 00:00
tags: [Scala, Akka, Actor Model]
---
In the previous article we've implemented a standalone guessing game, but actors are built for much more complex problems such as concurrent communication over a network. A turn-based multiplayer game such as a card or tile game is the perfect example for that use case, and that's what we'd like to achieve eventually. But first, we need to figure out how to allow actors to communicate with each other over a networking layer, and possibly with a high enough level of abstraction so that we can model our business rules without having to think about any low-level stuff.

Thankfully, Akka does this abstraction so well that the whole process is almost entirely transparent. Let's see how!

<!-- more -->

## Basic Example
If we look at the [*Actor Path* section in the first article](http://yalingunayer.com/blog/introduction-to-the-actor-model-with-akka/#Actor_Path) we'll see that the actor path notation allows for references to remote actor systems through the use of `akka.tcp` as the protocol prefix. For instance, a path such as `akka.tcp://Foo@192.168.1.14:9000` refers to an actor system called `Foo` that is running on host `192.168.1.14` through the port `9000`.

Building up on this, let's create we have two actor systems called `Foo` and `Bar`, have them contain aptly-named singular actors, namely `FooActor` and `BarActor`, and let them communicate with each other.

### Foo
Let's name our first project as `remote-foo`. First, create a folder called `remote-foo` under a folder of your choice, and place a file called `build.sbt` at its root folder. This is where we'll declare our dependencies and set up build processes.

> See also: [https://github.com/ygunayer/remote-foo/tree/simple](https://github.com/ygunayer/remote-foo/tree/simple)

**remote-foo/build.sbt**
```scala
val akkaVersion = "2.5.0"

name := """remote-foo"""

version := "1.0"

scalaVersion := "2.11.6"

libraryDependencies ++= Seq(
  "com.typesafe.akka" %% "akka-actor" % akkaVersion,
  "com.typesafe.akka" %% "akka-remote" % akkaVersion
)
```

Next, we'll need to create both the main class that serves as the entry point, and also the `FooActor`

**Note:** Feel free to change the package name from `com.yalingunayer.foo` to whatever you like. Just don't forget to change the folder structure as well!

**remote-foo/src/main/scala/com/yalingunayer/foo/FooActor.scala**
```scala
package com.yalingunayer.foo

import akka.actor.Actor
import akka.actor.Props

object FooActor {
  def props(): Props = Props(classOf[FooActor])
}

class FooActor extends Actor {
  def receive = {
    case s: String => {
      println(f"Received a message: $s")
      sender ! f"Hello!" 
    }
  }
  
  override def preStart(): Unit = {
    println(f"Foo actor is listening at ${self.path}")
  }
}
```

**remote-foo/src/main/scala/com/yalingunayer/foo/Application.scala**
```scala
package com.yalingunayer.foo

import akka.actor.ActorSystem

object Application {
  def main(args: Array[String]): Unit = {
    val foo = ActorSystem("Foo")
    foo.actorOf(FooActor.props())
  }
}
```

Nothing fancy, but here comes the important part. This is where we enable Akka's remoting capabilities by telling it to instantiate remote references for actors. 

**Note:** Don't worry about the explicitly defined hostname and port number for now.

**remote-foo/src/main/resources/application.conf**
```
akka {
  logLevel = "DEBUG"
  actor {
    provider = remote
    debug {
      lifecycle = on
    }
  }
  remote {
    enabled-transports = ["akka.remote.netty.tcp"]
    netty.tcp {
      hostname = "127.0.0.1"
      port = 47000
    }
    log-sent-messages = on
    log-received-messages = on
 }
}
```

### Bar
The second project, `remote-bar`, will do the hard work (not really) of locating the `FooActor` and sending it a message.

The build file is pretty much the same.

> See also: [https://github.com/ygunayer/remote-bar/tree/simple](https://github.com/ygunayer/remote-bar/tree/simple)

**remote-bar/build.sbt**
```scala
val akkaVersion = "2.5.0"

name := """remote-bar"""

version := "1.0"

scalaVersion := "2.11.6"

libraryDependencies ++= Seq(
  "com.typesafe.akka" %% "akka-actor" % akkaVersion,
  "com.typesafe.akka" %% "akka-remote" % akkaVersion
)
```

**remote-bar/src/main/scala/com/yalingunayer/BarActor.scala**
```scala
package com.yalingunayer.bar

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success

import akka.actor.Actor
import akka.actor.ActorRef
import akka.actor.Props

object BarActor {
  def props(): Props = Props(classOf[BarActor])
}

class BarActor extends Actor {
  def receive = {
    case s: String => println(f"Received a reply: $s")
  }
  
  // connect to the remote actor system running on port 47000 and send its `$a` actor a message
  // this path looks so extremely fragile because it really is! don't worry though, we'll fix this in future examples
  context.system.actorSelection("akka.tcp://Foo@127.0.0.1:47000/user/$a").resolveOne()(10.seconds).onComplete(x => x match {
    case Success(ref: ActorRef) => {
      println(f"Located Foo actor: $ref")
      ref ! "Oh, hi Mark!"
    }
    case Failure(t) => {
      System.err.println(f"Failed to locate Foo actor. Reason: $t")
      context.system.terminate()
    }
  })
}
```

Another straightforward entry class.

**remote-bar/src/main/scala/com/yalingunayer/Application.scala**
```scala
package com.yalingunayer.bar

import akka.actor.ActorSystem

object Application {
  def main(args: Array[String]): Unit = {
    val foo = ActorSystem("Bar")
    foo.actorOf(BarActor.props())
  }
}
```

And a remoting configuration that's exactly the same as `Foo`'s except for the port number.

**remote-foo/src/main/resources/application.conf**
```scala
akka {
  logLevel = "DEBUG"
  actor {
    provider = remote
    debug {
      lifecycle = on
    }
  }
  remote {
    enabled-transports = ["akka.remote.netty.tcp"]
    netty.tcp {
      hostname = "127.0.0.1"
      port = 47001
    }
    log-sent-messages = on
    log-received-messages = on
 }
}
```

### Demonstration
Now that we've set up our projects, the only thing left to do is to actually run them.

First, `foo`

```bash
$ cd remote-foo
$ sbt run

# build output trimmed
[INFO] [04/17/2017 22:16:26.961] [run-main-0] [akka.remote.Remoting] Starting remoting
[INFO] [04/17/2017 22:16:27.066] [run-main-0] [akka.remote.Remoting] Remoting started; listening on addresses :[akka.tcp://Foo@127.0.0.1:47000]
[INFO] [04/17/2017 22:16:27.067] [run-main-0] [akka.remote.Remoting] Remoting now listens on addresses: [akka.tcp://Foo@127.0.0.1:47000]
Foo actor is listening at akka://Foo/user/$a
```

And next, `bar`
```bash
$ cd remote-bar
$ sbt run

# build output trimmed
[INFO] [04/17/2017 22:19:23.738] [run-main-0] [akka.remote.Remoting] Starting remoting
[INFO] [04/17/2017 22:19:23.836] [run-main-0] [akka.remote.Remoting] Remoting started; listening on addresses :[akka.tcp://Bar@127.0.0.1:47001]
[INFO] [04/17/2017 22:19:23.838] [run-main-0] [akka.remote.Remoting] Remoting now listens on addresses: [akka.tcp://Bar@127.0.0.1:47001]
Located Foo actor: Actor[akka.tcp://Foo@127.0.0.1:47000/user/$a#-1793805941]
Received a reply: Hello!
```

As soon as we run bar, `foo` will also output the following line:
```bash
Received a message: Oh, hi Mark!
```

So there you go, our first remoting example!

## Routing Example
One problem we had with our first example was that we had to specify the exact path to the `FooActor`, which was completely arbitrary, and we had no way of scaling it.

As with any addressed message delivery problem, the most obvious solution to this is to implement a routing mechanism. Thankfully, Akka already has the concept of routers, so we don't have to re-invent the wheel.

Routing means hierarchy, so in order to route incoming messages we'll need a supervisor actor which will employ one of the following algorithms to route messages to its routees:
- `akka.routing.RoundRobinRoutingLogic`
- `akka.routing.RandomRoutingLogic`
- `akka.routing.SmallestMailboxRoutingLogic`
- `akka.routing.BroadcastRoutingLogic`
- `akka.routing.ScatterGatherFirstCompletedRoutingLogic`
- `akka.routing.TailChoppingRoutingLogic`
- `akka.routing.ConsistentHashingRoutingLogic`

Among these the most suitable candidate for our example is a simple round-robin routing mechanism, so let's implement it.

We can either configure our routers programmatically, or through a configuration file. We already have a configuration file, so we'll simply use it.

Let's update the `application.conf` file on `remote-foo`.

> See also: [https://github.com/ygunayer/remote-foo/tree/routing](https://github.com/ygunayer/remote-foo/tree/routing)

**remote-foo/src/main/resources/application.conf**
```
akka {
  logLevel = "DEBUG"
  actor {
    provider = remote
    debug {
      lifecycle = on
    }
    
    deployment {
      /foo {
        router = round-robin-pool
        nr-of-instances = 5
      }
    }
  }
  remote {
    enabled-transports = ["akka.remote.netty.tcp"]
    netty.tcp {
      hostname = "127.0.0.1"
      port = 47000
    }
    log-sent-messages = on
    log-received-messages = on
 }
}
```

Hooray, instant round-robin load balancing! The next thing we need to do is to inform Akka that we're routing our messages at `/foo`

**remote-foo/src/main/scala/com/yalingunayer/foo/Application.scala**
```scala
package com.yalingunayer.foo

import akka.actor.ActorSystem
import akka.routing.FromConfig
import com.typesafe.config.ConfigFactory

object Application {
  def main(args: Array[String]): Unit = {
    val foo = ActorSystem("Foo")
    foo.actorOf(FooActor.props().withRouter(FromConfig()), name = "foo")
  }
}
```

Notice how this time we've named our supervising router actor `foo` because we expect it to be a singleton. The last thing to do is to update `remote-bar` so that it sends a message or two to `remote-foo`'s `/foo` endpoint.

> See also: [https://github.com/ygunayer/remote-bar/tree/routing](https://github.com/ygunayer/remote-bar/tree/routing)

**remote-bar/src/main/scala/com/yalingunayer/BarActor.scala**
```scala
package com.yalingunayer.bar

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success

import akka.actor.Actor
import akka.actor.ActorRef
import akka.actor.Props

object BarActor {
  def props(): Props = Props(classOf[BarActor])
}

class BarActor extends Actor {
  def receive = {
    case s: String => println(f"Received a reply: $s")
  }
  
  context.system.actorSelection("akka.tcp://Foo@127.0.0.1:47000/user/foo").resolveOne()(10.seconds).onComplete(x => x match {
    case Success(ref: ActorRef) => {
      println(f"Located Foo actor: $ref")
      ref ! "Oh, hi Mark!"
      ref ! "Hey, Johnny!"
    }
    case Failure(t) => {
      System.err.println(f"Failed to locate Foo actor. Reason: $t")
      context.system.terminate()
    }
  })
}
```

That's it! Here's how things look when we run our actor systems.

First, `foo`

```bash
$ cd remote-foo
$ sbt run

# build output trimmed, notice how we now have 5 actors outputting
[INFO] [04/17/2017 23:33:36.187] [run-main-0] [akka.remote.Remoting] Starting remoting
[INFO] [04/17/2017 23:33:36.315] [run-main-0] [akka.remote.Remoting] Remoting started; listening on addresses :[akka.tcp://Foo@127.0.0.1:47000]
[INFO] [04/17/2017 23:33:36.316] [run-main-0] [akka.remote.Remoting] Remoting now listens on addresses: [akka.tcp://Foo@127.0.0.1:47000]
Foo actor is listening at akka://Foo/user/foo/$b
Foo actor is listening at akka://Foo/user/foo/$a
Foo actor is listening at akka://Foo/user/foo/$c
Foo actor is listening at akka://Foo/user/foo/$e
Foo actor is listening at akka://Foo/user/foo/$d
```

Next, `bar`

```bash
$ cd remote-bar
$ sbt run

# build output trimmed, notice how different actors replied our message
[INFO] [04/17/2017 23:35:21.210] [run-main-0] [akka.remote.Remoting] Starting remoting
[INFO] [04/17/2017 23:35:21.318] [run-main-0] [akka.remote.Remoting] Remoting started; listening on addresses :[akka.tcp://Bar@127.0.0.1:47001]
[INFO] [04/17/2017 23:35:21.319] [run-main-0] [akka.remote.Remoting] Remoting now listens on addresses: [akka.tcp://Bar@127.0.0.1:47001]
Located Foo actor: Actor[akka.tcp://Foo@127.0.0.1:47000/user/foo#1348297749]
Received a reply: Hello from akka://Foo/user/foo/$a!
Received a reply: Hello from akka://Foo/user/foo/$b!
```

This time we sent two messages, so `remote-foo` will print two outputs.

```bash
Received a message: Oh, hi Mark!
Received a message: Hey, Johnny!
```

## Hassle-free Application Linking via Docker
Another issue with our first two examples was the fact that we had to specify the exact IP address and port to our applications, which couples them with the configuration so strongly that we have no way of scaling them, nor can we deploy them easily. This is a perfect use case for Docker as it will allow us to simply use service links and not care about the port number thanks to the built-in private networking capabilities.

> Disclaimer: This section assumes that the reader has at least some experience or familiarity with Docker and its concepts

### Building
In order to Dockerize our apps, we'll first have to build them into executable files so we can create Docker images that contain them. Like Maven or Gradle, sbt doesn't have a native way of generating executables by default, so we'll integrate a plugin to do that for us. To do that, simply create a file on the path `project/plugins.sbt` with the following content for both of the projects:

**remote-foo/project/plugins.sbt** *and* **remote-bar/project/plugins.sbt**
```scala
addSbtPlugin("com.typesafe.sbt" % "sbt-native-packager" % "1.2.0-M8")
```

And then, place the statement `enablePlugins(JavaAppPackaging)` at the 2nd line in the `build.sbt` files of both projects. Both files should look like this:

**remote-foo/build.sbt** *and* **remote-bar/build.sbt**
```scala
val akkaVersion = "2.5.0"

enablePlugins(JavaAppPackaging)

...
```

We can now use the command `sbt stage`, which will generate an executable version of our app under the path `target/universal/stage/bin`.

## Dockerized Example
### Setting Up the Containers
Now that we have the executable versions of our apps, we can now create Docker images for both of them.

Let's go with `remote-foo` first, and create an extremely simple Dockerfile at its root folder. Note how this assumes that our executable app is placed at `/app`, which we'll link using `docker-compose`.

**remote-foo/Dockerfile**
```dockerfile
FROM java:8-jdk

WORKDIR /app

CMD ./bin/remote-foo
```

And the other Dockerfile for the other project. Pretty much the same as `remote-foo`'s.

**remote-bar/Dockerfile**
```dockerfile
FROM java:8-jdk

WORKDIR /app

CMD ./bin/remote-bar
```

Next up, we'll need a `docker-compose` configuration so we can tie both apps together. Place a file called `docker-compose.yml` at a folder that contains both projects.

**docker-compose.yml**
```yaml
version: '2'

services:
  remote-foo:
    build: ./remote-foo
    ports:
      - "48000:47000"
    volumes:
      - ./remote-foo/target/universal/stage:/app

  remote-bar:
    build: ./remote-bar
    depends_on:
      - remote-foo
    ports:
      - "49000:47000"
    links:
      - "remote-foo:remote-foo"
    volumes:
      - ./remote-bar/target/universal/stage:/app
```

As you might already tell, this file simply tells Docker to mount the folder that contains the executables on the host at the path `/app` on the guest, build both `Dockerfile`s contained in the project folders, create a private network among the containers that expose their 47000 ports to each other, and then link `remote-foo` to `remote-bar` so it's accessible.

### Updating the Code
Before moving on to the final step, let's make minor adjustments on our applications to reflect these changes.

- Change the `hostname` from `127.0.0.1` to `remote-foo` on `remote-foo/src/main/resources/application.conf`
- Change the `hostname` from `127.0.0.1` to `remote-foo` and `port` from `47001` to `47000` on `remote-bar/src/main/resources/application.conf`
- Change the target URL from `akka.tcp://Foo@127.0.0.1:47000/user/foo` to `akka.tcp://Foo@remote-foo:47000/user/foo` on `BarActor`

For the exact differences, see the relevant `diff` entries on the GitHub repo: [remote-foo](https://github.com/ygunayer/remote-foo/commit/af9e7582bac648eaeb819ba9d2cc4cea60c621ea), [remote-bar](https://github.com/ygunayer/remote-bar/commit/649befacb6110ada9e8d616389a37902d9eaf23d)

And for the final versions of both repos, visit them on GitHub:
> *remote-foo:* https://github.com/ygunayer/remote-foo/tree/dockerize
> *remote-bar:* https://github.com/ygunayer/remote-bar/tree/dockerize

### Running the Containers
Once the file is ready, simply navigate to its containing folder and run `docker-compose up -d`. Here's a sample output:

```bash
$ docker-compose up -d
Building remote-foo
Step 1 : FROM java:8-jdk
 ---> d23bdf5b1b1b
Step 2 : WORKDIR /app
 ---> Running in 1f05f4c72c5b
 ---> 4139b49a3308
Removing intermediate container 1f05f4c72c5b
Step 3 : CMD ./bin/remote-foo
 ---> Running in 01c6e0caf27e
 ---> 8c9c32018f6a
Removing intermediate container 01c6e0caf27e
Successfully built 8c9c32018f6a
WARNING: Image for service remote-foo was built because it did not already exist. To rebuild this image you must use `docker-compose build` or `docker-compose up --build`.
Building remote-bar
Step 1 : FROM java:8-jdk
 ---> d23bdf5b1b1b
Step 2 : WORKDIR /app
 ---> Using cache
 ---> 4139b49a3308
Step 3 : CMD ./bin/remote-bar
 ---> Running in 1859d92a2cb9
 ---> 3cb8f5cf99b6
Removing intermediate container 1859d92a2cb9
Successfully built 3cb8f5cf99b6
WARNING: Image for service remote-bar was built because it did not already exist. To rebuild this image you must use `docker-compose build` or `docker-compose up --build`.
Creating remoting_remote-foo_1
Creating remoting_remote-bar_1
```

And that's it! Not only has Docker built our images, it has also created and run the containers, so the apps have probably communicated with each other already. To validate the results, simply display the output of both containers:

*Note:* Refer to the last two lines of the previous output for the names of the containers that you'll need to provide to `docker logs`

Here's the output from `remote-bar`

```bash
$ docker logs remoting_remote-foo_1
[INFO] [04/19/2017 21:04:28.206] [main] [akka.remote.Remoting] Starting remoting
[INFO] [04/19/2017 21:04:28.312] [main] [akka.remote.Remoting] Remoting started; listening on addresses :[akka.tcp://Bar@remote-bar:47000]
[INFO] [04/19/2017 21:04:28.313] [main] [akka.remote.Remoting] Remoting now listens on addresses: [akka.tcp://Bar@remote-bar:47000]
Located Foo actor: Actor[akka.tcp://Foo@remote-foo:47000/user/foo#1352507500]
Received a reply: Hello from akka://Foo/user/foo/$a!
Received a reply: Hello from akka://Foo/user/foo/$b!
```

And here's from `remote-foo`

```bash
$ docker logs remoting_remote-foo_1
[INFO] [04/19/2017 21:21:45.576] [main] [akka.remote.Remoting] Starting remoting
[INFO] [04/19/2017 21:21:45.836] [main] [akka.remote.Remoting] Remoting started; listening on addresses :[akka.tcp://Foo@remote-foo:47000]
[INFO] [04/19/2017 21:21:45.837] [main] [akka.remote.Remoting] Remoting now listens on addresses: [akka.tcp://Foo@remote-foo:47000]
Foo actor is listening at akka://Foo/user/foo/$a
Foo actor is listening at akka://Foo/user/foo/$c
Foo actor is listening at akka://Foo/user/foo/$b
Foo actor is listening at akka://Foo/user/foo/$d
Foo actor is listening at akka://Foo/user/foo/$e
Received a message: Oh, hi Mark!
Received a message: Hey, Johnny!
```

## Conclusion
So there you go. We now have two actor systems running not only on separate processes, but even different (virtual) OSes, and we could easily place one system on a machine and the other on a different one and they'd still be able to communicate with each other.

But this is only the first step in creating our multiplayer game, and we'll get to that in the next article. Stay tuned!
