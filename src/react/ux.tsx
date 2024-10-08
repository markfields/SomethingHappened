/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import "regenerator-runtime/runtime";
import React, { useEffect, useState } from "react";
import { Life } from "../schema/app_schema.js";
import { ClientSession } from "../schema/session_schema.js";
import "../output.css";
import { IFluidContainer, IMember, IServiceAudience, TreeView } from "fluid-framework";
import { Canvas } from "./canvas_ux.js";
import { undoRedo } from "../utils/undo.js";
import { UserAvatars } from "./avatars_ux.js";

export function ReactApp(props: {
	lifeTree: TreeView<typeof Life>;
	momentTree: TreeView<typeof ClientSession>;
	audience: IServiceAudience<IMember>;
	container: IFluidContainer;
	undoRedo: undoRedo;
}): JSX.Element {
	const [currentUser, setCurrentUser] = useState<IMember | undefined>(undefined);
	const [connectionState, setConnectionState] = useState("");
	const [saved, setSaved] = useState(false);
	const [fluidMembers, setFluidMembers] = useState<IMember[]>([]);
	const [isPromptOpen, setIsPromptOpen] = useState(false);

	/** Unsubscribe to undo-redo events when the component unmounts */
	useEffect(() => {
		return props.undoRedo.dispose;
	}, []);

	return (
		<>
			<div
				id="main"
				className="flex flex-col bg-gray-100 h-screen w-full overflow-hidden overscroll-none"
			>
				<Header
					saved={saved}
					connectionState={connectionState}
					fluidMembers={fluidMembers}
					currentUser={currentUser}
				/>
				<div className="flex h-[calc(100vh-48px)] flex-row ">
					<Canvas
						lifeTree={props.lifeTree}
						momentTree={props.momentTree}
						audience={props.audience}
						container={props.container}
						fluidMembers={fluidMembers}
						currentUser={currentUser}
						undoRedo={props.undoRedo}
						setCurrentUser={setCurrentUser}
						setConnectionState={setConnectionState}
						setSaved={setSaved}
						setFluidMembers={setFluidMembers}
						setShowPrompt={setIsPromptOpen}
					/>
				</div>
			</div>
		</>
	);
}

export function Header(props: {
	saved: boolean;
	connectionState: string;
	fluidMembers: IMember[];
	currentUser: IMember | undefined;
}): JSX.Element {
	return (
		<div className="h-[48px] flex shrink-0 flex-row items-center justify-between bg-black text-base text-white z-40 w-full">
			<div className="flex m-2">Something Happened | {props.connectionState}</div>
			<UserAvatars
				currentUser={props.currentUser}
				fluidMembers={props.fluidMembers}
				layoutType="stack"
			/>
		</div>
	);
}
