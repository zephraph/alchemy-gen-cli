# Phase 2: CLI Framework
**Status:** Done
**Agent PID:** 21471

## Original Todo
Phase 2: CLI Framework
- [ ] Implement main CLI entry point using @effect/cli
- [ ] Create 'generate' command with options for input/output paths
- [ ] Add validation for CLI arguments
- [ ] Implement help documentation
- [ ] Add configuration file support (.alchemyrc)

## Description
Build a complete CLI framework for alchemy-gen using @effect/cli that provides a 'generate' command for converting OpenAPI specifications to Effect Platform HttpApi code. The CLI will support input/output path options, argument validation, comprehensive help documentation, and configuration file support through .alchemyrc files.

## Implementation Plan
- [ ] Implement main CLI entry point in src/index.ts using @effect/cli Command and CliApp
- [ ] Create 'generate' command with --input, --output, and --verbose options using Options.all()
- [ ] Add validation for CLI arguments (file existence, directory creation, spec format)
- [ ] Implement comprehensive help documentation with command descriptions and examples
- [ ] Add .alchemyrc configuration file support for default options
- [ ] Test CLI manually with sample commands and validate all functionality

## Notes
[Implementation notes]