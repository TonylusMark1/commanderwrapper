import { Command, Option } from 'commander';

//

export type ValidationRule<T> =
    | (T extends any[] ? never : T)
    | RegExp
    | { pattern: RegExp; description: string };

//

export interface OptionConfig<T> {
    flags: string;
    description: string;
    defaultValue?: T;
    validation?: ValidationRule<T>[];

    onValidate?: (value: T) => void;
    valueParser?: (value: string) => any;
}

export interface RegisterOption {
    groupName?: string;
    tags?: string[];
}

export interface RegisteredOption<T> extends OptionConfig<T>, Required<RegisterOption> {
    commanderOption: Option;
}

//

export interface RegisterCommand {
    strictMode?: boolean;
    isDefault?: boolean;
    arguments?: CommandPositionalArgument[];
}

export interface CommandPositionalArgument<T extends any = any> {
    name: string;
    required?: boolean;
    default?: T;
    parser?: (value: string) => T;
    validation?: ValidationRule<any>[];
}

export interface CommandGroup {
    [groupName: string]: RegisteredOption<any>[];
}

export interface RegisteredCommand {
    commander: Command;
    groups: CommandGroup;
    userProvidedOptions: Set<string>;
    arguments: CommandMetaArgument[];
}

export interface CommandMetaArgument<T extends any = any> {
    config: CommandPositionalArgument<T>;
    value: T;
}

//

export type ScopedRegisterOptionCallback = <T>(regOpt: RegisterOption, config: OptionConfig<T>) => void;