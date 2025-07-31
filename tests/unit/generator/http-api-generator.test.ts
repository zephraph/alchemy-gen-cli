import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Effect } from "effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { HttpApiGenerator } from "../../../src/generator/http-api-generator.js";
import type { ExtractedApiData, GenerationOptions } from "../../../src/generator/index.js";

describe("HttpApiGenerator", () => {
	const testOutputDir = path.join(process.cwd(), "test-output-generator");
	
	const mockApiData: ExtractedApiData = {
		info: { title: "Test API", version: "1.0.0", description: "Test API description" },
		servers: [],
		paths: [
			{
				path: "/users",
				operations: [
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
					{
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
						],
						security: [],
					},
				],
				parameters: [],
			},
			{
				path: "/products",
				operations: [
					{
						method: "GET",
						path: "/products",
						operationId: "getProducts",
						summary: "Get all products",
						tags: ["products"],
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
				],
				parameters: [],
			},
		],
		components: {
			schemas: {
				User: {
					type: "object",
					properties: {
						id: { type: "string", description: "User ID" },
						name: { type: "string", description: "User name" },
						email: { type: "string", format: "email", description: "User email" },
					},
					required: ["id", "name"],
				},
				CreateUser: {
					type: "object",
					properties: {
						name: { type: "string", description: "User name" },
						email: { type: "string", format: "email", description: "User email" },
					},
					required: ["name"],
				},
			},
			responses: {},
			parameters: {},
			requestBodies: {},
		},
		security: [],
		tags: [
			{ name: "users", description: "User operations" },
			{ name: "products", description: "Product operations" },
		],
	};

	const options: GenerationOptions = {
		outputDir: testOutputDir,
		moduleName: "TestApi",
		includeExamples: true,
	};

	beforeEach(async () => {
		// Clean up test directory
		try {
			await fs.rm(testOutputDir, { recursive: true, force: true });
		} catch {
			// Directory doesn't exist, that's fine
		}
	});

	afterEach(async () => {
		// Clean up test directory
		try {
			await fs.rm(testOutputDir, { recursive: true, force: true });
		} catch {
			// Directory doesn't exist, that's fine
		}
	});

	describe("generate", () => {
		it("should generate all required files", async () => {
			const generator = new HttpApiGenerator(mockApiData, options);
			
			await Effect.runPromise(generator.generate());

			// Check that all expected files are created
			const files = await fs.readdir(testOutputDir);
			expect(files).toContain("schemas.ts");
			expect(files).toContain("users-api.ts");
			expect(files).toContain("products-api.ts");
			expect(files).toContain("index.ts");
		});

		it("should generate schemas file with correct content", async () => {
			const generator = new HttpApiGenerator(mockApiData, options);
			
			await Effect.runPromise(generator.generate());

			const schemasContent = await fs.readFile(
				path.join(testOutputDir, "schemas.ts"),
				"utf8"
			);

			expect(schemasContent).toContain('import { Schema as S } from "@effect/schema";');
			expect(schemasContent).toContain("export const User = S.Struct({");
			expect(schemasContent).toContain("export const CreateUser = S.Struct({");
			expect(schemasContent).toContain("id: S.String");
			expect(schemasContent).toContain("name: S.String");
			expect(schemasContent).toContain("email: S.optional(S.Email)");
		});

		it("should generate API group files with correct content", async () => {
			const generator = new HttpApiGenerator(mockApiData, options);
			
			await Effect.runPromise(generator.generate());

			const usersApiContent = await fs.readFile(
				path.join(testOutputDir, "users-api.ts"),
				"utf8"
			);

			expect(usersApiContent).toContain('import { HttpApiGroup, HttpApiEndpoint, HttpApiError, OpenApi } from "@effect/platform";');
			expect(usersApiContent).toContain('import * as S from "./schemas.js";');
			expect(usersApiContent).toContain("export class UsersApi extends HttpApiGroup.make('users')");
			expect(usersApiContent).toContain("HttpApiEndpoint.get('getUsers', '/users')");
			expect(usersApiContent).toContain("HttpApiEndpoint.post('createUser', '/users')");
		});

		it("should generate index file with correct content", async () => {
			const generator = new HttpApiGenerator(mockApiData, options);
			
			await Effect.runPromise(generator.generate());

			const indexContent = await fs.readFile(
				path.join(testOutputDir, "index.ts"),
				"utf8"
			);

			expect(indexContent).toContain('import { HttpApi } from "@effect/platform";');
			expect(indexContent).toContain('import { UsersApi } from "./users-api.js";');
			expect(indexContent).toContain('import { ProductsApi } from "./products-api.js";');
			expect(indexContent).toContain('export * from "./schemas.js";');
			expect(indexContent).toContain("export class TestAPIApi extends HttpApi.empty.addGroup(");
			expect(indexContent).toContain("new UsersApi()");
			expect(indexContent).toContain("new ProductsApi()");
		});

		it("should handle empty API data", async () => {
			const emptyApiData: ExtractedApiData = {
				info: { title: "Empty API", version: "1.0.0" },
				servers: [],
				paths: [],
				components: {
					schemas: {},
					responses: {},
					parameters: {},
					requestBodies: {},
				},
				security: [],
				tags: [],
			};

			const generator = new HttpApiGenerator(emptyApiData, options);
			
			await Effect.runPromise(generator.generate());

			// Should still create basic files
			const files = await fs.readdir(testOutputDir);
			expect(files).toContain("schemas.ts");
			expect(files).toContain("index.ts");
		});

		it("should create output directory if it doesn't exist", async () => {
			const deepOutputDir = path.join(testOutputDir, "nested", "deep", "path");
			const deepOptions: GenerationOptions = {
				...options,
				outputDir: deepOutputDir,
			};

			const generator = new HttpApiGenerator(mockApiData, deepOptions);
			
			await Effect.runPromise(generator.generate());

			// Check that the deep directory structure was created
			const files = await fs.readdir(deepOutputDir);
			expect(files).toContain("schemas.ts");
			expect(files).toContain("index.ts");
		});
	});

	describe("groupOperationsByTag", () => {
		it("should group operations by their first tag", () => {
			const generator = new HttpApiGenerator(mockApiData, options);
			const groups = generator["groupOperationsByTag"]();

			expect(groups.has("users")).toBe(true);
			expect(groups.has("products")).toBe(true);
			expect(groups.get("users")).toHaveLength(2); // GET and POST /users
			expect(groups.get("products")).toHaveLength(1); // GET /products
		});

		it("should use 'default' tag for operations without tags", () => {
			const apiDataWithoutTags: ExtractedApiData = {
				...mockApiData,
				paths: [
					{
						path: "/health",
						operations: [
							{
								method: "GET",
								path: "/health",
								operationId: "getHealth",
								summary: "Health check",
								tags: [], // No tags
								parameters: [],
								responses: [],
								security: [],
							},
						],
						parameters: [],
					},
				],
			};

			const generator = new HttpApiGenerator(apiDataWithoutTags, options);
			const groups = generator["groupOperationsByTag"]();

			expect(groups.has("default")).toBe(true);
			expect(groups.get("default")).toHaveLength(1);
		});
	});

	describe("utility methods", () => {
		const generator = new HttpApiGenerator(mockApiData, options);

		it("should generate correct API group class names", () => {
			expect(generator["getApiGroupClassName"]("users")).toBe("UsersApi");
			expect(generator["getApiGroupClassName"]("user-profile")).toBe("UserProfileApi");
			expect(generator["getApiGroupClassName"]("API_KEYS")).toBe("APIKEYSApi");
		});

		it("should generate correct API group file names", () => {
			expect(generator["getApiGroupFileName"]("users")).toBe("users-api.ts");
			expect(generator["getApiGroupFileName"]("UserProfile")).toBe("user-profile-api.ts");
			expect(generator["getApiGroupFileName"]("API_KEYS")).toBe("api-keys-api.ts");
		});

		it("should generate correct main API name", () => {
			expect(generator["getMainApiName"]()).toBe("TestAPIApi");
		});

		it("should convert strings to PascalCase", () => {
			expect(generator["toPascalCase"]("test api")).toBe("TestApi");
			expect(generator["toPascalCase"]("user-profile")).toBe("UserProfile");
			expect(generator["toPascalCase"]("createUser")).toBe("CreateUser");
		});

		it("should convert strings to kebab-case", () => {
			expect(generator["toKebabCase"]("TestAPI")).toBe("test-api");
			expect(generator["toKebabCase"]("UserProfile")).toBe("user-profile");
			expect(generator["toKebabCase"]("API_KEYS")).toBe("api-keys");
		});
	});
});