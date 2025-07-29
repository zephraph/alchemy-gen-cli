# alchemy-gen

A CLI tool that generates Effect Platform HTTP libraries from OpenAPI specification documents.

## Overview

alchemy-gen is a code generation tool that transforms OpenAPI specification files into Effect Platform `HttpApi` implementations. It uses `@effect/platform`'s `OpenApiJsonSchema` utilities or custom Effect Schema parsers to process OpenAPI specs, then leverages `ts-poet` for TypeScript code generation and `@effect/cli` for the command-line interface.

## Features

- Parse OpenAPI 3.x specifications using Effect's `OpenApiJsonSchema` or custom Effect Schema
- Generate Effect Platform `HttpApi` implementations
- Transform OpenAPI schemas into Effect Schema definitions
- Type-safe request/response handling with full Effect integration
- Roundtrip validation: generate OpenAPI spec from HttpApi and compare with original
- Support for authentication middleware and error handling patterns

## Installation

```bash
bun install alchemy-gen
```

## Usage

```bash
alchemy-gen generate --input openapi.yaml --output ./generated
```

## Tech Stack

- **Runtime**: Bun v1.2.19
- **CLI Framework**: @effect/cli
- **Code Generation**: ts-poet
- **HTTP Library**: @effect/platform
- **Schema Validation**: @effect/schema
- **Language**: TypeScript

## How It Works

1. **Parse OpenAPI Spec**: Use `OpenApiJsonSchema` from `@effect/platform` or custom Effect Schema to parse the OpenAPI JSON schema
2. **Transform to HttpApi**: Convert the parsed OpenAPI structure into Effect Platform `HttpApi` definitions
3. **Generate TypeScript Code**: Use ts-poet to generate the HttpApi implementation code
4. **Validate Roundtrip**: Generate an OpenAPI spec from the created HttpApi and compare against the original
5. **Output Library**: Write the generated Effect Platform HTTP implementation to disk

## Generated Code Structure

The tool generates:
- Effect Schema definitions for all request/response types
- HttpApi implementation using Effect Platform patterns
- HttpApiGroup and HttpApiEndpoint configurations
- Proper error types and handling
- Middleware integration for authentication and validation

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build
bun build
```

## License

MIT