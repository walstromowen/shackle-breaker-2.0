/* The Amputators (story/covenants.js), the game's first covenant.

   Osric of the Saw (object OSRIC_NPC, entity AMPUTATOR_OSRIC): an Amputator with an iron hook where his left hand was, sitting among the stones of the
   first small graveyard the player comes upon in act 1 (WorldManager.noticeAmputatorGraveyard claims it for the world: world.amputatorGraveyard is the
   cell he sits on). He stays there once claimed.
   Brother Garrick (object GARRICK_NPC, entity AMPUTATOR_GARRICK): an Amputator going mad, where Osric sends you (world.amputatorQuarry, picked when the
   quest starts: a spot out of sight of the graveyard that can be walked to, marked on the player's map). Coming near him starts his scene and the fight.

   How it goes (world flags osric_met, garrick_slain; quest amputators_trial; the oath, the player's own: COVENANTS.amputators.milestone):
     meet .. meet_4        he sees the iron on your wrists, says what the Amputators are. Ask about them (lore), or what he wants (task).
     task .. task_2        Brother Garrick has begun to hear the chain sing. He cannot do it himself. "I'll find him" starts the quest and marks
                           Garrick's spot on your map (AMPUTATOR_QUARRY); "Not now" leaves the offer open (again).
     waiting               Garrick still lives.
     return .. offer       Garrick is dead: the quest is handed in, and Osric offers the oath. Take it (joined: the Amputator's Saw) or not yet (not_yet:
                           the offer stands, offer_again on any later visit).
     member                sworn.
   Garrick: g_meet .. g_3, then the fight (afterVictory amputator_garrick_fallen: his last clear moment, garrick_slain).

   How Osric talks: a Bloodborne hunter at the end of a long night. Courteous, weary, dry, a little unhinged at the edges; archaic now and then
   ("friend", "I'd wager", "mind the graves"); he laughs at the wrong moments and stops himself. Garrick: sing-song, wet-eyed, patient, wrong.

   The world's: like Nikoli, his story belongs to the world being played (story/worldStory.js): in a party everyone meets the same Osric, and the players
   near the one who talks to him are pulled in. The oath is each player's own. */
import { gameState } from '../../../core/gameState.js';
import { QuestModel } from '../../questModel.js';
import { ActSystem } from '../../actSystem.js';
import { Covenants, COVENANTS } from '../../covenants.js';
import { toStage, next } from '../stageKit.js';

const TITLE = "Osric of the Saw";
const IMG = { col: 0, row: 0 };
const GARRICK_IMG = { sheet: "madmanPortrait", col: 0, row: 0 };
export const AMPUTATOR_QUEST = "amputators_trial";
const COVENANT = COVENANTS.amputators;

const end = (results = []) => [{ weight: 100, results: [...results, { type: "END_ENCOUNTER", payload: null }] }];
const stage = (text, decisions, extra = {}) => ({ displayText: TITLE, image: IMG, text, decisions, ...extra });
const has = (id) => ActSystem.hasMilestone(id);

/** The stage Osric opens with, from the world's flags and this player's quest and oath. */
function opening() {
    if (!has('osric_met')) return 'meet';
    const q = gameState.quests || {};
    if (q.active && q.active[AMPUTATOR_QUEST]) return QuestModel.checkCompletion(gameState, AMPUTATOR_QUEST) ? 'return' : 'waiting';
    if (Covenants.isMember(COVENANT.id)) return 'member';
    if (Array.isArray(q.completed) && q.completed.includes(AMPUTATOR_QUEST)) return 'offer_again';
    if (has('garrick_slain')) return 'offer_again';   // a party member finished it: the oath is still his to offer
    return 'again';
}

/* Taking the quest: the quest, Garrick's spot picked and marked, Osric met */
const takeTask = {
    text: "\"I'll find him.\"",
    outcomes: [{ weight: 100, results: [
        { type: "GRANT_MILESTONE", payload: { id: "osric_met" } },
        { type: "START_QUEST", payload: { questId: AMPUTATOR_QUEST } },
        { type: "AMPUTATOR_QUARRY", payload: {} },
        { type: "ADVANCE_STAGE", payload: { stageId: "sent" } }
    ] }]
};
const notNow = {
    text: "\"Not now.\"",
    outcomes: [{ weight: 100, results: [{ type: "GRANT_MILESTONE", payload: { id: "osric_met" } }, { type: "ADVANCE_STAGE", payload: { stageId: "later" } }] }]
};
/* The oath */
const takeOath = {
    text: `[Take the oath] "${COVENANT.creed}"`,
    outcomes: [{ weight: 100, results: [
        { type: "JOIN_COVENANT", payload: { covenantId: COVENANT.id } },
        { type: "GIVE_ITEM", payload: { itemId: COVENANT.gift, qty: 1 } },
        { type: "ADVANCE_STAGE", payload: { stageId: "joined" } }
    ] }]
};
const notYet = { text: "\"Not yet.\"", outcomes: toStage("not_yet") };

const STAGES = {
    // ---- the first meeting ----
    meet: stage("Among the leaning stones a man sits on a toppled grave marker, drawing a whetstone along the teeth of a saw. His left sleeve is pinned up past the elbow. Where the hand should be, an iron hook catches the light.",
        next("meet_2")),
    meet_2: stage("\"Ah. Another soul on the old road. Mind the graves, friend. The dead here have suffered enough of us.\"",
        next("meet_3")),
    meet_3: stage("His eyes drop to your wrists, and stay there. \"And there it is: the iron, still shut tight. No rot in your eyes yet. Lucky, or only early.\"",
        next("meet_4")),
    meet_4: stage("\"Don't fret. I'm not one to cut first and ask after. Not anymore.\" He taps the hook against the saw. \"We are the Amputators.\"",
        next("meet_5")),
    meet_5: stage("\"Where the chain takes hold, we take it off. The shackle, and if the shackle won't come... well. Better a hand than a mind, I'd wager.\"",
        [
            { text: "\"Who are the Amputators?\"", outcomes: toStage("lore") },
            { text: "\"What do you want from me?\"", outcomes: toStage("task") }
        ]),
    lore: stage("\"A brotherhood, of sorts. Those who saw the laughing ones in the grass and decided not to join them.\"",
        next("lore_1")),
    lore_1: stage("\"Most of us gave something to the saw. A hand. A foot. A little sense, now and again.\" He laughs, then stops himself, as if surprised by the sound.",
        next("lore_2")),
    lore_2: stage("\"We're not the cure, mind. There is no cure. We're only the knife.\"",
        [{ text: "\"What do you want from me?\"", outcomes: toStage("task") }]),
    task: stage("He sets the whetstone down. \"There's a matter. One of ours, Brother Garrick.\"",
        next("task_1")),
    task_1: stage("\"Steady hands, once. Best of us. Lately he talks to his scars, and saws at nothing in the night. And he laughs.\"",
        next("task_2")),
    task_2: stage("\"He wears no iron, mind you. Not yet. But the rot needn't wear iron to get in.\" He turns the saw over in his lap.",
        next("task_3")),
    task_3: stage("\"I can't do it. Old friends, you understand. Put him to rest, before he puts that saw to someone who never asked for it.\"",
        [takeTask, notNow]),
    sent: stage("\"Last I saw him he was off past the stones, muttering at the crows.\" He scratches a mark into your map with the point of his hook. \"You'll know him by the laughing. Be quick about it. And be kind, if you can.\"",
        [{ text: "Leave him to his saw.", outcomes: end() }]),
    later: stage("\"No hurry. The dead keep, and so do I. Garrick, I fear, does not.\"",
        [{ text: "Leave.", outcomes: end() }]),
    again: stage("Osric looks up from his saw. \"Back again. Garrick's still out there, laughing. Will you see to him?\"",
        [takeTask, { text: "\"Not now.\"", outcomes: end() }]),
    waiting: stage("\"Garrick still breathing? ...Then the night's not over. Past the stones, friend. Follow the laughing.\"",
        [{ text: "Leave.", outcomes: end() }]),

    // ---- Garrick is dead: the oath ----
    return: stage("Osric reads your face before you say a word. \"Done, then.\" He is quiet for a while. \"Poor Garrick. He'd have thanked you, once. Perhaps he did, at the end, in his way.\"",
        [{ text: "\"He said the song was a lie.\"", outcomes: [{ weight: 100, results: [{ type: "COMPLETE_QUEST", payload: { questId: AMPUTATOR_QUEST } }, { type: "ADVANCE_STAGE", payload: { stageId: "offer" } }] }] }]),
    offer: stage("\"It always is.\" He rises, joints cracking. \"You've a steady hand, and you came back sane. That's two more than most. The brotherhood could use you, iron and all. Will you take the oath?\"",
        [takeOath, notYet]),
    offer_again: stage("\"Changed your mind, friend? The oath's still yours, if you want it.\"",
        [takeOath, { text: "\"Not yet.\"", outcomes: end() }]),
    not_yet: stage("\"Wise, perhaps. An oath's a heavier thing than a saw. I'll be here, among the stones.\"",
        [{ text: "Leave.", outcomes: end() }]),
    joined: stage("\"Ha! Welcome, brother.\" He presses the saw into your hands, handle first. \"It's yours now. Mind the teeth. They've no loyalty to anyone.\"",
        next("joined_2")),
    joined_2: stage("\"Remember: we're not the cure, only the knife. And when your own iron starts to sing...\" He smiles, not unkindly. \"Come find me. I'll make it quick.\"",
        [{ text: "Leave.", outcomes: end() }]),
    member: stage("\"Brother. Still whole? Good. Keep it that way, as long as you can.\"",
        [{ text: "Leave.", outcomes: end() }]),
};

export const amputatorOsric = {
    id: "amputator_osric",
    title: TITLE,
    imageSheet: "watchmanPortrait",
    personal: false,   // the world's story: in a party, the players near you are pulled in and vote on what is said (the oath is each player's own)
    tone: "cold",
    initialStage: opening,
    stages: STAGES
};

/* ---- Brother Garrick ---- */
const gStage = (text, decisions, extra = {}) => ({ displayText: "Brother Garrick", image: GARRICK_IMG, text, decisions, ...extra });
const GARRICK_STAGES = {
    g_meet: gStage("A thin man crouches in the grass with his back to you, sawing. Not at wood. At his own forearm, slow and patient, just above a ring of old scars. He is humming. The humming turns into a laugh.",
        next("g_2"), { sfx: "whispers", sfxVolume: 0.35 }),
    g_2: gStage("\"Osric sent you. Hah! Osric, Osric. Thinks I'm going the way of the iron.\"",
        next("g_2b")),
    g_2b: gStage("\"But listen. Listen! Can you hear it? The chain sings when you cut it. Every link, a little song.\"",
        next("g_3")),
    g_3: gStage("He turns. His eyes are wet and very wide. \"You've iron on you. Let me take it off, friend, let me hear it sing. Only the hand. Hold still...\"",
        [{
            text: "Draw your weapon.",
            outcomes: [{ weight: 100, results: [{ type: "START_BATTLE", payload: {
                enemies: [{ id: "AMPUTATOR_GARRICK", levelOffset: 1 }],
                bgm: "plainsBattleBgm",   // an ordinary fight: the battle music of wherever he is
                afterVictory: { encounterId: "amputator_garrick_fallen" }
            } }] }]
        }, { text: "Back away.", outcomes: end() }]),
    // after the fight
    fallen: gStage("Garrick sags into the grass, and the saw slips from his fingers. For a moment his eyes clear. \"Tell Osric... the song was a lie. It was only screaming.\" Then he is still.",
        [{ text: "Leave him to the grass.", outcomes: end([
            { type: "GRANT_MILESTONE", payload: { id: "garrick_slain" } },
            { type: "REMOVE_STORY_NPC", payload: { objectId: "GARRICK_NPC" } }
        ]) }], { bgm: "none" })
};

export const amputatorGarrick = {
    id: "amputator_garrick",
    title: "Brother Garrick",
    imageSheet: "madmanPortrait",
    personal: false,
    tone: "cold",
    initialStage: () => (has('garrick_slain') ? 'fallen' : 'g_meet'),
    stages: GARRICK_STAGES
};

/* Played when the fight is won (START_BATTLE afterVictory) */
export const amputatorGarrickFallen = { ...amputatorGarrick, id: "amputator_garrick_fallen", initialStage: "fallen" };
