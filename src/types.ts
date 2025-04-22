import { Command as CmderCommand, Option as CmderOption } from 'commander';

//

export type Value = string | number | boolean | bigint;

export type ValidationRule = (
    Value |
    RegExp |
    { pattern: RegExp; description: string } |
    { callback: (value: Value) => boolean; description: string }
);

//

export interface RegisterCommand {
    name: string;
    description?: string;

    strictMode?: boolean;
    isDefault?: boolean;
    arguments?: CommandPositionalArgumentConfig[];
}

export interface CommandPositionalArgumentConfig {
    name: string;
    required?: boolean;
    variadic?: boolean;
    default?: Value | Value[];

    parser?: (value: string) => Value;

    validation?: ValidationRule[];
}

export interface CommandWrapper {
    cmder_command: CmderCommand;

    groups: {
        [groupName: string]: CommandOptionWrapper[]
    };

    userProvidedOptions: Set<string>;

    arguments?: CommandPositionalArgumentWrapper[];
}

export interface CommandPositionalArgumentWrapper extends CommandPositionalArgumentConfig {
    value?: Value | Value[];
}

//

export interface CommandOptionConfig {
    groupName?: string;

    flags: string;
    description: string;
    defaultValue?: Value | Value[];

    valueParser?: (value: string) => Value;

    validation?: ValidationRule[];
}

export interface CommandOptionWrapper extends CommandOptionConfig {
    cmder_option: CmderOption;
}

//

export type ScopedRegisterOptionCallback = (cfg: CommandOptionConfig) => void;