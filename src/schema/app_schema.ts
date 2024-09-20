/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	TreeViewConfiguration,
	SchemaFactory,
	Tree,
	TreeNode,
	TreeArrayNode,
	InsertableTypedNode,
} from "fluid-framework";
import { v4 as uuid } from "uuid";

// Schema is defined using a factory object that generates classes for objects as well
// as list and map nodes.

// Include a UUID to guarantee that this schema will be uniquely identifiable.
const sf = new SchemaFactory("a7245fab-24f7-489d-a726-4ff3ee793719");

export class Tag extends sf.object(
	"Tag",
	// Fields for tags
	{
		name: sf.string,
	},
) {
	// Update the name of the tag
	public updateName(name: string) {
		this.name = name;
	}
}

const MomentType = {
	session: "Session",
	workshop: "Workshop",
	panel: "Panel",
	keynote: "Keynote",
};

export class Moment extends sf.object("Moment", {
	id: sf.identifier,
	created: sf.number,
	/** What happened? */
	description: sf.string,
	/** Additional details about what happened */
	additionalNotes: sf.optional(sf.string),
	storyLineIds: sf.array(sf.string),
	lastChanged: sf.number,
}) {
	public static create(description: string, additionalNotes?: string): Moment {
		return new Moment({
			id: uuid(),
			created: Date.now(),
			description,
			additionalNotes,
			storyLineIds: [],
			lastChanged: Date.now(),
		});
	}
	public updateDescription(text: string) {
		this.lastChanged = new Date().getTime();
		this.description = text;
	}

	// Update the additional notes & timestamp
	public updateNotes(text: string) {
		this.lastChanged = new Date().getTime();
		this.additionalNotes = text;
	}

	public updateStoryLineIds(storyLineIds: string[]) {
		// Clear the list of IDs and insert provided ones
		this.storyLineIds.removeRange();
		storyLineIds.forEach((id) => {
			this.storyLineIds.insertAtEnd(id);
		});
	}

	/**
	 * Removes a node from its parent.
	 */
	public delete() {
		const parent = Tree.parent(this);
		// Use type narrowing to ensure that parent is correct.
		if (Tree.is(parent, Moments)) {
			const index = parent.indexOf(this);
			parent.removeAt(index);
		}
	}
}

export class Moments extends sf.array("Moments", Moment) {
	// Add a moment to the life
	public addMoment(description?: string) {
		const currentTime = new Date().getTime();
		if (description === undefined) {
			description = "New Session";
		}
		const moment = new Moment({
			id: uuid(),
			description,
			additionalNotes: "Add a description",
			created: currentTime,
			lastChanged: currentTime,
			storyLineIds: [],
		});
		this.insertAtEnd(moment);
		return moment;
	}
}

export class Days extends sf.array("Days", Moments) {
	// Add a day to the Life
	public addDay(): Moments {
		const day = new Moments([]);
		this.insertAtEnd(day);
		return day;
	}

	// Remove the last day from the Life
	public removeDay() {
		if (this.length === 0) {
			return;
		}
		// Get the life object from the parent of this map
		const life = Tree.parent(this);
		// Get the sessions array from the life object
		// and move all the sessions in the Day to the sessions array
		if (Tree.is(life, Life)) {
			const sessions = life?.moment;
			const lastDay = this[this.length - 1];
			if (lastDay) {
				Tree.runTransaction<Days>(this, () => {
					// Move all the sessions in the Day to the sessions array
					if (lastDay.length !== 0) {
						const index = sessions.length;
						sessions.moveRangeToIndex(index, 0, lastDay.length, lastDay);
					}
					// Remove the day from the Life
					this.removeAt(this.length - 1);
				});
			}
		}
	}
}

export class Life extends sf.object("Life", {
	name: sf.string,
	moment: Moments,
	days: Days,
	sessionsPerDay: sf.number,
}) {
	// Clear all the moments from the life
	public clear() {
		Tree.runTransaction<Life>(this, () => {
			if (this.moment.length > 0) this.moment.removeRange();
			if (this.days.length > 0) this.days.removeRange();
		});
	}
}

// Export the tree config appropriate for this schema.
// This is passed into the SharedTree when it is initialized.
export const appTreeConfiguration = new TreeViewConfiguration({
	// Schema for the root
	schema: Life,
});

export class MomentMap extends sf.map("MomentMap", Moment) {
	public createMoment(description: string, additionalNotes?: string) {
		const moment = Moment.create(description, additionalNotes);
		this.set(moment.id, moment);
	}
}

export class StoryLine extends sf.object("StoryLine", {
	id: sf.identifier,
	name: sf.string,
	momentIds: sf.array(sf.string),
}) {
	public static create(name: string, momentIds: string[] = []): StoryLine {
		return new StoryLine({
			id: uuid(),
			name,
			momentIds,
		});
	}

	public updateMomentIds(momentIds: string[]) {
		// Clear the list of IDs and insert provided ones
		this.momentIds.removeRange();
		momentIds.forEach((id) => {
			this.momentIds.insertAtEnd(id);
		});
	}
}

export class StoryLineMap extends sf.map("StoryLineMap", StoryLine) {
	public createStoryLine(name: string, momentIds: string[] = []) {
		const storyLine = StoryLine.create(name, momentIds);
		this.set(storyLine.id, storyLine);
	}
}

export class Life2 extends sf.object("Life", {
	moments: MomentMap,
	storyLines: StoryLineMap,
}) {
	/**
	 * This method simply creates sample fake data for testing purposes
	 */
	public static getSampleData(): InsertableTypedNode<typeof Life2> {
		const moment = Moment.create("arrived at Disneyland");
		const storyLine = StoryLine.create("Vacation", [moment.id]);
		moment.updateStoryLineIds([storyLine.id]);
		return {
			moments: [[moment.id, moment]],
			storyLines: [[storyLine.id, storyLine]],
		};
	}
}

export const newAppTreeConfiguration = new TreeViewConfiguration({
	schema: Life2,
});
