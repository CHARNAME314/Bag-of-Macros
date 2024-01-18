import {getDialogueButtonType, setActiveEffects, setTemplateDispels} from "../../helper-functions.js"
import {setAreaEffectDeleteHook} from "../../hooks.js"
import {socket} from "../../index.js"

const getEffectOriginData = async (originUuid, lightId) => {
	return {
		name: `Daylight`, 
		icon: "icons/magic/air/weather-sunlight-sky.webp", 
		origin: originUuid,
		changes: [{key: "macro.execute", mode: 0, value: "function.CHARNAME.macros.daylight.setSpellEffects"}],
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
const setAreaChoiceEffects = async (templateUuid, templateEffect, tokenActorUuid, itemUuid, positions) => {
	const [x, y] = await setTemplateEffects(templateUuid, templateEffect, positions)
	const lightParams = {"x": x, "y": y, "config": {"bright": 60, "dim": 120, "attenuation": .4}}
	const [sanitizedLight] = await socket.executeAsGM("setAmbientLightCreate", lightParams)
	const [effect] = await setActiveEffects([tokenActorUuid], await getEffectOriginData(itemUuid, sanitizedLight._id))	
	await setAreaEffectDeleteHook(60, x, y, ["Darkness"], 9, effect, positions)
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
		const templateId = "MeasuredTemplate." + args[0].templateId 
		const templatePositions = canvas.grid.highlightLayers[templateId].positions
		const templateEffect = actor.effects.find(effect => effect.name == "Daylight Template")
		await setAreaChoiceEffects(args[0].templateUuid, templateEffect, token.document.actor.uuid, item.uuid, templatePositions)
	} else if (args[0] == "off")  {
		const lastArg = args[args.length - 1]
		await socket.executeAsGM("setAmbientLightDelete", lastArg.efData.flags.castData.daylight.lightId)
	} else {
		return false
	}
}
const setTemplateEffects = async (templateUuid, templateEffect, templatePositions) => {
	const template = await fromUuid(templateUuid)
	await setEffectsSequencer(template.x, template.y, 7, false)
	await setTemplateDispels(template.x, template.y, "Darkness", templatePositions)
	templateEffect.delete()
	return [template.x, template.y]
}

export const daylight = {
	"setSpellEffects": setSpellEffects
}