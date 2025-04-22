import { Command, Option } from 'commander';
import * as colorette from 'colorette';

import type * as Types from "./types.js";

import * as Utils from "./Utils.js";
import HelpGen from "./HelpGen.js";
import Validation from "./Validation.js";

//

export type {
    ValidationRule,
    CommandOptionConfig,
    CommandPositionalArgumentConfig,
    ScopedRegisterOptionCallback
} from "./types.js";

//

export default class CommanderWrapper {
    static readonly UNGROUPED_GROUP_NAME = 'ungrouped';

    //

    private helpGen = new HelpGen(this as any);
    private validation = new Validation(this as any);

    private cmder_prg = new Command();

    private commands: Map<string, Types.CommandWrapper> = new Map();

    private usedCommand: string = null as any;

    //

    constructor() {
        this.cmder_prg.helpInformation = () => this.helpGen.generateGlobalHelpText();
    }

    //

    registerCommand(
        o: Types.RegisterCommand,
        setup?: (registerOption: Types.ScopedRegisterOptionCallback) => void
    ) {
        if (this.commands.has(o.name))
            throw new Error(`Command '${o.name}' already exists.`);

        //

        this.checkCommandPositionalArguments(o);

        //

        const cmder_command = (() => {
            const argString = o.arguments
                ?.map(arg => {
                    const name = arg.name + (arg.variadic ? '...' : '');
                    return arg.required
                        ? `<${name}>`
                        : `[${name}]`;
                })
                .join(' ');

            //

            const cmder_command = this.cmder_prg.command(
                argString ? `${o.name} ${argString}` : o.name,
                {
                    isDefault: !!o.isDefault
                }
            );

            //

            cmder_command.allowUnknownOption(!(o?.strictMode ?? true));

            if (o.description)
                cmder_command.description(o.description);

            cmder_command.helpInformation = () => this.helpGen.generateHelpTextForCommand(o.name);

            //

            return cmder_command;
        })();

        //

        const command: Types.CommandWrapper = {
            cmder_command,

            groups: {},

            userProvidedOptions: new Set(),

            arguments: o.arguments,
        };

        //

        this.commands.set(o.name, command);

        //

        command.cmder_command.action((...args: (string | string[])[]) => {
            this.usedCommand = o.name;

            if (command.arguments)
                command.arguments = this.processCommandArguments(command.arguments, args);
        });

        //

        if (setup) {
            const scopedRegisterOption: Types.ScopedRegisterOptionCallback = (config: Types.CommandOptionConfig) => {
                this.registerOption(o.name, config);
            };

            setup(scopedRegisterOption);
        }
    }

    private checkCommandPositionalArguments(o: Types.RegisterCommand) {
        if (!o?.arguments)
            return;

        //

        if (o.arguments?.some((arg, i, arr) => arg.variadic && i !== arr.length - 1)) {
            throw new Error("Only last positional argument can be variadic.");
        }

        //

        for (const a of o?.arguments) { //sprawdzanie defaultów
            if (a.default && a.validation) {
                if (Array.isArray(a.default)) {
                    for (const d of a.default) {
                        if (!this.validation.isValueValid(d, a.validation)) {
                            const allowed = Utils.FormatValidationRules(a.validation);
                            throw new Error(colorette.red(`Invalid default value ${d} for argument "${colorette.yellow(a.name)}".\n${colorette.green('Allowed')}: ${allowed}`));
                        }
                    }
                }
                else {
                    if (!this.validation.isValueValid(a.default, a.validation)) {
                        const allowed = Utils.FormatValidationRules(a.validation);
                        throw new Error(colorette.red(`Invalid default value ${a.default} for argument "${colorette.yellow(a.name)}".\n${colorette.green('Allowed')}: ${allowed}`));
                    }
                }
            }
        }
    }

    //

    private processCommandArguments(configs: Types.CommandPositionalArgumentConfig[], args: (string | string[])[]): Types.CommandPositionalArgumentWrapper[] {
        const wrappers: Types.CommandPositionalArgumentWrapper[] = [];

        //

        for (let i = 0; i < configs.length; i++) {
            const c = configs[i];
            let r = args[i];

            //

            if (c.required && r === undefined)
                throw new Error(colorette.red(`Missing required argument: ${colorette.yellow(c.name)}`));

            //

            const parsed = (() => {
                if (c.variadic && Array.isArray(r) && r.length === 0 && c.default !== undefined)
                    return c.default;

                if (r === undefined)
                    return c.default;

                if (Array.isArray(r))
                    return r.map(x => c.parser?.(x) ?? x);

                return c.parser?.(r) ?? r;
            })();

            //

            const wrapper: Types.CommandPositionalArgumentWrapper = {
                ...c,
                value: parsed
            };

            //

            if (wrapper.validation && wrapper.value) {
                if (Array.isArray(wrapper.value)) {
                    for (const v of wrapper.value) {
                        if (!this.validation.isValueValid(v, wrapper.validation))
                            throw new Error(colorette.red(`Invalid value ${JSON.stringify(v)} for argument "${colorette.yellow(c.name)}".\n${colorette.green('Allowed')}: ${Utils.FormatValidationRules(wrapper.validation)}`));
                    }
                }
                else {
                    if (!this.validation.isValueValid(wrapper.value, wrapper.validation))
                        throw new Error(colorette.red(`Invalid value ${JSON.stringify(wrapper.value)} for argument "${colorette.yellow(c.name)}".\n${colorette.green('Allowed')}: ${Utils.FormatValidationRules(wrapper.validation)}`));
                }
            }

            //

            wrappers.push(wrapper);
        }

        //

        return wrappers;
    }

    //

    registerOption(commandName: string, config: Types.CommandOptionConfig) {
        const command = this.getCommand(commandName);

        //

        const cmder_option = new Option(config.flags, config.description);

        if (config.defaultValue !== undefined)
            cmder_option.default(config.defaultValue);

        //

        if (config.validation) {
            if (cmder_option.isBoolean())
                throw new Error(`Option "${config.flags}" is a boolean flag, but validation was provided.`);

            //

            const invalidRule = this.validation.findFirstInvalidRule(config.validation);

            if (invalidRule)
                throw new Error(`Invalid validation rule for option "${config.flags}" ${JSON.stringify(invalidRule)}.`);
        }

        //

        const option: Types.CommandOptionWrapper = {
            ...config,

            cmder_option,
        };

        //

        option.cmder_option.argParser(
            this.createOptionArgParser(command, option)
        );

        //

        if (cmder_option.isBoolean()) {
            this.getLongFlagNames(cmder_option).forEach(longFlag => {
                command.cmder_command.option(`--no-${longFlag}`, "", () => {
                    command.userProvidedOptions.add(option.cmder_option.attributeName());

                    //

                    return false;
                }, false);
            });
        }

        //

        if (option.defaultValue !== undefined) {
            if (Array.isArray(option.defaultValue)) {
                for (const single of option.defaultValue)
                    this.validateOptionAssigne(single, option, true);
            }
            else {
                this.validateOptionAssigne(option.defaultValue, option, true);
            }
        }

        //

        this.enhanceDescription(option);

        //

        const groupName = config.groupName ?? CommanderWrapper.UNGROUPED_GROUP_NAME;

        if (!command.groups[groupName])
            command.groups[groupName] = [];

        command.groups[groupName].push(option);

        //

        command.cmder_command.addOption(cmder_option);
    }

    private createOptionArgParser(command: Types.CommandWrapper, option: Types.CommandOptionWrapper): (raw: string, previous: any[]) => any {
        if (option.cmder_option.isBoolean()) {
            return (raw: string) => {
                command.userProvidedOptions.add(option.cmder_option.attributeName());

                //

                return true;
            };
        }
        else {
            return (raw: string, previous: Types.Value[]) => {
                command.userProvidedOptions.add(option.cmder_option.attributeName());

                //

                const parsed: Types.Value = option.valueParser?.(raw) ?? raw;

                this.validateOptionAssigne(parsed, option, false);

                return option.cmder_option.variadic ? [...previous, parsed] : parsed;
            };
        }
    }

    //

    parse(argv?: string[]) {
        this.cmder_prg.parse(argv || process.argv);
    }

    //

    getUsedCommand() {
        return this.usedCommand;
    }

    getOptions<OBJ extends Record<string, any> = Record<string, any>>(options?: { onlyUserProvided?: boolean; groupName?: string}) {
        const commandName = this.usedCommand;

        if (!commandName)
            throw new Error('No command has been used. Cannot retrieve options.');

        //

        const command = this.getCommand(commandName);
        const opts = command.cmder_command.opts();
        const result: any = {};

        //

        const groups = options?.groupName
            ? { [options.groupName]: command.groups[options.groupName] ?? [] }
            : command.groups;

        //

        for (const groupOptions of Object.values(groups)) {
            for (const option of groupOptions) {
                const optionName = option.cmder_option.attributeName();

                if (!options?.onlyUserProvided || command.userProvidedOptions.has(optionName))
                    result[optionName] = opts[optionName];
            }
        }

        //

        return result as OBJ;
    }

    getCommandArguments<OBJ extends Record<string, any> = Record<string, any>>(): OBJ {
        const command = this.getCommand(this.usedCommand);

        //

        const result: any = {};

        if (command.arguments) {
            for (const arg of command.arguments)
                result[arg.name] = arg.value;
        }

        //

        return result as OBJ;
    }

    //

    hasUserSetOption(commandName: string, optionName: string) {
        return this.getCommand(commandName).userProvidedOptions.has(optionName);
    }

    //

    isOptionValueValid(optionName: string, value: Types.Value) {
        const command = this.getCommand(this.usedCommand);

        for (const groupOptions of Object.values(command.groups)) {
            for (const option of groupOptions) {
                if (option.cmder_option.attributeName() === optionName)
                    return this.validation.isValueValid(value, option.validation);
            }
        }

        //

        throw new Error(`Option "${optionName}" not found in command "${this.usedCommand}".`);
    }

    isValueValid(value: Types.Value, validations: Types.ValidationRule[]) {
        return this.validation.isValueValid(value, validations);
    }

    //

    private getCommand(commandName: string) {
        const command = this.commands.get(commandName);

        if (!command)
            throw new Error(`Command "${commandName}" not found.`);

        return command;
    }

    //

    private getLongFlagNames(option: Option) {
        const matches = Array.from(option.flags.matchAll(/--([a-zA-Z0-9-]+)/g));
        return matches.map(match => match[1]);
    }

    private validateOptionAssigne(value: Types.Value, option: Types.CommandOptionWrapper, isDefault: boolean) {
        const isValid = this.validation.isValueValid(value, option.validation);

        if (!isValid) {
            const source = isDefault ? 'Default value' : 'Passed in value';
            const allowed = Utils.FormatValidationRules(option.validation!);

            throw new Error(colorette.red(`${source} ${JSON.stringify(value)} for option "${colorette.yellow(option.cmder_option.attributeName())}" is not allowed.\n${colorette.green('Allowed')}: ${allowed}`));
        }
    }

    //

    private enhanceDescription(option: Types.CommandOptionWrapper) {
        const parts: string[] = [];

        //

        parts.push(option.description);

        //

        if (option.defaultValue !== undefined)
            parts.push(`(${colorette.green('Default')}: ${colorette.yellow(JSON.stringify(option.defaultValue))})`);

        if (option.cmder_option.isBoolean()) {
            const longFlagNames = this.getLongFlagNames(option.cmder_option);

            if (longFlagNames.length > 0) {
                const flags = longFlagNames.map(name => colorette.cyan(`--no-${name}`)).join(', ');
                parts.push(`(${colorette.green('Tip')}: Use ${flags} to explicitly set false)`);
            }
        }

        if (option.validation && option.validation.length > 0) {
            const allowed = Utils.FormatValidationRules(option.validation);
            parts.push(`(${colorette.green('Allowed')}: ${colorette.yellow(allowed)})`);
        }

        //

        option.description = parts.filter(Boolean).join(' ');
    }
}