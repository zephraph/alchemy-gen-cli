# alchemy-gen Implementation Tasks



## Phase 5: Code Generation with ts-poet
- [ ] Set up ts-poet code builder infrastructure
- [ ] Generate HttpApi implementation
- [ ] Create HttpApiGroup classes for each resource
- [ ] Generate HttpApiEndpoint definitions with proper types
- [ ] Build Effect Schema definitions for request/response types
- [ ] Generate error types and handlers

## Phase 6: Validation & Testing
- [ ] Implement roundtrip validation (HttpApi → OpenAPI spec)
- [ ] Compare generated OpenAPI spec with original input
- [ ] Create test suite with sample OpenAPI specs
- [ ] Add unit tests for transformation logic
- [ ] Test edge cases and complex schemas

## Phase 7: Advanced Features
- [ ] Support authentication schemes (Bearer, API Key, OAuth)
- [ ] Handle file upload/download endpoints
- [ ] Implement proper error response types
- [ ] Add middleware generation for common patterns
- [ ] Support OpenAPI extensions (x-* properties)

## Phase 8: Output Management
- [ ] Create file writer with proper formatting
- [ ] Organize generated files by resource/domain
- [ ] Generate index files for exports
- [ ] Include JSDoc comments from OpenAPI descriptions
- [ ] Add import management and optimization

## Phase 9: Documentation & Examples
- [ ] Write comprehensive CLI documentation
- [ ] Create usage examples with real OpenAPI specs
- [ ] Document the generated code patterns
- [ ] Add configuration guide
- [ ] Create migration guide from other generators

## Phase 10: Performance & Polish
- [ ] Optimize large OpenAPI spec parsing
- [ ] Add progress indicators for generation
- [ ] Implement caching for unchanged specs
- [ ] Profile and optimize code generation speed
- [ ] Add debug mode for troubleshooting
