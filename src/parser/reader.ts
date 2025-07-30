import * as path from "node:path";
import { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import * as yaml from "js-yaml";

export interface FileContent {
	readonly filePath: string;
	readonly content: unknown;
	readonly format: "json" | "yaml";
}

const isJsonFormat = (filePath: string): boolean => {
	const ext = path.extname(filePath).toLowerCase();
	return ext === ".json";
};

const isYamlFormat = (filePath: string): boolean => {
	const ext = path.extname(filePath).toLowerCase();
	return ext === ".yaml" || ext === ".yml";
};

const parseJsonContent = (content: string, filePath: string) =>
	Effect.try({
		try: () => JSON.parse(content),
		catch: (error) =>
			new Error(
				`Failed to parse JSON file '${filePath}': ${error instanceof Error ? error.message : String(error)}`,
			),
	});

const parseYamlContent = (content: string, filePath: string) =>
	Effect.try({
		try: () => yaml.load(content, { schema: yaml.SAFE_SCHEMA }),
		catch: (error) =>
			new Error(
				`Failed to parse YAML file '${filePath}': ${error instanceof Error ? error.message : String(error)}`,
			),
	});

/**
 * Reads and parses an OpenAPI specification file from the filesystem.
 * Supports both JSON (.json) and YAML (.yaml, .yml) formats.
 *
 * @param filePath - Path to the OpenAPI specification file
 * @returns Effect that yields the parsed file content
 */
export const readOpenApiFile = (
	filePath: string,
): Effect.Effect<FileContent, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		// Validate file exists
		const exists = yield* fs.exists(filePath);
		if (!exists) {
			yield* Effect.fail(new Error(`OpenAPI file does not exist: ${filePath}`));
		}

		// Validate file format
		if (!isJsonFormat(filePath) && !isYamlFormat(filePath)) {
			yield* Effect.fail(
				new Error(
					`Unsupported file format. Expected .json, .yaml, or .yml, got: ${path.extname(filePath)}`,
				),
			);
		}

		// Read file content
		const fileContent = yield* fs.readFileString(filePath);

		// Parse based on file extension
		const parsedContent = isJsonFormat(filePath)
			? yield* parseJsonContent(fileContent, filePath)
			: yield* parseYamlContent(fileContent, filePath);

		// Determine format
		const format: "json" | "yaml" = isJsonFormat(filePath) ? "json" : "yaml";

		return {
			filePath,
			content: parsedContent,
			format,
		} as const;
	});

/**
 * Reads multiple OpenAPI specification files concurrently.
 *
 * @param filePaths - Array of paths to OpenAPI specification files
 * @returns Effect that yields an array of parsed file contents
 */
export const readOpenApiFiles = (
	filePaths: readonly string[],
): Effect.Effect<readonly FileContent[], Error, FileSystem.FileSystem> =>
	Effect.all(filePaths.map(readOpenApiFile), { concurrency: "unbounded" });

/**
 * Type guard to check if content is a valid object (not null, array, or primitive)
 *
 * @param content - Content to check
 * @returns true if content is a valid object
 */
export const isValidObjectContent = (
	content: unknown,
): content is Record<string, unknown> =>
	typeof content === "object" && content !== null && !Array.isArray(content);

/**
 * Validates that the parsed content is a valid object structure expected for OpenAPI specs.
 *
 * @param fileContent - The parsed file content
 * @returns Effect that yields the validated content or fails with an error
 */
export const validateObjectStructure = (
	fileContent: FileContent,
): Effect.Effect<FileContent, Error> =>
	Effect.gen(function* () {
		if (!isValidObjectContent(fileContent.content)) {
			yield* Effect.fail(
				new Error(
					`Invalid OpenAPI file structure. Expected object, got ${typeof fileContent.content} in file: ${fileContent.filePath}`,
				),
			);
		}

		return fileContent;
	});

/**
 * Complete file reading pipeline that reads, parses, and validates the basic structure.
 *
 * @param filePath - Path to the OpenAPI specification file
 * @returns Effect that yields validated file content
 */
export const readAndValidateOpenApiFile = (
	filePath: string,
): Effect.Effect<FileContent, Error, FileSystem.FileSystem> =>
	readOpenApiFile(filePath).pipe(Effect.flatMap(validateObjectStructure));
