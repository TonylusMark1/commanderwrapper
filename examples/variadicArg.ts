import CommanderWrapper from '../src/index.js';

// Create a new instance of the CLI
const cli = new CommanderWrapper();

// Register a default command accepting variadic positional arguments
cli.registerCommand({
    name: 'greet',
    description: 'Greet multiple users with positional arguments',
    strictMode: true,
    isDefault: true,
    arguments: [
        {
            name: 'names',
            required: false,
            variadic: true,
            default: ['Someone'],
            parser: (v: string) => v,
            validation: [/^[a-zA-Z]+$/]
        }
    ]
});

// Parse the CLI arguments
cli.parse();

// Retrieve the parsed positional arguments
const args = cli.getCommandArguments<{ names: string[] }>();
const names = args.names;

// Greet each name
names.forEach(name => {
    console.log(`Hello, ${name}!`);
});