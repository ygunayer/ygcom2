---
title: Making a Browser Based Card Game Using Actors - Part 1
date: 2017-12-07 00:00
tags: [Scala, Akka, Actor Model, Javascript]
---
In the [previous article](/blog/actor-based-multiplayer-card-game) we made a very simple card game using an Akka cluster, but depended on explicit (hard-coded, even) configuration variables to run in the first place. This is highly impractical, even for a pet project, and besides, an actual game would have had some kind of UI, or at least provide a better option for user interaction than a console-attached terminal, right?

So let's embark on a long journey where take our [previous project](https://github.com/ygunayer/bastra) and turn it into a real, production-ready game that we can play on the *browser* and actually enjoy doing it. To do that we'll use stuff like Akka HTTP, Slick, Cassandra, RabbitMQ, GraphQL, [React.js](https://reactjs.org/), and cover some systems and software architecture topics such as using semantic versioning, separating projects and making them depend on each other, authentication, database access, environment-dependent configurations, multi-node clustering, and realtime matchmaking systems.

<!-- more -->

((project links))

## Game Design
Like any other software project, analyzing our game beforehand will help us make decisions easier and more profoundly. In video games, these are usually done in the form of *game design*, so let's begin with ours.

> **Disclaimer:** I have no prior experience in making games professionally, so the workflow depicted here is purely based on my own experience and imagination.

### Fundamentals
Let's begin by laying out some fundamental rules. Not only these will help us set the foundation that our game will be built upon, it will also help us come up with principles that will add value to our game.

> **Note**: This sections contains subjective (and maybe unrealistic, at least for the real-world gaming industry) thoughts about gaming overall (e.g. what makes a game *good* or *valuable*), and although they're referred to in further sections, feel free to skip ahead to the next section if you're not interested in these stuff.

Perhaps the first thing to acknowledge is that we're making our game to be *played*. Since we're making a highly popular tile game, we already have the basic incentives for people to play our game (assuming that they already know about our game), so what we actually need to focus on is the *replay value*.

Replay value can be defined as the degree at which a game can instill the desire to be played repeatedly. The latest trend in achieving high replay value is implementing new features over and over, but this can only work for large companies. As part-time pet project people we simply don't have enough resources to come up with new features. Instead, we'll hold on to intrinsic values as strongly as possible, and hope that they alone keep bringing people back.

Intrinsic values are basically the stuff that make a game *good*. These include good artwork, good sound quality, good music, a well-written story, smooth and fair gameplay, a responsive UI, a proper sense of fulfillment, a feeling of accomplishment, worthwhile rewards, and proper punishment for bad/toxic behavior. Each of these values are so powerful that they can compensate each other greatly, so much so that even games that lack severely in one aspect can be played over and over, years after its initial release (e.g. Vampire: The Masquerade - Bloodlines with its infamous game-breaking bugs, Deus Ex with its laughably bad voice acting at times)

So instead of constantly blurting out features, we'll come up with a game that's valuable at its core. A game with the following core values:
- Rich and responsive UI
- Good UX
- Smooth gameplay (this includes network stability, server availability, UI performance)
- Fair matchmaking
- Proper sense of accomplishment (this includes track records)
- Proper punishment for toxic behavior
- Proper compensations for complications not caused by players (e.g. leavers, outages, loss of track records)
- Tolerance for unintentional connection losses
- (Just in case) Enough room to add payable features that don't give players advantages in gameplay but may serve as eye candy (i.e. no pay-to-win features ever)

### User Stories
To help us plan our game we'll rely on the agile development concept of writing user stories. It's usually done by constructing sentences in the form of *"As &lt;an actor&gt;, I want &lt;some goal&gt; so that &lt;some reason&gt;"* which implicitly defines the types of actors (or user roles), the actions they'd like to perform, and the results they expect from those actions.

This conversational way of defining requirements not only helps development teams easily convert them into tasks and create their sprint (or product) backlogs, it also allows teams to negotiate (a controversial word for the agile world, I know) other stakeholders (e.g. product teams, business people) and reach a mutually accepted conclusion in case something's too vague.

Again, you might not care about user stories (or agile in general), but the term *development team* is an abstract one, and can easily refer to a single person such as ourselves, so you can still benefit from its conversational manner even if you're alone. Or better yet, maybe a designer friend is helping you out, who knows?

So, looking back at our core values, it's clear that we need store a profile for our players, and record their individual gameplay performances. This will not only allow them to simply login and logout, but also allow us tune our matchmaking system so that it's as fair as possible.

With user profiles in place, we end up with 3 kinds of users: `guest`, `user` (logged-in user), and `player` (in-game user). Combined with matchmaking benefits, user profiles and other things that come with it (game history, leaderboards, etc.), we generate the following list of stories:

- As a guest user, I want to login so that I can play the game
- As a guest user, I want to register so that I can login later on
- As a user, I want to be able to reset my password so that I can login again in case I forget my password
- As a user, I want to be able to view the leaderboards so that I can learn my current standing and compare my skill level with the top players
- As a user, I want to be able to list my last 20 games so that I can get a sense of my recent performance
- As a user, I want to be matched with another user with a similar skill level so that I can play a fair match
- As a user, I want to be able to logout so that the security of my account is not compromised

As for the actual gameplay, remember that we want our players to have fun, and to do that we want to implement socalization options, punish toxic players, compensate players who experience interruptions due to external reasons, and tolerate unintended interruptions as much as possible, so we come up with the following stories:

- As a player, I want to be able to leave the game I'm in so that I can go on with my other business, even if it means receiving some kind of penalty
- As a player, I want to be able to return to a game I've unintentionally left (for a brief amount of time) so that I can continue without getting a penalty
- As a player, I want to be able to leave the game without a penalty when my opponent leaves so that I can find another match, even if it means I won't earn a win
- As a player, I want to be able to chat with my opponent so that I can socialize during or after the game
- As a player, I want to be able to have a rematch with my opponent once the game ends so that I can play another game without waiting
- As a player, I want to be able to leave the game without a penalty so that I can find another match, even if it means having to wait for a certain amount of time

We can of course extend these lists, but I think they cover enough ground for a production-grade MVP, so let's stick with them and plan our systems architecture.

### Systems Architecture
One of our core values is smooth gameplay, so our games sohuld be as resistant to network and server failures as possible. To achieve this, we'll introduce two kinds of servers to maintain the gameplay: front-end and back-end. Front-end servers will act as conduits between our clients (a.k.a. the browser) and game servers (a.k.a. back-end), and also retain WebSocket connections for persistent two-way communication with the browser.

Remember how we had to specifically enter the IP addresses for each node in our Akka cluster? In today's world where we need instantaneous scalability options, this is incredibly impractical, so we need some kind of mechanism that will allow our services to communicate with each other without ever knowing their addresses. Aside from dynamic scalability options, we also need to be able to recover from both client and server failures, so we need to retain the information flow somehow.

One communication pattern that provides both of these capabilities is MOM (message-oriented middleware), which can be achieved by letting services communicate with each other through a message queue. To that end, we'll use `RabbitMQ`, and have separate messages for maintaining game sessions and handling in-session communication. That way, when a service goes down, another can rise up in its place, and resume the intended flow without losing information.

To improve our scalability further, we'll also separate our back-end servers according to their responsibilities:
- *API* services will be responsible with authentication, registration, and profile/leaderboard/history queries
- *Matchmaking* services will be responsible with pairing players with identical skill levels
- *Game* servers will be responsible with hosting and maintaining gaming sessions

...
