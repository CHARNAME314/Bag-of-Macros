import {getDialogueButtonType, setActiveEffects} from "../../helper-functions.js"

const getCommandItemData = async (originActor, type) => {
	const sourceItem = type.value == "Command: Flee" ? await fromUuid("Item.TLqebf57ZF6HUkml") : await fromUuid("Item.9iKDqMbCAERS9psP")
	console.log(sourceItem)
	const itemData = mergeObject(duplicate(sourceItem.toObject(false)), {
			//name: "Wand of Fear"
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})
	return new CONFIG.Item.documentClass(itemData, { parent: originActor })
}
const getFearItemData = async (originActor) => {
	const sourceItem = await fromUuid("Item.DG5FfgOrf5IhvITt")
	const itemData = mergeObject(duplicate(sourceItem.toObject(false)), {
		name: "Wand of Fear"
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})
	return new CONFIG.Item.documentClass(itemData, { parent: originActor })
}
const getIconPaths = (buttonName) => {
	switch (buttonName) {
		case "Fear":
			return "icons/magic/control/fear-fright-monster-purple-blue.webp"
			break
		case "Command: Flee":
			return "icons/magic/control/fear-fright-shadow-monster-purple.webp"
			break
		case "Command: Prone":
			return "icons/magic/control/silhouette-fall-slip-prone.webp"
			break			
	}
}
const onUse = async ({args, item, actor, token}) => {
	const buttonOptions = item.system.uses.value > 1 ? ["Fear", "Command: Flee", "Command: Prone"] : ["Command: Flee", "Command: Prone"]
	const type = await getDialogueButtonType(buttonOptions, {width: 400, height: 150}, "What do you want to cast?", getIconPaths, 60, 60)
	if (type.value == "Fear") {
		setFearEffects(actor, item)
	} else {
		setCommandEffects(actor, item, token, type)
	}
}
const setCommandEffects = async (actor, item, token, type) => {
	const commandItem = await getCommandItemData(actor, type)
	const target = game.user.targets?.first() ?? false
	if (!target) return false
	const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [target.document.uuid]}
	const commandWorkflow = await MidiQOL.completeItemUse(commandItem, {}, options)	
	setCommandEffectsSequencer(target)
	setItemUsesUpdate(item.uuid, 1)	
}
const setCommandEffectsSequencer = async (token) => {
	new Sequence()
		.effect()
			.file(`jb2a.magic_signs.circle.02.enchantment.complete.dark_purple`)
			.scale(.25)
			.opacity(1)
			.attachTo(token)
			.belowTokens()
		.play()			
}
const setEffectsSequencer = async (x, y, scale, token, template) => {
	new Sequence()
		.effect()
			.file(`jb2a.detect_magic.cone.purple`)
			.scale(4.4)
			.opacity(1)
			.atLocation({x: template.x, y: template.y})
			.spriteOffset({x: 600, y:0}, {local: true})
			.rotate(-template.direction)
		.play()			
}
const setFearEffects = async (actor, item) => {
	const fearItem = await getFearItemData(actor)
	const options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false}
	const fearWorkflow = await MidiQOL.completeItemUse(fearItem, {}, options)	
	const liveTemplate = await fromUuid(fearWorkflow.templateUuid)
	setEffectsSequencer(0, 0, 1, false, liveTemplate)
	setItemUsesUpdate(item.uuid, 2)	
}
const setItemUsesUpdate = async (itemUuid, usesUsed) => {
	const liveItem = await fromUuid(itemUuid)
	liveItem.update({"system.uses.value": liveItem.system.uses.value - usesUsed})
}

export const wandOfFear = {
	onUse
}