import { Console, Effect } from "effect";

export const main = Effect.gen(function* () {
	yield* Console.log("Welcome to alchemy-gen!");
	yield* Console.log("OpenAPI to Effect Platform HttpApi generator");
});

if (import.meta.main) {
	Effect.runSync(main);
}
