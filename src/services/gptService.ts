import { AzureOpenAI } from "openai";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/index.mjs";
import { PublicClientApplication } from "@azure/msal-browser";
import { getAccessToken, getSessionToken } from "../utils/auth_helpers.js";

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

	private gptPrompter: ReturnType<typeof createStoryLinePrompter> | undefined;
	private constructor(private readonly msalInstance: PublicClientApplication) {
		this.createPrompterIfNeeded();
	}

	private createPrompterIfNeeded() {
		if (this.gptPrompter === undefined) {
			try {
				this.gptPrompter = createStoryLinePrompter(this.msalInstance);
			} catch (e) {
				console.error("Failed to create AI prompter. Please try again.", e);
			}
		}
	}

	public static async prompt(momentDescription: string, sampleJson: string): Promise<IGPTPromptResponse> {
		const instance = GPTService.instance;
		instance.createPrompterIfNeeded();

		let response: IGPTPromptResponse | undefined;
		if (instance.gptPrompter !== undefined) {
			response = await instance.gptPrompter(momentDescription, sampleJson);
			if (response === undefined) {
				console.error("AI failed to find story lines.");
			}
		}

		return response ?? createDefaultPromptResponse(momentDescription);
	}
}

function createDefaultPromptResponse(description: string): IGPTPromptResponse {
	return {
		momentDescription: description,
		storyLine: {
			name: "Unsorted moments",
			isExisting: false,
		},
	};
}

const storyLineSystemPrompt = `You are a service named Copilot that takes a user prompt of something that just happened in their life (a "moment"), and categorizes
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

export interface IGPTPromptResponse {
	momentDescription: string;
	storyLine: {
		name: string;
		isExisting: boolean;
	};
}

function createStoryLinePrompter(
	msalInstance: PublicClientApplication,
): (prompt: string, sampleJson: string) => Promise<IGPTPromptResponse | undefined> {
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

	const body: ChatCompletionCreateParamsNonStreaming = {
		messages: [],
		model: "gpt-4o",
		n: 1,
		response_format: {
			type: "json_schema",
			json_schema: {
				name: "suggestion_storyline",
				description:
					"The suggested storyline for the user's moment. Check first if it matches one of the existing storylines, and if not suggest a new one.",
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

	return async (prompt, sampleJson: string) => {
		console.log("Prompting Azure OpenAI with:", prompt);
		try {
			body.messages.length = 0;
			body.messages.push({ role: "system", content: storyLineSystemPrompt });
			body.messages.push({ role: "system", content: sampleJson });
			body.messages.push({
				role: "user",
				content:
					"Here's what just happened. Can you suggest which storyline this likely belongs to?",
			});
			body.messages.push({ role: "user", content: prompt });
			const result = await openai.chat.completions.create(body);
			if (!result.created) {
				throw new Error("AI did not return result");
			}

			const resultJson = result.choices[0].message.content as string;
			const { storyline, existing } = JSON.parse(resultJson);
			return {
				momentDescription: prompt,
				storyLine: {
					name: storyline,
					isExisting: existing,
				},
			};
		} catch (e) {
			return undefined;
		}
	};
}
