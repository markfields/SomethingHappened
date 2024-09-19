/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { Tree, TreeStatus } from "fluid-framework";
import { Moment, Moments, Life } from "../schema/app_schema.js";

// Move a note from one position in a sequence to another position in the same sequence or
// in a different sequence. The index being passed here is the desired index after the move.
export function moveItem(session: Moment, destinationIndex: number, destination: Moments) {
	// need to test that the destination or the item being dragged hasn't been deleted
	// because the move may have been initiated through a drag and drop which
	// is asynchronous - the state may have changed during the drag but this function
	// is operating based on the state at the moment the drag began
	if (
		Tree.status(destination) != TreeStatus.InDocument ||
		Tree.status(session) != TreeStatus.InDocument
	)
		return;

	const source = Tree.parent(session);

	// Use Tree.is to narrow the type of source to the correct schema
	if (Tree.is(source, Moments)) {
		const index = source.indexOf(session);
		if (destinationIndex == Infinity) {
			destination.moveToEnd(index, source);
		} else {
			destination.moveToIndex(destinationIndex, index, source);
		}
	}
}

export function findMoment(life: Life, id: string): Moment | undefined {
	for (const s of life.moment) {
		if (s.id === id) return s;
	}
	for (const day of life.days) {
		for (const s of day) {
			if (s.id === id) return s;
		}
	}
	return undefined;
}
