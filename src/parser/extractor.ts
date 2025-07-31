import { Effect } from "effect";
import type {
	OpenApiComponents,
	OpenApiDocument,
	OpenApiOperation,
	OpenApiParameter,
	OpenApiPath,
	OpenApiRequestBody,
	OpenApiResponse,
	OpenApiSchema,
} from "../types/openapi.js";

export interface ExtractedApiData {
	readonly info: {
		readonly title: string;
		readonly version: string;
		readonly description?: string;
	};
	readonly servers: readonly {
		readonly url: string;
		readonly description?: string;
	}[];
	readonly paths: readonly ExtractedPath[];
	readonly components: ExtractedComponents;
	readonly security: readonly Record<string, readonly string[]>[];
	readonly tags: readonly {
		readonly name: string;
		readonly description?: string;
	}[];
}

export interface ExtractedPath {
	readonly path: string;
	readonly summary?: string;
	readonly description?: string;
	readonly operations: readonly ExtractedOperation[];
	readonly parameters: readonly ExtractedParameter[];
}

export interface ExtractedOperation {
	readonly method: string;
	readonly path?: string;
	readonly operationId?: string;
	readonly summary?: string;
	readonly description?: string;
	readonly tags: readonly string[];
	readonly parameters: readonly ExtractedParameter[];
	readonly requestBody?: ExtractedRequestBody;
	readonly responses: readonly ExtractedResponse[];
	readonly deprecated?: boolean;
	readonly security: readonly Record<string, readonly string[]>[];
}

export interface ExtractedParameter {
	readonly name: string;
	readonly in: "query" | "header" | "path" | "cookie";
	readonly description?: string;
	readonly required: boolean;
	readonly deprecated?: boolean;
	readonly schema?: ExtractedSchema;
	readonly example?: unknown;
}

export interface ExtractedRequestBody {
	readonly description?: string;
	readonly required: boolean;
	readonly content: readonly {
		readonly mediaType: string;
		readonly schema?: ExtractedSchema;
		readonly example?: unknown;
	}[];
}

export interface ExtractedResponse {
	readonly statusCode: number;
	readonly description: string;
	readonly schema?: ExtractedSchema; // Primary schema from application/json content
	readonly content: readonly {
		readonly mediaType: string;
		readonly schema?: ExtractedSchema;
		readonly example?: unknown;
	}[];
	readonly headers: readonly {
		readonly name: string;
		readonly description?: string;
		readonly schema?: ExtractedSchema;
	}[];
}

export interface ExtractedSchema {
	readonly $ref?: string;
	readonly type?: string;
	readonly format?: string;
	readonly description?: string;
	readonly example?: unknown;
	readonly default?: unknown;
	readonly enum?: readonly unknown[];
	readonly properties?: Record<string, ExtractedSchema>;
	readonly required?: readonly string[];
	readonly items?: ExtractedSchema;
	readonly additionalProperties?: boolean | ExtractedSchema;
	readonly nullable?: boolean;
	readonly deprecated?: boolean;
	readonly minimum?: number;
	readonly maximum?: number;
	readonly minLength?: number;
	readonly maxLength?: number;
	readonly pattern?: string;
}

export interface ExtractedComponents {
	readonly schemas: Record<string, ExtractedSchema>;
	readonly responses: Record<string, ExtractedResponse>;
	readonly parameters: Record<string, ExtractedParameter>;
	readonly requestBodies: Record<string, ExtractedRequestBody>;
}

/**
 * Extracts schema information from OpenAPI schema objects
 */
const extractSchema = (
	schema: OpenApiSchema | undefined,
): ExtractedSchema | undefined => {
	if (!schema) return undefined;

	const props: Record<string, ExtractedSchema> = {};
	if (schema.properties) {
		Object.entries(schema.properties).forEach(([key, value]) => {
			if (typeof value === "object" && value && "$ref" in value) {
				props[key] = {
					type: "reference",
					description: `Reference to ${(value as { $ref: string }).$ref}`,
				};
			} else {
				const extractedProp = extractSchema(value as OpenApiSchema);
				if (extractedProp) {
					props[key] = extractedProp;
				}
			}
		});
	}

	const items =
		"items" in schema && schema.items && !("$ref" in schema.items)
			? extractSchema(schema.items)
			: undefined;

	const additionalProps =
		typeof schema.additionalProperties === "boolean"
			? schema.additionalProperties
			: schema.additionalProperties && !("$ref" in schema.additionalProperties)
				? extractSchema(schema.additionalProperties)
				: undefined;

	return {
		...(schema.type && { type: schema.type }),
		...(schema.format && { format: schema.format }),
		...(schema.description && { description: schema.description }),
		...(schema.example !== undefined && { example: schema.example }),
		...(schema.enum && { enum: schema.enum }),
		...(schema.required && { required: schema.required }),
		...(schema.nullable && { nullable: schema.nullable }),
		...(schema.deprecated && { deprecated: schema.deprecated }),
		...(Object.keys(props).length > 0 && { properties: props }),
		...(items && { items }),
		...(additionalProps !== undefined && {
			additionalProperties: additionalProps,
		}),
	};
};

/**
 * Extracts parameter information from OpenAPI parameter objects
 */
const extractParameter = (param: OpenApiParameter): ExtractedParameter => {
	const schema = extractSchema(
		param.schema && !("$ref" in param.schema) ? param.schema : undefined,
	);

	return {
		name: param.name,
		in: param.in,
		required: param.required || param.in === "path", // Path parameters are always required
		...(param.description && { description: param.description }),
		...(param.deprecated && { deprecated: param.deprecated }),
		...(param.example !== undefined && { example: param.example }),
		...(schema && { schema }),
	};
};

/**
 * Extracts request body information
 */
const extractRequestBody = (
	requestBody: OpenApiRequestBody,
): ExtractedRequestBody => {
	const content = Object.entries(requestBody.content).map(
		([mediaType, mediaTypeObj]) => {
			const schema = extractSchema(
				mediaTypeObj.schema && !("$ref" in mediaTypeObj.schema)
					? mediaTypeObj.schema
					: undefined,
			);

			return {
				mediaType,
				...(schema && { schema }),
				...(mediaTypeObj.example !== undefined && {
					example: mediaTypeObj.example,
				}),
			};
		},
	);

	return {
		required: requestBody.required || false,
		content,
		...(requestBody.description && { description: requestBody.description }),
	};
};

/**
 * Extracts response information
 */
const extractResponse = (
	statusCode: string,
	response: OpenApiResponse,
): ExtractedResponse => {
	const result: ExtractedResponse = {
		statusCode: Number.parseInt(statusCode, 10),
		description: response.description,
		content: response.content
			? Object.entries(response.content).map(([mediaType, mediaTypeObj]) => {
					const contentItem: {
						mediaType: string;
						schema?: ExtractedSchema;
						example?: unknown;
					} = { mediaType };

					const schema = extractSchema(
						mediaTypeObj.schema && !("$ref" in mediaTypeObj.schema)
							? mediaTypeObj.schema
							: undefined,
					);
					if (schema) contentItem.schema = schema;
					if (mediaTypeObj.example !== undefined)
						contentItem.example = mediaTypeObj.example;

					return contentItem;
				})
			: [],
		headers: response.headers
			? Object.entries(response.headers).map(([name, header]) => {
					const headerItem: {
						name: string;
						description?: string;
						schema?: ExtractedSchema;
					} = { name };

					if (!("$ref" in header)) {
						if (header.description) headerItem.description = header.description;
						const schema = extractSchema(
							header.schema && !("$ref" in header.schema)
								? header.schema
								: undefined,
						);
						if (schema) headerItem.schema = schema;
					}

					return headerItem;
				})
			: [],
	};

	return result;
};

/**
 * Extracts operation information from OpenAPI operation objects
 */
const extractOperation = (
	method: string,
	operation: OpenApiOperation,
): ExtractedOperation => {
	const parameters = (operation.parameters || [])
		.filter((param: any): param is OpenApiParameter => !("$ref" in param))
		.map((param: OpenApiParameter) => extractParameter(param));

	const responses = Object.entries(operation.responses)
		.filter(
			([, response]) =>
				typeof response === "object" && response && !("$ref" in response),
		)
		.map(([statusCode, response]) =>
			extractResponse(statusCode, response as OpenApiResponse),
		);

	const result: ExtractedOperation = {
		method: method.toUpperCase(),
		tags: operation.tags || [],
		parameters,
		responses,
		security: operation.security || [],
		...(operation.operationId && { operationId: operation.operationId }),
		...(operation.summary && { summary: operation.summary }),
		...(operation.description && { description: operation.description }),
		...(operation.deprecated && { deprecated: operation.deprecated }),
		...(operation.requestBody &&
			!("$ref" in operation.requestBody) && {
				requestBody: extractRequestBody(operation.requestBody),
			}),
	};

	return result;
};

/**
 * Extracts path information from OpenAPI path objects
 */
const extractPath = (pathStr: string, pathObj: OpenApiPath): ExtractedPath => {
	const operations: ExtractedOperation[] = [];
	const httpMethods = [
		"get",
		"put",
		"post",
		"delete",
		"options",
		"head",
		"patch",
		"trace",
	] as const;

	// Extract operations for each HTTP method
	httpMethods.forEach((method) => {
		const operation = pathObj[method];
		if (operation) {
			operations.push(extractOperation(method, operation));
		}
	});

	const parameters = (pathObj.parameters || [])
		.filter((param: any): param is OpenApiParameter => !("$ref" in param))
		.map((param: OpenApiParameter) => extractParameter(param));

	const result: ExtractedPath = {
		path: pathStr,
		operations,
		parameters,
		...(pathObj.summary && { summary: pathObj.summary }),
		...(pathObj.description && { description: pathObj.description }),
	};

	return result;
};

/**
 * Extracts components information
 */
const extractComponents = (
	components: OpenApiComponents | undefined,
): ExtractedComponents => {
	if (!components) {
		return {
			schemas: {},
			responses: {},
			parameters: {},
			requestBodies: {},
		};
	}

	return {
		schemas: components.schemas
			? Object.fromEntries(
					Object.entries(components.schemas)
						.filter(([, schema]) => !("$ref" in schema))
						.map(([name, schema]) => [
							name,
							extractSchema(schema as OpenApiSchema),
						])
						.filter(([, schema]) => schema !== undefined),
				)
			: {},
		responses: components.responses
			? Object.fromEntries(
					Object.entries(components.responses)
						.filter(([, response]) => !("$ref" in response))
						.map(([name, response]) => [
							name,
							extractResponse(name, response as OpenApiResponse),
						]),
				)
			: {},
		parameters: components.parameters
			? Object.fromEntries(
					Object.entries(components.parameters)
						.filter(([, param]) => !("$ref" in param))
						.map(([name, param]) => [
							name,
							extractParameter(param as OpenApiParameter),
						]),
				)
			: {},
		requestBodies: components.requestBodies
			? Object.fromEntries(
					Object.entries(components.requestBodies)
						.filter(([, requestBody]) => !("$ref" in requestBody))
						.map(([name, requestBody]) => [
							name,
							extractRequestBody(requestBody as OpenApiRequestBody),
						]),
				)
			: {},
	};
};

/**
 * Main extraction function that processes an OpenAPI document and extracts structured data
 */
export const extractApiData = (
	document: OpenApiDocument,
): Effect.Effect<ExtractedApiData, Error> =>
	Effect.gen(function* () {
		try {
			const info = {
				title: document.info.title,
				version: document.info.version,
				...(document.info.description && {
					description: document.info.description,
				}),
			};

			const servers = (document.servers || []).map((server) => ({
				url: server.url,
				...(server.description && { description: server.description }),
			}));

			const tags = (document.tags || []).map((tag) => ({
				name: tag.name,
				...(tag.description && { description: tag.description }),
			}));

			const extractedData: ExtractedApiData = {
				info,
				servers,
				paths: document.paths
					? Object.entries(document.paths).map(([pathStr, pathObj]) =>
							extractPath(pathStr, pathObj),
						)
					: [],
				components: extractComponents(document.components),
				security: document.security || [],
				tags,
			};

			return extractedData;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return yield* Effect.fail(
				new Error(`Failed to extract API data: ${message}`),
			);
		}
	});

/**
 * Creates a summary report of extracted data
 */
export const createExtractionReport = (data: ExtractedApiData): string => {
	const lines: string[] = [];

	lines.push("API Data Extraction Report");
	lines.push("=".repeat(26));
	lines.push("");

	// Basic info
	lines.push(`API: ${data.info.title} (v${data.info.version})`);
	if (data.info.description) {
		lines.push(`Description: ${data.info.description}`);
	}
	lines.push("");

	// Servers
	if (data.servers.length > 0) {
		lines.push(`Servers: ${data.servers.length}`);
		data.servers.forEach((server) => {
			lines.push(
				`  - ${server.url}${server.description ? ` (${server.description})` : ""}`,
			);
		});
		lines.push("");
	}

	// Paths and operations
	lines.push(`Paths: ${data.paths.length}`);
	lines.push(
		`Operations: ${data.paths.reduce((sum, path) => sum + path.operations.length, 0)}`,
	);
	lines.push("");

	// Method breakdown
	const methodCounts = data.paths
		.flatMap((path) => path.operations)
		.reduce(
			(acc, op) => {
				acc[op.method] = (acc[op.method] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

	if (Object.keys(methodCounts).length > 0) {
		lines.push("HTTP Methods:");
		Object.entries(methodCounts).forEach(([method, count]) => {
			lines.push(`  ${method}: ${count}`);
		});
		lines.push("");
	}

	// Components
	const componentCounts = {
		schemas: Object.keys(data.components.schemas).length,
		responses: Object.keys(data.components.responses).length,
		parameters: Object.keys(data.components.parameters).length,
		requestBodies: Object.keys(data.components.requestBodies).length,
	};

	if (Object.values(componentCounts).some((count) => count > 0)) {
		lines.push("Components:");
		Object.entries(componentCounts).forEach(([type, count]) => {
			if (count > 0) {
				lines.push(`  ${type}: ${count}`);
			}
		});
		lines.push("");
	}

	// Tags
	if (data.tags.length > 0) {
		lines.push(`Tags: ${data.tags.length}`);
		data.tags.forEach((tag) => {
			lines.push(
				`  - ${tag.name}${tag.description ? `: ${tag.description}` : ""}`,
			);
		});
		lines.push("");
	}

	return lines.join("\n");
};
