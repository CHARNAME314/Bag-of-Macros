import {getDialogueButtonType} from "../../helper-functions.js"
import {ringOfSpellStoring as s} from "../../strings/items.js"

const addSpell = async (item, tokenActor) => {
	const notification = await setAddSpellNotification(item)
	if (notification) return false
	const updates = await getAddSpellUpdates(item, tokenActor)
	setAddSpellUpdates(item, updates, tokenActor)
}
const castSpell = async (item, tokenActor) => {
	const updates = await createCastWorkflow(item, tokenActor)
	setCastSpellUpdates(updates, tokenActor)
}
const checkSelfTarget = async (args, item, originTokenDoc) => {
	const hasEffects = item.effects.size > 0
	const isSelfTargetItem = item.target?.type == "self"
	const originTargetingSelf = args[0].hitTargetUuids.filter(uuid => uuid == originTokenDoc.uuid).length > 0
	return hasEffects && (isSelfTargetItem || originTargetingSelf)
}
const createCastWorkflow = async (item, tokenActor) => {
	const spellData = await getSpellToCast(item)	
	const [tempItem] = await createTempItem(spellData, tokenActor, item)
	await setPreUseItemHooks(tempItem, spellData)
	const workflow = await MidiQOL.completeItemUse(tempItem, item)	
	return [tempItem, workflow]
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
	await setDeleteItemFlags(tempItem)
	const logic = await getDeleteItemLogic(args, item, originTokenDoc, tempItem, tokenActor, workflow)
	setDeleteItemLogic(logic, tempItem, tokenActor)
}
const getAddCharChoice = async (eligibleSpellsByChar) => {
	const charChoices = eligibleSpellsByChar.map(character => character.origin).toSorted()	
	return await getDialogueButtonType(charChoices, {width: 400, height: 150}, s.charHeader, getCharIconPaths, 60, 60, eligibleSpellsByChar)
}
const getAddLevelChoice = async (charChoice, tokenActor, eligibleSpellsByChar, item) => {
	const levelChoices = await getLevelChoices(charChoice, tokenActor, eligibleSpellsByChar, item)
	const levelChoice = await getDialogueButtonType(levelChoices, {width: 400, height: 150}, s.levelHeader, getLevelIconPaths, 60, 60)
	//return value as int
	return {value: s.levelLabels.indexOf(levelChoice.value) + 1}
}
const getAddSpellChoice = async (charChoice, eligibleSpellsByChar, levelChoice) => {
	const [spellChoices, spellIcons] = await getSpellChoices(charChoice, eligibleSpellsByChar, levelChoice)
	return await getSpellChoice(spellChoices, s.spellHeader, getSpellIconPaths, spellIcons)	
}
const getAddSpellChoices = async (eligibleSpellsByChar, item, tokenActor) => {
	const charChoice = await getAddCharChoice(eligibleSpellsByChar)
	const levelChoice = await getAddLevelChoice(charChoice, tokenActor, eligibleSpellsByChar, item)
	const spellChoice = await getAddSpellChoice(charChoice, eligibleSpellsByChar, levelChoice.value)
	return [charChoice.value, levelChoice.value, spellChoice.value]
}
const getAddSpellUpdates = async (item, tokenActor) => {
	const actors = await getLiveActors()
	const eligibleSpellsByChar = await getEligibleSpells(actors)	
	const choices = await getAddSpellChoices(eligibleSpellsByChar, item, tokenActor)	
	return [choices, eligibleSpellsByChar]
}
const getAttackBonus = (actor, item, ability) => {
	const isRangedAttack = item.system.actionType == "rsak"
	const isMeleeAttack = item.system.actionType == "msak"
	if (!isRangedAttack && !isMeleeAttack) {
		return 0
	} else if (isRangedAttack) {		
		return parseInt(actor.system.abilities[ability].mod) + parseInt(actor.system.bonuses.rsak.attack)
	} else if (isMeleeAttack) {
		return parseInt(actor.system.abilities[ability].mod) + parseInt(actor.system.bonuses.msak.attack)
	}
}
const getCharIconPaths = (choice, iconData) => {	
	const match = iconData.find(item => item.origin == choice)
	return match.icon
}
const getDeleteItemFlagData = async (liveItem, tempItem) => {
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
const getDeleteItemLogic = async (args, item, originTokenDoc, tempItem, tokenActor, workflow) => {
	const concEffect = await MidiQOL.getConcentrationEffect(tokenActor) ?? false	
	const hasTemplate = await fromUuid(workflow.templateUuid) ?? false
	const selfEffects = await getSelfEffects(tempItem)
	const hasSelfEffects = selfEffects.length > 0
	const hasSelfTarget = await checkSelfTarget(args, item, originTokenDoc)		
	return [concEffect, hasTemplate, hasSelfEffects, hasSelfTarget]
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
const getEligibleLevelSpells = (actor, item) => {
	const highestSpellLevel = getHighestSpellLevel(actor.system.spells)
	const mode = item.system.preparation.mode
	let eligibleLevelSpells = []
	let spellData = {}
	for (let i = item.system.level; i <= 5; i ++) {
		if (mode == "atwill" || mode == "innate") {				
			if (i == item.system.level) {
				spellData = getSpellData(actor, item, item.system.level)
				eligibleLevelSpells.push(spellData)
			}
		} else if (mode == "pact") {
			if (i == actor.system.spells.pact.level) {
				spellData = getSpellData(actor, item, actor.system.spells.pact.level)
				eligibleLevelSpells.push(spellData)
			}
		} else {
			if (i <= highestSpellLevel) {
				spellData = getSpellData(actor, item, i)
				eligibleLevelSpells.push(spellData)					
			}
		}	
	}		
	return eligibleLevelSpells
}
const getEligibleSpells = async (actors) => {
	return actors.map(actor => {

		const eligibleSpells = actor.items.filter(item => item.type == "spell" && item.system.level > 0 && item.system.level <= 5)	
		const actorSpells = eligibleSpells.reduce((spells, spell) => {
			const eligibleLevelSpells = getEligibleLevelSpells(actor, spell)
			return [...spells, ...eligibleLevelSpells]
		}, [])
		return {origin: actor.prototypeToken.name, icon: actor.prototypeToken.texture.src, spells: actorSpells}
	})
}
const getHighestSpellLevel = (spells) => {
	let arr = []
	let label
	for (let i = 1; i <= 9; i++) {
		label = "spell" + i
		if (spells[label].max > 0) arr.push(i)
	}
	return Math.max(...arr)
}
const getInitIconPaths = (buttonName) => {
	switch (buttonName) {
		case s.initChoices[0]:
			return "icons/magic/defensive/shield-barrier-flaming-diamond-teal-purple.webp"
			break
		case s.initChoices[1]:
			return "icons/magic/defensive/shield-barrier-flaming-pentagon-teal-purple.webp"
			break
		case s.initChoices[2]:
			return "icons/magic/defensive/shield-barrier-glowing-triangle-teal-purple.webp"
			break			
	}
}
const getLevelChoices = async (charChoice, tokenActor, eligibleSpellsByChar, item) => {
	const slotsRemaining = 5 - item.flags?.charname?.ringOfSpellStoring?.slotsUsed ?? 0
	const character = eligibleSpellsByChar.find(character => character.origin == charChoice.value)
	const eligibleLevels = character.spells.map(spell => spell.level).filter(level => level <= slotsRemaining)
	const spellLevels = new Set(eligibleLevels)			
	return Array.from(spellLevels).toSorted().map(level => s.levelLabels[level - 1])
}
const getLevelIconPaths = (buttonName) => {
	switch (buttonName) {
		case s.levelLabels[0]:
			return "icons/skills/ranged/target-bullseye-archer-orange.webp"
			break
		case s.levelLabels[1]:
			return "icons/skills/melee/weapons-crossed-daggers-orange.webp"
			break
		case s.levelLabels[2]:
			return "icons/skills/ranged/arrows-triple-yellow-red.webp"
			break
		case s.levelLabels[3]:
			return "icons/skills/ranged/shuriken-thrown-yellow.webp"
			break
		case s.levelLabels[4]:
			return "icons/skills/ranged/daggers-thrown-salvo-orange.webp"
			break				
	}	
}
const getLiveActors = async () => {
	return game.users.filter(user => user.character).filter(user => {
		return canvas.scene.tokens.find(token => token.actor.uuid == user.character.uuid)
	}).map(user => user.character)
}
const getNewSlotsUsed = async(item, level) => {
	const slots = item.flags?.charname?.ringOfSpellStoring?.slotsUsed ?? 0
	return slots + level
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
const getSpellChoice = async (spellChoices, spellHeader, getSpellIconPaths, spellIcons) => {
	const sortedChoices = spellChoices.toSorted()
	const radioSelections = sortedChoices.map(choice => {
		const data = spellIcons.find(spell => spell.name == choice)
		const icon = data.icon
		const label = `<img align=left src=${icon} width="15" height="15" style="border:0px">${choice}`
		return {type: "radio", label}
	})
	let choices = await warpgate.menu(
		{
			inputs: radioSelections
		},{
			title: spellHeader,
			render: (...args) => {},
			options: {
				width: "100%",
				height: "100%",
			}
		}
	)	
	return {value: sortedChoices[choices.inputs.indexOf(true)]}
}
const getSpellChoices = async (charChoice, eligibleSpellsByChar, levelChoiceInt) => {	
	const character = eligibleSpellsByChar.find(character => character.origin == charChoice.value)	
	const spells = character.spells.filter(spell => spell.level == levelChoiceInt && !s.charnamesExceptions.includes(spell.name))
	const names = spells.map(spell => spell.name)
	const icons = spells.map(spell => { return {name: spell.name, icon: spell.icon} })
	return [names, icons]
}
const getSpellData = (actor, item, i) => {
	const name = item.name
	const level = i
	const dc = actor.system.attributes.spelldc
	const ability = actor.system.attributes.spellcasting
	const attackBonus = getAttackBonus(actor, item, ability)
	const prof = actor.system.attributes.prof	
	const icon = item.img
	const uuid = item.uuid
	const activation = item.system.activation.type
	const originUuid = actor.uuid
	return {name, level, dc, ability, attackBonus, prof, icon, uuid, activation, originUuid}
}
const getSpellIconPaths = (choice, iconData) => {
	const match = iconData.find(item => item.name == choice)
	return match.icon	
}
const getSpellToCast = async (item) => {
	const spells = item.flags?.charname?.ringOfSpellStoring?.spells ?? []
	if (spells.length < 1) {
		ui.notifications.info(s.castSpellErr)
		return false		
	}	
	const uniqueSpells = new Set(spells)
	const spellsArr = Array.from(uniqueSpells)
	const spellNames = spellsArr.map(spell => spell.name).toSorted()
	const chosenSpell = await getDialogueButtonType(spellNames, {width: 400, height: "100%"}, s.castSpellHeader, getSpellIconPaths, 60, 60, spellsArr)
	return spellsArr.find(spell => spell.name == chosenSpell.value)
}
const getTempItem = async (liveItem, sourceItem, spellData, updatedMacroNames) => {
	return mergeObject(duplicate(sourceItem.toObject(false)), {
		img: liveItem.img,
		"flags.charname.ringOfSpellStoring.ringUuid": liveItem.uuid,
		"flags.charname.ringOfSpellStoring.spellData": spellData,
		"flags.midi-qol.onUseMacroName": updatedMacroNames,
		"system.ability": "none",
		"system.attackBonus": spellData.attackBonus,
		"system.preparation.mode": "innate",
		"system.save.dc": spellData.dc,
		"system.save.scaling": "flat"
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})	
}
const getUpdatedDescription = async (item) => {
	const desc = item.system.description.value
	const spells = item.flags.charname.ringOfSpellStoring.spells.reduce((spells, spell) => {
		const newSpell = ["<br />" + spell.name + s.descLevel + spell.level]
		return [...spells, ...newSpell]
	}, []).toSorted()		
	const newSpells = spells.reduce((descs, desc) => {
		return descs + desc
	}, "")
	const spellBankStr = desc.substring(
		desc.indexOf("*******") - 6, 
		desc.lastIndexOf("*******")	+ 7
	) ?? ""
	const sanitizedDesc = desc.replace(spellBankStr, "")	
	return sanitizedDesc + "<br />*******<br />" + s.currSpellBank + ":<br />" + newSpells + "<br />*******"
}
const getUpdatedMacroNames = async (macroNames, activation) => {	
	const update = macroNames.length > 0 
			? macroNames + ",[postRollFinished]function.CHARNAME.macros.ringOfSpellStoring.deleteTempItem" 
			: "[postRollFinished]function.CHARNAME.macros.ringOfSpellStoring.deleteTempItem"
	if (activation == "reaction") {
		return update + ",[postActiveEffects]function.CHARNAME.macros.ringOfSpellStoring.setReactionHook"
	} 
	return update
}
const getUpdateRingData = async (charName, eligibleSpellsByChar, item, level, spellName) => {
	const chr = eligibleSpellsByChar.find(chr => chr.origin == charName)
	const spellData = item.flags?.charname?.ringOfSpellStoring?.spells ?? []
	const newSlotsUsed = await getNewSlotsUsed(item, level)
	const chosenSpell = [chr.spells.find(spell => spell.name == spellName && spell.level == level)]		
	const newSpellData = [...spellData, ...chosenSpell]	
	return [chosenSpell, newSlotsUsed, newSpellData]
}
const main = async ({args, item}) => {
	const initChoice = await getDialogueButtonType(s.initChoices, {width: 400, height: "100%"}, s.initHeader, getInitIconPaths, 60, 60)
	const tokenActor = (await fromUuid(args[0].tokenUuid)).actor
	const liveItem = await fromUuid(item.uuid)
	if (initChoice.value == s.initChoices[0]) {
		addSpell(liveItem, tokenActor)
	} else if (initChoice.value == s.initChoices[1]) {
		castSpell(liveItem, tokenActor)
	} else if (initChoice.value == s.initChoices[2]) {
		resetSpells(liveItem, tokenActor)
	}
}
const resetSpells = async (item, tokenActor) => {
	setResetSpellsDesc(item)
	const tempItems = tokenActor.items.filter(item => item.flags?.charname?.ringOfSpellStoring?.ringUuid ?? false)
	tempItems.map(item => item.delete())
}
const setAddSpellNotification = async (item) => {
	if (item.flags.charname.ringOfSpellStoring.slotsUsed == 5) {
		ui.notifications.info(s.addSpellErr)
		return true
	}		
}
const setAddSpellUpdates = async (item, updates, tokenActor) => {
	const [choices, eligibleSpellsByChar] = updates
	const [spellData] = await updateRingItem(item, choices, eligibleSpellsByChar)	
	if (spellData.activation == "reaction") setReactionUpdates(spellData, tokenActor, item)	
}
const setCastSpellUpdates = async (updates, tokenActor) => {
	const [tempItem, workflow] = updates
	updateDeleteUuidEffects(tokenActor, tempItem)
	const template = await fromUuid(workflow.templateUuid) ?? false
	if (template) template.callMacro("whenCreated", {asGM: true})
}
const setDeleteItemFlags = async (tempItem) => {
	const liveItem = await fromUuid(tempItem.flags.charname.ringOfSpellStoring.ringUuid)
	const updates = await getDeleteItemFlagUpdates(liveItem, tempItem)
	updateDeleteItemFlags(liveItem, updates)
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
	const deletionChange = {key: "flags.dae.deleteUuid", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: [tempItem.uuid]}
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
	const spellData = item.flags?.charname?.ringOfSpellStoring?.spellData ?? false
	if (!spellData) return false
	setPreUseItemHooks(item, spellData)
}
const setReactionUpdates = async (spellData, tokenActor, liveItem) => {
	const [tempItem] = await createTempItem(spellData, tokenActor, liveItem)
	updateDeleteUuidEffects(tokenActor, tempItem)
}
const setResetSpellsDesc = async (item) => {
	const desc = item.system.description.value
	const spellBankStr = desc.substring(
		desc.indexOf("*******") - 6, 
		desc.lastIndexOf("*******")	+ 7
	) ?? ""	
	const updatedStr = "<br />*******<br />" + s.currSpellBank + ":<br /><br />*******"
	const updatedDesc = desc.replace(spellBankStr, updatedStr)	
	item.update({
		"flags.charname.ringOfSpellStoring.spells": [],
		"flags.charname.ringOfSpellStoring.slotsUsed": 0,
		"system.description.value": updatedDesc
	})		
}
const setRingUpdates = async (chosenSpell, item, newSlotsUsed, newSpellData) => {
	const flagUpdate = await item.update({
		"flags.charname.ringOfSpellStoring.spells": newSpellData,
		"flags.charname.ringOfSpellStoring.slotsUsed": newSlotsUsed
	})	
	const updatedDescription = await getUpdatedDescription(item)	
	const descUpdate = await item.update({
		"system.description.value": updatedDescription
	})	
}
const setRingUpdatesNotification = async (item, level) => {
	const slots = await getNewSlotsUsed(item, level)
	if (slots > 5) {
		ui.notifications.info(s.addSpellErr)
		return true
	}	
	return false
}
const updateDeleteItemFlags = async (item, updates) => {
	const [newSlotsUsed, newSpells] = updates
	const flaggedItem = await item.update({
		"flags.charname.ringOfSpellStoring.slotsUsed": newSlotsUsed,
		"flags.charname.ringOfSpellStoring.spells": newSpells
	})
	const updatedDescription = await getUpdatedDescription(flaggedItem)	
	await flaggedItem.update({
		"system.description.value": updatedDescription
	})		
}
const updateDeleteUuidEffects = async (actor, item) => {
	const effects = await getDeleteUuidEffects(actor, item)
	if (effects.length > 0) effects.map(effect => setDeleteUuids(item, effect))	
}
const updateRingItem = async (item, choices, eligibleSpellsByChar) => {	
	const [charName, level, spellName] = choices
	const notification = await setRingUpdatesNotification(item, level)
	if (notification) return false
	const [chosenSpell, newSlotsUsed, newSpellData] = await getUpdateRingData(charName, eligibleSpellsByChar, item, level, spellName)
	setRingUpdates(chosenSpell, item, newSlotsUsed, newSpellData)
	return chosenSpell
}

export const ringOfSpellStoring = {
	"main": main,
	"deleteTempItem": deleteTempItem,
	"setReactionHook": setReactionHook
}