export const setAmbientLightCreate = async (params) => {
	return await canvas.scene.createEmbeddedDocuments("AmbientLight", [params])
}
export const setAmbientLightDelete = async (ambientLightId) => {
	const ambientLight = await canvas.scene.deleteEmbeddedDocuments("AmbientLight", [ambientLightId])
	//can probably be improved to go back to whatever layer you had selected before, even if not token
	canvas.tokens.activate()
	return ambientLight
}
export const setActiveEffectDelete = async (ownerActor, effectId) => {	
	const [deleteEffect] = ownerActor.effects.filter(effect => effect._id == effectId)	
	return await ownerActor.deleteEmbeddedDocuments("ActiveEffect", [deleteEffect._id])
	//can probably be improved to go back to whatever layer you had selected before, even if not token
}
export const setDeleteSummonConcentrationHook = async (actor, spawnedTokenUuid) => {
	const preDeleteSummonConcentrationHookId = Hooks.on("preDeleteToken", (tokenDoc, config, options) => {
		if (tokenDoc.uuid == spawnedTokenUuid) {		
			Hooks.off("preDeleteToken", preDeleteSummonConcentrationHookId)
			const concEffect =  actor.effects.find(effect => effect.name == "Concentrating")				
			if (!concEffect) return false
			concEffect.delete()				
		}
	})			
}
export const setMeasuredTemplateDelete = async (templateUuid) => {
	const template = await fromUuid(templateUuid) ?? false
	if (!template) return false
	const deletedMeasuredTemplate = await canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", [template._id])
	//can probably be improved to go back to whatever layer you had selected before, even if not token
	canvas.tokens.activate()
	return deletedMeasuredTemplate
}
export const setSpawnedTokensInitiative = async (combatDocs, init) => {
	combatDocs.forEach(doc => doc.update({"initiative": init}))
}