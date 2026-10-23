// shared/battle/battleConstants.js: the battle's shared vocabulary.
//   PHASE       the stages a battle moves through. The BattleController sets them; the TurnManager and the battle screens read them.
//   TURN_TYPES  the kinds of entry in `state.turnQueue`, which the TurnManager plays one by one.
export const PHASE = {
    INTRO: 'INTRO',
    SELECT_ACTION: 'SELECT_ACTION',
    SELECT_TARGET: 'SELECT_TARGET',
    RESOLVE: 'RESOLVE',
    VICTORY: 'VICTORY',
    DEFEAT: 'DEFEAT'
};

export const TURN_TYPES = {
    MESSAGE_STATUS: 'STATUS_MESSAGE',
    MESSAGE_VICTORY: 'VICTORY_MESSAGE',
    MESSAGE_DEFEAT: 'DEFEAT_MESSAGE',
    MESSAGE_DEATH: 'DEATH_MESSAGE',
    BATTLE_END: 'BATTLE_END',
    REINFORCEMENT: 'REINFORCEMENT',
    PROMPT_REINFORCEMENT: 'PROMPT_REINFORCEMENT',
    PLAY_ANIMATION: 'PLAY_ANIMATION',
    ANIMATION: 'ANIMATION',
    APPLY_ABILITY_EFFECTS: 'APPLY_ABILITY_EFFECTS',
    END_ACTOR_TURN: 'END_ACTOR_TURN',
    EXECUTE_ACTION: 'EXECUTE_ACTION',
    APPLY_STATUS_EFFECT: 'APPLY_STATUS_EFFECT',
    WEATHER_INTRO: 'WEATHER_INTRO',
    WAIT: 'WAIT'
};
