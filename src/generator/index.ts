import { Effect } from "effect";
import type { ExtractedApiData } from "../parser/extractor.js";
import { HttpApiGenerator } from "./http-api-generator.js";

export interface GenerationOptions {
	readonly outputDir: string;
	readonly moduleName?: string;
	readonly includeExamples?: boolean;
}

export const generateHttpApi = (
	apiData: ExtractedApiData,
	options: GenerationOptions,
): Effect.Effect<void, Error, never> =>
	Effect.gen(function* () {
		const generator = new HttpApiGenerator(apiData, options);
		yield* generator.generate();
	});
