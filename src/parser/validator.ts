import { type ParseResult, Schema } from "@effect/schema";
import { Effect } from "effect";
import {
	type OpenApiDocument,
	OpenApiDocumentSchema,
} from "../types/openapi.js";
import type { FileContent } from "./reader.js";

export interface ValidationResult {
	readonly isValid: boolean;
	readonly document?: OpenApiDocument | undefined;
	readonly errors: readonly ValidationError[];
}

export interface ValidationError {
	readonly path: string;
	readonly message: string;
	readonly value?: unknown;
}

/**
 * Formats ParseResult.ParseError into readable ValidationError objects
 */
const formatParseErrors = (
	error: ParseResult.ParseError,
): readonly ValidationError[] => {
	// Simplified error formatting - we'll extract the main error message
	return [
		{
			path: "schema",
			message: error.message || "Schema validation failed",
			value: undefined,
		},
	];
};

/**
 * Validates OpenAPI version compatibility
 */
export const validateOpenApiVersion = (
	document: unknown,
): Effect.Effect<void, ValidationError> =>
	Effect.gen(function* () {
		if (typeof document !== "object" || document === null) {
			yield* Effect.fail({
				path: "root",
				message: "Document must be an object",
				value: document,
			});
		}

		const doc = document as Record<string, unknown>;
		const version = doc.openapi;

		if (typeof version !== "string") {
			yield* Effect.fail({
				path: "openapi",
				message: "Missing or invalid OpenAPI version field",
				value: version,
			});
		}

		// Check if version starts with "3." (supports 3.0.x and 3.1.x)
		if (!(version as string).startsWith("3.")) {
			yield* Effect.fail({
				path: "openapi",
				message: `Unsupported OpenAPI version: ${version}. Only OpenAPI 3.x is supported.`,
				value: version,
			});
		}
	});

/**
 * Validates basic OpenAPI document structure requirements
 */
const validateBasicStructure = (
	document: unknown,
): Effect.Effect<void, ValidationError> =>
	Effect.gen(function* () {
		if (typeof document !== "object" || document === null) {
			yield* Effect.fail({
				path: "root",
				message: "OpenAPI document must be an object",
				value: document,
			});
		}

		const doc = document as Record<string, unknown>;

		// Check required top-level fields
		if (!doc.info || typeof doc.info !== "object") {
			yield* Effect.fail({
				path: "info",
				message: "Missing or invalid 'info' object",
				value: doc.info,
			});
		}

		// Validate info object has required fields
		const info = doc.info as Record<string, unknown>;
		if (typeof info.title !== "string") {
			yield* Effect.fail({
				path: "info.title",
				message: "Missing or invalid 'title' in info object",
				value: info.title,
			});
		}

		if (typeof info.version !== "string") {
			yield* Effect.fail({
				path: "info.version",
				message: "Missing or invalid 'version' in info object",
				value: info.version,
			});
		}

		// Check for required paths field
		if (!doc.paths || typeof doc.paths !== "object") {
			yield* Effect.fail({
				path: "paths",
				message: "Missing or invalid 'paths' object",
				value: doc.paths,
			});
		}
	});

/**
 * Validates an OpenAPI document against the schema and basic requirements
 */
export const validateOpenApiDocument = (
	fileContent: FileContent,
): Effect.Effect<ValidationResult, never> =>
	Effect.gen(function* () {
		const document = fileContent.content;
		const errors: ValidationError[] = [];

		// Basic structure validation
		const basicStructureResult = yield* validateBasicStructure(document).pipe(
			Effect.either,
		);
		if (basicStructureResult._tag === "Left") {
			errors.push(basicStructureResult.left);
		}

		// OpenAPI version validation
		const versionResult = yield* validateOpenApiVersion(document).pipe(
			Effect.either,
		);
		if (versionResult._tag === "Left") {
			errors.push(versionResult.left);
		}

		// If basic validation failed, return early
		if (errors.length > 0) {
			return {
				isValid: false,
				errors,
			};
		}

		// Schema validation using Effect Schema
		const schemaResult = yield* Schema.decodeUnknown(OpenApiDocumentSchema)(
			document,
		).pipe(Effect.either);

		if (schemaResult._tag === "Left") {
			const parseErrors = formatParseErrors(schemaResult.left);
			errors.push(...parseErrors);
		}

		const finalResult: ValidationResult = {
			isValid: errors.length === 0,
			document: schemaResult._tag === "Right" ? schemaResult.right : undefined,
			errors,
		};

		return finalResult;
	});

/**
 * Validates multiple OpenAPI documents
 */
export const validateOpenApiDocuments = (
	fileContents: readonly FileContent[],
): Effect.Effect<readonly ValidationResult[], never> =>
	Effect.all(fileContents.map(validateOpenApiDocument), {
		concurrency: "unbounded",
	});

/**
 * Creates a comprehensive validation report
 */
export const createValidationReport = (
	results: readonly ValidationResult[],
	filePaths: readonly string[],
): string => {
	const lines: string[] = [];

	lines.push("OpenAPI Validation Report");
	lines.push("=".repeat(25));
	lines.push("");

	const totalFiles = results.length;
	const validFiles = results.filter((r) => r.isValid).length;
	const invalidFiles = totalFiles - validFiles;

	lines.push(`Total files: ${totalFiles}`);
	lines.push(`Valid files: ${validFiles}`);
	lines.push(`Invalid files: ${invalidFiles}`);
	lines.push("");

	results.forEach((result, index) => {
		const filePath = filePaths[index] || `File ${index + 1}`;

		if (result.isValid) {
			lines.push(`✅ ${filePath}: Valid`);
		} else {
			lines.push(
				`❌ ${filePath}: Invalid (${result.errors.length} error${result.errors.length === 1 ? "" : "s"})`,
			);

			result.errors.forEach((error) => {
				lines.push(`   Path: ${error.path}`);
				lines.push(`   Error: ${error.message}`);
				if (error.value !== undefined) {
					lines.push(`   Value: ${JSON.stringify(error.value)}`);
				}
				lines.push("");
			});
		}
	});

	return lines.join("\n");
};

/**
 * Quick validation helper that throws on first validation error
 */
export const validateOpenApiDocumentStrict = (
	fileContent: FileContent,
): Effect.Effect<OpenApiDocument, Error> =>
	Effect.gen(function* () {
		const result = yield* validateOpenApiDocument(fileContent);

		if (!result.isValid) {
			const firstError = result.errors[0];
			yield* Effect.fail(
				new Error(
					`OpenAPI validation failed in file '${fileContent.filePath}' at ${firstError?.path || "unknown path"}: ${firstError?.message || "Unknown error"}`,
				),
			);
		}

		if (!result.document) {
			yield* Effect.fail(
				new Error(
					`OpenAPI validation succeeded but document is undefined for file: ${fileContent.filePath}`,
				),
			);
		}

		return result.document as OpenApiDocument;
	});
