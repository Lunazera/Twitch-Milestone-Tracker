/* Milestone Tracker */
/* by lunazera */
/* ********* */
/* ********* */



'use strict';

/* Globals *******************************************************************/
const slime2 = window.slime2;

const Widget = {
	readAccount: { id: '' },
	values: new Map(),
};

let ws;  // will contain our websocket connection

let barType;  // Type setting of bar  = Widget.values.get('bar-type')

let amount = "$0";  // value of amount progressed in goal bar

let wssData = "$0";  // Data stored from websocket

// Milestone list.
// Assumes list of number, string
let MilestoneList = "";
let ParsedMilestoneList;
let MilestoneIndex = 0;

const textTitle = document.getElementById("text-title");


let numberMilestonesPast = 1;
let numberMilestonesFuture = 1;


/* Slime2 Event Listeners *****************************************************************/

addEventListener('slime2:widget-values', widgetValuesListener);
addEventListener('slime2:widget-accounts', widgetAccountsListener);
addEventListener('slime2:twitch-event', twitchEventListener);
addEventListener('slime2:widget-button-click', widgetButtonClickListener);

/* Buttons *******************************************************************/
function widgetButtonClickListener(event) {
	if (event.detail.id === 'ws-reconnect') {
		closeWebsocket();
		// setTimeout(function() {
		// 	connect();
		// }, 1000);
	}
}

/* Values changing (this runs every time widget value changes *******************************************************************/
function widgetValuesListener(event) {
	Widget.values = new Map(Object.entries(event.detail));  // Loads widget values in

	/// Load in data into 'amount'
	// If server connect is off, use our test value instead for "amount"
	// If server connect is toggled back on, loads whatever was last in websocket data
	if (Widget.values.get('server-connect') ?? false) {
		amount = wssData;
	} else {
		amount = "$" + Widget.values.get('test-amount-val') ?? 500;
	}


	numberMilestonesPast = Widget.values.get('n-prev-milestones') ?? 1;
	numberMilestonesFuture = Widget.values.get('n-next-milestones') ?? 1;

	updateMilestones(amount);

	// Set reference to widget ID
	const widgetElement = document.getElementById('widget');

	// Functions to process and set CSS from widget settings
	// use in CSS as var(--custom-[cssVarName])
	function setCustomCSS(cssVarName, value) {
		widgetElement.style.setProperty(`--custom-${cssVarName}`, value);
	}

	function addClass(...classes) {
		widgetElement.classList.add(...classes);
	}

	function removeClass(...classes) {
		widgetElement.classList.remove(...classes);
	}

	function toggleClass(className, force) {
		widgetElement.classList.toggle(className, force);
	}

	function loadWidgetTextSettings(prefix = '') {
		// appearance settings
		[
			[prefix + 'font-name', `"${Widget.values.get(prefix + 'font-name') ?? 'Inter'}"`],
			[prefix + 'font-weight', Widget.values.get(prefix + 'font-weight') ?? 'normal'],
			[prefix + 'text-z', Widget.values.get(prefix + 'text-z') ?? '1'],
			[prefix + 'font-size', `${Widget.values.get(prefix + 'font-size') ?? 14}px`],
			[prefix + 'text-color', Widget.values.get(prefix + 'text-color') ?? 'red'],
			[prefix + 'text-align', Widget.values.get(prefix + 'text-align') ?? 'center'],
			[prefix + 'text-outline', `${Widget.values.get(prefix + 'text-outline') ?? 0}px`],
			[prefix + 'padding-left', `${Widget.values.get(prefix + 'padding-left') ?? 0}px`],
			[prefix + 'padding-right', `${Widget.values.get(prefix + 'padding-right') ?? 0}px`],
			[prefix + 'padding-top', `${Widget.values.get(prefix + 'padding-top') ?? 0}px`],
			[prefix + 'padding-bottom', `${Widget.values.get(prefix + 'padding-bottom') ?? 0}px`],
			[prefix + 'text-outline-color', Widget.values.get(prefix + 'text-outline-color') ?? 'black'],
			[prefix + 'text-background-color', Widget.values.get(prefix + 'text-background-color') ?? 'white'],
		].forEach(([cssVarName, value]) => {
			setCustomCSS(cssVarName, value);
		});

		setCustomCSS(prefix + 'text-background-border-radius', `${Widget.values.get(prefix + 'text-background-border-radius') ?? 5}px`);

		if (Widget.values.get(prefix + 'text-area-radius-toggle')) {
			setCustomCSS(prefix + 'text-background-border-radius', 
				`${Widget.values.get(prefix + 'corner-radius-top-left') ?? 5}px`
				+ ` ${Widget.values.get(prefix + 'corner-radius-top-right') ?? 5}px`
				+ ` ${Widget.values.get(prefix + 'corner-radius-bottom-left') ?? 5}px`
				+ ` ${Widget.values.get(prefix + 'corner-radius-bottom-right') ?? 5}px`
			);
		} else {
			setCustomCSS(prefix + 'text-background-border-radius', `${Widget.values.get(prefix + 'text-background-border-radius') ?? 5}px`);
		}

		// 
		// [prefix + 'text-background-color', Widget.values.get(prefix + 'text-background-color') ?? 'white'],
		// [prefix + 'text-background-border-radius', `${Widget.values.get(prefix + 'text-background-border-radius') ?? 5}px`],

		// Position settings

		if (Widget.values.get(prefix + 'text-adjust-toggle')) {
			[
				[prefix + 'text-left', `${Widget.values.get(prefix + 'text-adjust-x') ?? 0}px`],
				[prefix + 'text-top', `${Widget.values.get(prefix + 'text-adjust-y') ?? 0}px`],
				[prefix + 'text-rotate', `${Widget.values.get(prefix + 'text-rotate') ?? 0}deg`],
			].forEach(([cssVarName, value]) => {
				setCustomCSS(cssVarName, value);
			});
		} else {
			[
				[prefix + 'text-left', `0px`],
				[prefix + 'text-top', `0px`],
				[prefix + 'text-rotate', `0deg`],
			].forEach(([cssVarName, value]) => {
				setCustomCSS(cssVarName, value);
			});
		}

		// Shadow settings
		[
			[prefix + 'text-shadow-blur', `${Widget.values.get(prefix + 'text-shadow-blur') ?? 0}px`],
			[prefix + 'text-shadow-offset-x', `${Widget.values.get(prefix + 'text-shadow-offset-x') ?? 0}px`],
			[prefix + 'text-shadow-offset-y', `${Widget.values.get(prefix + 'text-shadow-offset-y') ?? 0}px`],
		].forEach(([cssVarName, value]) => {
			setCustomCSS(cssVarName, value);
		});

		if (Widget.values.get(prefix + 'text-shadow-toggle')) {
			setCustomCSS(prefix + 'text-shadow-color', Widget.values.get(prefix + 'text-shadow-color') ?? 'black');
		} else {
			setCustomCSS(prefix + 'text-shadow-color', 'none');
		}
	}

	loadWidgetTextSettings();
	// loadWidgetTextSettings('title-');

	loadWidgetTextSettings('amount-');



	// Toggle change of amount styling separately
	let rowsAmounts = document.querySelectorAll('.milestone-amounts');

	for (let i = 0; i < rowsAmounts.length; i++) {
		rowsAmounts[i].classList.toggle('milestone-amounts-settings', Widget.values.get('amount-text-appearance-toggle'));
		rowsAmounts[i].classList.toggle('milestone-amounts-background', Widget.values.get('amount-text-background-toggle'));
		rowsAmounts[i].classList.toggle('milestone-amounts-shadow', Widget.values.get('amount-text-shadow-toggle'));
		rowsAmounts[i].classList.toggle('milestone-amounts-position', Widget.values.get('amount-text-adjust-toggle'));
	}


	function loadMilestoneAppearanceSettings(prefix = '') {
		setCustomCSS(prefix + 'color-settings', (Widget.values.get(prefix + 'color-settings') ?? 'red'));
		setCustomCSS(prefix + 'font-weight', (Widget.values.get(prefix + 'font-weight') ?? 'normal'));
		setCustomCSS(prefix + 'text-outline', (`${Widget.values.get(prefix + 'text-outline') ?? 0}px`));
		setCustomCSS(prefix + 'text-outline-color', (Widget.values.get(prefix + 'text-outline-color') ?? 'red'));

		[
			[prefix + 'text-shadow-blur', `${Widget.values.get(prefix + 'text-shadow-blur') ?? 0}px`],
			[prefix + 'text-shadow-offset-x', `${Widget.values.get(prefix + 'text-shadow-offset-x') ?? 0}px`],
			[prefix + 'text-shadow-offset-y', `${Widget.values.get(prefix + 'text-shadow-offset-y') ?? 0}px`],
		].forEach(([cssVarName, value]) => {
			setCustomCSS(cssVarName, value);
		});

		if (Widget.values.get(prefix + 'text-shadow-toggle')) {
			setCustomCSS(prefix + 'text-shadow-color', Widget.values.get(prefix + 'text-shadow-color') ?? 'black');
		} else {
			setCustomCSS(prefix + 'text-shadow-color', 'none');
		}
	}

	loadMilestoneAppearanceSettings('previous-');
	loadMilestoneAppearanceSettings('current-');
	
	// table settings
	setCustomCSS('table-spacing', 
		`0px`  // ${Widget.values.get('table-x-spacing') ?? 0}px   <- this would let you also use a slider for horizontal spacing. but 
		+ ` ${Widget.values.get('table-y-spacing') ?? 0}px`
	);
	setCustomCSS('table-margin-left', `${Widget.values.get('table-margin-left') ?? 0}px`);
	setCustomCSS('table-margin-top', `${Widget.values.get('table-margin-top') ?? 0}px`);

}


function AdjustMilestoneClasses() {
	if ((Widget.values.get('previous-milestones-toggle') ?? true)) {
		let previousRows = document.querySelectorAll('.milestone-past');
		console.log("previous rows found: " + previousRows.length);
		for (let i = 0; i < previousRows.length; i++) {
			previousRows[i].classList.toggle('milestone-past-appearance', Widget.values.get('previous-milestones-toggle'));
		}
	}
	if ((Widget.values.get('current-milestones-toggle') ?? true)) {
		let currentRows = document.querySelectorAll('.milestone-current');
		for (let i = 0; i < currentRows.length; i++) {
			currentRows[i].classList.toggle('milestone-current-appearance', Widget.values.get('current-milestones-toggle'));
		}
	}
}

/* Widget account load listener (this runs once) *******************************************************************/
function widgetAccountsListener(event) {
	const accounts = event.detail?.accounts ?? [];

	Widget.readAccount = accounts[0] ?? Widget.readAccount;
	connect();
}

/* Twitch event Listeners *******************************************************************/
function twitchEventListener(event) {
	const { type, data } = event.detail;

	// https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/
	// event.detail.data = event of each of these EventSub payloads
	switch (type) {
		// chat
		case 'channel.chat.message':
		case 'channel.chat.message_delete':
		case 'channel.chat.clear':
		case 'channel.chat.clear_user_messages':
		case 'channel.chat.notification':

		// follow
		case 'channel.follow':

		// raid
		case 'channel.raid':

		// shoutout
		case 'channel.shoutout.create':

		// channel points
		case 'channel.channel_points_custom_reward_redemption.add':
		case 'channel.channel_points_automatic_reward_redemption.add':

		// hype train
		case 'channel.hype_train.begin':
		case 'channel.hype_train.progress':
		case 'channel.hype_train.end':

		// bits
		case 'channel.bits.use':
		case 'channel.cheer':
		case 'channel.custom_power_up_redemption.add':

		// ad break
		case 'channel.ad_break.begin':

		// subscriptions
		case 'channel.subscribe':
		case 'channel.subscription.gift':
		case 'channel.subscription.message':

		// polls
		case 'channel.poll.begin':
		case 'channel.poll.progress':
		case 'channel.poll.end':

		// predictions
		case 'channel.prediction.begin':
		case 'channel.prediction.progress':
		case 'channel.prediction.lock':
		case 'channel.prediction.end':

		// charity
		case 'channel.charity_campaign.donate':
		case 'channel.charity_campaign.start':
		case 'channel.charity_campaign.progress':
		case 'channel.charity_campaign.stop':

		// goal
		case 'channel.goal.begin':
		case 'channel.goal.progress':
		case 'channel.goal.end':
	}
}

/* Websocket Connection *******************************************************************/
function connect() {
	const WEBSOCKET_URL = Widget.values.get("wss-url") ?? '';  // gets URL from widgets
	if (typeof ws === 'undefined') {
		// check if websocket has been defined already
		tryWebsocket(WEBSOCKET_URL);
	}
	if (ws.readyState === 3) {
		tryWebsocket(WEBSOCKET_URL);
	}
	// switch(ws.readyState) {
	// 	case 0:
	// 		// Still connecting
	// 		break;
	// 	case 1:
	// 		// Open
	// 		console.log("Websocket is currently open!");
	// 		break;
	// 	case 2:
	// 		// Closing
	// 		console.log("Websocket is trying to close");
	// 		break;
	// 	case 3:
	// 		// Closed or couldn't open
	// 		console.log("Websocket is closed or failed to connect.");

	// 		break;
	// }
	ws.onmessage = wsOnMessage;
	ws.onclose = wsOnClose;
	ws.onerror = wsOnError;
}

function tryWebsocket(url) {
	if (url !== '') {
		// If URL is entered
		console.log("Connecting to websocket server: " + url);
		ws = new WebSocket(url);
	} else {
		console.log("Websocket URL was empty");
	}
}

function closeWebsocket() {
	if (typeof ws !== 'undefined') {
		// check if websocket has been defined already
		ws.close();
		console.log("Closing websocket!");
	}
}

/* Websocket Events *******************************************************************/
var wsOnMessage = function(event) {
	wssData = event.data;
	amount = event.data;

	updateMilestones(amount);
}

var wsOnClose = function(e) {
	console.log("Socket closed. Reconnecting in 5 seconds...", e.reason);
	setTimeout(connect, 5000);
};

var wsOnError = function(err) {
	console.error("WebSocket error observed:", err);
};


/* Helpers *******************************************************************/




/* Progress Bar *******************************************************************/


/* Milestones *******************************************************************/

/// Reads and parses the milestone list for usage
function readMilestoneList() {
	let parsedList = '';
	MilestoneList = Widget.values.get('milestone-list') ?? '';
	if (MilestoneList != '') {
		// split by first delimiter level
		parsedList = MilestoneList.split('\n').reduce( (newArr, element, i) => {
			// split by second delimiter level
			let subList = element.split(',');
			newArr[i] = subList;

			return newArr;
		}, []);
	}

	ParsedMilestoneList = parsedList.sort(function(a,b) {
		return a[0]-b[0]
	});

	return parsedList;
}

/// Takes parsed milestone list and writes a table of milestones
function writeMilestoneList() {
	clearMilestoneList();
	for (var i=0; i < ParsedMilestoneList.length; i++) {
		const milestoneamount = getMilestoneAmount(i);
		const milestonetext = getMilestoneText(i);
		writeMilestoneRow(milestoneamount, milestonetext, `milestone-${
		i + 1 <= MilestoneIndex ? "past" :
		i + 1 == MilestoneIndex + 1 ? "current" : "future"
		}`, i + 1 < MilestoneIndex, 
		!((i + 1 <= MilestoneIndex + numberMilestonesFuture) && (i + 1 >= MilestoneIndex - numberMilestonesPast)) );
	}
}

/// Deletes all rows in reverse.
function clearMilestoneList() {
	const table = document.getElementById('MilestoneTableBody');
	const rowCount = table.rows.length;
	for (let i = rowCount - 1; i >= 0; i--) {
		table.deleteRow(i)
	}
}

/// 
function writeMilestoneRow(amount, text, classname, drawbar = false, hide = false) {
	let row = document.getElementById('MilestoneTableBody').insertRow(-1);
	let cell1 = row.insertCell(0);
	let cell2 = row.insertCell(1);
	let cell3 = row.insertCell(2);

	// Apply styling and content to individual cells

	// row.className += classname;
	cell1.className += 'milestone-decoration'

	cell2.className += classname + ' text' + ' milestone-amounts';
	cell3.className += classname + ' text' + ' milestone-text';

	cell2.innerHTML = amount;
	cell3.innerHTML = text;


	// Draws decoration to the left of milestones
	// turned off for now...

	// if (drawbar) {
	// 	cell1.innerHTML = `<span class="milestone-rect-container">
	// 						<div class="milestone-dot"></div><div class="milestone-rect"></div>
	// 						</span>`;
	// } else {
	// 	cell1.innerHTML = `<span class="milestone-rect-container">
	// 						<div class="milestone-dot"></div>
	// 						</span>`;
	// }


	// hide entire row
	if (hide) {
		row.className += ' hide';
	}
}


/// Gets milestone amount from index and returns float
function getMilestoneAmount(index) {
	return parseFloat(ParsedMilestoneList[index][0]);
}

/// Gets milestone text from index
function getMilestoneText(index) {
	return ParsedMilestoneList[index][1];
}

/// Gets previous milestone amount based on stored current index
function getPreviousMilestoneAmount() {
	if (MilestoneIndex > 0) {
		return getMilestoneAmount(MilestoneIndex - 1)
	} else {
		return getMilestoneAmount(0);
	}
}

/// Finds the next milestone based on amount, and updates Milestone Index
function findNextMilestone(val) {
	// First check if its a string format or number already
	let currentAmount = 0;
	if (typeof val === 'string') {
		currentAmount = parseFloat(val.replace(/[$,]/g, ''));  // Check string for "$200"
		if (isNaN(currentAmount)) {
			currentAmount = 0;
			return;
		}
	} else {
		currentAmount = val;
	}

	// Now parse through list
	for (var i=0; i < ParsedMilestoneList.length; i++) {
		var amount = getMilestoneAmount(i);

		MilestoneIndex = i;

		if (currentAmount < amount) {
			break;
		}
	}
}

/// Update loop to run for milestones
function updateMilestones(amount) {
	readMilestoneList();
	findNextMilestone(amount);

	writeMilestoneList();
	AdjustMilestoneClasses();
}
