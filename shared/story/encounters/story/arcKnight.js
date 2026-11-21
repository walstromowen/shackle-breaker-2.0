/* An Arc Knight: act 1's mini boss.

   The Arc Knights were a new breed of knight the king instated in the years leading up to the fall of Altus: soldiers infused with magic, made to
   hold back the mad. "Soldiers with bright blades", the Hooded Stranger calls them (the clever went strange first). This one is just one of them,
   burning still. Once the player has put down three magic addicts for the Stranger (quest shackled3, "Sparks of the Mad") and handed it in, he
   waits on the footpath outside the Stranger's workshop (world flag arc_knight_roused; WorldManager arcKnightObjects), and the player meets him
   on walking out: a few words, and the fight. He felt the sparks go out, and the fire in him wants the player's. Put down, he is gone for good
   (arc_knight_slain).
   From act 2 others like him are abroad, rare, on patrol in the plains (ARC_KNIGHT_PATROL): they say nothing; coming near one is the fight
   (arcKnightPatrol).

   The world's: like Nikoli and Osric, his story belongs to the world being played (story/worldStory.js): in a party everyone meets the same knight.
   How he talks: an old knight of Altus inside a great helm, formal and slow, the fire crackling in his throat. */
import { next } from '../stageKit.js';

const TITLE = "Arc Knight";
const IMG = { col: 0, row: 0 };
const OBJECTS = ['ARC_KNIGHT_NPC'];
const end = (results = []) => [{ weight: 100, results: [...results, { type: "END_ENCOUNTER", payload: null }] }];
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });

const STAGES = {
    ak_meet: stage("A knight in blackened plate stands on the path, his sword a bar of living flame. The helm turns toward you, slow. \"You. You smell of sparks gone out. Three of them. I felt each one die.\"",
        next("ak_3"), { sfx: "unsheathSwordSfx", sfxVolume: 0.5 }),
    ak_3: stage("\"The King made us of fire, to hold back the mad. Arc Knights, he called us. The last wall of Altus.\" A sound like a forge drawing breath. \"The wall cracked first.\"",
        next("ak_4")),
    ak_4: stage("The flames along his blade lean toward you, hungry. \"Now the fire wants more. It wants yours. Stand still, shackled one. It is quicker that way.\"",
        [{
            text: "Draw your weapon.",
            outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: {
                enemies: [{ id: "ARC_KNIGHT", levelOffset: 2 }],
                bgm: "apexPredatorBgm",   // a mini boss: a hunt's music, not the plains'
                afterVictory: { encounterId: "arc_knight_fallen" }
            } }] }]
        }, { text: "Back away.", customActionText: "You step back. He does not follow. The helm turns back to the door, and he waits.", outcomes: end() }]),
    // after the fight
    fallen: stage("The knight drops to one knee, and the fire on his blade gutters and goes out. \"Cold. I had forgotten cold.\" A long breath rattles in the helm. \"The King lied to all of us.\" Then he is still.",
        [{ text: "Leave him to the dark.", outcomes: end([
            { type: "GRANT_MILESTONE", payload: { id: "arc_knight_slain" } },
            ...OBJECTS.map(objectId => ({ type: "REMOVE_STORY_NPC", payload: { objectId } }))
        ]) }], { bgm: "none" })
};

export const arcKnight = {
    id: "arc_knight",
    title: TITLE,
    imageSheet: "arcKnightPortrait",
    personal: false,   // the world's story: in a party, the players near you are pulled in
    tone: "cold",
    initialStage: "ak_meet",
    stages: STAGES
};

/* Played when the fight is won (START_BATTLE afterVictory) */
export const arcKnightFallen = { ...arcKnight, id: "arc_knight_fallen", initialStage: "fallen" };

/* Act 2: an Arc Knight on patrol (ARC_KNIGHT_PATROL, rare in the plains). No words: the music of the hunt starts as he sees you, and the only
   thing left is to draw. Beaten, he is gone from the map. */
export const arcKnightPatrol = {
    id: "arc_knight_patrol",
    title: TITLE,
    imageSheet: "arcKnightPortrait",
    tone: "cold",
    initialStage: "spotted",
    stages: {
        spotted: stage("An Arc Knight on his patrol turns, and sees you. The fire along his blade flares white. He says nothing. He does not need to.",
            [{
                text: "Draw your weapon.",
                outcomes: [{ weight: 100, results: [
                    { type: "DESTROY_OBJECT" },
                    { type: "START_BATTLE", payload: { enemies: [{ id: "ARC_KNIGHT", levelOffset: 1 }], bgm: "apexPredatorBgm" } }
                ] }]
            }], { bgm: "apexPredatorBgm", sfx: "unsheathSwordSfx", sfxVolume: 0.6 })
    }
};
