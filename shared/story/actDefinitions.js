/* ACTS: how the world gets harder when a milestone is reached.
 *
 *   Act I     the start of the game
 *   Act II    the first of the King's Arc Knights is dead (arc_knight_slain, story/encounters/story/arcKnight.js): Dolos turns his attention to the
 *             party (story/dolos.js), and the world is a little harder
 *   Act III   Darius the Groveler is dead (darius_slain, story/encounters/story/actTwo.js "A Dark Truth"): the blood moon
 *   Act IV    the Dry Kraken is dead (kraken_slain, story/encounters/story/codey.js): the heroes go north
 * The quests keep their own pace: the acts only say how hard the world is around them.
 *
 * The game keeps a list of milestones (gameState.milestones, and the world's story flags: story/worldStory.js). A milestone is granted by the
 * GRANT_MILESTONE result of an encounter. Saves from before the acts moved recorded Darius as 'act2' and the Kraken as 'act3': worldStory.js reads
 * those as darius_slain and kraken_slain. The current act is the highest act whose `milestone` has been granted,
 * and every system asks ActSystem (story/actSystem.js) instead of reading this file: the clock colours (TimeSystem), the daytime gloom
 * (LightingRenderer), the spawn tables (SpawnTableFactory, BiomeModel), the enemies themselves (SceneManager when a battle is built) and the encounters
 * (conditions `act_at_least` / `act_below` / `milestone`, and `minAct` / `maxAct` on the pools of a biome's encounters).
 *
 * Everything an act leaves out is inherited from the act before it, so each act only lists what changes.
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
 *   enemyInsightRanks    ranks added to every Insight an enemy knows (its definition's `insights`, abilities/insights.js: ActSystem.scaleEnemyInsights), up to
 *                        the Insight's highest. A fire caster of rank 1 in act I knows rank 2 in act II, and casts that rank's spells too.
 *   enemies         extra abilities and traits for specific enemies:  { MAD_MAN: { abilities: ['reckless_charge'], traits: ['quick'] } }
 *                   (an enemy made with its own abilities keeps them: these are added)
 *   nightByDay      the chance that an ambush by day (in any biome) comes from the biome's night table instead: the night's enemies abroad in daylight
 *   enemyBoosts     every enemy of every fight may come stronger (bosses excepted, they are made as they are):
 *                     traitChance  the chance of one more trait, picked from `traits`
 *                     gearChance   the chance that its gear is better: each piece it carries 1 to gearLevels levels higher (up to the item's most)
 */
export const ACT_DEFINITIONS = {
    1: {
        name: 'Act I'
    },

    // Act II begins when the first Arc Knight dies: Dolos wakes (story/dolos.js), and the world is a little harder. No blood moon yet.
    2: {
        name: 'Act II',
        milestone: 'arc_knight_slain',
        enemyLevelOffset: 1,
        enemyInsightRanks: 1
    },

    // Act III begins when Darius the Groveler dies ("A Dark Truth"): the blood moon. Levels and Insight ranks stay as act II set them.
    3: {
        name: 'Act III: The Blood Moon',
        milestone: 'darius_slain',

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
        nightByDay: 0.25,
        enemyBoosts: {
            traitChance: 0.35,
            traits: ['tough', 'quick', 'nimble', 'deadeye', 'brawler', 'ironhide', 'berserker', 'enduring', 'iron_willed', 'intimidating', 'athletic'],
            gearChance: 0.4,
            gearLevels: 2
        },

        enemies: {
            // --- the shackled ---
            MAD_MAN:          { abilities: ['reckless_charge'], traits: ['quick'] },
            ROTTER:           { abilities: ['pounce'], traits: ['tough', 'acidic'] },   // it lunges (no blade moves for the dead either)   // under the blood moon the remains turn acidic: the acid pool they leave behind
            MAGIC_ADDICT:     { abilities: ['drain_life'] },
            HOLLOW_HARVESTER: { abilities: ['drain_life'], traits: ['tough'] },
            LEGIONARY:        { abilities: ['shield_bash', 'cleave'], traits: ['iron_willed'] },
            WATCHMAN:         { abilities: ['shield_bash', 'intimidate'] },
            SHACKLED_STEED:   { abilities: ['pounce'], traits: ['quick'] },   // rears and comes down (no blade moves for an animal)
            SHACKLED_SPIRIT:  { abilities: ['drain_life'] },
            // --- the dead ---
            SKELETAL_WARRIOR: { abilities: ['cleave'], traits: ['tough'] },
            FLOATING_SKULL:   { abilities: ['magic_missile'] },
            ANCIENT_CULTIST:  { abilities: ['drain_life', 'gravity'] },
            // --- wildlife ---
            WOLF:             { abilities: ['pounce'], traits: ['quick'] },
            GRIM_STAG:        { abilities: ['howl'], traits: ['tough'] },
            DOG:              { abilities: ['bite'], traits: ['quick'] },
            // --- desert ---
            SAND_STALKER:     { abilities: ['quick_stab', 'hit_and_run'] },
            SCORCHED_VAGRANT: { abilities: ['inferno'] },
            DUNE_MAW:         { abilities: ['wrap'], traits: ['tough'] },
            THUNDER_LOCUST:   { traits: ['quick'] },
            CALCIFIED_CRUSADER: { abilities: ['shield_bash', 'cleave'], traits: ['tough'] },
            // --- snowy mountains ---
            SNOW_LEOPARD:     { abilities: ['hit_and_run'], traits: ['quick'] },
            FROZEN_TRAPPER:   { traits: ['quick'] }
        }
    },

    // Act IV begins when the Dry Kraken dies (story/encounters/story/codey.js): Mentoras and Codey go north to the snowy mountains, and what the player
    // told Nikoli and Jaeger comes to bear (story/heroes.js). The world stays as act III left it (everything not set here comes from the acts before).
    4: {
        name: 'Act IV',
        milestone: 'kraken_slain',
        enemyInsightRanks: 2
    }
};
