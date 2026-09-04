const TRANSLATIONS_URL = '/api/method/wiki.api.get_translations';

export default function translationPlugin(app) {
	app.config.globalProperties.__ = translate;
	window.__ = translate;
}

export async function loadTranslations() {
	if (window.translatedMessages) {
		return window.translatedMessages;
	}

	try {
		const response = await fetch(TRANSLATIONS_URL, {
			method: 'GET',
			credentials: 'same-origin',
			headers: {
				Accept: 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(`translation request failed with status ${response.status}`);
		}

		const payload = await response.json();
		window.translatedMessages = payload?.message || {};
	} catch (error) {
		// Never strand the SPA on a translation failure. Falling back to source
		// strings is preferable to a blank application, while logging makes the
		// failure visible in diagnostics.
		console.error('[Wiki i18n] Failed to preload translations.', error);
		window.translatedMessages = {};
	}

	return window.translatedMessages;
}

function format(message, replace = []) {
	return message.replace(/{(\d+)}/g, (match, number) =>
		typeof replace[number] !== 'undefined' ? replace[number] : match,
	);
}

export function translate(message, replace = [], context = null) {
	const translatedMessages = window.translatedMessages || {};
	let translatedMessage = '';

	if (context) {
		const key = `${message}:${context}`;
		if (translatedMessages[key]) {
			translatedMessage = translatedMessages[key];
		}
	}

	if (!translatedMessage) {
		translatedMessage = translatedMessages[message] || message;
	}

	const hasPlaceholders = /{\d+}/.test(message);
	if (!hasPlaceholders) {
		return translatedMessage;
	}

	return format(translatedMessage, replace);
}
