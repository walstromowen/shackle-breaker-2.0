# Shackle-breaker

A dark-fantasy RPG that runs in the browser on a canvas. Explore a procedurally generated world, fight turn-based battles, make choices in encounters, craft and trade.

## Run it

```
npm install
npm run dev:memory      # accounts and saves are kept in memory: handy for trying things out
```

Open http://localhost:3000 (the address is printed). `npm run dev` uses MongoDB instead; see [ACCOUNTS_AND_SAVES.md](ACCOUNTS_AND_SAVES.md) for the settings and for deploying to Render.

```
npm test                # the whole test suite
npm run check:paths     # import and asset paths with the wrong upper / lower case
```

## Where things are

See [ARCHITECTURE.md](ARCHITECTURE.md): which folder a new file goes in, and how to add an enemy, ability, item, encounter or screen.
