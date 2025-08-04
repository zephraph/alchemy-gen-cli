import type {
	ExtractedOperation,
	ExtractedParameter,
	ExtractedRequestBody,
	ExtractedResponse,
} from "../parser/extractor.js";

export class EndpointGenerator {
	generateApiGroup(
		tag: string,
		className: string,
		operations: ExtractedOperation[],
	): string {
		const endpoints = operations
			.map((op) => this.generateEndpoint(op))
			.join(",\n  ");

		const groupName = this.toKebabCase(tag);

		return `export class ${className} extends HttpApiGroup.make('${groupName}')
  .add(
    ${endpoints}
  ) {}`;
	}

	generateEndpoint(operation: ExtractedOperation): string {
		const methodName = this.getHttpMethod(operation.method);
		const endpointName = this.getEndpointName(operation);
		const path = operation.path || "";

		const endpoint = `HttpApiEndpoint.${methodName}('${endpointName}', '${path}')`;

		// Add success responses
		const successResponse = this.getSuccessResponse(operation.responses);
		const endpointWithSuccess = successResponse
			? `${endpoint}\n      .addSuccess(${successResponse})`
			: endpoint;

		// Add error responses
		const errorResponses = this.getErrorResponses(operation.responses);
		let endpointWithErrors = endpointWithSuccess;
		for (const errorResponse of errorResponses) {
			endpointWithErrors += `\n      .addError(${errorResponse})`;
		}

		// Add parameters
		const { pathParams, queryParams, headerParams } = this.categorizeParameters(
			operation.parameters,
		);

		if (pathParams.length > 0) {
			const pathParamsSchema = this.generateParametersSchema(
				pathParams,
				"PathParams",
			);
			endpointWithErrors += `\n      .setPath(${pathParamsSchema})`;
		}

		if (queryParams.length > 0) {
			const queryParamsSchema = this.generateParametersSchema(
				queryParams,
				"UrlParams",
			);
			endpointWithErrors += `\n      .setUrlParams(${queryParamsSchema})`;
		}

		if (headerParams.length > 0) {
			const headerParamsSchema = this.generateParametersSchema(
				headerParams,
				"Headers",
			);
			endpointWithErrors += `\n      .setHeaders(${headerParamsSchema})`;
		}

		// Add request body
		if (operation.requestBody) {
			const requestBodySchema = this.getRequestBodySchema(
				operation.requestBody,
			);
			if (requestBodySchema) {
				endpointWithErrors += `\n      .setPayload(${requestBodySchema})`;
			}
		}

		// Add OpenAPI annotations
		const annotations = this.generateEndpointAnnotations(operation);
		if (annotations) {
			endpointWithErrors += `\n      .annotateContext(\n        ${annotations}\n      )`;
		}

		return endpointWithErrors;
	}

	private getHttpMethod(method: string): string {
		const methodMap: Record<string, string> = {
			get: "get",
			post: "post",
			put: "put",
			patch: "patch",
			delete: "del", // 'delete' is a reserved keyword
			head: "head",
			options: "options",
		};

		return methodMap[method.toLowerCase()] || "get";
	}

	private getEndpointName(operation: ExtractedOperation): string {
		if (operation.operationId) {
			return operation.operationId;
		}

		// Generate from method and path
		const method = operation.method.toLowerCase();
		const pathParts = (operation.path || "")
			.split("/")
			.filter((part) => part && !part.startsWith("{"))
			.map((part) => this.toPascalCase(part));

		return method + pathParts.join("");
	}

	private getSuccessResponse(
		responses: readonly ExtractedResponse[],
	): string | null {
		const successResponse = responses.find(
			(r) => r.statusCode >= 200 && r.statusCode < 300,
		);

		if (!successResponse) {
			return null;
		}

		// Try to get schema from primary schema or first JSON content
		const schema =
			successResponse.schema ||
			successResponse.content.find((c) => c.mediaType === "application/json")
				?.schema;

		if (!schema) {
			return null;
		}

		return this.getSchemaReference(schema);
	}

	private getErrorResponses(responses: readonly ExtractedResponse[]): string[] {
		return responses
			.filter((r) => r.statusCode >= 400)
			.map((r) => {
				const schema =
					r.schema ||
					r.content.find((c) => c.mediaType === "application/json")?.schema;
				const schemaRef = schema ? this.getSchemaReference(schema) : "S.String";
				return `HttpApiError.make('${r.statusCode}', ${schemaRef})`;
			});
	}

	private categorizeParameters(parameters: readonly ExtractedParameter[]) {
		const pathParams = parameters.filter((p) => p.in === "path");
		const queryParams = parameters.filter((p) => p.in === "query");
		const headerParams = parameters.filter((p) => p.in === "header");

		return { pathParams, queryParams, headerParams };
	}

	private generateParametersSchema(
		parameters: readonly ExtractedParameter[],
		_suffix: string,
	): string {
		if (parameters.length === 0) {
			return "S.Struct({})";
		}

		const properties = parameters.map((param) => {
			const schemaType = this.getParameterSchemaType(param);
			const annotations = this.generateParameterAnnotations(param);
			const optional = param.required ? "" : "S.optional(";
			const optionalClose = param.required ? "" : ")";

			return `  ${param.name}: ${optional}${schemaType}${optionalClose}${annotations}`;
		});

		return `S.Struct({
${properties.join(",\n")}
})`;
	}

	private getParameterSchemaType(param: ExtractedParameter): string {
		if (param.schema) {
			return this.getSchemaType(param.schema);
		}

		// Fallback based on parameter type inference
		return "S.String";
	}

	private generateParameterAnnotations(param: ExtractedParameter): string {
		const annotations: string[] = [];

		if (param.description) {
			annotations.push(`description: ${JSON.stringify(param.description)}`);
		}

		if (param.example !== undefined) {
			annotations.push(`examples: [${JSON.stringify(param.example)}]`);
		}

		if (annotations.length === 0) {
			return "";
		}

		return `.annotations({
    ${annotations.join(",\n    ")}
  })`;
	}

	private getRequestBodySchema(
		requestBody: ExtractedRequestBody,
	): string | null {
		// Try to find JSON content
		const jsonContent = requestBody.content.find(
			(c) => c.mediaType === "application/json" || c.mediaType.includes("json"),
		);

		if (!jsonContent?.schema) {
			return null;
		}

		return this.getSchemaReference(jsonContent.schema);
	}

	private getSchemaReference(schema: {
		$ref?: string;
		type?: string;
		[key: string]: unknown;
	}): string {
		if ("$ref" in schema && schema.$ref) {
			const parts = schema.$ref.split("/");
			const refName = parts[parts.length - 1];
			return `Schemas.${this.toPascalCase(refName)}`;
		}

		return this.getSchemaType(schema);
	}

	private getSchemaType(schema: {
		type?: string;
		format?: string;
		items?: unknown;
		[key: string]: unknown;
	}): string {
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

			default:
				return "S.String";
		}
	}

	private generateEndpointAnnotations(operation: ExtractedOperation): string {
		const annotations: string[] = [];

		if (operation.summary) {
			annotations.push(`title: ${JSON.stringify(operation.summary)}`);
		}

		if (operation.description) {
			annotations.push(`description: ${JSON.stringify(operation.description)}`);
		}

		if (operation.deprecated) {
			annotations.push("deprecated: true");
		}

		if (annotations.length === 0) {
			return "";
		}

		return `OpenApi.annotations({
        ${annotations.join(",\n        ")}
      })`;
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
}
