//refactor the exceptions to be pulled from a custom exceptions file
export const ringOfSpellStoring = {
	addSpellErr:		"Your Ring of Spell Storing doesn't have enough room left for a spell!",
	castSpellErr:		"Your Ring of Spell Storing doesn't have any spells on it!",	
	castSpellHeader:	"Which spell do you wan to cast?",
	charHeader: 		"Who is casting onto the ring?",
	currSpellBank:		"Current Spell Bank",
	descLevel: 			", Level ",
	charnamesExceptions:["Shadowfell Vine Strike", "Necrotic Blast", "Summon Shadow Clone", "Animate Shadow Servant", "Mud", "Taunt"],
	initChoices:		["Add Spells", "Cast Spell", "Empty Spells"],
	initHeader: 		"What do you want to cast?",
	levelHeader:		"What level spell do you want to add?",
	levelLabels:		["One", "Two", "Three", "Four", "Five"],
	spellHeader:		"Which spell is being cast onto the ring?",
}

export const instrumentOfTheBards = {
	instrumentSpellNames: {
		anstruthHarp: 		["Control Weather", "Cure Wounds", "Wall of Thorns"],
		canaithMandolin: 	["Cure Wounds", "Dispel Magic", "Protection from Energy (Lightning)"],
		cliLyre: 			["Stone Shape", "Wall of Fire", "Wind Wall"],
		dossLute: 			["Animal Friendship", "Protection from Energy (Fire)", "Protection from Poison"],
		fochlucanBandore: 	["Entangle", "Faerie Fire", "Shillelagh", "Speak with Animals"],
		generic: 			["Fly", "Invisibility", "Levitate", "Protection from Evil and Good"],
		macFuirmidhCittern: ["Barkskin", "Cure Wounds", "Fog Cloud"],
		ollamhHarp: 		["Confusion", "Control Weather", "Fire Storm"]
	},
	initHeader: 			"Choose a spell to cast!"
}

export const spellScroll = {
	scrollLabel:			"Spell Scroll:"
}

export const staffOfSwarmingInsects = {
	allChoices: 			["Giant Insect", "Insect Cloud", "Insect Plague", "Melee (1h)", "Melee (2h)"],
	damageWeaponName:		"Staff of Swarming Insects - Damage",
	flagName:				"staffOfSwarmingInsects",
	initHeader: 			"What do you want to do?",
	meleeChoices: 			["Melee (1h)", "Melee (2h)"],
	spellNames: 			["Giant Insect", "Insect Cloud", "Insect Plague"],
}