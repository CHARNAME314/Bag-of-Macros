//TODO:
//make sure reset removes reaction spells inventory
//make sure ring is being updated with reaction items being used/deleted
//can add another macro to be called upon usage of reaction items to run a hook to adjust spell level
//update to add delete uuids to either template or template effect  
//refactor so I don't hate myself later

import {getDialogueButtonType} from "../../helper-functions.js"
import {ringOfSpellStoring as s} from "../../strings/items.js"

const addSpell = async (tokenActor, item) => {
	if (item.flags.charname.ringOfSpellStoring.slotsUsed == 5) {
		ui.notifications.info(s.addSpellErr)
		return false
	}	
	const actors = await getLiveActors()
	const eligibleSpellsByChar = await getEligibleSpells(actors)	
	const charChoices = eligibleSpellsByChar.map(character => character.origin).toSorted()
	const charChoice = await getDialogueButtonType(charChoices, {width: 400, height: 150}, s.charHeader, getCharIconPaths, 60, 60, eligibleSpellsByChar)
	const levelChoices = await getLevelChoices(charChoice, tokenActor, eligibleSpellsByChar, item)
	const levelChoice = await getDialogueButtonType(levelChoices, {width: 400, height: 150}, s.levelHeader, getLevelIconPaths, 60, 60)
	const levelChoiceInt = s.levelLabels.indexOf(levelChoice.value) + 1
	const [spellChoices, spellIcons] = await getSpellChoices(charChoice, eligibleSpellsByChar, levelChoiceInt)
	const spellChoice = await getSpellChoice(spellChoices, s.spellHeader, getSpellIconPaths, spellIcons)
	const [spellData] = await updateRingItem(item, charChoice.value, levelChoiceInt, spellChoice.value, eligibleSpellsByChar)	
	if (spellData.activation == "reaction") setReactionUpdates(spellData, tokenActor, item)
}
const castSpell = async (tokenActor, liveItem) => {
	const spellData = await getSpellToCast(liveItem)	
	const [tempItem] = await createTempItem(spellData, tokenActor, liveItem)
	updateDeleteUuidEffects(tempItem)
	Hooks.once("dnd5e.preUseItem", (item, config) => {
		if (item.uuid != tempItem.uuid) return false	
		config.consumeResource = false
		config.consumeSpellSlot = false
		config.consumeUsage = false
		config.slotLevel = spellData.level	
		config.system.prof._baseProficiency = spellData.prof			
	})	
	const workflow = await MidiQOL.completeItemUse(tempItem, liveItem)
	const template = await fromUuid(workflow.templateUuid) ?? false
	if (template) template.callMacro("whenCreated", {asGM: true})
}
const createTempItem = async (spellData, tokenActor, liveItem) => {
	const sourceItem = await fromUuid(spellData.uuid)	
	console.log("createTempItem liveItem")
	console.log(liveItem)	
	//add macros here
	console.log("createTempItem tokenActor")
	console.log(tokenActor)		
	
	
	
	
	const sourceMacroNames = sourceItem.flags["midi-qol"]?.onUseMacroName ?? ""
	const updatedMacroNames = sourceMacroNames.length > 0 
							? sourceMacroNames + ",[postRollFinished]function.CHARNAME.macros.ringOfSpellStoring.deleteTempItem" 
							: "[postRollFinished]function.CHARNAME.macros.ringOfSpellStoring.deleteTempItem"
	const itemData = mergeObject(duplicate(sourceItem.toObject(false)), {
		//name: "Ring of Spell Storing: " + spellData.name,
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

	console.log("createTempItem itemData")
	console.log(itemData)
	return await tokenActor.createEmbeddedDocuments("Item", [itemData])
}
const deleteTempItem = async ({args, item, workflow}) => {
	console.log("REACTION TIME BABY")
	console.log(args)
	console.log(item)
	console.log(workflow)
	const tempItem = await fromUuid(item.uuid)
	console.log("tempItem")
	console.log(tempItem)	
	const ringItem = await fromUuid(tempItem.flags.charname.ringOfSpellStoring.ringUuid)
	console.log("ringItem")
	console.log(ringItem)	
	const spellData = tempItem.flags.charname.ringOfSpellStoring.spellData
	const tokenActor = (await fromUuid(args[0].tokenUuid)).actor
	console.log("tokenActor")
	console.log(tokenActor)		
	await setDeleteItemFlags(ringItem, spellData)
	const concEffect = await MidiQOL.getConcentrationEffect(tokenActor) ?? false	
	console.log("concEffect")
	console.log(concEffect)		
	const template = await fromUuid(workflow.templateUuid) ?? false
	const deleteUuidEffects = await getDeleteUuidEffects(tempItem)
	if (concEffect) {
		setDeleteUuids(item, concEffect)
	} else if (!concEffect && !selfEffects && template) {
		//update to add delete uuids to either template or template effect 
		Hooks.once("deleteMeasuredTemplate", (deletedTemplate) => {
			if (deletedTemplate.uuid == template.uuid) {
				const tempItemExists = fromUuidSync(tempItem.uuid)
				if (tempItemExists) tempItem.delete()
			}
		})
	} else if (!concEffect && !template && deleteUuidEffects.length < 1) {
		tempItem.delete()
	}
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
const getEligibleSpells = async (actors) => {
	return actors.map(actor => {
		const highestSpellLevel = getHighestSpellLevel(actor.system.spells)
		const eligibleItems = actor.items.filter(item => item.type == "spell" && item.system.level > 0 && item.system.level <= 5)	
		const actorSpells = eligibleItems.reduce((items, item) => {
			let arr = []
			let spellData = {}
			for (let i = item.system.level; i <= 5; i ++) {
				if (item.system.preparation.mode == "atwill" || item.system.preparation.mode == "innate") {				
					if (i == item.system.level) {
						spellData = getSpellData(actor, item, item.system.level)
						arr.push(spellData)
					}
				} else if (item.system.preparation.mode == "pact") {
					if (i == actor.system.spells.pact.level) {
						spellData = getSpellData(actor, item, actor.system.spells.pact.level)
						arr.push(spellData)
					}
				} else {
					if (i <= highestSpellLevel) {
						spellData = getSpellData(actor, item, i)
						arr.push(spellData)					
					}
				}	
			}		
			return [...items, ...arr]
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
const getDeleteUuidEffects = async (item) => {	
	const isConcentration = item.system.components.concentration || item.flags.midiProperties.concentration
	const itemEffects = item.effects ?? []
	return itemEffects.filter(effect => {
		const selfTarget = effect.flags?.dae?.selfTarget ?? false
		const selfTargetAlways = effect.flags?.dae?.selfTargetAlways ?? false
		if ((selfTarget || selfTargetAlways) && !isConcentration) return true 
		return false
	}) ?? []
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
const getUpdatedDescription = async (item) => {
	const desc = item.system.description.value
	const spells = item.flags.charname.ringOfSpellStoring.spells.reduce((spells, spell) => {
		console.log("spell")
		console.log(spell)	
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
const main = async ({args, item}) => {
	const initChoice = await getDialogueButtonType(s.initChoices, {width: 400, height: "100%"}, s.initHeader, getInitIconPaths, 60, 60)
	const tokenActor = (await fromUuid(args[0].tokenUuid)).actor
	const liveItem = await fromUuid(item.uuid)
	if (initChoice.value == s.initChoices[0]) {
		addSpell(tokenActor, liveItem)
	} else if (initChoice.value == s.initChoices[1]) {
		castSpell(tokenActor, liveItem)
	} else if (initChoice.value == s.initChoices[2]) {
		resetSpells(liveItem)
	}
}
const updateRingItem = async (item, charName, level, spellName, eligibleSpellsByChar) => {	
	const slots = item.flags?.charname?.ringOfSpellStoring?.slotsUsed ?? 0
	const newSlotsUsed = slots + level
	if (newSlotsUsed > 5) {
		ui.notifications.info(s.addSpellErr)
		return false
	}
	const chr = eligibleSpellsByChar.find(chr => chr.origin == charName)
	const spellData = item.flags?.charname?.ringOfSpellStoring?.spells ?? []
	const chosenSpell = [chr.spells.find(spell => spell.name == spellName && spell.level == level)]		
	const newSpellData = [...spellData, ...chosenSpell]
	const flagUpdate = await item.update({
		"flags.charname.ringOfSpellStoring.spells": newSpellData,
		"flags.charname.ringOfSpellStoring.slotsUsed": newSlotsUsed
	})	
	const updatedDescription = await getUpdatedDescription(item)	
	const descUpdate = await item.update({
		"system.description.value": updatedDescription
	})
	return chosenSpell
}
const updateDeleteUuidEffects = async (item) => {
	const effects = await getDeleteUuidEffects(item)
	if (effects.length > 0) effects.map(effect => setDeleteUuids(item, effect))	
}
const resetSpells = async (item) => {
	const desc = item.system.description.value
	const spellBankStr = desc.substring(
		desc.indexOf("*******") - 6, 
		desc.lastIndexOf("*******")	+ 7
	) ?? ""	
	const updatedStr = "<br />*******<br />" + s.currSpellBank + ":<br /><br />*******"
	const updatedDesc = desc.replace(spellBankStr, updatedStr)	
	await item.update({
		"flags.charname.ringOfSpellStoring.spells": [],
		"flags.charname.ringOfSpellStoring.slotsUsed": 0,
		"system.description.value": updatedDesc
	})	
}
const setDeleteItemFlags = async (liveItem, spellData) => {
	const spells = liveItem.flags.charname.ringOfSpellStoring.spells	
	const slotsUsed = liveItem.flags.charname.ringOfSpellStoring.slotsUsed
	const usedSpell = spells.find(spell => {
		return spell.level == spellData.level
			&& spell.name == spellData.name 
			&& spell.dc == spellData.dc 
			&& spell.ability == spellData.ability
	})	
	const deleteIndex = spells.indexOf(usedSpell)
	const newSlotsUsed = slotsUsed - usedSpell.level
	const newSpells = spells.filter((spell, i) => i != deleteIndex)
	const flaggedItem = await liveItem.update({
		"flags.charname.ringOfSpellStoring.spells": newSpells,
		"flags.charname.ringOfSpellStoring.slotsUsed": newSlotsUsed
	})
	const updatedDescription = await getUpdatedDescription(flaggedItem)	
	const descUpdate = await flaggedItem.update({
		"system.description.value": updatedDescription
	})	
}
const setDeleteUuids = async (tempItem, effect) => {
	const deletionChange = {key: "flags.dae.deleteUuid", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: [tempItem.uuid]}
	const updatedChanges = [...effect.changes, deletionChange]
	effect.update({"changes": updatedChanges})		
}
const setReactionUpdates = async (spellData, tokenActor, liveItem) => {
	console.log("SET REACTION UPDATES")
	const [tempItem] = await createTempItem(spellData, tokenActor, liveItem)
	updateDeleteUuidEffects(tempItem)
}

export const ringOfSpellStoring = {
	"main": main,
	"deleteTempItem": deleteTempItem
}