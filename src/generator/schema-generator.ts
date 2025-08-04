import type { ExtractedApiData, ExtractedSchema } from "../parser/extractor.js";

export class SchemaGenerator {
	constructor(private readonly apiData: ExtractedApiData) {}

	generateAllSchemas(): string {
		const schemaBlocks: string[] = [];

		// Generate schemas from components
		for (const [name, schema] of Object.entries(
			this.apiData.components.schemas,
		)) {
			const schemaCode = this.generateSchema(name, schema);
			schemaBlocks.push(schemaCode);
		}

		return schemaBlocks.join("\n\n");
	}

	generateSchema(name: string, schema: ExtractedSchema): string {
		const pascalName = this.toPascalCase(name);

		if (schema.type === "object" && schema.properties) {
			return this.generateObjectSchema(pascalName, schema);
		}

		if (schema.type === "array" && schema.items) {
			return this.generateArraySchema(pascalName, schema);
		}

		if (schema.enum) {
			return this.generateEnumSchema(pascalName, schema);
		}

		// Handle primitive types
		return this.generatePrimitiveSchema(pascalName, schema);
	}

	private generateObjectSchema(name: string, schema: ExtractedSchema): string {
		const properties: string[] = [];

		if (schema.properties) {
			for (const [propName, propSchema] of Object.entries(schema.properties)) {
				const isRequired = schema.required?.includes(propName) ?? false;
				const propType = this.getSchemaType(propSchema);
				const annotations = this.generateAnnotations(propSchema);

				if (isRequired) {
					properties.push(`  ${propName}: ${propType}${annotations}`);
				} else {
					properties.push(
						`  ${propName}: S.optional(${propType})${annotations}`,
					);
				}
			}
		}

		const structContent = properties.join(",\n");
		const schemaAnnotations = this.generateSchemaAnnotations(schema);

		return `export const ${name} = S.Struct({
${structContent}
})${schemaAnnotations};`;
	}

	private generateArraySchema(name: string, schema: ExtractedSchema): string {
		if (!schema.items) {
			throw new Error(`Array schema ${name} is missing items property`);
		}
		const itemType = this.getSchemaType(schema.items);

		const annotations = this.generateSchemaAnnotations(schema);
		return `export const ${name} = S.Array(${itemType})${annotations};`;
	}

	private generateEnumSchema(name: string, schema: ExtractedSchema): string {
		const enumValues = schema.enum
			?.map((value) => JSON.stringify(value))
			.join(", ");
		const annotations = this.generateSchemaAnnotations(schema);

		return `export const ${name} = S.Literal(${enumValues})${annotations};`;
	}

	private generatePrimitiveSchema(
		name: string,
		schema: ExtractedSchema,
	): string {
		const baseType = this.getSchemaType(schema);
		const annotations = this.generateSchemaAnnotations(schema);

		return `export const ${name} = ${baseType}${annotations};`;
	}

	private getSchemaType(schema: ExtractedSchema): string {
		// Handle references
		if ("$ref" in schema && schema.$ref) {
			const parts = schema.$ref.split("/");
			const refName = parts[parts.length - 1];
			if (!refName) {
				throw new Error(`Invalid $ref format: ${schema.$ref}`);
			}
			return this.toPascalCase(refName);
		}

		switch (schema.type) {
			case "string":
				if (schema.format === "date-time") return "S.DateTimeString";
				if (schema.format === "date") return "S.DateString";
				if (schema.format === "uuid") return "S.UUID";
				if (schema.format === "email") return "S.Email";
				return "S.String";

			case "number":
				return "S.Number";

			case "integer":
				return "S.Int";

			case "boolean":
				return "S.Boolean";

			case "array":
				if (schema.items) {
					return `S.Array(${this.getSchemaType(schema.items)})`;
				}
				return "S.Array(S.Unknown)";

			case "object":
				if (schema.properties) {
					// Inline object - should be extracted to separate schema
					return "S.Struct({ /* TODO: extract to separate schema */ })";
				}
				return "S.Record({ key: S.String, value: S.Unknown })";

			default:
				return "S.Unknown";
		}
	}

	private generateAnnotations(schema: ExtractedSchema): string {
		const annotations: string[] = [];

		if (schema.description) {
			annotations.push(`description: ${JSON.stringify(schema.description)}`);
		}

		if (schema.example !== undefined) {
			annotations.push(`examples: [${JSON.stringify(schema.example)}]`);
		}

		if (schema.default !== undefined) {
			annotations.push(`default: ${JSON.stringify(schema.default)}`);
		}

		if (schema.minimum !== undefined) {
			annotations.push(`minimum: ${schema.minimum}`);
		}

		if (schema.maximum !== undefined) {
			annotations.push(`maximum: ${schema.maximum}`);
		}

		if (schema.minLength !== undefined) {
			annotations.push(`minLength: ${schema.minLength}`);
		}

		if (schema.maxLength !== undefined) {
			annotations.push(`maxLength: ${schema.maxLength}`);
		}

		if (schema.pattern) {
			annotations.push(`pattern: ${JSON.stringify(schema.pattern)}`);
		}

		if (annotations.length === 0) {
			return "";
		}

		return `.annotations({
    ${annotations.join(",\n    ")}
  })`;
	}

	private generateSchemaAnnotations(schema: ExtractedSchema): string {
		return this.generateAnnotations(schema);
	}

	private toPascalCase(str: string): string {
		// Handle camelCase and PascalCase by preserving existing capitals
		return str
			.replace(/([a-z])([A-Z])/g, "$1 $2") // Split camelCase: "createUser" -> "create User"
			.split(/[-_\s]+/) // Split on delimiters
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join("");
	}
}
