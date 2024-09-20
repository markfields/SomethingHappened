/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React from "react";
import { Moment, MomentMap, StoryLine, StoryLineMap } from "../schema/app_schema.js";
import { moveItem } from "../utils/app_helpers.js";
import { ConnectableElement, useDrop } from "react-dnd";
import { dragType } from "../utils/utils.js";
import { ClientSession } from "../schema/session_schema.js";
import { IMember, Tree } from "fluid-framework";
import { RootMomentWrapper } from "./moment_ux.js";

export function StoryLineView(props: {
	storyLine: StoryLine;
	moments: MomentMap;
	clientId: string;
	clientSession: ClientSession;
	fluidMembers: IMember[];
}): JSX.Element {
	const [{ isOver, canDrop }, drop] = useDrop(() => ({
		accept: [dragType.MOMENT],
		collect: (monitor) => ({
			isOver: !!monitor.isOver({ shallow: true }),
			canDrop: !!monitor.canDrop(),
		}),
		canDrop: (item) => {
			if (Tree.is(item, Moment)) return true;
			return false;
		},
		drop: (item, monitor) => {
			const didDrop = monitor.didDrop();
			if (didDrop) {
				return;
			}

			const isOver = monitor.isOver({ shallow: true });
			if (!isOver) {
				return;
			}

			const droppedItem = item;
			// if (Tree.is(droppedItem, Moment)) {
			// 	moveItem(droppedItem, props.sessions.length, props.sessions);
			// }

			return;
		},
	}));

	function attachRef(el: ConnectableElement) {
		drop(el);
	}

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
	};

	let backgroundColor = "bg-gray-200";
	let formatting = "p-2 transition-all overflow-auto";
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
		>
			<div className={backgroundColor + " " + formatting}>
				<StoryLineTitle title={props.storyLine.name} />
				<StoryLineViewContent {...props} />
			</div>
		</div>
	);
}

function StoryLineTitle(props: { title: string }): JSX.Element {
	if (props.title === "") {
		return <></>;
	} else {
		return (
			<div className="flex flex-row justify-between">
				<div className="flex w-0 grow p-1 mb-2 mr-2 text-lg font-bold text-black bg-transparent">
					{props.title}
				</div>
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
}): JSX.Element {
	const momentArray = props.storyLine.momentIds.map((id) => props.moments.get(id)!);
	const momentContentArray = [...momentArray]
		.sort((a, b) => a.created - b.created)
		.map((moment) => (
			<RootMomentWrapper
				key={`${props.storyLine.id}-${moment.id}`}
				moment={moment}
				storyLine={props.storyLine}
				clientId={props.clientId}
				clientSession={props.clientSession}
				fluidMembers={props.fluidMembers}
			/>
		));

	return (
		<>
			<div className="flex overflow-auto gap-4 p-4 content-start">{momentContentArray}</div>
		</>
	);
}
