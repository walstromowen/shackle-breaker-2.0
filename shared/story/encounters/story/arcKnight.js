/* An Arc Knight: act 1's mini boss.

   The Arc Knights are the king's new royal guard (docs/story.md). In the year leading up to the fall of Altus the king came to rely on them over the
   old guard, Mentoras's, who used no magic: they took the artifact's fire into their weapons and armour, and the old guard was sent home. Now they are
   the guard of the corrupted king, enforcers of his will in the dark lands. "Soldiers with bright blades", the Hooded Stranger calls them (he does not
   say what he was; nothing here may give him away). This one is just one of them, burning still. Once the player has put down three magic addicts for the Stranger (quest shackled3, "Sparks of the Mad") and handed it in, he
   stands in the gate of the Stranger's yard, the only way out (world flag arc_knight_roused; WorldManager arcKnightObjects), and coming near him
   is the meeting: a few words, and the fight. He is the King's still: knelt once to take the fire and the King's voice with it, and never rose,
   bound and cursed past the fall, the King speaking through him (a thrall's voice, with a far one behind it). The mad are nothing to him; he has
   come because the King wants the player dead. Put down, the voice leaves him, and he is gone for good (arc_knight_slain).
   From act 2 others like him are abroad, rare, on patrol in the plains (ARC_KNIGHT_PATROL): they say nothing; coming near one is the fight
   (arcKnightPatrol).

   The world's: like Nikoli and Osric, his story belongs to the world being played (story/worldStory.js): in a party everyone meets the same knight.
   How he talks: an old knight of Altus inside a great helm, formal and slow, the fire crackling in his throat, and hollow: a man speaking under
   another's will. */
import { next } from '../stageKit.js';

const TITLE = "Arc Knight";
const IMG = { col: 0, row: 0 };
const OBJECTS = ['ARC_KNIGHT_NPC', 'ARC_KNIGHT_NPC_LEFT', 'ARC_KNIGHT_NPC_RIGHT'];
const end = (results = []) => [{ weight: 100, results: [...results, { type: "END_ENCOUNTER", payload: null }] }];
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });

const STAGES = {
    ak_meet: stage("A knight in blackened plate fills the gate of the yard, the only way out, his sword a bar of living flame. The helm turns toward you, slow, and something cold looks out of the slit. \"Hold.\" The word rings strangely, as if a second voice spoke it with him, from very far away.",
        next("ak_2"), { sfx: "unsheathSwordSfx", sfxVolume: 0.5 }),
    ak_2: stage("\"You think I come for the three you burned out for the old man. I do not. The mad are nothing to me. Let them rot in their ditches.\"",
        next("ak_3")),
    ak_3: stage("\"I was of the King's guard. The new guard. The old one would not take the artifact's fire, so he sent them home and gave it to us instead: in our blades, in our plate, in us.\"",
        next("ak_kneel")),
    ak_kneel: stage("\"I knelt, and the King put his fire in me, and his voice with it. I have not risen from that kneeling since.\" The flames along the blade bend, as if a wind blew on them from somewhere far off. \"He speaks still, even from the ruin. We keep these lands for him now.\"",
        next("ak_4")),
    ak_4: stage("The helm tilts, listening to something you cannot hear. \"He knows your face, shackled one. He wants it gone from the world.\" \"I would not. I cannot help it. Draw.\"",
        [{
            text: "Draw your weapon.",
            outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: {
                enemies: [{ id: "ARC_KNIGHT", levelOffset: 2 }],
                bgm: "apexPredatorBgm",   // a mini boss: a hunt's music, not the plains'
                afterVictory: { encounterId: "arc_knight_fallen" }
            } }] }]
        }, { text: "Back away.", customActionText: "You step back. He does not follow, and he does not move from the gate. There is no other way out.", outcomes: end() }],
        // he turns hostile here: the fight's music starts with his words, before the choice, and carries on into the battle unbroken (the same track)
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
