import * as Types from "./types.js";

//

export function FormatValidationRules<T>(validation: Types.ValidationRule<T>[]) {
    return validation
        .map(rule => {
            if (rule instanceof RegExp)
                return rule.toString();

            if (typeof rule === 'object' && rule !== null && 'pattern' in rule)
                return `<${rule.description}>`;

            return JSON.stringify(rule);
        })
        .filter(Boolean)
        .join(', ');
}

//

export function FormatCommandArgumentsInLine(commandMeta: Types.CommandMeta) {
    return commandMeta.arguments
        .map(arg => FormatCommandArgument(arg))
        .join(" ");
}

export function FormatCommandArgument(arg: Types.CommandMetaArgument) {
    return (arg.config.required ? `<${arg.config.name}>` : `[${arg.config.name}]`);
}