
# CommanderWrapper

Simple wrapper for Commander.js — with grouped/tagged options, rich help and validation.

---

## 📦 Installation

```bash
npm install commanderwrapper
```

## 🚀 Features

- 📋 Typed options & arguments
- 🎨 Custom groups and tags
- ✅ Validation with values, RegExp, or custom pattern objects
- 🧩 Scoped option registration
- 🖍️ Rich help text generation with grouping and hints
- 🧩 `getOptions()` — per group/tags/only user-provided
- 🎯 `getCommandArguments()` — retrieve parsed arguments
- 🧪 `isOptionValueValid()` — check if value fits validation

## 🛠️ Usage

```ts
import CommanderWrapper from 'commanderwrapper';

const cli = new CommanderWrapper();

cli.registerCommand('serve', 'Start the server', {
  strictMode: true,
  arguments: [
    { name: 'port', required: true, parser: Number, validation: [3000, 8080] }
  ]
}, (registerOption) => {
  registerOption({ groupName: 'General' }, {
    flags: '-h, --host <host>',
    description: 'Hostname',
    defaultValue: 'localhost',
  });

  registerOption({ groupName: 'General', tags: ['network'] }, {
    flags: '--secure',
    description: 'Enable HTTPS',
  });
});

cli.parse();

const args = cli.getCommandArguments();
const options = cli.getOptions();

console.log({ args, options });
```

## 🎨 Help Text Example

Automatically generates global and command-specific help:

```
Available Commands:

  serve
    Start the server

Tip: For detailed options, use <command> --help
```

For command-specific help:
```
Arguments:

  port (required)

Options for command: serve

General:

  -h, --host <host>     Hostname (Default: "localhost")
  --secure              Enable HTTPS
```

## 🔍 API Reference

### `registerCommand(commandName, description, options?, setup?)`

Define a command with description and options.

| Param | Type | Description |
|-------|------|-------------|
| `commandName` | `string` | Name of the command |
| `description` | `string` | Description of the command |
| `options` | `RegisterCommandOptions` | Additional command options |
| `setup` | `(registerOption) => void` | Callback to register options scoped to this command |

### `registerOption(meta, config)`

Register an option for the active command.

| Param | Type | Description |
|-------|------|-------------|
| `meta` | `RegisterOptionMeta` | Grouping & tags |
| `config` | `OptionConfig<T>` | Option configuration |

### `parse(argv?)`

Parse process arguments.

### `getOptions()`

Retrieve parsed options.

### `getCommandArguments()`

Retrieve parsed arguments.

### `isOptionValueValid(optionName, value)`

Validate an option value.

## 🔧 Types

You have full types support:
- `OptionConfig<T>`
- `RegisterOptionMeta`
- `ValidationRule<T>`
- `CommandArgument`

## 📄 License

ISC © [tonylus](https://github.com/TonylusMark1)
