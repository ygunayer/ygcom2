---
title: Introduction to Erlang
date: 2019-07-24 00:00
tags: [Erlang, Actor Model]
---
As mentioned in my [introductory article to the actor model](/blog/introduction-to-the-actor-model-with-akka), the programming language Erlang implements the actor model as its core functionality, so anyone who's got exposed to Akka is bound to have heard about it, and quite possibly they've become interested with it.

While I certainly was interested, that interest has only recently grown into the "oh boy I've got to try this right now" levels. Now that I'm this hyped, and we're waiting for Scala 3 anyway, it's the perfect time to play around with Erlang.

So in this article, we'll go over a quick introduction to Erlang, and in subsequent articles we'll rewrite our bastra game from the [previous article](/blog/actor-based-multiplayer-card-game) in Erlang, with exactly the same functionality.

If you're interested in learning more (much, much more) about Erlang, just check out the incredible book *Learn You Some Erlang for Great Good!* either in [printed](https://nostarch.com/erlang) or [online](https://learnyousomeerlang.com/content) form.

<!-- more -->

## History and Principles
Erlang was developed at Ericcsson in 1986 by three engineers, Joe Armstrong, Robert Virding, and Mike Williams, and was open-sourced in 1998. It was designed to operate under heavy load with constant and concurrent information flow, and still be tolerant against failures. To best summarize its design philosophy, the late Joe Armstrong listed the following fundamental principles:

- Everything is a process
- Processes are strongly isolated
- Process creation and destruction is a lightweight operation
- Message passing is the only way for processes to interact
- Processes have unique names
- If you know the name of a process you can send it a message
- Processes share no resources
- Error handling is non-local
- Processes do what they are supposed to do or fail

If these sound familiar, try replacing the word "process" with "actor", and voila, it's the actor model! If you remember the fundamental principles of Akka from our [first article on the subject](/blog/introduction-to-the-actor-model-with-akka), you'll realize that these principles reflect the exact same concerns as Akka: states of processors (aka actors) are isolated and private, they're identified by names (aka addresses), they communicate through message-passing, and they fail on errors, allowing them to be handled by their parents (aka supervision strategies).

What's fascinating is that the designers of Erlang weren't actually trying to implement the actor model, but rather, they were trying to come up with a programming language that would allow them to fix the real-world issues that they were having, and the solution ended up implementing the actor model itself.

Since we're already familiar with the actor-related features of Erlang, all we have to do to make our game is to get used to the language itself. This roughly amounts to the syntax, typing system, how it handles strings (which is said to be quite cumbersome), how Erlang apps are run, and how they're bundled.

## Fundamentals of Erlang
### Erlang Runtime
If you picture the standard programmable computer architecture as a stack of layers, at the bottom is the hardware (aka the physical layer), and on top of it is the operating system. The operating system can directly run native binaries that are written in the specific machine language the processor requires, and provides it with a set of libraries (with specific interfaces) to interact with the hardware.

Whereas languages like C, C++, Rust, and Go are compiled into machine code and can therefore be run directly on the OS; languages like C#, Java, and Scala are compiled into special "bytecode" languages which should then be interpreted and run by a custom virtual machine, running on top of the OS.

For instance, C# and F# are compiled into CIL (Common Intermediate Language, previously MSIL or Microsoft Intermediate Language), which can then be run by the .NET or Mono runtimes, whereas Java and Scala are compiled into Java bytecode, which can then be run by JVM, the Java Virtual Machine. Like C# and Java, Erlang is also compiled into bytecode, and is run by a VM.

The generic name for a runtime system that can run Erlang programs is "Erlang runtime system", and the standard runtime system for Erlang is dubbed "ERTS", which is (somewhat confusingly) the short for "*E*rlang *R*un*T*ime *S*ystem". There are other ERTSs like Erjang which runs Erlang on JVM, but what we'll base our article on is the Ericcsson-standard ERTS. See the online book [The Beam Book](https://blog.stenmans.org/theBeamBook/) for more information.

ERTS is made up of a core that interfaces with the OS, a VM that interprets and runs bytecode on that interface (`BEAM`), and a runtime framework (`OTP`) that manages individual Erlang `node`s.

![The ERTS stack](https://blog.stenmans.org/theBeamBook/diag-23ae168750d38078baa5a26c03ad58e1.png)

#### BEAM (Bogdan's/Bjorn's Erlang Abstract Machine)
BEAM is the virtual machine that compiles raw Erlang code into bytecode, and then interprets and executes the given bytecode on the host machine. In that sense, BEAM is the JVM of the Erlang world.

Compiled BEAM bytecode are stored as files with `*.beam` extension, and can be distributed as such.

#### OTP (Open Telecommunications Platform)
Erlang is built for high fault-tolerance, so if you think about how we're supposed to run our app, you'll quickly realize how cumbersome it would be to build a resilient "host" process that would run your app. Creating a program that properly handles failures, recovery, scalability, and scheduling options, run directly through a terminal command, or run in the background as a service, basically means reinventing the wheel, since that's Erlang's premise, and it's where OTP comes into place.

It's both the ERTS layer that manages the lifecycle of Erlang processes, and a framework defines an abstraction for inter-communicating processes that run concurrently in the ERTS, and provides them with a set of modules and standards to help build apps that fit those abstractions. The specs for interfaces and instructions that can be used to configure the supervisioning strategies of a process are defined under OTP's design principles, so in that sense, OTP is what provides Erlang the necessary abstractions for implementing the supervisioning part of the actor model.

So if we ever want to implement supervisioning, we can simply configure its properties using a few instructions, and then move on to implementing our business logic. OTP will take care of the rest.

#### Nodes
An Erlang node is an individual ERTS instance that's running on a host machine. Multiple Erlang nodes can run on the same machine, and each node has a name, presenting with a unique path that other nodes can send messages to. In that sense, they're roughly equivalent to actor systems.

**Hint:** Whenever you run the Erlang shell using command `erl` you effectively create and execute a new Erlang node.

### Syntax Basics
Erlang has only a few primitive data types (strings, numbers, tuples, lists, functions, and atoms), and any other types in their traditional sense is simply non-existent. Custom types can be created arbitrarily with curly brackes (e.g. `{foo}`), and can later be matched against.

It's important to note that variables must start with a capital letter, whereas any keyword that starts with a lowercase letter creates an `atom`. In that sense, `{foo, 42}` and `{Foo, 42}` are different things, so one must take extra care when reading types, especially at the beginning, as the difference might be too subtle.

### Modules
Erlang lets us bundle our apps and libraries into modules, allowing them to be namespaced under a certain name, exposing only the functions that we've specifically told it to. We declare our modules in the form of `-module(name)`, export its functions in the form of `-export([function1/arity, ...]).` (arity referring to the number of arguments the functions accept), and likewise, we import them in the same manner `-import(name, [function1/arity, ...]).`.

### Concurrency Primitives
Processes are the fundamental building blocks of Erlang's concurrency model. Each process has a unique `Pid`, to which messages can be sent, a message box where those messages are temporarily stored in, and a target function that it passes over those messages to. Upon consuming a message, a function can loop or switch to another function (aka `become`/`unbecome` from Akka), after which the subsequent messages will be received either by the function itself, or the function it previously switched to.

To create a process, we can either call `spawn/3` or `spawn_link/3` (the latter also "linking" actors hierarchically), both of which return the `Pid` of the created process. We can then send the `Pid` any message we want using the `!` operator, just like in Akka.

### Dependency Management
Any serious programming language should have some kind of standart (or at least de-facto standard) package/dependency management tool (I'm looking at you, C++), and Erlang has `rebar3` (previously rebar) for that purpose. Like `sbt`, rebar3 is both a package manager, a build tool, and a scaffolder, since it can generate projects based on templates (like sbt), download dependencies, build our libraries into packages that can be published, and can wrap our apps in Erlang shells with specific options.

## Examples
> **Hint:** The code to the examples below can be found on the GitHub repo [ygunayer/erlang-intro](https://github.com/ygunayer/erlang-intro)

### bar: Module Basics
Let's write a very simple program that outputs something retrieved from another module.

Go to a folder of your liking and create the following files:

**foo.erl**
```erl
-module(foo).
-export([foo/0]).

foo() ->
    42.
```

**bar.erl**
```erl
-module(bar).
-export([start/0]).
-import(foo, [foo/0]).

start() ->
    io:write(foo:foo()),
    io:format("~n").
```

As apparent from the code, we simply define a module called `foo` that exports a single function, `foo()`, and then use it on a separate module called `bar`, spefically in the function `start()`. We also export the `start/0` function from `bar` so we can run access it on the Erlang shell.

To run the code, simply navigate to the project directory, and open up the shell. Then, compile both `foo` and `bar` files using the command `c(...).`, and run `bar`'s `start()` method using `bar:start().`. The expected output is `42\nok`.

```bash
$ erl
1> c(foo).
{ok,foo}
2> c(bar).
{ok,bar}
3> bar:start().
42
ok
```

We can also achieve the same functionality without dropping into Erlang's shell.

```bash
$ erl -compile foo
$ erl -compile bar
$ erl -noshell -s bar -s init stop
42
```

The `-compile` flag is self-explanatory, it simply compiles the source code for the given module into a `.beam` file. The `-s` option, on the other hand, is used to start a given module. When called with a single argument, it attempts to run the `start/0` method for the given module (in this case, `bar:start/0`). When called with 2 arguments, the second argument refers to the function to call, again with 0 arity (in this case, `init:stop/0`). When called with 3 or more arguments, all arguments beginning with the 3rd are passed over to the function specified in the 2nd argument, to which the argument count should match the arity of (e.g. `-s foo bar 1 2` means `foo:bar(1, 2).`).

### pokemon: Stateful Processes
While technically a process, this example uses a stateful but not concurrent "actor" to demonstrate their stateful nature. To that end, we'll create a pokemon and evolve it as we talk to it to observe how its behavior changes.

**pokemon.erl**
```erl
-module(pokemon).
-export([start/0, pikachu/0, raichu/0]).

pikachu() ->
    receive
        {talk} -> io:format("Pikachu! Pika, pika!~n"), pikachu();
        {thunder_stone} -> io:format("Pikachu is evolving to Raichu!~n"), raichu();
        {Other} -> io:format("Pikachu is very sorry but it doesn't quite know what to do with ~w.~n", [Other]), pikachu()
    end.

raichu() ->
    receive
        {talk} -> io:format("Rai!~n");
        {thunder_stone} -> io:format("Thunder stone has no effect on Raichu.~n");
        {Other} -> io:format("Raichu stares at ~w with a puzzled smile.~n", [Other])
    end,
    raichu().

start() ->
    Poke = spawn_link(pokemon, pikachu, []),
    Poke ! {talk},
    Poke ! {fire_stone},
    Poke ! {thunder_stone},
    Poke ! {talk},
    Poke ! {fire_stone},
    Poke ! {thunder_stone},
    Poke ! {talk}.
```

The output of the code is pretty self-explanatory:

```bash
$ erl -compile pokemon
$ erl -noshell pokemon -s start -s init stop

# Pikachu! Pika, pika!                                                        (received: {talk})
# Pikachu is very sorry but it doesn't quite know what to do with fire_stone. (received: {fire_stone})
# Pikachu is evolving to Raichu!                                              (received: {thunder_stone})
# Rai!                                                                        (received: {talk})
# Raichu stares at fire_stone with a puzzled smile.                           (received: {fire_stone})
# Thunder stone has no effect on Raichu.                                      (received: {thunder_stone})
# Rai!                                                                        (received: {talk})
```

### fizzbuzz: FizzBuzz Concurrent Edition
How can a programming language tutorial exist without a fizz buzz example? So as an homage to [the enterprise edition fizz buzz](https://github.com/EnterpriseQualityCoding/FizzBuzzEnterpriseEdition), let's *slightly* over-engineer the problem and a concurrent version of it!

In this version, we'll have three components:

- `fizzbuzz`: The entrypoint of our application. Accepts user input and passes 
- `manager`: Generates the numbers and passes them over to the `handler`
- `handler`: Handles a number, printing `fizz`, `buzz`, `fizzbuzz` or the number itself

The manager will be stateful, and will not accept any `{go}` command as it waits until its job is finished.

**fizzbuzz.erl**
```erl
-module(fizzbuzz).
-import(manager, [init/0]).
-export([start/0]).

get_user_input() ->
    case io:fread("Please enter a number to count towards: ", "~d") of
        {ok, [N]} -> N;
        _ -> io:format("You have entered an invalid number, please try again.~n"), get_user_input()
    end.

start() ->
    Limit = get_user_input(),
    Manager = spawn_link(manager, init, []),
    Manager ! {go, Limit},
    Manager ! {go, Limit}. % consciously send duplicate messages to demonstrate statefulness
```

**manager.erl**
```erl
-module(manager).
-export([init/0]).

init() ->
    idle().

idle() ->
    receive
        {go, N} ->
            Handler = spawn_link(handler, init, []),
            Numbers = lists:seq(1, N),
            lists:foreach(
                fun(X) ->
                    Handler ! {self(), {handle, X}}
                end,
                Numbers
            ),
            waiting_for_results(Numbers)
    end.

waiting_for_results(Numbers) ->
    receive
        {Handler, {result, Number, Output}} ->
            io:format("~s~n", [Output]),
            Remaining = lists:delete(Number, Numbers),
            case length(Remaining) of
                0 -> io:format("Finished processing all numbers.~n"), Handler ! stop, idle();
                _ -> waiting_for_results(Remaining)
            end;
        {go, _} -> io:format("Manager is currently busy~n"), waiting_for_results(Numbers)
    end.
```

**handler.erl**
```erl
-module(handler).
-export([init/0]).

decide(N) when (N rem 3 == 0) and (N rem 5 == 0) -> "FizzBuzz";
decide(N) when (N rem 3 == 0) -> "Fizz";
decide(N) when (N rem 5 == 0) -> "Buzz";
decide(N) -> integer_to_list(N).

loop() ->
    receive
        {Sender, {handle, X}} ->
            Result = decide(X),
            Sender ! {self(), {result, X, Result}},
            loop()
    end.

init() ->
    loop().
```

When we compile these files and run the `fizzbuzz` module, we'll be asked for a number. Upon entering a number, the manager will receive the input, create a handler, and sequentially send it all numbers in the range [1, input]. The handler will then decide what to print for each given number, and send the decision to the manager. The manager will then print the result and repeat this process until all numbers are printed out.

```bash
$ erl -compile handler
$ erl -compile manager
$ erl -compile fizzbuzz
$ erl -noshell -s fizzbuzz -s init stop
# Please enter a number to count towards: 16
# Manager is currently busy
# 1
# 2
# Fizz
# 4
# Buzz
# Fizz
# 7
# 8
# Fizz
# Buzz
# 11
# Fizz
# 13
# 14
# FizzBuzz
# 16
# Finished processing all numbers.
```

### guess: Guessing Game
Having implemented the previous examples, we now know enough to rewrite our number guessing game from our previous article, [Actor-based Number Guessing Game in Akka](https://yalingunayer.com/blog/actor-based-number-guessing-game-in-akka/).

We'll keep the feature set and gameplay the same (adding a few cheats), so all we'll have to do is to implement an actor pick a random number between 1 and 100, and have it communicate with the user until they find the correct number.

In conformity with the server/client separation principle, we'll have separate actors for the game logic and player interaction, and also, like before, we'll have a separate module that will host our game.

In the end, we end up with 3 modules: `guess` for hosting the game, `game` to act as the game server, `player` for handling user input.

**guess.erl**
```erl
-module(guess).
-export([start/0]).

-import(game, [init/0]).

start() ->
    Game = spawn_link(game, init, []),
    Game ! {self(), play},
    receive
        {finished} -> io:format("[program] Game has finished, exiting~n:")
    end.
```

**game.erl**
```erl
-module(game).
-export([init/0]).

init() ->
    idle().

idle() ->
    receive
        {Program, play} ->
            Player = spawn_link(player, init, []),
            Player ! {ready, self()},
            playing(Program, Player, generate_number())
    end.

generate_number() ->
    Number = rand:uniform(100),
    io:format("[server] Correct number is ~w~n", [Number]),
    Number.

playing(Program, Player, N) ->
    receive
        {guess, X} when X == N -> Player ! {win}, playing(Program, Player, N);
        {guess, _} -> Player ! {try_again}, playing(Program, Player, N);
        {restart} ->
            io:format("[server] Restarting the game with a new number.~n"),
            Player ! {ready, self()},
            playing(Program, Player, generate_number());
        {leave} -> io:format("[server] Player has left the game. Terminating...~n"), Program ! {finished}, self() ! stop
    end.
```

**player.erl**
```erl
-module(player).
-export([init/0]).

init() ->
    initializing().

initializing() ->
    receive
        {ready, Game} -> playing(Game)
    end.

playing(Game) ->
    Guess = read_guess(),
    Game ! {guess, Guess},
    receive
        {win} ->
            case ask_for_restart() of
                {ok} -> Game ! {restart}, initializing();
                _ -> Game ! {leave}, self() ! stop
            end;
        {try_again} -> io:format("Aww, that's not correct, please try again.~n"), playing(Game)
    end.

read_guess() ->
    case io:fread("Pick a number between 1 and 100 (inclusive): ", "~d") of
        {ok, [N]} when (N > 0) and (N < 100) -> N;
        _ -> io:format("You have entered an invalid number.~n"), read_guess()
    end.

ask_for_restart() ->
    case io:fread("You win! Play another round? (y/N) ", "~s") of
        {ok, [C]} when (C == "y") or (C == "Y") -> {ok};
        _ -> {cancel}
    end.
```

With all three files in place, we can compile and run our game. Here's an example output

```bash
$ erl -compile player
$ erl -compile game
$ erl -compile guess
$ erl -noshell -s guess -s init stop

# [server] Correct number is 17
# Pick a number between 1 and 100 (inclusive): 44
# Aww, that's not correct, please try again.
# Pick a number between 1 and 100 (inclusive): 12
# Aww, that's not correct, please try again.
# Pick a number between 1 and 100 (inclusive): 17
# You win! Play another round? (y/N) y
# [server] Restarting the game with a new number.
# [server] Correct number is 69
# Pick a number between 1 and 100 (inclusive): 17
# Aww, that's not correct, please try again.
# Pick a number between 1 and 100 (inclusive): 69
# You win! Play another round? (y/N) n
# [server] Player has left the game. Terminating...
# [program] Game has finished, exiting
```

## Conclusion
And, that's pretty much basic Erlang for you. The syntax, concepts, and how the information flows might be a little different than what we're used to, but all in all they're not such a big deal either, and shouldn't take much to get used to. For instance, I couldn't even write a single line of Erlang code until just a few days ago, and everything contained in this article I learned during this time period.

Understandably, real world Erlang is a little bit different than what we've explored so far, especially with its use of OTP, but we'll explore them in later articles, so stay tuned.  
