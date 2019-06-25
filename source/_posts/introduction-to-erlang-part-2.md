---
title: Introduction to Erlang - Part 2
date: 2019-08-03 22:00
tags: [Erlang, Actor Model, Game Development]
---
In our [previous example](/blog/introduction-to-erlang) we've explored the basics of Erlang, and built simple, but concurrent and stateful apps for demonstration. With the basics in place, it's time to move on to the actual stuff that makes Erlang such an excellent language for building fault-tolerant apps for distributed networks.

In this article, we'll go over topics like distributed Erlang (aka node-to-node communication), fault tolerance via Erlang/OTP, and code distribution and releases via rebar3, which will allow us to write production-ready apps.

<!-- more -->

## Distributed Erlang Applications
In the [previous article](/blog/introduction-to-erlang) we mentioned that Erlang was built for fault-tolerant, low-latency telecommunications apps that run concurrently, so remoting (or distributed apps) were one of their primary concerns (hence the name *tele*communications).

To that end, they've implemented built-in support for having Erlang nodes (remote or otherwise) communicate with each other, and they did it in a way that requires almost no preparation, and is performed quite transparently using roughly the same APIs as local communication (aka inside a single node).

### Erlang Port Manager Daemon
Remote communication is made possible by the Erlang Port Manager Daemon (*EPMD* for short), which acts like a router (or service registry) for the nodes running on the host machine. By default it binds to the TCP port 4369, and redirects any incoming message to the relevant Erlang node, as long as it's [named](#named-nodes).

### Named Nodes
Each Erlang node has a name in the form of `name@hostname`, where `name` is an arbitrary (but unique among locally-running Erlang nodes) string that identifies the node, and `hostname` is any valid hostname that can be used to access the *host machine* that the node is running on. The full name of a node can be used to send it a message, so in that sense, these names are quite like actor system addresses.

Unnamed Erlang nodes are automatically assigned the name `noname@nohost` (not subject to the uniqueness restriction), and they remain in *local* mode, where they do not register themselves to the EPMD, and therefore cannot be remotely communicated with.

You can see the name of a node by calling the `node().` function on the Erlang shell, or anywhere in your Erlang code.

```bash
$ erl
Erlang/OTP 18 [erts-7.3] [source] [64-bit] [smp:8:8] [async-threads:10] [kernel-poll:false]

Eshell V7.3  (abort with ^G)
1> node().
nonode@nohost
```

To specify a name for the node (and in turn open it up for remote access), all you have to do is to specify it as the `-sname` or the `-name` option to the `erl` command. The different between these two options is that `-sname` stands for "short name" and sets only name of the node (aka the part before `@`), whereas the `-name` stands for long name and sets the entire name, including both the name and the hostname. When the `-sname` option is used, the hostname part will be retrieved from the original hostname of the host machine (as seen by the `hostname` command on the terminal).

**Important Note:** When attempting to communicate with a remote nodes, the machine that hosts the node should be accessible using the *hostname* specified in the node name. Therefore, any related DNS or hosts file entries should be ready before attempting to communicate.

Let's see some examples. First, the `-sname` option:

```bash
$ hostname # prints the default hostname of the machine
# Yalins-MBP

$ erl -sname foo
Erlang/OTP 22 [erts-10.4.1] [source] [64-bit] [smp:8:8] [ds:8:8:10] [async-threads:1] [hipe] [dtrace]

Eshell V10.4.1  (abort with ^G)
(foo@Yalins-MBP)1> node().
'foo@Yalins-MBP'
```

And now with the `-name` option:

```bash
$ erl -name foo@bar.com
Erlang/OTP 22 [erts-10.4.1] [source] [64-bit] [smp:8:8] [ds:8:8:10] [async-threads:1] [hipe] [dtrace]

Eshell V10.4.1  (abort with ^G)
(foo@bar.com)1> node().
'foo@bar.com'
```

Attempting to specify a *hostname* with the `-sname` option, or omitting it from the `-name` option will result in an error.

```bash
$ erl -name foo             # this command fails because it requires the hostname to be specified
$ erl -sname foo@bar.com    # this command fails because it requires only the name to be specified
```

Our node is now open for remote access, so let's see how we can actually send a message to a *process* that's running on it.

### Node to Node Communication
We've previously used the `!` operator to send messages to processes that we know the *Pid* of (i.e. `Pid ! {foo}`), and the same operator can be used to send messages to processes that we *don't* know the *Pid* of (hence the *transparent* nature of remote communication). For this to take place, though, the process must be *register*ed on the node beforehand.

We can *register* a process on its host node by invoking the `register(RegName, PidOrPort)` function, where `RegName` is an arbitrary name (unique for the node, and in `atom` form), and `PidOrPort` is either the `Pid` of a process or a *port* (e.g. a reference to another *OS* process). Once registered, we can send messages to a process using the `!` operator, in the form of `{RegName, NodeName} ! {foo}`, where `RegName` is the registered name of the process, and `NodeName` is the full name of the destination node (again in `atom` form, surrounded by single-quotes when necessary, e.g. `'foo@bar.com'`).

#### Simple Example
So let's see this behavior in action. First up, we'll use the dummy hostname of `erlang.example` in our example, so make sure to put an entry in your hosts file:

```127.0.0.1 erlang.example```

Then, let's have the good ol' `foo` and `bar` modules running on aptly-named Erlang shells.

> **Note:** The code to this example can be found in my GitHub repo, [erlang-examples/distributed](https://github.com/ygunayer/erlang-examples/tree/master/distributed)

**foo.erl**
```erl
-module(foo).
-export([start/0]).

start() ->
    register(foo_handler, self()),
    io:format("[foo] Registered with the name `foo_handler` on node ~w~n", [node()]),
    receive
        {Sender, hello} ->
            io:format("[foo] Received `hello`, will terminate after replying `goodbye`~n"),
            Sender ! {goodbye}, % reply to sender, notice how we don't have to worry about
                                % whether or not the sender is on a separate Erlang node
            self() ! stop
    end.
```

**bar.erl**
```erl
-module(bar).
-export([start/0]).

start() ->
    % notice how we can transparently send our `Pid` to remote node
    % without having to specify anything
    {foo_handler, 'foo@erlang.example'} ! {self(), hello},
    io:format("[bar] Sent `hello` from ~w to `foo_handler` at 'foo@erlang.example'~n", [node()]),
    receive
        {goodbye} ->
            io:format("[bar] Received `goodbye`, terminating...~n"),
            self() ! stop
    end.
```

With the two files in place, let's compile them and launch the compiled modules in separate Erlang shells. This can be done using the bash `&` operator, which basically runs the commands in parallel.

On the first one
```bash
$ erl -compile foo
$ erl -compile bar
$ erl -noshell -name foo@erlang.example -s foo -s init stop & \
  erl -noshell -name bar@erlang.example -s bar -s init stop
# [foo] Registered with the name `foo_handler` on node 'foo@erlang.example'
# [bar] Sent `hello` from 'bar@erlang.example' to `foo_handler` at 'foo@erlang.example'
# [foo] Received `hello`, will terminate after replying `goodbye`
# [bar] Received `goodbye`, terminating..
```

Notice how we first run `foo` and then `bar`. What if we ran `bar` first, and then foo, after a little delay?
```bash
$ erl -noshell -name bar@erlang.example -s bar -s init stop & \
  sleep 2 && \
  erl -noshell -name foo@erlang.example -s foo -s init stop
# [bar] Sent `hello` from 'bar@erlang.example' to `foo_handler` at 'foo@erlang.example'
# [foo] Registered with the name `foo_handler` on node 'foo@erlang.example
```

And this will hang forever, because when `bar` *sent out* its message, the `foo` wasn't even online yet. Erlang does not guarantee inter-process message delivery (after all, network is unreliable), so sending messages to a process (local or remote) using the `!` operator never fails -- that's message passing for ya. So if we wanted to guarantee that `foo` did indeed receive our message, we'd have to implement all that deliverability stuff ourselves, but we won't go into that just yet.

## Erlang/OTP
You might have noticed that in our process-based examples, we usually exported a `start/0` function from our module and run that function from the Erlang shell. This function then spawned a separate process and run it against another function, one with a `receive..end` block. The behavior of the entire program was determined by this latter function, which either looped around itself or forked into other functions based on the message it received.

In that sense, this hidden "looping" function was where the entire business logic was implemented, and the publicly exported `start/0` function was nothing but an *entrypoint*. If we were to implement supervisioning strategies, this entrypoint would've also acted as the root supervisor, where all unhandled errors ended up in, and determine what to do if the handler function failed with an error. Once we had a stable implementation of that root supervisor, we could easily copy it over to other projects that served different purposes, without having to think about anything but the program's own behavior itself.

Having developed many programs, the original Erlang developers also realized that this kind of program structure was becoming a pattern, so they decided to come up with a set of abstractions, and libraries that would allow developers to implement those abstractions. The result of this effort was the *Erlang Open Telecommunications Platform*, or Erlang/OTP for short.

Over time OTP evolved even further, and adapted numerous methods and best practices to allow making even more robust applications, including but not limited to bundling, releasing and monitoring apps, hot-swapping or debugging code live on production. So while it's technically not necessary to build apps in OTP fashion, the benefits are too great to ignore.

### Design Principles
Let's go over some of the fundamental design principles that OTP presents, and then implement an example project to demonstrate each concept.

#### Behaviors
The developers of Erlang/OTP realized that most of the applications they've built resembled each other in terms of structure and operation, so they decided to group them under certain categories, and abstract away the generic parts of each category into some kind of interface that apps could implement. These interfaces are called *behavior*s, and to implement a behavior, a module has to implement several callbacks (which roughly translate to hooks) specific to the behavior itself.

Erlang/OTP ships with a number of built-in generic behaviors listed below:

- `gen_server`: A generic client/server interface where a server process can respond to queries and commands sent by a client
- `gen_fsm`: (Depracated in favor of `gen_statem`) A generic finite state machine interface where a process can transition from one state to another based on the triggers it receives
- `gen_statem`: (As of OTP 19) Roughly the same as `gen_fsm`, but with a number of differences, some of which are important (see [gen_statem docs](http://erlang.org/doc/man/gen_statem.html#description) for more info)
- `gen_event`: A generic implementation of an event manager where arbitrary events can be raised which can then be picked up by handlers registered on the manager
- `supervisor`: A generic supervisor process that can watch another process and adopt a certain supervision strategy to determine what to do when that process fails
- `application`: An Erlang/OTP application. See the [Applications section](#Applications) for more info

The generic `gen_` behaviors are somewhat similar in the sense that all of them represent structs that keep a state, can receive specific kinds of signals, and alter their states or manage their lifecylces based on the signal received. The differences between them usually arise from their intended use cases, and the convenience functions and callbacks that are designed for that purpose. For instance, the `gen_server` behavior has a callback for handling synchronous requests, another for asynchronous requests, whereas the `gen_event` behavior has both sync and async events, but also functions that allow other modules to register themselves on the module to receive the said events.

**Note:** It's possible to create custom behaviors but they need to be built on top one of the aforementioned generic behaviors

#### Applications
The term *application* refers to a bundle of resources, configuration files, and an executable program that can be started with a set of arguments. Like most other languages, Erlang/OTP has a formalism for producing apps.

A project must adhere to the following rules in order to be bundled as an application:
- Have an application definition file in the root folder. This is basically a file that contains an Erlang term that defines the application, and has the extension `.app`
- Have source files located in the `src/` folder
- Have the main module adopt the `supervisor` behavior and implement the `start/2` (`start(StartType, StartArgs) -> {ok, Pid} | {ok, Pid, State}`) and `stop/1` (`stop(State)`) callbacks

##### Included Applications
Generally speaking, applications might sometimes require other applications to be running in the background (think of "helper" processes that apps like Chrome and Spotify run in the background), and it's usually very painful to interact with them, since you'll have to make sure they're alive when doing so.

Erlang/OTP calls these secondary apps "included applications", and provides a way to define and supervision them. Each included application can only be included by one other application, and can include an arbitrary number of other applications, forming a hierarchy of applications.

To mark an application as included, one must add it to the `.app` definition file, and it among the included apps property of the including app.

##### Distributed Applications
Whereas included applications run on the same Erlang node, in distributed systems each app is expected to run on a separate Erlang node. Erlang/OTP calls these applications "distributed", and provides a way to define the failover and takeover scenarios for them.

#### Releases
To put simply, a release refers to a bundles of applications that are to be deployed simultaneously. To create a release, one must put a release definition file (with the extension `.rel`) that define the names and versions of both the release, and the applications included in the release. We'll touch on this subject later in more detail.

### Example - Guessing Game as OTP Application
Let's rewrite our guessing game in Erlang/OTP fashion to demonstrate what we've talked about so far. We'll retain the client-server nature of our game, so we'll need a `gen_server` implementation for our game server. As for the client, the necessity of interacting with the user lessens the relevance of `gen_server`, so we'll instead go with `gen_statem`.

> **Hint:** The code to the examples below can be found on the GitHub repo [ygunayer/erlang-examples](https://github.com/ygunayer/erlang-examples) under the folder `guess-otp`

#### Behaviors in Detail
Before moving on to our implementation, let's quickly review the callbacks for both the behaviors.

For `gen_server` we have the following callbacks:
- `init(Args)`: Called before the server starts. The server may or may not be started depending on the result of this function. Any preparatory operations are expected to be performed here
- `handle_call(Request, From, State)`: Synchronous request handler. The return value of this function is then used optionally send a reply to the sender, optionally update the server state in the end, or terminate the server instead
- `handle_cast(Msg, State)`: Asynchronous message handler. The return value of this function is then used to optionally update the server, or terminate the server instead
- `handle_info(Msg, State)`: (Optional) A handler used intended for handling non-request messages. Any messages sent to the `gen_server` process directly using the `!` operator ends up here. This callback is generally used for handling informative events such as periodic or delayed messages, monitoring or lifecycle events, etc.

As for `gen_statem` we have the following:
- `init(Args)`: Same as above
- `callback_mode()`: Determines the callback mode of the `gen_statem`. The return value of this function dramatically changes the implementation of the module, and can either be one of the following atoms:
    - `state_functions`: Implies that the state names must be unique atoms, and each state must have a callback function with the same name. For instance, for a state `foo`, the callback function `foo()/3` should exist
    - `handle_event_function`: Implies that state names can be anything, but all messages should be handled within the `handle_event/4` function
- `StateName(EventType, EventContent, Data)`: Only called when the callback mode is `state_functions`, these functions handle incoming messages when the module is in the corresponding state
- `handle_event(EventType, EventData, State, Data)`: Similar to `StateName/3`, but only called when callback mode is `handle_event_function`. The current state can be retrieved from the parameter `State`

With these out of the way, let's move on to our implementation.

#### Project Setup
As we've mentioned before, we'll need to structure our project in a certain way so it can be a valid OTP project. To that end, we'll create an application definition file, implement the `application` behavior on our main module, place all source code under the `src/` folder, and place the compilation artifacts under the `ebin/` folder. We'll also write a small shell script to compile and run our project.

**run.sh**
```bash
#!/usr/bin/env sh
mkdir -p ebin
rm -f ebin/*.beam
erlc -W0 +debug_info -o ebin/ src/*.erl
erl -pa ebin -noshell -eval 'application:start(guess_otp)'
```

This little script will make sure the `ebin/` file exists, clean any previous build artifacts in it, compile all source files under the `src/` folder into the `ebin/` folder, open up an Erlang shell, and run our main app module.

#### Source Files
By convention we'll name our app definitiion file with the extension `.app`, our main app module with the suffix `_app`, the root supervisor with the `_sup` suffix, and client and server with the `_client` and `_server` suffixes respectively.

**Note:** All filenames listed below are relative to the root project folder.

##### guess_otp.app
Here we define the application name as `guess_otp`, give it a description and a version number, and specify which applications and modules it requires. The applications `kernel` and `stdlib` are almost always required, and the `guess_otp_app` is our root module for the application, so that's why we specified them as required under `applications` and `mod` keys respectively.

```erl
{application, guess_otp, [
  {description, "Guessing Game - gen_server Implementation"},
  {vsn, "0.0.1"},
  {applications, [kernel, stdlib]},
  {mod, {guess_otp_app, []}}
]}.
```

##### src/guess_otp_app.erl
This is the entrypoint of our application, so it'll only implement the `application` behavior and spawn our root supervisor as it starts.

```erl
-module(guess_otp_app).
-behaviour(application).
-export([start/2, stop/1]).

start(_StartType, _StartArgs) ->
    guess_otp_sup:start_link().

stop(_State) ->
    ok.
```

##### src/guess_otp_sup.erl
This is the root supervisor of our app. Its job is to spawn and maintain the lifecycles of our server and client.

```erl
-module(guess_otp_sup).
-behaviour(supervisor).
-export([start_link/0, init/1]).
-define(SUPERVISOR_NAME, ?MODULE).

start_link() ->
    supervisor:start_link({local, ?SUPERVISOR_NAME}, ?MODULE, {}).

init(_Args) ->
    io:format("[supervisor] Booting up...~n"),

    % fail altogether if either the client or the server gets restarted
    % see http://erlang.org/doc/design_principles/sup_princ.html#supervisor-flags for more info
    SupFlags = #{strategy => one_for_all, intensity => 0},

    % start server and client respectively, and don't attempt to restart them when they shut down gracefully
    % see http://erlang.org/doc/design_principles/sup_princ.html#child-specification for more info
    ChildSpecs = [
        #{id => server, start => {guess_otp_server, start_link, []}, restart => transient},
        #{id => worker, start => {guess_otp_client, start_link, []}, restart => transient}
    ],

    {ok, {SupFlags, ChildSpecs}}.
```

##### src/guess_otp_server.erl
A `gen_server` can be interacted with using the `gen_server:call/2` and `gen_server:cast/2` functions, and both of these functions require the name or *Pid* of a server instance. While this might be useful for a generic, low-level interaction, the convention is to have the server module locally register a server instance using a constant name, and export business-specific, high-level functions that internally execute calls and casts using that constant name, effectively implementing the infamous singleton pattern.

As for "stateful" servers, we'll define individual `handle_cast` and `handle_call` functions for each state, matching them using function expansions, and also guard them where necessary, one example being accepting guesses only from the current player while in `playing` state.

The business logic is almost exactly the same as before, so let's just focus of the way `gen_server` is being implemented, specifically around stage management and reply-to-sender strategies.

```erl
-module(guess_otp_server).
-export([join/0, guess/1, restart/0, leave/0]).

-behaviour(gen_server).
-export([start_link/0, init/1, handle_call/3, handle_cast/2, terminate/2]).

-define(SERVER_NAME, ?MODULE).

%% Public API
%% ------------------------
start_link() ->
    gen_server:start_link({local, ?SERVER_NAME}, ?MODULE, {}, []).

join() ->
    gen_server:call(?SERVER_NAME, {join}).

guess(N) ->
    gen_server:call(?SERVER_NAME, {guess, N}).

restart() ->
    gen_server:call(?SERVER_NAME, {restart}).

leave() ->
    gen_server:call(?SERVER_NAME, {leave}).

%% Private API
%% ------------------------
generate_number() ->
    Number = rand:uniform(100),
    io:format("[server] Correct number is ~w~n", [Number]),
    Number.

%% Callback implementations
%% ------------------------
init(_Args) ->
    io:format("[server] Booting up...~n"),
    {ok, {idle}}.

%% Call handler for the idle state
handle_call(Request, {Pid, _Tag}, State = {idle}) ->
    case Request of
        {join} ->
            Number = generate_number(),
            {reply, {ready, self()}, {playing, Number, Pid}};
        _ -> {reply, {nack, Request}, State}
    end;
%% Call handler for playing state, with a guard to only accept request if the sender is the player
handle_call(Request, {Pid, _Tag}, State = {playing, Number, Player}) when Pid == Player ->
    case Request of
        {guess, X} when X == Number -> {reply, {win}, {finished, Player}};
        {guess, _} -> Player ! {reply, {try_again}, State};
        {leave} ->
            io:format("[server] Player has left the game. Terminating...~n"),
            {stop, normal, State};
        _ -> {reply, {nack, Request}, State}
    end;
%% Call handler for finished state, with a guard to only accept request if the sender is the player
handle_call(Request, {Pid, _Tag}, State = {finished, Player}) when Pid == Player ->
    case Request of
        {restart} ->
            io:format("[server] Restarting the game with a new number.~n"),
            Number = generate_number(),
            {reply, {ready}, {playing, Number, Player}};
        {leave} ->
            io:format("[server] Player has left the game, terminating server.~n"),
            init:stop(), % force graceful exit
            {stop, normal, State};
        _ -> {reply, {nack, Request}, State}
    end;
%% Catch-all call handler for other cases
handle_call(Request, _From, State) ->
    {reply, {nack, Request}, State}.

%% No-op cast handler
handle_cast(_Msg, State) ->
    {noreply, State}.

%% Hook that gets called before termination
terminate(Reason, State) ->
    io:format("[server] Terminating due to ~w with state ~w~n", [Reason, State]).
```

**Hint:** At this stage we can practically compile our server module, run it in an Erlang shell, and play the game entirely using the publicly exposed functions.

##### src/guess_otp_client.erl
With the server implemented, the last thing to do is to implement the client. As we've mentioned before we'll implement `gen_statem` for this purpose, and as for the `callback_mode`, we'll just go with `state_functions`.

An important thing to note about `gen_statem` is that by default, it only triggers state callbacks when it receives a message (e.g. a `cast` or a `call`), so if we were to implement our client this way, it would stay dormant until we sent it a message using `gen_statem:call/2` or `gen_statem:cast/2`.

We could export a public function and execute it somewhere along the line, but we can also get `gen_statem` to invoke our callbacks in a certain way as soon as a state change occurs.

We can achieve this by returning a list from the `callback_mode/0` function, and have the atom `state_enter` in the returning list, along with the callback mode of course. This way, all state handlers will be called with the atom `enter` as the first parameter when the state changes, and we'll be able to capture these calls and trigger a `cast` or `call` ourselves.

Again, our business logic is the same as before, so let's focus on the `gen_statem` implementation instead.

```erl
-module(guess_otp_client).
-export([start_link/0, init/1]).

-behaviour(gen_statem).
-export([callback_mode/0, initializing/3, playing/3]).
-define(SERVER_NAME, ?MODULE).

%% Public API
%% ------------------------
start_link() ->
    gen_statem:start_link({local, ?SERVER_NAME}, ?MODULE, {}, []).

%% Private API
%% ------------------------
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

%% Callback implementations
%% ------------------------
init(_Args) ->
    io:format("[client] Booting up...~n"),
    {ok, initializing, {}}.

callback_mode() ->
    % we'll have individual handlers for each state
    [state_functions, state_enter].

%% State functions
%% -----------------------
%% Initialization state
initializing(enter, _EventContent, Data) ->
    %% force trigger the state handler
    gen_statem:cast(?SERVER_NAME, {start}),
    {next_state, initializing, Data};
initializing(_EventType, _EventContent, _Data) ->
    io:format("[client] Starting a new game~n"),
    case guess_otp_server:join() of
        {ready, ServerPid} ->
            io:format("[client] Joined the game server with pid ~w~n", [ServerPid]),
            {next_state, playing, {ServerPid}};
        Other ->
            io:format("[client] Received unexpected response ~w from server, terminating~n...", [Other]),
            {stop, {unknown, Other}}
    end.

%% In-game state
playing(enter, _OldState, Data) ->
    %% force trigger the state handler
    gen_statem:cast(?SERVER_NAME, {}),
    {next_state, playing, Data};
playing(_EventType, _OldState, Data) ->
    Guess = read_guess(),
    case guess_otp_server:guess(Guess) of
        {try_again} ->
            io:format("Aww, that's not correct, please try again.~n"),
            {repeat_state, Data};
        {win} ->
            case ask_for_restart() of
                {ok} ->
                    guess_otp_server:restart(),
                    {repeat_state, Data};
                _ ->
                    guess_otp_server:leave(),
                    {stop, normal}
            end;
        _ -> {keep_state, Data}
    end.
```

#### Running the Example
And we're all set! We already have a script that will run our app, so all we have to do is to just run it.

```bash
$ ./run.sh
# [supervisor] Booting up...
# [server] Booting up...
# [client] Booting up...
# [client] Starting a new game
# [server] Correct number is 45
# [client] Joined the game server with pid <0.79.0>
# Pick a number between 1 and 100 (inclusive): 41
# Aww, that's not correct, please try again.
# Pick a number between 1 and 100 (inclusive): 45
# You win! Play another round? (y/N) y
# [server] Restarting the game with a new number.
# [server] Correct number is 7
# Pick a number between 1 and 100 (inclusive): 19
# Aww, that's not correct, please try again.
# Pick a number between 1 and 100 (inclusive): 7
# You win! Play another round? (y/N) n
# [server] Player has left the game, terminating server.
# [server] Terminating due to normal with state {finished,<0.80.0>}
```

## Runtime Configurations
Like all other languages, Erlang/OTP allows us to import configurations from a file, and not just for our own app, but also for all apps that ours depend to. This file is basically an Erlang list of terms that take the form of `{AppName, {...configurations}}`.

By convention, configurations are loaded from the optional `sys.config` file, but we can also specify a custom path using the `-config` when launching the Erlang shell. Configuration files can also *extend* others by simply specifying their filenames inside the main list, which allows us to create environment-dependent configurations easily. At any given time, we can use the `application:get_env(AppName, PropName)` function to get the value of a config parameter.

> **Note:** Configurations are part of the Erlang/OTP conventions, so only Erlang/OTP apps can make use of them. Also, including other config files only work when the name of the initial config file is `sys.config`

### Example - Configured App
So let's demonstrate all of these in an example. For this purpose, we'll create a very Erlang/OTP application with two config *environments*.

> **Note:** The code to this example can be found in my GitHub repo, [erlang-examples/configured-apps](https://github.com/ygunayer/erlang-examples/tree/master/configured-apps)

#### Project Structure
As mentioned before, we'll need an Erlang/OTP app, and we'll need to name our config files as `sys.config`, so we end up with the following folder structure

```
- (project root)
 |- foo.app
 |- run.sh
 +- config/
 | |- common.config
 | +- dev/
 | | \- sys.config
 | +- test/
 | | \- sys.config
 +- src/
  \- foo_app.erl
```

#### Source Files
##### foo.app
```erl
{application, foo, [
  {description, "foo - A configured app"},
  {vsn, "0.0.1"},
  {applications, [kernel, stdlib]},
  {mod, {foo_app, []}}
]}.
```

##### run.sh
We've slightly modified our `run.sh` from the previous example so it accepts the environment name and runs our app with that config.

```bash
#!/usr/bin/env sh
set -e

ENV="$1"

if [ -z "$ENV" ]; then
    echo "Please specify an environment name"
    exit 1
fi

if [ ! -f "config/$ENV/sys.config" ]; then
    echo "File 'config/$ENV/sys.config' does not exist. Make sure the environment name is valid"
    exit 1
fi

mkdir -p ebin
rm -f ebin/*.beam
erlc -W0 +debug_info -o ebin/ src/*.erl
erl -pa ebin -config "config/$ENV/sys.config" -noshell -eval 'application:start(foo)'
```

##### src/foo_app.erl
Since we're running an Erlang/OTP app we need to have our main module to have `application` behavior, which then requires the `start/2` method to return `{ok, Pid}` on a successful launch. To give OTP a valid process ID, we'll spawn a new process and redirect it to a separate function that handles our "business logic", much like real OTP apps.

```erl
-module(foo_app).
-behaviour(application).
-export([start/2, stop/1, do_print/0]).

do_print() ->
    {ok, Color} = application:get_env(foo, color),
    {ok, Animal} = application:get_env(foo, animal),
    io:format("Look, a ~s ~s!~n", [Color, Animal]),
    init:stop().

start(_StartType, _StartArgs) ->
    Pid = spawn_link(?MODULE, do_print, []),
    {ok, Pid}.

stop(_State) ->
    ok.
```

##### config/default.config
This file holds our default configurations, and our environment-based ones will include this. Notice how the application name `foo` is required.

```erl
[
    {foo, [
        {color, "black"},
        {animal, "cat"}
    ]}
].
```

##### config/dev.config
This is the config for the *dev* environment. To demonstrate how config files get merged when being included, we simply change `color` parameter, and expect the `animal` parameter be inferred from `default.config`.

```erl
[
    "../default.config",
    {foo, [
        {color, "white"}
    ]}
].
```

##### config/test.config
And this is for the *test* environment. Here, we do the opposite of the dev environment, and keep the `color` parameter but change the `animal` parameter.

```erl
[
    "../default.config",
    {foo, [
        {animal, "bird"}
    ]}
].
```

### Running the Example
Well that's pretty much it. Since we already have a run script, we can go ahead and execute it with an environment name:

```bash
$ ./run.sh dev
# Look, a white cat!

$ ./run.sh test
# Look, a black bird!
```

## rebar3
As mentioned in the previous article, rebar3 is a tool that can be used to build apps and libraries, manage dependencies, run tests, and create releases. Its aim is to provide developers with easy-to-use tools and encourage them to develop apps and libraries that match the Erlang/OTP conventions. Like `sbt`, it has the concept of *templates* which allow developers to quickly start building their apps.

If we run the command `rebar3 new` we get the the following list of project templates:

```bash
$ rebar3 new
# app (built-in): Complete OTP Application structure.
# cmake (built-in): Standalone Makefile for building C/C++ in c_src
# escript (built-in): Complete escriptized application structure
# lib (built-in): Complete OTP Library application (no processes) structure
# plugin (built-in): Rebar3 plugin project structure
# release (built-in): OTP Release structure for executable programs
# umbrella (built-in): OTP structure for executable programs (alias of 'release' template)
```

Of these, `app`, `lib`, and `release` are particularly interesting for most developers. While `app` and `lib` are self-explanatory, the `release` is the most important template for a full-fledged OTP application with binary distributions and hot upgrades (e.g. version upgrades that occur while the app is running). Releases are a comprehensive subject that has both config-level and code-level implications, so we won't be going into their details just yet.

### Example - App with Dependencies
To try rebar3 out, let's just create a simple *app* that generates a UUID and prints it out every 5 seconds.

> **Note:** The code to this example can be found in my GitHub repo, [erlang-examples/rebarred](https://github.com/ygunayer/erlang-examples/tree/master/rebarred)

#### Project Structure
This time we won't have to do anything to structure our project since `rebar3` will scaffold it.

```bash
$ rebar3 new app rebarred
# ===> Writing rebarred/src/rebarred_app.erl
# ===> Writing rebarred/src/rebarred_sup.erl
# ===> Writing rebarred/src/rebarred.app.src
# ===> Writing rebarred/rebar.config
# ===> Writing rebarred/.gitignore
# ===> Writing rebarred/LICENSE
# ===> Writing rebarred/README.md
```

#### Source Files
Comparing rebar3's output to our homebrew structure from earlier, two differences stand out the most: `rebar.config` and `rebarred.app.src`.

#### rebar.config
If we look at the aptly-named `rebar.config`, we'll see that it's just for configuring rebar3. Since dependencies are managed by rebar3, we'll have to specify them here.

The library we'll use to generate UUIDs is called `uuid_erl`, so we'll put its name in the term that starts with `deps`, and what was before `{deps, []}` will become `{deps, [uuid_erl]}`.

> **Note:** If we wanted a specific version of `uuid_erl` we could've written `{deps, [{uuid_erl, "1.7.5"}]}`

```erl
{erl_opts, [debug_info]}.
{deps, []}.

{shell, [
  % {config, "config/sys.config"},
    {apps, [rebarred]}
]}.
```

Do note, however, that the config statement is commented out. While we won't have a config for our app this time, it's good to know how we can specify it when using rebar.

#### src/rebarred.app.src
Looking at this file we'll see that its just our application definition file. This isn't just by chance, of course, and is actually the result of another convention.

Over time Erlang developers began to notice that they wanted to add or change stuff in application definition files on build time. At first, they usually did this by writing makefiles or custom build scripts, but then this approach became so common that build tools such as `rebar` (the older version of `rebar3`), `rebar3` and `erlang.mk` incorporated it into their workflow. As of now, this is in fact the recommended way of defining apps when working with build tools.

```erl
{application, rebarred,
 [{description, "An OTP application"},
  {vsn, "0.1.0"},
  {registered, []},
  {mod, {rebarred_app, []}},
  {applications,
   [kernel,
    stdlib
   ]},
  {env,[]},
  {modules, []},

  {licenses, ["Apache 2.0"]},
  {links, []}
 ]}.
```
#### src/rebarred_app.erl
This is the main module of our app. We don't have to do any modifications to rebar's output.

```erl
%%%-------------------------------------------------------------------
%% @doc rebarred public API
%% @end
%%%-------------------------------------------------------------------

-module(rebarred_app).

-behaviour(application).

-export([start/2, stop/1]).

start(_StartType, _StartArgs) ->
    rebarred_sup:start_link().

stop(_State) ->
    ok.

%% internal functions
```

#### src/rebarred_sup.erl
This is our root supervisor, and its auto-generated version has no child specs, since that's what we're supposed to implement. We'll place our business logic in a module called `generator`, so let's add it amongst the `ChildSpecs` variable in this file.

```diff
-    ChildSpecs = [],
+    ChildSpecs = [
+        #{id => worker, start => {generator, start_link, []}}
+    ],
```

With the above change we end up with the following file:

```erl
%%%-------------------------------------------------------------------
%% @doc rebarred top level supervisor.
%% @end
%%%-------------------------------------------------------------------

-module(rebarred_sup).

-behaviour(supervisor).

-export([start_link/0]).

-export([init/1]).

-define(SERVER, ?MODULE).

start_link() ->
    supervisor:start_link({local, ?SERVER}, ?MODULE, []).

%% sup_flags() = #{strategy => strategy(),         % optional
%%                 intensity => non_neg_integer(), % optional
%%                 period => pos_integer()}        % optional
%% child_spec() = #{id => child_id(),       % mandatory
%%                  start => mfargs(),      % mandatory
%%                  restart => restart(),   % optional
%%                  shutdown => shutdown(), % optional
%%                  type => worker(),       % optional
%%                  modules => modules()}   % optional
init([]) ->
    SupFlags = #{strategy => one_for_all,
                 intensity => 0,
                 period => 1},
    ChildSpecs = [
        #{id => worker, start => {generator, start_link, []}}
    ],
    {ok, {SupFlags, ChildSpecs}}.

%% internal functions
```

#### src/generator.erl
And finally, the actual module that handles our business logic. Just like we did in the configured apps example, we spawn a process to handle the business logic, and return its ID to the supervisor.

```erl
-module(generator).
-export([start_link/0, loop/0]).

start_link() ->
    Pid = spawn_link(?MODULE, loop, []),
    Pid ! generate,
    {ok, Pid}.

loop() ->
    receive
        generate ->
            Uuid = uuid:get_v4(),
            UuidString = uuid:uuid_to_string(Uuid),
            io:format("[generator] New UUID: ~s~n", [UuidString]),
            timer:send_after(5000, self(), generate),
            loop()
    end.
```

### Running the Example
We can simply run `rebar3 shell` to have rebar download the dependencies, compile our modules, launch a new Erlang shell and start our application.

Since rebar keeps dependencies in its cache, the output of the compilation workflow may vary, but here's what mine looked like

```bash
$ rebar3 shell
# ===> Verifying dependencies...
# ===> Compiling rebarred
# Erlang/OTP 22 [erts-10.4.4] [source] [64-bit] [smp:8:8] [ds:8:8:10] [async-threads:1]
# 
# Eshell V10.4.4  (abort with ^G)
# 1> ===> The rebar3 shell is a development tool; to deploy applications in production, consider using releases (http://www.rebar3.org/docs/releases)
# ===> Booted rebarred
# [generator] New UUID: 410abbcb-cd20-4897-a285-91f968203efd
# [generator] New UUID: b305fe13-4b46-4e98-b0a0-8a8ca64e4f9a
# [generator] New UUID: c02e72e9-66c5-4b01-a9bf-ad02bf48f78b
# ...
```

## Conclusion
Phew, that was a lot to take in. We're still a few steps to go until we reach the ultimate Erlang experience that is upgrading apps on production without losing state, but even at this point we know enough to create substantial projects.

So we're now ready to rewrite our bastra game in Erlang/OTP, and the next article will entirely be about this rewrite, hopefully with release flows so we can finally close the lid on learning Erlang/OTP, and move on to even more complicated projects.

Stay tuned.
