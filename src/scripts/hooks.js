import {getTemplatesInRange} from "./helper-functions.js"
import {settings} from "./settings.js"
import {socket} from "./index.js"

export const setAreaEffectDeleteHook = async (range, x, y, inelligbleEffectNames, minSpellLevel, originTemplateActiveEffect) => {
	const setAreaEffectDeleteHookId = Hooks.on("createMeasuredTemplate", (template) => {
		const originFlag = template.flags?.dnd5e?.origin ?? false
		const templateSpellLevel = template.flags?.dnd5e?.spellLevel ?? 0
		if (!originFlag || templateSpellLevel > minSpellLevel) return false		
		const origin = fromUuidSync(template.flags.dnd5e.origin)
		if (inelligbleEffectNames.includes(origin.name) || ineligibleEffectNames == "all") {
			const templatesInRange = getTemplatesInRange([template], canvas.scene.grid.size, canvas.scene.grid.distance, range, x, y)
			if (templatesInRange.length > 0) {		
				//waiting for potential concentration effects to cycle through
				setTimeout(() => {
					templatesInRange.map(template => socket.executeAsGM("setMeasuredTemplateDelete", template.uuid))
				}, 200)				
			}
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