import * as colorette from 'colorette';

import * as Utils from "./Utils.js";

import CommanderWrapper from './index.js';

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
            const description = commandMeta.cmder_command.description() || '';

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

    generateCommandFullIntroduction(name: string) {
        const cmd = this.parent.getCommand(name);

        //

        const lines: string[] = [];

        //

        lines.push(colorette.bold(`Command:`) + ` ${name}` + " " + Utils.FormatCommandArgumentsInLine(cmd));
        lines.push("");
        lines.push(colorette.italic(`  ${cmd.cmder_command.description()}`));
        
        //

        if (cmd.arguments?.length) {
            lines.push("");

            const args: { left: string, right?: string }[] = cmd.arguments.map(arg => {
                return {
                    left: Utils.FormatCommandArgument(arg),
                    right: [
                        `(${arg.required ? "Required": "Not required"})`,
                        `(${arg.validation ? `Allowed values: ${colorette.yellow(Utils.FormatValidationRules(arg.validation))}` : undefined})`,
                        (
                            arg.default
                                ?
                                `(Default value: ${colorette.yellow(JSON.stringify(arg.default))})`
                                :
                                ""
                        ),
                    ].join(" ")
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

    generateCommandOptionsFullIntroduction(name: string) {
        const cmd = this.parent.getCommand(name);

        //

        const lines: string[] = [];

        //

        lines.push(colorette.bold(`\nOptions:\n`));

        //

        const groups = Object.entries(cmd.groups);

        groups.unshift(["built-in", [{
            groupName: "built-in",
            flags: "-h, --help",
            description: "Show help",
            cmder_option: null as any
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
