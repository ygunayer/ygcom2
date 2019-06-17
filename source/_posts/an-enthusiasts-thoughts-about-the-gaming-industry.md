---
title: An Enthusiast's Thoughts About the Gaming Industry
date: 2019-03-06 10:37
tags: [Gaming]
---
While I was working on the next article in my [actor model series](/blog/actor-based-multiplayer-card-game) I found myself ranting about the gaming industry, and how we've ended up in this state where quality games are a rarity, and how we could get ouf this state by adding *value* to our game and intrinsically increasing its quality, and perhaps profitability.

When I asked a friend to review the draft version of the article, his immediate reaction was *"Wait, isn't this article about creating a game using Akka actors?"*, and while I did think it was better to include some of the philosophy behind the game I was trying to make, now I realize that it's all apples and oranges, and I'm actually better off moving that topic into an article of its own. In fact, I'll try to move each sub-topic that are not directly related to using Akka actors to build games into their own articles so that no articles are polluted, and this website maintains its essence as a *blog*, and not a collection of "sections" from an unpublished book.

So here we are. If you're interested in the game design philosophy of a gaming enthusiast, and not a professional game developer, keep reading.

<!-- more -->
## What's a "Game"?
One of the definitions for the word *game*, the definition that we're actually interested in, is *"activity engaged in for diversion or amusement"*. 

Perhaps the first thing to acknowledge is that we're making our game to be *played*. Since we're making a somewhat popular card game, we already have the basic incentives for people to play our game (assuming that they already know about our game), so what we actually need to focus on is the *replay value*.

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
