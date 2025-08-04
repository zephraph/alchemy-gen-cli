import { describe, expect, it } from "bun:test";
import { Effect, Either } from "effect";
import { extractApiData } from "../../../src/parser/extractor.js";
import type { OpenApiDocument } from "../../../src/types/openapi.js";

describe("Data Extractor", () => {
	const mockOpenApiDoc: OpenApiDocument = {
		openapi: "3.0.0",
		info: {
			title: "Test API",
			version: "1.0.0",
			description: "A test API",
		},
		paths: {
			"/users": {
				get: {
					summary: "Get all users",
					operationId: "getUsers",
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
					summary: "Create a user",
					operationId: "createUser",
					requestBody: {
						required: true,
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
			"/users/{id}": {
				get: {
					summary: "Get user by ID",
					operationId: "getUserById",
					parameters: [
						{
							name: "id",
							in: "path",
							required: true,
							schema: { type: "string" },
						},
					],
					responses: {
						"200": {
							description: "Success",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/User" },
								},
							},
						},
						"404": {
							description: "Not found",
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

	describe("extractApiData", () => {
		it("should extract basic API information", async () => {
			const result = await Effect.runPromise(
				extractApiData(mockOpenApiDoc).pipe(Effect.either),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const apiData = result.right;
				expect(apiData.info.title).toBe("Test API");
				expect(apiData.info.version).toBe("1.0.0");
				expect(apiData.info.description).toBe("A test API");
			}
		});

		it("should extract all paths and operations", async () => {
			const result = await Effect.runPromise(
				extractApiData(mockOpenApiDoc).pipe(Effect.either),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const apiData = result.right;
				expect(apiData.paths).toHaveLength(2);

				const usersPath = apiData.paths.find((p) => p.path === "/users");
				expect(usersPath).toBeDefined();
				expect(usersPath?.operations).toHaveLength(2);

				const userByIdPath = apiData.paths.find(
					(p) => p.path === "/users/{id}",
				);
				expect(userByIdPath).toBeDefined();
				expect(userByIdPath?.operations).toHaveLength(1);
			}
		});

		it("should extract operation details correctly", async () => {
			const result = await Effect.runPromise(
				extractApiData(mockOpenApiDoc).pipe(Effect.either),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const apiData = result.right;
				const usersPath = apiData.paths.find((p) => p.path === "/users");
				const getOperation = usersPath?.operations.find(
					(op) => op.method === "GET",
				);

				expect(getOperation).toBeDefined();
				expect(getOperation?.operationId).toBe("getUsers");
				expect(getOperation?.summary).toBe("Get all users");
			}
		});

		it("should extract path parameters", async () => {
			const result = await Effect.runPromise(
				extractApiData(mockOpenApiDoc).pipe(Effect.either),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const apiData = result.right;
				const userByIdPath = apiData.paths.find(
					(p) => p.path === "/users/{id}",
				);
				const getOperation = userByIdPath?.operations.find(
					(op) => op.method === "GET",
				);

				expect(getOperation?.parameters).toHaveLength(1);
				expect(getOperation?.parameters[0]?.name).toBe("id");
				expect(getOperation?.parameters[0]?.in).toBe("path");
				expect(getOperation?.parameters[0]?.required).toBe(true);
			}
		});

		it("should extract request body information", async () => {
			const result = await Effect.runPromise(
				extractApiData(mockOpenApiDoc).pipe(Effect.either),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const apiData = result.right;
				const usersPath = apiData.paths.find((p) => p.path === "/users");
				const postOperation = usersPath?.operations.find(
					(op) => op.method === "POST",
				);

				expect(postOperation?.requestBody).toBeDefined();
				expect(postOperation?.requestBody?.required).toBe(true);
			}
		});

		it("should extract response information", async () => {
			const result = await Effect.runPromise(
				extractApiData(mockOpenApiDoc).pipe(Effect.either),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const apiData = result.right;
				const usersPath = apiData.paths.find((p) => p.path === "/users");
				const getOperation = usersPath?.operations.find(
					(op) => op.method === "GET",
				);

				expect(getOperation?.responses).toBeDefined();
				expect(
					getOperation?.responses.find((r) => r.statusCode === 200),
				).toBeDefined();
			}
		});

		it("should extract component schemas", async () => {
			const result = await Effect.runPromise(
				extractApiData(mockOpenApiDoc).pipe(Effect.either),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const apiData = result.right;
				expect(apiData.components.schemas).toBeDefined();
				expect(Object.keys(apiData.components.schemas || {})).toContain("User");
				expect(Object.keys(apiData.components.schemas || {})).toContain(
					"CreateUser",
				);
			}
		});

		it("should handle documents with no components", async () => {
			const docWithoutComponents: OpenApiDocument = {
				openapi: "3.0.0",
				info: { title: "Simple API", version: "1.0.0" },
				paths: {
					"/health": {
						get: {
							summary: "Health check",
							responses: {
								"200": { description: "OK" },
							},
						},
					},
				},
			};

			const result = await Effect.runPromise(
				extractApiData(docWithoutComponents).pipe(Effect.either),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const apiData = result.right;
				expect(apiData.paths).toHaveLength(1);
				expect(apiData.components.schemas).toEqual({});
			}
		});

		it("should handle empty paths object", async () => {
			const docWithEmptyPaths: OpenApiDocument = {
				openapi: "3.0.0",
				info: { title: "Empty API", version: "1.0.0" },
				paths: {},
			};

			const result = await Effect.runPromise(
				extractApiData(docWithEmptyPaths).pipe(Effect.either),
			);

			expect(Either.isRight(result)).toBe(true);
			if (Either.isRight(result)) {
				const apiData = result.right;
				expect(apiData.paths).toHaveLength(0);
			}
		});
	});
});
