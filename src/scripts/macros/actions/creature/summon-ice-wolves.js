import {getDialogueButtonType} from "../../../helper-functions.js"
import {summonIceWolves as s} from "../../../strings/spells.js"
import {summoning} from "../../../helpers/summons.js"

const getOverrides = async () => {
	const sequencer = await getSequencerData(s.spawnNames[0], s)
	return {
		general: {
			amountToSpawnByIndex: [4]
		},
		sequencer
	}
}
const getSequencerData = async (choice, s) => {
	if (s.sequencerData) return s.sequencerData
	const impactColor = s.impactColors[s.choices.indexOf(choice)]
	const impactNum = s.impactNums[s.choices.indexOf(choice)]
	const circleColor = s.circleColors[s.choices.indexOf(choice)]
	const circleSchool = s.circleSchool[s.choices.indexOf(choice)]
	return {
		options: {
			circleColor1: circleColor,
			circleColor2: circleColor,
			circleNum: "02",
			impactColor1: impactColor,
			impactColor2: impactColor,
			fadeIn: {ms: 400},
			impactNum1: impactNum,
			impactNum2: impactNum,
			scale: .15,
			school: "conjuration",
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
	const overrides = await getOverrides(actor, workflow)
	summoning.createSpawn(actor, s.spawnNames[0], item, overrides, s, token) 
}



export const summonIceWolves = {
	onUse
}
