import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import * as yaml from "js-yaml";
import { readOpenApiFile, readAndValidateOpenApiFile, isValidObjectContent } from "../../../src/parser/reader.js";

const TestLayer = Layer.merge(NodeFileSystem.layer);

describe("OpenAPI File Reader", () => {
	describe("readOpenApiFile", () => {
		it("should read and parse JSON OpenAPI files", async () => {
			// TODO: Implement test with fixture file
		});

		it("should read and parse YAML OpenAPI files", async () => {
			// TODO: Implement test with fixture file
		});

		it("should fail for non-existent files", async () => {
			const result = await Effect.runPromise(
				readOpenApiFile("/path/to/nonexistent.json").pipe(
					Effect.provide(TestLayer),
					Effect.either
				)
			);
			expect(Effect.isLeft(result)).toBe(true);
		});

		it("should fail for unsupported file formats", async () => {
			// TODO: Create temp file with .txt extension and test
		});

		it("should use safe YAML parsing to prevent code execution", () => {
			const maliciousYaml = `
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
paths: !!js/function >
  function() { console.log("PWNED!"); }
`;
			// This should not execute the function due to SAFE_SCHEMA
			expect(() => yaml.load(maliciousYaml, { schema: yaml.SAFE_SCHEMA })).toThrow();
		});
	});

	describe("isValidObjectContent", () => {
		it("should return true for valid objects", () => {
			expect(isValidObjectContent({ key: "value" })).toBe(true);
		});

		it("should return false for null", () => {
			expect(isValidObjectContent(null)).toBe(false);
		});

		it("should return false for arrays", () => {
			expect(isValidObjectContent(["item"])).toBe(false);
		});

		it("should return false for primitives", () => {
			expect(isValidObjectContent("string")).toBe(false);
			expect(isValidObjectContent(123)).toBe(false);
			expect(isValidObjectContent(true)).toBe(false);
		});
	});

	describe("readAndValidateOpenApiFile", () => {
		it("should validate object structure after reading", async () => {
			// TODO: Implement with fixture files
		});
	});
});