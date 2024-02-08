import {settings} from "./settings.js"
import {socket} from "./index.js"

export const checkSelfTarget = async (args, item, originTokenDoc) => {
	const hasEffects = item.effects.size > 0
	const isSelfTargetItem = item.target?.type == "self"
	const originTargetingSelf = args[0].hitTargetUuids.filter(uuid => uuid == originTokenDoc.uuid).length > 0
	return hasEffects && (isSelfTargetItem || originTargetingSelf)
}
export const deleteTempItem = async ({args, item, workflow}, setDeleteItemFlags) => {
	const [tempItem, originTokenDoc, tokenActor] = await getDeleteItemData(args, item)
	await setDeleteItemFlags(tempItem)
	const logic = await getDeleteItemLogic(args, item, originTokenDoc, tempItem, tokenActor, workflow)
	setDeleteItemLogic(logic, tempItem, tokenActor)
}
export const getDeleteItemData = async (args, item) => {
	const tempItem = await fromUuid(item.uuid)
	const originTokenDoc = await fromUuid(args[0].tokenUuid)
	const tokenActor = originTokenDoc.actor	
	return [tempItem, originTokenDoc, tokenActor]
}
export const getDeleteItemLogic = async (args, item, originTokenDoc, tempItem, tokenActor, workflow) => {
	const concEffect = await MidiQOL.getConcentrationEffect(tokenActor) ?? false	
	const hasTemplate = await fromUuid(workflow.templateUuid) ?? false
	const selfEffects = await getSelfEffects(tempItem)
	const hasSelfEffects = selfEffects.length > 0
	const hasSelfTarget = await checkSelfTarget(args, item, originTokenDoc)		
	return [concEffect, hasTemplate, hasSelfEffects, hasSelfTarget]
}
export const getDialogueButtons = (resolve, choices, getIconPaths, width, height, iconData) => {	
	return choices.reduce((buttons, choice, i) => {
		const icon = getIconPaths(choice, iconData)
		const newButton = {[choice]: {
			label: `<img src=${icon} width=${width} height=${height} style="border:0px"><br>${choice}`,
			callback: () => {
				resolve({value: `${choice}`})
			}
		}}
		return {...buttons, ...newButton}
	}, {})
}
export const getDialogueButtonType = async (choices, dialogueOptions, title, getIconPathsFunc, buttonWidth, buttonHeight, iconData) => { 
	return await (new Promise( (resolve) => {	
		const buttons = getDialogueButtons(resolve, choices, getIconPathsFunc, buttonWidth, buttonHeight, iconData)		
		new Dialog({
			title: title,
			buttons: buttons
		}, dialogueOptions).render(true)
}))}
export const getSelfEffects = async (item) => {	
	const itemEffects = item.effects ?? []
	return itemEffects.filter(effect => {
		const selfTarget = effect.flags?.dae?.selfTarget ?? false
		const selfTargetAlways = effect.flags?.dae?.selfTargetAlways ?? false
		if ((selfTarget || selfTargetAlways)) return true 
		return false
	}) ?? []
}
export const getSpawnLocation = async (spawnIconPath, size, interval, tokenUuid, itemRange, originToken) => {
	await setCrosshairConfigs(tokenUuid, itemRange)
	const distanceAvailable = itemRange
	let crosshairsDistance = 0
	const checkDistance = async (crosshairs) => {
		while (crosshairs.inFlight) {
			await warpgate.wait(100)
			const ray = new Ray(originToken.center, crosshairs)
			const distance = canvas.grid.measureDistances([{ ray }], { gridSpaces: true })[0]
			if (crosshairsDistance !== distance) {
				crosshairsDistance = distance;
				if (distance > distanceAvailable) {
					crosshairs.icon = 'icons/svg/hazard.svg';
				} else {
					crosshairs.icon = spawnIconPath
				}
				crosshairs.draw();
				crosshairs.label = `${distance} ft`;
			}
		}
	}
	const location = await warpgate.crosshairs.show(
		{
			size: size,
			interval: interval,
			icon: spawnIconPath,
			label: '0 ft.',
		},
		{
			show: checkDistance
		},
	)
	if (location.cancelled || crosshairsDistance > distanceAvailable) {
		return
	} else {
		return location
	}
}
export const getTemplatesInRange = (templates, gridSize, gridScale, range, x1, y1) => {
	//gets templates where center of template within range of a cast template
	return templates.filter(template => {
		const [a, b] = [x1 - template.x, y1 - template.y]
		const c  = Math.sqrt(Math.pow(a,2) + Math.pow(b,2)) 
		const templateCentersDistance = c / gridSize	
		const templateRangeModified = template.distance / gridScale	
		const itemRangeModified = range / gridScale		
		return templateCentersDistance < templateRangeModified + itemRangeModified
	})
}
export const getTemplatesWithOverlap = (eligibleTemplates, itemTemplatePositions) => {
	return eligibleTemplates.filter(template => {
		const gridTemplateId = "MeasuredTemplate." + template.id
		const templatePositions = canvas.grid.highlightLayers[gridTemplateId]?.positions ?? new Set("-1")
		return itemTemplatePositions.intersection(templatePositions).size > 0
	})
}
export const getTokensInRange = async (tokens, gridSize, gridScale, itemRange, x1, y1) => {
	return tokens.filter(token => {
		const tokenTopLeftCenterX = token.x + gridSize / 2
		const tokenTopLeftCenterY = token.y + gridSize / 2
		let tokenGridBorderCoords = []
		
		for (let i = 0; i <= token.width * 2 - 1; i++) {
			for (let j = 0; j <= token.width * 2  - 1; j++) {
				tokenGridBorderCoords.push({x: tokenTopLeftCenterX + gridSize / 2 * i, y: tokenTopLeftCenterY + gridSize / 2 * j})
			}
		}
		
		const xArr = tokenGridBorderCoords.map(coord => coord.x)
		const yArr = tokenGridBorderCoords.map(coord => coord.y)
		const maxX = Math.max(...xArr)
		const maxY = Math.max(...yArr)
		const tokenGridCoords = tokenGridBorderCoords.filter(coords => coords.x != maxX && coords.y != maxY)
		
		const tokenGridCoordsInRange = tokenGridCoords.filter(coord => {
			const [x2, y2] = [coord.x, coord.y]
			const a = x1 - x2
			const b = y1 - y2
			const c = Math.sqrt(Math.pow(a,2) + Math.pow(b,2)) 
			return c / gridSize <= itemRange / gridScale
		})
		
		return tokenGridCoordsInRange.length > 0
	})
}
export const removeEffect = async (effectUuid) => {return await MidiQOL.socket().executeAsGM("removeEffect", {effectUuid: effectUuid})}
export const setActiveEffects = async (tokenActorUuids, effectData) => {
	const createEffect = async (tokenActorUuid, effectData) => {return await MidiQOL.socket().executeAsGM("createEffects", {actorUuid: tokenActorUuid, effects: [effectData]})}
	const [effects] = await Promise.all(tokenActorUuids.map(tokenActorUuid => createEffect(tokenActorUuid, effectData)))
	return effects
}
export const setActorConcDeletion = async (actor) => {
	if (actor.effects.find(effect => effect.name == "Concentrating")) actor.effects.find(effect => effect.name == "Concentrating").delete()
} 
export const setActorConcRemoveUuids = async (originActor, uuid) => {
	let originActorConcentrationRemoveUuids = originActor.flags["midi-qol"]["concentration-data"]?.removeUuids || []
	originActorConcentrationRemoveUuids.push(uuid)	
	await originActor.update({"flags.midi-qol": {"concentration-data": {removeUuids: originActorConcentrationRemoveUuids}}})
	const concEffect = originActor.effects.find(effect => effect.name == "Concentrating")
	await concEffect.update({
		"flags.dae": {"specialDuration": ["shortRest", "longRest"]}
	})
}
export const setActorReagentCost = async (actorUuid, itemUuid) => {
	const actor = await fromUuid(actorUuid)
	const item = await fromUuid(itemUuid)	
	if (settings.reagentsConsume = "money")  {
		//set this to pull from the lower denominations first
		const newMoney = actor.system.currency.gp - item.system.materials.cost
		if (newMoney < 0) return false
		actor.update({"system.currency.gp": newMoney})
	} else if (settings.reagentsConsume = "supply") {
		const newSupply = item.system.materials.supply - 1
		if (newSupply < 0) return false
		item.update({"system.materials.supply": newSupply})
	} else {
		return false
	}
	return true
}
export const setCrosshairConfigs = async (tokenUuid, itemRange) => {
	const target = await fromUuid(tokenUuid)
	const {distance} = canvas.scene.grid
	warpgate.crosshairs.show({
		lockSize:true,
		lockPosition: true,
		size: target.width + (2*itemRange/distance),
		tag: 'range',
		drawIcon:false,
		label: 'Valid Area',
		x: target.x,
		y: target.y,
		rememberControlled: true
	})	
	canvas.tokens.activate()
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
export const setTemplateDispels = async (x, y, name, itemTemplatePositions) => {
	const dnd5eFlaggedTemplates = canvas.scene.templates.filter(template => template.flags.dnd5e)
	const potentialTemplates = dnd5eFlaggedTemplates.filter(template => {
		const originName = fromUuidSync(template.flags.dnd5e.origin).name
		if (!name) {
			return template.flags.dnd5e.spellLevel
		} else {
			return template.flags.dnd5e.spellLevel && originName == name	
		}
	})
	const templatesInRange = getTemplatesInRange(potentialTemplates, canvas.scene.grid.size, canvas.scene.grid.distance, 60, x, y)
	const templatesWithOverlap = getTemplatesWithOverlap(templatesInRange, itemTemplatePositions)
	templatesWithOverlap.map(template => {socket.executeAsGM("setMeasuredTemplateDelete", template.uuid)})
}