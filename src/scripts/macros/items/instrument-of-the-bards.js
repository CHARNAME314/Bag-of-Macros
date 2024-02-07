//on equip, appropriate spells are added to spellbook as innate spells
import {getDialogueButtonType} from "../../helper-functions.js"
import {instrumentOfTheBards as s} from "../../strings/items.js"
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

//const addSpells = async (actor, spells) => {
//	return await Promise.all(spells.map(spell => actor.createEmbeddedDocuments("Item", [spell])))
//}
//const dossLuteExample = await lute.update({"flags.charname.instrumentOfTheBards": {
//	//keeping for when I make the other instruments 
//	"type": "dossLute",
//	"spells": [
//		{name: "Animal Friendship", isCharged: true},
//		{name: "Fly", isCharged: true},
//		{name: "Invisibility",  isCharged: true},
//		{name: "Levitate", isCharged: true},
//		{name: "Protection from Energy (Fire)", isCharged: true},
//		{name: "Protection from Evil and Good",	 isCharged: true},
//		{name: "Protection from Poison", isCharged: true}
//	]
//}})
//const createTempSpell = async (item, originActor, instrument, originUuid) => {
//	//console.log(item)
//	//removing and readding the instrument item will reset the charges, may want to address that 
//	//current idea: add flags to the actual instrument to flip between 1 and 0 depending on when a spell is used 
//	//how this works:
//	//**add flags to instrument first, default is 1
//	//set up a single hook to update the flags on the instrument upon the items uses changing 
//	//**would need to add one more flag with the source instrument uuid 
//	//**hook needs to run only for the person with the instrument 
//	const [level, damage] = await getCureWoundsData(item, instrument)
//	const itemData = mergeObject(duplicate(item.toObject(false)), {
//		"flags.charname.instrumentOfTheBards.originInstrumentUuid": originUuid,
//		"flags.charname.instrumentOfTheBards.originName": item.name,
//		"flags.charname.instrumentOfTheBards.originUuid": item.uuid,
//		"flags.charname.instrumentOfTheBards.type": "spell",
//		"system.damage.parts": damage,
//		"system.level": level,		
//		"system.preparation.mode": "innate",
//	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})	
//	return new CONFIG.Item.documentClass(itemData, { parent: originActor })
//}
//const createTempSpells = async (actor, instrument, item) => {
//	const spellData = instrument.spells.map(spell => game.items.find(item => item.name.toLowerCase() == spell.name.toLowerCase()))
//	return await Promise.all(spellData.map(spell => createTempSpell(spell, actor, instrument, item.uuid)))
//}
const getCureWoundsData = async (item, instrument) => {
	if (instrument.type == "anstruthHarp" && item.name == "Cure Wounds") {
		return [5, ["5d8 + @mod", "healing"]]
	} else if (instrument.type == "canaithMandolin" && item.name == "Cure Wounds") {
		return [3, ["3d8 + @mod", "healing"]]
	} else {
		return [item.system.level, item.system.damage.parts]
	}
}
const castSpell = async (spell, instrument, tokenActor, chosenIndex) => {
	const updates = await createCastWorkflow(spell, instrument, tokenActor, chosenIndex)
	console.log("updates")
	console.log(updates)
	setCastSpellUpdates(updates, tokenActor)
}

const createCastWorkflow = async (spell, instrument, tokenActor, chosenIndex) => {
	//const spellData = await getSpellToCast(item)	
	
	const [tempItem] = await createTempItem(spell, instrument, tokenActor, chosenIndex)
	//await setPreUseItemHooks(tempItem, spellData)
	const workflow = await MidiQOL.completeItemUse(tempItem, spell)	
	return [tempItem, workflow]
}
const createTempItem = async (spell, instrument, tokenActor, chosenIndex) => {
	const sourceMacroNames = await getSourceMacroNames(spell)
	const updatedMacroNames = await getUpdatedMacroNames(sourceMacroNames, spell.activation)
	const itemData = await getTempItem(spell, instrument, updatedMacroNames, chosenIndex)
	return await tokenActor.createEmbeddedDocuments("Item", [itemData])
}
const deleteTempItem = async ({args, item, workflow}) => {
	console.log("INTO deleteTempItem")
	const [tempItem, originTokenDoc, tokenActor] = await getDeleteItemData(args, item)
	console.log("tempItem")
	console.log(tempItem)	
	await setDeleteItemFlags(tempItem)
	//const logic = await getDeleteItemLogic(args, item, originTokenDoc, tempItem, tokenActor, workflow)
	//setDeleteItemLogic(logic, tempItem, tokenActor)
}
const getDeleteItemFlagData = async (liveItem, tempItem) => {
	//get the index here 
	const spellData = tempItem.flags.charname.ringOfSpellStoring.spellData
	const spells = liveItem.flags.charname.ringOfSpellStoring.spells	
	const slotsUsed = liveItem.flags.charname.ringOfSpellStoring.slotsUsed
	const usedSpell = spells.find(spell => {
		return spell.level == spellData.level
			&& spell.name == spellData.name 
			&& spell.dc == spellData.dc 
			&& spell.ability == spellData.ability
	})	
	const deleteIndex = spells.indexOf(usedSpell)
	return [deleteIndex, slotsUsed, spells, usedSpell.level]
}
const getDeleteItemFlagUpdates = async (liveItem, tempItem) => {
	const [deleteIndex, slotsUsed, spells, usedSpellLevel] = await getDeleteItemFlagData(liveItem, tempItem)
	const newSlotsUsed = slotsUsed - usedSpellLevel
	const newSpells = spells.filter((spell, i) => i != deleteIndex)	
	return [newSlotsUsed, newSpells]
}
const getDeleteItemData = async (args, item) => {
	const tempItem = await fromUuid(item.uuid)
	const originTokenDoc = await fromUuid(args[0].tokenUuid)
	const tokenActor = originTokenDoc.actor	
	return [tempItem, originTokenDoc, tokenActor]
}
const getDeleteUuidEffects = async (actor, item) => {	
	const isConcentration = item.system.components.concentration || item.flags.midiProperties.concentration
	const isReactionItem = item.system.activation.type == "reaction"
	if (isConcentration && !isReactionItem) {
		return [await MidiQOL.getConcentrationEffect(actor)]
	}
	return await getSelfEffects(item) ?? []
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
const getSelfEffects = async (item) => {	
	const itemEffects = item.effects ?? []
	return itemEffects.filter(effect => {
		const selfTarget = effect.flags?.dae?.selfTarget ?? false
		const selfTargetAlways = effect.flags?.dae?.selfTargetAlways ?? false
		if ((selfTarget || selfTargetAlways)) return true 
		return false
	}) ?? []
}
const getSourceMacroNames = async (item) => {
	const hasFlags = item?.flags ?? false
	if (!hasFlags) return ""
	const hasMidi = item.flags["midi-qol"] ?? false
	if (!hasMidi) return ""
	const hasMacros = item.flags["midi-qol"].onUseMacroName ?? false
	if (!hasMacros) return ""
	return item.flags["midi-qol"].onUseMacroName
}
const getSpellIconPaths = (choice, spells) => {
	const spell = spells.find(spell => spell.name.toLowerCase() == choice.toLowerCase())
	return spell.img
}
const getSpellsToCast = async (item, type) => {
	const spellNames = [...s.instrumentSpellNames["generic"], ...s.instrumentSpellNames[type]].sort()
	const spellData = spellNames.map((name, i) => {
		return {"name": name, id: i}
	}).filter(spell => item.flags.charname.instrumentOfTheBards.spells[spell.id].isCharged)
	const spells = spellData.map(spell => game.items.find(item => item.name.toLowerCase() == spell.name.toLowerCase()))	
	const filteredSpellNames = spells.map(spell => spell.name)
	return [spellData, spellNames, filteredSpellNames, spells]
}
const getTempItem = async (spell, instrument, updatedMacroNames, chosenIndex) => {
	const [level, damage] = await getCureWoundsData(spell, instrument)
	return mergeObject(duplicate(spell.toObject(false)), {
		"flags.charname.instrumentOfTheBards.originInstrumentUuid": instrument.uuid,
		"flags.charname.instrumentOfTheBards.originName": spell.name,
		"flags.charname.instrumentOfTheBards.originUuid": spell.uuid,
		"flags.charname.instrumentOfTheBards.type": "spell",
		"flags.charname.instrumentOfTheBards.spellIndex": chosenIndex,
		"flags.midi-qol.onUseMacroName": updatedMacroNames,
		"system.damage.parts": damage,
		"system.level": level,		
		"system.preparation.mode": "innate",
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})	
}
const getUpdatedMacroNames = async (macroNames, activation) => {	
	const update = macroNames.length > 0 
			? macroNames + ",[postRollFinished]function.CHARNAME.macros.instrumentOfTheBards.deleteTempItem" 
			: "[postRollFinished]function.CHARNAME.macros.instrumentOfTheBards.deleteTempItem"
	if (activation == "reaction") {
		return update + ",[postActiveEffects]function.CHARNAME.macros.instrumentOfTheBards.setReactionHook"
	} 
	return update
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
const setCastSpellUpdates = async (updates, tokenActor) => {
	const [tempItem, workflow] = updates
	updateDeleteUuidEffects(tokenActor, tempItem)
	const template = await fromUuid(workflow.templateUuid) ?? false
	if (template) template.callMacro("whenCreated", {asGM: true})
}
const setDeleteItemFlags = async (tempItem) => {
	const instrument = await fromUuid(tempItem.flags.charname.instrumentOfTheBards.originInstrumentUuid)
	const index = tempItem.flags.charname.instrumentOfTheBards.spellIndex
	//const updates = await getDeleteItemFlagUpdates(liveItem, tempItem)
	updateDeleteItemFlags(instrument, index)
}
const setDeleteUuids = async (tempItem, effect) => {
	const deletionChange = {key: "flags.dae.deleteUuid", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: [tempItem.uuid]}
	const updatedChanges = [...effect.changes, deletionChange]
	effect.update({"changes": updatedChanges})		
}
//const updateActorSpellList = async (item, update, instrument) => {
//	const actor = await fromUuid(item.parent.uuid)
//	const equipUpdate = update?.system?.equipped ?? null
//	const attunementUpdate = update?.system?.attunement ?? null	
//	if ((equipUpdate == true && item.system.attunement == 2) || (attunementUpdate == 2 && item.system.equipped == true)) {	
//		const spells = await createTempSpells(item.parent, instrument, item)	
//		await addSpells(actor, spells)		
//	} else if (equipUpdate === false || attunementUpdate == 1) {
//		//await removeSpells(actor, instrument)	
//	}
//}
const updateDeleteItemFlags = async (instrument, index) => {
	//need instrument, chosenIndex
	console.log("updateDeleteItemFlags index")
	console.log(index)	
	console.log("updateDeleteItemFlags instrument")
	console.log(instrument)
	const updates = instrument.flags.charname.instrumentOfTheBards.spells.map((spell, i) => {
		if (i == index) {
			return {name: spell.name, isCharged: false}
		} else {
			return spell
		}
	})
	console.log("updateDeleteItemFlags updates")
	console.log(updates)	
	const flaggedItem = await instrument.update({
		"flags.charname.instrumentOfTheBards.spells": updates
	})	
	console.log("updateDeleteItemFlags flaggedItem")
	console.log(flaggedItem)	
}
const updateDeleteUuidEffects = async (actor, item) => {
	const effects = await getDeleteUuidEffects(actor, item)
	if (effects.length > 0) effects.map(effect => setDeleteUuids(item, effect))	
}
const onUse = async ({actor, args, item, token, workflow}) => {
	console.log("INTO THE THING")
	const type = item.flags?.charname?.instrumentOfTheBards.type ?? false

	console.log("type")
	console.log(type)
	if (!type) {
		return false	
	} else if (type == "spell") {
		//const newUses = update?.uses?.value ?? false
		//if (!newUses) return false
		//const originItem = await fromUuid(item.flags.charname.instrumentOfTheBards.originInstrumentUuid)
		//const newFlag = originItem.flags.charname.instrumentOfTheBards.spells.find(spell => spell.name == item.name)
		////newUses
		//const itemName = item.name
		//const test = `flags.charname.instrumentOfTheBards.spells.${itemName}.isCharged`
		//const bunss = await originItem.update({
		//	[test]: 1 
		//})
		//console.log("bunss")
		//console.log(bunss)
	} else {
		const tokenActor = (await fromUuid(args[0].tokenUuid)).actor
		const liveItem = await fromUuid(item.uuid)		
		//new todo:
		//get spells from instrument item		
		////make sure only spells that haven't been used today can be casting
		const [spellData, spellNames, filteredSpellNames, spells] = await getSpellsToCast(liveItem, type)
		console.log("spells")
		console.log(spells)		
		//open in menu for selection
		const choice = await getDialogueButtonType(filteredSpellNames, {width: filteredSpellNames.length * 150, height: "100%"}, s.initHeader, getSpellIconPaths, 60, 60, spells)
		console.log("choice")
		console.log(choice)
		const spell = spells.find(spell => spell.name == choice.value)
		const chosenIndex = spellNames.indexOf(choice.value)
		console.log("chosenIndex")
		console.log(chosenIndex)		
		//cast spell
		castSpell(spell, liveItem, tokenActor, chosenIndex)	
		
		//notes for tomorrow 2.7.24
		//think I got the casting of the spell and the flagging of the source instrument working as intended
		//think I got deletion of items working as intended
		//need to get onNewDay macro working
		//then still need to get the auto disadvantage when casting certain spells set up
		
		
		//delete spell
		////make sure spell isn't deleted until concentration or template disappears
		
		//let nora = canvas.scene.tokens.find(token => token.name == "Nora Olseris")
		//let lute = nora.actor.items.find(item => item.name == "Doss Lute")
		
		
		//updateActorSpellList(item, update, type)		
	}
}
const onNewDay = async (actor, data) => {
	console.log("YES")
}
export const instrumentOfTheBards = {
	deleteTempItem,
	onUse,
	onNewDay
}

//function.CHARNAME.macros.instrumentOfTheBards.main, preTargetSave
//function.CHARNAME.macros.instrumentOfTheBards.onUse, postActiveEffects
