import {getDialogueButtonType, getStringsOrExceptions} from "../../helper-functions.js"
import {summonElemental as exceptionStrings} from "../../exceptions"
import {summonElemental as defaultStrings} from "../../strings/spells.js"
import {summoning} from "../../helpers/summons.js"

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
const getItemUpdates = async (s, spawnName, originAttack, level) => {
	if (spawnName == s.spawnNames[2]) {
		return {
			'Slam': {
				'data.damage.parts' : [[`1d10 + 4 + ${level}`, `fire`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			}
		}
	} else {
		return {
			'Slam': {
				'data.damage.parts' : [[`1d10 + 4 + ${level}`, `bludgeoning`]],
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
	const ac = 11 + level
	const hp = {value: 50+10*(level-4), max: 50+10*(level-4)}
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
const onUse = async ({actor, args, item, token, workflow}) => {
	const s = await getStringsOrExceptions(actor, defaultStrings, exceptionStrings)
	const choice = await getDialogueButtonType(
		s.choices, 
		{width: "125%", height: "100%"}, 
		s.initHeader, 
		getChoiceIconPaths, 
		100, 
		100, 
		s
	)
	const [
		mutations, 
		overrides, 
		spawnName
	] = await getCreateSpawnParams(actor, args, choice.value, s)
	summoning.createSpawn(actor, choice.value, item, overrides, s, token) 
}

export const summonElemental = {
	onUse
}