import React, { useState } from "react";
import { Life } from "../schema/app_schema.js";
import { IconButton } from "@mui/material";
import { MicOff, MicOutlined } from "@mui/icons-material";
//@ts-ignore
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { getDateTime } from "./canvas_ux.js";
//@ts-ignore
import createSpeechServicesPonyfill from "web-speech-cognitive-services";

const SUBSCRIPTION_KEY = process.env.AZURE_SPEECH_KEY;
const REGION = `westus`;

const { SpeechRecognition: AzureSpeechRecognition } = createSpeechServicesPonyfill({
	credentials: {
		region: REGION,
		subscriptionKey: SUBSCRIPTION_KEY,
	},
});
SpeechRecognition.applyPolyfill(AzureSpeechRecognition);

export function VoiceInput(props: {
	life: Life;
	handleMicClick: (prompt: string) => void;
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
			SpeechRecognition.abortListening();
			console.log("transcript: " + transcript);

			props.handleMicClick(transcript);
			resetTranscript();
			if (props.setIsOpen) {
				props.setIsOpen(false);
			}
		} else {
			console.log("Starting Mic");
			SpeechRecognition.startListening({
				continuous: true,
				language: "en-US",
			});
		}
		setIsListening(!isListening);
	};

	return (

			<IconButton onClick={handleMicClick} sx={{ color: "#fff", height: "50px" }}>
				{isListening ? <MicOff /> : <MicOutlined />}
			</IconButton>
	);
}
