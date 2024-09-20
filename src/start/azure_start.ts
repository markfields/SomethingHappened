import { AzureClient } from "@fluidframework/azure-client";
import { loadApp } from "../app_load.js";
import { getClientProps } from "../infra/azure/azureClientProps.js";
import { PublicClientApplication } from "@azure/msal-browser";
import { getMsalInstance, login } from "../utils/auth_helpers.js";

export async function azureStart(msalInstance: PublicClientApplication) {
	// Get the root container id from the URL
	// If there is no container id, then the app will make
	// a new container.
	let containerId = location.hash.substring(1);

	const client = new AzureClient(await getClientProps(msalInstance));

	// Load the app
	const container = await loadApp(client, containerId, msalInstance);

	// If the app is in a `createNew` state - no containerId, and the container is detached, we attach the container.
	// This uploads the container to the service and connects to the collaboration session.
	if (containerId.length == 0) {
		containerId = await container.attach();

		// The newly attached container is given a unique ID that can be used to access the container in another session
		history.replaceState(undefined, "", "#" + containerId);
	}
}

export async function signedInAzureStart() {
	const msalInstance: PublicClientApplication = await getMsalInstance();

	// Handle the login redirect flows
	await login(msalInstance);

	azureStart(msalInstance);
}
