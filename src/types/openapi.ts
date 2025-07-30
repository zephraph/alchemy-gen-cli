import { Schema } from "@effect/schema";

// Basic schema definitions for OpenAPI components
export const ContactSchema = Schema.Struct({
	name: Schema.optional(Schema.String),
	url: Schema.optional(Schema.String),
	email: Schema.optional(Schema.String),
});

export const LicenseSchema = Schema.Struct({
	name: Schema.String,
	identifier: Schema.optional(Schema.String),
	url: Schema.optional(Schema.String),
});

export const InfoSchema = Schema.Struct({
	title: Schema.String,
	version: Schema.String,
	description: Schema.optional(Schema.String),
	termsOfService: Schema.optional(Schema.String),
	contact: Schema.optional(ContactSchema),
	license: Schema.optional(LicenseSchema),
	summary: Schema.optional(Schema.String),
});

export const ServerVariableSchema = Schema.Struct({
	enum: Schema.optional(Schema.Array(Schema.String)),
	default: Schema.String,
	description: Schema.optional(Schema.String),
});

export const ServerSchema = Schema.Struct({
	url: Schema.String,
	description: Schema.optional(Schema.String),
	variables: Schema.optional(
		Schema.Record({ key: Schema.String, value: ServerVariableSchema }),
	),
});

// External Documentation Schema
export const ExternalDocumentationSchema = Schema.Struct({
	description: Schema.optional(Schema.String),
	url: Schema.String,
});

// Tag Schema
export const TagSchema = Schema.Struct({
	name: Schema.String,
	description: Schema.optional(Schema.String),
	externalDocs: Schema.optional(ExternalDocumentationSchema),
});

// Reference Schema (for $ref resolution)
export const ReferenceSchema = Schema.Struct({
	$ref: Schema.String,
	summary: Schema.optional(Schema.String),
	description: Schema.optional(Schema.String),
});

// Discriminator for oneOf/anyOf schemas
export const DiscriminatorSchema = Schema.Struct({
	propertyName: Schema.String,
	mapping: Schema.optional(
		Schema.Record({ key: Schema.String, value: Schema.String }),
	),
});

// XML Schema
export const XmlSchema = Schema.Struct({
	name: Schema.optional(Schema.String),
	namespace: Schema.optional(Schema.String),
	prefix: Schema.optional(Schema.String),
	attribute: Schema.optional(Schema.Boolean),
	wrapped: Schema.optional(Schema.Boolean),
});

// Forward declarations for recursive schemas
// biome-ignore lint/suspicious/noExplicitAny: Required for recursive schema type definition with Schema.suspend
export const SchemaSchema: Schema.Schema<any, any, never> = Schema.suspend(() =>
	Schema.Struct({
		title: Schema.optional(Schema.String),
		multipleOf: Schema.optional(Schema.Number),
		maximum: Schema.optional(Schema.Number),
		exclusiveMaximum: Schema.optional(Schema.Boolean),
		minimum: Schema.optional(Schema.Number),
		exclusiveMinimum: Schema.optional(Schema.Boolean),
		maxLength: Schema.optional(Schema.Number),
		minLength: Schema.optional(Schema.Number),
		pattern: Schema.optional(Schema.String),
		maxItems: Schema.optional(Schema.Number),
		minItems: Schema.optional(Schema.Number),
		uniqueItems: Schema.optional(Schema.Boolean),
		maxProperties: Schema.optional(Schema.Number),
		minProperties: Schema.optional(Schema.Number),
		required: Schema.optional(Schema.Array(Schema.String)),
		enum: Schema.optional(Schema.Array(Schema.Unknown)),
		type: Schema.optional(Schema.String),
		not: Schema.optional(Schema.Union(SchemaSchema, ReferenceSchema)),
		allOf: Schema.optional(
			Schema.Array(Schema.Union(SchemaSchema, ReferenceSchema)),
		),
		oneOf: Schema.optional(
			Schema.Array(Schema.Union(SchemaSchema, ReferenceSchema)),
		),
		anyOf: Schema.optional(
			Schema.Array(Schema.Union(SchemaSchema, ReferenceSchema)),
		),
		items: Schema.optional(Schema.Union(SchemaSchema, ReferenceSchema)),
		properties: Schema.optional(
			Schema.Record({
				key: Schema.String,
				value: Schema.Union(SchemaSchema, ReferenceSchema),
			}),
		),
		additionalProperties: Schema.optional(
			Schema.Union(Schema.Boolean, SchemaSchema, ReferenceSchema),
		),
		description: Schema.optional(Schema.String),
		format: Schema.optional(Schema.String),
		default: Schema.optional(Schema.Unknown),
		nullable: Schema.optional(Schema.Boolean),
		discriminator: Schema.optional(DiscriminatorSchema),
		readOnly: Schema.optional(Schema.Boolean),
		writeOnly: Schema.optional(Schema.Boolean),
		xml: Schema.optional(XmlSchema),
		externalDocs: Schema.optional(ExternalDocumentationSchema),
		example: Schema.optional(Schema.Unknown),
		deprecated: Schema.optional(Schema.Boolean),
	}),
);

// Example Schema
export const ExampleSchema = Schema.Struct({
	summary: Schema.optional(Schema.String),
	description: Schema.optional(Schema.String),
	value: Schema.optional(Schema.Unknown),
	externalValue: Schema.optional(Schema.String),
});

// Forward declaration for HeaderSchema
// biome-ignore lint/suspicious/noExplicitAny: Required for recursive schema type definition with Schema.suspend
export const HeaderSchema: Schema.Schema<any, any, never> = Schema.suspend(() =>
	Schema.Struct({
		description: Schema.optional(Schema.String),
		required: Schema.optional(Schema.Boolean),
		deprecated: Schema.optional(Schema.Boolean),
		allowEmptyValue: Schema.optional(Schema.Boolean),
		style: Schema.optional(Schema.String),
		explode: Schema.optional(Schema.Boolean),
		allowReserved: Schema.optional(Schema.Boolean),
		schema: Schema.optional(Schema.Union(SchemaSchema, ReferenceSchema)),
		content: Schema.optional(
			Schema.Record({ key: Schema.String, value: MediaTypeSchema }),
		),
		example: Schema.optional(Schema.Unknown),
		examples: Schema.optional(
			Schema.Record({
				key: Schema.String,
				value: Schema.Union(ExampleSchema, ReferenceSchema),
			}),
		),
	}),
);

// Encoding Schema
export const EncodingSchema = Schema.Struct({
	contentType: Schema.optional(Schema.String),
	headers: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(HeaderSchema, ReferenceSchema),
		}),
	),
	style: Schema.optional(Schema.String),
	explode: Schema.optional(Schema.Boolean),
	allowReserved: Schema.optional(Schema.Boolean),
});

// Media Type Schema
export const MediaTypeSchema = Schema.Struct({
	schema: Schema.optional(Schema.Union(SchemaSchema, ReferenceSchema)),
	example: Schema.optional(Schema.Unknown),
	examples: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(ExampleSchema, ReferenceSchema),
		}),
	),
	encoding: Schema.optional(
		Schema.Record({ key: Schema.String, value: EncodingSchema }),
	),
});

// Parameter Schema
export const ParameterSchema = Schema.Struct({
	name: Schema.String,
	in: Schema.Literal("query", "header", "path", "cookie"),
	description: Schema.optional(Schema.String),
	required: Schema.optional(Schema.Boolean),
	deprecated: Schema.optional(Schema.Boolean),
	allowEmptyValue: Schema.optional(Schema.Boolean),
	style: Schema.optional(Schema.String),
	explode: Schema.optional(Schema.Boolean),
	allowReserved: Schema.optional(Schema.Boolean),
	schema: Schema.optional(Schema.Union(SchemaSchema, ReferenceSchema)),
	content: Schema.optional(
		Schema.Record({ key: Schema.String, value: MediaTypeSchema }),
	),
	example: Schema.optional(Schema.Unknown),
	examples: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(ExampleSchema, ReferenceSchema),
		}),
	),
});

// Request Body Schema
export const RequestBodySchema = Schema.Struct({
	description: Schema.optional(Schema.String),
	content: Schema.Record({ key: Schema.String, value: MediaTypeSchema }),
	required: Schema.optional(Schema.Boolean),
});

// Link Schema
export const LinkSchema = Schema.Struct({
	operationId: Schema.optional(Schema.String),
	operationRef: Schema.optional(Schema.String),
	parameters: Schema.optional(
		Schema.Record({ key: Schema.String, value: Schema.Unknown }),
	),
	requestBody: Schema.optional(Schema.Unknown),
	description: Schema.optional(Schema.String),
	server: Schema.optional(ServerSchema),
});

// Response Schema
export const ResponseSchema = Schema.Struct({
	description: Schema.String,
	headers: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(HeaderSchema, ReferenceSchema),
		}),
	),
	content: Schema.optional(
		Schema.Record({ key: Schema.String, value: MediaTypeSchema }),
	),
	links: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(LinkSchema, ReferenceSchema),
		}),
	),
});

// Responses Schema
export const ResponsesSchema = Schema.Record({
	key: Schema.String,
	value: Schema.Union(ResponseSchema, ReferenceSchema),
});

// Forward declaration for PathItemSchema
// biome-ignore lint/suspicious/noExplicitAny: Required for recursive schema type definition with Schema.suspend
export const PathItemSchema: Schema.Schema<any, any, never> = Schema.suspend(
	() =>
		Schema.Struct({
			$ref: Schema.optional(Schema.String),
			summary: Schema.optional(Schema.String),
			description: Schema.optional(Schema.String),
			get: Schema.optional(OperationSchema),
			put: Schema.optional(OperationSchema),
			post: Schema.optional(OperationSchema),
			delete: Schema.optional(OperationSchema),
			options: Schema.optional(OperationSchema),
			head: Schema.optional(OperationSchema),
			patch: Schema.optional(OperationSchema),
			trace: Schema.optional(OperationSchema),
			servers: Schema.optional(Schema.Array(ServerSchema)),
			parameters: Schema.optional(
				Schema.Array(Schema.Union(ParameterSchema, ReferenceSchema)),
			),
		}),
);

// Callback Schema
export const CallbackSchema = Schema.Record({
	key: Schema.String,
	value: Schema.Record({ key: Schema.String, value: PathItemSchema }),
});

// Security Requirement Schema
export const SecurityRequirementSchema = Schema.Record({
	key: Schema.String,
	value: Schema.Array(Schema.String),
});

// Operation Schema
// biome-ignore lint/suspicious/noExplicitAny: Required for recursive schema type definition with Schema.suspend
export const OperationSchema: Schema.Schema<any, any, never> = Schema.suspend(
	() =>
		Schema.Struct({
			tags: Schema.optional(Schema.Array(Schema.String)),
			summary: Schema.optional(Schema.String),
			description: Schema.optional(Schema.String),
			externalDocs: Schema.optional(ExternalDocumentationSchema),
			operationId: Schema.optional(Schema.String),
			parameters: Schema.optional(
				Schema.Array(Schema.Union(ParameterSchema, ReferenceSchema)),
			),
			requestBody: Schema.optional(
				Schema.Union(RequestBodySchema, ReferenceSchema),
			),
			responses: ResponsesSchema,
			callbacks: Schema.optional(
				Schema.Record({
					key: Schema.String,
					value: Schema.Union(CallbackSchema, ReferenceSchema),
				}),
			),
			deprecated: Schema.optional(Schema.Boolean),
			security: Schema.optional(Schema.Array(SecurityRequirementSchema)),
			servers: Schema.optional(Schema.Array(ServerSchema)),
		}),
);

// Paths Schema
export const PathsSchema = Schema.Record({
	key: Schema.String,
	value: PathItemSchema,
});

// Security Scheme Schema
export const SecuritySchemeSchema = Schema.Union(
	// API Key
	Schema.Struct({
		type: Schema.Literal("apiKey"),
		description: Schema.optional(Schema.String),
		name: Schema.String,
		in: Schema.Literal("query", "header", "cookie"),
	}),
	// HTTP
	Schema.Struct({
		type: Schema.Literal("http"),
		description: Schema.optional(Schema.String),
		scheme: Schema.String,
		bearerFormat: Schema.optional(Schema.String),
	}),
	// OAuth2
	Schema.Struct({
		type: Schema.Literal("oauth2"),
		description: Schema.optional(Schema.String),
		flows: Schema.Struct({
			implicit: Schema.optional(
				Schema.Struct({
					authorizationUrl: Schema.String,
					refreshUrl: Schema.optional(Schema.String),
					scopes: Schema.Record({ key: Schema.String, value: Schema.String }),
				}),
			),
			password: Schema.optional(
				Schema.Struct({
					tokenUrl: Schema.String,
					refreshUrl: Schema.optional(Schema.String),
					scopes: Schema.Record({ key: Schema.String, value: Schema.String }),
				}),
			),
			clientCredentials: Schema.optional(
				Schema.Struct({
					tokenUrl: Schema.String,
					refreshUrl: Schema.optional(Schema.String),
					scopes: Schema.Record({ key: Schema.String, value: Schema.String }),
				}),
			),
			authorizationCode: Schema.optional(
				Schema.Struct({
					authorizationUrl: Schema.String,
					tokenUrl: Schema.String,
					refreshUrl: Schema.optional(Schema.String),
					scopes: Schema.Record({ key: Schema.String, value: Schema.String }),
				}),
			),
		}),
	}),
	// OpenID Connect
	Schema.Struct({
		type: Schema.Literal("openIdConnect"),
		description: Schema.optional(Schema.String),
		openIdConnectUrl: Schema.String,
	}),
);

// Components Schema
export const ComponentsSchema = Schema.Struct({
	schemas: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(SchemaSchema, ReferenceSchema),
		}),
	),
	responses: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(ResponseSchema, ReferenceSchema),
		}),
	),
	parameters: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(ParameterSchema, ReferenceSchema),
		}),
	),
	examples: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(ExampleSchema, ReferenceSchema),
		}),
	),
	requestBodies: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(RequestBodySchema, ReferenceSchema),
		}),
	),
	headers: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(HeaderSchema, ReferenceSchema),
		}),
	),
	securitySchemes: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(SecuritySchemeSchema, ReferenceSchema),
		}),
	),
	links: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(LinkSchema, ReferenceSchema),
		}),
	),
	callbacks: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(CallbackSchema, ReferenceSchema),
		}),
	),
});

// Main OpenAPI Document Schema
export const OpenApiDocumentSchema = Schema.Struct({
	openapi: Schema.String,
	info: InfoSchema,
	jsonSchemaDialect: Schema.optional(Schema.String),
	servers: Schema.optional(Schema.Array(ServerSchema)),
	paths: Schema.optional(PathsSchema),
	webhooks: Schema.optional(
		Schema.Record({
			key: Schema.String,
			value: Schema.Union(PathItemSchema, ReferenceSchema),
		}),
	),
	components: Schema.optional(ComponentsSchema),
	security: Schema.optional(Schema.Array(SecurityRequirementSchema)),
	tags: Schema.optional(Schema.Array(TagSchema)),
	externalDocs: Schema.optional(ExternalDocumentationSchema),
});

// Type exports for use in other modules
export type OpenApiDocument = Schema.Schema.Type<typeof OpenApiDocumentSchema>;
export type OpenApiComponents = Schema.Schema.Type<typeof ComponentsSchema>;
export type OpenApiPath = Schema.Schema.Type<typeof PathItemSchema>;
export type OpenApiOperation = Schema.Schema.Type<typeof OperationSchema>;
export type OpenApiSchema = Schema.Schema.Type<typeof SchemaSchema>;
export type OpenApiParameter = Schema.Schema.Type<typeof ParameterSchema>;
export type OpenApiResponse = Schema.Schema.Type<typeof ResponseSchema>;
export type OpenApiRequestBody = Schema.Schema.Type<typeof RequestBodySchema>;
export type OpenApiSecurityScheme = Schema.Schema.Type<
	typeof SecuritySchemeSchema
>;
export type OpenApiReference = Schema.Schema.Type<typeof ReferenceSchema>;
