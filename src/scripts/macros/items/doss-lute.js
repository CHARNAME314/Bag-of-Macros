//on equip, appropriate spells are added to spellbook as innate spells

//on unequip, spells are removed 
//gives advantage on casting charmed spells 




//Animal friendship
//
//Charm monster
//
//Charm person
//
//Crown of madness
//
//Dominate beast
//
//Dominate monster
//
//Dominate person
//
//Hypnotic pattern
//
//Modify memory
const getItemData = async (item, originActor) => {
	console.log(item)
	
	const itemData = mergeObject(duplicate(item.toObject(false)), {
		"flags.charname.instrumentOfTheBards.originName": item.name,
		"flags.charname.instrumentOfTheBards.originUuid": item.uuid,
		"system.preparation.mode": "innate"
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})	
	console.log("itemData.flags")
	console.log(itemData.flags)
	return new CONFIG.Item.documentClass(itemData, { parent: originActor })
}
const getSpells = async (actor) => {
	const spellList = [
		"Animal Friendship", 
		"Fly", 
		"Invisibility", 
		"Levitate",
		"Protection from Energy (Fire)",
		"Protection from Evil and Good",
		"Protection from Poison"
	]
	const spellData = spellList.map(spellName => {
		return game.items.find(item => item.name.toLowerCase() == spellName.toLowerCase())
	})
	console.log("spellData")
	console.log(spellData)
	const updatedSpells = spellData.map(spell => {
		return await getItemData(spell, actor)
	})
	console.log("updatedSpells")
	console.log(updatedSpells
	return updatedSpells
}

const main = async ({actor, args, token}) => {
	console.log(actor)
	console.log(args)
	const spells = await getSpells(actor)
}

const onEquip = async (item, update) {
//look for two things in hook, one for attune and one for equip.  Need to make sure both are happening to update spell list	
	if (item != "Doss Lute") return false
	const isEquipped = update?.equipped ?? null
	const updateAttunement = update?.attunement ?? null
	if ((isEquipped && item.system.attunement == 2) || (updateAttunement == 2 && item.system.equipped == true ) {
		const spells = await getSpells(item.parent)
		//add spells

	} else if (isEquipped === false || updateAttunement == 1) {
		//remove spells
	}

}

export const dossLute = {
	main,
	onEquip
}

