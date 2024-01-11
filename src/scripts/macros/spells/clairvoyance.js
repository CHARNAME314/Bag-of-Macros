import {getSpawnLocation, setActorConcDeletion, setActorConcRemoveUuids} from "../../helper-functions.js"
import {socket} from "../../index.js"

const getSpawnUpdates = async (originActorSenses, originTokenSight) => {
	return {
		token: {
			"displayName": CONST.TOKEN_DISPLAY_MODES.HOVER,
			"alpha": 0,
			"sight": originTokenSight
		},
		actor: {
			"system.attributes.senses": originActorSenses
		}
	}
}
const getTokenSpawnIds = async (tokenUuid, itemRange, actor, originToken) => {
	const spawnedTokenId = await setSpawnedTokenId(tokenUuid, itemRange, actor, originToken)
	const spawnedToken = canvas.scene.collections.tokens.get(spawnedTokenId)
	return spawnedToken.uuid
}
const getWarpgateCallbacks = async (tokenUuid) => {
	return {
		pre: async (template,update,token) => {
			setEffectsSequencer(template, update, token, tokenUuid)
			await warpgate.wait(2650)
		},
		post: async (template, token) => {
			setPostEffectsSequencer(template,token)
		}
	}
}
const getWarpgateOptions = async (actor) => {
	return {controllingActor: actor}
}
const getWarpgateUpdates = async (spawn, originActorSenses, originTokenSight) => {
	const updates = await getSpawnUpdates(originActorSenses, originTokenSight)
	return mergeObject(updates, spawn)
}
const setEffectsSequencer = async (template, update, token, originTokenUuid) => {
	const color = "blue"
	const originToken = await fromUuid(originTokenUuid)
	new Sequence()
		.effect()
			.file(`jb2a.magic_signs.circle.02.divination.intro.${color}`)
			.scale(.15)
			.opacity(1)
			.atLocation(originToken)
			.belowTokens() 
			.waitUntilFinished(-1150)
		.effect()
			.file(`jb2a.magic_signs.circle.02.divination.loop.${color}`)
			.scale(.15)
			.atLocation(originToken)
			.belowTokens() 
			.fadeIn(200)
			.opacity(1)
			.waitUntilFinished(-1150)
		.effect()
			.file(`jb2a.magic_signs.circle.02.divination.outro.${color}`)
			.scale(.15)
			.opacity(1)
			.atLocation(originToken)
			.belowTokens() 
		.play()	
}
const setHookMacros = async (actor, spawnedTokenUuid) => {
	const userIsGM = game.users.find(user => user.id == game.userId).isTheGM
	if (!userIsGM) {
		await socket.executeAsGM("setDeleteSummonConcentrationHook", actor, spawnedTokenUuid)
	}
	const deleteSummonConcentrationHookId = Hooks.on("deleteToken", (tokenDoc, config, options) => {
		if (tokenDoc.uuid == spawnedTokenUuid) {		
			Hooks.off("preDeleteToken", deleteSummonConcentrationHookId)
			const concEffect =  actor.effects.find(effect => effect.name == "Concentrating")				
			if (!concEffect) return false
			concEffect.delete()				
		}
	})		
}
const setPostEffectsSequencer = async (template, token) => {
	const sequencerPath = "jb2a.impact.009.blue"
	new Sequence()
		.animation()
			.on(token)
			.fadeIn(250)	
		.effect()
			.file(sequencerPath)
			.atLocation({x: template.x, y: template.y})	
			.scale(.25)
			.opacity(1)
		.play()
	
}
const setPostSpawnEffects = async (spawnedTokenUuid, originTokenActorUuid) => {
	const fromUuidActor = await fromUuid(originTokenActorUuid)
	await setActorConcRemoveUuids(fromUuidActor, spawnedTokenUuid)
	await setHookMacros(fromUuidActor, spawnedTokenUuid)	
}
const setSpawnedTokenId = async (tokenUuid, itemRange, actor, originToken) => {
	const spawn = {
		token: { name:"Clairvoyance"},
		actor: { name:"Clairvoyance"}
	}
	const location = await getSpawnLocation("modules/jb2a_patreon/Library/5th_Level/Wall_Of_Force/WallOfForce_01_Grey_Sphere_400x400.webm", 1, 4, tokenUuid, itemRange, originToken)
	const spawnedTokenId = await warpgate.spawnAt({x: location.x, y: location.y}, spawn.token.name, await getWarpgateUpdates(spawn, actor.system.attributes.senses, originToken.document.sight), await getWarpgateCallbacks(tokenUuid), await getWarpgateOptions(actor))
	return spawnedTokenId[0]
}
const setSpellEffects = async ({speaker, actor, token, character, item, args, scope, workflow}) => {
	if (args[0].tag == "OnUse" && args[0].macroPass == "preItemRoll") {
		await setActorConcDeletion(actor)
	} else {	
		const spawnedTokenUuid = await getTokenSpawnIds(args[0].tokenUuid, 5280, actor, token)		
		await setPostSpawnEffects(spawnedTokenUuid, token.document.actor.uuid)	
	}
}

export const clairvoyance = {
	"setSpellEffects": setSpellEffects
}