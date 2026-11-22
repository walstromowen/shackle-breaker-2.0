/* An Arc Knight: act 1's mini boss.

   The Arc Knights are the king's new royal guard (docs/story.md). In the year leading up to the fall of Altus the king came to rely on them over the
   old guard, Mentoras's, who used no magic: they took the artifact's fire into their weapons and armour, and the old guard was sent home. Now they are
   the guard of the corrupted king, enforcers of his will in the dark lands. "Soldiers with bright blades", the Hooded Stranger calls them (he does not
   say what he was; nothing here may give him away). This one is just one of them, burning still. Once the player has put down three magic addicts for the Stranger (quest shackled3, "Sparks of the Mad") and handed it in, he
   stands in the gate of the Stranger's yard, the only way out (world flag arc_knight_roused; WorldManager arcKnightObjects), and coming near him
   is the meeting: the narrator sees him, he speaks (the fight's music starts), his blade at your throat, and the fight. He is bound to the King's will and has one errand, the player's death; he says no more than
   that. Put down, the voice leaves him, and he is gone for good (arc_knight_slain).
   From act 2 others like him are abroad, rare, on patrol in the plains (ARC_KNIGHT_PATROL): they say nothing; coming near one is the fight
   (arcKnightPatrol).

   The world's: like Nikoli and Osric, his story belongs to the world being played (story/worldStory.js): in a party everyone meets the same knight.
   How he talks: as little as he can. A knight of the King's guard on an errand, hollow, the fire crackling in his throat; the narrator gives only what
   he does (the helm turning, the blade lifted), never what he thinks. Only in dying does he say more (fallen). */
import { next } from '../stageKit.js';

const TITLE = "Arc Knight";
const IMG = { col: 0, row: 0 };
const OBJECTS = ['ARC_KNIGHT_NPC', 'ARC_KNIGHT_NPC_LEFT', 'ARC_KNIGHT_NPC_RIGHT'];
const end = (results = []) => [{ weight: 100, results: [...results, { type: "END_ENCOUNTER", payload: null }] }];
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });

const STAGES = {
    ak_meet: stage("A knight in blackened plate fills the gate of the yard, the only way out. His great helm is scorched about the eye-slit, and his sword is a bar of living flame. He stands as still as the fence posts beside him.",
        next("ak_hold"), { sfx: "unsheathSwordSfx", sfxVolume: 0.5 }),
    // he turns on you: the fight's music starts here, before the choice, and carries on into the battle unbroken (the same track)
    ak_hold: stage("The helm turns toward you, slow. \"Hold.\" The fire along his blade flickers. \"He knows your face.\"",
        next("ak_4"), { bgm: "apexPredatorBgm" }),
    ak_4: stage("He lifts his blade and lays its burning edge at your throat. \"Stand still, shackled one. It is easier this way.\"",
        [{
            text: "Draw your weapon.",
            outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: {
                enemies: [{ id: "ARC_KNIGHT", levelOffset: 2 }],
                bgm: "apexPredatorBgm",   // a mini boss: a hunt's music, not the plains'
                afterVictory: { encounterId: "arc_knight_fallen" }
            } }] }]
        }, { text: "Back away.", customActionText: "You step back from the blade. He does not follow. He does not leave the gate.", outcomes: end() }],
        { bgm: "apexPredatorBgm" }),
    // after the fight
    fallen: stage("The knight drops to one knee. The fire on his blade gutters and goes out, and something leaves the helm with it: the far voice behind his own. \"Cold. I had forgotten cold.\"",
        next("fallen_2"), { bgm: "none" }),
    fallen_2: stage("A tired breath, a man's. \"He is gone from my head. Do you know how long it has been?\" \"He has others still kneeling. He will send them.\" Then he is still.",
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
        spotted: stage("An Arc Knight of the King's guard, keeping these roads in his master's name, turns and sees you. The fire along his blade flares white. He says nothing. He does not need to.",
            [{
                text: "Draw your weapon.",
                outcomes: [{ weight: 100, results: [
                    { type: "DESTROY_OBJECT" },
                    { type: "START_BATTLE", payload: { enemies: [{ id: "ARC_KNIGHT", levelOffset: 1 }], bgm: "apexPredatorBgm" } }
                ] }]
            }], { bgm: "apexPredatorBgm", sfx: "unsheathSwordSfx", sfxVolume: 0.6 })
    }
};
