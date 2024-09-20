import React, { useState } from "react";
import { Life } from "../schema/app_schema.js";
import { IconButton } from "@mui/material";
import { MicOff, MicOutlined } from "@mui/icons-material";
//@ts-ignore
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";

export function VoiceInput(props: {
	life: Life;
	handleMicClick: (momentDescription: string) => void;
	setIsOpen?: (arg: boolean) => void;
}): JSX.Element {
	const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } =
		useSpeechRecognition();
	const [isListening, setIsListening] = useState(listening);

	if (!browserSupportsSpeechRecognition) {
		return <span>Your browser doesn't support speech recognition.</span>;
	}

	const handleMicClick = () => {
		if (isListening) {
			console.log("Stopping Mic");
			SpeechRecognition.stopListening();
			console.log("transcript: " + transcript);

			props.handleMicClick(transcript);
			resetTranscript();
			if (props.setIsOpen) {
				props.setIsOpen(false);
			}
		} else {
			console.log("Starting Mic");
			SpeechRecognition.startListening();
		}
		setIsListening(!isListening);
	};

	return (
		<div style={{ position: "absolute", right: 0, bottom: 0 }}>
			<IconButton onClick={handleMicClick}>
				{isListening ? <MicOff /> : <MicOutlined />}
			</IconButton>
		</div>
	);
}
