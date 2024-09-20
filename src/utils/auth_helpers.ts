import { AccountInfo, AuthenticationResult, PublicClientApplication } from "@azure/msal-browser";
import axios, { AxiosRequestConfig } from "axios";

export async function login(msalInstance: PublicClientApplication): Promise<void> {
	msalInstance
		.handleRedirectPromise()
		.then((tokenResponse: AuthenticationResult | null) => {
			// If the tokenResponse is not null, then the user is signed in
			// and the tokenResponse is the result of the redirect.
			if (tokenResponse !== null) {
				msalInstance.setActiveAccount(tokenResponse.account);
			} else {
				const currentAccounts = msalInstance.getAllAccounts();
				if (currentAccounts.length === 0) {
					// no accounts signed-in, attempt to sign a user in
					msalInstance.loginRedirect({
						scopes: [
							"user.read",
							"api://fhl-token-provider.azurewebsites.net/Data.Read",
							"api://fhl-token-provider.azurewebsites.net/offline_access",
							"offline_access",
						],
					});
				} else if (currentAccounts.length > 1 || currentAccounts.length === 1) {
					// The user is signed in.
					msalInstance.setActiveAccount(currentAccounts[0]);
				}
			}
		})
		.catch((error: Error) => {
			console.log("Error in handleRedirectPromise: " + error.message);
		});
}

// force refresh of AAD tokens
export async function refresh(msalInstance: PublicClientApplication): Promise<void> {
	if (msalInstance.getAllAccounts().length === 0) {
		login(msalInstance);
	}

	msalInstance.setActiveAccount(await getAccount(msalInstance));

	await msalInstance.acquireTokenSilent({
		scopes: [
			"user.read",
			"api://fhl-token-provider.azurewebsites.net/Data.Read",
			"api://fhl-token-provider.azurewebsites.net/offline_access",
			"offline_access",
		],
	});
}

export async function getAccount(msalInstance: PublicClientApplication): Promise<AccountInfo> {
	const currentAccounts = msalInstance.getAllAccounts();
	if (currentAccounts.length === 0) {
		console.error("No accounts found trying to login");
		login(msalInstance);
	}
	return msalInstance.getActiveAccount() ?? currentAccounts[0];
}

export async function getSessionToken(
	msalInstance: PublicClientApplication,
	noRetry?: boolean,
): Promise<string> {
	const account = await getAccount(msalInstance);

	const response = await axios
		.post(process.env.TOKEN_PROVIDER_URL + "/.auth/login/aad", {
			access_token: account.idToken,
		})
		.catch(async (error) => {
			if (error.response && error.response.status === 401 && !noRetry) {
				// refresh token and retry
				await refresh(msalInstance);
				return getSessionToken(msalInstance, true);
			} else {
				throw new Error("Failed to get session token");
			}
		});

	if (typeof response === "string") {
		throw new Error("Failed to get session token");
	}

	sessionStorage.setItem("sessionToken", response.data.authenticationToken);

	return response.data.authenticationToken;
}

// Helper function to authenticate the user
export async function getMsalInstance(): Promise<PublicClientApplication> {
	// Get the client id (app id) from the environment variables
	const clientId = process.env.CLIENT_ID;

	if (!clientId) {
		throw new Error("CLIENT_ID is not defined");
	}

	// Create the MSAL instance
	const msalConfig = {
		auth: {
			clientId,
			authority: "https://login.microsoftonline.com/" + process.env.TENANT_ID,
			tenantId: process.env.TENANT_ID,
		},
	};

	// Initialize the MSAL instance
	const msalInstance = new PublicClientApplication(msalConfig);
	await msalInstance.initialize();

	return msalInstance;
}

// Call axios to get a token from the token provider
export async function getAccessToken(
	url: string,
	noRetry?: boolean,
	config?: AxiosRequestConfig,
): Promise<string> {
	const response = await axios.get(url, config);

	if (response.status !== 200) {
		throw new Error("Failed to get access token");
	}

	return response.data as string;
}
