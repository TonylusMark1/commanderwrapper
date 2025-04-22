import CommanderWrapper from '../src/index.js';

// Create a new instance of the CLI
const cli = new CommanderWrapper();

// Register a command called "greet"
cli.registerCommand(
	{
		name: 'greet',
		description: 'Greet a user with a custom message',
		strictMode: true,
		arguments: [
			{
				name: 'name',
				required: false,
				default: "Someone",
				parser: String,
				validation: [/^[a-zA-Z0-9]+$/]
			}
		]
	},
	(registerOption) => {
		// Register options for the "greet" command
		registerOption({
			groupName: 'Greeting',
			flags: '-t, --times <number>',
			description: 'Number of times to repeat the greeting',
			defaultValue: 1,
			valueParser: (value) => parseInt(value, 10),
			validation: [1, 2, 3, 4, 5]
		});

		registerOption({
			groupName: 'Greeting',
			flags: '-u, --uppercase',
			description: 'Print the greeting in uppercase letters'
		});
	}
);

// Parse the CLI arguments
cli.parse();

// Retrieve the parsed arguments and options
const args = cli.getCommandArguments<{ name: string }>();
const options = cli.getOptions<{ times: number; uppercase: boolean }>();

// Generate the greeting message
let message = `Hello, ${args.name}!`;
if (options.uppercase) {
	message = message.toUpperCase();
}

// Repeat the message based on the --times option
for (let i = 0; i < options.times; i++) {
	console.log(message);
}
