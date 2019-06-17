---
title: Making a Browser Based Card Game Using Actors - Part 1
date: 2019-06-11 00:00
tags: [Scala, Akka, Actor Model, Javascript]
---
In the [previous article](/blog/actor-based-multiplayer-card-game) we made a very simple card game using an Akka cluster, but depended on explicit (hard-coded, even) configuration variables to run in the first place. This is highly impractical, even for a pet project, and besides, an actual game would have had some kind of UI, or at least provide a better option for user interaction than a console-attached terminal, right?

So let's embark on a long journey where take our [previous project](https://github.com/ygunayer/bastra) and turn it into a real, production-ready game that we can play on the *browser* and actually enjoy doing it. To do that we'll use stuff like Akka HTTP, Slick, PostgreSQL, RabbitMQ, GraphQL, [React.js](https://reactjs.org/), and cover some systems and software architecture topics such as semantic versioning, JWT-based authentication, database access, containerization (aka zero-config deployments), and realtime matchmaking systems.

<!-- more -->

((project links))

## Game Design
Like any other software project, analyzing our game beforehand will help us make decisions easier and more profoundly. In video games, these are usually done in the form of *game design*, so let's begin with ours.

> **Disclaimer:** I have no prior experience in making games professionally, so the workflow depicted here is purely based on my own experience and imagination.

### User Stories
To help us plan our game we'll rely on the agile development concept of writing user stories. It's usually done by constructing sentences in the form of *"As &lt;an actor&gt;, I want &lt;some goal&gt; so that &lt;some reason&gt;"* which implicitly defines the types of actors (or user roles), the actions they'd like to perform, and the results they expect from those actions.

This conversational way of defining requirements not only helps development teams easily convert them into tasks and create their sprint (or product) backlogs, it also allows teams to negotiate (a controversial word for the agile world, I know) other stakeholders (e.g. product teams, business people) and reach a mutually accepted conclusion in case something's too vague.

Again, you might not care about user stories (or agile in general), but the term *development team* is an abstract one, and can easily refer to a single person such as ourselves, so you can still benefit from its conversational manner even if you're alone. Or better yet, maybe a designer friend is helping you out, who knows?

Ok, back to topic. Since we're making a skill-based (well, more like luck-based but you get the gist) multiplayer game with chat and leaderboards, it's essential that we keep a profile for each of player, and implement an authentication mechanism so we can protect these profiles. We'll use the performance data (gameplay history, overall win rates, etc.) to implement our matchmaking system and leaderboards, and use the profile data to represent our players wherever necessary (chats, leaderboards, etc.).

User stories must be as comprehensive as possible so as not to leave any doubts, so not only our stories should cover in-game activity, but also the activity before and after the games. Let's name our actors according to these states:
- `Player`s are actors who are currently playing a game
- `User`s are actors that are registered to our system but are not currently playing a game
- `Guest`s are actors that aren't registered in our system

- As a guest user, I want to login so that I can play the game
- As a guest user, I want to register so that I can login later on
- As a user, I want to be able to reset my password so that I can login again in case I forget my password
- As a user, I want to be able to view the leaderboards so that I can learn my current standing and compare my skill level with the top players
- As a user, I want to be able to list my last 20 games so that I can get a sense of my recent performance
- As a user, I want to be matched with another user with a similar skill level so that I can play a fair match
- As a user, I want to be able to logout so that the security of my account is not compromised

As for the actual gameplay, let's remember that we want our players to have fun, and to do that we want to implement socalization options, punish toxic players, compensate players who experience interruptions due to external reasons, and also tolerate unintended interruptions as much as possible. If we model these into user stories we come up with the following list:

- As a player, I want to be able to leave the game I'm in so that I can go on with my other business, even if it means receiving some kind of penalty
- As a player, I want to be able to return to a game I've unintentionally left (for a brief amount of time) so that I can continue without getting a penalty
- As a player, I want to be able to leave the game without a penalty when my opponent leaves so that I can find another match, even if it means I won't earn a win
- As a player, I want to be able to chat with my opponent so that I can socialize during or after the game
- As a player, I want to be able to have a rematch with my opponent once the game ends so that I can play another game without waiting
- As a player, I want to be able to leave the game without a penalty so that I can find another match, even if it means having to wait for a certain amount of time

We can of course extend these lists, but I think they cover enough ground for a production-grade MVP, so let's stick with them and plan our systems architecture.

### Systems Architecture and Infrastructure
Anyone who's ever played multiplayer games can easily confirm that the most annoying issues in multiplayer games are connection failures, or the lack of means of recovery from such failures. Although we're not expecting excessive loads (after all this is practically just a pet project), we'll try to make our services as scalable and resilient against failures and outages as possible.

#### Services
By definition, microservices are tasked with specific responsibilities, and in most cases they translate to managing a specific entity that's part of the business domain. In our case, though, we don't have many entities, but we do have separate functionalities. Namely; website, authentication and registration, CRUD API, gameplay, matchmaking and chat.

Our players can only chat during gameplay, and we don't need offline chat anyway, so we'll combine chat and gameplay into a single service. Likewise, there's no need to separate authentication and registration from our regular API, so we'll combine them as well. With this move, however, our API services got a bit bulky, so we'll seperate them into front-facing API servers and core background workers that actually handle the CRUD operations (more on that in the [next section](#message-oriented-middleware)).

With these set, we end up with the following services:
- `web` servers that serve both as our website, and the UI of our game. We'll use React with server-side rendering to fulfill these purposes
- `api` servers that handle authentication and execute GraphQL queries, allowing access to various data (e.g. profiles, gameplay history, leaderboards, etc.)
- `game` servers that handle all gameplay-related functions, from initiating matchmaking, to keeping individual rooms for active games, to handling chat
- `core` services that handle all database I/O for `api` services
- `matchmaking` services that handle matchmaking

#### Message-Oriented Middleware
Microservices are not a silver bullet, and they do come with operational costs, first one being the problem of communication.

In most projects, microservices communicate with each other by sending and receiving HTTP requests. This means that you'll have to develop and maintain separate HTTP clients for each service, but also have each service know the specific hostnames or IP addresses of other services.

This is what service discovery is for to fix, and there really are great projects (such as [eureka](https://github.com/Netflix/eureka)), but there's one thing that they can't fix: HTTP itself.

Due to the nature of HTTP, the entire business logic for a specific kind of request must be handled during the request itself. This means that both the client, and the server must be able to recover from errors.

For simple operations such as database access, we create transactions upon accepting the request, install a request-wide error handler that intercepts errors, and rollback the transaction when an error occurs.

But HTTP requests themselves are not transactional, and doesn't have any standard means of recovery. So if a service has to call another service to handle a specific request, and that service somehow becomes inaccessible momentarily, the entire operation gets cancelled, possibly cluttering some state somewhere with residues.

Not only that, but HTTP has significant overhead as compared to TCP, so each nested request increases th

So if a service has to call another service to handle a request, the client that the request originates will have to wait even longer. Likewise, if one the peers becomes momentarily inaccesible during a request, the request itself fails. So as the number of these jumps increase, all adverse effects (delays, overheads, chances of failure, etc.) increase logarithmically.

If you imagine a scenario where during a 5-step flow, the 4th step collects the 5th step's response but then fails

Thankfully, there exists a method that allows us to address both issues: `message-oriented middleware`, or MOM for short. In a MOM system, each component of the infrastructure communicates with each other using self-contained messages. These messages can often be correlated with others using a certain part of the message (i.e. a `correlationId` field), which helps track down individual steps in a certain business flow.

In the context of microservices, MOM can be implemented by adding a message queue to the infrastructure, and routing all inter-service communication through this queue using differently-typed messages. Even the result of a simple read or get operation will be routed through the queue as an individual message (e.g. a `GetXResult` for a `GetX` operation), allowing fully asynchronous, state-based business flow implementations that can handle errors.

This will save us from having to implement service discovery or hand-coding server addresses on service configurations (aside from the queue), giving us complete freedom to scale our services up and down at any given time. Plus, we'll no longer have to worry about our services crashing while handling an operation either, because the corresponding un`ack`ed message will be requeued, once again becoming available for another service instance to pick up and handle.

### Services
Even with MOM in place, our infrastructure doesn't look much different from other web projects: we'll have front-end servers (web, api, and gameplay), background workers (aka microservices, namely core and matchmaking), a database, a cache server, and a message queue.

**Front-end Servers**

**Microservices**

**Cache Server**
Quite possibly the most popular cache server out there, Redis not only fits our needs (sessions, short-term non-persistent storage, etc.), but it also has methods like [ZRANGEBYSCORE](https://redis.io/commands/zrangebyscore) which is perfect for matchmaking.

**Database**
With Redis handling most of the read load, we'll use our database primarily for authentication and long-term persistent storage. To that end, PostgreSQL is more than enough.

**Message Queue**
While there are many other options, we'll go with RabbitMQ, very fast and highly reliable message broker, written in Erlang.

### Infrastructure

#### Local Environment
It's common practice in many software companies to use a "test" or "development" database that you need to connect during development, and in almost all cases you'll need to dial to a VPN in order to access it. While it does has its own benefits (like exposing local environments on the same virtual network, not having to manage a DB locally, etc.), it also strips developers off a lot of their freedom, requiring them to have internet access at all times, slowing down their entire internet, sometimes blocking access to various websites, etc.

All in all I think it ultimately does much more harm than it does good, so we'll instead set up a tiny version of our entire infrastructure on our local machine. One thing to note here that it's not very ideal to install every database or cache server on your local machine either because it then gets cluttered with things you put in years ago but now you don't remember a thing about.

As such, we'll use Docker Compose to run our entire stack (minus things we develop locally) so we'll be able to start and stop our entire stack at will, shut it down whenever we don't need them, or completely remove and purge them in case we don't want them any longer. We'll also put in `nginx` it so we can reverse-proxy our locally-running microservices, exposing them locally at custom domains such as `www.bastra.dev`.

#### Production Environment (or any other non-local environment)
As for the production environment, remember that scalability is key, so we'll use a Google Cloud to host our infrastructure.

Dockerized services make much more sense in the cloud than it does locally, so that's why almost all cloud providers provide container orchestration tools that allow you to manage and deploy your infrastructure as maintainable configuration files. This is similar to what Docker Compose does but in cloud scale.

Most cloud providers also have managed versions of various services like databases and cache servers, with interfaces that you may choose to your bidding.

In fact, our local development environment is actually just a mirror of our production environment, minus the microservices, which we'll use Google Cloud to host on. Google Cloud has a Kubernetes engine (Kubernetes or `k8s` for short is the de-facto standard) Ingress to proxy them, Cloud SQL with PostgreSQL interface as our database, and Google Memorystore as our Redis. Sadly, RabbitMQ doesn't have a built-in replacement on Google Cloud, but it does have a managed service option by Bitnami which we'll also be using.
