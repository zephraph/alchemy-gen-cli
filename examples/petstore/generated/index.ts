import { HttpApi, OpenApi } from "@effect/platform";
import { PetsApi } from "./pets-api.js";

export * from "./pets-api.js";
export * from "./schemas.js";

export const PetstoreApi = HttpApi.make("Swagger Petstore").add(PetsApi);

console.log(OpenApi.fromApi(PetstoreApi));
