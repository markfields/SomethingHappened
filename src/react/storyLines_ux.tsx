/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React from "react";
import "./styles.css";
import { Life, Moment, MomentMap, StoryLine } from "../schema/app_schema.js";
import { Save } from "@mui/icons-material";
import { ConnectableElement, useDrop } from "react-dnd";
import { dragType } from "../utils/utils.js";
import { ClientSession } from "../schema/session_schema.js";
import { IMember, Tree } from "fluid-framework";
import { IDragDropMoment, RootMomentWrapper } from "./moment_ux.js";
import {
	Button,
	DialogActions,
	Dialog,
	DialogTitle,
	DialogContent,
	IconButton,
	TextField,
} from "@mui/material";
import { Edit } from "@mui/icons-material";

export function StoryLineView(props: {
	life: Life;
	storyLine: StoryLine;
	moments: MomentMap;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
	index: number;
}): JSX.Element {
	const [open, setOpen] = React.useState(false);

	const [{ isOver, canDrop }, drop] = useDrop(() => ({
		accept: [dragType.MOMENT],
		collect: (monitor) => ({
			isOver: !!monitor.isOver({ shallow: true }),
			canDrop: !!monitor.canDrop(),
		}),
		canDrop: (item: IDragDropMoment) => {
			if (Tree.is(item.moment, Moment)) return true;
			return false;
		},
		drop: (item: IDragDropMoment, monitor) => {
			// Did we process this Moment drop already (aka processed in moment_ux.tsx)
			const didDrop = monitor.didDrop();
			if (didDrop) {
				return;
			}

			const isOver = monitor.isOver({ shallow: true });
			if (!isOver) {
				return;
			}

			item.moment.moveMomentToDifferentStoryLine({
				originStoryLine: item.storyLine,
				destinationStoryLine: props.storyLine,
			});

			return;
		},
	}));

	function attachRef(el: ConnectableElement) {
		drop(el);
	}

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	let storylineColors = ["#ffd4d4", "#c8bdd4", "#ccd5ae", "#fcf6bd", "#95b0cf"];

	let borderFormatting =
		"relative transition-all border-4 border-dashed h-fit overflow-hidden w-full";

	return (
		<div
			onClick={(e) => handleClick(e)}
			ref={attachRef}
			className={
				borderFormatting +
				" " +
				(isOver && canDrop ? "border-gray-500" : "border-transparent")
			}
			style={{ paddingBottom: "10px" }}
		>
			<div
				style={{
					overflow: "auto",
					transition: "all",
					background: "#282424",
					border: "2px solid #f2f2f2",
					borderRadius: "10px",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						width: "100%",
						justifyContent: "space-between",
					}}
				>
					<StoryLineTitle
						title={props.storyLine.name}
						color={storylineColors[props.index % 5]}
					/>
					<IconButton onClick={() => setOpen(true)}>
						<Edit sx={{ color: "#fff" }} />
					</IconButton>
				</div>
				<StoryLineViewContent color={storylineColors[props.index % 5]} {...props} />
			</div>
			<StorylineDialog type="edit" isOpen={open} setIsOpen={setOpen} {...props} />
		</div>
	);
}

function StoryLineTitle(props: { title: string; color: string }): JSX.Element {
	if (props.title === "") {
		return <></>;
	} else {
		return (
			<div
				style={{
					display: "inline-flex",
					flexGrow: 0,
					fontSize: "1.125rem",
					color: "black",
					fontWeight: 700,
					backgroundColor: `${props.color}`,
					whiteSpace: "nowrap",
					padding: "7px",
					borderRadius: "0px 0px 10px 0px",
				}}
				className="roboto-bold"
			>
				{props.title}
			</div>
		);
	}
}

function StoryLineViewContent(props: {
	storyLine: StoryLine;
	moments: MomentMap;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
	color: string;
}): JSX.Element {
	const momentArray = props.storyLine.momentIds.map((id) => props.moments.get(id)!);
	const momentContentArray = [...momentArray].map((moment) => (
		<RootMomentWrapper key={`${props.storyLine.id}-${moment.id}`} moment={moment} {...props} />
	));

	return (
		<>
			<div className="flex overflow-auto gap-4 p-4 content-start">{momentContentArray}</div>
		</>
	);
}

export function StorylineDialog(props: {
	type: string;
	isOpen: boolean;
	setIsOpen: (arg: boolean) => void;
	storyLine?: StoryLine;
	life: Life;
}): JSX.Element {
	const buttonClass = "text-white font-bold py-2 px-4 rounded";

	const [story, setStory] = React.useState(props.storyLine?.name ?? "");
	const handleClose = () => {
		props.setIsOpen(false);
	};

	const handleDelete = () => {
		const confirmation = window.confirm("Are you sure you want to delete this story?");
		if (confirmation) {
			props.storyLine?.delete();
			handleClose();
		}
	};

	const handleSave = () => {
		props.life.storyLines.createStoryLine(story);
		props.setIsOpen(false);
	};

	return (
		<Dialog
			fullWidth={true}
			maxWidth={"sm"}
			open={props.isOpen}
			onClose={handleClose}
			sx={{ "& .MuiPaper-root": { backgroundColor: "#fffcf2" } }}
		>
			{props.type === "edit" ? (
				<>
					<DialogTitle>Edit Story</DialogTitle>
					<DialogContent style={{ paddingTop: "10px" }}>
						<TextField
							label="Storyline Name"
							defaultValue={story}
							onChange={(e) => props.storyLine?.updateName(e.target.value)}
						/>
					</DialogContent>
					<DialogActions>
						<Button onClick={handleDelete} color="error">
							Delete Story
						</Button>
						<Button onClick={handleClose}>Close</Button>
					</DialogActions>
				</>
			) : (
				<>
					<DialogTitle>New Story</DialogTitle>
					<DialogContent style={{ paddingTop: "10px" }}>
						<TextField
							label="Storyline Name"
							onChange={(e) => setStory(e.target.value)}
						/>
					</DialogContent>
					<DialogActions>
						<Button onClick={handleSave} startIcon={<Save />}>
							Save Story
						</Button>
						<Button onClick={handleClose}>Close</Button>
					</DialogActions>
				</>
			)}
		</Dialog>
	);
}
