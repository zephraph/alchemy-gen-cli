import { describe, expect, it } from "bun:test";
import { Effect, Either } from "effect";
import {
	validateOpenApiDocument,
	validateOpenApiVersion,
} from "../../../src/parser/validator.js";
import type { OpenApiDocument } from "../../../src/types/openapi.js";

describe("OpenAPI Validator", () => {
	const validOpenApiDoc: OpenApiDocument = {
		openapi: "3.0.0",
		info: {
			title: "Test API",
			version: "1.0.0",
		},
		paths: {},
	};

	describe("validateOpenApiVersion", () => {
		it("should accept valid OpenAPI 3.x versions", async () => {
			const versions = ["3.0.0", "3.0.1", "3.0.2", "3.0.3", "3.1.0"];

			for (const version of versions) {
				const doc = { ...validOpenApiDoc, openapi: version };
				const result = await Effect.runPromise(
					validateOpenApiVersion(doc).pipe(Effect.either),
				);
				expect(Either.isRight(result)).toBe(true);
			}
		});

		it("should reject unsupported versions", async () => {
			const unsupportedVersions = ["2.0", "1.0", "4.0.0", "invalid"];

			for (const version of unsupportedVersions) {
				const doc = { ...validOpenApiDoc, openapi: version };
				const result = await Effect.runPromise(
					validateOpenApiVersion(doc).pipe(Effect.either),
				);
				expect(Either.isLeft(result)).toBe(true);
			}
		});
	});

	describe("validateOpenApiDocument", () => {
		it("should validate a complete valid OpenAPI document", async () => {
			const fileContent = {
				content: validOpenApiDoc,
				filePath: "test",
				format: "json" as const,
			};
			const result = await Effect.runPromise(
				validateOpenApiDocument(fileContent),
			);
			expect(result.isValid).toBe(true);
		});

		it("should fail for documents missing required fields", async () => {
			const invalidDocs = [
				// Missing openapi field
				{
					content: { info: { title: "Test", version: "1.0.0" }, paths: {} },
					filePath: "test",
					format: "json" as const,
				},
				// Missing info field
				{
					content: { openapi: "3.0.0", paths: {} },
					filePath: "test",
					format: "json" as const,
				},
				// Missing paths field
				{
					content: {
						openapi: "3.0.0",
						info: { title: "Test", version: "1.0.0" },
					},
					filePath: "test",
					format: "json" as const,
				},
				// Missing title in info
				{
					content: { openapi: "3.0.0", info: { version: "1.0.0" }, paths: {} },
					filePath: "test",
					format: "json" as const,
				},
				// Missing version in info
				{
					content: { openapi: "3.0.0", info: { title: "Test" }, paths: {} },
					filePath: "test",
					format: "json" as const,
				},
			];

			for (const [index, doc] of invalidDocs.entries()) {
				const result = await Effect.runPromise(validateOpenApiDocument(doc));
				if (result.isValid) {
					throw new Error(
						`Expected document ${index} to be invalid: ${JSON.stringify(doc.content, null, 2)}`,
					);
				}
				expect(result.isValid).toBe(false);
			}
		});

		it("should provide detailed validation errors", async () => {
			const invalidDoc = {
				content: {
					openapi: "2.0", // Wrong version
					info: { title: "Test" }, // Missing version
					// Missing paths
				},
				filePath: "test",
				format: "json" as const,
			};

			const result = await Effect.runPromise(
				validateOpenApiDocument(invalidDoc),
			);

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("should validate complex document structures", async () => {
			const complexDoc: OpenApiDocument = {
				openapi: "3.0.0",
				info: {
					title: "Complex API",
					version: "1.0.0",
					description: "A complex API with various components",
				},
				paths: {
					"/users": {
						get: {
							summary: "Get users",
							responses: {
								"200": {
									description: "Success",
									content: {
										"application/json": {
											schema: {
												type: "array",
												items: { $ref: "#/components/schemas/User" },
											},
										},
									},
								},
							},
						},
						post: {
							summary: "Create user",
							requestBody: {
								content: {
									"application/json": {
										schema: { $ref: "#/components/schemas/CreateUser" },
									},
								},
							},
							responses: {
								"201": {
									description: "Created",
									content: {
										"application/json": {
											schema: { $ref: "#/components/schemas/User" },
										},
									},
								},
							},
						},
					},
				},
				components: {
					schemas: {
						User: {
							type: "object",
							required: ["id", "name"],
							properties: {
								id: { type: "string" },
								name: { type: "string" },
								email: { type: "string", format: "email" },
							},
						},
						CreateUser: {
							type: "object",
							required: ["name"],
							properties: {
								name: { type: "string" },
								email: { type: "string", format: "email" },
							},
						},
					},
				},
			};

			const fileContent = {
				content: complexDoc,
				filePath: "test",
				format: "json" as const,
			};
			const result = await Effect.runPromise(
				validateOpenApiDocument(fileContent),
			);
			expect(result.isValid).toBe(true);
		});
	});
});
