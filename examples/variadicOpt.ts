import CommanderWrapper from '../src/index.js';

// Create a new instance of the CLI
const cli = new CommanderWrapper();

// Register a default command for greeting multiple users
cli.registerCommand(
    {
        name: 'greet',
        description: 'Greet multiple users',
        strictMode: true,
        isDefault: true
    },
    (registerOption) => {
        // Register the --names option to accept multiple values
        registerOption({
            groupName: 'Greeting',
            flags: '-n, --names <names...>',
            description: 'Names to greet',
            defaultValue: [],
            valueParser: (value: string) => value,
            validation: [/^[a-zA-Z]+$/]
        });
    }
);

// Parse the CLI arguments

cli.parse();

// Retrieve the parsed options
const options = cli.getOptions<{ names: string[] }>();
const names = options.names.length > 0 ? options.names : ['Someone'];

// Greet each name
names.forEach(name => {
    console.log(`Hello, ${name}!`);
});