import { Command, Option } from 'commander';
import * as colorette from 'colorette';

import type * as Types from "./types.js";

import * as Utils from "./Utils.js";
import HelpGen from "./HelpGen.js";
import Validation from "./Validation.js";

//

export type { ValidationRule, OptionConfig, CommandPositionalArgument as CommandArgument, RegisterOption as RegisterOptionMeta, ScopedRegisterOptionCallback } from "./types.js";

//

export default class CommanderWrapper {
    static readonly UNGROUPED_GROUP_NAME = 'ungrouped';

    //

    private helpGen = new HelpGen(this as any);
    private validation = new Validation(this as any);

    private cmderPrg = new Command();

    private commands: Map<string, Types.RegisteredCommand> = new Map();

    private usedCommand: string = null as any;

    //

    constructor() {
    }

    //

    registerCommand(
        commandName: string,
        description: string,
        opts?: Types.RegisterCommand,
        setup?: (registerOption: Types.ScopedRegisterOptionCallback) => void
    ) {
        if (opts?.arguments) {
            for (const arg of opts?.arguments) {
                if (arg.validation && !this.validation.isValueValid(arg.default, arg.validation)) {
                    const allowed = Utils.FormatValidationRules(arg.validation);
                    throw new Error(colorette.red(`Invalid default value for argument "${colorette.yellow(arg.name)}".\n${colorette.green('Allowed')}: ${allowed}`));
                }
            }
        }

        //

        const command = this.obtainCommand(commandName, opts?.isDefault ?? false, opts?.arguments);

        command.commander
            .description(description)
            .action((...args: any[]) => {
                this.usedCommand = commandName;

                this.processCommandArguments(command, args);
            });

        command.commander.allowUnknownOption(!(opts?.strictMode ?? true));

        if (setup) {
            const scopedRegisterOption: Types.ScopedRegisterOptionCallback = <T>(meta: Types.RegisterOption, config: Types.OptionConfig<T>) => {
                this.registerOption(commandName, meta, config);
            };

            setup(scopedRegisterOption);
        }
    }

    private processCommandArguments(command: Types.RegisteredCommand, args: any[]): void {
        const parsedArgs: { config: Types.CommandPositionalArgument; value: any }[] = [];

        for (let i = 0; i < command.arguments.length; i++) {
            const argConfig = command.arguments[i].config;
            let rawValue = args[i];

            if (argConfig.required && rawValue === undefined)
                throw new Error(colorette.red(`Missing required argument: ${colorette.yellow(argConfig.name)}`));

            rawValue = rawValue ?? command.arguments[i].config.default;

            if (rawValue !== undefined) {
                const parsedValue = argConfig.parser ? argConfig.parser(rawValue) : rawValue;

                if (argConfig.validation && !this.validation.isValueValid(parsedValue, argConfig.validation)) {
                    const allowed = Utils.FormatValidationRules(argConfig.validation);
                    throw new Error(colorette.red(`Invalid value for argument "${colorette.yellow(argConfig.name)}".\n${colorette.green('Allowed')}: ${allowed}`));
                }

                parsedArgs.push({ config: argConfig, value: parsedValue });
            }
            else {
                parsedArgs.push({ config: argConfig, value: undefined });
            }
        }

        command.arguments = parsedArgs;
    }

    //

    registerOption<T>(commandName: string, meta: Types.RegisterOption, config: Types.OptionConfig<T>) {
        const command = this.getCommand(commandName);

        //

        const groupName = meta.groupName ?? CommanderWrapper.UNGROUPED_GROUP_NAME;
        const tags = meta.tags ?? [];

        //

        const commanderOption = new Option(config.flags, config.description);

        if (config.defaultValue !== undefined) {
            commanderOption.default(config.defaultValue);
        }

        //

        if (config.validation) {
            if (commanderOption.isBoolean())
                throw new Error(`Option "${config.flags}" is a boolean flag, but validation was provided.`);

            //

            const invalidRule = this.validation.findFirstInvalidRule(config.validation);

            if (invalidRule)
                throw new Error(`Invalid validation rule for option "${config.flags}" ${JSON.stringify(invalidRule)}.`);
        }

        //

        const option: Types.RegisteredOption<T> = {
            ...config,

            commanderOption,

            groupName,
            tags
        };

        //

        const parserCallback = this.createOptionArgParser(command, option);
        commanderOption.argParser(parserCallback);

        //

        if (commanderOption.isBoolean()) {
            this.getLongFlagNames(commanderOption).forEach(longFlag => {
                command.commander.option(`--no-${longFlag}`, "", () => {
                    command.userProvidedOptions.add(option.commanderOption.attributeName());
                    return false;
                }, false);
            });
        }

        //

        if (option.defaultValue !== undefined)
            this.validateOptionValue(option.defaultValue, option, true);

        //

        this.enhanceDescription(option);

        //

        if (!command.groups[groupName])
            command.groups[groupName] = [];

        command.groups[groupName].push(option);

        //

        command.commander.addOption(commanderOption);
    }

    private createOptionArgParser<T>(command: Types.RegisteredCommand, option: Types.RegisteredOption<T>): (value: any) => any {
        if (option.commanderOption.isBoolean()) {
            return (value: any) => {
                command.userProvidedOptions.add(option.commanderOption.attributeName());
                return true;
            };
        } else {
            return (value: any) => {
                command.userProvidedOptions.add(option.commanderOption.attributeName());

                const parsedValue = option.valueParser ? option.valueParser(value) : value;

                this.validateOptionValue(parsedValue, option, false);

                if (option.onValidate)
                    option.onValidate(parsedValue);

                return parsedValue;
            };
        }
    }

    //

    parse(argv?: string[]) {
        this.cmderPrg.helpInformation = () => this.helpGen.generateGlobalHelpText();
        this.cmderPrg.parse(argv || process.argv);
    }

    //

    getUsedCommand() {
        return this.usedCommand;
    }

    getOptions<OBJ extends Record<string, any> = Record<string, any>>(options?: { onlyUserProvided?: boolean; groupName?: string; tags?: string[] }) {
        const commandName = this.usedCommand;

        if (!commandName)
            throw new Error('No command has been used. Cannot retrieve options.');

        //

        const command = this.getCommand(commandName);
        const opts = command.commander.opts();
        const result: any = {};

        //

        const groups = options?.groupName
            ? { [options.groupName]: command.groups[options.groupName] ?? [] }
            : command.groups;

        //

        for (const groupOptions of Object.values(groups)) {
            for (const option of groupOptions) {
                const hasAllTags = options?.tags ? options.tags.every(tag => option.tags.includes(tag)) : true;

                if (!hasAllTags)
                    continue;

                const optionName = option.commanderOption.attributeName();

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

        for (const arg of command.arguments)
            result[arg.config.name] = arg.value;

        //

        return result as OBJ;
    }

    //

    hasUserSetOption(commandName: string, optionName: string) {
        const command = this.getCommand(commandName);
        return command.userProvidedOptions.has(optionName);
    }

    isOptionValueValid<T>(optionName: string, value: T): boolean | undefined;
    isOptionValueValid<T>(optionName: string, value: T, ignoreAbsence: false): boolean;
    isOptionValueValid<T>(optionName: string, value: T, ignoreAbsence: true): boolean | undefined;
    isOptionValueValid<T>(optionName: string, value: T, ignoreAbsence: boolean = true): boolean | undefined {
        const command = this.getCommand(this.usedCommand);

        for (const groupOptions of Object.values(command.groups)) {
            for (const option of groupOptions) {
                if (option.commanderOption.attributeName() === optionName)
                    return this.validation.isValueValid(value, option.validation);
            }
        }

        if (!ignoreAbsence)
            throw new Error(`Option "${optionName}" not found in command "${this.usedCommand}".`);
    }

    //

    private getCommand(commandName: string) {
        const command = this.commands.get(commandName);

        if (!command)
            throw new Error(`Command "${commandName}" not found.`);

        return command;
    }

    private obtainCommand(commandName: string, isDefault: boolean = false, commandArgs: Types.CommandPositionalArgument[] = []) {
        let meta: Types.RegisteredCommand | undefined = this.commands.get(commandName)

        if (meta)
            return meta;

        //

        const argString = commandArgs
            .map(arg => arg.required ? `<${arg.name}>` : `[${arg.name}]`)
            .join(' ');

        //

        const cmd_nameAndArgs = argString ? `${commandName} ${argString}` : commandName;
        const cmd_opts = { isDefault };

        const commander = this.cmderPrg.command(cmd_nameAndArgs, cmd_opts);

        meta = {
            commander,
            groups: {},
            userProvidedOptions: new Set(),
            arguments: commandArgs.map(arg => ({ config: arg, value: undefined })),
        };

        //

        commander.helpInformation = () => this.helpGen.generateHelpTextForCommand(commandName);

        //

        this.commands.set(commandName, meta);

        //

        return meta;
    }

    //

    private getLongFlagNames(option: Option) {
        const matches = Array.from(option.flags.matchAll(/--([a-zA-Z0-9-]+)/g));
        return matches.map(match => match[1]);
    }

    private validateOptionValue<T>(value: T, option: Types.RegisteredOption<T>, isDefault: boolean) {
        const isValid = this.validation.isValueValid(value, option.validation);

        if (!isValid) {
            const source = isDefault ? 'Default value' : 'Invalid value';
            const allowed = Utils.FormatValidationRules(option.validation!);

            throw new Error(colorette.red(`${source} for option "${colorette.yellow(option.commanderOption.attributeName())}" is not allowed.\n${colorette.green('Allowed')}: ${allowed}`));
        }
    }

    //

    private enhanceDescription<T>(option: Types.RegisteredOption<T>) {
        const parts: string[] = [];

        //

        parts.push(option.description);

        //

        if (option.defaultValue !== undefined)
            parts.push(`(${colorette.green('Default')}: ${colorette.yellow(JSON.stringify(option.defaultValue))})`);

        if (option.commanderOption.isBoolean()) {
            const longFlagNames = this.getLongFlagNames(option.commanderOption);

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