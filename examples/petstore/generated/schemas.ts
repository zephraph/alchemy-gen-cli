import { Schema as S } from "effect";

// Pet schema
export const Pet = S.Struct({
	id: S.Number,
	name: S.String,
	tag: S.optional(S.String),
});

// Pets array schema
export const Pets = S.Array(Pet);

// Error schema
export const ApiError = S.Struct({
	code: S.Number,
	message: S.String,
});

// Type exports
export type Pet = S.Schema.Type<typeof Pet>;
export type Pets = S.Schema.Type<typeof Pets>;
export type ApiError = S.Schema.Type<typeof ApiError>;
