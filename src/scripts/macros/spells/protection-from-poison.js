import {conditionLabels} from "../../constants.js"
import {protectionFromPoison as s} from "../../strings/spells.js"
import {getDialogueButtonType, removeEffect} from "../../helper-functions.js"

const getChoices = async (effects) => {
	return effects.reduce((acc, effect, i) => {
			const nameAlreadyUsed = acc.find(choice => choice.name == effect.name)
			const name = nameAlreadyUsed ? effect.name + "-" + i : effect.name
			const choice = {name: name, icon: effect.icon, uuid: effect.uuid}
			return [...acc, choice]
	}, [])
}
const getChosenEffect = async (effects) => {
	const choices = await getChoices(effects)		
	const buttonNames = choices.map(choice => choice.name)		
	const initChoice = await getDialogueButtonType(buttonNames, {width: 400, height: "100%"}, s.initHeader, getInitIconPaths, 60, 60, choices)
	return choices.find(effect => effect.name == initChoice.value)	
}
const getInitIconPaths = (choice, effects) => {
	const chosenEffect = effects.find(effect => effect.name == choice)
	return chosenEffect.icon
}
const getPoisonEffects = () => {
	const target = game.user.targets.first()
	return target.actor.effects.filter(effect => {
		const hasPoisonedName = conditionLabels["poisoned"].includes(effect.name.toLowerCase())
		const hasPoisonedConditions = effect.changes.find(change => conditionLabels["poisoned"].includes(change.value.toLowerCase()))
		return hasPoisonedName || hasPoisonedConditions
	})	
}
const onUse = async ({item, workflow, args, token}) => {
	const poisonEffects = await getPoisonEffects()
	if (poisonEffects.length > 0) {
		const chosenEffect = await getChosenEffect(poisonEffects)
		await removeEffect(chosenEffect.uuid)	
	}
}
const preTargetSave = async ({item, workflow, args}) => {
	const hasPoison = item.effects.find(effect => effect.changes.find(change => conditionLabels["poisoned"].includes(change.value.toLowerCase())))
	if (hasPoison) workflow.saveDetails.advantage = true
}

export const protectionFromPoison = {
	onUse,
	preTargetSave
}