/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React, { useEffect, useRef, useState } from "react";
import {
	Autocomplete,
	Box,
	FilterOptionsState,
	Paper,
	TextField,
	createFilterOptions,
} from "@mui/material";
import { Moment, StoryLine } from "../schema/app_schema.js";
import { dragType, selectAction } from "../utils/utils.js";
import { testRemoteNoteSelection, updateRemoteNoteSelection } from "../utils/session_helpers.js";
import { ConnectableElement, useDrag, useDrop } from "react-dnd";
import { useTransition } from "react-transition-state";
import { IMember, Tree } from "fluid-framework";
import { ClientSession } from "../schema/session_schema.js";
import { DragFilled } from "@fluentui/react-icons";
import { Dialog } from "@headlessui/react";
import { ShowDetailsButton } from "./button_ux.js";

export function RootMomentWrapper(props: {
	moment: Moment;
	storyLine: StoryLine;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
	color: string;
}): JSX.Element {
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);

	return (
		<Paper
			elevation={3}
			sx={{
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				zIndex: 10,
				backgroundColor: "#a3b18a",
			}}
		>
			<MomentView setIsDetailsShowing={setIsDetailsOpen} {...props} />
			<MomentDetails
				isOpen={isDetailsOpen}
				setIsOpen={setIsDetailsOpen}
				moment={props.moment}
				storyLine={props.storyLine}
			/>
		</Paper>
	);
}

export function MomentView(props: {
	moment: Moment;
	storyLine: StoryLine;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
	setIsDetailsShowing: (arg: boolean) => void;
	color: string;
}): JSX.Element {
	const mounted = useRef(false);
	let unscheduled = false;

	const color = "#fffcf2";
	const selectedColor = props.color;

	const parent = Tree.parent(props.moment);
	// if (!Tree.is(parent, Moments)) return <></>;
	// const grandParent = Tree.parent(parent);
	// if (Tree.is(grandParent, Life)) unscheduled = true;

	const [{ status }, toggle] = useTransition({
		timeout: 1000,
	});

	const [selected, setSelected] = useState(false);

	const [remoteSelected, setRemoteSelected] = useState(false);

	const [bgColor, setBgColor] = useState(color);

	const [invalidations, setInvalidations] = useState(0);

	const test = () => {
		testRemoteNoteSelection(
			props.moment,
			props.storyLine,
			props.clientSession,
			props.clientId,
			setRemoteSelected,
			setSelected,
			props.fluidMembers,
		);
	};

	const update = (action: selectAction) => {
		updateRemoteNoteSelection(
			props.moment,
			props.storyLine,
			action,
			props.clientSession,
			props.clientId,
		);
	};

	// Register for tree deltas when the component mounts.
	// Any time the tree changes, the app will update
	// For more complex apps, this code can be included
	// on lower level components.
	useEffect(() => {
		// Returns the cleanup function to be invoked when the component unmounts.
		const unsubscribe = Tree.on(props.clientSession, "treeChanged", () => {
			setInvalidations(invalidations + Math.random());
		});
		return unsubscribe;
	}, []);

	useEffect(() => {
		test();
	}, [invalidations]);

	useEffect(() => {
		test();
	}, [props.fluidMembers]);

	useEffect(() => {
		mounted.current = true;
		test();

		return () => {
			mounted.current = false;
		};
	}, []);

	useEffect(() => {
		setBgColor(selected ? selectedColor : color);
	}, [selected]);

	toggle(false);

	useEffect(() => {
		toggle(true);
	}, [Tree.parent(props.moment)]);

	useEffect(() => {
		if (mounted.current) {
			toggle(true);
		}
	}, [props.moment.description, props.moment.additionalNotes]);

	const [{ isDragging }, drag] = useDrag(() => ({
		type: dragType.MOMENT,
		item: { moment: props.moment, storyLine: props.storyLine } as IDragDropMoment,
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	}));

	const [{ isOver, canDrop }, drop] = useDrop(() => ({
		accept: [dragType.MOMENT],
		collect: (monitor) => ({
			isOver: !!monitor.isOver(),
			canDrop: !!monitor.canDrop(),
		}),
		canDrop: (item: IDragDropMoment) => {
			return item.moment !== props.moment;
		},
		drop: (item: IDragDropMoment) => {
			item.moment.moveMomentToDifferentStoryLine({
				originStoryLine: item.storyLine,
				destinationStoryLine: props.storyLine,
				destinationMoment: props.moment,
			});
			return;
		},
	}));

	const attachRef = (el: ConnectableElement) => {
		drag(el);
		drop(el);
	};

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (selected) {
			update(selectAction.REMOVE);
		} else if (e.shiftKey || e.ctrlKey) {
			update(selectAction.MULTI);
		} else {
			update(selectAction.SINGLE);
		}
	};

	let hoverMovement = unscheduled ? "translateX(12px)" : "translateY(12px)";
	let date = new Date(props.moment.created);
	let options: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		hour12: true,
	};
	return (
		<Box
			onClick={(e) => handleClick(e)}
			onDoubleClick={(e) => {
				e.stopPropagation();
				props.setIsDetailsShowing(true);
			}}
			sx={{
				transition: "transform 0.2s ease-out",
				transform: status === "exiting" ? "scale(1.1)" : "none",
			}}
		>
			<Box ref={attachRef}>
				<Paper
					style={{ opacity: isDragging ? 0.5 : 1 }}
					sx={{
						position: "relative",
						display: "flex",
						flexDirection: "column",
						borderRadius: 2,
						backgroundColor: bgColor,
						height: 128,
						width: 230,
						padding: 2,
						opacity: isDragging ? 0.5 : 1,
						transition: "box-shadow 0.3s, transform 0.3s",
						boxShadow: isOver && canDrop ? 4 : 1,
						transform: isOver && canDrop ? hoverMovement : "none",
					}}
				>
					<MomentToolbar
						moment={props.moment}
						setIsDetailsShowing={props.setIsDetailsShowing}
					/>
					<MomentTitle moment={props.moment} update={update} selected={selected} />

					<h5 style={{ color: "#121212", marginLeft: "10px", fontSize: "0.65rem" }}>
						{date.toLocaleString("en-US", options)}
					</h5>
					<RemoteSelection show={remoteSelected} />
				</Paper>
			</Box>
		</Box>
	);
}

export interface IDragDropMoment {
	moment: Moment;
	storyLine: StoryLine;
}

function RemoteSelection(props: { show: boolean }): JSX.Element {
	if (props.show) {
		return (
			<div className="absolute -top-2 -left-2 h-36 w-64 rounded border-dashed border-indigo-800 border-4" />
		);
	} else {
		return <></>;
	}
}

function MomentTitle(props: {
	moment: Moment;
	update: (value: selectAction) => void;
	selected: boolean;
}): JSX.Element {
	// The text field updates the Fluid data model on every keystroke in this demo.
	// This works well with small strings but doesn't scale to very large strings.
	// A Future iteration of SharedTree will include support for collaborative strings
	// that make real-time collaboration on this type of data efficient and simple.

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (e.ctrlKey) {
			props.update(selectAction.MULTI);
		} else {
			props.update(selectAction.SINGLE);
		}
	};

	return (
		<textarea
			style={{
				padding: "0.5rem",
				color: "#121212",
				backgroundColor: "transparent",
				height: "100%",
				width: "100%",
				resize: "none",
				zIndex: 50,
				outline: "none",
			}}
			value={props.moment.description}
			readOnly={true}
			onClick={(e) => handleClick(e)}
			onChange={(e) => props.moment.updateDescription(e.target.value)}
		/>
	);
}

function MomentToolbar(props: {
	moment: Moment;
	setIsDetailsShowing: (arg: boolean) => void;
}): JSX.Element {
	return (
		<div className="flex justify-between z-50">
			<DragFilled />
			<ShowDetailsButton show={props.setIsDetailsShowing} />
		</div>
	);
}

export default function MomentDetails(props: {
	isOpen: boolean;
	setIsOpen: (arg: boolean) => void;
	moment: Moment;
	storyLine: StoryLine;
}): JSX.Element {
	const buttonClass = "text-white font-bold py-2 px-4 rounded";
	return (
		<Dialog
			className="absolute bg-yellow-100 rounded p-4 w-[500px] h-fit m-auto left-0 right-0 top-0 bottom-0 z-50 drop-shadow-xl"
			open={props.isOpen}
			onClose={() => props.setIsOpen(false)}
		>
			<Dialog.Panel className="w-full text-left align-middle">
				<Dialog.Title className="font-bold text-lg pb-1">Moment Details</Dialog.Title>
				<div>
					<input
						className="resize-none border-2 border-gray-500 bg-white mb-2 p-2 text-black w-full h-full"
						value={props.moment.description}
						onChange={(e) => {
							props.moment.updateDescription(e.target.value);
						}}
					/>
					<TypeList moment={props.moment} />
					<textarea
						rows={5}
						className="resize-none border-2 border-gray-500 bg-white mb-2 p-2 text-black w-full h-full"
						value={props.moment.additionalNotes}
						onChange={(e) => {
							props.moment.updateNotes(e.target.value);
						}}
					/>
					<div className="flex flex-row gap-4">
						<button
							className={`bg-gray-500 hover:bg-gray-800 ${buttonClass}`}
							onClick={() => props.setIsOpen(false)}
						>
							Close
						</button>
						<button
							className={`bg-red-500 hover:bg-red-800 ${buttonClass}`}
							onClick={() => {
								props.moment.delete(props.storyLine), props.setIsOpen(false);
							}}
						>
							Delete Moment
						</button>
					</div>
				</div>
			</Dialog.Panel>
		</Dialog>
	);
}

function TypeList(props: { moment: Moment }): JSX.Element {
	const allStoryLines = props.moment.getAllStoryLines();
	if (allStoryLines === undefined) {
		console.error("Unable to retrieve all story lines.");
		return <></>;
	}
	const [selectedStoryLines, setSelectedStoryLines] = React.useState<string[]>(
		props.moment.storyLineIds.map((id) => id),
	);
	const [availableStoryLines, setAvailableStoryLines] = React.useState<string[]>(
		[...allStoryLines.values()].map((storyLine) => storyLine.id),
	);

	const filter = createFilterOptions<string>();

	const convertIdToNames = (ids: string[]) => {
		return ids.map((id) => convertIdToName(id));
	};
	const convertIdToName = (id: string) => {
		const storyLine = allStoryLines.get(id);
		return storyLine ? storyLine.name : id;
	};

	const handleStoryLinesChange = (
		event: React.SyntheticEvent<Element, Event>,
		newValue: string[] | null,
	) => {
		if (newValue !== null) {
			setSelectedStoryLines(newValue);
			// Check if the last value exists and is not already in availableStoryLines
			const lastValue = newValue.at(-1);
			if (lastValue && !availableStoryLines.includes(lastValue)) {
				// ! We don't need to provide moment.id because it'll get updated by the "updateStoryLineIds" call below
				const newStoryLine = allStoryLines.createStoryLine(lastValue);
				setAvailableStoryLines((prev) => [...prev, newStoryLine.id]); // Add new storyLine to available storyLine
				newValue[newValue.length - 1] = newStoryLine.id;
			}
			props.moment.updateStoryLineIds(newValue, allStoryLines);
		}
	};
	const filterOptions = (options: string[], params: FilterOptionsState<string>) => {
		const filtered = filter(options, params);
		const { inputValue } = params;
		const isExisting = options.some((option) => inputValue === option);

		// Suggest creating a new storyLine if it doesn't exist
		if (inputValue !== "" && !isExisting) {
			filtered.push(inputValue);
		}

		return filtered;
	};

	return (
		<>
			<Autocomplete
				multiple
				value={selectedStoryLines}
				onChange={handleStoryLinesChange}
				filterOptions={(options, params) => {
					const filtered = filterOptions(
						availableStoryLines.filter((id) => !selectedStoryLines.includes(id)),
						params,
					);
					return filtered;
				}}
				selectOnFocus
				clearOnBlur
				handleHomeEndKeys
				options={availableStoryLines}
				getOptionLabel={convertIdToName}
				sx={{ width: 300 }}
				freeSolo
				renderInput={(params) => (
					<TextField {...params} variant="standard" label="Add story lines" />
				)}
			/>
		</>
	);
}
