function formatTimeDelta(seconds) {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const sec = seconds % 60;
	const roundedSec = Math.round(sec * 10) / 10;

	const formatUnit = (value, unit) => {
		return value > 0 ? `${value} ${unit}${value === 1 ? '' : 's'}` : '';
	};

	const formattedHours = formatUnit(hours, 'hour');
	const formattedMinutes = formatUnit(minutes, 'minute');
	const formattedSeconds = formatUnit(roundedSec, 'second');

	const timeStringArray = [formattedHours, formattedMinutes, formattedSeconds].filter(str => str.length > 0);
	const lastElement = timeStringArray.pop();
	const timeString = timeStringArray.length > 0 ? `${timeStringArray.join(', ')} and ${lastElement}` : lastElement;

	return timeString;
}

function capitalizeWords(str) {
	if (!str || typeof str !== 'string') {
		return '';
	}

	return str
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

