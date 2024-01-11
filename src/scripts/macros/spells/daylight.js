//Logic
//1.  Menu comes up that player chooses between creature or environment.  Not going to worry about objects for now, if ever
//2.  If creature, we put on an ATL active effect.  Could theoretically add some extra logic to control emission angle, but won't worry about that for now
//3.  If environment, player is given option to select a point on the ground
//4.  AmbientLightDocument is created at the x/y from the chosen point
//5.  Stretch goal - figure out how to dispel the darkness spell upon contact with Daylight

//TODO:
//look into dispeling darkness
//get all templates in range on map
////can we account for templates that would be behind walls?
////might need to get array of all parts of the grid it touches to do anything useful
//get templates in range and see if any part overlaps 
//check between origin of spell and target location when comparing and make sure there is nothing blocking them like a wall
//set up a hook to make sure no darkness spells are cast within the main aoe
//need to account for creatures with darkness cast on them specifically
//need to make sure daylight effect aura cast on a creature is also dispelling darkness as they move 

//More TODO (2023.11.30):
//account for spell cast on creature and treat it like an aura in regards to the dispel
//account for walls blocking the aoe's dispel ability
//make sure everything works on player side

import {getDialogueButtonType, setActiveEffects, setTemplateDispels} from "../../helper-functions.js"
import {setAreaEffectDeleteHook} from "../../hooks.js"
import {socket} from "../../index.js"

const getEffectOriginData = async (originUuid, lightId) => {
	return {
		name: `Daylight`, 
		icon: "icons/magic/air/weather-sunlight-sky.webp", 
		origin: originUuid,
		changes: [{key: "macro.execute", mode: 0, value: "function.test.macros.daylight.setSpellEffects"}],
		"flags.castData.daylight.lightId": lightId,
		"flags.dae.showIcon": false,		
		"flags.dae.specialDuration": ["shortRest", "longRest"],
		"flags.dae.stackable": "multi",
		"flags.times-up.isPassive": true,		
		disabled: false
	}
}
const getEffectTokenData = async (originUuid) => {
	return {
		name: `Daylight`, 
		icon: "icons/magic/air/weather-sunlight-sky.webp", 
		duration: {rounds: 600},
		origin: originUuid,
		changes: [
			{key: `ATL.light.dim`, mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: [120]},
			{key: `ATL.light.bright`, mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: [60]},
			{key: `ATL.light.attenuation`, mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: [.35]}
		],
		"flags.dae.stackable": "multi",
		"flags.times-up.isPassive": false,
		"flags.dae.specialDuration": ["shortRest", "longRest"],
		"flags.dae.showIcon": true,
		disabled: false
	}
}
const getIconPaths = (buttonName) => {
	switch (buttonName) {
		case "Area of Effect":
			return "icons/magic/air/weather-clouds-sunlight.webp"
			break
		case "Selected Target":
			return "icons/magic/air/weather-sunlight-sky.webp"
			break
	}
}
const setAreaChoiceEffects = async (templateUuid, templateEffect, tokenActorUuid, itemUuid) => {
	const [x, y] = await setTemplateEffects(templateUuid, templateEffect)
	const lightParams = {"x": x, "y": y, "config": {"bright": 60, "dim": 120, "attenuation": .4}}
	const [sanitizedLight] = await socket.executeAsGM("setAmbientLightCreate", lightParams)
	const [effect] = await setActiveEffects([tokenActorUuid], await getEffectOriginData(itemUuid, sanitizedLight._id))	
	await setAreaEffectDeleteHook(60, x, y, ["Darkness"], 9, effect)
}
const setEffectsSequencer = async (x, y, scale, token) => {
	if (!token) {
		new Sequence()
			.effect()
				.file(`jb2a.markers.light.complete.yellow`)
				.scale(scale)
				.opacity(1)
				.atLocation({"x": x, "y": y})
			.play()				
	} else {
		new Sequence()
			.effect()
				.file(`jb2a.markers.light.complete.yellow`)
				.scale(scale)
				.opacity(1)
				.attachTo(token)
			.play()			
	}
}
const setInitChoice = async (itemUuid)  => {
	const type = await getDialogueButtonType(["Area of Effect", "Selected Target"], {width: 400, height: 150}, "Where will you cast Daylight?", getIconPaths, 60, 60)
	if (type.value == "Selected Target") {
		const target = game.user.targets.first()
		await setActiveEffects([target.document.actor.uuid], await getEffectTokenData(itemUuid))
		await setEffectsSequencer(0, 0, target.document.width, target)
		return false			
	}	
	return true
}
const setSpellEffects = async ({speaker, actor, token, character, item, args, scope, workflow}) => {
	if (args[0].tag == "OnUse" && args[0].macroPass == "preItemRoll") {
		const isAreaChoice = await setInitChoice(item.uuid)
		if (!isAreaChoice) return false
	} else if (args[0].tag == "OnUse" && args[0].macroPass == "postActiveEffects") {
		const templateEffect = actor.effects.find(effect => effect.name == "Daylight Template")
		await setAreaChoiceEffects(args[0].templateUuid, templateEffect, token.document.actor.uuid, item.uuid)
	} else if (args[0] == "off")  {
		const lastArg = args[args.length - 1]
		await socket.executeAsGM("setAmbientLightDelete", lastArg.efData.flags.castData.daylight.lightId)
	} else {
		return false
	}
}
const setTemplateEffects = async (templateUuid, templateEffect) => {
	const template = await fromUuid(templateUuid)
	await setEffectsSequencer(template.x, template.y, 7, false)
	await setTemplateDispels(template.x, template.y, "Darkness")
	
	templateEffect.delete()
	return [template.x, template.y]
}

export const daylight = {
	"setSpellEffects": setSpellEffects
}