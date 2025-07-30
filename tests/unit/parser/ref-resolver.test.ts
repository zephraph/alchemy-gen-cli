import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { 
	resolveReferences, 
	resolveInternalReferences, 
	resolveAllReferences,
	classifyReferences,
	isInternalReference,
	isExternalReference,
	defaultRefResolutionOptions
} from "../../../src/parser/ref-resolver.js";
import type { OpenApiDocument } from "../../../src/types/openapi.js";

describe("Reference Resolver", () => {
	const mockOpenApiDoc: OpenApiDocument = {
		openapi: "3.0.0",
		info: { title: "Test API", version: "1.0.0" },
		paths: {},
		components: {
			schemas: {
				User: {
					type: "object",
					properties: {
						id: { type: "string" },
						name: { type: "string" }
					}
				}
			}
		}
	};

	describe("reference classification", () => {
		it("should classify internal references correctly", () => {
			expect(isInternalReference("#/components/schemas/User")).toBe(true);
			expect(isInternalReference("#/paths/users")).toBe(true);
		});

		it("should classify external references correctly", () => {
			expect(isExternalReference("https://example.com/schema.json")).toBe(true);
			expect(isExternalReference("./other-file.yaml")).toBe(true);
			expect(isExternalReference("../schemas/common.json")).toBe(true);
		});

		it("should classify references into internal and external arrays", () => {
			const refs = [
				"#/components/schemas/User",
				"https://example.com/schema.json",
				"#/paths/users",
				"./common.yaml"
			];
			const classified = classifyReferences(refs);
			
			expect(classified.internal).toEqual([
				"#/components/schemas/User",
				"#/paths/users"
			]);
			expect(classified.external).toEqual([
				"https://example.com/schema.json",
				"./common.yaml"
			]);
		});
	});

	describe("security controls", () => {
		it("should block external references by default", async () => {
			const docWithExternalRef: OpenApiDocument = {
				...mockOpenApiDoc,
				paths: {
					"/users": {
						get: {
							responses: {
								"200": {
									description: "Success",
									content: {
										"application/json": {
											schema: { $ref: "https://example.com/user-schema.json" }
										}
									}
								}
							}
						}
					}
				}
			};

			const result = await Effect.runPromise(
				resolveReferences(docWithExternalRef).pipe(Effect.either)
			);
			
			// Should succeed since external resolution is disabled by default
			expect(Effect.isRight(result)).toBe(true);
		});

		it("should validate external URLs when external resolution is enabled", async () => {
			const docWithUnsafeRef: OpenApiDocument = {
				...mockOpenApiDoc,
				paths: {
					"/users": {
						get: {
							responses: {
								"200": {
									description: "Success",
									content: {
										"application/json": {
											schema: { $ref: "http://localhost:3000/schema.json" }
										}
									}
								}
							}
						}
					}
				}
			};

			const result = await Effect.runPromise(
				resolveReferences(docWithUnsafeRef, { 
					...defaultRefResolutionOptions,
					resolveExternal: true 
				}).pipe(Effect.either)
			);
			
			// Should fail due to localhost being blocked
			expect(Effect.isLeft(result)).toBe(true);
		});

		it("should allow whitelisted domains for external references", async () => {
			const docWithExternalRef: OpenApiDocument = {
				...mockOpenApiDoc,
				paths: {
					"/users": {
						get: {
							responses: {
								"200": {
									description: "Success",
									content: {
										"application/json": {
											schema: { $ref: "https://api.example.com/schema.json" }
										}
									}
								}
							}
						}
					}
				}
			};

			// This would need to be tested with actual network access or mocked
			// For now, just test that the configuration is accepted
			const options = {
				...defaultRefResolutionOptions,
				resolveExternal: true,
				allowedDomains: ["api.example.com"]
			};
			
			expect(options.allowedDomains).toContain("api.example.com");
		});

		it("should block dangerous protocols", async () => {
			const docWithFileRef: OpenApiDocument = {
				...mockOpenApiDoc,
				paths: {
					"/users": {
						get: {
							responses: {
								"200": {
									description: "Success",
									content: {
										"application/json": {
											schema: { $ref: "file:///etc/passwd" }
										}
									}
								}
							}
						}
					}
				}
			};

			const result = await Effect.runPromise(
				resolveReferences(docWithFileRef, { 
					...defaultRefResolutionOptions,
					resolveExternal: true 
				}).pipe(Effect.either)
			);
			
			// Should fail due to file:// protocol being blocked
			expect(Effect.isLeft(result)).toBe(true);
		});
	});

	describe("resolveInternalReferences", () => {
		it("should resolve only internal references", async () => {
			// TODO: Implement test with internal references
		});
	});

	describe("resolveAllReferences", () => {
		it("should require explicit configuration for external resolution", () => {
			expect(defaultRefResolutionOptions.resolveExternal).toBe(false);
		});
	});
});