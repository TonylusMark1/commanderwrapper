import * as Types from "./types.js";

//

export function FormatValidationRules(validation: Types.ValidationRule[]) {
    return validation
        .map(rule => {
            if (rule instanceof RegExp)
                return rule.toString();

            if (typeof rule === 'object' && rule !== null && ('pattern' in rule || 'callback' in rule))
                return `<${rule.description}>`;

            return JSON.stringify(rule);
        })
        .filter(Boolean)
        .join(', ');
}

//

export function FormatCommandArgumentsInLine(cmd: Types.CommandWrapper) {
    return cmd.arguments
        ?.map(arg => FormatCommandArgument(arg))
        .join(" ");
}

export function FormatCommandArgument(cfg: Types.CommandPositionalArgumentConfig) {
    return (cfg.required ? `<${cfg.name}>` : `[${cfg.name}]`);
}