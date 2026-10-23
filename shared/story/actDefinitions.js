/* ACTS: how the world gets harder when a milestone is reached.
 *
 * The game keeps a list of milestones (gameState.milestones: ['act2', ...]). A milestone is granted by the GRANT_MILESTONE result of an encounter
 * (see story/encounters/actTwo.js, which plays right after Darius the Groveler falls). The current act is the highest act whose `milestone` has been granted,
 * and every system asks ActSystem (story/actSystem.js) instead of reading this file: the clock colours (TimeSystem), the daytime gloom
 * (LightingRenderer), the spawn tables (SpawnTableFactory, BiomeModel), the enemies themselves (SceneManager when a battle is built) and the encounters
 * (conditions `act_at_least` / `act_below` / `milestone`, and `minAct` / `maxAct` on the pools of a biome's encounters).
 *
 * To add act 3: copy the act 2 block as `3`, give it `milestone: 'act3'` and change what should be worse. Everything an act leaves out is inherited
 * from the act before it, so act 3 only has to list what changes.
 *
 * Fields (all optional except `milestone`; act 1 has none because it is simply the start of the game):
 *   name            shown in logs and the save summary
 *   lighting        what the clock and the lighting pass use instead of the plain colours:
 *                     night / dusk / dawn / golden   { r, g, b, a } replacing the colour of that part of the day (see TimeSystem.palette)
 *                     moonlight                      the red pool of light around the player on a blood moon night: { color, radius, strength }
 *                     dayGloom                       overrides of CONFIG.DAY_GLOOM (alpha, color 'r, g, b', radius, strength)
 *   bloodMoon       true: every night is a blood moon. The night colour above is the red sky, the biome battles use their `bloodMoon` table,
 *                   and the battle rate goes up by bloodMoonBattleRate
 *   battleRate      multiplier on the chance of an ambush per step, day and dusk (1 = unchanged)
 *   bloodMoonBattleRate  the same, on a blood moon night
 *   enemyLevelOffset     levels added to every enemy, on top of the difficulty's own offset
 *   enemies         extra abilities and traits for specific enemies:  { MAD_MAN: { abilities: ['reckless_charge'], traits: ['quick'] } }
 *                   (an enemy made with its own abilities keeps them: these are added)
 */
export const ACT_DEFINITIONS = {
    1: {
        name: 'Act I'
    },

    2: {
        name: 'Act II: The Blood Moon',
        milestone: 'act2',

        lighting: {
            // The night is the blood moon: black darkness with only a trace of crimson in it. The red is the moonlight below, a pool around the player that
            // fades into the black; the player's torch and every other light cut through both.
            night: { r: 24, g: 2, b: 5, a: 0.97 },
            dusk: { r: 118, g: 20, b: 24, a: 0.46 },
            dawn: { r: 96, g: 30, b: 42, a: 0.52 },
            golden: { r: 235, g: 120, b: 60, a: 0.12 },
            // moonlight = the red pool of the blood moon around the player (outdoors, at night): color 'r, g, b', radius in tiles, strength 0..1 at its centre.
            // It fades in over dusk and out over dawn, and is not there in a cave or a house.
            moonlight: { color: '255, 30, 36', radius: 11, strength: 0.58 },
            // Even the day is darker, redder and the pool of daylight around the player is smaller
            dayGloom: { alpha: 0.58, color: '44, 8, 18', radius: 7, strength: 1 }
        },

        bloodMoon: true,
        battleRate: 1.25,
        bloodMoonBattleRate: 1.8,
        enemyLevelOffset: 1,

        enemies: {
            // --- the shackled ---
            MAD_MAN:          { abilities: ['reckless_charge'], traits: ['quick'] },
            ROTTER:           { abilities: ['eviscerate'], traits: ['tough'] },
            MAGIC_ADDICT:     { abilities: ['drain_life'] },
            HOLLOW_HARVESTER: { abilities: ['drain_life'], traits: ['tough'] },
            LEGIONARY:        { abilities: ['shield_bash', 'cleave'], traits: ['iron_willed'] },
            WATCHMAN:         { abilities: ['shield_bash', 'intimidate'] },
            SHACKLED_STEED:   { abilities: ['eviscerate'], traits: ['quick'] },
            SHACKLED_SPIRIT:  { abilities: ['drain_life'] },
            // --- the dead ---
            SKELETAL_WARRIOR: { abilities: ['cleave'], traits: ['tough'] },
            FLOATING_SKULL:   { abilities: ['magic_missile'] },
            ANCIENT_CULTIST:  { abilities: ['drain_life', 'gravity'] },
            // --- wildlife ---
            WOLF:             { abilities: ['eviscerate'], traits: ['quick'] },
            GRIM_STAG:        { abilities: ['howl'], traits: ['tough'] },
            DOG:              { abilities: ['bite'], traits: ['quick'] },
            // --- desert ---
            SAND_STALKER:     { abilities: ['quick_stab', 'hit_and_run'] },
            SCORCHED_VAGRANT: { abilities: ['inferno'] },
            DUNE_MAW:         { abilities: ['eviscerate'], traits: ['tough'] },
            THUNDER_LOCUST:   { traits: ['quick'] },
            CALCIFIED_CRUSADER: { abilities: ['shield_bash', 'cleave'], traits: ['tough'] },
            // --- snowy mountains ---
            SNOW_LEOPARD:     { abilities: ['flurry'], traits: ['quick'] },
            FROZEN_TRAPPER:   { traits: ['quick'] }
        }
    }
};
