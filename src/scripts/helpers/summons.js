import {conditionLabels as c} from "../constants.js"
import {getSpawnLocation} from "../helper-functions.js"
import {setSpawnedTokensInitiative}  from "../socket-functions.js"

//review for later:
//think about adding sounds to the sequencers?
//see if you can fix the buggy useTokenDeleteSequencer Math.random thing
//add the linear fade in thing for the sequencers

//leaving as example of how override data is more or less laid out 
//don't forget to toString() your functions before passing them!
//spellLevel = workflow.castData.castLevel,
//spelldc = actor.system.attributes.spelldc
//overrides: {
//	general: {
//		amountToSpawnByIndex: [10, 3, 5, 1]
//	}
//	sequencer: {
//		pre: usePreEffectSequencer.toString(),
//		post: usePostEffectSequencer.toString(),
//		delete: useTokenDeleteSequencer.toString(),
//		options: {
//			circleNum: "02",
//			color: "green",
//			scale: .15,
//			school: "conjuration"
//	}},
//	mutations: {
//	  token: {},
//		actor: {
//			//
//		}
//	}
//}

const checkCombatActivity = async (token) => {
	const combatIsActive = game.combat?.active ?? false
	if (!combatIsActive) return false
	const sourceCombatDoc = game.combat.turns.find(doc => doc.tokenId == token.id)	
	if (!sourceCombatDoc) return false	
	return sourceCombatDoc
}
const createSpawn = async (actor, choice, item, overrides, strings, token) => {
	const concEffect = await getConcEffect(token)
	const spawnUuids = await createSpawnTokens(actor, choice, concEffect, item, overrides, strings, token)
	if (!concEffect) return false
	updateInitiatives(spawnUuids, token)
	updateConcEffect(concEffect, spawnUuids, token)
}
const createSpawnTokens = async (actor, choice, concEffect, item, overrides, strings, token) => {
	const params = await getSpawnParams(
		actor, 
		choice, 
		concEffect, 
		item, 
		overrides,
		strings,
		token
	)	
	const spawnIds = await setWarpGateSpawn(params, item, overrides, token)		
	return spawnIds.map(id => {		
		const token = canvas.scene.tokens.find(tokenDoc => tokenDoc.id == id)	
		return token.uuid
	})	
}
const getCallbacks = async (i, overrides, size, spawnName, originToken) => {
	return {
		pre: async (loc) => {
			usePreEffectSequencer(i, loc, originToken, size, overrides)
			await warpgate.wait(200)
		},
		post: async (loc, spawnToken) => {
			usePostEffectSequencer(loc, spawnToken, overrides)
			await warpgate.wait(100)
		}
	}
}
const getConcEffect = async (token) => {
	const liveActor = await fromUuid(token.actor.uuid)
	return liveActor.effects.find(effect => 
		c.concentrating.includes(effect.name.toLowerCase())
	)		
}
const getPreDeleteParams = async (tokenDoc) => {
	const amountSpawned = tokenDoc.actor?.flags?.charname?.summoning?.amountSpawned ?? 1	
	const deleteOverrides = tokenDoc.actor?.flags?.charname?.summoning?.overrides?.sequencer?.delete ?? false	
	const effectUuid = tokenDoc.actor?.flags?.charname?.summoning?.concEffect ?? false
	const optionOverrides = tokenDoc.actor?.flags?.charname?.summoning?.overrides?.sequencer?.options ?? {}	
	return [amountSpawned, deleteOverrides, effectUuid, optionOverrides]
}
const getPreEffectsSequencerParams = async (originToken, overrides, spawnSize) => {
	const circleNum = overrides?.sequencer?.options?.circleNum ?? "02"
	const color = overrides?.sequencer?.options?.color ?? "green"
	const school = overrides?.sequencer?.options?.school ?? "conjuration"
	const scale = overrides?.sequencer?.options?.scale ?? .15
	const originScale = Math.max(originToken.document.height, originToken.document.width) * scale
	const spawnScale = spawnSize * scale	
	return [circleNum, color, school, originScale, spawnScale]
}
const getSpawnDetails = async (actorName) => {
	const actor = game.actors.find(actor => actor.name == actorName)
	const iconPath = actor.prototypeToken.texture.src
	const size = Math.max(actor.prototypeToken.height, actor.prototypeToken.height)
	return [iconPath, size]
}
const getSpawnParams = async (actor, choice, concEffect, item, overrides, strings, token) => {
	const options = {controllingActor: actor}
	const spawnName = strings.spawnNames[strings.choices.indexOf(choice)]
	const [iconPath, size] = await getSpawnDetails(spawnName)
	const amountToSpawn = await getAmountToSpawn(choice, overrides, strings)
	const updates = await getSpawnUpdates(amountToSpawn, concEffect, overrides)
	const interval = size % 2 == 1 ? -1 : 1
	return {amountToSpawn, iconPath, interval, options, size, spawnName, updates}
}
const getAmountToSpawn = async (choice, overrides, strings) => {
	const overrideAmountToSpawn = overrides?.general?.amountToSpawnByIndex ?? 1
	if (typeof overrideAmountToSpawn == "number") return overrideAmountToSpawn
	return overrideAmountToSpawn[strings.choices.indexOf(choice)]	
}
const getSpawnUpdates = async (amountToSpawn, concEffect, overrides) => {
	const concEffectUuid = !concEffect ? null : concEffect.uuid
	const defaultMutations = {
		token: {"alpha": 0}, 
		actor: 
		{
			"flags.charname.summoning.amountSpawned": amountToSpawn,
			"flags.charname.summoning.concEffect": concEffectUuid,
			"flags.charname.summoning.overrides": overrides
		}
	}	
	const combinedMutations = {...defaultMutations, ...overrides.mutations}
	return combinedMutations
}
const onPreDeleteToken = async (tokenDoc, config, user) => {
	const theGmUser = game.users.find(user => user.isTheGM)
	if (game.users.get(user).id != theGmUser.id) return false	
	const [
		amountSpawned, 
		deleteOverrides, 
		effectUuid, 
		optionOverrides
	] = await getPreDeleteParams(tokenDoc)
	if (!deleteOverrides) {
		useTokenDeleteSequencer(tokenDoc)
	} else {
		eval(overrides.delete)(tokenDoc, optionOverrides)
	}
	if (effectUuid) {
		let concEffect = await fromUuid(effectUuid)			
		let created = concEffect.flags.charname.summoning.totalSpawnCreated
		let deleted = concEffect.flags.charname.summoning.totalSpawnDeleted		
		//adding random delay to account for multiple things trying to update all at once
		//refactor this later to see if you can get it to work by using a set or something
		const delay = Math.floor(Math.random() * 800 * (created - deleted))
		await warpgate.wait(delay)			
		concEffect = await fromUuid(effectUuid)		
		created = concEffect.flags.charname.summoning.totalSpawnCreated
		deleted = concEffect.flags.charname.summoning.totalSpawnDeleted
		const newDeleted = deleted + 1
		if (created == newDeleted) {
			concEffect.delete()
			return false
		}	
		const updatedConc = await concEffect.update({"flags": {"charname.summoning.totalSpawnDeleted": newDeleted}})
	}
}
const setSpawnedTokensToActive = async (spawnUuids, token) => {
	return canvas.scene.tokens.filter(
		token => spawnUuids.includes(token.uuid)
	).map(tokenDoc => {
		const combatToken = canvas.tokens.placeables.find(token => token.id == tokenDoc.id)
		combatToken.toggleCombat()
		return tokenDoc.id
	})	
}
const setWarpGateSpawn = async (params, item, overrides, token) => {
	const {
		amountToSpawn, 
		iconPath, 
		interval, 
		options, 
		size, 
		spawnName, 
		updates
	} = params
	let loc = {}
	let spawnIds = []
	let callbacks
	for (let i = 0; i < amountToSpawn; i++) {
		loc = await getSpawnLocation(
			iconPath, 
			size, 
			interval, 
			token.document.uuid, 
			item.system.range.value, 
			token
		)
		callbacks = await getCallbacks(i, overrides, size, spawnName, token) 
		spawnIds.push(await warpgate.spawnAt(
			{x: loc.x, y: loc.y}, 
			spawnName, 
			updates, 
			callbacks, 
			options
		))
	}
	return spawnIds
}
const updateCombatDocs = async (activeTokenIds, init) => {
	//literally takes a moment to add token to combat	
	await warpgate.wait(1000) 	
	const combatDocs = game.combat.turns.filter(doc => activeTokenIds.includes(doc.tokenId))
	setSpawnedTokensInitiative(combatDocs, init)	
}
const updateConcEffect = async (concEffect, spawnUuids, token) => {
	const deleteUuidChanges = spawnUuids.map(uuid => {
		return {
			"key": "flags.dae.deleteUuid",
			"mode": 2,
			"priority": 20,
			"value": uuid
		}
	})
	const changes = [...concEffect.changes, ...deleteUuidChanges]
	const spawnFlags = {
		"charname.summoning.totalSpawnCreated": spawnUuids.length,
		"charname.summoning.totalSpawnDeleted": 0,
		"charname.summoning.concEffect": concEffect.uuid
	}
	concEffect.update({"changes": changes, "flags": spawnFlags})	
}
const updateInitiatives = async (spawnUuids, token) => {
	const sourceCombatDoc = await checkCombatActivity(token)
	if (!sourceCombatDoc) return false
	const activeTokenIds = await setSpawnedTokensToActive(spawnUuids, token)
	const init = sourceCombatDoc?.initiative ?? false
	if (!init) return false 
	updateCombatDocs(activeTokenIds, init)
}
const usePostEffectSequencer = async (loc, token, overrides) => {
	const sequencer = overrides?.sequencer?.post ?? ""
	if (sequencer.length > 0) {
		eval(overrides.sequencer.post)(loc, token)
		return false
	}	
	await warpgate.wait(2100)
	const sequencerPath = "jb2a.impact.003.green" 
	new Sequence()
		.animation()
			.on(token)
				.fadeIn(700)
				.opacity(1)
		.play()
	new Sequence()
		.effect()
			.file(sequencerPath)
			.atLocation(token)
		.animation()
			.on(token)
			.opacity(1.0)
		.play()		
}
const usePreEffectSequencer = async (i, loc, originToken, spawnSize, overrides) => {
	const sequencer = overrides?.sequencer?.pre ?? ""
	if (sequencer.length > 0) {
		eval(overrides.sequencer.pre)(loc, token)
		return false
	}	
	const [
		circleNum, 
		color, 
		school, 
		originScale, 
		spawnScale
	] = await getPreEffectsSequencerParams(originToken, overrides, spawnSize)
	new Sequence()
		.effect()
			.file(`jb2a.magic_signs.circle.${circleNum}.${school}.intro.${color}`)
			.scale(spawnScale)
			.opacity(1)
			.atLocation(loc)
			.belowTokens() 
			.waitUntilFinished(-1150)
		.effect()
			.file(`jb2a.magic_signs.circle.${circleNum}.${school}.loop.${color}`)
			.scale(spawnScale)
			.atLocation(loc)
			.belowTokens() 
			.fadeIn(200)
			.opacity(1)
			.waitUntilFinished(-1150)
		.effect()
			.file(`jb2a.magic_signs.circle.${circleNum}.${school}.outro.${color}`)
			.scale(spawnScale)
			.opacity(1)
			.atLocation(loc)
			.belowTokens() 
		.play()
	if (i == 0) {
		new Sequence()
			.effect()
				.file(`jb2a.magic_signs.circle.${circleNum}.${school}.intro.${color}`)
				.scale(originScale)
				.opacity(1)
				.atLocation(originToken)
				.belowTokens() 
				.waitUntilFinished(-1150)
			.effect()
				.file(`jb2a.magic_signs.circle.${circleNum}.${school}.loop.${color}`)
				.scale(originScale)
				.atLocation(originToken)
				.belowTokens() 
				.fadeIn(200)
				.opacity(1)
				.waitUntilFinished(-1150)
			.effect()
				.file(`jb2a.magic_signs.circle.${circleNum}.${school}.outro.${color}`)
				.scale(originScale)
				.opacity(1)
				.atLocation(originToken)
				.belowTokens() 
			.play()			
	}
}
const useTokenDeleteSequencer = async (token, overrides) => {
	const sequencer = overrides?.sequencer?.delete ?? ""
	if (sequencer.length > 0) {
		eval(overrides.sequencer.delete)(loc, token)
		return false
	}	
	const color = overrides?.sequencer?.options?.color ?? "green"
	const impactNum = overrides?.sequencer?.options?.impactNum ?? "003"
	const sequencerPath = `jb2a.impact.${impactNum}.${color}`
	new Sequence()
		.animation()
			.on(token)
				.fadeIn(700)
				.opacity(1)
		.play()	
	new Sequence()
		.effect()
			.file(sequencerPath)
			.atLocation(token)
		.animation()
			.on(token)
			.opacity(1.0)
		.play()		
}

export const summoning = {
	createSpawn,
	onPreDeleteToken
}