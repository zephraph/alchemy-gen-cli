/**
 * Specialized error types for OpenAPI parsing pipeline
 */

import type { ParseError } from "../parser/index.js";

export class OpenApiParseError extends Error {
	readonly filePath: string;
	readonly stage: "reading" | "validation" | "resolution" | "extraction";
	readonly originalCause?: Error | undefined;

	constructor(
		filePath: string,
		stage: "reading" | "validation" | "resolution" | "extraction",
		message: string,
		cause?: Error,
	) {
		super(message);
		this.name = "OpenApiParseError";
		this.filePath = filePath;
		this.stage = stage;
		this.originalCause = cause;
	}

	override toString(): string {
		return `OpenApiParseError [${this.stage}] ${this.filePath}: ${this.message}`;
	}
}

export class OpenApiFileNotFoundError extends OpenApiParseError {
	constructor(filePath: string, cause?: Error) {
		super(filePath, "reading", `OpenAPI file not found: ${filePath}`, cause);
		this.name = "OpenApiFileNotFoundError";
	}
}

export class OpenApiInvalidFormatError extends OpenApiParseError {
	readonly detectedFormat?: string | undefined;

	constructor(filePath: string, detectedFormat?: string, cause?: Error) {
		const message = `Invalid OpenAPI file format${detectedFormat ? ` (detected: ${detectedFormat})` : ""}. Expected .json, .yaml, or .yml`;
		super(filePath, "reading", message, cause);
		this.name = "OpenApiInvalidFormatError";
		this.detectedFormat = detectedFormat;
	}
}

export class OpenApiValidationError extends OpenApiParseError {
	readonly validationErrors: readonly string[];

	constructor(
		filePath: string,
		validationErrors: readonly string[],
		cause?: Error,
	) {
		const errorSummary =
			validationErrors.length === 1
				? validationErrors[0]
				: `${validationErrors.length} validation errors`;

		super(
			filePath,
			"validation",
			`OpenAPI validation failed: ${errorSummary}`,
			cause,
		);
		this.name = "OpenApiValidationError";
		this.validationErrors = validationErrors;
	}
}

export class OpenApiReferenceResolutionError extends OpenApiParseError {
	readonly unresolvedReferences: readonly string[];

	constructor(
		filePath: string,
		unresolvedReferences: readonly string[],
		cause?: Error,
	) {
		const message = `Failed to resolve ${unresolvedReferences.length} reference${unresolvedReferences.length === 1 ? "" : "s"}: ${unresolvedReferences.slice(0, 3).join(", ")}${unresolvedReferences.length > 3 ? "..." : ""}`;
		super(filePath, "resolution", message, cause);
		this.name = "OpenApiReferenceResolutionError";
		this.unresolvedReferences = unresolvedReferences;
	}
}

export class OpenApiExtractionError extends OpenApiParseError {
	constructor(filePath: string, message: string, cause?: Error) {
		super(filePath, "extraction", `Data extraction failed: ${message}`, cause);
		this.name = "OpenApiExtractionError";
	}
}

export class OpenApiUnsupportedVersionError extends OpenApiValidationError {
	readonly detectedVersion?: string | undefined;

	constructor(filePath: string, detectedVersion?: string, cause?: Error) {
		const message = `Unsupported OpenAPI version${detectedVersion ? `: ${detectedVersion}` : ""}. Only OpenAPI 3.x is supported.`;
		super(filePath, [message], cause);
		this.name = "OpenApiUnsupportedVersionError";
		this.detectedVersion = detectedVersion;
	}
}

/**
 * Error utilities for working with OpenAPI parsing errors
 */
export const ErrorUtils = {
	/**
	 * Determines if an error is related to OpenAPI parsing
	 */
	isOpenApiError(error: unknown): error is OpenApiParseError {
		return error instanceof OpenApiParseError;
	},

	/**
	 * Determines if an error is a file not found error
	 */
	isFileNotFoundError(error: unknown): error is OpenApiFileNotFoundError {
		return error instanceof OpenApiFileNotFoundError;
	},

	/**
	 * Determines if an error is a validation error
	 */
	isValidationError(error: unknown): error is OpenApiValidationError {
		return error instanceof OpenApiValidationError;
	},

	/**
	 * Determines if an error is a reference resolution error
	 */
	isReferenceResolutionError(
		error: unknown,
	): error is OpenApiReferenceResolutionError {
		return error instanceof OpenApiReferenceResolutionError;
	},

	/**
	 * Extracts the error stage from any error
	 */
	getErrorStage(error: unknown): string {
		if (this.isOpenApiError(error)) {
			return error.stage;
		}
		return "unknown";
	},

	/**
	 * Formats an error for display
	 */
	formatError(error: unknown): string {
		if (this.isOpenApiError(error)) {
			return error.toString();
		}

		if (error instanceof Error) {
			return `${error.name}: ${error.message}`;
		}

		return String(error);
	},

	/**
	 * Converts a ParseError to the appropriate specialized error type
	 */
	fromParseError(parseError: ParseError): OpenApiParseError {
		switch (parseError.stage) {
			case "reading":
				if (parseError.message.includes("does not exist")) {
					return new OpenApiFileNotFoundError(
						parseError.filePath,
						parseError.cause,
					);
				}
				if (
					parseError.message.includes("format") ||
					parseError.message.includes("extension")
				) {
					return new OpenApiInvalidFormatError(
						parseError.filePath,
						undefined,
						parseError.cause,
					);
				}
				return new OpenApiParseError(
					parseError.filePath,
					parseError.stage,
					parseError.message,
					parseError.cause,
				);

			case "validation":
				if (parseError.message.includes("version")) {
					return new OpenApiUnsupportedVersionError(
						parseError.filePath,
						undefined,
						parseError.cause,
					);
				}
				return new OpenApiValidationError(
					parseError.filePath,
					[parseError.message],
					parseError.cause,
				);

			case "resolution":
				return new OpenApiReferenceResolutionError(
					parseError.filePath,
					[],
					parseError.cause,
				);

			case "extraction":
				return new OpenApiExtractionError(
					parseError.filePath,
					parseError.message,
					parseError.cause,
				);

			default:
				return new OpenApiParseError(
					parseError.filePath,
					parseError.stage,
					parseError.message,
					parseError.cause,
				);
		}
	},

	/**
	 * Converts multiple ParseErrors to specialized error types
	 */
	fromParseErrors(
		parseErrors: readonly ParseError[],
	): readonly OpenApiParseError[] {
		return parseErrors.map((error) => this.fromParseError(error));
	},

	/**
	 * Groups errors by stage
	 */
	groupErrorsByStage(
		errors: readonly OpenApiParseError[],
	): Record<string, OpenApiParseError[]> {
		return errors.reduce(
			(groups, error) => {
				const stage = error.stage;
				if (!groups[stage]) {
					groups[stage] = [];
				}
				groups[stage].push(error);
				return groups;
			},
			{} as Record<string, OpenApiParseError[]>,
		);
	},

	/**
	 * Groups errors by file path
	 */
	groupErrorsByFile(
		errors: readonly OpenApiParseError[],
	): Record<string, OpenApiParseError[]> {
		return errors.reduce(
			(groups, error) => {
				const filePath = error.filePath;
				if (!groups[filePath]) {
					groups[filePath] = [];
				}
				groups[filePath].push(error);
				return groups;
			},
			{} as Record<string, OpenApiParseError[]>,
		);
	},

	/**
	 * Creates a summary of errors
	 */
	createErrorSummary(errors: readonly OpenApiParseError[]): string {
		if (errors.length === 0) {
			return "No errors";
		}

		const byStage = this.groupErrorsByStage(errors);
		const lines: string[] = [];

		lines.push(`Total errors: ${errors.length}`);

		Object.entries(byStage).forEach(([stage, stageErrors]) => {
			lines.push(`  ${stage}: ${stageErrors.length}`);
		});

		return lines.join("\n");
	},

	/**
	 * Creates a detailed error report
	 */
	createErrorReport(errors: readonly OpenApiParseError[]): string {
		if (errors.length === 0) {
			return "✅ No errors found";
		}

		const lines: string[] = [];
		lines.push("❌ Error Report");
		lines.push("=".repeat(14));
		lines.push("");

		const byFile = this.groupErrorsByFile(errors);

		Object.entries(byFile).forEach(([filePath, fileErrors]) => {
			lines.push(`📁 ${filePath}:`);

			fileErrors.forEach((error) => {
				lines.push(`  🔸 [${error.stage}] ${error.message}`);

				if (
					error instanceof OpenApiValidationError &&
					error.validationErrors.length > 1
				) {
					error.validationErrors.slice(1).forEach((validationError) => {
						lines.push(`     • ${validationError}`);
					});
				}

				if (
					error instanceof OpenApiReferenceResolutionError &&
					error.unresolvedReferences.length > 0
				) {
					error.unresolvedReferences.forEach((ref) => {
						lines.push(`     • Unresolved: ${ref}`);
					});
				}
			});

			lines.push("");
		});

		return lines.join("\n");
	},
} as const;
