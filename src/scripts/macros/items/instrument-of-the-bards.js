import {deleteTempItem as deleteItem, getDialogueButtonType} from "../../helper-functions.js"
import {instrumentOfTheBards as s} from "../../strings/items.js"

const castSpell = async (spell, instrument, tokenActor, chosenIndex) => {
	const updates = await createCastWorkflow(spell, instrument, tokenActor, chosenIndex)
	setCastSpellUpdates(updates, tokenActor)
}
const createCastWorkflow = async (spell, instrument, tokenActor, chosenIndex) => {
	const [tempItem] = await createTempItem(spell, instrument, tokenActor, chosenIndex)
	const workflow = await MidiQOL.completeItemUse(tempItem, spell)	
	return [tempItem, workflow]
}
const createTempItem = async (spell, instrument, tokenActor, chosenIndex) => {
	const sourceMacroNames = await getSourceMacroNames(spell)
	const updatedMacroNames = await getUpdatedMacroNames(sourceMacroNames, spell.activation)
	const itemData = await getTempSpellItem(spell, instrument, updatedMacroNames, chosenIndex)
	return await tokenActor.createEmbeddedDocuments("Item", [itemData])
}
const deleteTempItem = async (data) => {
	deleteItem(data, setDeleteItemFlags)
}
const getCureWoundsData = async (spell, instrument) => {
	if (instrument.type == "anstruthHarp" && spell.name == "Cure Wounds") {
		return [5, ["5d8 + @mod", "healing"]]
	} else if (instrument.type == "canaithMandolin" && spell.name == "Cure Wounds") {
		return [3, ["3d8 + @mod", "healing"]]
	} else {
		return [spell.system.level, spell.system.damage.parts]
	}
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
const getTempSpellItem = async (spell, instrument, updatedMacroNames, chosenIndex) => {
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
	updateDeleteItemFlags(instrument, index)
}
const setDeleteUuids = async (tempItem, effect) => {
	const deletionChange = {key: "flags.dae.deleteUuid", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: [tempItem.uuid]}
	const updatedChanges = [...effect.changes, deletionChange]
	effect.update({"changes": updatedChanges})		
}
const updateDeleteItemFlags = async (instrument, index) => {
	const updates = instrument.flags.charname.instrumentOfTheBards.spells.map((spell, i) => {
		if (i == index) {
			return {name: spell.name, isCharged: false}
		} else {
			return spell
		}
	})
	const flaggedItem = await instrument.update({
		"flags.charname.instrumentOfTheBards.spells": updates
	})	
}
const updateDeleteUuidEffects = async (actor, item) => {
	const effects = await getDeleteUuidEffects(actor, item)
	if (effects.length > 0) effects.map(effect => setDeleteUuids(item, effect))	
}
const onUse = async ({actor, args, item, token, workflow}) => {
	const type = item.flags?.charname?.instrumentOfTheBards?.type ?? "spell"
	if (type == "spell") return false	
	const tokenActor = (await fromUuid(args[0].tokenUuid)).actor
	const liveItem = await fromUuid(item.uuid)		
	const [spellData, spellNames, filteredSpellNames, spells] = await getSpellsToCast(liveItem, type)
	const choice = await getDialogueButtonType(filteredSpellNames, {width: filteredSpellNames.length * 150, height: "100%"}, s.initHeader, getSpellIconPaths, 60, 60, spells)
	const spell = spells.find(spell => spell.name == choice.value)
	const chosenIndex = spellNames.indexOf(choice.value)
	castSpell(spell, liveItem, tokenActor, chosenIndex)	
}
const onNewDay = async (actor, data) => {
	if (!data.newDay) return false
	const instruments = actor.items.filter(item => {
		const type = item.flags?.charname?.instrumentOfTheBards?.type ?? "spell"
		return type != "spell"
	}) 
	refreshInstruments(instruments)
}
const refreshInstruments = async (instruments) => {
	instruments.forEach(instrument => {
		const spells = instrument.flags.charname.instrumentOfTheBards.spells
		const update = spells.map(spell => {
			spell.isCharged = true
			return spell
		})
		instrument.update({"flags.charname.instrumentOfTheBards.spells": update})
	})
}

export const instrumentOfTheBards = {
	deleteTempItem,
	onUse,
	onNewDay
}