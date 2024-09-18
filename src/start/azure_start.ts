import { AzureClient } from "@fluidframework/azure-client";
import { loadApp } from "../app_load.js";
import { getClientProps } from "../infra/azure/azureClientProps.js";
import { authHelper } from "../infra/spe/authHelper.js";
import { AuthenticationResult, PublicClientApplication, AccountInfo } from "@azure/msal-browser";

export async function azureStart(account: AccountInfo) {
	// Get the root container id from the URL
	// If there is no container id, then the app will make
	// a new container.
	let containerId = location.hash.substring(1);

	const client = new AzureClient(getClientProps(account));

	// Load the app
	const container = await loadApp(client, containerId, account);

	// If the app is in a `createNew` state - no containerId, and the container is detached, we attach the container.
	// This uploads the container to the service and connects to the collaboration session.
	if (containerId.length == 0) {
		containerId = await container.attach();

		// The newly attached container is given a unique ID that can be used to access the container in another session
		history.replaceState(undefined, "", "#" + containerId);
	}
}

export async function signedInAzureStart() {
	const msalInstance: PublicClientApplication = await authHelper();

	// Handle the login redirect flows
	msalInstance
		.handleRedirectPromise()
		.then((tokenResponse: AuthenticationResult | null) => {
			// If the tokenResponse is not null, then the user is signed in
			// and the tokenResponse is the result of the redirect.
			if (tokenResponse !== null) {
				const account: AccountInfo = msalInstance.getAllAccounts()[0];
				azureStart(account);
			} else {
				const currentAccounts = msalInstance.getAllAccounts();
				if (currentAccounts.length === 0) {
					// no accounts signed-in, attempt to sign a user in
					msalInstance.loginRedirect({
						scopes: [
							"user.read",
							"api://fhl-token-provider.azurewebsites.net/Data.Read",
						],
					});
				} else if (currentAccounts.length > 1 || currentAccounts.length === 1) {
					// The user is singed in.
					// Treat more than one account signed in and a single account the same as
					// this is just a sample. But a real app would need to handle the multiple accounts case.
					// For now, just use the first account.
					const account: AccountInfo = msalInstance.getAllAccounts()[0];
					azureStart(account);
				}
			}
		})
		.catch((error: Error) => {
			console.log("Error in handleRedirectPromise: " + error.message);
		});
}
