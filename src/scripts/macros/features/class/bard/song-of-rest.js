const getItemData = (originActor, songLevel) => {
	const sourceItem = fromUuidSync("Item.GvIIDEPRp3unaRVe")
	const itemData = mergeObject(duplicate(sourceItem.toObject(false)), {
		name: "Song of Rest",
		system: { 
			damage: {
				parts: [[`1d${songLevel}`, "healing"]]
			}
		}
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})
	return new CONFIG.Item.documentClass(itemData, { parent: originActor })
}
const getOriginBardScale = (effectOriginUuid) => {
	const effectOrigin = fromUuidSync(effectOriginUuid)
	const originActor = fromUuidSync(effectOrigin.parent.uuid)
	return originActor.system.scale.bard["song-of-rest"].faces
}
const main = (actor, data) => {
	const songEffects = actor.effects.filter(effect => effect.name == "Song of Rest")
	if (data.dhd < 0 && songEffects.length > 0) {
		songEffects.map(effect => {
			const originBardScale = getOriginBardScale(effect.origin)
			const item = getItemData(actor, originBardScale)
			const token = MidiQOL.tokenForActor(actor.uuid)
			const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [token.document.uuid] }
			MidiQOL.completeItemUse(item, {}, options)	
		})
	}
}

export const songOfRest = {
	main
}