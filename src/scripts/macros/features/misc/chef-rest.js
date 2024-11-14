const getItemData = (originActor) => {
	const sourceItem = fromUuidSync("Item.1dmlohsjnRdwam0c")
	const prof = originActor.system.attributes.prof
	const itemData = mergeObject(duplicate(sourceItem.toObject(false)), {
		name: "Chef's Special Food",
		system: { 
			damage: {
				parts: [[`1d8`, "healing"]]
			}
		}
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})
	return new CONFIG.Item.documentClass(itemData, { parent: originActor })
}
const onShortRest = (actor, data) => {
	const chefEffects = actor.effects.filter(effect => effect.name == "Chef's Special Food")
	if (data.dhd < 0 && chefEffects.length > 0) {
		chefEffects.map(effect => {
			const item = getItemData(actor)
			const token = MidiQOL.tokenForActor(actor.uuid)
			const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [token.document.uuid] }
			MidiQOL.completeItemUse(item, {}, options)	
		})
	}
}

export const chefRest = {
	onShortRest
}