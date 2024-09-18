/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
	AzureRemoteConnectionConfig,
	AzureClientProps,
	AzureLocalConnectionConfig,
} from "@fluidframework/azure-client";
import { InsecureTokenProvider } from "./azureTokenProvider.js";
import { AzureFunctionTokenProvider, azureUser, user } from "./azureTokenProvider.js";
import { AccountInfo } from "@azure/msal-browser";

const client = process.env.FLUID_CLIENT;
const local = client === undefined || client === "local";
if (local) {
	console.warn(`Configured to use local tinylicious.`);
}

const remoteConnectionConfig: AzureRemoteConnectionConfig = {
	type: "remote",
	tenantId: process.env.AZURE_TENANT_ID!,
	tokenProvider: new AzureFunctionTokenProvider(
		process.env.TOKEN_PROVIDER_URL! + "/api/getAfrToken",
		azureUser,
	),
	endpoint: process.env.AZURE_ORDERER!,
};

const localConnectionConfig: AzureLocalConnectionConfig = {
	type: "local",
	tokenProvider: new InsecureTokenProvider("VALUE_NOT_USED", user),
	endpoint: "http://localhost:7070",
};

const connectionConfig: AzureRemoteConnectionConfig | AzureLocalConnectionConfig = !local
	? remoteConnectionConfig
	: localConnectionConfig;
export const clientProps: AzureClientProps = {
	connection: connectionConfig,
};

export function getClientProps(account: AccountInfo): AzureClientProps {
	const remoteConnectionConfig: AzureRemoteConnectionConfig = {
		type: "remote",
		tenantId: process.env.AZURE_TENANT_ID!,
		tokenProvider: new AzureFunctionTokenProvider(
			process.env.TOKEN_PROVIDER_URL! + "/api/getAfrToken",
			azureUser,
			account,
		),
		endpoint: process.env.AZURE_ORDERER!,
	};

	const localConnectionConfig: AzureLocalConnectionConfig = {
		type: "local",
		tokenProvider: new InsecureTokenProvider("VALUE_NOT_USED", user),
		endpoint: "http://localhost:7070",
	};

	const connectionConfig: AzureRemoteConnectionConfig | AzureLocalConnectionConfig = !local
		? remoteConnectionConfig
		: localConnectionConfig;
	return {
		connection: connectionConfig,
	};
}
