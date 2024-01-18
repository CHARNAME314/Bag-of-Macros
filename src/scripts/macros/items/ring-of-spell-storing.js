//ring of spell storing
//use ability and you have two choices: add spell to ring or use spell already on ring
//add spell on ring will make a dynamic list for what to add to the ring
////selection will then add some flags to the ring to give us the spell name, uuid, icon, and spell level
////might add this info to the description so you know what's on it 
//use spell from ring will bring up a prompt to choose what spell you want to cast
////spell will temporarily be copied over into caster's spellbook (probably as an innate spell) and then cast and then deleted
////make sure deletion of spell item happens when item is cast (or if casting fails).  Make sure the inventory on the ring isn't changed until the spell is actually cast.
//note to self: do the second part first as it will be more challenging I'm sure

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
const getSpellToCast = async () => {
	//dialog to chose spell from what's stored on the ring
	//dummy data for now
	return {name: "Cure Wounds", uuid: "Item.jDSEZWO8xBbW8AXB", level: 1}
}
const main = async ({args}) => {
	//dialog to choose if you are adding a spell or using a spell
	//if adding, do add logic
	console.log(args)
	//if using, do use logic
	const tokenActor = (await fromUuid(args[0].tokenUuid)).actor
	console.log("tokenActor")
	console.log(tokenActor)
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
	console.log("workflow")
	console.log(workflow)	
	const template = await fromUuid(workflow.templateUuid) ?? {}
	console.log("template")
	console.log(template)		
	//tempItem.use()
	//remove spell data from ring
	//gotta delete item once template is destroyed, not immediately.  Effects seem fine.  Probably a hook would be best here.
	//tempItem.delete()
	
	if (template.flags.templatemacro.whenCreated) {
		console.log("delete hook whenCreated")
		//console.log(butt)		
		Hooks.once("deleteMeasuredTemplate", (deletedTemplate) => {
			if (deletedTemplate.uuid == template.uuid) {
				const butt = fromUuidSync(tempItem.uuid)
				console.log("delete hook butt")
				console.log(butt)
				if (butt) tempItem.delete()
			}
		})
		//socket.executeAsGM("setMeasuredTemplateDelete", template.uuid)}
	} else {
		tempItem.delete()
	}
}

export const ringOfSpellStoring = {
	"main": main
}