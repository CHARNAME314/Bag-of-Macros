import {getDialogueButtonType} from "../../helper-functions.js"
import {giantInsect as s} from "../../strings/spells.js"
import {summoning} from "../../helpers/summons.js"

const getOverrides = async () => {
	return {
		general: {
			amountToSpawnByIndex: [10, 3, 5, 1]
		}
	}
}
const getSpellIconPaths = (choice) => {
	const index = s.choices.indexOf(choice)
	const actor = game.actors.find(actor => actor.name == s.spawnNames[index])
	const icon = actor?.img ?? false	
	if (!icon) return s.defaultIcons[index]
	return icon
}
const onUse = async ({actor, args, item, token, workflow}) => {
	const choice = await getDialogueButtonType(
		s.choices, 
		{width: s.choices.length * 150, height: "100%"}, 
		s.initHeader, 
		getSpellIconPaths, 
		60, 
		60, 
		[]
	)
	const overrides = await getOverrides(actor, workflow)
	summoning.createSpawn(actor, choice.value, item, overrides, s, token) 
}

export const giantInsect = {
	onUse
}