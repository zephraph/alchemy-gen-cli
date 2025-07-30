import * as os from "node:os";
import * as path from "node:path";
import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Schema } from "@effect/schema";
import { Console, Effect, Either, Option as O } from "effect";

// Configuration file schema
const AlchemyConfigSchema = Schema.Struct({
	input: Schema.optional(Schema.String),
	output: Schema.optional(Schema.String),
	verbose: Schema.optional(Schema.Boolean),
});

type AlchemyConfig = Schema.Schema.Type<typeof AlchemyConfigSchema>;

// Load configuration from .alchemyrc file
const loadConfig = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem;

	// Try to find .alchemyrc in current directory first, then home directory
	const configPaths = [
		path.join(process.cwd(), ".alchemyrc"),
		path.join(os.homedir(), ".alchemyrc"),
	];

	for (const configPath of configPaths) {
		const exists = yield* fs.exists(configPath);
		if (exists) {
			const parseResult = yield* fs.readFileString(configPath).pipe(
				Effect.flatMap((content) =>
					Effect.try({
						try: () => JSON.parse(content),
						catch: (error) => error,
					}),
				),
				Effect.flatMap((rawConfig) =>
					Schema.decodeUnknown(AlchemyConfigSchema)(rawConfig),
				),
				Effect.either,
			);

			if (Either.isRight(parseResult)) {
				return O.some(parseResult.right);
			} else {
				yield* Console.log(
					`Warning: Failed to parse config file ${configPath}: ${parseResult.left}`,
				);
			}
		}
	}

	return O.none();
});

// Define CLI options (now optional to allow config file defaults)
const inputOption = Options.file("input")
	.pipe(Options.withAlias("i"))
	.pipe(
		Options.withDescription(
			"Path to the OpenAPI specification file (JSON or YAML format). Supports OpenAPI 3.x specifications. Can be set in .alchemyrc config file.",
		),
	)
	.pipe(Options.optional);

const outputOption = Options.directory("output")
	.pipe(Options.withAlias("o"))
	.pipe(
		Options.withDescription(
			"Output directory for generated Effect Platform HttpApi code. Directory will be created if it doesn't exist. Can be set in .alchemyrc config file.",
		),
	)
	.pipe(Options.optional);

const verboseOption = Options.boolean("verbose")
	.pipe(Options.withAlias("v"))
	.pipe(
		Options.withDescription(
			"Enable verbose logging output to see detailed processing information. Can be set in .alchemyrc config file.",
		),
	);

// Validation functions
const validateInputFile = (filePath: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		// Check if file exists
		const exists = yield* fs.exists(filePath);
		if (!exists) {
			yield* Effect.fail(new Error(`Input file does not exist: ${filePath}`));
		}

		// Check file extension for OpenAPI spec format
		const ext = path.extname(filePath).toLowerCase();
		if (!ext.match(/\.(json|yaml|yml)$/)) {
			yield* Effect.fail(
				new Error(
					`Invalid file format: ${ext}. Expected .json, .yaml, or .yml`,
				),
			);
		}

		return filePath;
	});

const validateOutputDirectory = (dirPath: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		// Try to create the directory if it doesn't exist
		yield* fs.makeDirectory(dirPath, { recursive: true });

		// Verify we can write to the directory
		const stats = yield* fs.stat(dirPath);
		if (stats.type !== "Directory") {
			yield* Effect.fail(
				new Error(`Output path exists but is not a directory: ${dirPath}`),
			);
		}

		return dirPath;
	});

// Define the generate command handler
const generateHandler = ({
	input,
	output,
	verbose,
}: {
	input: O.Option<string>;
	output: O.Option<string>;
	verbose: boolean;
}) =>
	Effect.gen(function* () {
		// Load configuration file
		const configOption = yield* loadConfig;
		const config = O.getOrElse(configOption, () => ({}) as AlchemyConfig);

		// Apply configuration defaults and validate required options
		const inputFromOption = O.getOrElse(input, () => undefined);
		const outputFromOption = O.getOrElse(output, () => undefined);
		const finalInput = inputFromOption || config.input;
		const finalOutput = outputFromOption || config.output;
		const finalVerbose = verbose || config.verbose || false;

		if (!finalInput) {
			yield* Effect.fail(
				new Error(
					"Input file is required. Provide --input option or set 'input' in .alchemyrc",
				),
			);
		}

		if (!finalOutput) {
			yield* Effect.fail(
				new Error(
					"Output directory is required. Provide --output option or set 'output' in .alchemyrc",
				),
			);
		}

		if (finalVerbose) {
			if (O.isSome(configOption)) {
				yield* Console.log("✓ Configuration loaded from .alchemyrc");
			}
			yield* Console.log(`Processing OpenAPI spec: ${finalInput}`);
			yield* Console.log(`Output directory: ${finalOutput}`);
		}

		// Validate input file (we know finalInput is defined due to check above)
		yield* validateInputFile(finalInput as string);
		if (finalVerbose) {
			yield* Console.log(`✓ Input file validated: ${finalInput}`);
		}

		// Validate and create output directory (we know finalOutput is defined due to check above)
		yield* validateOutputDirectory(finalOutput as string);
		if (finalVerbose) {
			yield* Console.log(`✓ Output directory validated: ${finalOutput}`);
		}

		yield* Console.log("🚀 Starting alchemy-gen generation...");

		// TODO: Implement the actual generation logic
		yield* Console.log(
			"⚠️  Generation logic not yet implemented - this is a CLI framework placeholder",
		);

		yield* Console.log("✅ Generation completed successfully!");
	});

// Define the generate command
const generateCommand = Command.make(
	"generate",
	{
		input: inputOption,
		output: outputOption,
		verbose: verboseOption,
	},
	generateHandler,
).pipe(
	Command.withDescription(
		"Generate Effect Platform HttpApi code from OpenAPI specifications",
	),
);

// Create the CLI application
const cli = Command.run(generateCommand, {
	name: "alchemy-gen",
	version: "0.1.0",
});

// Main entry point
export const main = cli(process.argv).pipe(Effect.provide(NodeContext.layer));

// Run the application when this file is executed directly
if (
	process.argv[1]?.endsWith("index.ts") ||
	process.argv[1]?.endsWith("index.js")
) {
	NodeRuntime.runMain(main);
}
