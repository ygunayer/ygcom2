---
title: Actor-based Number Guessing Game in Akka
date: 2016-04-05 00:00
tags: [Scala, Akka, Actor Model]
---
Now that the basics of the actor model is out of the way, it's time to make something with it! We'll begin by creating an Akka project from scratch, and then move on to implementing a number guessing game based on actors, which will give us an easy start in modeling actor-based systems.

The rule of the game is quite simple; it'll pick a random integer between 1 and 100, and user will try to guess it. Each time the user provides a guess, the game with reply with a message that states how hot or cold the guess was, depending how close it was to the actual number. All interaction will be through the console, so no unnecessary complication there.

Note: I won't go into any details about the model nor Akka's implementation of it, so if you're ever in need of assistance, feel free to use the [previous article](/blog/introduction-to-the-actor-model-with-akka) as a reference.

<!-- more -->

## Preparing the Environment
Before we can get started on creating our first project, we need to install a few dependencies first. These are JDK, Scala, Scala Build Tool (or SBT for short) and Lightbend [Activator](http://www.lightbend.com/community/core-tools/activator-and-sbt) (it's not really a dependency, but it's convenient). You'll have to install JDK on your own, but you can just skip Scala and SBT and install Activator right away because it can install them for you (provided you've installed JDK).

For reference, here's a list of what I have installed at the time of this writing:
- [JDK 1.8.0_51](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)
- [Scala 2.11.7](http://www.scala-lang.org/download/)
- [SBT 0.13.8](http://www.scala-sbt.org/download.html)
- [Activator 1.3.6](http://www.lightbend.com/activator/download)

When it comes to IDEs, the choices are pretty much the same as Java, it's either [Scala IDE](http://scala-ide.org/) (Eclipse-based) or [IntelliJ IDEA](https://www.jetbrains.com/idea/) (Community Edition will do), but they both require some preparation before you can use them.

### Scala IDE
The Eclipse-based Scala IDE does not have a built-in way to import SBT-based projects, so you'll have to install the SBT plugin [sbteclipse](https://github.com/typesafehub/sbteclipse). As documented in the repository page, you can install it directly to your computer, or add it as a dependency on your project so it gets installed once you've started building the project with SBT. I recommend the former method, because an IDE plugin is not technically a prerequisite of a project, but of programmers.

When you've got it installed, all you have to do import your project into Scala IDE is to launch up a terminal, go into the project folder, and run

```bash
sbt eclipse
```

### IntelliJ IDEA
IDEA does not support Scala by default, so you'll have to install a plugin in order to get it to work. Fortunately, IDEA does have it on its plugin repository, so all you need to do is to just go into the plug-in options and install it from there. Once you've got it installed, you're all set, as it comes with the ability to import SBT-based projects, and create projects based on Activator templates. See [Creating and Running Your Scala Application](https://www.jetbrains.com/help/idea/2016.1/creating-and-running-your-scala-application.html?origin=old_help) at JetBrains website for more detailed instructions.

Once you've got it installed, you can safely import any SBT project, but keep in mind that IDEA likes to keep its own Ivy cache (where SBT downloads the dependencies of all projects and stores them for later use), and it means that it'll re-download any dependency you've got installed through SBT using the command line. If that bothers you, here's how you can get IDEA to use the same cache folder as the default one: [http://stackoverflow.com/questions/23845357/changing-ivy-cache-location-for-sbt-projects-in-intellij-idea](http://stackoverflow.com/questions/23845357/changing-ivy-cache-location-for-sbt-projects-in-intellij-idea)

## Creating the Project
While scaffolding tools like Activator are great, I think it's important to be able to create projects manually, and from scratch, because it helps you understand how things really work.

The outline of a Scala project is pretty much the same as a regular Java project. At the root folder, it has the build file (aka `build.sbt`), the source folder (aka `src`), and if using a SCM tool, its ignore file (aka `.gitignore`). Under the `src` folder are the `main` and `test` folders, each of which contain a hierarchy of folders that mirrors the package structure of the project.

> I encourage you to take the time and follow these steps by yourself, but if you're not interested, feel free to clone the starter project at [https://github.com/ygunayer/guessing-game-starter](https://github.com/ygunayer/guessing-game-starter)

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
package com.ygunayer.guess

object Application extends App {
  println("Hello, world!")
}
```

Once you've laid out the project structure, all is left to import the project into your IDE. To rephrase, if you're using IntelliJ IDEA just import the folder directly, and if you're using Scala IDE instead, navigate into the project folder, run `sbt eclipse`, and then import the project into Eclipse.

## The Implementation
Now that we've got everything covered, it's time to implement the game. To reiterate, here's what our game flow looks like:

1. The game picks a random integer between 1 and 100
2. The game asks the player for their guess
3. The player replies with a number or an exit command
4. If the player has provided an exit command, go to step 7, if not, go to step 5
5. If the number provided by the player matches the number determined by the game, go to step 6, if not, go back to step 2
6. The game congratulates the player and exits
7. The game tells the player goodbye and exits

Looking at the flow it's pretty obvious that we need two actors, the game (`GameActor`) and the player (`PlayerActor`). As the center of the game logic, the game actor will serve as the master and will determine the outcome of the program.

I prefer to create my projects manually, so as always, I'll refrain from using a scaffolding tool such as Activator, but if you do, make sure to use the `minimal-akka-scala-seed` template.

The first thing we'll need is the SBT file which will tell the 

Once that's done (which might take quite a while the first time, so be way), import the project into your IDE. As stated before, this can be done in two ways, and I'll go for the Eclipse one: `cd` into the project folder, type `sbt eclipse`, and import the folder into Scala IDE.

The template we used comes with lots of things that we don't exactly need, so feel free to delete `PingActor.scala`, `PongActor.scala` an 
