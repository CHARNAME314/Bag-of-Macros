import {getDialogueButtonType, getTemplatesInRange} from "../../helper-functions.js"
import {socket} from "../../index.js"

const deleteEffectsOnToken = async (casterToken, dispelAbility, dispelLevel) => {
	const target = game.user.targets.first()	
	const [effectsLTE2DispelLevel, effectsGTDispelLevel] = await getTokenEffects(target, dispelLevel)
	const effectsIdsToDelete = await getEffectsToDelete(casterToken, dispelAbility, effectsLTE2DispelLevel, effectsGTDispelLevel)
	effectsIdsToDelete.map(socket.executeAsGM("setActiveEffectDelete", target.actor, effectsIdsToDelete[i]))
}
const deleteTemplate = async (casterToken, dispelAbility, dispelLevel, selectedTemplate) => {
	const spellLevel = selectedTemplate.flags.dnd5e.spellLevel
	const templatesToDelete = dispelLevel < spellLevel ? await getTemplatesToDelete(casterToken, dispelAbility, [selectedTemplate]) : [selectedTemplate]
	templatesToDelete.map(template => socket.executeAsGM("setMeasuredTemplateDelete", template.uuid))
}
const getEffectsToDelete = async (casterToken, dispelAbility, effectsLTE2DispelLevel, effectsGTDispelLevel) => {
	const casterAbilityMod = casterToken.actor.system.abilities[dispelAbility].mod
	let arr = []
	let abilityRoll
	let effectCastLevel = 0
	for (let i = 0; i < effectsGTDispelLevel.length; i++) {
		effectCastLevel = effectsGTDispelLevel[i].flags["midi-qol"].castData.castLevel
		abilityRoll = await casterToken.actor.rollAbilityTest(dispelAbility)	
		if (abilityRoll.total > effectCastLevel + 10) arr.push(effectsGTDispelLevel[i])		
	}
	return effectsLTE2DispelLevel.concat(arr).map(effect => effect.id)
}
const getIconPaths = (buttonName) => {
	switch (buttonName) {
		case "Area Effect":
			return "icons/magic/air/air-burst-spiral-blue-gray.webp"
			break
		case "Selected Target":
			return "icons/magic/nature/plant-sprout-hand-blue.webp"
			break
	}
}
const getSelectedTemplate = async (casterToken) => {
	const eligibleTemplates = canvas.scene.templates.filter(template => template.flags.dnd5e.spellLevel > 0)
	const inRangeEligibleTemplates = getTemplatesInRange(eligibleTemplates, canvas.scene.grid.size, canvas.scene.grid.distance, 120, casterToken.x, casterToken.y)	
	let originItem
	let originItems = []
	for (let i = 0; i < inRangeEligibleTemplates.length; i++) {
		originItem = await fromUuid(inRangeEligibleTemplates[i].flags.dnd5e.origin)
		originItems.push(originItem)
	}
	return await getTemplateSelection(originItems, inRangeEligibleTemplates)
}
const getTemplateSelection = async (items, inRangeEligibleTemplates) => {
	const sortedTemplates = inRangeEligibleTemplates.sort((a, b) => {
		const aOrig = fromUuidSync(a.flags.dnd5e.origin)	
		const bOrig = fromUuidSync(b.flags.dnd5e.origin)
		return aOrig.name.localeCompare(bOrig.name)
	})
	const templateSelections = items.map((item, i) => {
		const itemOwnerName = canvas.scene.tokens?.find(token => token.actor.uuid == item.parent.uuid)?.name ?? "unknown"
		const itemLabel = item.name + " from " + itemOwnerName	
		return {type: 'radio', label: itemLabel}
	}).sort((a, b) => a.label.localeCompare(b.label))	
	let choices = await warpgate.menu(
		{
			inputs: templateSelections
		},{
			title: "Which template to dispel?",
			render: (...args) => { console.log(...args); ui.notifications.info("render!")},
			options: {
				width: "100px",
				height: "100%",
			}
		}
	)	
	return sortedTemplates[choices.inputs.indexOf(true)]
}
const getTemplatesToDelete = async (casterToken, dispelAbility, potentialTemplates) => {
	let arr = []
	let abilityRoll
	let templateCastLevel = 0
	for (let i = 0; i < potentialTemplates.length; i++) {
		templateCastLevel = potentialTemplates[i].flags.dnd5e.spellLevel
		abilityRoll = await casterToken.actor.rollAbilityTest(dispelAbility)	
		if (abilityRoll.total > potentialTemplates[i].flags.dnd5e.spellLevel + 10) arr.push(potentialTemplates[i])		
	}	
	return arr
}
const getTokenEffects = async (token, dispelLevel) => {
	//get two groups, 1: effects w/ spell levels lesser than or equal to the casted spell level of dispel magic; and 2: the same with greater than that level
	const effectsLTE2DispelLevel = token.document.actor.effects.filter(effect => effect.flags["midi-qol"].castData.baseLevel > 0 && effect.flags["midi-qol"].castData.baseLevel <= dispelLevel)
	const effectsGTDispelLevel = token.document.actor.effects.filter(effect => effect.flags["midi-qol"].castData.baseLevel > dispelLevel)
	return [effectsLTE2DispelLevel, effectsGTDispelLevel]
} 
const setInitChoice = async (casterUuid, dispelAbility, dispelLevel)  => {
	const type = await getDialogueButtonType(["Area Effect", "Selected Target"], {width: 400, height: 150}, "Where will you cast Dispel Magic?", getIconPaths, 60, 60)
	const casterToken = await fromUuid(casterUuid)	
	if (type.value == "Selected Target") {
		deleteEffectsOnToken(casterToken, dispelAbility, dispelLevel)	
	} else if (type.value == "Area Effect") {
		const selectedTemplate = await getSelectedTemplate(casterToken)
		deleteTemplate(casterToken, dispelAbility, dispelLevel, selectedTemplate)
	} else {
		return false
	}
}
const setSpellEffects = async ({args, item, workflow}) => {
	const casterUuid = args[0].tokenUuid
	const dispelAbility = args[0].actor.system.attributes.spellcasting
	const dispelLevel = args[0].spellLevel < 3 ? 3 : args[0].spellLevel
	setInitChoice(casterUuid, dispelAbility, dispelLevel)
}

export const dispelMagic = {
	"setSpellEffects": setSpellEffects
}