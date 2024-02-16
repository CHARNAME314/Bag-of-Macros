import {conditionLabels} from "../../constants.js"
import {getDialogueButtonType, getStringsOrExceptions, setActiveEffects} from "../../helper-functions.js"
import {summonUndead as exceptionStrings} from "../../exceptions"
import {summonUndead as defaultStrings} from "../../strings/spells.js"
import {summoning} from "../../helpers/summons.js"

const createAura = async (s, spawnUuid) => {
	await warpgate.wait(2500)
	const tokenDoc = await fromUuid(spawnUuid)
	const preAuraItem = tokenDoc.actor.items.find(item => s.auraName == item.name)
	const update = {
		system: { 
			save: {
				ability: ""
			}
		}
	}
	const auraItem = await preAuraItem.update(update)
	if (!auraItem) return false
	await auraItem.use()
}
const festeringAuraOnUse = async ({actor, args, token}) => {
	const summonerActorUuid = actor.flags?.charname?.summoning?.sourceActorUuid ?? false
	if (!summonerActorUuid) return false
	const summonerActor = await fromUuid(summonerActorUuid)
	const s = await getStringsOrExceptions(summonerActor, defaultStrings, exceptionStrings)
	const template = await fromUuid(args[0].templateUuid)
	const summonerDc = summonerActor.system.attributes.spelldc
	const castTime = {round: game.combat.current.round, turn: game.combat.current.turn}
	await setAuraSequencerEffects(s, template)
	const ability = await getAbility(actor, s)
	const update = {
		"flags.charname.festeringAura.spelldc": summonerDc,
		"flags.charname.festeringAura.casterTokenId": args[0].tokenUuid,
		"flags.charname.festeringAura.summonerUuid": token.actor.flags.charname.summonerUuid,
		"flags.charname.festeringAura.castTime": castTime,
		system: { 
			save: {
				ability
			}
		}
	}
	await template.update(update)
	await tokenAttacher.attachElementToToken(template, token, true)
}
const getAbility = async (actor, s) => {
	const stringAbility = s?.auraAbility ?? null
	if (stringAbility) return stringAbility
	const prototypeActor = game.actors.find(ptActor => actor.name == ptActor.name)
	const protoItemAbility = prototypeActor.items.find(
		item => item.name == s.auraName
	)?.system?.save?.ability ?? null
	if (protoItemAbility) return protoItemAbility
	const genericItemAbility = game.items.find(
		item => item.name == s.auraName
	)?.system?.save?.ability ?? null
	if (genericItemAbility) return genericItemAbility
	return "con"
}
const getAuraItemData = async (originActor, s, summoner) => {
	const sourceItem = originActor.items.find(item => s.auraName == item.name)
	const itemData = mergeObject(duplicate(sourceItem.toObject(false)), {
		"flags.midi-qol.onUseMacroName": "",
		system: { 
			duration: {
				value: "",
				units: "inst"
			},
			range: {
				units: "any",
				value: null
			},
			save: {
				ability: await getAbility(originActor, s),
				dc: summoner.system.attributes.spelldc,
				scaling: "flat"
			},
			target: {
				type: "creature",
				units: "",
				value: 1,
				width: null
			}
		},
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
const getEffectData = async (originUuid, effectType, s, spelldc, saveType) => {
	if (s.isException) {
		return {
			name: "Poisoned", 
			flags: {
				"flags.charname.festeringAura.active": true,
				"flags.dae.stackable": "noneName"
			},
			icon: "modules/dfreds-convenient-effects/images/poisoned.svg", 
			originUuid,
			duration: {rounds:1, turns: 0},
			changes: [{
				key: "StatusEffect", mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, 
				value: [`Convenient Effect: Poisoned`]
			}, {
				key: "macro.execute", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, 
				value: [`function.CHARNAME.macros.summonUndead.resetConditionImmunities`]
			}],
			disabled: false
		}		
	}
	return {
			name: "Poisoned", 
			flags: {
				"flags.charname.festeringAura.active": true,
				"flags.dae.stackable": "noneName"
			},
			icon: "modules/dfreds-convenient-effects/images/poisoned.svg", 
			originUuid,
			duration: {rounds:1, turns: 0},
			changes: [{
				key: "StatusEffect", mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, 
				value: [`Convenient Effect: Poisoned`]
			}],
			disabled: false
	}
}
const getFailedSaveTokenDocs = async (originActor, s, summoner, tokenDocs) => {
	let options = {}
	let workflow = []
	let newFailedSaveTokens = []
	const item = await getAuraItemData(originActor, s, summoner)
	const newItem = await item.update({
		"flags.templatemacro": null, 
		"flags.midi-qol": {
			onUseMacroName: "",
			onUseMacroParts: null
		}
	})
	for (let i = 0; i < tokenDocs.length; i++) {
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
const getParalyzeEffect = async (item) => {
	return {
		name: "Paralyzed",
		originUuid: item.uuid,
		duration: {rounds:1, turns: 1},
		changes: [{key: "StatusEffect", mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, value: [`Convenient Effect: Paralyzed`]}],
		disabled: false
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
const getSpawnUpdates = async (actor, args, choice, s, spawnName) => {
	const [	
		ac,
		hp,	
		level,
		originAttack,
		originDc,
		originLevel, 
		originProf,
		spawnDcBonus
	] = await getSpawnParams(actor, args, choice, s, spawnName)
	return {
		token: {
			"displayName": CONST.TOKEN_DISPLAY_MODES.HOVER
		},
		actor: {
			"data.attributes.ac.flat" : ac,
			"data.attributes.hp" : hp,
			"data.details.cr" : originLevel,
			"data.bonuses.spell.dc": spawnDcBonus
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
	const spawnDcBonus = originDc - originProf - 8
	return [	
		ac,
		hp,
		level,
		originAttack,
		originDc,
		originLevel, 
		originProf,
		spawnDcBonus
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
const onTurnStart = async (template, token) => {
	//passed in from Festering Aura onTurnStart template macro
	const originItem = await fromUuid(template.flags.dnd5e.origin)
	if (!originItem) return false
	const originActor = await fromUuid(originItem.parent.uuid)
	const summoner = await fromUuid(originActor.flags.charname.summoning.sourceActorUuid)
	if (
		token.actor.name == originActor.name 
		|| token.actor.name == summoner.name
	) return false	
	const s = await getStringsOrExceptions(summoner, defaultStrings, exceptionStrings)
	const failedSaveTokens = await getFailedSaveTokenDocs(originActor, s, summoner, [token.document])
	const spelldc = template.flags.charname.festeringAura.spelldc
	if (failedSaveTokens.length < 1) return false
	//at some point refactor setConditionImmunity into a helper function 
	if (s.isException) {
		await setConditionImmunity(failedSaveTokens, "poisoned")		
	}
	const ability = await getAbility(originActor, s)
	const failedSaveTokenUuids = failedSaveTokens.map(token => token.actor.uuid)
	const effectData = await getEffectData(originActor, "Poisoned", s, spelldc, ability)
	const tokenActor = await fromUuid(failedSaveTokens[0].actor.uuid)
	const lastEffects = tokenActor.effects.find(effect => effect.name == "poisoned")
	await tokenActor.createEmbeddedDocuments("ActiveEffect", [effectData])	
}
const resetConditionImmunities = async ({args}) => {
	const lastArg = args[args.length - 1]
	const tokenDoc = await fromUuid(lastArg.tokenUuid)
	if (args[0] == "on") {
	}  else if (args[0] == "off") {
		const tokenActorFlags = DAE.getFlag(tokenDoc.actor, "charname")
		const effectUuids = tokenActorFlags.festeringAura.effectUuids
		const oldImmunities = tokenActorFlags.festeringAura.oldImmunities
		if (tokenActorFlags.festeringAura.immune == "poison" 
			&& oldImmunities.length > 0
		) tokenDoc.actor.update({"system.traits.ci.value": oldImmunities})

	}	
}
const rottingClaw = async ({actor, args, item, token, workflow}) => {
	if (args[0].tag == "OnUse" && workflow.failedSaves.size > 0) {
		const summonerActorUuid = token.actor?.flags?.charname?.summoning?.sourceActorUuid ?? false
		if (!summonerActorUuid) return false
		const summonerActor = await fromUuid(summonerActorUuid)
		const s = await getStringsOrExceptions(summonerActor, defaultStrings, exceptionStrings)		
		if (workflow.failedSaves.length < 1) return false
		const failedSaveUuid = Array.from(workflow.failedSaves)[0]
		const target = Array.from(workflow.hitTargets)[0]
		const uuid = target.actor.uuid
		const hasEffectApplied = target.actor.effects.filter(effect => 
			conditionLabels['poisoned'].includes(effect.name.toLowerCase())
		).length > 0
		const isParalyzeImmune = target.actor.system.traits.ci.value.has('paralyzed')
		const isUndead = target.actor.system.details.type.value == "undead"		
		const effect = await getParalyzeEffect(item)
		if (hasEffectApplied 
			&& isParalyzeImmune 
			&& isUndead 
			&& s.isException
		) {
			game.dfreds.effectInterface.addEffect({ effectName: "Entropically Paralyzed", uuid })
		} else if (hasEffectApplied) {
			await setActiveEffects([uuid], effect)
		}
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
	let data = {}
	for (let i = 0; i < tokenDocs.length; i++) {
		values = tokenDocs[i].actor.system.traits.ci.value
		oldValues = Array.from(values)
		if (tokenDocs[i].actor.system.traits.ci.value.has(value) && tokenDocs[i].actor.system.details.type.value == "undead") {
			values.delete(value)
			newValues = Array.from(values)
			tokenDocs[i].actor.system.traits.ci.value.clear()
			data = {actorUuid: tokenDocs[i].actor.uuid, actorData: {"system.traits.ci.value": newValues}}
			await MidiQOL.socket().executeAsGM("updateActor", data)
			await DAE.setFlag(tokenDocs[i].actor, "charname", {festeringAura: {immune: value, oldImmunities: oldValues}})	
		}
	}
}

export const summonUndead = {
	festeringAuraOnUse,
	onTurnStart,
	onUse,
	resetConditionImmunities,
	rottingClaw
}