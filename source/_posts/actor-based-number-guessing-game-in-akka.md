---
title: Actor-based Number Guessing Game in Akka
date: 2016-07-22 00:00
tags: [Scala, Akka, Actor Model]
---
Now that the basics of the actor model is out of the way (thanks to the [previous article](/blog/introduction-to-the-actor-model-with-akka)), it's time to make something with it! We'll begin by creating an Akka project from scratch, and then move on to implementing a number guessing game based on actors, which will give us an easy start in modeling actor-based systems.

The rule of the game is quite simple; it'll pick a random integer between 1 and 100, and user will try to guess it. Each time the user provides a guess, the game with reply with a message that tells the player whether or not they matched. All interaction will be through the console, so no unnecessary complication there.

Note: I won't go into any details about the model nor Akka's implementation of it, so if you're ever in need of assistance, feel free to use the [previous article](/blog/introduction-to-the-actor-model-with-akka) as a reference.

<!-- more -->

> See the code at Github: https://github.com/ygunayer/guessing-game

## Preparing the Environment
Before we can get started on creating our first project, we need to install a few dependencies first. These are JDK, Scala, Scala Build Tool (or SBT for short) and Lightbend [Activator](http://www.lightbend.com/community/core-tools/activator-and-sbt) (it's not really a dependency, but it's convenient). You'll have to install JDK on your own, but you can just skip Scala and SBT and install Activator right away because it can install them for you (provided you've installed JDK).

For reference, here's a list of what I have installed at the time of this writing:
- [JDK 1.8.0_51](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)
- [Scala 2.11.7](http://www.scala-lang.org/download/)
- [SBT 0.13.8](http://www.scala-sbt.org/download.html)
- [Activator 1.3.6](http://www.lightbend.com/activator/download)

When it comes to IDEs, the choices are pretty much the same as Java, it's either [Scala IDE](http://scala-ide.org/) (Eclipse-based) or [IntelliJ IDEA](https://www.jetbrains.com/idea/) (Community Edition will do), but they both require some preparation before you can use them.

### Scala IDE
The Eclipse-based Scala IDE does not have a built-in way to import SBT-based projects, so you'll have to install the SBT plugin [sbteclipse](https://github.com/typesafehub/sbteclipse). As documented in the repository page, you can install it directly to your computer, or add it as a dependency on your project so that it gets installed once you've started building the project with SBT. I recommend the former method, because an IDE plugin is not technically a prerequisite of a project, but rather, a convenience for programmers.

When you've got it installed, all you have to do import your project into Scala IDE is to launch up a terminal, go into the project folder, and run

```bash
sbt eclipse
```

### IntelliJ IDEA
IDEA does not support Scala by out-of-the-box, so you'll have to install a plugin in order to get it to work. Fortunately, IDEA does have it on its plugin repository, so all you need to do is to just go into the plug-in options and install it from there. Once you've got it installed, you're all set, as it comes with the ability to import SBT-based projects, and create projects based on Activator templates. See [Creating and Running Your Scala Application](https://www.jetbrains.com/help/idea/2016.1/creating-and-running-your-scala-application.html?origin=old_help) at JetBrains website for more detailed instructions.

Once you've got it installed, you can safely import any SBT project, but keep in mind that IDEA likes to keep its own Ivy cache (where SBT downloads the dependencies of all projects and stores them for later use), and this means that it'll re-download any dependency you've got installed through SBT using the command line. If that bothers you, here's how you can get IDEA to use the same cache folder as the default one: [http://stackoverflow.com/questions/23845357/changing-ivy-cache-location-for-sbt-projects-in-intellij-idea](http://stackoverflow.com/questions/23845357/changing-ivy-cache-location-for-sbt-projects-in-intellij-idea)

## Creating the Project
While scaffolding tools like Activator are great, I think it's important to be able to create projects manually, and from scratch, because it helps you understand how things really work.

The outline of a Scala project is pretty much the same as a regular Java project. At the root folder, it has the build file (aka `build.sbt`), the source folder (aka `src`), and if using a SCM tool, its ignore file (aka `.gitignore`). Under the `src` folder are the `main` and `test` folders, each of which contain a hierarchy of folders that mirrors the package structure of the project.

> I encourage you to take the time and follow these steps by yourself, but if you're not interested, feel free to clone the starter project at its initial commit at [https://github.com/ygunayer/guessing-game/tree/0bb9fc5dd96160c15ad98a8446973106c22a5056](https://github.com/ygunayer/guessing-game/tree/0bb9fc5dd96160c15ad98a8446973106c22a5056)

I'll be using `com.yalingunayer.actors.guess` as the package name, and `guessing-game` as the root folder of my project, so here's what the entire project structure looks like:

```plain
(workspace folder)
 |
 \- guessing-game
    +- src
    |  +- main
    |  |  \- scala
    |  |     \- com
    |  |        \- yalingunayer
    |  |           \- guess
    |  |              \- Application.scala
    |  \- test
    |    \- scala
    |       \- com
    |          \- yalingunayer
    |             \- guess
    |                \- .gitkeep
    +- .gitignore
    \- build.sbt
```

Let's examine each file.

**.gitignore**
I guess this is pretty self-explanatory.

**.gitkeep**
Although we don't have any tests yet, I've included this file so we have an idea on where our test classes will end up in in the future.

**build.sbt**
The SBT build file defines the name of our project, its version, the Scala compile version that it requires, and also the dependencies that are to be installed. In this example, our only dependencies are Akka and both Akka's and Scala's test libraries.

```scala
name := """guessing-game"""

version := "1.0"

scalaVersion := "2.11.7"

libraryDependencies ++= Seq(
  "com.typesafe.akka" %% "akka-actor" % "2.3.11",
  "com.typesafe.akka" %% "akka-testkit" % "2.3.11" % "test",
  "org.scalatest" %% "scalatest" % "2.2.4" % "test")
```

**Application.scala**
This is our main source file, and it contains the obligatory "Hello, world!" thing which we'll replace once we've started with our game.

```scala
package com.yalingunayer.guess

object Application extends App {
  println("Hello, world!")
}
```

Once you've laid out the project structure, all is left to import the project into your IDE. To rephrase, if you're using IntelliJ IDEA just import the folder directly, and if you're using Scala IDE instead, navigate into the project folder, run `sbt eclipse`, and then import the project into Eclipse.

## Planning
Before jumping ahead to implement the game, let's focus on planning our approach. As with any problem in programming, we'll first model its domains, determine the way data flows, and then move on to the actual implementation.

Let's recall our game flow and try to determine what our domains are:

1. Pick a random integer between 1 and 100
2. Ask the player for a guess or an exit request
3. If the player provides a guess, compare it with the number that is kept, and if they match, go to step 5, if not, go back to step 2
4. If the player provides an exit request, stop the game
5. Congratulate the player, and ask if they want another round of game, or just finish playing
6. If the player wants another round, go to step 1, if not, stop the game

There are countless ways to implement this flow, all depending on various decisions that we can make at various points. One such point is the domain model, and one decision we can make for that is to split up our program into three main domains: one to cover the program flow and maintaining the actor system, one to handle the game logic and another to handle player interaction. In an actor-based world, these domains translate (pretty much directly) into three actors, `Application` (or `Program`), `Game` and `Player`, but for simplicity's sake, we'll refrain from implementing the application domain as an actor, and just stick with an object class instead.

This decision also affects our choice on how we'll let the player and the game actors know each other. Since we won't have a common ancestor (at least on a user actor level) for our actors, we'll just let our game actor initialize the player actor and become its parent in the process. In a more complicated scenario, especially when networking is present, we can implement our actors in a more detached way, letting them discover each other through a common ancestor, and possibly having more complex state transitions using ready and idle states to prevent any possible dead letters, but that's a subject matter for perhaps a future article.

## The Implementation
Based on our decisions, here's how our actors will behave: the game actor boots up, generates a number, initializes the player actor whilst also passing its own `ActorRef` (i.e. `self`) to it, sends the player actor a `Ready` message, and starts waiting for a guess or a request to exit.

As soon as the player actor initializes, it starts to wait until a `Ready` message is received, after which it turns to the player itself and expects a guess. Based on the player's reply, it either sends a `Guess(n: Int)` message and starts waiting for the next step, or sends a `Leave` message and shuts itself down - if the player wants to exit.

Upon receiving the `Guess` or `Leave` message, the game actor decides either to exit the game by shutting down the actor system, or a `Win` or `TryAgain` message based on whether the guess matches the number that was kept. If the numbers didn't match, it goes back to waiting for a `Guess` or `Leave`, but if they did match, it starts waiting for either a `Restart` or `Leave` message.

Upon receiving a `Win` message, the player actor asks the player if they would like to play another round, or exit the game. If the player chooses to restart, it sends out a `Restart` message, and if not, a `Leave` message like before. Similarly, if it receives a `TryAgain` message, it asks the player for another guess, and like before, sends out either a `Guess` or a `Leave`, depending on the player's decision.

So to summarize, here's a list of all messages that we need to create, and which actor they originate from:

*Game Actor*
- `Ready`
- `Win`
- `TryAgain`

*Player Actor*
- `Guess(n: Int)`
- `Restart`
- `Leave`

Before going into the game logic, let's first implement the actors and the messages that will flow between them.

### Laying the Groundwork
So, first up, the game actor. Based on our game flow, there are two variables that are stored in our game actor: the number that is picked for the current round, and an `ActorRef` to the player, both of which we can store as scoped variables in our class. We'll have to declare the number to guess as a `var` because it'll change from round to round, but we can safely declare our player actor as a `val` and re-use it between rounds since it'll persist as long as the game actor does. It's worth noting here that while our game actor will end up as the parent of our player actor, and therefore will be accessible by its `parent` field, I find it better to explicitly pass it as an extra parameter. Again, in a more complicated scenario, we could have passed the references to the number and the player actor by using `become()` and `unbecome()` to transition into parameterized states, but there's no need to over-complicate things just yet.

Another thing to note is that it's a very common practice to create message classes in the relevant object classes for every actor class so that they're both semantically separated, and easily accessible.

As such, here's how our game actor looks like without any state transitions or game logic.

**Game.scala**

```scala
/**
 * Companion object to the `Game` class
 */
object Game {
  // message to send when the game is ready to be played
  case class Ready()
  
  // message to send to a player actor when the guess is correct
  case class Win()
  
  // message to send to a player actor when the guess is incorrect
  case class TryAgain()
  
  // follow the initialization technique from the first article 
  def props = Props(classOf[Game])
}

/**
 * The actor that represents the entire game
 */
class Game extends Actor {
  // pick a number right away
  var number = generate()

  // and also initialize the player actor
  val player = context.actorOf(Player.props(self))

  // the range of our numbers is [1, 100], but the `nextInt` method has a range of [from, to)
  def generate(): Int = Random.nextInt(100) + 1

  // we'll implement this later
  def receive = ???
}
```

Next, the player actor. Our player actor holds no state (except for the `ActorRef` to the game actor which is parameterized), so the only thing that we need to implement aside from the actor's logic is the messages.

**Player.scala**

```scala
/*
 * Companion object to the `Player` actor
 */
object Player {
  // the message to send when providing a guess
  case class Guess(n: Int)

  // the message to send when the user wants to play another round
  case class Restart()

  // the message to send when the user wants to exit
  case class Leave()

  // notice how we're passing the `ActorRef` to the game actor, even though it'll end up as the `parent`
  def props(game: ActorRef) = Props(classOf[Player], game)
}

class Player(game: ActorRef) extends Actor {
  // we'll implement this later
  def receive = ???
}
```

### Game Logic
Now that our actors are set up, it's time to implement the game logic. Since the behavior of an actor is determined by its `receive` method, which is a partial function, we'll implement different behaviors for every message they need to handle.

We'll first start with the game actor since it's easier to implement. If we remember from before, there are three messages it can handle, `Guess`, `Restart` and `Leave`, and here's how it reacts to them:

When it receives a guess, it compares it with the stored number, and replies with a `Win` message if they match, or a `TryAgain` message if they don't. In other words,

```scala
case Player.Guess(n: Int) => {
  if (n == number) player ! Game.Win
  else player ! Game.TryAgain
}
```

When it receives a restart request, it generates a new number and replies with a `Ready` message so as to inform the player that a new round has begun.
```scala
case Player.Restart => {
  number = generate
  player ! Game.Ready
}
```

When the player leaves, it just shuts down the actor system so that the program can terminate. There are other ways to do this, of course, but simplicity is key.
```scala
case Player.Leave => {
  context.system.shutdown
}
```

Aside from handling incoming messages, our game actor also needs to inform the player actor that the game has started by sending it a `Ready` message. We'll do this at the `preStart` stage (remember the actor lifecycle from the previous article).

```scala
override def preStart() = {
  player ! Game.Ready
}
```

If we combine it all, here's how the final version of our game actor looks like:

```
/**
 * The actor that represents the entire game
 */
class Game extends Actor {
  // pick a number right away
  var number = generate()

  // and also initialize the player actor
  val player = context.actorOf(Player.props(self))

  // the range of our numbers is [1, 100], but the `nextInt` method has a range of [from, to)
  def generate(): Int = Random.nextInt(100) + 1

  def receive = {
    // the player has provided a guess, check if it's correct and send the appropriate response
    case Player.Guess(n: Int) => {
      if (n == number) player ! Game.Win
      else player ! Game.TryAgain
    }
    
    // the player wants to restart the game, generate a new number and inform the player that a new round has begun
    case Player.Restart => {
      number = generate
      player ! Game.Ready
    }
    
    // the player has left, shut down the actor system
    case Player.Leave => {
      context.system.shutdown
    }
  }
  
  // inform the player that the game is ready
  override def preStart() = {
    player ! Game.Ready
  }
}
```

The behavior of our player actor is much more complicated than that, and has a stateful nature even though it doesn't keep any state variables. Looking back at our game flow, we see that there are three distinct states that our player actor goes into: waiting for a game to start, waiting for a round result, and a catch-all idle state for situations where we wait for the user's input. Any unexpected messages in one of these states can result in even more unexpected behavior, so we need to split our behaviors into multiple `Receive` implementations that each represent those three states. Namely, `initializing`, `waitingForRoundResult` and `idle`.

Also, let's separate the actions our actor will take upon receiving certain messages into aptly-named functions: `askForGuess` to ask for a guess, `askForRestart` to ask whether the player wants to restart the game for another round, and `askForRetry` to ask for another guess after they've provided an incorrect guess. Based on these decisions, here's how we can implement our actor's states:

```scala
// the default behavior or state is the `initializing` state
def receive = initializing

// this is a shortcut for an empty behavior, where all messages are ignored
def idle = Actor.emptyBehavior

def initializing: Receive = {
  case Game.Ready => askForGuess
}

def waitingForRoundResult: Receive = {
  case Game.Win => askForRestart
  case Game.TryAgain => askForRetry
}
```

Next up is the implementations of those actions, first of which is the `askForGuess` method. We *might* implement is as follows:

```scala
def askForGuess = {
  val result = scala.io.StdIn.readLine()
  try {
    // we didn't call `readInt()` because we'd like to have more control over this action
    val guess = result.toInt
    game ! Player.Guess(guess)
    context.become(idle)
  } catch {
    case t: Throwable => {
      System.err.println(f"An error has occurred while reading the user's input $t")
      game ! Player.Leave
      context.stop(self)
    }
  }
}

def initializing: Receive = {
  case Game.Ready => askForGuess
}
```

But... we really shouldn't. Not only does this code look bad, it smells bad too! If you remember from the first article, one of the most important aspects of the actor model is concurrency, and we've completely obliterated that principle by synchronously calling `readLine()`, a heavyweight blocking operation. Let's wrap that in a `Future` and make it non-blocking. Keep in mind that in order to do this, we'll need an `ExecutionContext`, and we can implicity access one by importing `scala.concurrent.ExecutionContext.Implicits.global`.

```scala
def askForGuess = {
  // we don't want any unexpected messages to mess with our flow
  // after all, the `Future` below isn't really in sync with our actor system
  context.become(idle)

  val reader = Future {
    scala.io.StdIn.readLine()
  }
  reader onComplete {
    case Success(result: String) => {
      try {
        val guess = result.toInt
        game ! Player.Guess(guess)
        context.become(waitingForRoundResult)
      } catch {
        // we're not concerned with why the parse has failed
        case _: Throwable => {
          // now we know that the user wants to quit
          println("Goodbye!")
          game ! Player.Leave
          context.stop(self)
        }
      }
    }
    case Failure(t: Throwable) => {
      System.err.println(f"An error has occurred while reading the user's input $t")
      game ! Player.Leave
      context.stop(self)
    }
  }
}
```

This does look promising, but it's still very unreadable, especially so since we'll be using this ask-and-reply pattern a couple more times. So let's just write a utility function that reads a line from `StdIn` and parses it into an `Int`, and responds with an `Option[Int]`. We can do this by mapping the result of the initial `Future` (which only affects the `Success` case) to create a transformed version of it.

*Utils.scala*
```scala
object Utils {
  // asynchronously read a line from the standard input
  def readResponse: Future[String] = Future {
    scala.io.StdIn.readLine()
  }
  
  // try reading an integer from the standard input
  def readNumericResponse: Future[Option[Int]] = {
    readResponse.map(s => {
      try {
        Some(s.toInt)
      } catch {
        case _: Throwable => None
      }
    })
  }
}
```

Alright, so if we use this `readNumericResponse` method, we can simplify our `askForGuess` a little bit more. Back to the player actor.

```scala
def askForGuess = {
  context.become(idle)
  Utils.readNumericResponse.onComplete {
    case Success(result: Option[Int]) => result match {
      case Some(guess: Int) => {
        game ! Player.Guess(guess)
        context.become(waitingForRoundResult)
      }
      case None => {
        println("Goodbye!")
        game ! Player.Leave
        context.stop(self)
      }
    }
    case Failure(t: Throwable) => {
      System.err.println(f"An error has occurred while reading the user's input $t")
      game ! Player.Leave
      context.stop(self)
    }
  }
}
```

Yeah, a little bit better... kinda... So how about we move the error handler and the stopping logic into methods of their own, and create a generic method that performs an `ask`, invokes a method that we pass into it on success, and that error handler on failure? As in, `stop`, `stopWithError(t: Throwable)` and `askAndThen[T](ask: Future[T])(then: T => Any)` (all defined on the actor class, of course).

```scala
// perform an `ask` operation, and continue with `then` on success, or `stopWithError` on failure
def askAndThen[T](ask: Future[T])(then: T => Any) {
  // go into the idle state immediately
  context.become(idle)

  ask onComplete {
    case Success(t) => then(t)
    case Failure(t: Throwable) => stopWithError(t)
  }
}

def stop {
  println(f"Goodbye!")
  game ! Player.Leave
  context.stop(self)
}

def stopWithError(t: Throwable) = {
  System.err.println(f"An error has occurred while reading the user's input $t")
  game ! Player.Leave
  context.stop(self)
}
```

Fancy bit of code, isn't it? Here's how our `askForGuess` becomes with these in hand:

```scala
// ask for the player's guess and act based on the outcome
def askForGuess = {
  // let's fancy this method up a little bit
  println("Pick a number between 1 and 100 (inclusive)")

  askAndThen(Utils.readNumericResponse) {
    case Some(value: Int) => {
      game ! Player.Guess(value)
      context.become(waitingForRoundResult)
    }

    // the user wants to exit, just stop the player actor and the game actor will shut itself down
    case None => stop
  }
}
```

Much, much cleaner than before! So how about `askForRestart` or `askForRetry`? We'll be asking a yes/no question in both cases, so we can implement another utility method to convert the user's response into `true` or `false`, and use the resulting value in our other methods.

Moving on to our utils class:

```scala
// convert a yes/no response to boolean for easier use
def readBooleanResponse: Future[Boolean] = {
  readResponse.map(s => s match {
    case "y" | "yes" | "1" | "" => true
    case _ => false
  })
}
```

And back to the player actor:

```scala
// ask the player if they'd like to take another try
def askForRetry = {
  println("Aww, that's not correct. Try again? (Y/n)")
  
  askAndThen(Utils.readBooleanResponse) {
    // they do, so we can now ask for their guess
    case true => askForGuess

    // they don't, just stop the game
    case false => stop
  }
}

// ask the player if they would like to restart the game for another round
def askForRestart = {
  println("You win! Play another round? (Y/n)")

  askAndThen(Utils.readBooleanResponse) {
    // they do, so we can restart the game
    case true => {
      game ! Player.Restart
      context.become(initializing)
    }

    // they don't, just stop the game
    case false => stop
  }
}
```

These look complete, so let's combine them all and take another look at all files we've created so far.

**Game.scala**
```scala
package com.yalingunayer.guess

import akka.actor.Actor
import scala.util.Random
import akka.actor.Props

/**
 * Companion object to the `Game` class
 */
object Game {
  // message to send when the game is ready to be played
  case class Ready()

  // message to send to a player actor when the guess is correct
  case class Win()

  // message to send to a player actor when the guess is incorrect
  case class TryAgain()

  // follow the initialization technique from the first article 
  def props = Props(classOf[Game])
}

/**
 * The actor that represents the entire game
 */
class Game extends Actor {
  // pick a number right away
  var number = generate()

  // and also initialize the player actor
  val player = context.actorOf(Player.props(self))

  // the range of our numbers is [1, 100], but the `nextInt` method has a range of [from, to)
  def generate(): Int = Random.nextInt(100) + 1

  def receive = {
    // the player has provided a guess, check if it's correct and send the appropriate response
    case Player.Guess(n: Int) => {
      if (n == number) player ! Game.Win
      else player ! Game.TryAgain
    }
    
    // the player wants to restart the game, generate a new number and inform the player that a new round has begun
    case Player.Restart => {
      number = generate
      player ! Game.Ready
    }
    
    // the player has left, shut down the actor system
    case Player.Leave => {
      context.system.shutdown
    }
  }
  
  // inform the player that the game is ready
  override def preStart() = {
    player ! Game.Ready
  }
}
```

**Utils.scala**
```scala
package com.yalingunayer.guess

import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

object Utils {
  // asynchronously read a line from the standard input
  def readResponse: Future[String] = Future {
    scala.io.StdIn.readLine()
  }
  
  // try reading an integer from the standard input
  def readNumericResponse: Future[Option[Int]] = {
    readResponse.map(s => {
      try {
        Some(s.toInt)
      } catch {
        case _: Throwable => None
      }
    })
  }
  
  // convert a yes/no response to boolean for easier use
  def readBooleanResponse: Future[Boolean] = {
    readResponse.map(s => s match {
      case "y" | "yes" | "1" | "" => true
      case _ => false
    })
  }
}
```

**Player.scala**
```scala
package com.yalingunayer.guess

import akka.actor.Actor
import akka.actor.Props
import akka.actor.ActorRef
import scala.util.Success
import scala.util.Failure
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

/*
 * Companion object to the `Player` actor
 */
object Player {
  // the message to send when providing a guess
  case class Guess(n: Int)

  // the message to send when the user wants to play another round
  case class Restart()

  // the message to send when the user wants to exit
  case class Leave()

  // notice how we're passing the `ActorRef` to the game actor, even though it'll end up as the `parent`
  def props(game: ActorRef) = Props(classOf[Player], game)
}

class Player(game: ActorRef) extends Actor {
  // perform an `ask` operation, and continue with `then` on success, or `stopWithError` on failure
  def askAndThen[T](ask: Future[T])(then: T => Any) {
    // go into the idle state immediately
    context.become(idle)
    
    ask onComplete {
      case Success(t) => then(t)
      case Failure(t: Throwable) => stopWithError(t)
    }
  }

  // ask for the player's guess and act based on the outcome
  def askForGuess = {
    println("Pick a number between 1 and 100 (inclusive)")

    askAndThen(Utils.readNumericResponse) {
      // the user has provided an answer, send it to the game actor and wait for the next step
      case Some(value: Int) => {
        game ! Player.Guess(value)
        context.become(waitingForRoundResult)
      }

      // the user wants to exit, just stop the player actor and the game actor will shut itself down
      case None => stop
    }
  }

  // ask the player if they'd like to take another try
  def askForRetry = {
    println("Aww, that's not correct. Try again? (Y/n)")
    
    askAndThen(Utils.readBooleanResponse) {
      // they do, so we can now ask for their guess
      case true => askForGuess

      // they don't, just stop the game
      case false => stop
    }
  }

  // ask the player if they would like to restart the game for another round
  def askForRestart = {
    println("You win! Play another round? (Y/n)")

    askAndThen(Utils.readBooleanResponse) {
      // they do, so we can restart the game
      case true => {
        game ! Player.Restart
        context.become(initializing)
      }

      // they don't, just stop the game
      case false => stop
    }
  }

  def stop {
    println(f"Goodbye!")
    game ! Player.Leave
    context.stop(self)
  }

  def stopWithError(t: Throwable) = {
    System.err.println(f"An error has occurred while reading the user's input $t")
    game ! Player.Leave
    context.stop(self)
  }

  // the default behavior or state is the `initializing` state
  def receive = initializing
  
  // this is a shortcut for an empty behavior, where all messages are ignored
  def idle = Actor.emptyBehavior

  def initializing: Receive = {
    case Game.Ready => askForGuess
  }

  def waitingForRoundResult: Receive = {
    case Game.Win => askForRestart
    case Game.TryAgain => askForRetry
  }
}
```

Yep, they do look complete. The only thing left to do now is to update our `Application` object so that initializes the actor system and the game actor.

**Application.scala**
```
package com.yalingunayer.guess

import akka.actor.Actor
import akka.actor.ActorSystem

object Application extends App {
  val system = ActorSystem()
  
  val game = system.actorOf(Game.props)
}
```

It doesn't get any simpler than that. Akka is smart enough to keep the program running until the actor system is shut down so we don't have to do anything else.

## "Gameplay"
So let's give this one a go. Navigate to the project directory and simply run `sbt run`. Here's a sample output:

```text
Pick a number between 1 and 100 (inclusive)
13
Aww, that's not correct. Try again? (Y/n)
y
Pick a number between 1 and 100 (inclusive)
75
Aww, that's not correct. Try again? (Y/n)
y
Pick a number between 1 and 100 (inclusive)
42
You win! Play another round? (Y/n)

Pick a number between 1 and 100 (inclusive)
12
Aww, that's not correct. Try again? (Y/n)
n
Goodbye!
```

## Conclusion
I admit that this looks a bit intimidating, especially for a trivial application like a guessing game, but it does give some insight into how a request-and-reply flow is implemented in an actor-based system. We haven't been able to go into implementing a multitude of actors (as if even this much wasn't complicated enough), but this is something I intend to cover in a future article where we implement a game with multiple players, probably a card game with AI opponents, so stay tuned!

Finally, in case you've missed the link to the codebase, here it is:

> See the code at Github: https://github.com/ygunayer/guessing-game
