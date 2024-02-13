import {getDialogueButtonType} from "../../helper-functions.js"
import {summonCelestial as exceptionStrings} from "../../exceptions"
import {summonCelestial as defaultStrings} from "../../strings/spells.js"
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
	const overrides = await getOverrides(mutations, s)	
	return [mutations, overrides, spawnName]
}
const getItemUpdates = async (s, spawnName, originAttack, level) => {
	if (spawnName == s.spawnNames[0]) {
		return {
			'Radiant Bow': {
				'data.damage.parts' : [[`2d6 + 2 + ${level}`, `radiant`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			}
		}
	} else {
		return {
			'Radiant Sword': {
				'data.damage.parts' : [[`1d10 + 3 + ${level}`, `radiant`]],
				'data.attackBonus' : `- @mod - @prof + ${originAttack}`
			}
		}
	}
}
const getOverrides = async (mutations, s) => {
	const sequencer = await getSequencerData(s)
	return {
		warpGate: {
			mutations
		},
		sequencer
	}
}
const getSequencerData = async (s) => {
	if (s.sequencerData) return s.sequencerData
	return {
		options: {
			circleNum: "02",
			color: "blue",
			fadeIn: {ms: 450},
			impactNum1: "004",
			impactNum2: "003",
			scale: .15,
			school: "conjuration"
		}
	}
}
const getSpawnBaseAc = async (s, spawnName) => {
	return spawnName == s.spawnNames[0] ? 11 : 13
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
	const ac = await getSpawnBaseAc(s, spawnName) + level
	const hp = {value: 40+10*(level-5), max: 40+10*(level-5)}
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
	const s = exceptionStrings.exceptionActorNames.includes(actor.name) 
		? exceptionStrings 
		: defaultStrings
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
export const summonCelestial = {
	onUse
}