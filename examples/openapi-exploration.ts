import {
	HttpApi,
	HttpApiEndpoint,
	HttpApiGroup,
	OpenApi,
	OpenApiJsonSchema,
} from "@effect/platform";
import { Schema } from "effect";

// Basic schema definitions for exploration
const CreateUserRequest = Schema.Struct({
	name: Schema.String.pipe(Schema.minLength(1)),
	email: Schema.String,
	age: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.positive())),
});

const User = Schema.Struct({
	id: Schema.Number.pipe(Schema.int(), Schema.positive()),
	name: Schema.String,
	email: Schema.String,
	age: Schema.optional(Schema.Number),
	createdAt: Schema.DateTimeUtc,
});

const UserError = Schema.Struct({
	code: Schema.String,
	message: Schema.String,
});

// Example 1: Basic OpenApiJsonSchema usage
console.log("=== Example 1: Basic OpenApiJsonSchema Usage ===");
const userJsonSchema = OpenApiJsonSchema.make(User);
console.log("User JSON Schema:", JSON.stringify(userJsonSchema, null, 2));

// Example 2: Schema with advanced options
console.log("\n=== Example 2: Advanced Schema Options ===");
const advancedUserSchema = OpenApiJsonSchema.make(User);
console.log(
	"Advanced User Schema:",
	JSON.stringify(advancedUserSchema, null, 2),
);

// Example 3: Complete HttpApi to OpenAPI conversion
console.log("\n=== Example 3: HttpApi to OpenAPI Conversion ===");
const UserApi = HttpApi.make("UserAPI").add(
	HttpApiGroup.make("users")
		.add(
			HttpApiEndpoint.post("createUser", "/users")
				.setPayload(CreateUserRequest)
				.addSuccess(User, { status: 201 })
				.addError(UserError, { status: 400 }),
		)
		.add(
			HttpApiEndpoint.get("getUser", "/users/:id")
				.setPath(Schema.Struct({ id: Schema.NumberFromString }))
				.addSuccess(User)
				.addError(UserError, { status: 404 }),
		)
		.add(
			HttpApiEndpoint.get("listUsers", "/users")
				.setUrlParams(
					Schema.Struct({
						page: Schema.optional(Schema.NumberFromString),
						limit: Schema.optional(Schema.NumberFromString),
					}),
				)
				.addSuccess(
					Schema.Struct({ users: Schema.Array(User), total: Schema.Number }),
				)
				.addError(UserError, { status: 500 }),
		),
);

// Generate complete OpenAPI specification
const openApiSpec = OpenApi.fromApi(UserApi, {
	additionalPropertiesStrategy: "strict",
});

console.log("Complete OpenAPI Spec:", JSON.stringify(openApiSpec, null, 2));

// Example 4: Exploring schema composition
console.log("\n=== Example 4: Schema Composition ===");
const Address = Schema.Struct({
	street: Schema.String,
	city: Schema.String,
	zipCode: Schema.String,
	country: Schema.String,
});

const UserWithAddress = Schema.Struct({
	...User.fields,
	address: Schema.optional(Address),
});

const composedSchema = OpenApiJsonSchema.make(UserWithAddress);
console.log("Composed Schema:", JSON.stringify(composedSchema, null, 2));

// Example 5: Enum and Union types
console.log("\n=== Example 5: Enum and Union Types ===");
const UserRole = Schema.Literal("admin", "user", "moderator");
const UserStatus = Schema.Union(
	Schema.Literal("active"),
	Schema.Literal("inactive"),
	Schema.Literal("suspended"),
);

const EnhancedUser = Schema.Struct({
	...User.fields,
	role: UserRole,
	status: UserStatus,
});

const enumSchema = OpenApiJsonSchema.make(EnhancedUser);
console.log("Enum Schema:", JSON.stringify(enumSchema, null, 2));

console.log("\n=== OpenApiJsonSchema Exploration Complete ===");
console.log("Key insights:");
console.log(
	"1. OpenApiJsonSchema.make() converts Effect Schema to OpenAPI JSON Schema",
);
console.log("2. makeWithDefs() provides more control over schema generation");
console.log(
	"3. OpenApi.fromApi() generates complete OpenAPI specs from HttpApi",
);
console.log("4. Schema composition and unions are fully supported");
console.log(
	"5. For parsing existing OpenAPI specs, external tools like openapi-to-effect are needed",
);
