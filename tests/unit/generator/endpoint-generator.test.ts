import { describe, expect, it } from "bun:test";
import { EndpointGenerator } from "../../../src/generator/endpoint-generator.js";
import type {
	ExtractedOperation,
	ExtractedParameter,
	ExtractedResponse,
} from "../../../src/parser/extractor.js";

describe("EndpointGenerator", () => {
	const generator = new EndpointGenerator();

	describe("generateApiGroup", () => {
		it("should generate an empty API group", () => {
			const result = generator.generateApiGroup("users", "UsersApi", []);

			expect(result).toContain(
				"export class UsersApi extends HttpApiGroup.make('users')",
			);
			expect(result).toContain(".add(");
			expect(result).toContain(") {}");
		});

		it("should generate API group with operations", () => {
			const operations: ExtractedOperation[] = [
				{
					method: "GET",
					path: "/users",
					operationId: "getUsers",
					summary: "Get all users",
					tags: ["users"],
					parameters: [],
					responses: [
						{
							statusCode: 200,
							description: "Success",
							content: [],
							headers: [],
						},
					],
					security: [],
				},
			];

			const result = generator.generateApiGroup(
				"users",
				"UsersApi",
				operations,
			);

			expect(result).toContain(
				"export class UsersApi extends HttpApiGroup.make('users')",
			);
			expect(result).toContain("HttpApiEndpoint.get('getUsers', '/users')");
			expect(result).toContain(
				'OpenApi.annotations({\n        title: "Get all users"',
			);
		});
	});

	describe("generateEndpoint", () => {
		it("should generate basic GET endpoint", () => {
			const operation: ExtractedOperation = {
				method: "GET",
				path: "/users",
				operationId: "getUsers",
				summary: "Get all users",
				description: "Retrieve a list of all users",
				tags: ["users"],
				parameters: [],
				responses: [
					{
						statusCode: 200,
						description: "Success",
						content: [],
						headers: [],
					},
				],
				security: [],
			};

			const result = generator.generateEndpoint(operation);

			expect(result).toContain("HttpApiEndpoint.get('getUsers', '/users')");
			expect(result).toContain('title: "Get all users"');
			expect(result).toContain('description: "Retrieve a list of all users"');
		});

		it("should generate POST endpoint with request body", () => {
			const operation: ExtractedOperation = {
				method: "POST",
				path: "/users",
				operationId: "createUser",
				summary: "Create user",
				tags: ["users"],
				parameters: [],
				requestBody: {
					description: "User data",
					required: true,
					content: [
						{
							mediaType: "application/json",
							schema: { $ref: "#/components/schemas/CreateUser" },
						},
					],
				},
				responses: [
					{
						statusCode: 201,
						description: "Created",
						content: [],
						headers: [],
					},
					{
						statusCode: 400,
						description: "Bad Request",
						content: [],
						headers: [],
					},
				],
				security: [],
			};

			const result = generator.generateEndpoint(operation);

			expect(result).toContain("HttpApiEndpoint.post('createUser', '/users')");
			expect(result).toContain(".setPayload(S.CreateUser)");
			expect(result).toContain(".addError(HttpApiError.make('400', S.String))");
		});

		it("should generate endpoint with path parameters", () => {
			const operation: ExtractedOperation = {
				method: "GET",
				path: "/users/{id}",
				operationId: "getUserById",
				summary: "Get user by ID",
				tags: ["users"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						description: "User ID",
						schema: { type: "string" },
					},
				],
				responses: [
					{
						statusCode: 200,
						description: "Success",
						content: [],
						headers: [],
					},
					{
						statusCode: 404,
						description: "Not Found",
						content: [],
						headers: [],
					},
				],
				security: [],
			};

			const result = generator.generateEndpoint(operation);

			expect(result).toContain(
				"HttpApiEndpoint.get('getUserById', '/users/{id}')",
			);
			expect(result).toContain(".setPath(S.Struct({");
			expect(result).toContain("id: S.String.annotations({");
			expect(result).toContain('description: "User ID"');
			expect(result).toContain(".addError(HttpApiError.make('404', S.String))");
		});

		it("should generate endpoint with query parameters", () => {
			const operation: ExtractedOperation = {
				method: "GET",
				path: "/users",
				operationId: "searchUsers",
				summary: "Search users",
				tags: ["users"],
				parameters: [
					{
						name: "q",
						in: "query",
						required: false,
						description: "Search query",
						schema: { type: "string" },
					},
					{
						name: "limit",
						in: "query",
						required: false,
						description: "Page limit",
						schema: { type: "integer" },
					},
				],
				responses: [
					{
						statusCode: 200,
						description: "Success",
						content: [],
						headers: [],
					},
				],
				security: [],
			};

			const result = generator.generateEndpoint(operation);

			expect(result).toContain("HttpApiEndpoint.get('searchUsers', '/users')");
			expect(result).toContain(".setUrlParams(S.Struct({");
			expect(result).toContain("q: S.optional(S.String)");
			expect(result).toContain("limit: S.optional(S.Int)");
		});

		it("should generate endpoint with header parameters", () => {
			const operation: ExtractedOperation = {
				method: "GET",
				path: "/users",
				operationId: "getUsers",
				summary: "Get users",
				tags: ["users"],
				parameters: [
					{
						name: "X-API-Key",
						in: "header",
						required: true,
						description: "API Key",
						schema: { type: "string" },
					},
				],
				responses: [
					{
						statusCode: 200,
						description: "Success",
						content: [],
						headers: [],
					},
				],
				security: [],
			};

			const result = generator.generateEndpoint(operation);

			expect(result).toContain("HttpApiEndpoint.get('getUsers', '/users')");
			expect(result).toContain(".setHeaders(S.Struct({");
			expect(result).toContain("X-API-Key: S.String");
		});
	});

	describe("getHttpMethod", () => {
		it("should map HTTP methods correctly", () => {
			expect(generator.getHttpMethod("GET")).toBe("get");
			expect(generator.getHttpMethod("POST")).toBe("post");
			expect(generator.getHttpMethod("PUT")).toBe("put");
			expect(generator.getHttpMethod("PATCH")).toBe("patch");
			expect(generator.getHttpMethod("DELETE")).toBe("del");
			expect(generator.getHttpMethod("HEAD")).toBe("head");
			expect(generator.getHttpMethod("OPTIONS")).toBe("options");
		});

		it("should default to 'get' for unknown methods", () => {
			expect(generator.getHttpMethod("UNKNOWN")).toBe("get");
		});
	});

	describe("getEndpointName", () => {
		it("should use operationId when available", () => {
			const operation: ExtractedOperation = {
				method: "GET",
				path: "/users",
				operationId: "getAllUsers",
				tags: [],
				parameters: [],
				responses: [],
				security: [],
			};

			expect(generator.getEndpointName(operation)).toBe("getAllUsers");
		});

		it("should generate name from method and path when operationId is missing", () => {
			const operation: ExtractedOperation = {
				method: "GET",
				path: "/users/profile",
				tags: [],
				parameters: [],
				responses: [],
				security: [],
			};

			expect(generator.getEndpointName(operation)).toBe("getUsersProfile");
		});

		it("should handle path parameters in name generation", () => {
			const operation: ExtractedOperation = {
				method: "GET",
				path: "/users/{id}/posts/{postId}",
				tags: [],
				parameters: [],
				responses: [],
				security: [],
			};

			expect(generator.getEndpointName(operation)).toBe("getUsersPosts");
		});
	});

	describe("getSuccessResponse", () => {
		it("should find 200 response", () => {
			const responses: ExtractedResponse[] = [
				{
					statusCode: 200,
					description: "Success",
					schema: { $ref: "#/components/schemas/User" },
					content: [],
					headers: [],
				},
				{
					statusCode: 404,
					description: "Not Found",
					content: [],
					headers: [],
				},
			];

			const result = generator.getSuccessResponse(responses);
			expect(result).toBe("S.User");
		});

		it("should find first 2xx response", () => {
			const responses: ExtractedResponse[] = [
				{
					statusCode: 201,
					description: "Created",
					schema: { type: "string" },
					content: [],
					headers: [],
				},
			];

			const result = generator.getSuccessResponse(responses);
			expect(result).toBe("S.String");
		});

		it("should return null when no success response found", () => {
			const responses: ExtractedResponse[] = [
				{
					statusCode: 400,
					description: "Bad Request",
					content: [],
					headers: [],
				},
			];

			const result = generator.getSuccessResponse(responses);
			expect(result).toBeNull();
		});
	});

	describe("getErrorResponses", () => {
		it("should extract error responses", () => {
			const responses: ExtractedResponse[] = [
				{
					statusCode: 200,
					description: "Success",
					content: [],
					headers: [],
				},
				{
					statusCode: 400,
					description: "Bad Request",
					schema: { type: "object" },
					content: [],
					headers: [],
				},
				{
					statusCode: 404,
					description: "Not Found",
					content: [],
					headers: [],
				},
			];

			const result = generator.getErrorResponses(responses);
			expect(result).toHaveLength(2);
			expect(result[0]).toContain("HttpApiError.make('400'");
			expect(result[1]).toContain("HttpApiError.make('404'");
		});
	});

	describe("categorizeParameters", () => {
		it("should categorize parameters by location", () => {
			const parameters: ExtractedParameter[] = [
				{
					name: "id",
					in: "path",
					required: true,
					schema: { type: "string" },
				},
				{
					name: "q",
					in: "query",
					required: false,
					schema: { type: "string" },
				},
				{
					name: "Authorization",
					in: "header",
					required: true,
					schema: { type: "string" },
				},
			];

			const result = generator.categorizeParameters(parameters);

			expect(result.pathParams).toHaveLength(1);
			expect(result.pathParams[0]?.name).toBe("id");
			expect(result.queryParams).toHaveLength(1);
			expect(result.queryParams[0]?.name).toBe("q");
			expect(result.headerParams).toHaveLength(1);
			expect(result.headerParams[0]?.name).toBe("Authorization");
		});
	});

	describe("toPascalCase", () => {
		it("should convert strings to PascalCase", () => {
			expect(generator.toPascalCase("user")).toBe("User");
			expect(generator.toPascalCase("user-profile")).toBe("UserProfile");
			expect(generator.toPascalCase("createUser")).toBe("CreateUser");
			expect(generator.toPascalCase("CreateUser")).toBe("CreateUser");
		});
	});

	describe("toKebabCase", () => {
		it("should convert strings to kebab-case", () => {
			expect(generator.toKebabCase("User")).toBe("user");
			expect(generator.toKebabCase("UserProfile")).toBe("user-profile");
			expect(generator.toKebabCase("APIKey")).toBe("apikey");
		});
	});
});
