import {cloudSpellNames} from "../../constants.js"

const hordeStr = "Horde"
const getAoeOverlapPerc = async (args) => {
	if (!args[0].templateId) return 0
	const creatureCoords = await getCreatureCoords(args[0].actor.token)
	const templateCoords = await getTemplateCoords(args[0].templateId) ?? false
	if (!templateCoords) return 0
	const overlap = creatureCoords.intersection(templateCoords)
	return overlap.size / creatureCoords.size
}
const getCreatureCoords = async (tokenDoc) => {
	const gridSize = canvas.scene.grid.size
	let set = new Set()
	let position = ""
	for (let i = 0; i < tokenDoc.height; i++) {
		for (let j = 0; j < tokenDoc.width; j++) {
			position = (tokenDoc.x + gridSize*i).toString() + "." + (tokenDoc.y + gridSize*j).toString() 
			set.add(position)
		}
	}
	return set
}
const getNewDamage = async(hpDamage, hordeCount, multiplier, hasAreaTarget) => {
	return hasAreaTarget ? Math.floor(hpDamage * hordeCount * multiplier) : hpDamage
}
const getNewTokenSizeDiff = async (oldHealthPercentage, newHealthPercentage) => {
	if (oldHealthPercentage > 75 && newHealthPercentage <= 50 && newHealthPercentage > 25) {
		return 2
	} else if (oldHealthPercentage > 75 && newHealthPercentage <= 25) {
		return 3
	} else if (oldHealthPercentage <= 75 && oldHealthPercentage > 50 && newHealthPercentage <= 25) {
		return 2
	} else {
		return 1
	}
}
const getTemplateCoords = async (templateId) => {
	const templateIdStr = "MeasuredTemplate." + templateId
	return canvas.grid.highlightLayers[templateIdStr].positions
}
const isSaveFailure = async ({args, item}) => {
	const hasAreaTarget = item.system.hasAreaTarget || cloudSpellNames.includes(item.name)
	console.log(await getAoeOverlapPerc(args))
	if (!item.system.hasAreaTarget || await getAoeOverlapPerc(args) <= .666) {
		Hooks.once("createActiveEffect", (effect) => {			
			effect.delete()
		})
	}	
}
const preTargetDamageApplication = async ({actor, args, item, workflow, token}) => {
	if (workflow.hitTargets.size < 1) return false
	const hordeItem = await fromUuid(actor.items.find(item => item.name == hordeStr).uuid)
	const hordeItemUses = hordeItem.system.uses.value
	const hordeItemUsesMax = hordeItem.system.uses.max
	const liveTokenDoc = await fromUuid(token.document.uuid)
	const hpDamage = workflow.damageItem.hpDamage
	const hasAreaTarget = item.system.hasAreaTarget || cloudSpellNames.includes(item.name)
	if (hpDamage > 0) setHpUpdateEffects(actor, hpDamage, hordeItem, hordeItemUses, hordeItemUsesMax, hasAreaTarget, workflow, liveTokenDoc, args)
}
const setHpUpdateEffects = async (actor, hpDamage, hordeItem, hordeItemUses, hordeItemUsesMax, hasAreaTarget, workflow, liveTokenDoc, args) => {
	const aoeOverlapPerc = await getAoeOverlapPerc(args)
	const newHpDamage = await getNewDamage(hpDamage, hordeItemUses, aoeOverlapPerc, hasAreaTarget)
	workflow.damageItem.hpDamage = newHpDamage
	setPostDamageUpdates(actor, newHpDamage, liveTokenDoc, hordeItem, hordeItemUsesMax)
}
const setLiveTokenDocSize = async (liveTokenDoc, tokenSizeDiff) => {
	if (liveTokenDoc.width - tokenSizeDiff < 4) {
		liveTokenDoc.actor.update({
			"system.traits.size": Object.keys(CONFIG.DND5E.actorSizes)[liveTokenDoc.width - tokenSizeDiff + 1]
		})
	}
	liveTokenDoc.update({"width": liveTokenDoc.width - tokenSizeDiff, "height": liveTokenDoc.height - tokenSizeDiff})		
}
const setLiveTokenDocUpdates = async (texture, hordeItem, hordeItemUsesMax, multiplier, liveTokenDoc, tokenSizeNum, tokenSizeDiff, maxHordeSize) => {
		hordeItem.update({"system.uses.value": hordeItemUsesMax * multiplier})
		await warpgate.wait(4000)	
		setSequencer(liveTokenDoc)
		await warpgate.wait(200)
		const newHordeUsesVal = (liveTokenDoc.actor.items.find(item => item.name == hordeStr)).system.uses.value
		setNewHordeUses(liveTokenDoc, maxHordeSize, tokenSizeDiff)
		if (maxHordeSize == 4 && newHordeUsesVal == 3) {
			//do nothing
		} else if (tokenSizeNum > 2) {
			setLiveTokenDocSize(liveTokenDoc, tokenSizeDiff)
		}
		liveTokenDoc.update({"texture.src": texture})
}
const setNewHordeUses = async (liveTokenDoc, maxHordeSize, tokenSizeDiff) => {
	const effect = liveTokenDoc.actor.effects.find(effect => effect.name == hordeStr)
	const oldChanges = effect.changes
	let attackBonus = oldChanges.find(change => change.key == "system.bonuses.All-Attacks")
	const oldAttackBonusVal = attackBonus.value
	let tempChanges = oldChanges.filter((change, i, arr) => i != arr.indexOf(attackBonus))
	attackBonus.value = oldAttackBonusVal - Math.floor(((maxHordeSize / 8) * tokenSizeDiff) + .5)
	tempChanges.push(attackBonus)
	effect.update({changes: tempChanges})
}

const setPostDamageUpdates = async (actor, newHpDamage, liveTokenDoc, hordeItem, hordeItemUsesMax) => {
	const oldHealthPercentage = actor.system.attributes.hp.value / actor.system.attributes.hp.max * 100
	const newHealthPercentage = ((actor.system.attributes.hp.value - newHpDamage) / actor.system.attributes.hp.max) * 100
	const tokenSizeNum = Object.keys(CONFIG.DND5E.actorSizes).indexOf(liveTokenDoc.actor.system.traits.size)
	const tokenSizeDiff = await getNewTokenSizeDiff(oldHealthPercentage, newHealthPercentage)
	if (oldHealthPercentage > 75 && newHealthPercentage <= 75 && newHealthPercentage > 50) {
		setLiveTokenDocUpdates(
			actor.flags["midi-qol"].hordePassive.img1, 
			hordeItem, 
			hordeItemUsesMax, 
			.75, 
			liveTokenDoc, 
			tokenSizeNum, 
			tokenSizeDiff,
			actor.flags["midi-qol"].hordePassive.maxHordeSize
		)
	} else if (oldHealthPercentage > 50 && newHealthPercentage <= 50 && newHealthPercentage > 25) {
		setLiveTokenDocUpdates(
			actor.flags["midi-qol"].hordePassive.img2, 
			hordeItem, 
			hordeItemUsesMax, 
			.50, 
			liveTokenDoc, 
			tokenSizeNum,
			tokenSizeDiff,
			actor.flags["midi-qol"].hordePassive.maxHordeSize
		)
	} else if (oldHealthPercentage > 25 && newHealthPercentage <= 25) {
		setLiveTokenDocUpdates(
			actor.flags["midi-qol"].hordePassive.img3, 
			hordeItem, 
			hordeItemUsesMax, 
			.25, 
			liveTokenDoc, 
			tokenSizeNum,
			tokenSizeDiff,
			actor.flags["midi-qol"].hordePassive.maxHordeSize
		)
	} 
}
const setSequencer = async (liveTokenDoc) => {
	new Sequence()
		.effect()
			.file(liveTokenDoc.actor.flags["midi-qol"].hordePassive.sequencerPath)
			.atLocation(liveTokenDoc)
		.play()
}

export const hordePassive = {
	isSaveFailure,
	preTargetDamageApplication
}