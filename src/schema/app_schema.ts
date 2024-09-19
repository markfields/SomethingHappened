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

// Define the schema for the Moment object.
// Helper functions for working with the data contained in this object
// are included in this class definition as methods.
export class Moment extends sf.object(
	"Moment",
	// Fields for moments which SharedTree will store and synchronize across clients.
	// These fields are exposed as members of instances of the Moment class.
	{
		id: sf.string,
		title: sf.string,
		abstract: sf.string,
		sessionType: sf.string,
		created: sf.number,
		lastChanged: sf.number,
		tags: sf.array("Tags", Tag),
	},
) {
	// Update the title text and also update the timestamp
	public updateTitle(text: string) {
		this.lastChanged = new Date().getTime();
		this.title = text;
	}

	// Update the abstract text and also update the timestamp
	public updateAbstract(text: string) {
		this.lastChanged = new Date().getTime();
		this.abstract = text;
	}

	public updateTags(newTags: string[]) {
		this.tags.removeRange();
		newTags.forEach((tagName) => {
			const newTag = new Tag({ name: tagName });
			this.tags.insertAtEnd(newTag);
		});
		this.lastChanged = new Date().getTime();
	}

	// Update the session type and also update the timestamp
	public updateSessionType(type: keyof typeof MomentType) {
		this.lastChanged = new Date().getTime();
		this.sessionType = type;
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

const MomentType = {
	session: "Session",
	workshop: "Workshop",
	panel: "Panel",
	keynote: "Keynote",
};

export class Moments extends sf.array("Moments", Moment) {
	// Add a moment to the life
	public addSession(title?: string) {
		const currentTime = new Date().getTime();
		if (title === undefined) {
			title = "New Session";
		}
		const moment = new Moment({
			id: uuid(),
			title,
			abstract: "Add a description",
			sessionType: "session",
			created: currentTime,
			lastChanged: currentTime,
			tags: [],
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

export class Moment2 extends sf.object("Moment", {
	id: sf.string,
	createDate: sf.number,
	/** What happened? */
	description: sf.string,
	/** Additional details about what happened */
	additionalNotes: sf.optional(sf.string),
	storyLineIds: sf.array(sf.string),
}) {
	public static create(description: string, additionalNotes?: string): Moment2 {
		return new Moment2({
			id: uuid(),
			createDate: Date.now(),
			description,
			additionalNotes,
			storyLineIds: [],
		});
	}

	public updateStoryLineIds(storyLineIds: string[]) {
		this.description;
		// Clear the list of IDs and insert provided ones
		this.storyLineIds.removeRange();
		storyLineIds.forEach((id) => {
			this.storyLineIds.insertAtEnd(id);
		});
	}
}

export class MomentMap extends sf.map("MomentMap", Moment2) {
	public createMoment(description: string, additionalNotes?: string) {
		const moment = Moment2.create(description, additionalNotes);
		this.set(moment.id, moment);
	}
}

export class StoryLine extends sf.object("StoryLine", {
	id: sf.string,
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
		const moment = Moment2.create("arrived at Disneyland");
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
