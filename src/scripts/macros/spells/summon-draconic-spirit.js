import {getDialogueButtonType, getStringsOrExceptions} from "../../helper-functions.js"
import {summonDraconicSpirit as exceptionStrings} from "../../exceptions"
import {summonDraconicSpirit as defaultStrings} from "../../strings/spells.js"
import {summoning} from "../../helpers/summons.js"

const getCreateSpawnParams = async (actor, args, choice, resistValue, s) => {
	const spawnName = s.spawnNames[s.choices.indexOf(choice)]
	const mutations = await getSpawnUpdates(
		actor, 
		args,
		choice,
		s,
		spawnName
	)
	const overrides = await getOverrides(mutations, resistValue, s)	
	return [mutations, overrides, spawnName]
}
const getItemUpdates = async (s, spawnName, originAttack, level) => {
	if (spawnName == s.spawnNames[1]) {
		return {
			'Rend': {
				'data.damage.parts' : [[`1d6 + 4 + ${level}`, `piercing`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			},
			'Force Breath': {
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			},
			'Necrotic Breath': {
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			},
			'Psychic Breath': {
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			},
			'Radiant Breath': {
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			},
			'Thunder Breath': {
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			}
		}
	} else {
		return {
			'Rend': {
				'data.damage.parts' : [[`1d6 + 4 + ${level}`, `piercing`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			},
			'Acid Breath': {
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			},
			'Cold Breath': {
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			},
			'Fire Breath': {
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			},
			'Lightning Breath': {
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			},
			'Poison Breath': {
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			}
		}
	}
}
const getOverrides = async (mutations, resistValue, s) => {
	const sequencer = await getSequencerData(s, resistValue)
	return {
		warpGate: {
			mutations
		},
		sequencer
	}
}
const getSequencerData = async (s, resistValue) => {
	if (s.sequencerData) return s.sequencerData
	const circleColor = s.circleColors[s.resistValues.indexOf(resistValue)] 
	const impactColor = s.impactColors[s.resistValues.indexOf(resistValue)]
	const impactNum = s.impactNums[s.resistValues.indexOf(resistValue)]
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
			school: "conjuration",
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
		spawnDc,
		texture
	] = await getSpawnParams(actor, args, choice, s, spawnName)
	return {
		token: {
			"displayName": CONST.TOKEN_DISPLAY_MODES.HOVER,
			"texture.src": texture
		},
		actor: {
			"data.attributes.ac.flat" : ac,
			"data.attributes.hp" : hp,
			"data.details.cr" : originLevel,
			"data.bonuses.spell.dc": spawnDc,
			"img": texture
		},
		embedded: { 
			Item: await getItemUpdates(s, spawnName, originAttack, level)
		}		
	}
}
const getSpawnParams = async (actor, args, choice, s, spawnName) => {
	const originDc = actor.system.attributes.spelldc
	const originAttack = originDc - 8
	const originLevel = actor.system.details.level ?? actor.system.details.cr
	const originProf = actor.system.attributes.prof
	const texture =  s.defaultIcons[s.choices.indexOf(choice)]
	const level = args[0].spellLevel	
	const ac = 14 + level
	const hp = {value: 50+10*(level-5), max: 50+10*(level-5)}
	const spawnDc = await getSpawnDc(spawnName, originProf)	
	return [	
		ac,
		hp,
		level,
		originAttack,
		originDc,
		originLevel, 
		originProf,
		spawnDc,
		texture
	]
}
const getChoiceIconPaths = (choice, s) => {
	const index = s.choices.indexOf(choice)	
	if (s.exceptionActorNames) return s.defaultIcons[index]
	const actor = game.actors.find(actor => actor.name == s.spawnNames[index])
	const icon = actor?.img ?? false	
	if (!icon) return s.defaultIcons[index]
	return icon
}
const getResistChoices = async (choice, s) => {
	return s.choices.indexOf(choice) == 1 
		? s.resistChoices.slice(5, 10)
		: s.resistChoices.slice(0, 5)
}
const getResistChoiceIconPaths = (choice, s) => {
	const index = s.resistChoices.indexOf(choice)	
	return s.resistIcons[index]
}
const onUse = async ({actor, args, item, token, workflow}) => {
	const s = await getStringsOrExceptions(actor, defaultStrings, exceptionStrings)
	const choice = await getDialogueButtonType(
		s.choices, 
		{width: "100%", height: "100%"}, 
		s.initHeader, 
		getChoiceIconPaths, 
		100, 
		100, 
		s
	)
	const resistChoices = await getResistChoices(choice.value, s)
	const resistChoice = await getDialogueButtonType(
		resistChoices, 
		{width: "100%", height: "100%"}, 
		s.resistHeader, 
		getResistChoiceIconPaths, 
		100, 
		100, 
		s
	)
	const resistValue = await setResistEffect(resistChoice.value, s, token)
	const [
		mutations, 
		overrides, 
		spawnName
	] = await getCreateSpawnParams(actor, args, choice.value, resistValue, s)
	summoning.createSpawn(actor, choice.value, item, overrides, s, token) 
}
const setResistEffect = async (choice, s, token) => {
	const liveTokenActor = (await fromUuid(token.document.uuid)).actor
	const concEffect = await MidiQOL.getConcentrationEffect(liveTokenActor)
	const resistValue = s.resistValues[s.resistChoices.indexOf(choice)]
	const newChange = [{
		key: "system.traits.dr.value", 
		mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM, 
		value: [`${resistValue}`]
	}]	
	const newChanges = [...concEffect.changes, ...newChange]
	await concEffect.update({
		changes: newChanges,
		"flags.dae": {"specialDuration": ["shortRest", "longRest"]}
	})
	return resistValue
}

export const summonDraconicSpirit = {
	onUse
}