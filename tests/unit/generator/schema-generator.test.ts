import { describe, expect, it } from "bun:test";
import { SchemaGenerator } from "../../../src/generator/schema-generator.js";
import type {
	ExtractedApiData,
	ExtractedSchema,
} from "../../../src/parser/extractor.js";

describe("SchemaGenerator", () => {
	const mockApiData: ExtractedApiData = {
		info: { title: "Test API", version: "1.0.0" },
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

	describe("generateAllSchemas", () => {
		it("should generate empty output when no schemas exist", () => {
			const generator = new SchemaGenerator(mockApiData);
			const result = generator.generateAllSchemas();

			expect(result).toBe("");
		});

		it("should generate multiple schemas", () => {
			const apiDataWithSchemas: ExtractedApiData = {
				...mockApiData,
				components: {
					...mockApiData.components,
					schemas: {
						User: {
							type: "object",
							properties: {
								id: { type: "string" },
								name: { type: "string" },
							},
							required: ["id", "name"],
						},
						Product: {
							type: "object",
							properties: {
								title: { type: "string" },
								price: { type: "number" },
							},
						},
					},
				},
			};

			const generator = new SchemaGenerator(apiDataWithSchemas);
			const result = generator.generateAllSchemas();

			expect(result).toContain("export const User = S.Struct({");
			expect(result).toContain("export const Product = S.Struct({");
			expect(result).toContain("id: S.String");
			expect(result).toContain("name: S.String");
			expect(result).toContain("title: S.optional(S.String)");
			expect(result).toContain("price: S.optional(S.Number)");
		});
	});

	describe("generateSchema", () => {
		const generator = new SchemaGenerator(mockApiData);

		it("should generate object schema with required fields", () => {
			const schema: ExtractedSchema = {
				type: "object",
				properties: {
					id: { type: "string", description: "User ID" },
					name: { type: "string", description: "Full name" },
					email: { type: "string", format: "email" },
				},
				required: ["id", "name"],
			};

			const result = generator.generateSchema("User", schema);

			expect(result).toContain("export const User = S.Struct({");
			expect(result).toContain("id: S.String.annotations({");
			expect(result).toContain('description: "User ID"');
			expect(result).toContain("name: S.String.annotations({");
			expect(result).toContain('description: "Full name"');
			expect(result).toContain("email: S.optional(S.Email)");
			expect(result).toContain("});");
		});

		it("should generate array schema", () => {
			const schema: ExtractedSchema = {
				type: "array",
				items: { type: "string" },
				description: "List of tags",
			};

			const result = generator.generateSchema("Tags", schema);

			expect(result).toContain("export const Tags = S.Array(S.String)");
			expect(result).toContain('description: "List of tags"');
		});

		it("should generate enum schema", () => {
			const schema: ExtractedSchema = {
				type: "string",
				enum: ["active", "inactive", "pending"],
				description: "User status",
			};

			const result = generator.generateSchema("UserStatus", schema);

			expect(result).toContain(
				'export const UserStatus = S.Literal("active", "inactive", "pending")',
			);
			expect(result).toContain('description: "User status"');
		});

		it("should generate primitive schema with format", () => {
			const schema: ExtractedSchema = {
				type: "string",
				format: "date-time",
				description: "Creation timestamp",
			};

			const result = generator.generateSchema("CreatedAt", schema);

			expect(result).toContain("export const CreatedAt = S.DateTimeString");
			expect(result).toContain('description: "Creation timestamp"');
		});

		it("should handle schema with validation constraints", () => {
			const schema: ExtractedSchema = {
				type: "string",
				minLength: 3,
				maxLength: 50,
				pattern: "^[a-zA-Z]+$",
				description: "Username",
			};

			const result = generator.generateSchema("Username", schema);

			expect(result).toContain("export const Username = S.String");
			expect(result).toContain("minLength: 3");
			expect(result).toContain("maxLength: 50");
			expect(result).toContain('pattern: "^[a-zA-Z]+$"');
			expect(result).toContain('description: "Username"');
		});
	});

	describe("getSchemaType", () => {
		const generator = new SchemaGenerator(mockApiData);

		it("should map string types correctly", () => {
			expect(generator.getSchemaType({ type: "string" })).toBe("S.String");
			expect(generator.getSchemaType({ type: "string", format: "email" })).toBe(
				"S.Email",
			);
			expect(
				generator.getSchemaType({ type: "string", format: "date-time" }),
			).toBe("S.DateTimeString");
			expect(generator.getSchemaType({ type: "string", format: "date" })).toBe(
				"S.DateString",
			);
			expect(generator.getSchemaType({ type: "string", format: "uuid" })).toBe(
				"S.UUID",
			);
		});

		it("should map number types correctly", () => {
			expect(generator.getSchemaType({ type: "number" })).toBe("S.Number");
			expect(generator.getSchemaType({ type: "integer" })).toBe("S.Int");
		});

		it("should map boolean type correctly", () => {
			expect(generator.getSchemaType({ type: "boolean" })).toBe("S.Boolean");
		});

		it("should handle array types", () => {
			expect(
				generator.getSchemaType({ type: "array", items: { type: "string" } }),
			).toBe("S.Array(S.String)");
		});

		it("should handle reference types", () => {
			expect(
				generator.getSchemaType({ $ref: "#/components/schemas/User" }),
			).toBe("User");
		});
	});

	describe("toPascalCase", () => {
		const generator = new SchemaGenerator(mockApiData);

		it("should convert strings to PascalCase", () => {
			expect(generator.toPascalCase("user")).toBe("User");
			expect(generator.toPascalCase("user-profile")).toBe("UserProfile");
			expect(generator.toPascalCase("user_settings")).toBe("UserSettings");
			expect(generator.toPascalCase("createUser")).toBe("CreateUser");
			expect(generator.toPascalCase("CreateUser")).toBe("CreateUser");
			expect(generator.toPascalCase("API_KEY")).toBe("APIKEY");
		});
	});

	describe("generateAnnotations", () => {
		const generator = new SchemaGenerator(mockApiData);

		it("should generate annotations for various schema properties", () => {
			const schema: ExtractedSchema = {
				type: "string",
				description: "Test field",
				example: "example value",
				default: "default value",
				minimum: 1,
				maximum: 100,
				minLength: 5,
				maxLength: 50,
				pattern: "^test.*",
			};

			const result = generator.generateAnnotations(schema);

			expect(result).toContain('description: "Test field"');
			expect(result).toContain('examples: ["example value"]');
			expect(result).toContain('default: "default value"');
			expect(result).toContain("minimum: 1");
			expect(result).toContain("maximum: 100");
			expect(result).toContain("minLength: 5");
			expect(result).toContain("maxLength: 50");
			expect(result).toContain('pattern: "^test.*"');
		});

		it("should return empty string when no annotations exist", () => {
			const schema: ExtractedSchema = { type: "string" };
			const result = generator.generateAnnotations(schema);
			expect(result).toBe("");
		});
	});
});
