import { HttpApi } from "@effect/platform";
import { PetsApi } from "./pets-api.js";

export * from "./pets-api.js";
export * from "./schemas.js";

export const SwaggerPetstoreApi = HttpApi.make("Swagger Petstore").add(PetsApi);
