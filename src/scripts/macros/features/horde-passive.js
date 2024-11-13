import {cloudSpellNames} from "../../constants.js"

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
	const hordeItem = await fromUuid(actor.items.find(item => item.name == "Horde").uuid)
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
const setLiveTokenDocUpdates = async (texture, hordeItem, hordeItemUsesMax, multiplier, liveTokenDoc, shouldReduce, tokenSizeNum) => {
		hordeItem.update({"system.uses.value": hordeItemUsesMax * multiplier})
		await warpgate.wait(4000)	
		setSequencer(liveTokenDoc)
		await warpgate.wait(200)
		if (tokenSizeNum > 2 && shouldReduce) {
			if (liveTokenDoc.actor.system.traits.size != "grg" && liveTokenDoc.width <= 4 && liveTokenDoc.width <= 4 ) {
				liveTokenDoc.actor.update({"system.traits.size": Object.keys(CONFIG.DND5E.actorSizes)[tokenSizeNum - 1]})
			}
			liveTokenDoc.update({"width": liveTokenDoc.width - 1, "height": liveTokenDoc.width - 1})	
		}

		liveTokenDoc.update({"texture.src": texture})
}
const setPostDamageUpdates = async (actor, newHpDamage, liveTokenDoc, hordeItem, hordeItemUsesMax) => {
	const newHealthPercentage = ((actor.system.attributes.hp.value - newHpDamage) / actor.system.attributes.hp.max) * 100
	const tokenSizeNum = Object.keys(CONFIG.DND5E.actorSizes).indexOf(liveTokenDoc.actor.system.traits.size)
	let shouldReduce = false
	if (75 >= newHealthPercentage && newHealthPercentage > 50) {
		setLiveTokenDocUpdates(actor.flags["midi-qol"].hordePassive.img1, hordeItem, hordeItemUsesMax, .75, liveTokenDoc, shouldReduce, tokenSizeNum)
	} else if (50 >= newHealthPercentage && newHealthPercentage > 25) {
		shouldReduce = tokenSizeNum > 3
		setLiveTokenDocUpdates(actor.flags["midi-qol"].hordePassive.img2, hordeItem, hordeItemUsesMax, .50, liveTokenDoc, shouldReduce, tokenSizeNum)
	} else if (25 >= newHealthPercentage && newHealthPercentage >= 0) {
		shouldReduce = tokenSizeNum > 3
		setLiveTokenDocUpdates(actor.flags["midi-qol"].hordePassive.img3, hordeItem, hordeItemUsesMax, .25, liveTokenDoc, shouldReduce, tokenSizeNum)
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