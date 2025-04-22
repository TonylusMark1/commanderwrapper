# CommanderWrapper

Simple wrapper for Commander.js — with grouping options, rich help and validation.

---

## 📦 Installation

```bash
npm install commanderwrapper
```

## 🚀 Features

- 📋 Typed options & arguments
- 🎨 Custom groups
- ✅ Validation with values, RegExp, or custom pattern objects
- 🧩 Scoped option registration
- 🖍️ Rich help text generation with grouping and hints
- 🧩 `getOptions()` — per group/only user-provided
- 🎯 `getCommandArguments()` — retrieve parsed positional arguments
- 🧪 `isOptionValueValid()` — check if value fits validation

## 🛠️ Usage

```ts
import CommanderWrapper from 'commanderwrapper';

const cli = new CommanderWrapper();

cli.registerCommand({
  name: 'serve',
  description: 'Start the server',
  strictMode: true,
  arguments: [
    { name: 'port', required: true, parser: Number, validation: [3000, 8080] }
  ]
}, (registerOption) => {
  registerOption({
    groupName: 'General',
    flags: '-h, --host <host>',
    description: 'Hostname',
    defaultValue: 'localhost'
  });

  registerOption({
    groupName: 'General',
    flags: '--secure',
    description: 'Enable HTTPS'
  });
});

cli.parse();

const args = cli.getCommandArguments();
const options = cli.getOptions();

console.log({ args, options });
```

## 🎨 Help Text Example

```
Available Commands:
  serve
    Start the server

(for detailed options, use <command> --help)
```

## 🔍 API Reference

### `registerCommand(config, setup?)`

Define a command with description, args, and scoped options.

### `registerOption(config)`

Register an option scoped to the current command.

### `parse(argv?)`

Parse process arguments.

### `getOptions(opts?)`

Retrieve parsed options with optional filtering.

### `getCommandArguments()`

Retrieve parsed arguments.

### `isOptionValueValid(name, value)`

Check if value passes option's validation.

## 📄 License

ISC © [tonylus](https://github.com/TonylusMark1)
