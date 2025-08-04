import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import { generateHttpApi } from "../../src/generator/index.js";
import { quickParseOpenApiFile } from "../../src/parser/index.js";

describe("Petstore Example Integration", () => {
	const testOutputDir = path.join(process.cwd(), "test-petstore-output");

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

	it("should successfully parse and generate from petstore.json", async () => {
		const specPath = path.join(process.cwd(), "examples/petstore.json");

		// Parse the OpenAPI spec
		const extractedData = await Effect.runPromise(
			quickParseOpenApiFile(specPath).pipe(Effect.provide(NodeContext.layer)),
		);

		// Verify parsing results
		expect(extractedData.info.title).toBe("Swagger Petstore");
		expect(extractedData.info.version).toBe("1.0.0");
		expect(extractedData.paths).toHaveLength(2);
		expect(extractedData.paths[0]?.operations).toHaveLength(2); // GET and POST /pets
		expect(extractedData.paths[1]?.operations).toHaveLength(1); // GET /pets/{petId}
		expect(Object.keys(extractedData.components.schemas)).toEqual([
			"Pet",
			"Pets",
			"Error",
		]);

		// Generate the HttpApi code
		await Effect.runPromise(
			generateHttpApi(extractedData, {
				outputDir: testOutputDir,
				moduleName: "PetstoreApi",
				includeExamples: true,
			}).pipe(Effect.provide(NodeContext.layer)),
		);

		// Verify all files were created
		const files = await fs.readdir(testOutputDir);
		expect(files).toContain("schemas.ts");
		expect(files).toContain("pets-api.ts");
		expect(files).toContain("index.ts");

		// Verify schemas.ts content
		const schemasContent = await fs.readFile(
			path.join(testOutputDir, "schemas.ts"),
			"utf8",
		);
		expect(schemasContent).toContain(
			'import { Schema as S } from "@effect/schema";',
		);
		expect(schemasContent).toContain("export const Pet = S.Struct({");
		expect(schemasContent).toContain("export const Pets = S.Array(");
		expect(schemasContent).toContain("export const Error = S.Struct({");
		expect(schemasContent).toContain("id: S.Int");
		expect(schemasContent).toContain("name: S.String");
		expect(schemasContent).toContain("tag: S.optional(S.String)");
		expect(schemasContent).toContain("code: S.Int");
		expect(schemasContent).toContain("message: S.String");

		// Verify pets-api.ts content
		const apiContent = await fs.readFile(
			path.join(testOutputDir, "pets-api.ts"),
			"utf8",
		);
		expect(apiContent).toContain(
			'import { HttpApiGroup, HttpApiEndpoint, HttpApiError, OpenApi } from "@effect/platform";',
		);
		expect(apiContent).toContain('import * as S from "./schemas.js";');
		expect(apiContent).toContain(
			"export class PetsApi extends HttpApiGroup.make('pets')",
		);

		// Verify all three operations are present
		expect(apiContent).toContain("HttpApiEndpoint.get('listPets', '/pets')");
		expect(apiContent).toContain("HttpApiEndpoint.post('createPets', '/pets')");
		expect(apiContent).toContain(
			"HttpApiEndpoint.get('showPetById', '/pets/{petId}')",
		);

		// Verify parameters are handled correctly
		expect(apiContent).toContain(".setUrlParams(S.Struct({");
		expect(apiContent).toContain("limit: S.optional(S.Int)");
		expect(apiContent).toContain(
			'description: "How many items to return at one time (max 100)"',
		);
		expect(apiContent).toContain(".setPath(S.Struct({");
		expect(apiContent).toContain("petId: S.String");
		expect(apiContent).toContain(
			'description: "The id of the pet to retrieve"',
		);

		// Verify request body is handled
		expect(apiContent).toContain(".setPayload(");

		// Verify annotations are present
		expect(apiContent).toContain('title: "List all pets"');
		expect(apiContent).toContain('title: "Create a pet"');
		expect(apiContent).toContain('title: "Info for a specific pet"');

		// Verify index.ts content
		const indexContent = await fs.readFile(
			path.join(testOutputDir, "index.ts"),
			"utf8",
		);
		expect(indexContent).toContain(
			'import { HttpApi } from "@effect/platform";',
		);
		expect(indexContent).toContain('import { PetsApi } from "./pets-api.js";');
		expect(indexContent).toContain('export * from "./schemas.js";');
		expect(indexContent).toContain(
			"export class SwaggerPetstoreApi extends HttpApi.empty.addGroup(",
		);
		expect(indexContent).toContain("new PetsApi()");
	});

	it("should handle petstore schema relationships", async () => {
		const specPath = path.join(process.cwd(), "examples/petstore.json");

		const extractedData = await Effect.runPromise(
			quickParseOpenApiFile(specPath).pipe(Effect.provide(NodeContext.layer)),
		);

		// Verify schema relationships are parsed
		const petSchema = extractedData.components.schemas.Pet;
		const petsSchema = extractedData.components.schemas.Pets;
		const errorSchema = extractedData.components.schemas.Error;

		expect(petSchema).toBeDefined();
		expect(petSchema?.type).toBe("object");
		expect(petSchema?.required).toEqual(["id", "name"]);
		expect(petSchema?.properties?.id?.type).toBe("integer");
		expect(petSchema?.properties?.name?.type).toBe("string");
		expect(petSchema?.properties?.tag?.type).toBe("string");

		expect(petsSchema).toBeDefined();
		expect(petsSchema?.type).toBe("array");
		expect(petsSchema?.items).toBeDefined();
		// Note: The reference resolution would be tested here when issue #9 is fixed

		expect(errorSchema).toBeDefined();
		expect(errorSchema?.type).toBe("object");
		expect(errorSchema?.required).toEqual(["code", "message"]);
	});

	it("should handle petstore operations correctly", async () => {
		const specPath = path.join(process.cwd(), "examples/petstore.json");

		const extractedData = await Effect.runPromise(
			quickParseOpenApiFile(specPath).pipe(Effect.provide(NodeContext.layer)),
		);

		// Verify operations structure
		const petsPath = extractedData.paths.find((p) => p.path === "/pets");
		const petByIdPath = extractedData.paths.find(
			(p) => p.path === "/pets/{petId}",
		);

		expect(petsPath).toBeDefined();
		expect(petsPath?.operations).toHaveLength(2);

		const listPetsOp = petsPath?.operations.find(
			(op) => op.operationId === "listPets",
		);
		const createPetsOp = petsPath?.operations.find(
			(op) => op.operationId === "createPets",
		);

		expect(listPetsOp?.method).toBe("GET");
		expect(listPetsOp?.tags).toEqual(["pets"]);
		expect(listPetsOp?.parameters).toHaveLength(1);
		expect(listPetsOp?.parameters[0]?.name).toBe("limit");
		expect(listPetsOp?.parameters[0]?.in).toBe("query");

		expect(createPetsOp?.method).toBe("POST");
		expect(createPetsOp?.requestBody).toBeDefined();
		expect(createPetsOp?.requestBody?.required).toBe(true);

		expect(petByIdPath).toBeDefined();
		expect(petByIdPath?.operations).toHaveLength(1);

		const showPetOp = petByIdPath?.operations[0];
		expect(showPetOp?.operationId).toBe("showPetById");
		expect(showPetOp?.parameters).toHaveLength(1);
		expect(showPetOp?.parameters[0]?.name).toBe("petId");
		expect(showPetOp?.parameters[0]?.in).toBe("path");
		expect(showPetOp?.parameters[0]?.required).toBe(true);
	});
});
