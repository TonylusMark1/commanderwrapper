import * as Types from "./types.js";

import CommanderWrapper from './index.js';

//

export default class Validation {
    private readonly parent: CommanderWrapper;

    //

    constructor(parent: CommanderWrapper) {
        this.parent = parent;
    }

    //

    findFirstInvalidRule<T>(validation: Types.ValidationRule<T>[]) {
        for (const rule of validation) {
            const isDirectValue = typeof rule === 'string' || typeof rule === 'number' || typeof rule === 'boolean';
            const isRegExp = rule instanceof RegExp;
            const isPatternObject =
                typeof rule === 'object' && rule !== null &&
                'pattern' in rule && rule.pattern instanceof RegExp &&
                'description' in rule && typeof rule.description === 'string';
            const isCallbackObject =
                typeof rule === 'object' && rule !== null &&
                'callback' in rule && rule.callback instanceof Function &&
                'description' in rule && typeof rule.description === 'string';

            if (!isDirectValue && !isRegExp && !isPatternObject && !isCallbackObject)
                return rule;
        }
    }

    isValueValid<T>(value: T, validation?: Types.ValidationRule<T>[]): boolean {
        if (!validation || validation.length === 0)
            return true;

        return validation.some(rule => {
            if (rule instanceof RegExp)
                return rule.test(String(value));

            if (typeof rule === 'object' && rule !== null && 'pattern' in rule)
                return rule.pattern.test(String(value));

            if (typeof rule === 'object' && rule !== null && 'callback' in rule)
                return rule.callback(value);

            return rule === value;
        });
    }
}
