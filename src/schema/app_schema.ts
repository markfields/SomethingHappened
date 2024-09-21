/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { TreeViewConfiguration, SchemaFactory, Tree, InsertableTypedNode } from "fluid-framework";
import { v4 as uuid } from "uuid";

// Schema is defined using a factory object that generates classes for objects as well
// as list and map nodes.

// Include a UUID to guarantee that this schema will be uniquely identifiable.
const sf = new SchemaFactory("a7245fab-24f7-489d-a726-4ff3ee793719");

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
	public static create(description: string, storyLineIds: string[] = []): Moment {
		return new Moment({
			id: uuid(),
			created: Date.now(),
			description,
			storyLineIds,
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
		if (Tree.is(parent, MomentMap)) {
			parent.delete(this.id);
		}
	}
}

export class MomentMap extends sf.map("MomentMap", Moment) {
	public createMoment(description: string, storyLineIds: string[] = []): Moment {
		const moment = Moment.create(description, storyLineIds);
		this.set(moment.id, moment);
		return moment;
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

	public updateName(name: string) {
		this.name = name;
	}

	public updateMomentIds(momentIds: string[]) {
		// Clear the list of IDs and insert provided ones
		this.momentIds.removeRange();
		momentIds.forEach((id) => {
			this.momentIds.insertAtEnd(id);
		});
	}
	public delete() {
		const parent = Tree.parent(this);
		if (Tree.is(parent, StoryLineMap)) {
			parent.delete(this.id);
		}
	}
}

export class StoryLineMap extends sf.map("StoryLineMap", StoryLine) {
	public createStoryLine(name: string, momentIds: string[] = []) {
		const storyLine = StoryLine.create(name, momentIds);
		this.set(storyLine.id, storyLine);
	}

	private getStoryLineFromName(name: string): StoryLine | undefined {
		return [...this.values()].find((storyLine) => storyLine.name === name);
	}

	public createAndGetStoryLine(name: string, isExisting: boolean): StoryLine {
		if (!isExisting || this.getStoryLineFromName(name) === undefined) {
			this.createStoryLine(name);
		}

		return this.getStoryLineFromName(name)!;
	}
}

export class Life extends sf.object("Life", {
	moments: MomentMap,
	storyLines: StoryLineMap,
}) {
	public createAndAddMoment(momentDescription: string, storyLine: StoryLine) {
		const moment = this.moments.createMoment(momentDescription, [storyLine.id]);
		storyLine.momentIds.insertAtEnd(moment.id);
	}

	/**
	 * This method simply creates sample fake data for testing purposes
	 */
	public static getSampleData(): InsertableTypedNode<typeof Life> {
		// const moments: [string, Moment][] = [];
		const moments = new Map<string, Moment>();
		// const storyLines: [string, StoryLine][] = [];
		const storyLines = new Map<string, StoryLine>();

		/**
		 * This map allows us to not value search the storyLines map for every sample moment
		 * Key: storyLine name
		 * Value: storyLine ID
		 */
		const storyLineIdMap = new Map<string, string>();

		sampleData.forEach((item) => {
			if (!storyLineIdMap.has(item.storyline)) {
				const storyLine = StoryLine.create(item.storyline);
				storyLineIdMap.set(item.storyline, storyLine.id);
				storyLines.set(storyLine.id, storyLine);
			}
			const storyLine = storyLines.get(storyLineIdMap.get(item.storyline)!)!;
			const moment = Moment.create(item.moment);
			moments.set(moment.id, moment);

			storyLine.momentIds.insertAtEnd(moment.id);
			moment.storyLineIds.insertAtEnd(storyLine.id);
		});

		return {
			moments: moments.entries(),
			storyLines: storyLines.entries(),
		};
	}
}

export const sampleData = [
	{ moment: "I ate a cheeseburger", storyline: "food and symptom log" },
	{ moment: "I got a headache", storyline: "food and symptom log" },
	{ moment: "I had a mild sore throat this morning", storyline: "food and symptom log" },
	{ moment: "We landed in France!", storyline: "vacation log" },
	{
		moment: "We met up with Pierre and Yvonne at a cafe in Paris",
		storyline: "vacation log",
	},
	{ moment: "We went to the Louvre this afternoon", storyline: "vacation log" },
];

export const appTreeConfiguration = new TreeViewConfiguration({
	schema: Life,
});
