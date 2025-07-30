# Phase 3: OpenAPI Schema Parser
**Status:** InProgress
**Agent PID:** 49755

## Original Todo
Phase 3: OpenAPI Schema Parser
- Create OpenAPI spec reader (support JSON and YAML)
- Implement parser using OpenApiJsonSchema from @effect/platform
- Alternative: Create custom Effect Schema for OpenAPI spec parsing
- Handle OpenAPI 3.x schema validation
- Extract paths, operations, and components from parsed schema
- Handle references ($ref resolution) within the schema

## Description
Build a comprehensive OpenAPI 3.x specification parser that can read OpenAPI specs from JSON and YAML files, validate them, resolve $ref references, and extract structured data for further processing. This parser will serve as the foundation for transforming OpenAPI specifications into Effect Platform HttpApi implementations.

The parser needs to:
- Support both JSON and YAML OpenAPI specification formats
- Validate specifications against OpenAPI 3.x schema requirements
- Resolve JSON Schema $ref references within the specification
- Extract and structure paths, operations, components, and schemas
- Provide type-safe parsing using Effect Schema validation
- Integrate with the existing CLI framework and error handling

## Implementation Plan
- [ ] Add required dependencies (js-yaml, @apidevtools/json-schema-ref-parser, openapi-types)
- [ ] Create OpenAPI 3.x Effect Schema definitions (src/types/openapi.ts)
- [ ] Implement file reader with JSON/YAML support (src/parser/reader.ts)
- [ ] Build OpenAPI specification validator (src/parser/validator.ts)
- [ ] Create $ref resolver for schema references (src/parser/ref-resolver.ts)
- [ ] Implement data extractor for paths, operations, and components (src/parser/extractor.ts)
- [ ] Create main parser module with pipeline orchestration (src/parser/index.ts)
- [ ] Add parser-specific error types and utilities (src/utils/error-types.ts)
- [ ] Integrate parser with CLI entry point (src/index.ts:186-189)
- [ ] Automated test: Create test suite with sample OpenAPI specs
- [ ] User test: Verify parsing works with real-world OpenAPI specifications

## Notes
[Implementation notes]