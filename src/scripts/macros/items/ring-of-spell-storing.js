//ring of spell storing
//use ability and you have two choices: add spell to ring or use spell already on ring
//add spell on ring will make a dynamic list for what to add to the ring
////selection will then add some flags to the ring to give us the spell name, uuid, icon, and spell level
////might add this info to the description so you know what's on it 
//use spell from ring will bring up a prompt to choose what spell you want to cast
////spell will temporarily be copied over into caster's spellbook (probably as an innate spell) and then cast and then deleted
////make sure deletion of spell item happens when item is cast (or if casting fails).  Make sure the inventory on the ring isn't changed until the spell is actually cast.
//note to self: do the second part first as it will be more challenging I'm sure
//also, need to add a button that clears the spells on the ring and resets it 

//TODO:
//Add template macro call

//where I left off: working on adding spells

import {getDialogueButtonType} from "../../helper-functions.js"
//refactor how you're going to store strings
import {ringOfSpellStoringInitChoices, ringOfSpellStoringInitHeader} from "../../strings.js"

const addSpells = async (tokenActor, item) => {
	const actors = await getLiveActors()
	const eligibleSpells = await getEligibleSpells(actors)
	console.log("eligibleSpells")
	console.log(eligibleSpells)	
	//prompt a dialog to pick who you want to get the spell from (buttons)
	//this choice will prompt another dialog (radio?  select?) for you to choose your spell from
	//this choice will add a flag to the ring with the appropriate data unless the ring is already too full (will prompt message)
}
const castSpell = async (tokenActor) => {
	const spellData = await getSpellToCast()
	const [tempItem] = await createTempItem(spellData, tokenActor)
	console.log("tempItem")
	console.log(tempItem)	
	Hooks.once("dnd5e.preUseItem", (item, config) => {
		console.log("PRE USE ITEM")
		if (item.uuid != tempItem.uuid) return false
		console.log("useItem item")
		console.log(item)
		console.log("useItem config")
		console.log(config)	
		config.consumeResource = false
		config.consumeSpellSlot = false
		config.consumeUsage = false
		//update to spellLevel when done testing
		config.slotLevel = 9
	})	
	const workflow = await MidiQOL.completeItemUse(tempItem)
	//don't forget to call the template macro here!
	console.log("workflow")
	console.log(workflow)
	if (workflow) await deleteTempItem(workflow)	
}
const createTempItem = async (spellData, tokenActor) => {
	const sourceItem = await fromUuid(spellData.uuid)
	console.log("tokenActor")
	console.log(tokenActor)
	console.log("spellData")
	console.log(spellData)	
	console.log("sourceItem")
	console.log(sourceItem)		
	//need to account for og casters spell save dc, spell attack bonus, and spellcasting ability
	const itemData = mergeObject(duplicate(sourceItem.toObject(false)), {
		name: "Ring of Spell Storing: " + spellData.name,
		"system.preparation.mode": "innate"
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})
	

	
	console.log("itemData")
	console.log(itemData)	
	return await tokenActor.createEmbeddedDocuments("Item", [itemData])
}
const deleteTempItem = async (workflow) => {
	const template = await fromUuid(workflow.templateUuid) ?? {}
	console.log("template")
	console.log(template)		
	//remove spell data from ring
	//will add this in after I finish the 'add to ring' part
	
	if (template.flags.templatemacro.whenCreated) {
		Hooks.once("deleteMeasuredTemplate", (deletedTemplate) => {
			if (deletedTemplate.uuid == template.uuid) {
				const tempItemExists = fromUuidSync(tempItem.uuid)
				if (tempItemExists) tempItem.delete()
			}
		})
	} else {
		tempItem.delete()
	}	
}
const getAttackBonus = (actor, item, ability) => {
	const isRangedAttack = item.system.actionType == "rsak"
	const isMeleeAttack = item.system.actionType == "msak"
	if (!isRangedAttack || !isMeleeAttack) {
		return 0
	} else if (isRangedAttack) {
		return actor.system.abilities[ability].mod + actor.system.bonuses.rsak.attack
	} else if (isMeleeAttack) {
		return actor.system.abilities[ability].mod + actor.system.bonuses.msak.attack
	}
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
		return {origin: actor.prototypeToken.name, spells: actorSpells}
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
		case "Add Spells":
			return "icons/magic/defensive/shield-barrier-flaming-diamond-teal-purple.webp"
			break
		case "Cast Spell":
			return "icons/magic/defensive/shield-barrier-flaming-pentagon-teal-purple.webp"
			break
		case "Empty Spells":
			return "icons/magic/defensive/shield-barrier-glowing-triangle-teal-purple.webp"
			break			
	}
}
const getLiveActors = async () => {
	return game.users.filter(user => user.character).filter(user => {
		return canvas.scene.tokens.find(token => token.actor.uuid == user.character.uuid)
	}).map(user => user.character)
}
const getSpellData = (actor, item, i) => {
	const origin = actor.prototypeToken.name
	const name = item.name
	const level = i
	const dc = actor.system.attributes.spelldc
	const ability = actor.system.attributes.spellcasting
	const attackBonus = getAttackBonus(actor, item, ability)
	const prof = actor.system.attributes.prof	
	const icon = actor.prototypeToken.texture.src
	return {origin, name, level, dc, ability, attackBonus, prof, icon}
}
const getSpellToCast = async () => {
	//dialog to chose spell from what's stored on the ring
	//dummy data for now
	return {name: "Cure Wounds", uuid: "Item.jDSEZWO8xBbW8AXB", level: 1}
}
const main = async ({args, item}) => {
	//dialog to choose if you are adding a spell or using a spell
	console.log(args)
	const initChoice = await getDialogueButtonType(ringOfSpellStoringInitChoices, {width: 400, height: 150}, ringOfSpellStoringInitHeader, getInitIconPaths, 60, 60)
	const tokenActor = (await fromUuid(args[0].tokenUuid)).actor
	const liveItem = await fromUuid(item.uuid)
	console.log("initChoice")
	console.log(initChoice)	
	console.log("tokenActor")
	console.log(tokenActor)	
	if (initChoice.value == ringOfSpellStoringInitChoices[0]) {
		addSpells(tokenActor, liveItem)
	} else if (initChoice.value == ringOfSpellStoringInitChoices[1]) {
		castSpell(tokenActor)
	} else if (initChoice.value == ringOfSpellStoringInitChoices[2]) {
		//need logic for reset spell
	}
	
}


export const ringOfSpellStoring = {
	"main": main
}