import {getDialogueButtonType, getStringsOrExceptions} from "../../helper-functions.js"
import {summonUndead as exceptionStrings} from "../../exceptions"
import {summonUndead as defaultStrings} from "../../strings/spells.js"
import {summoning} from "../../helpers/summons.js"

//todo
//**I think the attack bonus is being applied incorrectly, fix it
//continue to check summoned creature attacks
////festering aura in particular needs to be rearranged
////might cut a new branch for that one and do some refactoring...  aka move aura functions into their own file 
//**make new icons for the shadow clones!
//**split out the icon exception/string thing so that you can have separate exceptions for dialog icon and token icon
//update string files to point to repos where the actual spell/item/actor names live for localization purposes
//think dc is still borked a bit

//logic on applying festering aura
//first thought: have a hook running that looks for the actor name (or maybe the item Festering Aura?) and applies the effect
//second thought: no hook, if the spawn has the spell then we run another function after creation to give it a template (if token attacher can't) and add macros  

const createAura = async (s, spawnUuid) => {
	await warpgate.wait(2200)
	const tokenDoc = await fromUuid(spawnUuid)
	const auraItem = tokenDoc.actor.items.find(item => s.auraName == item.name)	
	if (!auraItem) return false
	auraItem.use()
}
const festeringAuraOnUse = async ({actor, args, token}) => {
	const summonerActorUuid = actor.flags?.charname?.summoning?.sourceActorUuid ?? false
	if (!summonerActorUuid) return false
	const summonerActor = await fromUuid(summonerActorUuid)
	const s = await getStringsOrExceptions(summonerActor, defaultStrings, exceptionStrings)
	const template = await fromUuid(args[0].templateUuid)
	const spelldc = args[0].rollData.attributes.spelldc
	const castTime = {round: game.combat.current.round, turn: game.combat.current.turn}
	await auraSequencerEffects(s, template)
	await template.update({
		"flags.charname.spelldc": spelldc,
		"flags.charname.casterTokenId": args[0].tokenUuid,
		"flags.charname.summonerUuid": token.actor.flags.charname.summonerUuid
	})
	await tokenAttacher.attachElementToToken(template, token, suppresNotification=true)
}
const getAuraItemData = async (originActor, s) => {
	const sourceItem = game.items.find(item => item.name == s.auraName)
	const itemData = mergeObject(duplicate(sourceItem.toObject(false)), {
		name: s.auraName,
		type: "weapon",
		effects: [],
		flags: {
			"midi-qol": {
				onUseMacroName: null
			},
		},
		system: { 
			save: {
				dc: originActor.system.attributes.spelldc
			}
		}
	}, {overwrite: true, inlace: true, insertKeys: true, insertValues: true})
	return new CONFIG.Item.documentClass(itemData, { parent: originActor })
}
const getChoiceIconPaths = (choice, s) => {
	const index = s.choices.indexOf(choice)	
	if (s.exceptionActorNames) return s.defaultIcons[index]
	const actor = game.actors.find(actor => actor.name == s.spawnNames[index])
	const icon = actor?.img ?? false	
	if (!icon) return s.defaultIcons[index]
	return icon
}
const getCreateSpawnParams = async (actor, args, choice, s) => {
	const spawnName = s.spawnNames[s.choices.indexOf(choice)]
	const mutations = await getSpawnUpdates(
		actor, 
		args,
		choice,
		s,
		spawnName
	)
	const overrides = await getOverrides(choice, mutations, s)	
	return [mutations, overrides, spawnName]
}
const getEffectData = async (originUuid, effectType, spelldc, saveType) => {
	return {
		label: `Poisoned`, 
		icon: "modules/dfreds-convenient-effects/images/poisoned.svg", 
		originUuid,
		duration: {rounds:1},
		changes: [{key: "StatusEffect", mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: [`Convenient Effect: Poisoned`]}, {key: "macro.execute", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: [`"function.CHARNAME.macros.summonUndead.resetConditionImmunities"`]}],
		disabled: false
	}
}
const getFailedSaveTokenDocs = async (originActor, s, tokenDocs) => {
	let options = {}
	let workflow = []
	let newFailedSaveTokens = []
	const item = await getAuraItemData(originActor, s)
	for (i = 0; i < tokenDocs.length; i++) {
		if (tokenDocs[i].actor.system.traits.ci.value.has("poisoned") && tokenDocs[i].actor.system.details.type.value != "undead") continue
		options = { showFullCard: false, createWorkflow: true, versatile: false, configureDialog: false, targetUuids: [tokenDocs[i].uuid] }
		workflow = await MidiQOL.completeItemUse(item, {}, options)
		if (Array.from(workflow.failedSaves).length > 0) newFailedSaveTokens.push(Array.from(workflow.failedSaves)[0])
	}
	return newFailedSaveTokens	
}
const getHp = async (level, spawnName) => {
	const hp = game.actors.find(
		actor => actor.name == spawnName
	).system.attributes.hp.max + (10 * (level-3))
	return {value: hp, max: hp}
}
const getItemUpdates = async (s, spawnName, originAttack, originDc, level) => {
	if (spawnName == s.spawnNames[0]) {
		return {
			[s.spawnAttacks[0]]: {
				'data.damage.parts' : [[`1d6 + 3 + ${level}`, `slashing`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`,
				'data.save.dc': `${originDc}`
			}
		}
	} else if (spawnName == s.spawnNames[1]) {
		return {
			[s.spawnAttacks[1]]: {
				'data.damage.parts' : [[`2d4 + 3 + ${level}`, `necrotic`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			}
		}
	} else if (spawnName == s.spawnNames[2]) {
		return {
			[s.spawnAttacks[2]]: {
				'data.damage.parts' : [[`2d4 + 3 + ${level}`, `necrotic`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			}
		}
	}
}
const getOverrides = async (choice, mutations, s) => {
	const sequencer = await getSequencerData(choice, s)
	return {
		warpGate: {
			mutations
		},
		sequencer
	}
}
const getSequencerData = async (choice, s) => {
	if (s.sequencerData) return s.sequencerData
	const circleColor = s.circleColors[s.choices.indexOf(choice)] 
	const impactColor = s.impactColors[s.choices.indexOf(choice)]
	const impactNum = s.impactNums[s.choices.indexOf(choice)]
	return {
		options: {
			circleColor1: circleColor,
			circleColor2: circleColor,
			circleNum: "02",
			impactColor1: impactColor,
			impactColor2: impactColor,
			fadeIn: {ms: 400},
			impactNum1: impactNum,
			impactNum2: impactNum,
			scale: .15,
			school: "necromancy",
		}
	}
}
const getSpawnDc = async (spawnName, originProf) => {
	const spawnData = game.actors.find(actor => actor.name == spawnName)
	const spawnMod = spawnData.system.abilities.wis.mod 
	return originProf + spawnMod + 8
}
const getSpawnUpdates = async (actor, args, choice, s, spawnName) => {
	const [	
		ac,
		hp,	
		level,
		originAttack,
		originDc,
		originLevel, 
		originProf,
		spawnDc
	] = await getSpawnParams(actor, args, choice, s, spawnName)
	return {
		token: {
			"displayName": CONST.TOKEN_DISPLAY_MODES.HOVER
		},
		actor: {
			"data.attributes.ac.flat" : ac,
			"data.attributes.hp" : hp,
			"data.details.cr" : originLevel,
			"data.bonuses.spell.dc": spawnDc
		},
		embedded: { 
			Item: await getItemUpdates(s, spawnName, originAttack, originDc, level)
		}		
	}
}
const getSpawnParams = async (actor, args, choice, s, spawnName) => {
	const originDc = actor.system.attributes.spelldc
	const originAttack = originDc - 8
	const originLevel = actor.system.details.level ?? actor.system.details.cr
	const originProf = actor.system.attributes.prof
	const level = args[0].spellLevel	
	const ac = 11 + level
	const hp = await getHp(level, spawnName)
	const spawnDc = await getSpawnDc(spawnName, originProf)	
	return [	
		ac,
		hp,
		level,
		originAttack,
		originDc,
		originLevel, 
		originProf,
		spawnDc
	]
}
const onUse = async ({actor, args, item, token, workflow}) => {
	const s = await getStringsOrExceptions(actor, defaultStrings, exceptionStrings)
	const choice = await getDialogueButtonType(
		s.choices, 
		{width: 150 * s.choices.length, height: "100%"}, 
		s.initHeader, 
		getChoiceIconPaths, 
		80, 
		80, 
		s
	)
	const [
		mutations, 
		overrides, 
		spawnName
	] = await getCreateSpawnParams(actor, args, choice.value, s)
	const [spawnUuid] = await summoning.createSpawn(
		actor, 
		choice.value, 
		item, 
		overrides, 
		s, 
		token
	) 
	createAura(s, spawnUuid)
}
const onTurnStart = async ({template, token}) => {
	const originItem = await fromUuid(template.flags.dnd5e.origin)
	const originActor = await fromUuid(originItem.parent.uuid)
	const s = await getStringsOrExceptions(originActor, defaultStrings, exceptionStrings)
	const failedSaveTokens = await getFailedSaveTokenDocs(originActor, s, [token.document])
	const spelldc = template.flags.charname.spelldc
	if (!failedSaveTokens) return false
	await setConditionImmunity(failedSaveTokens, "poisoned")
	await setActiveEffects(failedSaveTokens, originActor, "Poisoned", spelldc, "int")
}
const resetConditionImmunities = async ({args}) => {
	console.log("AWOOOOGA")
	const lastArg = args[args.length - 1]
	const tokenDoc = await fromUuid(lastArg.tokenUuid)
	if (args[0] == "on") {
		//const useHookId = Hooks.on("preDeleteActiveEffect", (hookItem, config, options) => {	
		//	//
		//})
		//await DAE.setFlag(tokenDoc.actor, "charname", {festeringAura: {hookId: useHookId}})
	}  else if (args[0] == "off") {
		const tokenActorFlags = DAE.getFlag(tokenDoc.actor, "charname")
		//const hookId = tokenActorFlags.festeringAura.hookId
		const effectUuids = tokenActorFlags.festeringAura.effectUuids
		const oldImmunities = tokenActorFlags.festeringAura.oldImmunities
		if (tokenActorFlags.festeringAura.isPoisonImmune && oldImmunities.length > 0) tokenDoc.actor.update({"system.traits.ci.value": oldImmunities})
		//Hooks.off("preDeleteActiveEffect", hookId)
	}	
}
const setAuraSequencerEffects = async (s, template) => {
	const fileLoc = s.auraTemplateSrc
	new Sequence()
		.effect()
			.file(fileLoc)
			.scale(.5)
			.opacity(1)
			.attachTo(template)
			.persist()
		.play()	
}
const setConditionImmunity = async (tokenDocs, value) => {
	let values = new Set()
	let oldValues = []
	let newValues = []
	for (let i = 0; i < tokenDocs.length; i++) {
		values = tokenDocs[i].actor.system.traits.ci.value
		oldValues = Array.from(values)
		if (tokenDocs[i].actor.system.traits.ci.value.has(value) && tokenDocs[i].actor.system.details.type.value == "undead") {
			values.delete(value)
			newValues = Array.from(values)
			tokenDocs[i].actor.system.traits.ci.value.clear()
			data = {actorUuid: tokenDocs[i].actor.uuid, actorData: {"system.traits.ci.value": newValues}}
			await MidiQOL.socket().executeAsGM("updateActor", data)
			await DAE.setFlag(tokenDocs[i].actor, "charname", {festeringAura: {isPoisonImmune: true, oldImmunities: oldValues}})	
		}
	}
}

export const summonUndead = {
	festeringAuraOnUse,
	onTurnStart,
	onUse,
	resetConditionImmunities
}






