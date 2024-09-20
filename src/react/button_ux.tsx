/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import React from "react";
import { MoreVerticalFilled } from "@fluentui/react-icons";

export function ShowDetailsButton(props: { show: (show: boolean) => void }): JSX.Element {
	return (
		<MoreVerticalFilled
			className="bg-transparent hover:bg-gray-600 text-black hover:text-white rounded"
			color="black"
			onClick={() => props.show(true)}
		/>
	);
}
