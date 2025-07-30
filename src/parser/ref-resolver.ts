import RefParser from "@apidevtools/json-schema-ref-parser";
import { Effect } from "effect";
import * as url from "node:url";
import type { OpenApiDocument } from "../types/openapi.js";

export interface ResolvedDocument {
	readonly original: OpenApiDocument;
	readonly resolved: OpenApiDocument;
	readonly referencePaths: readonly string[];
}

export interface RefResolutionOptions {
	readonly resolveExternal?: boolean;
	readonly dereferenceInternal?: boolean;
	readonly continueOnError?: boolean;
	readonly allowedDomains?: readonly string[];
	readonly maxRedirects?: number;
	readonly timeout?: number;
}

/**
 * Default options for reference resolution
 */
export const defaultRefResolutionOptions: RefResolutionOptions = {
	resolveExternal: false, // Only resolve internal references by default
	dereferenceInternal: true,
	continueOnError: false,
	allowedDomains: [], // No external domains allowed by default
	maxRedirects: 0,
	timeout: 5000, // 5 second timeout
} as const;

/**
 * Validates if a URL is safe for external reference resolution
 */
const validateExternalUrl = (
	refUrl: string,
	options: RefResolutionOptions
): Effect.Effect<void, Error> =>
	Effect.gen(function* () {
		try {
			const parsedUrl = new url.URL(refUrl);
			
			// Block dangerous protocols
			if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
				yield* Effect.fail(new Error(`Unsafe protocol '${parsedUrl.protocol}' in reference: ${refUrl}`));
			}
			
			// Block private/local addresses
			const hostname = parsedUrl.hostname.toLowerCase();
			if (
				hostname === 'localhost' ||
				hostname === '127.0.0.1' ||
				hostname === '::1' ||
				hostname.startsWith('192.168.') ||
				hostname.startsWith('10.') ||
				hostname.startsWith('172.16.') ||
				hostname.startsWith('172.17.') ||
				hostname.startsWith('172.18.') ||
				hostname.startsWith('172.19.') ||
				hostname.startsWith('172.2') ||
				hostname.startsWith('172.30.') ||
				hostname.startsWith('172.31.') ||
				hostname.startsWith('169.254.') ||
				hostname === '0.0.0.0' ||
				hostname.includes('.local')
			) {
				yield* Effect.fail(new Error(`Private/local address not allowed in external reference: ${refUrl}`));
			}
			
			// Check domain whitelist if specified
			const allowedDomains = options.allowedDomains || [];
			if (allowedDomains.length > 0) {
				const isAllowed = allowedDomains.some(domain => 
					hostname === domain || hostname.endsWith(`.${domain}`)
				);
				if (!isAllowed) {
					yield* Effect.fail(new Error(`Domain '${hostname}' not in allowed domains list. Allowed: ${allowedDomains.join(', ')}`));
				}
			}
		} catch (error) {
			yield* Effect.fail(new Error(`Invalid URL in external reference: ${refUrl}`));
		}
	});

/**
 * Extracts all reference paths from a document
 */
const extractReferencePaths = (
	obj: unknown,
	paths: string[] = [],
	currentPath = "",
): string[] => {
	if (typeof obj !== "object" || obj === null) {
		return paths;
	}

	if (Array.isArray(obj)) {
		obj.forEach((item, index) => {
			extractReferencePaths(item, paths, `${currentPath}[${index}]`);
		});
		return paths;
	}

	const record = obj as Record<string, unknown>;

	// Check for $ref at current level
	if (typeof record.$ref === "string") {
		paths.push(record.$ref);
	}

	// Recursively check all properties
	Object.entries(record).forEach(([key, value]) => {
		const newPath = currentPath ? `${currentPath}.${key}` : key;
		extractReferencePaths(value, paths, newPath);
	});

	return paths;
};

/**
 * Resolves $ref references in an OpenAPI document using @apidevtools/json-schema-ref-parser
 */
export const resolveReferences = (
	document: OpenApiDocument,
	options: RefResolutionOptions = defaultRefResolutionOptions,
): Effect.Effect<ResolvedDocument, Error> =>
	Effect.gen(function* () {
		// Extract reference paths before resolution
		const referencePaths = extractReferencePaths(document);

		// Configure RefParser options
		const parserOptions = {
			continueOnError: options.continueOnError || false,
			dereference: {
				circular: "ignore" as const,
			},
		};

		// Validate external references if external resolution is enabled
		if (options.resolveExternal) {
			const { external } = classifyReferences(referencePaths);
			for (const extRef of external) {
				yield* validateExternalUrl(extRef, options);
			}
		}

		// Configure RefParser options with security controls
		const secureParserOptions = {
			...parserOptions,
			resolve: {
				http: options.resolveExternal ? {
					timeout: options.timeout || 5000,
					redirects: options.maxRedirects || 0
				} : false,
				https: options.resolveExternal ? {
					timeout: options.timeout || 5000,
					redirects: options.maxRedirects || 0
				} : false,
				file: false // Disable file system access for security
			}
		};

		// Resolve references using RefParser
		const resolved = yield* Effect.tryPromise({
			try: async () => {
				if (options.resolveExternal) {
					// Resolve all references including external ones with security controls
					return (await RefParser.dereference(
						document as any,
						secureParserOptions,
					)) as OpenApiDocument;
				} else {
					// Only resolve internal references - use bundle to avoid external resolution
					return (await RefParser.bundle(
						document as any,
						{
							...secureParserOptions,
							resolve: {
								http: false,
								https: false,
								file: false
							}
						}
					)) as OpenApiDocument;
				}
			},
			catch: (error) => {
				const message = error instanceof Error ? error.message : String(error);
				return new Error(`Failed to resolve references: ${message}`);
			},
		});

		return {
			original: document,
			resolved,
			referencePaths,
		};
	});

/**
 * Resolves only internal references (those starting with #/)
 */
export const resolveInternalReferences = (
	document: OpenApiDocument,
): Effect.Effect<ResolvedDocument, Error> =>
	resolveReferences(document, {
		resolveExternal: false,
		dereferenceInternal: true,
		continueOnError: false,
	});

/**
 * Resolves all references including external ones (use with caution)
 */
export const resolveAllReferences = (
	document: OpenApiDocument,
): Effect.Effect<ResolvedDocument, Error> =>
	resolveReferences(document, {
		resolveExternal: true,
		dereferenceInternal: true,
		continueOnError: false,
	});

/**
 * Validates that all references have been properly resolved
 */
export const validateResolution = (
	resolvedDocument: ResolvedDocument,
): Effect.Effect<void, Error> =>
	Effect.gen(function* () {
		// Check if any $ref properties remain in the resolved document
		const remainingRefs = extractReferencePaths(resolvedDocument.resolved);

		if (remainingRefs.length > 0) {
			yield* Effect.fail(
				new Error(
					`Reference resolution incomplete. Remaining unresolved references: ${remainingRefs.join(", ")}`,
				),
			);
		}
	});

/**
 * Resolves references with validation
 */
export const resolveAndValidateReferences = (
	document: OpenApiDocument,
	options: RefResolutionOptions = defaultRefResolutionOptions,
): Effect.Effect<ResolvedDocument, Error> =>
	Effect.gen(function* () {
		const resolved = yield* resolveReferences(document, options);
		yield* validateResolution(resolved);
		return resolved;
	});

/**
 * Creates a reference resolution report
 */
export const createResolutionReport = (
	resolvedDocument: ResolvedDocument,
): string => {
	const lines: string[] = [];

	lines.push("Reference Resolution Report");
	lines.push("=".repeat(28));
	lines.push("");

	const originalRefs = resolvedDocument.referencePaths;
	const remainingRefs = extractReferencePaths(resolvedDocument.resolved);

	lines.push(`Original references found: ${originalRefs.length}`);
	lines.push(`Remaining unresolved references: ${remainingRefs.length}`);
	lines.push(
		`Successfully resolved: ${originalRefs.length - remainingRefs.length}`,
	);
	lines.push("");

	if (originalRefs.length > 0) {
		lines.push("Original references:");
		originalRefs.forEach((ref) => {
			const isResolved = !remainingRefs.includes(ref);
			const status = isResolved ? "✅" : "❌";
			lines.push(`  ${status} ${ref}`);
		});
		lines.push("");
	}

	if (remainingRefs.length > 0) {
		lines.push("Unresolved references:");
		remainingRefs.forEach((ref) => {
			lines.push(`  ❌ ${ref}`);
		});
		lines.push("");
	}

	return lines.join("\n");
};

/**
 * Helper to determine if a reference is internal (starts with #/)
 */
export const isInternalReference = (ref: string): boolean =>
	ref.startsWith("#/");

/**
 * Helper to determine if a reference is external
 */
export const isExternalReference = (ref: string): boolean =>
	!isInternalReference(ref);

/**
 * Filters references by type
 */
export interface ReferenceClassification {
	readonly internal: readonly string[];
	readonly external: readonly string[];
}

export const classifyReferences = (
	referencePaths: readonly string[],
): ReferenceClassification => ({
	internal: referencePaths.filter(isInternalReference),
	external: referencePaths.filter(isExternalReference),
});
