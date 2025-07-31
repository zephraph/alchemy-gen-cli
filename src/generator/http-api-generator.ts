import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Effect } from "effect";
import type { ExtractedApiData } from "../parser/extractor.js";
import { EndpointGenerator } from "./endpoint-generator.js";
import type { GenerationOptions } from "./index.js";
import { SchemaGenerator } from "./schema-generator.js";

export class HttpApiGenerator {
	private readonly schemaGenerator: SchemaGenerator;
	private readonly endpointGenerator: EndpointGenerator;

	constructor(
		private readonly apiData: ExtractedApiData,
		private readonly options: GenerationOptions,
	) {
		this.schemaGenerator = new SchemaGenerator(apiData);
		this.endpointGenerator = new EndpointGenerator();
	}

	generate(): Effect.Effect<void, Error, never> {
		return Effect.gen(
			function* (this: HttpApiGenerator) {
				// Ensure output directory exists
				yield* Effect.tryPromise({
					try: () => fs.mkdir(this.options.outputDir, { recursive: true }),
					catch: (error) =>
						new Error(`Failed to create output directory: ${error}`),
				});

				// Generate schema types
				const schemasFile = this.generateSchemasFile();
				yield* this.writeFile("schemas.ts", schemasFile);

				// Generate API endpoints grouped by tags
				const apiGroups = this.groupOperationsByTag();

				for (const [tag, operations] of apiGroups) {
					const apiFile = this.generateApiGroupFile(tag, operations);
					const fileName = this.getApiGroupFileName(tag);
					yield* this.writeFile(fileName, apiFile);
				}

				// Generate main API index file
				const indexFile = this.generateIndexFile(Array.from(apiGroups.keys()));
				yield* this.writeFile("index.ts", indexFile);
			}.bind(this),
		);
	}

	private generateSchemasFile(): string {
		// Add standard imports
		const imports = `import { Schema as S } from "@effect/schema";`;

		// Generate all schemas
		const schemaCode = this.schemaGenerator.generateAllSchemas();

		return `${imports}\n\n${schemaCode}`;
	}

	private generateApiGroupFile(tag: string, operations: any[]): string {
		const className = this.getApiGroupClassName(tag);

		// Add imports
		const imports = `import { HttpApiGroup, HttpApiEndpoint, HttpApiError, OpenApi } from "@effect/platform";
import * as S from "./schemas.js";`;

		// Generate the API group class
		const groupCode = this.endpointGenerator.generateApiGroup(
			tag,
			className,
			operations,
		);

		return `${imports}\n\n${groupCode}`;
	}

	private generateIndexFile(tags: string[]): string {
		// Add imports for all API groups
		const groupImports = tags
			.map((tag) => {
				const className = this.getApiGroupClassName(tag);
				const fileName = this.getApiGroupFileName(tag);
				return `import { ${className} } from "./${fileName.replace(".ts", ".js")}";`;
			})
			.join("\n");

		// Export all schemas
		const schemaExport = `export * from "./schemas.js";`;

		// Create and export the main API class
		const apiName = this.getMainApiName();
		const mainApiCode = this.generateMainApiClass(apiName, tags);

		return `import { HttpApi } from "@effect/platform";
${groupImports}

${schemaExport}

${mainApiCode}`;
	}

	private generateMainApiClass(apiName: string, tags: string[]): string {
		const groupInstances = tags
			.map((tag) => `new ${this.getApiGroupClassName(tag)}()`)
			.join(",\n    ");

		return `export class ${apiName} extends HttpApi.empty.addGroup(
  ${groupInstances}
) {}`;
	}

	private groupOperationsByTag(): Map<string, any[]> {
		const groups = new Map<string, any[]>();

		for (const pathItem of this.apiData.paths) {
			for (const operation of pathItem.operations) {
				const tag = operation.tags[0] || "default";
				if (!groups.has(tag)) {
					groups.set(tag, []);
				}
				groups.get(tag)?.push({
					...operation,
					path: pathItem.path,
				});
			}
		}

		return groups;
	}

	private getApiGroupClassName(tag: string): string {
		return `${this.toPascalCase(tag)}Api`;
	}

	private getApiGroupFileName(tag: string): string {
		return `${this.toKebabCase(tag)}-api.ts`;
	}

	private getMainApiName(): string {
		return `${this.toPascalCase(this.apiData.info.title)}Api`;
	}

	private toPascalCase(str: string): string {
		// Handle camelCase and PascalCase by preserving existing capitals
		return str
			.replace(/([a-z])([A-Z])/g, "$1 $2") // Split camelCase: "createUser" -> "create User"
			.split(/[-_\s]+/) // Split on delimiters
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join("");
	}

	private toKebabCase(str: string): string {
		return str
			.replace(/([a-z])([A-Z])/g, "$1-$2")
			.replace(/[\s_]+/g, "-")
			.toLowerCase();
	}

	private writeFile(
		fileName: string,
		content: string,
	): Effect.Effect<void, Error, never> {
		const filePath = path.join(this.options.outputDir, fileName);

		return Effect.tryPromise({
			try: () => fs.writeFile(filePath, content, "utf8"),
			catch: (error) => new Error(`Failed to write file ${fileName}: ${error}`),
		});
	}
}
