import { OdspClient } from "@fluidframework/odsp-client/beta";
import { AzureClient } from "@fluidframework/azure-client";
import { IFluidContainer } from "fluid-framework";
import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { createRoot } from "react-dom/client";
import { ReactApp } from "./react/ux.js";
import { appTreeConfiguration, Life2, newAppTreeConfiguration } from "./schema/app_schema.js";
import { sessionTreeConfiguration } from "./schema/session_schema.js";
import { createUndoRedoStacks } from "./utils/undo.js";
import { loadFluidData } from "./infra/fluid.js";
import { containerSchema } from "./schema/container_schema.js";
import { AccountInfo } from "@azure/msal-browser";
import { GPTService } from "./services/gptService.js";

export async function loadApp(
	client: AzureClient | OdspClient,
	containerId: string,
	account: AccountInfo,
): Promise<IFluidContainer> {
	// Initialize Fluid Container
	const { services, container } = await loadFluidData(containerId, containerSchema, client);

	// Initialize the SharedTree DDSes
	const sessionTree = container.initialObjects.sessionData.viewWith(sessionTreeConfiguration);
	if (sessionTree.compatibility.canInitialize) sessionTree.initialize({ clients: [] });

	const newAppTree = container.initialObjects.newAppData.viewWith(newAppTreeConfiguration);
	if (newAppTree.compatibility.canInitialize) {
		newAppTree.initialize(Life2.getSampleData());
	}

	const appTree = container.initialObjects.appData.viewWith(appTreeConfiguration);
	if (appTree.compatibility.canInitialize)
		appTree.initialize({ name: "Life", moment: [], days: [], sessionsPerDay: 4 });

	// create the root element for React
	const app = document.createElement("div");
	app.id = "app";
	document.body.appendChild(app);
	const root = createRoot(app);

	// Create undo/redo stacks for the app
	const undoRedo = createUndoRedoStacks(appTree.events);

	// Initialize GPT Service
	GPTService.initialize(account);

	// Render the app - note we attach new containers after render so
	// the app renders instantly on create new flow. The app will be
	// interactive immediately.
	root.render(
		<DndProvider backend={HTML5Backend}>
			<ReactApp
				lifeTree={appTree}
				sessionTree={sessionTree}
				audience={services.audience}
				container={container}
				undoRedo={undoRedo}
			/>
		</DndProvider>,
	);

	return container;
}
