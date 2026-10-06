# IVI

A private multiplayer card game for 4–8 friends, built for phone and desktop browsers. The server owns the rules and sends each player only the information they may see.

## Run locally

Requires **Node.js 24** and **pnpm 11**.

```sh
pnpm install
pnpm dev
```

Open **http://localhost:5173**. Create a table, share its code, and have everyone select **I’m ready**. The host can deal once 4–8 players are connected and ready.

For several players on one computer, use separately opened tabs or separate browser profiles. Each tab stores its own reconnect token in `sessionStorage`. Open a fresh tab and enter the URL instead of duplicating a seated tab, which may copy that tab’s token. Reloading or a temporary network interruption restores the same seat. Keep your seated tab available; a fresh tab does not automatically inherit it.

The Vite frontend listens on port **5173** and proxies game traffic to the Node server on **3001**. A single `pnpm dev` starts both; Ctrl+C stops both.

### Test with phones on the same Wi-Fi

1. Start `pnpm dev` on the computer hosting the game.
2. Find that computer’s local IPv4 address (`ipconfig` on Windows).
3. Open `http://YOUR_LOCAL_IP:5173` on each phone, while connected to the same local network.
4. Create the room through that address so its invite link also contains the reachable local address. A `localhost` invite is usable only on the host computer.
5. If Windows prompts, allow the Node process on your private network. The application does not change firewall settings.

Some browsers disable clipboard access on LAN HTTP. The room code remains selectable and can be entered manually. Request IDs also work on LAN HTTP without requiring `crypto.randomUUID`.

## Android app

An installable Android client with bundled artwork and fonts lives in `android/`. Run `pnpm android:build` to create the signed APK in `releases/`. See [Android setup and testing](android/README.md) for installation, LAN connection settings, and build prerequisites. Android stores its reconnect token persistently so reopening the app restores its seat.

### Publishing an update

Installed Android clients check `public/ivi-update.json` whenever IVI opens. To publish a release:

1. Increase the version in `package.json`, `src/update.ts`, and the Android manifest.
2. Build and test the signed APK with `pnpm android:build` and `pnpm test:android-ui`.
3. Upload the APK to a stable HTTPS download location.
4. Update `public/ivi-update.json` last with the new version, download URL, and short release notes, then push it to `main`.

Updating the manifest last prevents players from seeing the prompt before the APK is available. A failed or offline update check never blocks the game.

## Rules

### Solo practice with bots

Choose **Solo game**, select **Easy**, **Medium**, or **Hard**, and press **Play**. Solo is offline with three bots. Medium uses win-target heuristics; Hard samples 256 unseen deals per decision, remembers public plays, and simulates ways to match its call or disrupt an opponent without accessing hidden hands. Decisions run in a worker. Difficulty is remembered for the next match. Online hosts can choose each new bot's difficulty in the lobby.

Swipe or drag a card upward to throw it; taps and short drags do not play. Keyboard and assistive activation also work. **Settings → Portrait / Landscape** changes the Android orientation without restarting the match. Browser layouts adapt to the available viewport.

Benchmark: `node scripts/benchmark-bots.mjs hard 1000` and `node scripts/benchmark-bots.mjs medium 1000`. Across 1,000 seeded matches with rotated target seats, Hard won 877 against three Medium bots; Medium won 880 against three Easy bots. These are simulation results, not estimates of human difficulty.

### Cards and rounds

- The deck has four set levels, each with card numbers 1–10. One additional special card makes 41 unique cards.
- The sets are **1 · Tide**, **2 · Grove**, **3 · Dusk**, and **4 · Ember**, shown with small level numbers and Roman-numeral values.
- Strength is `(set level − 1) × 10 + card number`. Level always takes priority. Level 4’s number 1 beats level 3’s number 10.
- Each round starts with a fresh shuffle. Players receive **5, 4, 3, 2, then 1** card, repeating this cycle until the match ends. Undealt cards stay hidden.
- The host chooses **3, 5, 10, 15, or 20 starting lives** before dealing. The first starting seat is random; it advances clockwise each round, skipping eliminated players.

### Normal rounds: 5, 4, 3, or 2 cards

1. Players inspect their own hand and publicly predict a number of wins from zero through the number of cards dealt.
2. Predictions proceed clockwise. The last predictor cannot choose a number that makes the total equal the number of fights in that round.
3. The first predictor leads the first fight. Everyone plays any one card, face up, in clockwise order. There is no follow-set rule.
4. The strongest normal card wins, unless the special is present. After all cards are played, the special owner chooses Win (takes the fight) or Lose (the strongest normal card takes it). The winner leads next. The special is shuffled normally and may remain undealt.
5. After the last fight, each player simultaneously loses `abs(predicted wins − actual wins)` HP. Predicting 2 and winning 0 loses 2 HP; winning 3 loses 1 HP. A correct prediction neither loses nor restores HP.

### The one-card round

Each player sees the other active players’ cards, but not their own. Call **I win** or **I lose** in clockwise order; each committed call is visible immediately. There is no prediction-total restriction: zero, one, several, or all players may predict a win.

Once everyone has locked a call, all cards reveal. If the special is present, its owner chooses Win or Lose before scoring. Otherwise the strongest card wins. The special gives no HP immunity. Every incorrect call costs 1 HP; if everyone calls correctly, nobody loses HP.

### Elimination and sudden death

- Reaching zero HP eliminates you after scoring. You may continue watching the public table. Live hidden cards are never shown to spectators.
- A match may continue with fewer than four players. The last survivor wins.
- If all remaining players fall in the same round, restore **only those players** to 1 HP and continue to the next card count. Earlier eliminated players stay out.
- The host advances from the results screen. After a win, **Play again** returns everyone to a fresh lobby with the selected starting lives and readiness reset.

### Absence and host controls

There are **no turn timers and no automatic moves**. Other turns can proceed, but the game waits whenever an absent player must act. The blind round waits for every remaining call. Disconnect detection can take a short time while the connection heartbeat expires.

If the host disconnects, host controls pass to the next connected player in seat order. The original host may return as a player. A connected spectator can host. If everyone is disconnected, the first returning player takes over.

The host can remove another player or end the match. Leaving voluntarily follows the same removal rules:

- Preserve completed fights, surviving players’ earned wins, and their committed predictions.
- Remove the departing player’s unplayed cards and any card in an unresolved fight. Resolve that fight immediately if every remaining player has already played.
- Skip their seat for future actions. If a final bidder is removed after everyone else has called, accept those existing bids even if their new total equals the fight count.
- Removing the last uncommitted blind predictor resolves the round using the remaining cards and locked calls.
- A removal leaving one active player declares that player the winner. Removing the final active player ends without a winner.
- Ending the match sends everyone back to the lobby without a winner. New players can join between matches.

## Verify

```sh
pnpm check
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

If Chrome is already installed, the browser suite can use it instead of downloading Chromium:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
pnpm test:e2e
```

The Vitest suite covers the rules, server validation, privacy, idempotency, host changes, removals, reconnection, and complete four- and eight-player simulated matches. Playwright drives separate browser sessions through the lobby, normal play, an entire eight-player cycle, the blind reveal, mobile layouts, reconnects, and host controls. It saves screenshots in `test-results/`.

## Production and hosting

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

The production server serves the compiled frontend and Socket.IO on one port: **3001** by default, or the hosting provider’s `PORT` environment variable. The `/health` endpoint returns `{ "status": "ok" }`.

Deploy the `41` directory to a Node.js host that supports a persistent process and WebSockets. Use the install/build command above and `pnpm start` as the start command. Keep the source directories (`server` and `shared`) alongside `dist`: the server runs TypeScript through the `tsx` runtime dependency. Use HTTPS through the host’s reverse proxy. No account service, database, external font service, or secret environment variable is required.

**Use one server instance for this version.** Rooms and reconnect tokens live only in that process’s memory. Restarting or redeploying the server ends existing rooms; multi-instance scaling needs shared room/session storage. An entirely abandoned room persists until all seats leave or the server restarts.

### Play over the internet without a home server

The repository now includes a cloud deployment configuration. Once deployed, players open the public HTTPS address, create a table, and share the invite link or six-character code. All players use that same deployment. Nobody needs to keep a home computer running or configure router ports. The cloud service runs the game rules; the table host is only the player with lobby controls.

1. The local project now lives directly in `C:\Users\Locardo\Documents\ChatGPT\01_Projects\41`. Its local `render.yaml` uses this folder as the build context. The existing GitHub repository and live Render service still use their original `deki/` layout; moving local files does not change that deployment. For a new repository containing this folder directly, put `render.yaml` beside `package.json`.
2. In Render, create a **Blueprint** from that repository and select the root `render.yaml`.
3. Select the **Free instance**. The configuration uses one instance in Frankfurt and disables automatic deploys so code pushes do not interrupt games.
4. Wait for deployment and open the HTTPS URL shown by Render. `/health` should return `{"status":"ok"}`.
5. Create a table and send its invite to friends. Phones can use Wi-Fi or mobile data.

See [Render Blueprint configuration](https://render.com/docs/blueprint-spec) and [WebSocket hosting](https://render.com/docs/websocket). The Free plan sleeps after 15 minutes without incoming HTTP or WebSocket traffic and takes about a minute to wake up. Sleeping, manual deploys, and service restarts end existing tables because rooms live in memory. Render may also restart free instances. The workspace shares 750 free instance hours per month, plus bandwidth and build limits; see [free hosting limits](https://render.com/docs/free). Do not add paid resources or enable usage overages if you want to remain within free hosting. Do not increase the instance count without implementing shared game state.

The `Dockerfile` also works on other hosts that support persistent containers and WebSockets:

```sh
docker build -t deki .
docker run --rm -p 3001:3001 deki
```

Run those commands inside the local `Decki` project folder. The container runs as a non-root user and excludes Android signing files, local environment files, and build tools. Your hosting provider must provide HTTPS and forward HTTP/WebSockets to the container's `PORT` (3001 by default).

Run `pnpm test:hosting` to build and verify the production frontend, health endpoint, invite URL, lobby creation, joining over polling, and reconnection over WebSockets locally. This does not validate a provider's network or TLS configuration.

For Android, set `DEKI_SERVER_URL` to your deployed HTTPS origin before building the APK; see [Android setup](android/README.md). Without it, the app defaults to `https://deki-ymh6.onrender.com`. An explicitly empty value requires server setup.

## Code map

- `shared/engine.ts`: deterministic state transitions, legal actions, round scoring, and per-player privacy views. Randomness is injected; production uses Node’s cryptographic RNG.
- `shared/types.ts`: card, player, game, view, action, command, and acknowledgement contracts.
- `server/app.ts`: private rooms, input validation, session tokens, deduplicated commands, host transfer, and authoritative broadcasts.
- `src/`: React screens, socket connection handling, card artwork, and responsive styles. Cards are SVG/CSS; fonts are bundled locally.
- `tests/`: rule tests, real socket integration tests, and browser flows.

Client commands are `create`, `join`, `resume`, `leave`, `ready`, `start`, `bid`, `play`, `predict`, `next`, `kick`, `end`, and `rematch`. Each request carries a unique ID; gameplay commands also carry the observed round and revision. Secret predictions allow concurrent submissions within the same round. The server sends filtered `state` snapshots, `removed` notifications, and success/error acknowledgements. A client never decides its own wins or HP.

The game has no accounts, public matchmaking, chat, persistent rankings, or saved matches.

Online protocol version 2 is required for the special-card rules. Update the Android client and server together; incompatible clients receive an update-required error. `/health` includes `protocolVersion`. Render deployment is manual; pushing main builds the APK but does not deploy the server.
