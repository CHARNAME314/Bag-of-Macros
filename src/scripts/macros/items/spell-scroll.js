import {spellScroll as s} from "../../strings/items.js"
import {getDialogueButtonType} from "../../helper-functions.js"

const checkSelfTarget = async (args, item, originTokenDoc) => {
	const hasEffects = item.effects.size > 0
	const isSelfTargetItem = item.target?.type == "self"
	const originTargetingSelf = args[0].hitTargetUuids.filter(uuid => uuid == originTokenDoc.uuid).length > 0
	return hasEffects && (isSelfTargetItem || originTargetingSelf)
}
const createCastWorkflow = async (item, tokenActor) => {
	const {dc, attackBonus} = await getItemParams(item)
	const spellData = {
		uuid: item.uuid,
		dc: dc,
		attackBonus: attackBonus,
		level: item.system.level, 
		activation: item.system.activation.type, 
		prof: tokenActor.system.attributes.prof
	}
	const [tempItem] = await createTempItem(spellData, tokenActor, item)
	await setPreUseItemHooks(tempItem, spellData)
	const workflow = await MidiQOL.completeItemUse(tempItem, item)	
	return [tempItem, workflow]
}
const createItem = async (item, config) => {
	const label = await getLabel(item)
	if (item.name.slice(0,label.length) != label) return false
	const defaultItem = game.items.find(defItem => 
		defItem.name == item.name.slice(label.length + 1)
	)
	const liveItem = await fromUuid(item.uuid)
	const initChoice = await getDialogueButtonType(s.labels, {width: 400, height: "100%"}, s.initHeader, getInitIconPaths, 60, 60)
	const type = initChoice.value == s.labels[0] ? s.labels[0] : s.labels[1]
	const newLabel = initChoice.value + " " + defaultItem.name
	await liveItem.update({
		"name": newLabel,
		"flags.midi-qol.onUseMacroName": "function.CHARNAME.macros.spellScroll.onUse",
		"flags.autoanimations": defaultItem.flags.autoanimations
	})
}
const createTempItem = async (spellData, tokenActor, liveItem) => {
	const sourceItem = await fromUuid(spellData.uuid)	
	const sourceMacroNames = await getSourceMacroNames(sourceItem)
	const updatedMacroNames = await getUpdatedMacroNames(sourceMacroNames, spellData.activation)
	const itemData = await getTempItem(liveItem, sourceItem, spellData, updatedMacroNames)
	return await tokenActor.createEmbeddedDocuments("Item", [itemData])
}
const deleteTempItem = async ({args, item, workflow}) => {
	const [tempItem, originTokenDoc, tokenActor] = await getDeleteItemData(args, item)
	const logic = await getDeleteItemLogic(args, item, originTokenDoc, tempItem, tokenActor, workflow)
	setDeleteItemLogic(logic, tempItem, tokenActor)
}
const getDeleteItemData = async (args, item) => {
	const tempItem = await fromUuid(item.uuid)
	const originTokenDoc = await fromUuid(args[0].tokenUuid)
	const tokenActor = originTokenDoc.actor	
	return [tempItem, originTokenDoc, tokenActor]
}
const getDeleteItemLogic = async (args, item, originTokenDoc, tempItem, tokenActor, workflow) => {
	const concEffect = await MidiQOL.getConcentrationEffect(tokenActor) ?? false	
	const hasTemplate = await fromUuid(workflow.templateUuid) ?? false
	const selfEffects = await getSelfEffects(tempItem)
	const hasSelfEffects = selfEffects.length > 0
	const hasSelfTarget = await checkSelfTarget(args, item, originTokenDoc)		
	return [concEffect, hasTemplate, hasSelfEffects, hasSelfTarget]
}
const getDeleteUuidEffects = async (actor, item) => {	
	const isConcentration = item.system.components.concentration || item.flags.midiProperties.concentration
	const isReactionItem = item.system.activation.type == "reaction"
	if (isConcentration && !isReactionItem) {
		return [await MidiQOL.getConcentrationEffect(actor)]
	}
	return await getSelfEffects(item) ?? []
}
const getInitIconPaths = (buttonName) => {
	switch (buttonName) {
		case s.labels[0]:
			return "icons/magic/defensive/shield-barrier-flaming-diamond-teal-purple.webp"
			break
		case s.labels[1]:
			return "icons/magic/defensive/shield-barrier-flaming-pentagon-teal-purple.webp"
			break	
	}
}
const getItemParams = async (item) => {
	const level = item.system.level
	if (level == 0 || level == 1 || level == 2) {
		return {dc: 13, attackBonus: 5}
	} else if (level == 3 || level == 4) {
		return {dc: 15, attackBonus: 7}
	} else if (level == 5 || level == 6) {
		return {dc: 17, attackBonus: 9}
	} else if (level == 7 || level == 8) {
		return {dc: 18, attackBonus: 10}
	} else if (level == 9) {
		return {dc: 19, attackBonus: 11}
	} else {
		return {dc: 13, attackBonus: 5}
	}
}
const getLabel = async (item) => {
	if (item.name.slice(0,s.labels[0].length) == s.labels[0]) {
		return s.labels[0]
	} else if (item.name.slice(0,s.labels[1].length) == s.labels[1]) {
		return s.labels[1]
	} else {
		return false
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
const getTempItem = async (liveItem, sourceItem, spellData, updatedMacroNames) => {
	return mergeObject(duplicate(sourceItem.toObject(false)), {
		img: liveItem.img,
		"flags.charname.spellScroll.ringUuid": liveItem.uuid,
		"flags.charname.spellScroll.spellData": spellData,
		"flags.midi-qol.onUseMacroName": updatedMacroNames,
		"system.ability": "none",
		"system.attackBonus": spellData.attackBonus,
		"system.preparation.mode": "innate",
		"system.save.dc": spellData.dc,
		"system.save.scaling": "flat"
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})	
}
const getUpdatedMacroNames = async (macroNames, activation) => {	
	const update = macroNames.length > 0 
			? macroNames + ",[postRollFinished]function.CHARNAME.macros.spellScroll.deleteTempItem" 
			: "[postRollFinished]function.CHARNAME.macros.spellScroll.deleteTempItem"
	if (activation == "reaction") {
		return update + ",[postActiveEffects]function.CHARNAME.macros.spellScroll.setReactionHook"
	} 
	return update
}
const onUse = async ({args, item}) => {
	const label = await getLabel(item)
	const spell = game.items.find(spell => 
		spell.name == item.name.slice(label.length + 1)
	)
	const tokenActor = (await fromUuid(args[0].tokenUuid)).actor
	const updates = await createCastWorkflow(spell, tokenActor)
	setCastSpellUpdates(updates, tokenActor)
}
const setCastSpellUpdates = async (updates, tokenActor) => {
	const [tempItem, workflow] = updates
	updateDeleteUuidEffects(tokenActor, tempItem)
	const template = await fromUuid(workflow.templateUuid) ?? false
	if (template) template.callMacro("whenCreated", {asGM: true})
}
const setDeleteItemLogic = async (logic, tempItem, tokenActor) => {
	const [concEffect, hasTemplate, hasSelfEffects, hasSelfTarget] = logic
	if (concEffect) {
		setDeleteUuids(tempItem, concEffect)
	} else if (!concEffect && hasTemplate && !hasSelfEffects) {
		const tempItemEffect = tokenActor.effects.find(effect => effect.origin == tempItem.uuid)			
		setDeleteUuids(tempItem, tempItemEffect)
	} else if (!concEffect && !hasTemplate && (hasSelfEffects || hasSelfTarget)) {
		const tempItemEffect = tokenActor.effects.find(effect => effect.origin == tempItem.uuid)
		setDeleteUuids(tempItem, tempItemEffect)
	} else if (!concEffect && !hasTemplate && !hasSelfEffects && !hasSelfTarget) {
		tempItem.delete()
	}	
}  
const setDeleteUuids = async (tempItem, effect) => {
	const deletionChange = {
		key: "flags.dae.deleteUuid", 
		mode: CONST.ACTIVE_EFFECT_MODES.ADD, 
		value: [tempItem.uuid]
	}
	const updatedChanges = [...effect.changes, deletionChange]
	effect.update({"changes": updatedChanges})		
}
const setPreUseItemHooks = async (item, spellData) => {
	Hooks.once("dnd5e.preUseItem", (useItem, config) => {
		if (item.uuid != useItem.uuid) return false	
		config.consumeResource = false
		config.consumeSpellSlot = false
		config.consumeUsage = false
		config.slotLevel = spellData.level	
		config.system.prof._baseProficiency = spellData.prof			
	})		
}
const setReactionHook = async ({item}) => {
	const spellData = item.flags?.charname?.spellScroll?.spellData ?? false
	if (!spellData) return false
	setPreUseItemHooks(item, spellData)
}
const updateDeleteUuidEffects = async (actor, item) => {
	const effects = await getDeleteUuidEffects(actor, item)
	if (effects.length > 0) effects.map(effect => setDeleteUuids(item, effect))	
}

export const spellScroll = {
	onUse,
	createItem,
	deleteTempItem
}