import * as colorette from 'colorette';

import * as Utils from "./Utils.js";

import CommanderWrapper from 'commanderwrapper/src/index.js';

//

type Friendly_CommanderWrapper = Omit<CommanderWrapper, "commands" | "getCommand"> & {
    commands: CommanderWrapper["commands"];
    getCommand: CommanderWrapper["getCommand"];
}

//

export default class HelpGen {
    private readonly parent: Friendly_CommanderWrapper;

    //

    constructor(parent: Friendly_CommanderWrapper) {
        this.parent = parent;
    }

    //

    generateGlobalHelpText(): string {
        const lines: string[] = [];

        //

        lines.push(
            colorette.bold(`Available Commands`) +
            colorette.italic(` (for detailed options, use ${colorette.cyan('<command> --help')}):`) +
            `\n`
        );

        //

        for (const [commandName, commandMeta] of this.parent.commands.entries()) {
            const description = commandMeta.commander.description() || '';

            lines.push(`  ${colorette.cyan(commandName)}`);

            if (description.trim() !== '') {
                lines.push(`    ${colorette.italic(description)}`);
            }

            lines.push('');
        }

        lines.push('');

        //

        return lines.join('\n');
    }

    generateHelpTextForCommand(commandName: string): string {
        const lines: string[] = [];

        //

        lines.push(this.generateCommandFullIntroduction(commandName));
        lines.push(this.generateCommandOptionsFullIntroduction(commandName));

        //

        return lines.join('\n');
    }

    //

    generateCommandFullIntroduction(commandName: string) {
        const commandMeta = this.parent.getCommand(commandName);

        //

        const lines: string[] = [];

        //

        lines.push(colorette.bold(`Command:`) + ` ${commandName}` + " " + Utils.FormatCommandArgumentsInLine(commandMeta));
        lines.push("");
        lines.push(colorette.italic(`  ${commandMeta.commander.description()}`));
        
        //

        if (commandMeta.arguments.length) {
            lines.push("");

            const args: { left: string, right?: string }[] = commandMeta.arguments.map(arg => {
                return {
                    left: Utils.FormatCommandArgument(arg),
                    right: arg.config.validation ? `Allowed: ${Utils.FormatValidationRules(arg.config.validation)}` : undefined
                }
            });

            const longestLeftLength = args.reduce((max, arg) => Math.max(max, arg.left.length), 0);
            args.forEach(arg => {
                arg.left = arg.left.padEnd(longestLeftLength + 3);

                lines.push(`  ` + colorette.cyan(arg.left) + (arg.right ? arg.right : ""));
            });
        }

        //

        return lines.join("\n");
    }

    generateCommandOptionsFullIntroduction(commandName: string) {
        const commandMeta = this.parent.getCommand(commandName);

        //

        const lines: string[] = [];

        //

        lines.push(colorette.bold(`\nOptions:\n`));

        //

        const groups = Object.entries(commandMeta.groups);

        groups.unshift(["built-in", [{
            groupName: "built-in",
            flags: "-h, --help",
            description: "Show help",
            tags: [],
            commanderOption: null as any
        }]]);

        //

        const allOptions = groups.flatMap(([, options]) => options);
        const flagPadding = Math.max(...allOptions.map(opt => opt.flags.length)) + 2;

        for (const [groupName, options] of groups) {
            lines.push("  " + colorette.underline(`${groupName}:`) + "\n");

            for (const option of options) {
                const flags = colorette.cyan(option.flags.padEnd(flagPadding));
                lines.push(`    ${flags} ${option.description}`);
            }

            lines.push('');
        }

        lines.push('');

        return lines.join('\n');
    }
}
