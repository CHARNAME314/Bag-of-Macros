//on equip, appropriate spells are added to spellbook as innate spells

//on unequip, spells are removed 
//gives advantage on casting charmed spells 
//update this to be generic - the flag on the item will be what determines the spells you get 
//don't forget to test anstruthHarp && canaithMandolin
//fix CHARNAME flag on instrument 


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

const addSpells = async (actor, spells) => {
	return await Promise.all(spells.map(spell => actor.createEmbeddedDocuments("Item", [spell])))
}
const dossLuteExample = {
	//keeping for when I make the other instruments 
	"type": "dossLute",
	"spells": [
		{name: "Animal Friendship", isCharged: 1},
		{name: "Fly", isCharged: 1},
		{name: "Invisibility",  isCharged: 1},
		{name: "Levitate", isCharged: 1},
		{name: "Protection from Energy (Fire)", isCharged: 1},
		{name: "Protection from Evil and Good",	 isCharged: 1},
		{name: "Protection from Poison", isCharged: 1}
	]
}
const createTempSpell = async (item, originActor, instrument, originUuid) => {
	//console.log(item)
	//removing and readding the instrument item will reset the charges, may want to address that 
	//current idea: add flags to the actual instrument to flip between 1 and 0 depending on when a spell is used 
	//how this works:
	//**add flags to instrument first, default is 1
	//set up a single hook to update the flags on the instrument upon the items uses changing 
	//**would need to add one more flag with the source instrument uuid 
	//**hook needs to run only for the person with the instrument 
	const [level, damage] = await getCureWoundsData(item, instrument)
	const itemData = mergeObject(duplicate(item.toObject(false)), {
		"flags.charname.instrumentOfTheBards.originInstrumentUuid": originUuid,
		"flags.charname.instrumentOfTheBards.originName": item.name,
		"flags.charname.instrumentOfTheBards.originUuid": item.uuid,
		"flags.charname.instrumentOfTheBards.type": "spell",
		"system.damage.parts": damage,
		"system.level": level,		
		"system.preparation.mode": "innate",
		"system.uses.max": "1",
		"system.uses.per": "day",
		"system.uses.value": "1"
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})	
	return new CONFIG.Item.documentClass(itemData, { parent: originActor })
}
const createTempSpells = async (actor, instrument, item) => {
	const spellData = instrument.spells.map(spell => game.items.find(item => item.name.toLowerCase() == spell.name.toLowerCase()))
	return await Promise.all(spellData.map(spell => createTempSpell(spell, actor, instrument, item.uuid)))
}
const getCureWoundsData = async (item, instrument) => {
	if (instrument.type == "anstruthHarp" && item.name == "Cure Wounds") {
		return [5, ["5d8 + @mod", "healing"]]
	} else if (instrument.type == "canaithMandolin" && item.name == "Cure Wounds") {
		return [3, ["3d8 + @mod", "healing"]]
	} else {
		return [item.system.level, item.system.damage.parts]
	}
}
const getInstrumentSpells = async (instrument) => {
	//keeping this for reference
	switch(instrument) {
		case "anstruthHarp": 
			return [
				"Control Weather", 
				"Cure Wounds",
				"Wall of Thorns"
			]
			break
		case "canaithMandolin": 
			return [
				"Cure Wounds", 
				"Dispel Magic",
				"Protection from Energy (Lightning)"
			]
			break
		case "cliLyre": 
			return [
				"Stone Shape", 
				"Wall of Fire",
				"Wind Wall"
			]
			break
		case "dossLute": 
			return [
				"Animal Friendship", 
				"Protection from Energy (Fire)",
				"Protection from Poison"
			]
			break
		case "fochlucanBandore": 
			return [
				"Entangle", 
				"Faerie Fire",
				"Shillelagh",
				"Speak with Animals"
			]
			break
		case "macFuirmidhCittern": 
			return [
				"Barkskin", 
				"Cure Wounds",
				"Fog Cloud"
			]
			break
		case "ollamhHarp": 
			return [
				"Confusion", 
				"Control Weather",
				"Fire Storm"
			]
			break
	}
}
const getSpellList = async (instrument) => {
	//keeping for reference for now
	const generic = [
		"Fly", 
		"Invisibility", 
		"Levitate",
		"Protection from Evil and Good",
	]
	const instrumentSpells = await getInstrumentSpells(instrument)
	return [...generic, ...instrumentSpells]
} 
const main = async ({actor, args, token}) => {
	//
}
const removeSpells = async (actor, instrument) => {
	//this erased everything on Nora lol
	
	return Promise.all(actor.items.filter(item => {
		const originName = item.flags?.charname?.instrumentOfTheBards?.originName ?? null
		return instrument.spells.filter(spell => spell.name == originName).length > 0
	}).map(item => item.delete()))
}
const updateActorSpellList = async (item, update, instrument) => {
	const actor = await fromUuid(item.parent.uuid)
	const equipUpdate = update?.system?.equipped ?? null
	const attunementUpdate = update?.system?.attunement ?? null	
	if ((equipUpdate == true && item.system.attunement == 2) || (attunementUpdate == 2 && item.system.equipped == true)) {	
		const spells = await createTempSpells(item.parent, instrument, item)	
		await addSpells(actor, spells)		
	} else if (equipUpdate === false || attunementUpdate == 1) {
		//await removeSpells(actor, instrument)	
	}
}
const updateItem = async (item, update) => {
	const type = item.flags?.charname?.instrumentOfTheBards ?? false
	if (!type) {
		return false	
	} else if (type == "spell") {
		const newUses = update?.uses?.value ?? false
		if (!newUses) return false
		const originItem = await fromUuid(item.flags.charname.instrumentOfTheBards.originInstrumentUuid)
		const newFlag = originItem.flags.charname.instrumentOfTheBards.spells.find(spell => spell.name == item.name)
		//newUses
		const itemName = item.name
		const test = `flags.charname.instrumentOfTheBards.spells.${itemName}.isCharged`
		const bunss = await originItem.update({
			[test]: 1 
		})
		console.log("bunss")
		console.log(bunss)
	} else {
		updateActorSpellList(item, update, type)		
	}
}

export const dossLute = {
	main,
	updateItem
}

