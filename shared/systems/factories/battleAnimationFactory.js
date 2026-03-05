import { BattleAnimationDefinitions } from '../../data/battleAnimationDefinition.js';
import { BattleAnimationModel } from '../../models/battleAnimationModel.js';

export class BattleAnimationFactory {
    static create(animationId, actor, targets) {
        // Fallback to a default if the ID isn't found
        const def = BattleAnimationDefinitions[animationId] || BattleAnimationDefinitions["default_attack"];
        return new BattleAnimationModel(animationId, def, actor, targets);
    }
}