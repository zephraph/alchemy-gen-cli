import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { Schema as S } from "effect";
import * as Schemas from "./schemas.js";

// Query parameters schema for listPets
const ListPetsUrlParams = S.Struct({
	limit: S.optional(
		S.NumberFromString.annotations({
			description: "How many items to return at one time (max 100)",
		}),
	),
});

// Path parameters schema for showPetById
const ShowPetByIdPathParams = S.Struct({
	petId: S.String.annotations({
		description: "The id of the pet to retrieve",
	}),
});

// Success response for createPets (void/null response)
const CreatePetsResponse = S.Void;

export const PetsApi = HttpApiGroup.make("pets")
	.add(
		// GET /pets - List all pets
		HttpApiEndpoint.get("listPets", "/pets")
			.addSuccess(Schemas.Pets)
			.setUrlParams(ListPetsUrlParams)
			.annotateContext(
				OpenApi.annotations({
					summary: "List all pets",
				}),
			),
	)
	.add(
		// POST /pets - Create a pet
		HttpApiEndpoint.post("createPets", "/pets")
			.addSuccess(CreatePetsResponse)
			.setPayload(Schemas.Pet)
			.annotateContext(
				OpenApi.annotations({
					summary: "Create a pet",
				}),
			),
	)
	.add(
		// GET /pets/{petId} - Get a specific pet
		HttpApiEndpoint.get("showPetById", "/pets/{petId}")
			.addSuccess(Schemas.Pet)
			.setPath(ShowPetByIdPathParams)
			.annotateContext(
				OpenApi.annotations({
					summary: "Info for a specific pet",
				}),
			),
	);
