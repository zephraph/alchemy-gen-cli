import { describe, expect, it } from "bun:test";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either } from "effect";
import { parseOpenApiSpec } from "../../src/parser/index.js";

describe("Full OpenAPI Parser Pipeline", () => {
	describe("parseOpenApiSpec integration", () => {
		it("should parse a complete valid OpenAPI specification", async () => {
			// TODO: Use fixture file for integration test
			// const result = await Effect.runPromise(
			// 	parseOpenApiSpec("./tests/fixtures/valid-specs/petstore.yaml").pipe(
			// 		Effect.provide(TestLayer),
			// 		Effect.either
			// 	)
			// );
			//
			// expect(Effect.isRight(result)).toBe(true);
			// if (Effect.isRight(result)) {
			// 	const parsedData = result.right;
			// 	expect(parsedData.info.title).toBeDefined();
			// 	expect(parsedData.paths.length).toBeGreaterThan(0);
			// }
		});

		it("should handle complex OpenAPI specifications with references", async () => {
			// TODO: Test with OpenAPI spec that has internal references
		});

		it("should validate and reject malformed specifications", async () => {
			// TODO: Test with invalid OpenAPI spec from fixtures
		});

		it("should provide detailed error reporting for parsing failures", async () => {
			// TODO: Test error handling with various types of invalid specs
		});

		it("should handle large OpenAPI specifications efficiently", async () => {
			// TODO: Performance test with large spec
		});

		it("should respect security settings for external references", async () => {
			// TODO: Test with spec containing external references
		});
	});

	describe("error propagation", () => {
		it("should propagate file reading errors", async () => {
			const result = await Effect.runPromise(
				parseOpenApiSpec("/nonexistent/file.yaml").pipe(
					Effect.provide(NodeFileSystem.layer),
					Effect.either,
				),
			);

			expect(Either.isLeft(result)).toBe(true);
			if (Either.isLeft(result)) {
				expect(result.left.message).toContain("does not exist");
			}
		});

		it("should propagate validation errors", async () => {
			// TODO: Test with invalid spec fixture
		});

		it("should propagate reference resolution errors", async () => {
			// TODO: Test with spec having broken references
		});
	});

	describe("strict vs lenient parsing modes", () => {
		it("should fail in strict mode for validation errors", async () => {
			// TODO: Test strict mode behavior
		});

		it("should continue in lenient mode despite minor issues", async () => {
			// TODO: Test lenient mode behavior
		});
	});
});
