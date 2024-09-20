import { v4 as uuid } from "uuid";
import { AzureOpenAI } from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/index.mjs";
import { PublicClientApplication } from "@azure/msal-browser";
import { Moment } from "../schema/app_schema.js";
import { getAccessToken, getSessionToken } from "../utils/auth_helpers.js";
import { sampleData } from "../app_load.js";

export class GPTService {
	private static _instance: GPTService;
	private static get instance(): GPTService {
		if (GPTService._instance === undefined) {
			throw new Error("GPTService not initialized");
		}
		return GPTService._instance;
	}

	public static initialize(msalInstance: PublicClientApplication) {
		if (GPTService._instance !== undefined) {
			throw new Error("Only allowed to initialize GPTService once");
		}
		this._instance = new GPTService(msalInstance);
	}

	private gptPrompter: ReturnType<typeof createSessionPrompter> | undefined;
	private constructor(private readonly msalInstance: PublicClientApplication) {
		this.createPrompterIfNeeded();
	}

	private createPrompterIfNeeded() {
		if (this.gptPrompter === undefined) {
			try {
				this.gptPrompter = createSessionPrompter(this.msalInstance);
			} catch (e) {
				console.error("Failed to create AI prompter. Please try again.", e);
			}
		}
	}

	public static async prompt(momentDescription: string): Promise<Moment[]> {
		const instance = GPTService.instance;
		instance.createPrompterIfNeeded();

		let moments: Moment[] | undefined;
		if (instance.gptPrompter !== undefined) {
			moments = await instance.gptPrompter(momentDescription);
			if (moments === undefined) {
				alert("AI failed to generate sessions. Please try again.");
			}
		}

		return moments ?? [populateDefaultMoment(momentDescription)];
	}
}

function populateDefaultMoment(description: string): Moment {
	return new Moment({
		id: uuid(),
		description,
		additionalNotes: "suggested storyline: default storyLine",
		created: Date.now(),
		lastChanged: Date.now(),
		storyLineIds: [],
	});
}

const sessionSystemPrompt = `You are a service named Copilot that takes a user prompt of something that just happened in their life (a "moment"), and categorizes
it based on existing "storylines" of "moments" they have recorded.
I will provide you with existing moments and storylines, and you will suggest which storyline is the best fit for the user's new moment, provided in the prompt.
If none of the existing storylines seem to fit, please suggest a new one.
`;

async function azureOpenAITokenProvider(msalInstance: PublicClientApplication): Promise<string> {
	const tokenProvider = process.env.TOKEN_PROVIDER_URL + "/api/getopenaitoken";
	if (tokenProvider === undefined || tokenProvider === null) {
		throw Error(
			"Expected TOKEN_PROVIDER_URL to be set in environment variables or local storage",
		);
	}

	const sessionToken = await getSessionToken(msalInstance);

	// get the token from the token provider
	const token = await getAccessToken(tokenProvider, sessionToken);
	return token;
}

function createSessionPrompter(
	msalInstance: PublicClientApplication,
): (prompt: string) => Promise<Moment[] | undefined> {
	console.log("Creating Azure OpenAI prompter");

	const endpoint =
		process.env.AZURE_OPENAI_ENDPOINT ?? localStorage.getItem("AZURE_OPENAI_ENDPOINT");

	if (endpoint === undefined || endpoint === null) {
		throw Error(
			"Expected AZURE_OPENAI_ENDPOINT to be set in environment variables or local storage",
		);
	}

	const openai = new AzureOpenAI({
		azureADTokenProvider: () => azureOpenAITokenProvider(msalInstance),
		apiVersion: "2024-08-01-preview",
	});

	const bodyBase: ChatCompletionCreateParamsNonStreaming = {
		messages: [
			{ role: "system", content: sessionSystemPrompt },
			{ role: "system", content: JSON.stringify(sampleData) },
			{
				role: "user",
				content:
					"Here's what just happened. Can you suggest which storyline this likely belongs to?",
			},
		],
		model: "gpt-4o",
		n: 1,
		response_format: {
			type: "json_schema",
			json_schema: {
				name: "suggestion_storyline",
				description:
					"The suggested storyline for the user's moment. Best if it matches one of the existing storylines, but if not, suggest a new one.",
				schema: {
					type: "object",
					properties: {
						storyline: { type: "string" },
						existing: { type: "boolean" },
					},
					required: ["storyline", "existing"],
					additionalProperties: false,
				},
				strict: true,
			},
		},
	};

	return async (prompt) => {
		console.log("Prompting Azure OpenAI with:", prompt);
		try {
			const body = { ...bodyBase };
			body.messages.push({ role: "user", content: prompt });
			const result = await openai.chat.completions.create(body);
			if (!result.created) {
				throw new Error("AI did not return result");
			}

			const resultJson = result.choices[0].message.content as string;
			const { storyline, existing } = JSON.parse(resultJson);
			const currentTime = new Date().getTime();
			const moment: Moment = new Moment({
				description: prompt,
				additionalNotes: `suggested storyline: "${storyline}" (${
					existing ? "existing" : "new"
				})`,
				created: currentTime,
				lastChanged: currentTime,
				id: uuid(),
				storyLineIds: [storyline],
			});
			return [moment];
		} catch (e) {
			return undefined;
		}
	};
}
