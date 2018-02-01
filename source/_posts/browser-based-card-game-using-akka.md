---
title: Making a Browser Based Card Game Using Actors - Part 1
date: 2017-12-07 00:00
tags: [Scala, Akka, Actor Model, Javascript]
---
In the [previous article](/blog/actor-based-multiplayer-card-game.md)) we made a very simple card game using an Akka cluster, but the end product was somewhat impractical since it lacked any sensible user interaction, and more importantly, it explicitly depended on hard-coded configuration variables to run.

This time we'll take on the challenge to expose our game's backend over the web to the browser, and let people play the game using an actual UI! While we're at it, why not implement a (very basic) chat system?

Do to this we'll use [Play! Framework](https://www.playframework.com/) to wrap our [previous project](https://github.com/ygunayer/bastra) with a web application to expose it to the browser, [Pixi.js](http://www.pixijs.com/) to render our game scene, and [React.js](https://reactjs.org/) to handle user interaction and state flow.

Let's embark on a long journey where take our [previous project](https://github.com/ygunayer/bastra) and turn it into a real, production-ready game that we can play on the browser. During this process, we'll use stuff like Akka HTTP, Slick, Cassandra, and [React.js](https://reactjs.org/), and cover more advanced topics such as using semantic versioning, separating projects and making them depend on each other, authentication, database access, environment-dependent configurations, multi-node clustering, and realtime matchmaking systems.

<!-- more -->

((project links))

## Analysis
Like any other software project, analyzing our game beforehand will help us make decisions easier and more profoundly, so let's do that first.

### User Stories
To help us plan our game we'll rely on the agile development concept of writing user stories. It's usually done by constructing sentences in the form of *"As &lt;an actor&gt;, I want &lt;some goal&gt; so that &lt;some reason&gt;"* which implicitly defines the types of actors (or user roles), the actions they'd like to perform, and the results they expect from those actions. A team can easily convert those stories into tasks and create their sprint backlogs, and when a story is too vague to be turned into a task, it can always be split into multiple stories to cover each detail. While we don't exactly have a team, it's a still great tool that will allow us to succintly define our requirements in a conversational way.

Since we're making a 2-player online game that uses matchmaking, we have 3 ways to represent a user: a guest, a logged-in user, and an in-game user. As it happens, we can model our roles around these representations, so we end up with three roles, and a login/register/password reset flow. Let's write our stories based on these observations.

- As a guest user, I want to login so that I can play the game
- As a guest user, I want to register so that I can login later
- As a user, I want to be able to reset my password so that I can login again in case I forget my password
- As a user, I want to be able to view the leaderboards so that I can learn my standing and compare my skill level with the top 10 players
- As a user, I want to be matched with another user with a similar skill level so that I can play a fair match
- As a user, I want to be able to logout so that the security of my account is not compromised
- As a player, I want to be able to leave the game I'm in so that I can go on with my other business, even if it means I'll get penaltied and earn a loss
- As a player, I want to be able to return to a game I've unintentionally left that I can continue without getting a penalty
- As a player, I want to be able to leave the game without a penalty when my opponent leaves so that I can find another match, even if it means I won't earn a win
- As a player, I want to be able to chat with my opponent so that I can socialize during the game, and congratulate them for playing when the game ends
- As a player, I want to be able to have a rematch with my opponent once the game ends so that I can play another game without waiting
- As a player, I want to be able to leave the game without a penalty so that I can find another match

Well, that pretty much covers everything (at least from an MVP). Based on these stories, let's attempt to break down our infrastructure into its components.

### Systems Architecture
As with any web application, our app begins with a user interface, in this case, a browser app. We'll write this app using React, bundle it using Webpack, and serve it through some kind of static file server. This server 

When we look at our stories we can immediately tell that we need a database that handles frequent reads and writes well, and possibly supports some kind of mechanism that will allow us to store temporary data. One such database is Cassandra, as it handles load pretty well, and supports column-level TTLs that will allow us to properly maintain our ephemeral matchmaking data.

We also need a messaging system that will allow players to chat, and since we don't really need global or private channels, nor to store any messages, we'll simply go ahead and let our actor systems the chatting bits.

Next, since we intend this architecture to be a basis for our future games, we'll prep




Our stories tell us that we need some kind of queryable persistent storage to store our player and leaderboards data, a queryable temporary storage system for matchmaking and rejoin capabilities, and a messaging system that will allow players to chat. Cassandra is an excellent database for our use case as it handles frequent reads and writes pretty well, and supports column-level TTLs which will allow us to fail-proof our matchmaking system. As for the messages, we don't actually have to store any of them so we can simply have them run through our actors.

Since we're using our previous project as the basis of this one, we'll leave the game rules as they are and fill in the other gaps.

One such gap is the matchmaking phase. The first iteration of our project had it very basic, it only paired up the first two players it found. This time we'll have a score based matchmaking system that will take into account the win/loss ratio of invididual players and try to match players of similar win rates. This requires a data store that is both persistent and live, and one such store is [Firestore](https://firebase.google.com/products/firestore/).

Using a realtime database such as Firestore will not only enable us to scale our server instances, but also fill another gap, which is the chat system. Since all data is live 

Lastly, our previous game client relied on the console to print out stuff, but this time we have browsers in our hands, which means we'll need to use WebSockets to push data from our servers to clients.

Also, we'll use Docker to run all our applications and services, and Docker compose to tie them together. As such, our architecture will look something like this:



## Planning the Layout
Planning our layout beforehand will help us analyze our game, so let's do that before moving on to tech
We have a lot of technical stuff to deal with, so let's plan our layout and prepare some placeholders first.


