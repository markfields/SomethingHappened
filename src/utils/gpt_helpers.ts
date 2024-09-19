import { v4 as uuid } from "uuid";
import { Moment } from "../schema/app_schema.js";
import { AzureOpenAI } from "openai";
import axios from "axios";
import { ChatCompletionCreateParamsNonStreaming } from "openai/resources/index.mjs";
import { AccountInfo } from "@azure/msal-browser";



const sessionSystemPrompt = `You are a service named Copilot that takes a user prompt of something that just happened in their life (a "moment"), and categorizes
it based on existing "storylines" of "moments" they have recorded.
I will provide you with sample storylines of moments, and you will suggest which storyline is the best fit for the user's moment, provided in the prompt.
`;

export async function azureOpenAITokenProvider(account: AccountInfo): Promise<string> {
	const tokenProvider = process.env.TOKEN_PROVIDER_URL + "/api/getopenaitoken";
	if (tokenProvider === undefined || tokenProvider === null) {
		throw Error(
			"Expected TOKEN_PROVIDER_URL to be set in environment variables or local storage",
		);
	}

	const functionTokenResponse = await axios.post(
		process.env.TOKEN_PROVIDER_URL + "/.auth/login/aad",
		{
			access_token: account.idToken,
		},
	);

	if (functionTokenResponse.status !== 200) {
		throw new Error("Failed to get function token");
	}
	const functionToken = functionTokenResponse.data.authenticationToken;

	// get the token from the token provider
	const response = await axios.get(tokenProvider, {
		headers: {
			"Content-Type": "application/json",
			"X-ZUMO-AUTH": functionToken,
		},
	});
	return response.data as string;
}

export function createSessionPrompter(
	account: AccountInfo,
): (prompt: string) => Promise<Iterable<Moment> | undefined> {
	console.log("Creating Azure OpenAI prompter");

	const endpoint =
		process.env.AZURE_OPENAI_ENDPOINT ?? localStorage.getItem("AZURE_OPENAI_ENDPOINT");

	if (endpoint === undefined || endpoint === null) {
		throw Error(
			"Expected AZURE_OPENAI_ENDPOINT to be set in environment variables or local storage",
		);
	}

	const openai = new AzureOpenAI({
		azureADTokenProvider: () => azureOpenAITokenProvider(account),
		apiVersion: "2024-08-01-preview",
	});

	const samples = JSON.stringify([
		{ moment: "I ate a cheeseburger", storyline: "food and symptom log"},
		{ moment: "I got a headache", storyline: "food and symptom log"},
		{ moment: "I had a mild sore throat this morning", storyline: "food and symptom log"},
		{ moment: "We landed in France!", storyline: "vacation log"},
		{ moment: "We met up with Pierre and Yvonne at a cafe in Paris", storyline: "vacation log"},
		{ moment: "We went to the Louvre this afternoon", storyline: "vacation log"},
	]);
	const body: ChatCompletionCreateParamsNonStreaming = {
		messages: [
			{ role: "system", content: sessionSystemPrompt },
			{ role: "system", content: samples },
			{ role: "user", content: "Here's what just happened. Can you suggest the best fit for which storyline this belongs to from the samples?" },
		],
		model: "gpt-4o",
		n:1,
	};

	return async (prompt) => {
		console.log("Prompting Azure OpenAI with:", prompt);
		try {
			body.messages.push({ role: "user", content: prompt });
			const result = await openai.chat.completions.create(body);
			if (!result.created) {
				throw new Error("AI did not return result");
			}

			const suggestedStoryline = result.choices[0].message.content as string;
			const currentTime = new Date().getTime();
			const moment: Moment = 
				new Moment({
					title: prompt,
					abstract: `suggested storyline: ${suggestedStoryline}`,
					created: currentTime,
					sessionType: "session",
					lastChanged: currentTime,
					id: uuid(),
					tags: [],
				});
			return [moment];
		} catch (e) {
			return undefined;
		}
	};
}
