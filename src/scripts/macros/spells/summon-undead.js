import {getDialogueButtonType, getStringsOrExceptions} from "../../helper-functions.js"
import {summonUndead as exceptionStrings} from "../../exceptions"
import {summonUndead as defaultStrings} from "../../strings/spells.js"
import {summoning} from "../../helpers/summons.js"

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
const getHp = async (level, spawnName) => {
	const hp = game.actors.find(
		actor => actor.name == spawnName
	).system.attributes.hp.max + (10 * (level-3))
	return {value: hp, max: hp}
}
const getItemUpdates = async (s, spawnName, originAttack, originDc, level) => {
	if (spawnName == s.spawnNames[0]) {
		return {
			'Deathly Touch': {
				'data.damage.parts' : [[`1d6 + 3 + ${level}`, `slashing`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`,
				'data.save.dc': `${originDc}`
			}
		}
	} else if (spawnName == s.spawnNames[1]) {
		return {
			"Rotting Claw": {
				'data.damage.parts' : [[`2d4 + 3 + ${level}`, `necrotic`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			}
		}
	} else if (spawnName == s.spawnNames[2]) {
		return {
			"Grave Bolt": {
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
			Item: await getItemUpdates(s, spawnName, originDc, originAttack, level)
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
		spawnDc,
		texture
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
	summoning.createSpawn(actor, choice.value, item, overrides, s, token) 
}

export const summonUndead = {
	onUse
}