/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { useEffect, useState } from "react";
import "./styles.css";
import { createTheme, ThemeProvider, alpha, getContrastRatio } from "@mui/material/styles";
import { Life, MomentMap, StoryLineMap } from "../schema/app_schema.js";
import { ClientSession } from "../schema/session_schema.js";
import {
	ConnectionState,
	IFluidContainer,
	IMember,
	IServiceAudience,
	Tree,
	TreeView,
} from "fluid-framework";
import { undoRedo } from "../utils/undo.js";
import { StoryLineView, StorylineDialog } from "./storyLines_ux.js";
import { TextField, Button } from "@mui/material";
import { Add } from "@mui/icons-material";

import { VoiceInput } from "./VoiceInput.js";
import { GPTService, IGPTPromptResponse } from "../services/gptService.js";

export function getDateTime(): string {
	const now = new Date();

	const options: Intl.DateTimeFormatOptions = {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		hour12: true,
	};
	const formatter = new Intl.DateTimeFormat("en-US", options);
	return formatter.format(now);
}

declare module "@mui/material/styles" {
	interface Palette {
		black: Palette["primary"];
		white: Palette["primary"];
	}

	interface PaletteOptions {
		black?: PaletteOptions["primary"];
		white?: PaletteOptions["primary"];
	}
}

declare module "@mui/material/Button" {
	interface ButtonPropsColorOverrides {
		black: true;
	}
}
declare module "@mui/material/TextField" {
	interface TextFieldPropsColorOverrides {
		white: true;
	}
}

const blackBase = "#000";
const blackMain = alpha(blackBase, 0.7);

const whiteBase = "#fff";
const whiteMain = alpha(whiteBase, 0.7);

const theme = createTheme({
	palette: {
		black: {
			main: blackMain,
			light: alpha(blackBase, 0.5),
			dark: alpha(blackBase, 0.9),
			contrastText: getContrastRatio(blackBase, "#fff") > 4.5 ? "#fff" : "#111",
		},
		white: {
			main: whiteMain,
			light: alpha(whiteBase, 0.5),
			dark: alpha(whiteBase, 0.9),
			contrastText: getContrastRatio(whiteBase, "#fff") > 4.5 ? "#fff" : "#111",
		},
	},
});

export function Canvas(props: {
	lifeTree: TreeView<typeof Life>;
	momentTree: TreeView<typeof ClientSession>;
	audience: IServiceAudience<IMember>;
	container: IFluidContainer;
	fluidMembers: IMember[];
	currentUser: IMember | undefined;
	undoRedo: undoRedo;
	setCurrentUser: (arg: IMember) => void;
	setConnectionState: (arg: string) => void;
	setSaved: (arg: boolean) => void;
	setFluidMembers: (arg: IMember[]) => void;
	setShowPrompt: (arg: boolean) => void;
}): JSX.Element {
	const [invalidations, setInvalidations] = useState(0);
	const [open, setOpen] = useState(false);

	// Register for tree deltas when the component mounts.
	// Any time the tree changes, the app will update
	// For more complex apps, this code can be included
	// on lower level components.
	useEffect(() => {
		const unsubscribe = Tree.on(props.lifeTree.root, "treeChanged", () => {
			setInvalidations(invalidations + Math.random());
		});
		return unsubscribe;
	}, []);

	useEffect(() => {
		const updateConnectionState = () => {
			if (props.container.connectionState === ConnectionState.Connected) {
				props.setConnectionState("connected");
			} else if (props.container.connectionState === ConnectionState.Disconnected) {
				props.setConnectionState("disconnected");
			} else if (props.container.connectionState === ConnectionState.EstablishingConnection) {
				props.setConnectionState("connecting");
			} else if (props.container.connectionState === ConnectionState.CatchingUp) {
				props.setConnectionState("catching up");
			}
		};
		updateConnectionState();
		props.setSaved(!props.container.isDirty);
		props.container.on("connected", updateConnectionState);
		props.container.on("disconnected", updateConnectionState);
		props.container.on("dirty", () => props.setSaved(false));
		props.container.on("saved", () => props.setSaved(true));
		props.container.on("disposed", updateConnectionState);
	}, []);

	const updateMembers = () => {
		if (props.audience.getMyself() == undefined) return;
		if (props.audience.getMyself()?.id == undefined) return;
		if (props.audience.getMembers() == undefined) return;
		if (props.container.connectionState !== ConnectionState.Connected) return;
		if (props.currentUser === undefined) {
			const user = props.audience.getMyself();
			if (user !== undefined) {
				props.setCurrentUser(user);
			}
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		props.setFluidMembers(Array.from(props.audience.getMembers()).map(([_, member]) => member));
	};

	useEffect(() => {
		props.audience.on("membersChanged", updateMembers);
		return () => {
			props.audience.off("membersChanged", updateMembers);
		};
	}, []);

	const clientId = props.currentUser?.id ?? "";

	return (
		<div className="relative flex grow-0 h-full w-full bg-transparent">
			<LifeView
				life={props.lifeTree.root}
				clientId={clientId}
				clientSession={props.momentTree.root}
				fluidMembers={props.fluidMembers}
			/>
			<ThemeProvider theme={theme}>
				<Button
					size="large"
					variant="outlined"
					// TODO:  update to add custom theme
					color="black"
					startIcon={<Add />}
					style={{
						position: "fixed",
						backgroundColor: "#ffcc64",
						bottom: "5%",
						right: "3%",
						zIndex: 1000,
					}}
					onClick={() => setOpen(true)}
				>
					New Story
				</Button>
			</ThemeProvider>
			<StorylineDialog
				type="new"
				isOpen={open}
				setIsOpen={setOpen}
				life={props.lifeTree.root}
			/>
		</div>
	);
}

export function LifeView(props: {
	life: Life;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
}): JSX.Element {
	const [inputValue, setInputValue] = useState<string>("");
	const inputRef = React.useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}, []);

	function addMoment(momentDescription: string) {
		const momentToStorylineMapping = [...props.life.moments.values()].flatMap(
			(m) => (
				m.storyLineIds.map(
					(id) => ({ moment: m.description, storyLine: props.life.storyLines.get(id)?.name })
				)
			)
		);
		const allStorylines = [...props.life.storyLines.values()].map((s) => s.name);
		const sampleData = { allStorylines, momentToStorylineMapping };
		console.log("sampleData", sampleData);
		// ! TODO: try and populate what we have, and have GPTService update it when response comes in
		// ! TODO: add support for local service when not connected to GPT API
		GPTService.prompt(momentDescription, JSON.stringify(sampleData))
			.then((response: IGPTPromptResponse) => {
				const storyLine = props.life.storyLines.createAndGetStoryLine(
					response.storyLine.name,
					response.storyLine.isExisting,
				);
				props.life.createAndAddMoment(response.momentDescription, storyLine);
			})
			.catch((e) => {
				console.error("Unexpected error while prompting GPTService", e);
			});
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			const description = inputValue;
			setInputValue("");
			addMoment(description);
		}
	};

	return (
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "space-between",
				backgroundColor: "#121212",
			}}
		>
			<StoryLinesViewContent
				storyLines={props.life.storyLines}
				moments={props.life.moments}
				{...props}
			/>
			<div className="responsive-div" style={{width: "350px"}}>
				<TextField
					variant="standard"
					value={inputValue}
					placeholder="What just happened?"
					InputProps={{
						style: { color: "#fff", fontSize: "2rem" },
						className: "roboto-bold",
						disableUnderline: true,
					}}
					inputRef={inputRef}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={(e) => handleKeyDown(e)}
				/>
				<VoiceInput life={props.life} handleMicClick={addMoment} />
			</div>
		</div>
	);
}

function StoryLinesViewContent(props: {
	life: Life;
	storyLines: StoryLineMap;
	moments: MomentMap;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
}): JSX.Element {
	const storyLinesArray =
		props.storyLines.size > 0
			? [...props.storyLines.values()].map((storyLine, index) => (
					<StoryLineView
						life={props.life}
						key={storyLine.id}
						storyLine={storyLine}
						moments={props.moments}
						clientId={props.clientId}
						clientSession={props.clientSession}
						fluidMembers={props.fluidMembers}
						index={index}
					/>
			  ))
			: null;

	return (
		<>
			<div
				className={`flex ${
					storyLinesArray ? "flex-wrap" : "hidden"
				} w-full gap-4 p-4 content-start`}
				style={{ overflow: "auto" }}
			>
				{storyLinesArray}
			</div>
		</>
	);
}
