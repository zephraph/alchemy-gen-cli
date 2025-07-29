# Project: alchemy-gen
A CLI tool that generates Effect Platform HTTP libraries from OpenAPI specification documents.

## Features
- Parse OpenAPI 3.x specifications using @effect/platform's OpenApiJsonSchema or custom Effect Schema parsers
- Transform OpenAPI JSON schemas into Effect Platform HttpApi implementations
- Generate type-safe HttpApi, HttpApiGroup, and HttpApiEndpoint definitions
- Convert OpenAPI schemas to Effect Schema definitions for runtime validation
- Validate generated code by roundtrip testing (HttpApi → OpenAPI spec → comparison)
- Support authentication middleware and error handling patterns
- Use ts-poet for programmatic TypeScript code generation

## Tech Stack
- Runtime: Bun v1.2.19
- Language: TypeScript/JavaScript
- CLI Framework: @effect/cli
- Dependencies: 
  - ts-poet (TypeScript code generation library)
  - @effect/platform (HTTP API framework with OpenApiJsonSchema utilities)
  - @effect/schema (Schema validation and parsing)
  - @effect/cli (Command-line interface framework)
- Environment: mise for development environment management

## Structure
- lib/ - Empty directory for source code
- package.json - Project manifest
- mise.toml - Environment configuration
- bun.lockb - Bun lock file

## Architecture
The tool follows a pipeline architecture:
1. **Input Phase**: Read OpenAPI spec files (JSON/YAML) and parse using OpenApiJsonSchema from @effect/platform or custom Effect Schema
2. **Transformation Phase**: Convert the parsed OpenAPI structure into Effect Platform HttpApi definitions
3. **Generation Phase**: Use ts-poet to generate TypeScript code including:
   - HttpApi implementation with proper groups and endpoints
   - Effect Schema type definitions for all request/response types
   - HttpApiGroup classes for each API resource
   - HttpApiEndpoint configurations with middleware support
   - Error types and handling patterns
4. **Validation Phase**: Generate OpenAPI spec from the created HttpApi and validate against the original
5. **Output Phase**: Write generated files to specified output directory

The key insight is using Effect's native OpenAPI support to ensure perfect compatibility between OpenAPI specs and HttpApi implementations, enabling roundtrip validation.

## Commands
- Build: [not configured]
- Test: [not configured]
- Lint: [not configured]
- Dev/Run: bun run <filename>.ts

## Testing
No test framework configured. Options include Bun's built-in test runner, Vitest, or Jest.

## Editor
- Open folder: zed