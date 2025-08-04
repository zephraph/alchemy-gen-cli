import type { FileSystem } from "@effect/platform";
import { Effect } from "effect";
import type { OpenApiDocument } from "../types/openapi.js";
import type { ExtractedApiData } from "./extractor.js";
import { extractApiData } from "./extractor.js";
import { readAndValidateOpenApiFile } from "./reader.js";
import {
	resolveAllReferences,
	resolveInternalReferences,
} from "./ref-resolver.js";
import { validateOpenApiDocumentStrict } from "./validator.js";

export interface ParseOptions {
	readonly resolveExternalReferences?: boolean;
	readonly skipValidation?: boolean;
	readonly continueOnValidationError?: boolean;
}

export interface ParseResult {
	readonly filePath: string;
	readonly format: "json" | "yaml";
	readonly isValid: boolean;
	readonly originalDocument: OpenApiDocument;
	readonly resolvedDocument: OpenApiDocument;
	readonly extractedData: ExtractedApiData;
	readonly referencePaths: readonly string[];
	readonly validationErrors: readonly string[];
}

export interface ParseError {
	readonly filePath: string;
	readonly stage: "reading" | "validation" | "resolution" | "extraction";
	readonly message: string;
	readonly cause?: Error;
}

const defaultParseOptions: ParseOptions = {
	resolveExternalReferences: false,
	skipValidation: false,
	continueOnValidationError: false,
} as const;

/**
 * Parses a single OpenAPI specification file through the complete pipeline
 */
export const parseOpenApiFile = (
	filePath: string,
	options: ParseOptions = defaultParseOptions,
): Effect.Effect<ParseResult, ParseError, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const opts = { ...defaultParseOptions, ...options };

		// Stage 1: Read and validate file structure
		const fileContentResult = yield* readAndValidateOpenApiFile(filePath).pipe(
			Effect.either,
		);

		if (fileContentResult._tag === "Left") {
			return yield* Effect.fail({
				filePath,
				stage: "reading" as const,
				message: `Failed to read OpenAPI file: ${fileContentResult.left.message}`,
				cause: fileContentResult.left,
			});
		}

		const fileContent = fileContentResult.right;

		// Stage 2: Validate OpenAPI document
		let validatedDocument: OpenApiDocument;
		const validationErrors: string[] = [];

		// Validation is disabled when skipValidation is true
		if (!opts.skipValidation) {
			const validationResult = yield* validateOpenApiDocumentStrict(
				fileContent,
			).pipe(Effect.either);

			if (validationResult._tag === "Left") {
				const errorMessage = validationResult.left.message;
				validationErrors.push(errorMessage);

				if (!opts.continueOnValidationError) {
					return yield* Effect.fail({
						filePath,
						stage: "validation" as const,
						message: `OpenAPI validation failed: ${errorMessage}`,
						cause: validationResult.left,
					});
				}

				// Use the raw file content as the document if continuing on error
				validatedDocument = fileContent.content as OpenApiDocument;
			} else {
				validatedDocument = validationResult.right;
			}
		} else {
			validatedDocument = fileContent.content as OpenApiDocument;
		}

		// Stage 3: Resolve references
		const resolutionResult = yield* (
			opts.resolveExternalReferences
				? resolveAllReferences(validatedDocument)
				: resolveInternalReferences(validatedDocument)
		).pipe(Effect.either);

		if (resolutionResult._tag === "Left") {
			return yield* Effect.fail({
				filePath,
				stage: "resolution" as const,
				message: `Reference resolution failed: ${resolutionResult.left.message}`,
				cause: resolutionResult.left,
			});
		}

		const resolvedDocument = resolutionResult.right;

		// Stage 4: Extract structured data
		const extractionResult = yield* extractApiData(
			resolvedDocument.resolved,
		).pipe(Effect.either);

		if (extractionResult._tag === "Left") {
			return yield* Effect.fail({
				filePath,
				stage: "extraction" as const,
				message: `Data extraction failed: ${extractionResult.left.message}`,
				cause: extractionResult.left,
			});
		}

		const extractedData = extractionResult.right;

		return {
			filePath,
			format: fileContent.format,
			isValid: validationErrors.length === 0,
			originalDocument: validatedDocument,
			resolvedDocument: resolvedDocument.resolved,
			extractedData,
			referencePaths: resolvedDocument.referencePaths,
			validationErrors,
		};
	});

/**
 * Parses multiple OpenAPI specification files concurrently
 */
export const parseOpenApiFiles = (
	filePaths: readonly string[],
	options: ParseOptions = defaultParseOptions,
): Effect.Effect<
	readonly ParseResult[],
	readonly ParseError[],
	FileSystem.FileSystem
> =>
	Effect.gen(function* () {
		const results = yield* Effect.all(
			filePaths.map((filePath) =>
				parseOpenApiFile(filePath, options).pipe(Effect.either),
			),
			{ concurrency: "unbounded" },
		);

		const successes: ParseResult[] = [];
		const failures: ParseError[] = [];

		results.forEach((result) => {
			if (result._tag === "Right") {
				successes.push(result.right);
			} else {
				failures.push(result.left);
			}
		});

		if (failures.length > 0) {
			return yield* Effect.fail(failures);
		}

		return successes;
	});

/**
 * Parses OpenAPI files with error collection (doesn't fail on individual file errors)
 */
export const parseOpenApiFilesCollectErrors = (
	filePaths: readonly string[],
	options: ParseOptions = defaultParseOptions,
): Effect.Effect<
	{
		readonly successes: readonly ParseResult[];
		readonly failures: readonly ParseError[];
	},
	never,
	FileSystem.FileSystem
> =>
	Effect.gen(function* () {
		const results = yield* Effect.all(
			filePaths.map((filePath) =>
				parseOpenApiFile(filePath, options).pipe(Effect.either),
			),
			{ concurrency: "unbounded" },
		);

		const successes: ParseResult[] = [];
		const failures: ParseError[] = [];

		results.forEach((result) => {
			if (result._tag === "Right") {
				successes.push(result.right);
			} else {
				failures.push(result.left);
			}
		});

		return { successes, failures };
	});

/**
 * Creates a comprehensive parsing report
 */
export const createParsingReport = (
	results: readonly ParseResult[],
	errors: readonly ParseError[] = [],
): string => {
	const lines: string[] = [];

	lines.push("OpenAPI Parsing Report");
	lines.push("=".repeat(21));
	lines.push("");

	// Summary
	const totalFiles = results.length + errors.length;
	const successfulFiles = results.length;
	const failedFiles = errors.length;
	const validFiles = results.filter((r) => r.isValid).length;
	const invalidFiles = results.filter((r) => !r.isValid).length;

	lines.push(`Total files processed: ${totalFiles}`);
	lines.push(`Successful parses: ${successfulFiles}`);
	lines.push(`Failed parses: ${failedFiles}`);
	lines.push(`Valid specifications: ${validFiles}`);
	lines.push(`Invalid specifications: ${invalidFiles}`);
	lines.push("");

	// File format breakdown
	if (results.length > 0) {
		const formatCounts = results.reduce(
			(acc, result) => {
				acc[result.format] = (acc[result.format] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		lines.push("File formats:");
		Object.entries(formatCounts).forEach(([format, count]) => {
			lines.push(`  ${format.toUpperCase()}: ${count}`);
		});
		lines.push("");
	}

	// Successful results
	if (results.length > 0) {
		lines.push("✅ Successfully parsed files:");
		results.forEach((result) => {
			const statusIcon = result.isValid ? "✅" : "⚠️";
			const validationNote = result.isValid
				? ""
				: ` (${result.validationErrors.length} validation error${result.validationErrors.length === 1 ? "" : "s"})`;
			lines.push(
				`  ${statusIcon} ${result.filePath} - ${result.extractedData.info.title} v${result.extractedData.info.version}${validationNote}`,
			);

			if (!result.isValid && result.validationErrors.length > 0) {
				result.validationErrors.slice(0, 3).forEach((error) => {
					lines.push(`    • ${error}`);
				});
				if (result.validationErrors.length > 3) {
					lines.push(
						`    • ... and ${result.validationErrors.length - 3} more errors`,
					);
				}
			}
		});
		lines.push("");
	}

	// Failed results
	if (errors.length > 0) {
		lines.push("❌ Failed to parse files:");
		errors.forEach((error) => {
			lines.push(`  ❌ ${error.filePath} (${error.stage}): ${error.message}`);
		});
		lines.push("");
	}

	// Statistics from successful parses
	if (results.length > 0) {
		const totalPaths = results.reduce(
			(sum, r) => sum + r.extractedData.paths.length,
			0,
		);
		const totalOperations = results.reduce(
			(sum, r) =>
				sum +
				r.extractedData.paths.reduce(
					(pathSum, path) => pathSum + path.operations.length,
					0,
				),
			0,
		);
		const totalSchemas = results.reduce(
			(sum, r) => sum + Object.keys(r.extractedData.components.schemas).length,
			0,
		);

		lines.push("📊 Statistics:");
		lines.push(`  Total API paths: ${totalPaths}`);
		lines.push(`  Total operations: ${totalOperations}`);
		lines.push(`  Total schemas: ${totalSchemas}`);
		lines.push("");
	}

	return lines.join("\n");
};

/**
 * Quick parse helper for single files with simplified result
 */
export const quickParseOpenApiFile = (
	filePath: string,
	options: ParseOptions = defaultParseOptions,
): Effect.Effect<ExtractedApiData, Error, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const result = yield* parseOpenApiFile(filePath, options).pipe(
			Effect.mapError(
				(parseError) => new Error(`${parseError.stage}: ${parseError.message}`),
			),
		);

		return result.extractedData;
	});

// Alias for backward compatibility
export const parseOpenApiSpec = parseOpenApiFile;

// Re-export key types and functions for convenience
export type { OpenApiDocument } from "../types/openapi.js";
export type { ExtractedApiData } from "./extractor.js";
export { extractApiData } from "./extractor.js";
export type { FileContent } from "./reader.js";
// Re-export individual pipeline functions
export { readAndValidateOpenApiFile } from "./reader.js";
export type { ResolvedDocument } from "./ref-resolver.js";
export {
	resolveAllReferences,
	resolveInternalReferences,
} from "./ref-resolver.js";
export type { ValidationResult } from "./validator.js";
export { validateOpenApiDocumentStrict } from "./validator.js";
