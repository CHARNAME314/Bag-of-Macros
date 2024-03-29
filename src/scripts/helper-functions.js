import {settings} from "./settings.js"
import {socket} from "./index.js"

export const createEffect = async (tokenActorUuid, effectData) => {
	return await MidiQOL.socket().executeAsGM(
		"createEffects", 
		{actorUuid: tokenActorUuid, effects: [effectData]}
	)
}
export const checkSelfTarget = async (args, item, originTokenDoc) => {
	const hasEffects = item.effects.size > 0
	const isSelfTargetItem = item.target?.type == "self"
	const originTargetingSelf = args[0].hitTargetUuids.filter(uuid => uuid == originTokenDoc.uuid).length > 0
	return hasEffects && (isSelfTargetItem || originTargetingSelf)
}
export const deleteTempItem = async ({args, item, workflow}, setDeleteItemFlags) => {
	const [tempItem, originTokenDoc, tokenActor] = await getDeleteItemData(args, item)
	if (setDeleteItemFlags) await setDeleteItemFlags(tempItem)
	const logic = await getDeleteItemLogic(args, item, originTokenDoc, tempItem, tokenActor, workflow)
	setDeleteItemLogic(logic, tempItem, tokenActor)
}
export const deleteAuraEffectsWhenMoved = async (effectName, newTokenActorUuids, oldTokenActorUuids, originUuid) => {
	const removalUuids = oldTokenActorUuids.filter(uuid => !newTokenActorUuids.includes(uuid))
	await removalUuids.forEach(actorUuid => {
		const actor = fromUuidSync(actorUuid)	
		const tokenEffect = actor.effects.find(effect => 
			effect.name == effectName
		 && effect.origin == originUuid
		)
		if (!tokenEffect) return false
		removeEffect(tokenEffect.uuid)
	})	
}
export const getAuraParamsWhenMoved = async (dispositions, getEffectData, template, flagName) => {
	const effectData = await getEffectData(template.flags["midi-qol"].actorUuid, template.uuid)
	const newTokenIds = game.modules.get("templatemacro").api.findContained(template)
	const newTokens = newTokenIds.map(id => 
		canvas.scene.collections.tokens.get(id)
	).filter(tokenDoc => 
		tokenDoc.id != template.flags["midi-qol"].tokenId
	 && dispositions.includes(tokenDoc.disposition)
	)
	const newTokenActorUuids = newTokens.map(token => token.actor.uuid)
	const oldTokenActorUuids = template.flags.charname[flagName].tokenActorsEffected
	return [effectData, newTokenActorUuids, oldTokenActorUuids]
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
export const getDeleteUuidEffects = async (actor, item) => {	
	const hasSysConc = item.system.components?.concentration ?? false
	const hasMidiConc = item.flags?.midiProperties?.concentration ?? false
	const isConcentration = hasSysConc || hasMidiConc
	const isReactionItem = item.system.activation.type == "reaction"
	if (isConcentration && !isReactionItem) {
		return [await MidiQOL.getConcentrationEffect(actor)]
	}
	return await getSelfEffects(item) ?? []
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
export const getSourceMacroNames = async (item) => {
	const hasFlags = item?.flags ?? false
	if (!hasFlags) return ""
	const hasMidi = item.flags["midi-qol"] ?? false
	if (!hasMidi) return ""
	const hasMacros = item.flags["midi-qol"].onUseMacroName ?? false
	if (!hasMacros) return ""
	return item.flags["midi-qol"].onUseMacroName
}
export const getSpawnLocation = async (spawnIconPath, size, interval, tokenUuid, itemRange, originToken) => {
	await setCrosshairConfigs(tokenUuid, itemRange, size)
	const distanceAvailable = itemRange
	let crosshairsDistance = 0
	const checkDistance = async (crosshairs) => {
		while (crosshairs.inFlight) {
			await warpgate.wait(100)
			const ray = new Ray(originToken.center, crosshairs)
			const distance = Math.ceil(canvas.grid.measureDistances([{ ray }], { gridSpaces: false })[0] / 5) * 5
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
export const getStringsOrExceptions = async (actor, defaultStrings, exceptionStrings) => {
	const exceptionActorNames = exceptionStrings?.exceptionActorNames ?? []
	return  exceptionActorNames.includes(actor.name) || exceptionActorNames == "all"
		? exceptionStrings 
		: defaultStrings	
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
export const getUpdatedMacroNames = async (macroNames, flagName, activation) => {	
	const update = macroNames.length > 0 
			? macroNames + `,[postRollFinished]function.CHARNAME.macros.${flagName}.deleteTempItem` 
			: `[postRollFinished]function.CHARNAME.macros.${flagName}.deleteTempItem`
	if (activation == "reaction") {
		return update + `,[postActiveEffects]function.CHARNAME.macros.${flagName}.setReactionHook`
	} 
	return update
}
export const removeEffect = async (effectUuid) => {
	return await MidiQOL.socket().executeAsGM("removeEffect", {effectUuid: effectUuid})
}
export const removeEffects = async (effectUuids) => {
	return await MidiQOL.socket().executeAsGM("removeEffects", effectUuids
)}
export const setActiveEffects = async (tokenActorUuids, effectData) => {
	const [effects] = await Promise.all(tokenActorUuids.map(tokenActorUuid => {
		return createEffect(tokenActorUuid, effectData)
	}))
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
export const setAuraEffectUpdatesWhenDeleted = async (effectName, flagName, template) => {
	const tokenActorsEffected = template.flags?.charname[flagName]?.tokenActorsEffected ?? []
	const effectUuids = await tokenActorsEffected.forEach(actorUuid => {
		const actor = fromUuidSync(actorUuid)			
		const effect = actor.effects.find(effect => effect.name == effectName)	
		if (!effect) return false
		removeEffect(effect.uuid)
	})	
}
export const setAuraEffectsWhenEntered = async (effectName, flagName, getEffectData, template, token) => {
	const tokenEffect = token.actor?.effects.find(effect => effect.name == effectName) ?? false
	if (!tokenEffect) {
		const effectData = await getEffectData(template.flags["midi-qol"].actorUuid, template.uuid)
		setActiveEffects([token.actor.uuid], effectData)
		const newActorUuids = [
			...template.flags.charname.insectCloud.tokenActorsEffected, 
			token.actor.uuid
		]
		const flag = `flags.charname.${flagName}.tokenActorsEffected`
		const updatedTemplate = await template.update({
			[flag]: newActorUuids
		})			
	}	
}
export const setAuraEffectsWhenLeft = async (effectName, flagName, template, token) => {
	const tokenEffect = token.actor?.effects.find(effect => effect.name == effectName) ?? false
	if (tokenEffect) {
		removeEffect(tokenEffect.uuid)
		const newActorUuids = template.flags.charname[flagName].tokenActorsEffected.filter(actorUuid => 
			actorUuid != token.actor.uuid
		)
		const flag = `flags.charname.${flagName}.tokenActorsEffected`
		const updatedTemplate = await template.update({
			[flag]: newActorUuids
		})			
	}	
}
export const setAuraEffectsWhenMoved = async (effectData, flagName, newTokenActorUuids, oldTokenActorUuids, template) => {
	const newUuidsToEffect = newTokenActorUuids.filter(uuid => 
		!oldTokenActorUuids.includes(uuid)
	)
	setActiveEffects(newUuidsToEffect, effectData)	
	const flag = `flags.charname.${flagName}.tokenActorsEffected`
	template.update({
		[flag]: newTokenActorUuids
	})		
}
export const setCastSpellUpdates = async (updates, tokenActor) => {
	const [tempItem, workflow] = updates
	updateDeleteUuidEffects(tokenActor, tempItem)
	const template = await fromUuid(workflow.templateUuid) ?? false
	if (template) template.callMacro("whenCreated", {asGM: true})
}
export const setCrosshairConfigs = async (tokenUuid, itemRange, size) => {
	const target = await fromUuid(tokenUuid)
	const {distance} = canvas.scene.grid
	const adjustment = size > 0 
		? (canvas.grid.size * .5 * size) 
		: (canvas.grid.size * .5)
	warpgate.crosshairs.show({
		lockSize:true,
		lockPosition: true,
		size: 2 * itemRange / distance,
		tag: 'range',
		drawIcon:false,
		label: 'Valid Area',
		x: target.x + adjustment,
		y: target.y + adjustment,
		rememberControlled: true
	})	
	canvas.tokens.activate()
}
export const setDeleteItemLogic = async (logic, tempItem, tokenActor) => {
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
export const setDeleteUuids = async (tempItem, effect) => {
	const deletionChange = {key: "flags.dae.deleteUuid", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: [tempItem.uuid]}
	const updatedChanges = [...effect.changes, deletionChange]
	effect.update({"changes": updatedChanges})		
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
export const updateAuraEffectsOnUse = async (actor, args, effectName, getEffectData, tokenActorUuids) => {
	const effectData = await getEffectData(actor.uuid, args[0].templateUuid)
	const [appliedEffect] = await setActiveEffects(tokenActorUuids, effectData)
	const liveActor = await fromUuid(actor.uuid)
	const templateEffect = liveActor.effects.find(effect => effect.name == effectName)
	const updatedChanges = [...templateEffect.changes, ...appliedEffect.changes]
	templateEffect.update({"changes": updatedChanges})
}
export const updateAuraFlags = async (flagName, template, tokenActorUuids) => {
	const flag = `flags.charname.${flagName}.tokenActorsEffected`
	const updatedTemplate = await template.update({
		[flag]: tokenActorUuids
	})		
}
export const updateAuraWhenMoved = async (dispositions, effectName, flagName, getEffectData, template) => {
	const [
		effectData, 
		newTokenActorUuids, 
		oldTokenActorUuids
	] = await getAuraParamsWhenMoved(dispositions, getEffectData, template, flagName)
	deleteAuraEffectsWhenMoved(
		effectName, 
		newTokenActorUuids, 
		oldTokenActorUuids,		
		template.flags["midi-qol"].actorUuid
	)
	setAuraEffectsWhenMoved(
		effectData, 
		flagName, 
		newTokenActorUuids, 
		oldTokenActorUuids, 
		template
	)	
}
export const updateDeleteUuidEffects = async (actor, item) => {
	const effects = await getDeleteUuidEffects(actor, item)
	if (effects.length > 0) effects.map(effect => setDeleteUuids(item, effect))	
}