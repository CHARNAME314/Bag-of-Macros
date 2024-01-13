import {getTemplatesInRange, getTemplatesWithOverlap} from "./helper-functions.js"
import {settings} from "./settings.js"
import {socket} from "./index.js"

export const setAreaEffectDeleteHook = async (range, x, y, ineligibleEffectNames, minSpellLevel, originTemplateActiveEffect, itemTemplatePositions) => {
	const setAreaEffectDeleteHookId = Hooks.on("refreshMeasuredTemplate", (templateData) => {
		const template = templateData.document		
		const originFlag = template.flags?.dnd5e?.origin ?? false
		const templateSpellLevel = template.flags?.dnd5e?.spellLevel ?? 0
		if (!originFlag || templateSpellLevel > minSpellLevel) return false		
		const origin = fromUuidSync(template.flags.dnd5e.origin)
		if (ineligibleEffectNames.includes(origin.name) || ineligibleEffectNames == "all") {	
			const gridTemplateId = "MeasuredTemplate." + template.id
			const gridTemplatePositions = canvas.grid.highlightLayers[gridTemplateId].positions	
			const templatesOverlap = itemTemplatePositions.intersection(gridTemplatePositions).size > 0 
			if (!templatesOverlap) return false
			//waiting for potential concentration effects to cycle through
			setTimeout(() => {
				socket.executeAsGM("setMeasuredTemplateDelete", template.uuid)
			}, 200)				
		}
	})
	await setAreaEffectDeleteHookOff(originTemplateActiveEffect, setAreaEffectDeleteHookId)
}
export const setAreaEffectDeleteHookOff = async (templateEffect, setAreaEffectDeleteHookId) => {
	const setAreaEffectDeleteHookOffId = Hooks.on("deleteActiveEffect", (effect, config) => {			
		if (effect.uuid == templateEffect.uuid) {
			Hooks.off("createMeasuredTemplate", setAreaEffectDeleteHookId)
			Hooks.off("deleteActiveEffect", setAreaEffectDeleteHookOffId)
		}
	})
}